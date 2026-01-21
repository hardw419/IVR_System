const axios = require('axios');

class VapiService {
  constructor() {
    this.apiKey = process.env.VAPI_API_KEY;
    this.baseUrl = 'https://api.vapi.ai';
  }

  async createPhoneCall(config) {
    try {
      const { customerPhone, script, voice, assistantConfig, agents } = config;

      // Check if we should use saved assistant (for transfer functionality)
      const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;

      // Build transfer instructions for the AI - now transfers to queue, not individual agents
      let transferInstructions = `\n\nCALL TRANSFER TO HUMAN AGENT:\nIf the customer wants to speak with a human agent, requests to be transferred, or asks for human support, use the transferCall tool to transfer them to the agent queue. Say: "I'll transfer you to one of our agents now. Please hold."`;

      const systemPrompt = (script.systemPrompt || '') + transferInstructions;

      // Map voice provider names to Vapi's expected values
      const providerMap = {
        'elevenlabs': '11labs',
        '11labs': '11labs',
        'openai': 'openai',
        'azure': 'azure',
        'google': 'google',
        'cartesia': 'cartesia',
        'deepgram': 'deepgram',
        'playht': 'playht'
      };
      const vapiVoiceProvider = providerMap[voice.provider] || 'openai';

      let payload;

      // Transfer destination is now the Twilio Queue number (all calls go to browser queue)
      const twilioQueueNumber = process.env.TWILIO_PHONE_NUMBER || '+17655236758';

      // Single transfer destination - Twilio number which routes to Agent Queue
      const transferDestinations = [{
        type: 'number',
        number: twilioQueueNumber,
        message: 'Transferring you to an agent. Please hold.',
        description: 'Transfer to Agent Queue',
        transferPlan: {
          mode: 'warm-transfer-say-message',
          message: 'Transferring you to an agent. Please hold.'
        }
      }];

      console.log('Transfer destination (Queue):', twilioQueueNumber);

      // Build inline assistant with queue transfer
      const assistantConfig_final = {
        model: {
          provider: 'openai',
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            }
          ],
          temperature: 0.7,
          maxTokens: 500
        },
        voice: {
          provider: vapiVoiceProvider,
          voiceId: voice.voiceId
        },
        firstMessage: assistantConfig?.firstMessage || script.content || 'Hello, how can I help you today?',
        recordingEnabled: true,
        endCallFunctionEnabled: true,
        dialKeypadFunctionEnabled: true,
        serverUrl: process.env.VAPI_WEBHOOK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/vapi`
      };

      // Always add transfer tool - routes to Agent Queue via Twilio number
      assistantConfig_final.model.tools = [
        {
          type: 'transferCall',
          destinations: transferDestinations,
          messages: [
            {
              type: 'request-start',
              content: 'Please hold while I transfer you to an agent.'
            }
          ]
        }
      ];

      payload = {
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: customerPhone
        },
        assistant: assistantConfig_final
      };

      console.log('Creating Vapi call with payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(`${this.baseUrl}/call/phone`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Vapi create call error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create Vapi call');
    }
  }

  async getCall(callId) {
    try {
      const response = await axios.get(`${this.baseUrl}/call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Vapi get call error:', error.response?.data || error.message);
      throw new Error('Failed to get call details');
    }
  }

  async endCall(callId) {
    try {
      const response = await axios.post(`${this.baseUrl}/call/${callId}/end`, {}, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Vapi end call error:', error.response?.data || error.message);
      throw new Error('Failed to end call');
    }
  }

  async listCalls(params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/call`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params
      });

      return response.data;
    } catch (error) {
      console.error('Vapi list calls error:', error.response?.data || error.message);
      throw new Error('Failed to list calls');
    }
  }

  async getCallTranscript(callId) {
    try {
      const response = await axios.get(`${this.baseUrl}/call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const callData = response.data;

      // Log the response for debugging
      console.log('Vapi call data:', JSON.stringify({
        id: callData.id,
        status: callData.status,
        endedReason: callData.endedReason,
        duration: callData.duration,
        costBreakdown: callData.costBreakdown,
        hasTranscript: !!callData.artifact?.transcript,
        hasMessages: !!(callData.artifact?.messages?.length || callData.messages?.length)
      }, null, 2));

      // Duration might be in seconds or milliseconds, or nested in different places
      let duration = callData.duration || callData.durationSeconds || 0;
      if (callData.startedAt && callData.endedAt) {
        // Calculate duration from timestamps if available
        const start = new Date(callData.startedAt).getTime();
        const end = new Date(callData.endedAt).getTime();
        duration = Math.round((end - start) / 1000);
      }

      return {
        transcript: callData.artifact?.transcript || callData.transcript || '',
        messages: callData.artifact?.messages || callData.messages || [],
        recordingUrl: callData.artifact?.recordingUrl || callData.recordingUrl || null,
        summary: callData.artifact?.summary || callData.summary || null,
        duration: duration,
        status: callData.status,
        endedReason: callData.endedReason
      };
    } catch (error) {
      console.error('Vapi get transcript error:', error.response?.data || error.message);
      throw new Error('Failed to get call transcript');
    }
  }
}

module.exports = new VapiService();

