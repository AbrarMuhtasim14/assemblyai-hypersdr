import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';

import { leadService } from './services/leadService.js';
import { crmService } from './services/crmService.js';
import { postCallService } from './services/postCallService.js';
import { smartSchedulerService } from './services/smartSchedulerService.js';
import { googleSheetService } from './services/googleSheetService.js';
import { googleCalendarService } from './services/googleCalendarService.js';
import { AssemblyAIVoiceSession } from './assemblyai/client.js';
import { twilioAdapter } from './telephony/twilioAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/call' });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../public')));

// ==========================================
// GOOGLE OAUTH & CALENDAR AUTH ROUTES
// ==========================================

// Initiate Google Calendar OAuth consent
app.get('/api/auth/google', (req, res) => {
  const authUrl = googleCalendarService.getAuthUrl();
  res.redirect(authUrl);
});

// Google OAuth 2.0 callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('OAuth authorization code missing.');
  }

  try {
    await googleCalendarService.handleCallbackCode(code);
    res.redirect('/?calendar_connected=true');
  } catch (err) {
    console.error('[Google OAuth Error]:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

// Check Google Calendar connection status
app.get('/api/auth/google/status', (req, res) => {
  res.json(googleCalendarService.getStatus());
});

// ==========================================
// REST API ROUTES
// ==========================================

// Get all leads
app.get('/api/leads', (req, res) => {
  const leads = leadService.getAllLeads();
  res.json({
    total: leads.length,
    leads: leads
  });
});

// Export updated leads with call summaries & meeting outcomes to Excel
app.get('/api/leads/export', (req, res) => {
  try {
    const buffer = leadService.exportLeadsToExcel();
    res.setHeader('Content-Disposition', 'attachment; filename="usa_boutique_hotels_vip_outcomes.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('[Export] Error exporting leads to Excel:', err);
    res.status(500).json({ error: 'Failed to generate Excel export', details: err.message });
  }
});

// Book REAL Google Calendar meeting directly for a lead (with real Google Meet creation)
app.post('/api/leads/:id/book-meeting', async (req, res) => {
  const lead = leadService.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const realBooking = await googleCalendarService.createRealCalendarEvent(lead, req.body);
  const updated = leadService.bookMeeting(req.params.id, {
    ...req.body,
    googleMeetLink: realBooking.googleMeetLink,
    googleCalendarUrl: realBooking.googleCalendarUrl,
    eventId: realBooking.eventId,
    realApiCreated: realBooking.realApiCreated
  });

  res.json({
    success: true,
    message: realBooking.realApiCreated ? 'Real Google Calendar Event & Meet Link Created!' : 'Calendar booking ready and saved.',
    booking: realBooking,
    lead: updated
  });
});

// Get prioritized dialing queue (sorted by active window, answer likelihood & value)
app.get('/api/queue', (req, res) => {
  const queue = leadService.getPrioritizedQueue();
  const optimalCount = queue.filter(l => l.schedule && l.schedule.status === 'OPTIMAL_WINDOW').length;
  const acceptableCount = queue.filter(l => l.schedule && l.schedule.status === 'ACCEPTABLE_WINDOW').length;

  res.json({
    total: queue.length,
    optimalCount,
    acceptableCount,
    queue
  });
});

// Get global/regional clocks and window statuses
app.get('/api/timezones', (req, res) => {
  const clocks = smartSchedulerService.getRegionalClocks();
  res.json({
    timestamp: new Date().toISOString(),
    clocks
  });
});

// Google Sheet Sync Status
app.get('/api/sheet/status', (req, res) => {
  res.json(googleSheetService.getStatus());
});

// Trigger dynamic Google Sheet sync
app.post('/api/sheet/sync', async (req, res) => {
  const { sheetUrl } = req.body;
  const result = await leadService.syncGoogleSheet(sheetUrl);
  res.json(result);
});

// Get ready-to-paste Google Apps Script code for 2-way sync
app.get('/api/sheet/apps-script', (req, res) => {
  res.json({
    code: googleSheetService.getAppsScriptTemplate()
  });
});

// Inbound webhook for Google Sheet row adds / form fills
app.post('/api/leads/webhook', (req, res) => {
  try {
    const newLead = leadService.handleIncomingWebhook(req.body);
    console.log(`[Webhook] Ingested dynamic lead: ${newLead.agencyName} (${newLead.id})`);
    res.status(201).json({
      success: true,
      message: 'Lead ingested into priority dialing queue',
      lead: newLead
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get single lead by ID
app.get('/api/leads/:id', (req, res) => {
  const lead = leadService.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  res.json(lead);
});

// Add a custom lead manually
app.post('/api/leads', (req, res) => {
  const newLead = leadService.addCustomLead(req.body);
  res.status(201).json(newLead);
});

// Get CRM call logs
app.get('/api/crm/logs', (req, res) => {
  const logs = crmService.getAllLogs();
  res.json({
    total: logs.length,
    logs: logs
  });
});

// Mint AssemblyAI Voice Agent token for client-side authentication
app.get('/api/token', async (req, res) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY is not configured in .env' });
  }

  try {
    const response = await fetch('https://agents.assemblyai.com/v1/token?expires_in_seconds=300', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Twilio Outbound Phone Call trigger
app.post('/api/twilio/call', async (req, res) => {
  const { leadId, phoneNumber } = req.body;
  const lead = leadService.getLeadById(leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const host = req.get('host');
  const result = await twilioAdapter.makeOutboundCall(phoneNumber, lead.id, host);
  res.json(result);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    assemblyai_configured: !!process.env.ASSEMBLYAI_API_KEY,
    twilio_configured: twilioAdapter.isConfigured(),
    total_leads: leadService.getAllLeads().length,
    sheet_synced: googleSheetService.getStatus().syncedRowCount > 0,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// WEBSOCKET CALL MANAGEMENT
// ==========================================

wss.on('connection', (clientWs) => {
  console.log('[WebSocket Client] Browser dialer connected.');
  let voiceSession = null;
  let currentLead = null;

  // Safe sender to browser client
  const sendToClient = (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(data));
    }
  };

  clientWs.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        // Start an outbound call to a selected lead
        case 'start_call': {
          const leadId = data.leadId;

          // Real-time Google Sheet live refresh (fetches latest email/edits immediately)
          if (googleSheetService.sheetUrl) {
            try {
              await leadService.syncGoogleSheet();
            } catch (e) {
              console.warn('[Call Manager] Real-time sheet refresh notice:', e.message);
            }
          }

          currentLead = leadService.getLeadById(leadId);

          if (!currentLead) {
            sendToClient({ type: 'error', error: `Lead not found: ${leadId}` });
            return;
          }

          console.log(`[Call Manager] Initiating Outbound Voice Call to ${currentLead.agencyName} (${currentLead.decisionMaker} - ${currentLead.email})...`);

          // Create Voice Session with AssemblyAI
          voiceSession = new AssemblyAIVoiceSession(currentLead, {
            apiKey: process.env.ASSEMBLYAI_API_KEY,
            voiceId: data.voiceId || 'george',
            onClientEvent: (event) => sendToClient(event)
          });

          try {
            await voiceSession.start();
          } catch (err) {
            console.error('[Call Manager] Failed to start voice session:', err);
            sendToClient({ type: 'error', error: err.message });
          }
          break;
        }

        // Stream audio chunk from browser microphone (base64 PCM16)
        case 'input_audio': {
          if (voiceSession) {
            voiceSession.sendAudioChunk(data.audio);
          }
          break;
        }

        // Barge-in / Interruption signal
        case 'interrupt': {
          if (voiceSession) {
            voiceSession.interrupt();
          }
          break;
        }

        // End Call
        case 'end_call': {
          if (voiceSession && currentLead) {
            console.log(`[Call Manager] Ending call with ${currentLead.agencyName}...`);
            const duration = voiceSession.getCallDuration();
            const transcripts = voiceSession.getConversationHistory();
            
            voiceSession.endCall();

            // Fetch the freshest lead state (including any meeting booked during the call)
            const freshLead = leadService.getLeadById(currentLead.id) || currentLead;

            // Run Post-Call Speech Intelligence
            sendToClient({
              type: 'call_status',
              status: 'analyzing',
              message: 'Call ended. Running Post-Call Speech Intelligence & BANT Audit...'
            });

            const callAudit = await postCallService.analyzeCall(freshLead, transcripts, duration);
            crmService.saveCallLog(callAudit);

            // Trigger Two-Way Sync back to Google Sheet
            const syncResult = await leadService.recordCallResult(freshLead.id, callAudit);

            sendToClient({
              type: 'call_summary',
              summary: callAudit,
              sheetSync: syncResult ? syncResult.sheetSyncResult : null
            });

            voiceSession = null;
          }
          break;
        }

        default:
          console.warn('[Call Manager] Unknown client message type:', data.type);
          break;
      }
    } catch (err) {
      console.error('[Call Manager] Error handling client message:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('[WebSocket Client] Browser dialer disconnected.');
    if (voiceSession) {
      voiceSession.endCall();
      voiceSession = null;
    }
  });
});

// Start Server
server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`🚀 HyperSDR Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📡 AssemblyAI Voice Agent API: ${process.env.ASSEMBLYAI_AGENT_ENDPOINT || 'wss://agents.assemblyai.com/v1/ws'}`);
  console.log(`🎙️ Pre-loaded Agency Leads: ${leadService.getAllLeads().length}`);
  console.log(`📊 Google Sheet Status: ${googleSheetService.getStatus().syncStatus}`);
  console.log('====================================================');
});
