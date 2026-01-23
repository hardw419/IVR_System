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

// @route   POST /api/queue/test-incoming
// @desc    Test incoming call webhook by calling the queue number
// @access  Private
router.post('/test-incoming', auth, async (req, res) => {
  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);

    // Call the QUEUE number FROM the toll-free number
    // We use toll-free because +17655236758 might be tied to Vapi
    const queueNumber = process.env.TWILIO_QUEUE_NUMBER || '+19287693143';
    // Try toll-free number as the "from" number
    const fromNumber = '+18884706735';

    console.log('=== TEST INCOMING CALL ===');
    console.log('Calling queue number:', queueNumber);
    console.log('From number:', fromNumber);

    // Make call TO the queue number - this should trigger the /incoming webhook
    const call = await client.calls.create({
      to: queueNumber,
      from: fromNumber,
      url: 'https://ivr-system-backend.onrender.com/api/queue/incoming',
      method: 'POST'
    });

    console.log('Test incoming call initiated:', call.sid);

    res.json({
      success: true,
      message: `Calling ${queueNumber} from ${fromNumber}. Check Agent Queue!`,
      callSid: call.sid
    });
  } catch (error) {
    console.error('Test incoming call error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to make test call' });
  }
});

// @route   GET /api/queue
// @desc    Get all waiting calls in queue
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('=== QUEUE FETCH v6 ===');

    // Auto-expire old entries (older than 2 minutes - calls don't last that long in queue)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const expireResult = await CallQueue.updateMany(
      {
        status: { $in: ['waiting', 'ringing'] },
        waitStartTime: { $lt: twoMinutesAgo }
      },
      {
        $set: { status: 'timeout', endTime: new Date() }
      }
    );

    if (expireResult.modifiedCount > 0) {
      console.log('Auto-expired', expireResult.modifiedCount, 'old queue entries');
    }

    // Get waiting/ringing items
    const queue = await CallQueue.find({
      status: { $in: ['waiting', 'ringing'] }
    }).sort({ priority: -1, waitStartTime: 1 });

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
      version: 'v6'
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/queue/cleanup
// @desc    Manually cleanup old/stale queue entries
// @access  Private
router.post('/cleanup', auth, async (req, res) => {
  try {
    // Mark all waiting/ringing as abandoned
    const result = await CallQueue.updateMany(
      { status: { $in: ['waiting', 'ringing'] } },
      { $set: { status: 'abandoned', endTime: new Date() } }
    );

    console.log('Cleaned up queue entries:', result.modifiedCount);

    res.json({
      success: true,
      message: `Cleaned up ${result.modifiedCount} queue entries`
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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

  console.log('=== VOICE WEBHOOK v2 (Agent Browser Call) ===');
  console.log('Request body:', JSON.stringify(req.body));

  // vapiCallId parameter contains the TwilioCallSid of the queued call
  // This is sent from the frontend when agent accepts
  const { vapiCallId } = req.body;
  const callSid = vapiCallId; // The parameter is named vapiCallId but contains TwilioCallSid

  if (callSid) {
    const queueName = `queue-${callSid}`;
    console.log('Agent connecting to queue:', queueName);

    // Connect agent to the Twilio Queue where customer is waiting
    const dial = response.dial();
    dial.queue(queueName);
  } else {
    console.log('❌ No callSid provided in request');
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
    // Get the queue entry to find the vapiCallId
    const CallQueue = require('../models/CallQueue');
    const queueEntry = await CallQueue.findById(queueId);

    if (!queueEntry) {
      console.error('Queue entry not found:', queueId);
      response.say('Sorry, there was an error. Please try again.');
      response.hangup();
      res.type('text/xml');
      return res.send(response.toString());
    }

    // Use vapiCallId for the queue name - this MUST match what agent connects to
    const queueName = `queue-${queueEntry.vapiCallId}`;
    console.log('Enqueuing caller in:', queueName);

    // Play a message and put caller in queue
    response.say({ voice: 'alice', language: 'en-US' },
      'Please hold while we connect you with an agent.');

    // Enqueue the caller with the SAME queue name that agent will dial
    response.enqueue({
      waitUrl: 'https://ivr-system-backend.onrender.com/api/queue/hold-music',
      waitUrlMethod: 'POST',
      action: 'https://ivr-system-backend.onrender.com/api/queue/queue-result',
      method: 'POST'
    }, queueName);

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
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║              INCOMING CALL WEBHOOK v2                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('From:', From, 'To:', To, 'CallSid:', CallSid);
  console.log('Direction:', Direction, 'ParentCallSid:', ParentCallSid);

  // Check if this is a Vapi transfer (has ParentCallSid means it's a transferred call)
  const isVapiTransfer = !!ParentCallSid || Direction === 'outbound-api';
  console.log('Is Vapi Transfer:', isVapiTransfer);

  try {
    const io = req.app.get('io');
    const User = require('../models/User');
    const users = await User.find({});

    let queueItem = null;
    // ALWAYS use CallSid for queue name - this is what we'll tell the agent to connect to
    const queueName = `queue-${CallSid}`;
    console.log('Queue name will be:', queueName);

    // Create queue entry for this incoming call
    if (users.length > 0) {
      const user = users[0];
      let customerName = From || 'Unknown Caller';

      // Try to find customer info from previous calls
      const Call = require('../models/Call');
      const originalCall = await Call.findOne({
        customerPhone: From
      }).sort({ createdAt: -1 });

      if (originalCall) {
        customerName = originalCall.customerName || From;
      }

      queueItem = new CallQueue({
        userId: user._id,
        customerPhone: From || 'Unknown',
        customerName: customerName,
        keyPressed: isVapiTransfer ? 'vapi-transfer' : 'direct',
        status: 'waiting',
        waitStartTime: new Date(),
        twilioCallSid: CallSid,  // Store the CallSid - this matches the queue name!
        priority: isVapiTransfer ? 2 : 1
      });

      await queueItem.save();
      console.log('📋 Queue entry created:', queueItem._id);
      console.log('📋 TwilioCallSid stored:', CallSid);
    }

    // Emit to all connected agents
    if (io && queueItem) {
      io.emit('incoming-call', {
        queueId: queueItem._id,
        customerPhone: From,
        customerName: queueItem.customerName,
        callSid: CallSid,
        twilioCallSid: CallSid,  // Send this for agent to connect with
        waitStartTime: new Date(),
        isVapiTransfer: isVapiTransfer
      });
      console.log('🔔 Socket.io event emitted to agents');
    }

    // Put caller on hold with music
    response.say({ voice: 'alice' }, 'Please wait while we connect you to an agent.');

    // Enqueue the caller - use CallSid-based queue name
    const baseUrl = 'https://ivr-system-backend.onrender.com';
    console.log('📞 Enqueuing caller in:', queueName);
    response.enqueue({
      waitUrl: `${baseUrl}/api/queue/hold-music`,
      waitUrlMethod: 'POST',
      action: `${baseUrl}/api/queue/enqueue-result`,
      method: 'POST'
    }, queueName);

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

