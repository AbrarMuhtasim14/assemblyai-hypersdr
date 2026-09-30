/**
 * Twilio Telephony Adapter for Outbound Phone Calling
 * Connects Twilio SIP / Voice Media Stream directly to AssemblyAI Voice Agent API.
 */

export class TwilioAdapter {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.trunkDomain = process.env.TWILIO_TRUNK_DOMAIN;
  }

  isConfigured() {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  /**
   * Generates TwiML for connecting a phone call to the AssemblyAI Voice Agent SIP / Media Stream
   */
  generateTwiML(agentId, serverHost) {
    if (this.trunkDomain) {
      // Direct SIP trunk connection to AssemblyAI Voice Agent
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Sip>sip:${agentId}@${this.trunkDomain}</Sip>
    </Dial>
</Response>`;
    }

    // Media stream WebSocket bridge to our server
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://${serverHost}/media-stream">
            <Parameter name="agentId" value="${agentId}" />
        </Stream>
    </Connect>
</Response>`;
  }

  /**
   * Dispatches an actual outbound phone call via Twilio REST API
   */
  async makeOutboundCall(toNumber, agentId, serverHost) {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'mock_telephony',
        message: 'Twilio credentials not configured in .env. Using high-fidelity browser console instead.'
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`;
      const twiml = this.generateTwiML(agentId, serverHost);

      const params = new URLSearchParams();
      params.append('To', toNumber);
      params.append('From', this.fromNumber);
      params.append('Twiml', twiml);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();
      return {
        success: response.ok,
        callSid: data.sid,
        status: data.status,
        data
      };
    } catch (err) {
      console.error('[Twilio] Outbound call error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

export const twilioAdapter = new TwilioAdapter();
