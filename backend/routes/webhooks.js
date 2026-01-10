const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const Call = require('../models/Call');
const Agent = require('../models/Agent');
const CallQueue = require('../models/CallQueue');
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

    // Handle function-call for transfer_call_tool
    if (type === 'function-call') {
      const functionCall = message.functionCall || body.functionCall;
      console.log('🔧 Function call received:', functionCall);

      if (functionCall?.name === 'transferCall' || functionCall?.name === 'transfer_call_tool') {
        const call = vapiCall?.id ? await Call.findOne({ vapiCallId: vapiCall.id }) : null;

        if (call) {
          // Get the destination from function parameters or find agent
          const params = functionCall.parameters || {};
          let transferNumber = params.destination || params.number;
          let agentName = 'Agent';

          // Find the agent by phone number or get first available
          let agent = null;
          if (transferNumber) {
            agent = await Agent.findOne({
              userId: call.userId,
              phoneNumber: transferNumber
            });
          }

          if (!agent) {
            agent = await Agent.findOne({
              userId: call.userId,
              isAvailable: true
            });
            if (agent) {
              transferNumber = agent.phoneNumber;
            }
          }

          if (agent) {
            agentName = agent.name;
          }

          if (transferNumber) {
            console.log(`📞 Function transfer to: ${agentName} at ${transferNumber}`);
            call.status = 'transferred';
            call.transferredTo = transferNumber;
            call.transferDetails = {
              agentName: agentName,
              agentPhone: transferNumber,
              transferTime: new Date(),
              transferStatus: 'initiated'
            };
            await call.save();
          }
        }

        return res.json({ result: 'Transfer initiated' });
      }
    }

    // Handle DTMF event - keypad press 1 or 2
    if (type === 'dtmf' || (type === 'keypad' && digit)) {
      const pressedDigit = digit || message.digits;
      console.log(`🔢 DTMF detected - Digit pressed: ${pressedDigit}`);

      if (pressedDigit === '1' || pressedDigit === '2') {
        const call = vapiCall?.id ? await Call.findOne({ vapiCallId: vapiCall.id }) : null;

        if (call) {
          // Check if queue mode is enabled (add to queue instead of direct transfer)
          const useQueueMode = process.env.USE_QUEUE_MODE === 'true';

          if (useQueueMode) {
            // Add to queue instead of transferring directly
            console.log(`📋 Adding call to queue - Customer: ${call.customerPhone}`);

            // Create queue entry
            const queueEntry = new CallQueue({
              callId: call._id,
              vapiCallId: vapiCall.id,
              userId: call.userId,
              customerPhone: call.customerPhone,
              customerName: call.customerName,
              keyPressed: pressedDigit,
              status: 'waiting',
              waitStartTime: new Date()
            });
            await queueEntry.save();

            // Update call status
            call.keyPressed = pressedDigit;
            call.status = 'in-queue';
            await call.save();

            // Emit socket event to notify agents
            const io = req.app.get('io');
            if (io) {
              io.to(`agent-${call.userId}`).emit('new-queue-call', {
                queueEntry: queueEntry.toObject(),
                customerName: call.customerName,
                customerPhone: call.customerPhone
              });
            }

            // Tell AI to keep customer on hold
            return res.json({
              results: [{
                result: 'Please hold while we connect you to an agent. An agent will be with you shortly.'
              }]
            });
          }

          // Original direct transfer logic (when queue mode is disabled)
          const agent = await Agent.findOne({
            userId: call.userId,
            keyPress: pressedDigit,
            isAvailable: true
          });

          if (agent) {
            console.log(`📞 DTMF Transfer to ${agent.name} at ${agent.phoneNumber}`);

            call.keyPressed = pressedDigit;
            call.transferredTo = agent.phoneNumber;
            call.status = 'transferred';
            call.transferDetails = {
              agentName: agent.name,
              agentPhone: agent.phoneNumber,
              transferTime: new Date(),
              transferStatus: 'initiated'
            };
            await call.save();

            // Return transfer destination to Vapi
            return res.json({
              results: [{
                result: 'transfer',
                destination: {
                  type: 'number',
                  number: agent.phoneNumber,
                  message: `Transferring you to ${agent.name}. Please hold.`
                }
              }]
            });
          } else {
            console.log('❌ No available agent found for key:', pressedDigit);
            return res.json({
              results: [{
                result: 'No agent available for this option.'
              }]
            });
          }
        }
      }

      return res.json({ results: [{ result: 'continue' }] });
    }

    // Handle assistant-request - return dynamic transfer destinations
    if (type === 'assistant-request') {
      console.log('📋 Assistant request - providing transfer destinations');

      // Get all available agents for transfer
      const agents = await Agent.find({ isAvailable: true });

      if (agents.length > 0) {
        const transferDestinations = agents.map(agent => ({
          type: 'number',
          number: agent.phoneNumber,
          message: `Transferring you to ${agent.name}. Please hold.`,
          description: `Press ${agent.keyPress} for ${agent.name}${agent.department ? ' (' + agent.department + ')' : ''}`
        }));

        return res.json({
          assistant: {
            transferDestinations: transferDestinations
          }
        });
      }
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
          const transcript = message.transcript || body.transcript;
          if (transcript) {
            call.transcript = (call.transcript || '') + ' ' + transcript;
          }
          break;

        case 'conversation-update':
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

