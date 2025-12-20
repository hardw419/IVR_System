const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const Call = require('../models/Call');
const Agent = require('../models/Agent');
const twilioService = require('../services/twilioService');

// @route   POST /api/webhooks/twilio/status
// @desc    Handle Twilio call status updates
// @access  Public (Twilio webhook)
router.post('/twilio/status', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    const call = await Call.findOne({ callSid: CallSid });
    
    if (call) {
      call.status = CallStatus;
      
      if (CallDuration) {
        call.duration = parseInt(CallDuration);
      }

      if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'no-answer' || CallStatus === 'busy') {
        call.endTime = new Date();
      }

      await call.save();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Twilio status webhook error:', error);
    res.status(500).send('Error');
  }
});

// @route   POST /api/webhooks/twilio/recording
// @desc    Handle Twilio recording callback
// @access  Public (Twilio webhook)
router.post('/twilio/recording', async (req, res) => {
  try {
    const { CallSid, RecordingUrl, RecordingDuration } = req.body;

    const call = await Call.findOne({ callSid: CallSid });
    
    if (call) {
      call.recording = {
        url: RecordingUrl,
        duration: parseInt(RecordingDuration)
      };
      await call.save();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Twilio recording webhook error:', error);
    res.status(500).send('Error');
  }
});

// @route   POST /api/webhooks/twilio/gather
// @desc    Handle digit input from customer (1 or 2)
// @access  Public (Twilio webhook)
router.post('/twilio/gather', async (req, res) => {
  try {
    const { CallSid, Digits } = req.body;
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    const call = await Call.findOne({ callSid: CallSid });
    
    if (call && (Digits === '1' || Digits === '2')) {
      // Find the agent assigned to this key
      const agent = await Agent.findOne({ 
        userId: call.userId, 
        keyPress: Digits,
        isAvailable: true
      });

      if (agent) {
        call.keyPressed = Digits;
        call.transferredTo = agent.phoneNumber;
        call.status = 'transferred';
        await call.save();

        response.say('Transferring you to an agent. Please hold.');
        response.dial(agent.phoneNumber);
      } else {
        response.say('Sorry, no agent is available at the moment. Please try again later.');
        response.hangup();
      }
    } else {
      response.say('Invalid input. Goodbye.');
      response.hangup();
    }

    res.type('text/xml');
    res.send(response.toString());
  } catch (error) {
    console.error('Twilio gather webhook error:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say('An error occurred. Please try again later.');
    response.hangup();
    res.type('text/xml');
    res.send(response.toString());
  }
});

// @route   POST /api/webhooks/vapi
// @desc    Handle Vapi webhooks (including DTMF for call transfer)
// @access  Public (Vapi webhook)
router.post('/vapi', async (req, res) => {
  try {
    const body = req.body;

    console.log('Vapi webhook received:', JSON.stringify(body, null, 2));

    // Handle different webhook formats
    const message = body.message || body;
    const type = message.type || body.type;
    const vapiCall = message.call || body.call;
    const digit = message.digit || body.digit;

    // Handle DTMF event - this is the key for call transfer!
    if (type === 'dtmf' && digit) {
      console.log(`🔢 DTMF detected - Digit pressed: ${digit}`);

      if (digit === '1' || digit === '2') {
        // Find the call in our database
        const call = vapiCall?.id ? await Call.findOne({ vapiCallId: vapiCall.id }) : null;

        if (call) {
          // Find the agent assigned to this key press
          const agent = await Agent.findOne({
            userId: call.userId,
            keyPress: digit,
            isAvailable: true
          });

          if (agent) {
            console.log(`📞 Transferring call to ${agent.name} at ${agent.phoneNumber}`);

            // Update call record
            call.keyPressed = digit;
            call.transferredTo = agent.phoneNumber;
            call.status = 'transferred';
            await call.save();

            // Respond to Vapi with transfer instruction
            return res.json({
              type: 'call.transfer',
              destination: {
                type: 'phone',
                number: agent.phoneNumber
              }
            });
          } else {
            console.log('❌ No available agent found for key:', digit);
            return res.json({
              type: 'say',
              text: 'Sorry, no agent is available at the moment. Please try again later.'
            });
          }
        }
      }

      // For other digits, just continue
      return res.json({ type: 'continue' });
    }

    // Handle other message types
    if (!vapiCall?.id) {
      return res.status(200).json({ received: true });
    }

    const call = await Call.findOne({ vapiCallId: vapiCall.id });

    if (call) {
      switch (type) {
        case 'call-started':
          call.status = 'in-progress';
          call.startTime = new Date();
          break;

        case 'call-ended':
          call.status = call.status === 'transferred' ? 'transferred' : 'completed';
          call.endTime = new Date();
          if (vapiCall.duration) {
            call.duration = Math.round(vapiCall.duration);
          }
          // Get final transcript and recording
          const artifact = message.artifact || body.artifact;
          if (artifact?.transcript) {
            call.transcript = artifact.transcript;
          }
          if (artifact?.messages) {
            call.transcriptMessages = artifact.messages.map(msg => ({
              role: msg.role,
              message: msg.content || msg.message,
              timestamp: msg.time ? new Date(msg.time) : new Date()
            }));
          }
          if (artifact?.recordingUrl) {
            call.recording = {
              url: artifact.recordingUrl,
              duration: Math.round(vapiCall.duration || 0)
            };
          }
          if (vapiCall.summary) {
            call.summary = vapiCall.summary;
          }
          if (vapiCall.cost) {
            call.cost = vapiCall.cost;
          }
          break;

        case 'call-failed':
          call.status = 'failed';
          call.endTime = new Date();
          break;

        case 'transcript':
          // Real-time transcript update
          const transcript = message.transcript || body.transcript;
          if (transcript) {
            call.transcript = (call.transcript || '') + ' ' + transcript;
          }
          break;

        case 'conversation-update':
          // Update messages in real-time
          const conversation = message.conversation || body.conversation;
          if (conversation) {
            call.transcriptMessages = conversation.map(msg => ({
              role: msg.role,
              message: msg.content || msg.message,
              timestamp: new Date()
            }));
          }
          break;
      }

      await call.save();
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Vapi webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;

