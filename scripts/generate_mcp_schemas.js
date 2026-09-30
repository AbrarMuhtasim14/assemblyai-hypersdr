import fs from 'fs';
import path from 'path';

const targetDirs = [
  'C:/Users/USER/.gemini/antigravity/mcp/assemblyai',
  'C:/Users/USER/.gemini/antigravity-ide/mcp/assemblyai'
];

const tools = [
  {
    name: 'list_voice_agents',
    description: 'Lists all Voice Agents registered in the user AssemblyAI account.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of agents to return (optional).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_voice_agent',
    description: 'Retrieves full details for a specific Voice Agent, including system instructions, greeting, flat tool schemas, and voice audio settings.',
    parameters: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'The unique ID of the Voice Agent (e.g. agent_735f85fdf5e14bf3adb196d459e8f439).' }
      },
      required: ['agent_id'],
      additionalProperties: false
    }
  },
  {
    name: 'create_voice_agent',
    description: 'Creates a new Voice Agent directly inside the user AssemblyAI Cloud account with instructions, greeting, flat tool schemas, and voice configuration.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the Voice Agent.' },
        instructions: { type: 'string', description: 'The core prompt and instructions defining the agent behavior and knowledge.' },
        greeting: { type: 'string', description: 'The initial greeting sentence the agent speaks when a call connects.' },
        voice_id: { type: 'string', description: 'Voice identifier (e.g. george, anna, eve). Default: george.' },
        tools: { type: 'array', description: 'Array of tool definitions using flat AssemblyAI JSON-Schema format ({ type: "function", name, description, parameters }).', items: { type: 'object' } },
        sample_rate: { type: 'number', description: 'Audio sample rate in Hz (default: 24000 for Universal-3.5 Pro).' }
      },
      required: ['name', 'instructions'],
      additionalProperties: false
    }
  },
  {
    name: 'update_voice_agent',
    description: 'Updates an existing Voice Agent in the user AssemblyAI Cloud account (prompt instructions, greeting, tools, voice, or name).',
    parameters: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'The unique ID of the Voice Agent to update.' },
        name: { type: 'string', description: 'Updated name of the Voice Agent.' },
        instructions: { type: 'string', description: 'Updated system prompt instructions.' },
        greeting: { type: 'string', description: 'Updated initial greeting.' },
        voice_id: { type: 'string', description: 'Updated voice identifier.' },
        tools: { type: 'array', description: 'Updated array of tool definitions.', items: { type: 'object' } }
      },
      required: ['agent_id'],
      additionalProperties: false
    }
  },
  {
    name: 'delete_voice_agent',
    description: 'Deletes a Voice Agent from the user AssemblyAI Cloud account by ID.',
    parameters: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'The unique ID of the Voice Agent to delete.' }
      },
      required: ['agent_id'],
      additionalProperties: false
    }
  },
  {
    name: 'mint_agent_token',
    description: 'Generates a secure temporary token to connect an audio client or browser session directly to AssemblyAI Voice Agent WebSocket (wss://agents.assemblyai.com/v1/ws).',
    parameters: {
      type: 'object',
      properties: {
        expires_in_seconds: { type: 'number', description: 'Expiration time in seconds (default: 600 seconds / 10 minutes).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_call_sessions',
    description: 'Lists Voice Agent call sessions from the user AssemblyAI account, including status, duration, timestamps, and caller end reasons.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of sessions to return.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_call_session',
    description: 'Retrieves full details for a specific call session, including recording audio URLs, event timelines, and metadata.',
    parameters: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'The unique ID of the call session (e.g. sess_118e6e8dbf924b5bb1403e51aa8f6921).' }
      },
      required: ['session_id'],
      additionalProperties: false
    }
  },
  {
    name: 'create_transcript',
    description: 'Transcribes an audio recording using AssemblyAI Speech-to-Text with options for speaker diarization, sentiment analysis, and summaries.',
    parameters: {
      type: 'object',
      properties: {
        audio_url: { type: 'string', description: 'Public URL of the audio file to transcribe.' },
        speaker_labels: { type: 'boolean', description: 'Enable speaker diarization (default: false).' },
        sentiment_analysis: { type: 'boolean', description: 'Enable sentiment analysis per utterance (default: false).' },
        speech_models: { type: 'array', items: { type: 'string' }, description: 'Ordered fallback models, e.g. ["universal-3-5-pro", "universal-2"].' }
      },
      required: ['audio_url'],
      additionalProperties: false
    }
  },
  {
    name: 'get_transcript',
    description: 'Retrieves the transcription status and text for a transcript job, including speaker turns, sentiment, and confidence.',
    parameters: {
      type: 'object',
      properties: {
        transcript_id: { type: 'string', description: 'The unique ID of the transcript job.' }
      },
      required: ['transcript_id'],
      additionalProperties: false
    }
  },
  {
    name: 'list_transcripts',
    description: 'Lists recent speech-to-text transcripts in the user AssemblyAI account.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of transcripts to return (default: 20).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'llm_gateway_chat',
    description: 'Uses AssemblyAI LLM Gateway (official replacement for LeMUR) to analyze transcripts, qualify B2B leads, extract action items, or generate structured scorecards.',
    parameters: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Model name (e.g. "qwen3.5-4b-32k-fast", "qwen3-next-80b-a3b", "gpt-5.6-luna").' },
        messages: {
          type: 'array',
          description: 'Array of message objects [{ role: "system"|"user"|"assistant", content: string }].',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['role', 'content']
          }
        },
        max_tokens: { type: 'number', description: 'Maximum tokens to generate (default: 1000).' },
        temperature: { type: 'number', description: 'Sampling temperature.' }
      },
      required: ['messages'],
      additionalProperties: false
    }
  },
  {
    name: 'list_llm_models',
    description: 'Lists all available foundation models on the AssemblyAI LLM Gateway for the account.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

const instructions = `# AssemblyAI Account & Product Development MCP Server
This Model Context Protocol server connects directly to the user's AssemblyAI Cloud account to build, configure, deploy, and manage Voice Agents, call sessions, audio recordings, transcripts, and LLM Gateway intelligence.

### Available Capabilities:
- **Voice Agent Management**: create, update, inspect, and delete Voice Agents in AssemblyAI Cloud (\`list_voice_agents\`, \`get_voice_agent\`, \`create_voice_agent\`, \`update_voice_agent\`, \`delete_voice_agent\`).
- **Live Call Audio & WebSockets**: Mint client connection tokens for the Voice Agent WebSocket (\`mint_agent_token\`).
- **Call Sessions & Recordings**: Retrieve past agent call sessions, audio recording URLs, event timelines, and execution metrics (\`list_call_sessions\`, \`get_call_session\`).
- **Speech-to-Text**: Run transcription jobs on recordings with speaker diarization & sentiment analysis (\`create_transcript\`, \`get_transcript\`, \`list_transcripts\`).
- **LLM Gateway Intelligence**: Apply LLM models to analyze transcripts, qualify leads, extract action items, and generate scorecards (\`llm_gateway_chat\`, \`list_llm_models\`).
`;

for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Clean old files
  const existing = fs.readdirSync(targetDir);
  for (const f of existing) {
    fs.unlinkSync(path.join(targetDir, f));
  }

  for (const t of tools) {
    const filePath = path.join(targetDir, t.name + '.json');
    fs.writeFileSync(filePath, JSON.stringify(t, null, 2), 'utf8');
  }

  fs.writeFileSync(path.join(targetDir, 'instructions.md'), instructions, 'utf8');
  console.log('Successfully updated target directory:', targetDir);
}
