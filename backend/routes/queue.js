const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const CallQueue = require('../models/CallQueue');
const Call = require('../models/Call');
const { auth } = require('../middleware/auth');

// Twilio credentials
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;
const twilioTwimlAppSid = process.env.TWILIO_TWIML_APP_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// @route   POST /api/queue/test-call
// @desc    Make a test call to simulate incoming call
// @access  Private
router.post('/test-call', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const client = twilio(twilioAccountSid, twilioAuthToken);

    // Always use the public Render URL (Twilio cannot access localhost)
    const webhookUrl = 'https://ivr-system-backend.onrender.com/api/queue/incoming';

    console.log('Making test call to:', phoneNumber, 'with webhook:', webhookUrl);

    // Make outbound call that connects to the queue webhook
    const call = await client.calls.create({
      to: phoneNumber,
      from: twilioPhoneNumber,
      url: webhookUrl,
      method: 'POST'
    });

    console.log('Test call initiated:', call.sid);

    res.json({
      success: true,
      message: 'Test call initiated! Your phone will ring shortly.',
      callSid: call.sid
    });
  } catch (error) {
    console.error('Test call error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to make test call' });
  }
});

// @route   GET /api/queue
// @desc    Get all waiting calls in queue
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('=== QUEUE FETCH v4 ===');

    // Use exact same query as debug endpoint
    const allItems = await CallQueue.find({}).sort({ waitStartTime: -1 });
    console.log('All items in DB:', allItems.length);

    // Filter for waiting/ringing in JavaScript
    const queue = allItems.filter(item =>
      item.status === 'waiting' || item.status === 'ringing'
    );
    console.log('Waiting/ringing items:', queue.length);

    // Calculate wait time for each call
    const queueWithWaitTime = queue.map(item => ({
      ...item.toObject(),
      currentWaitTime: Math.floor((Date.now() - new Date(item.waitStartTime).getTime()) / 1000)
    }));

    res.json({
      success: true,
      queue: queueWithWaitTime,
      count: queue.length,
      totalInDb: allItems.length,
      version: 'v4'
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/queue/stats
// @desc    Get queue statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const waiting = await CallQueue.countDocuments({
      userId: req.user._id,
      status: 'waiting'
    });

    const answered = await CallQueue.countDocuments({
      userId: req.user._id,
      status: 'answered'
    });

    const abandoned = await CallQueue.countDocuments({
      userId: req.user._id,
      status: 'abandoned'
    });

    const avgWaitTime = await CallQueue.aggregate([
      { $match: { userId: req.user._id, waitDuration: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$waitDuration' } } }
    ]);

    res.json({
      success: true,
      stats: {
        waiting,
        answered,
        abandoned,
        avgWaitTime: avgWaitTime[0]?.avg || 0
      }
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/queue/accept/:queueId
// @desc    Agent accepts a call from queue
// @access  Private
router.post('/accept/:queueId', auth, async (req, res) => {
  try {
    // Use findOneAndUpdate with atomic operation to prevent race conditions
    // Only update if status is still 'waiting' - first agent wins!
    const queueItem = await CallQueue.findOneAndUpdate(
      {
        _id: req.params.queueId,
        status: 'waiting'  // Only accept if still waiting
      },
      {
        $set: {
          status: 'ringing',
          answerTime: new Date(),
          assignedAgent: req.user._id
        }
      },
      { new: true }  // Return updated document
    );

    if (!queueItem) {
      return res.status(409).json({
        success: false,
        message: 'Call already taken by another agent'
      });
    }

    // Calculate wait duration
    queueItem.waitDuration = Math.floor(
      (new Date().getTime() - new Date(queueItem.waitStartTime).getTime()) / 1000
    );
    await queueItem.save();

    // Emit to ALL agents to remove this call from their queue
    const io = req.app.get('io');
    io.emit('call-accepted', {
      queueId: queueItem._id,
      acceptedBy: req.user._id,
      agentName: req.user.name || req.user.email
    });

    console.log(`Call ${queueItem._id} accepted by agent ${req.user.email}`);

    res.json({
      success: true,
      message: 'Call accepted',
      queueItem,
      vapiCallId: queueItem.vapiCallId,
      twilioCallSid: queueItem.twilioCallSid
    });
  } catch (error) {
    console.error('Accept call error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/queue/complete/:queueId
// @desc    Mark call as completed
// @access  Private
router.post('/complete/:queueId', auth, async (req, res) => {
  try {
    const queueItem = await CallQueue.findOneAndUpdate(
      { _id: req.params.queueId, userId: req.user._id },
      {
        status: 'completed',
        endTime: new Date(),
        notes: req.body.notes
      },
      { new: true }
    );

    if (!queueItem) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    // Calculate call duration
    if (queueItem.answerTime) {
      queueItem.callDuration = Math.floor(
        (new Date().getTime() - new Date(queueItem.answerTime).getTime()) / 1000
      );
      await queueItem.save();
    }

    res.json({ success: true, queueItem });
  } catch (error) {
    console.error('Complete call error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/queue/token
// @desc    Get Twilio access token for browser calling
// @access  Private
router.get('/token', auth, async (req, res) => {
  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity: `agent-${req.user._id}` }
    );

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twilioTwimlAppSid,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);

    res.json({
      success: true,
      token: token.toJwt(),
      identity: `agent-${req.user._id}`
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate token' });
  }
});

// @route   POST /api/queue/voice
// @desc    TwiML webhook for browser calls (outgoing from agent)
// @access  Public (Twilio webhook)
router.post('/voice', async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  console.log('=== VOICE WEBHOOK (Agent Browser Call) ===');
  console.log('Request body:', JSON.stringify(req.body));

  const { To, vapiCallId } = req.body;

  // vapiCallId contains the CallSid of the queued call
  if (vapiCallId) {
    console.log('Agent connecting to queue:', `queue-${vapiCallId}`);

    // Connect agent to the Twilio Queue where customer is waiting
    const dial = response.dial();
    dial.queue(`queue-${vapiCallId}`);
  } else {
    console.log('No vapiCallId provided');
    response.say('No call to connect to.');
  }

  res.type('text/xml');
  const twiml = response.toString();
  console.log('TwiML response:', twiml);
  res.send(twiml);
});

// @route   GET /api/queue/debug
// @desc    Debug endpoint to check all queue items in database
// @access  Public (for debugging)
router.get('/debug', async (req, res) => {
  try {
    const allQueue = await CallQueue.find({}).sort({ waitStartTime: -1 }).limit(10);
    const User = require('../models/User');
    const users = await User.find({}).select('_id email name');
    res.json({
      success: true,
      queueCount: allQueue.length,
      queue: allQueue,
      users: users
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/queue/vapi-transfer-twiml
// @desc    TwiML endpoint for Vapi transfer - puts caller in Twilio queue
// @access  Public (Twilio webhook)
router.post('/vapi-transfer-twiml', async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const queueId = req.query.queueId;
  console.log('=== VAPI TRANSFER TWIML ===');
  console.log('Queue ID:', queueId);

  try {
    // Play a message and put caller in queue
    response.say({ voice: 'alice', language: 'en-US' },
      'Please hold while we connect you with an agent.');

    // Enqueue the caller in "AgentQueue"
    response.enqueue({
      waitUrl: 'https://ivr-system-backend.onrender.com/api/queue/hold-music',
      waitUrlMethod: 'POST',
      action: 'https://ivr-system-backend.onrender.com/api/queue/queue-result',
      method: 'POST'
    }, 'AgentQueue');

    console.log('TwiML Response:', response.toString());
    res.type('text/xml');
    res.send(response.toString());
  } catch (error) {
    console.error('Vapi transfer TwiML error:', error);
    response.say('An error occurred. Please try again.');
    response.hangup();
    res.type('text/xml');
    res.send(response.toString());
  }
});

// @route   POST /api/queue/incoming
// @desc    Webhook for incoming calls to Twilio number - rings in browser
// @access  Public (Twilio webhook)
router.post('/incoming', async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const { From, To, CallSid, Direction, ParentCallSid } = req.body;
  console.log('=== INCOMING CALL WEBHOOK ===');
  console.log('From:', From, 'To:', To, 'CallSid:', CallSid);
  console.log('Direction:', Direction, 'ParentCallSid:', ParentCallSid);
  console.log('Full request body:', JSON.stringify(req.body));

  // Check if this is a Vapi transfer (has ParentCallSid or specific pattern)
  const isVapiTransfer = !!ParentCallSid || Direction === 'outbound-api';
  console.log('Is Vapi Transfer:', isVapiTransfer);

  try {
    // Get the io instance
    const io = req.app.get('io');

    // Create queue item for this incoming call
    const User = require('../models/User');
    const users = await User.find({}); // Get all users
    console.log('Found users:', users.length);

    if (users.length > 0) {
      const user = users[0]; // Use first user for now
      console.log('Using user:', user._id, user.email);

      // Try to find the original call from Vapi if this is a transfer
      let customerName = From || 'Unknown Caller';
      let callSource = 'direct';

      if (isVapiTransfer) {
        callSource = 'vapi-transfer';
        // Try to find the original call in our database
        const Call = require('../models/Call');
        const originalCall = await Call.findOne({
          $or: [
            { twilioCallSid: ParentCallSid },
            { customerPhone: From }
          ]
        }).sort({ createdAt: -1 });

        if (originalCall) {
          customerName = originalCall.customerName || From;
          console.log('Found original Vapi call:', originalCall._id, customerName);
        }
      }

      const queueItem = new CallQueue({
        userId: user._id,
        customerPhone: From || 'Unknown',
        customerName: customerName,
        keyPressed: callSource,
        status: 'waiting',
        waitStartTime: new Date(),
        twilioCallSid: CallSid,
        priority: isVapiTransfer ? 2 : 1  // Higher priority for Vapi transfers
      });

      const savedItem = await queueItem.save();
      console.log('=== QUEUE ITEM SAVED ===');
      console.log('Queue ID:', savedItem._id);
      console.log('Status:', savedItem.status);
      console.log('Source:', callSource);

      // Emit to all connected agents
      if (io) {
        io.emit('incoming-call', {
          queueId: savedItem._id,
          customerPhone: From,
          customerName: customerName,
          callSid: CallSid,
          waitStartTime: new Date(),
          isVapiTransfer: isVapiTransfer
        });
        console.log('Socket.io event emitted');
      } else {
        console.log('WARNING: io instance not found!');
      }
    } else {
      console.log('ERROR: No users found in database!');
    }

    // Put caller on hold with music while waiting for agent
    response.say({ voice: 'alice' }, 'Please wait while we connect you to an agent.');

    // Play hold music and wait for agent to dial in
    // Use absolute URLs for Twilio webhooks
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'https://ivr-system-backend.onrender.com';
    response.enqueue({
      waitUrl: `${baseUrl}/api/queue/hold-music`,
      action: `${baseUrl}/api/queue/enqueue-result`
    }, `queue-${CallSid}`);

  } catch (error) {
    console.error('=== INCOMING CALL ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    response.say('Sorry, there was an error. Please try again later.');
  }

  res.type('text/xml');
  res.send(response.toString());
});

// @route   POST /api/queue/hold-music
// @desc    TwiML for hold music while waiting
// @access  Public (Twilio webhook)
router.post('/hold-music', (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  // Play hold music
  response.play({ loop: 10 }, 'https://api.twilio.com/cowbell.mp3');
  response.say({ voice: 'alice' }, 'Thank you for your patience. An agent will be with you shortly.');

  res.type('text/xml');
  res.send(response.toString());
});

// @route   POST /api/queue/enqueue-result
// @desc    Handle queue result (call answered or abandoned)
// @access  Public (Twilio webhook)
router.post('/enqueue-result', async (req, res) => {
  const { QueueResult, CallSid } = req.body;
  console.log('Queue result:', QueueResult, 'for CallSid:', CallSid);

  try {
    const status = QueueResult === 'bridged' ? 'answered' : 'abandoned';
    await CallQueue.findOneAndUpdate(
      { twilioCallSid: CallSid },
      { status, endTime: new Date() }
    );
  } catch (error) {
    console.error('Enqueue result error:', error);
  }

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  res.type('text/xml');
  res.send(response.toString());
});

// @route   POST /api/queue/connect/:callSid
// @desc    Agent connects to queued call
// @access  Private
router.post('/connect/:callSid', auth, async (req, res) => {
  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);
    const { callSid } = req.params;

    // Update the call to connect to the queue
    await client.calls(callSid).update({
      twiml: `<Response><Dial><Queue>queue-${callSid}</Queue></Dial></Response>`
    });

    // Update queue item
    await CallQueue.findOneAndUpdate(
      { twilioCallSid: callSid },
      {
        status: 'answered',
        answerTime: new Date(),
        agentId: req.user._id
      }
    );

    res.json({ success: true, message: 'Connected to call' });
  } catch (error) {
    console.error('Connect call error:', error);
    res.status(500).json({ success: false, message: 'Failed to connect' });
  }
});

module.exports = router;

