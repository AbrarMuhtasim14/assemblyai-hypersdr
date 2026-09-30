import WebSocket from 'ws';
import { buildSDRPrompt } from './promptBuilder.js';
import { ASSEMBLYAI_TOOLS, executeToolCall } from './tools.js';

const ASSEMBLYAI_WS_URL = process.env.ASSEMBLYAI_AGENT_ENDPOINT || 'wss://agents.assemblyai.com/v1/ws';

export class AssemblyAIVoiceSession {
  constructor(lead, options = {}) {
    this.lead = lead;
    this.apiKey = options.apiKey || process.env.ASSEMBLYAI_API_KEY;
    this.voiceId = options.voiceId || 'george';
    this.onClientEvent = options.onClientEvent || (() => {});
    
    this.ws = null;
    this.sessionId = null;
    this.isConnected = false;
    this.isReady = false;
    this.conversationLog = [];
    this.callStartTime = null;
    this.pendingToolCall = null;
  }

  /**
   * Connects to the Voice Agent API WebSocket at wss://agents.assemblyai.com/v1/ws
   * Uses Authorization: Bearer <API_KEY> as required by Voice Agent API specs
   */
  async start() {
    if (!this.apiKey) {
      throw new Error('AssemblyAI API Key is required. Please set ASSEMBLYAI_API_KEY in .env');
    }

    const { systemPrompt, greeting } = buildSDRPrompt(this.lead);
    this.callStartTime = new Date();

    this.onClientEvent({
      type: 'call_status',
      status: 'connecting',
      leadId: this.lead.id,
      agencyName: this.lead.agencyName,
      message: 'Connecting to AssemblyAI Voice Agent API...'
    });

    return new Promise((resolve, reject) => {
      try {
        // Voice Agent API requires 'Authorization: Bearer <KEY>'
        this.ws = new WebSocket(ASSEMBLYAI_WS_URL, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });

        this.ws.on('open', () => {
          console.log(`[AssemblyAI WS] Connected! Sending session.update for ${this.lead.agencyName}...`);
          this.isConnected = true;

          // Step 1: Send session.update immediately per official docs
          const sessionUpdatePayload = {
            type: 'session.update',
            session: {
              system_prompt: systemPrompt,
              greeting: greeting,
              input: {
                format: { encoding: 'audio/pcm' },
                turn_detection: {
                  vad_threshold: 0.5,
                  min_silence: 200,
                  max_silence: 1000,
                  interrupt_response: true
                }
              },
              output: {
                voice: this.voiceId,
                format: { encoding: 'audio/pcm' } // 24 kHz mono PCM
              },
              tools: ASSEMBLYAI_TOOLS
            }
          };

          this.ws.send(JSON.stringify(sessionUpdatePayload));
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleServerMessage(data);
        });

        this.ws.on('error', (err) => {
          console.error('[AssemblyAI WS Error]:', err);
          this.onClientEvent({
            type: 'error',
            error: err.message || 'WebSocket error with AssemblyAI Voice Agent API'
          });
          reject(err);
        });

        this.ws.on('close', (code, reason) => {
          console.log(`[AssemblyAI WS] Disconnected: code=${code}, reason=${reason?.toString()}`);
          this.isConnected = false;
          this.isReady = false;
          this.onClientEvent({
            type: 'call_status',
            status: 'ended',
            code,
            reason: reason?.toString(),
            durationSeconds: this.getCallDuration()
          });
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Handles incoming WebSocket messages from AssemblyAI Voice Agent API
   */
  async handleServerMessage(rawData) {
    try {
      const msg = JSON.parse(rawData.toString());

      switch (msg.type) {
        case 'session.updated': {
          console.log('[AssemblyAI] Session updated successfully.');
          break;
        }

        case 'session.ready': {
          this.sessionId = msg.session_id;
          this.isReady = true;
          console.log(`[AssemblyAI] Session Ready! ID: ${this.sessionId}`);
          this.onClientEvent({
            type: 'call_status',
            status: 'in_progress',
            sessionId: this.sessionId,
            message: 'Connected! SDR Voice Agent speaking.'
          });
          break;
        }

        // VAD Speech events
        case 'input.speech.started': {
          this.onClientEvent({
            type: 'user_speech_started',
            timestamp: new Date().toISOString()
          });
          break;
        }

        case 'input.speech.stopped': {
          this.onClientEvent({
            type: 'user_speech_stopped',
            timestamp: new Date().toISOString()
          });
          break;
        }

        // Agent Voice Playback
        case 'reply.started': {
          this.onClientEvent({
            type: 'agent_speaking_started',
            replyId: msg.reply_id,
            timestamp: new Date().toISOString()
          });
          break;
        }

        case 'reply.audio': {
          // NOTE: Official AssemblyAI Voice Agent API spec uses msg.data for audio payload!
          const audioChunk = msg.data || msg.audio;
          if (audioChunk) {
            this.onClientEvent({
              type: 'agent_audio',
              audio: audioChunk, // Base64 PCM16 24kHz
              timestamp: new Date().toISOString()
            });
          }
          break;
        }

        case 'reply.done': {
          // Check for user barge-in / interruption
          if (msg.status === 'interrupted') {
            console.log('[AssemblyAI] User interrupted SDR response.');
            this.onClientEvent({
              type: 'agent_interrupted',
              replyId: msg.reply_id,
              timestamp: new Date().toISOString()
            });
          } else {
            this.onClientEvent({
              type: 'agent_speaking_ended',
              replyId: msg.reply_id,
              timestamp: new Date().toISOString()
            });
          }
          break;
        }

        // Transcripts (User and Agent)
        case 'transcript.user.delta':
        case 'transcript.user': {
          const text = msg.text || msg.transcript || (msg.delta ? msg.delta.text : '');
          const isFinal = msg.type === 'transcript.user' || msg.is_final === true;
          if (text) {
            if (isFinal) this.recordTranscript('user', text);
            this.onClientEvent({
              type: 'transcript',
              speaker: 'user',
              text: text,
              isFinal: isFinal,
              timestamp: new Date().toISOString()
            });
          }
          break;
        }

        case 'transcript.agent':
        case 'reply.delta': {
          const text = msg.text || msg.transcript || (msg.delta ? msg.delta.text : '');
          const isFinal = msg.type === 'transcript.agent';
          if (text) {
            if (isFinal) this.recordTranscript('agent', text);
            this.onClientEvent({
              type: 'transcript',
              speaker: 'agent',
              text: text,
              isFinal: isFinal,
              timestamp: new Date().toISOString()
            });
          }
          break;
        }

        // Tool Calls
        case 'tool.call': {
          console.log('[AssemblyAI Tool Call Received]:', msg);
          const callId = msg.call_id;
          const toolName = msg.name || (msg.function && msg.function.name);
          let toolArgs = {};

          try {
            const rawArgs = msg.arguments || (msg.function && msg.function.arguments);
            toolArgs = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : (rawArgs || {});
          } catch (e) {
            console.error('[Tool Call] Failed to parse tool arguments:', e);
          }

          // Execute tool with lead context and broadcast to UI
          const toolOutputString = await executeToolCall(
            toolName,
            toolArgs,
            this.lead,
            (event) => this.onClientEvent(event)
          );

          // Return result back to AssemblyAI Voice Agent WebSocket
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const toolResultMsg = {
              type: 'tool.result',
              call_id: callId,
              result: toolOutputString, // Official AssemblyAI Voice Agent API specification
              output: toolOutputString, // Fallback alias
              is_error: false
            };
            this.ws.send(JSON.stringify(toolResultMsg));
            console.log(`[AssemblyAI Tool Result Sent]: ${toolName} (callId: ${callId})`);
          }
          break;
        }

        default:
          this.onClientEvent({
            type: 'assemblyai_event',
            eventType: msg.type,
            payload: msg
          });
          break;
      }
    } catch (err) {
      console.error('[AssemblyAI] Failed to process server message:', err);
    }
  }

  /**
   * Streams audio from the browser / client microphone to AssemblyAI
   * Input format: Base64 PCM16 mono 24kHz
   */
  sendAudioChunk(base64AudioChunk) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isReady) {
      this.ws.send(JSON.stringify({
        type: 'input.audio',
        audio: base64AudioChunk
      }));
    }
  }

  recordTranscript(speaker, text) {
    this.conversationLog.push({
      speaker,
      text,
      timestamp: new Date().toISOString()
    });
  }

  getCallDuration() {
    if (!this.callStartTime) return 0;
    return Math.round((new Date() - this.callStartTime) / 1000);
  }

  getConversationHistory() {
    return this.conversationLog;
  }

  endCall() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.isReady = false;
  }
}
