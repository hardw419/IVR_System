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
    // Get all waiting calls (not filtered by userId for now - all agents see all calls)
    const queue = await CallQueue.find({
      status: { $in: ['waiting', 'ringing'] }
    })
    .populate('callId', 'scriptId transcript')
    .sort({ priority: -1, waitStartTime: 1 });

    // Calculate wait time for each call
    const queueWithWaitTime = queue.map(item => ({
      ...item.toObject(),
      currentWaitTime: Math.floor((Date.now() - new Date(item.waitStartTime).getTime()) / 1000)
    }));

    res.json({
      success: true,
      queue: queueWithWaitTime,
      count: queue.length
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
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
    const queueItem = await CallQueue.findOne({
      _id: req.params.queueId,
      userId: req.user._id,
      status: 'waiting'
    });

    if (!queueItem) {
      return res.status(404).json({
        success: false,
        message: 'Call not found in queue or already answered'
      });
    }

    // Update queue item status
    queueItem.status = 'ringing';
    queueItem.answerTime = new Date();
    queueItem.waitDuration = Math.floor(
      (new Date().getTime() - new Date(queueItem.waitStartTime).getTime()) / 1000
    );
    await queueItem.save();

    // Emit event to update other agents
    const io = req.app.get('io');
    io.to(`agent-${req.user._id}`).emit('queue-update', {
      action: 'accepted',
      queueId: queueItem._id
    });

    res.json({
      success: true,
      message: 'Call accepted',
      queueItem,
      vapiCallId: queueItem.vapiCallId
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

  const { To, From, vapiCallId } = req.body;

  if (To && vapiCallId) {
    // Agent is answering a queued call - connect to Vapi call
    const dial = response.dial({
      callerId: From
    });

    // Connect to the original Vapi call via conference
    dial.conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: true
    }, `queue-${vapiCallId}`);
  } else {
    response.say('No call to connect to.');
  }

  res.type('text/xml');
  res.send(response.toString());
});

// @route   POST /api/queue/incoming
// @desc    Webhook for incoming calls to Twilio number - rings in browser
// @access  Public (Twilio webhook)
router.post('/incoming', async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  const { From, To, CallSid } = req.body;
  console.log('Incoming call from:', From, 'to:', To, 'CallSid:', CallSid);

  try {
    // Get the io instance
    const io = req.app.get('io');

    // Create queue item for this incoming call
    // For now, we'll associate with first user - in production, map by phone number
    const User = require('../models/User');
    const user = await User.findOne(); // Get first user for demo

    if (user) {
      const queueItem = new CallQueue({
        userId: user._id,
        customerPhone: From,
        customerName: From, // Could be looked up from CRM
        keyPressed: 'direct',
        status: 'waiting',
        waitStartTime: new Date(),
        twilioCallSid: CallSid,
        priority: 1
      });
      await queueItem.save();

      // Emit to all connected agents
      io.emit('incoming-call', {
        queueId: queueItem._id,
        customerPhone: From,
        customerName: From,
        callSid: CallSid,
        waitStartTime: new Date()
      });

      console.log('Emitted incoming-call event, queue item:', queueItem._id);
    }

    // Put caller on hold with music while waiting for agent
    response.say({ voice: 'alice' }, 'Please wait while we connect you to an agent.');

    // Play hold music and wait for agent to dial in
    response.enqueue({
      waitUrl: '/api/queue/hold-music',
      action: '/api/queue/enqueue-result'
    }, `queue-${CallSid}`);

  } catch (error) {
    console.error('Incoming call error:', error);
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

