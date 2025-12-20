const twilio = require('twilio');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.client = twilio(this.accountSid, this.authToken);
  }

  async makeCall(to, twimlUrl) {
    try {
      const call = await this.client.calls.create({
        to,
        from: this.phoneNumber,
        url: twimlUrl,
        statusCallback: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: true,
        recordingStatusCallback: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/twilio/recording`,
        recordingStatusCallbackMethod: 'POST'
      });

      return call;
    } catch (error) {
      console.error('Twilio make call error:', error);
      throw new Error('Failed to initiate call');
    }
  }

  async transferCall(callSid, to) {
    try {
      const call = await this.client.calls(callSid).update({
        twiml: `<Response><Dial>${to}</Dial></Response>`
      });

      return call;
    } catch (error) {
      console.error('Twilio transfer call error:', error);
      throw new Error('Failed to transfer call');
    }
  }

  async getCallDetails(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();
      return call;
    } catch (error) {
      console.error('Twilio get call error:', error);
      throw new Error('Failed to get call details');
    }
  }

  async getRecording(recordingSid) {
    try {
      const recording = await this.client.recordings(recordingSid).fetch();
      return recording;
    } catch (error) {
      console.error('Twilio get recording error:', error);
      throw new Error('Failed to get recording');
    }
  }

  generateTwiML(options) {
    const { message, gatherDigits, transferNumbers } = options;
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (gatherDigits) {
      const gather = response.gather({
        numDigits: 1,
        action: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/webhooks/twilio/gather`,
        method: 'POST',
        timeout: 10
      });

      gather.say(message || 'Press 1 or 2 to speak with an agent.');
    } else {
      response.say(message);
    }

    return response.toString();
  }
}

module.exports = new TwilioService();

