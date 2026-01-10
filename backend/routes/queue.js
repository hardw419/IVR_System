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

// @route   GET /api/queue
// @desc    Get all waiting calls in queue
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const queue = await CallQueue.find({
      userId: req.user._id,
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
// @desc    TwiML webhook for browser calls
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

module.exports = router;

