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

      // Build transfer instructions for the AI
      let transferInstructions = '';
      if (agents && agents.length > 0) {
        const availableAgents = agents.filter(a => a.isAvailable);
        if (availableAgents.length > 0) {
          const transferInfo = availableAgents
            .map(a => `Press ${a.keyPress} for ${a.name}${a.department ? ' (' + a.department + ')' : ''}`)
            .join(', ');

          transferInstructions = `\n\nCALL TRANSFER OPTIONS:\nIf the customer wants to speak with a human agent or requests to be transferred, use the transfer_call_tool to transfer them. You can tell them: "${transferInfo}".`;
        }
      }

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

      // Build dynamic transfer destinations from agents
      let transferDestinations = [];
      if (agents && agents.length > 0) {
        const availableAgents = agents.filter(a => a.isAvailable);
        transferDestinations = availableAgents.map(agent => ({
          type: 'number',
          number: agent.phoneNumber,
          message: `Transferring you to ${agent.name}. Please hold.`,
          description: `Press ${agent.keyPress} for ${agent.name}${agent.department ? ' (' + agent.department + ')' : ''}`,
          transferPlan: {
            mode: 'warm-transfer-say-message',
            message: `Transferring you to ${agent.name}. Please hold.`
          }
        }));
      }

      if (vapiAssistantId) {
        // Use saved assistant (has transfer tool attached)
        payload = {
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          customer: {
            number: customerPhone
          },
          assistantId: vapiAssistantId,
          assistantOverrides: {
            firstMessage: assistantConfig?.firstMessage || script.content || 'Hello, how can I help you today?',
            model: {
              provider: 'openai',
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                }
              ]
            },
            voice: {
              provider: vapiVoiceProvider,
              voiceId: voice.voiceId
            },
            recordingEnabled: true,
            dialKeypadFunctionEnabled: true,
            serverUrl: process.env.VAPI_WEBHOOK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/vapi`
          }
        };
      } else {
        // Use inline assistant (no transfer tool)
        payload = {
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          customer: {
            number: customerPhone
          },
          assistant: {
            model: {
              provider: 'openai',
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                },
                {
                  role: 'assistant',
                  content: script.content
                }
              ],
              temperature: 0.7,
              maxTokens: 500
            },
            voice: {
              provider: vapiVoiceProvider,
              voiceId: voice.voiceId
            },
            firstMessage: assistantConfig?.firstMessage || 'Hello, how can I help you today?',
            recordingEnabled: true,
            endCallFunctionEnabled: true,
            dialKeypadFunctionEnabled: true,
            serverUrl: process.env.VAPI_WEBHOOK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/vapi`,
            ...assistantConfig
          }
        };
      }

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

