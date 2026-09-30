import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_KEY = process.env.ASSEMBLYAI_API_KEY || '';
const AGENTS_BASE_URL = 'https://agents.assemblyai.com/v1';
const CORE_BASE_URL = 'https://api.assemblyai.com/v2';
const LLM_GATEWAY_BASE_URL = 'https://llm-gateway.assemblyai.com/v1';

function getAgentHeaders() {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function getCoreHeaders() {
  return {
    'Authorization': API_KEY,
    'Content-Type': 'application/json',
  };
}

const server = new Server(
  {
    name: 'assemblyai-account-mcp',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const TOOLS = [
  {
    name: 'list_voice_agents',
    description: 'Lists all Voice Agents registered in the user AssemblyAI account.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of agents to return (optional).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_voice_agent',
    description: 'Retrieves full details for a specific Voice Agent, including system instructions, greeting, flat tool schemas, and voice audio settings.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The unique ID of the Voice Agent (e.g. agent_735f85fdf5e14bf3adb196d459e8f439).',
        },
      },
      required: ['agent_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_voice_agent',
    description: 'Creates a new Voice Agent directly inside the user AssemblyAI Cloud account with instructions, greeting, flat tool schemas, and voice configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the Voice Agent.',
        },
        system_prompt: {
          type: 'string',
          description: 'The core prompt and instructions defining the agent behavior and knowledge.',
        },
        instructions: {
          type: 'string',
          description: 'Alias for system_prompt.',
        },
        greeting: {
          type: 'string',
          description: 'The initial greeting sentence the agent speaks when a call connects.',
        },
        voice_id: {
          type: 'string',
          description: 'Voice identifier (e.g. "george", "anna", "eve"). Default: "george".',
        },
        tools: {
          type: 'array',
          description: 'Array of tool definitions using flat AssemblyAI JSON-Schema format ({ type: "function", name, description, parameters }).',
          items: {
            type: 'object',
          },
        },
        sample_rate: {
          type: 'number',
          description: 'Audio sample rate in Hz (default: 24000 for Universal-3.5 Pro).',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_voice_agent',
    description: 'Updates an existing Voice Agent in the user AssemblyAI Cloud account (prompt instructions, greeting, tools, voice, or name).',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The unique ID of the Voice Agent to update.',
        },
        name: {
          type: 'string',
          description: 'Updated name of the Voice Agent.',
        },
        instructions: {
          type: 'string',
          description: 'Updated system prompt instructions.',
        },
        greeting: {
          type: 'string',
          description: 'Updated initial greeting.',
        },
        voice_id: {
          type: 'string',
          description: 'Updated voice identifier (e.g. "george", "anna").',
        },
        tools: {
          type: 'array',
          description: 'Updated array of tool definitions.',
          items: {
            type: 'object',
          },
        },
      },
      required: ['agent_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_voice_agent',
    description: 'Deletes a Voice Agent from the user AssemblyAI Cloud account by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The unique ID of the Voice Agent to delete.',
        },
      },
      required: ['agent_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'mint_agent_token',
    description: 'Generates a secure temporary token to connect an audio client or browser session directly to AssemblyAI Voice Agent WebSocket (wss://agents.assemblyai.com/v1/ws).',
    inputSchema: {
      type: 'object',
      properties: {
        expires_in_seconds: {
          type: 'number',
          description: 'Expiration time in seconds (default: 600 seconds / 10 minutes).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_call_sessions',
    description: 'Lists Voice Agent call sessions from the user AssemblyAI account, including status, duration, timestamps, and caller end reasons.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max number of sessions to return.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_call_session',
    description: 'Retrieves full details for a specific call session, including recording audio URLs, event timelines, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'The unique ID of the call session (e.g. sess_118e6e8dbf924b5bb1403e51aa8f6921).',
        },
      },
      required: ['session_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_transcript',
    description: 'Transcribes an audio recording using AssemblyAI Speech-to-Text with options for speaker diarization, sentiment analysis, and summaries.',
    inputSchema: {
      type: 'object',
      properties: {
        audio_url: {
          type: 'string',
          description: 'Public URL of the audio file to transcribe.',
        },
        speaker_labels: {
          type: 'boolean',
          description: 'Enable speaker diarization (default: false).',
        },
        sentiment_analysis: {
          type: 'boolean',
          description: 'Enable sentiment analysis per utterance (default: false).',
        },
        speech_models: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered fallback models, e.g. ["universal-3-5-pro", "universal-2"].',
        },
      },
      required: ['audio_url'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_transcript',
    description: 'Retrieves the transcription status and text for a transcript job, including speaker turns, sentiment, and confidence.',
    inputSchema: {
      type: 'object',
      properties: {
        transcript_id: {
          type: 'string',
          description: 'The unique ID of the transcript job.',
        },
      },
      required: ['transcript_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_transcripts',
    description: 'Lists recent speech-to-text transcripts in the user AssemblyAI account.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of transcripts to return (default: 20).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'llm_gateway_chat',
    description: 'Uses AssemblyAI LLM Gateway (official replacement for LeMUR) to analyze transcripts, qualify B2B leads, extract action items, or generate structured scorecards.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model name (e.g. "qwen3.5-4b-32k-fast", "qwen3-next-80b-a3b", "gpt-5.6-luna"). Default: "qwen3.5-4b-32k-fast".',
        },
        messages: {
          type: 'array',
          description: 'Array of message objects [{ role: "system"|"user"|"assistant", content: string }].',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to generate (default: 1000).',
        },
        temperature: {
          type: 'number',
          description: 'Sampling temperature.',
        },
      },
      required: ['messages'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_llm_models',
    description: 'Lists all available foundation models on the AssemblyAI LLM Gateway for the account.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'list_voice_agents': {
        const url = `${AGENTS_BASE_URL}/agents`;
        const res = await fetch(url, { headers: getAgentHeaders() });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'get_voice_agent': {
        const { agent_id } = args;
        if (!agent_id) throw new Error('Missing required argument: agent_id');
        const url = `${AGENTS_BASE_URL}/agents/${agent_id}`;
        const res = await fetch(url, { headers: getAgentHeaders() });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'create_voice_agent': {
        const {
          name: agentName,
          system_prompt,
          instructions,
          greeting,
          voice_id = 'george',
          tools = [],
          sample_rate = 24000,
        } = args;

        const prompt = system_prompt || instructions;
        if (!prompt) throw new Error('Missing required argument: system_prompt or instructions');

        const payload = {
          name: agentName,
          system_prompt: prompt,
          greeting: greeting || undefined,
          voice: { voice_id },
          tools,
          input: {
            type: 'audio',
            format: { encoding: 'audio/pcm', sample_rate },
          },
          output: {
            type: 'audio',
            voice: voice_id,
            format: { encoding: 'audio/pcm', sample_rate },
          },
        };

        const res = await fetch(`${AGENTS_BASE_URL}/agents`, {
          method: 'POST',
          headers: getAgentHeaders(),
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`AssemblyAI API error (${res.status}): ${JSON.stringify(data)}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Voice Agent successfully created in AssemblyAI Cloud!\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'update_voice_agent': {
        const { agent_id, name: agentName, system_prompt, instructions, greeting, voice_id, tools } = args;
        if (!agent_id) throw new Error('Missing required argument: agent_id');

        const existingRes = await fetch(`${AGENTS_BASE_URL}/agents/${agent_id}`, {
          headers: getAgentHeaders(),
        });
        if (!existingRes.ok) {
          throw new Error(`Failed to fetch agent ${agent_id}: ${await existingRes.text()}`);
        }
        const existing = await existingRes.json();

        const resolvedVoice = voice_id || existing.voice?.voice_id || 'george';
        const prompt = system_prompt !== undefined ? system_prompt : (instructions !== undefined ? instructions : existing.system_prompt);

        const payload = {
          name: agentName !== undefined ? agentName : existing.name,
          system_prompt: prompt,
          greeting: greeting !== undefined ? greeting : existing.greeting,
          voice: { voice_id: resolvedVoice },
          tools: tools !== undefined ? tools : existing.tools,
          input: existing.input,
          output: {
            type: 'audio',
            voice: resolvedVoice,
            format: { encoding: 'audio/pcm', sample_rate: 24000 },
          },
        };

        const res = await fetch(`${AGENTS_BASE_URL}/agents/${agent_id}`, {
          method: 'PUT',
          headers: getAgentHeaders(),
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`AssemblyAI API error (${res.status}): ${JSON.stringify(data)}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Voice Agent ${agent_id} successfully updated in AssemblyAI Cloud!\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'delete_voice_agent': {
        const { agent_id } = args;
        if (!agent_id) throw new Error('Missing required argument: agent_id');

        const res = await fetch(`${AGENTS_BASE_URL}/agents/${agent_id}`, {
          method: 'DELETE',
          headers: getAgentHeaders(),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Delete failed (${res.status}): ${text}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Voice Agent ${agent_id} successfully deleted from AssemblyAI Cloud.`,
            },
          ],
        };
      }

      case 'mint_agent_token': {
        const seconds = args.expires_in_seconds || 600;
        const res = await fetch(`${AGENTS_BASE_URL}/token?expires_in_seconds=${seconds}`, {
          headers: getAgentHeaders(),
        });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'list_call_sessions': {
        const res = await fetch(`${AGENTS_BASE_URL}/sessions`, {
          headers: getAgentHeaders(),
        });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'get_call_session': {
        const { session_id } = args;
        if (!session_id) throw new Error('Missing required argument: session_id');
        const res = await fetch(`${AGENTS_BASE_URL}/sessions/${session_id}`, {
          headers: getAgentHeaders(),
        });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'create_transcript': {
        const {
          audio_url,
          speaker_labels = false,
          sentiment_analysis = false,
          speech_models = ['universal-3-5-pro', 'universal-2'],
        } = args;

        const res = await fetch(`${CORE_BASE_URL}/transcript`, {
          method: 'POST',
          headers: getCoreHeaders(),
          body: JSON.stringify({
            audio_url,
            speaker_labels,
            sentiment_analysis,
            speech_models,
          }),
        });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'get_transcript': {
        const { transcript_id } = args;
        if (!transcript_id) throw new Error('Missing required argument: transcript_id');
        const res = await fetch(`${CORE_BASE_URL}/transcript/${transcript_id}`, {
          headers: getCoreHeaders(),
        });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'list_transcripts': {
        const limit = args.limit || 20;
        const res = await fetch(`${CORE_BASE_URL}/transcript?limit=${limit}`, {
          headers: getCoreHeaders(),
        });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'llm_gateway_chat': {
        const {
          model = 'qwen3.5-4b-32k-fast',
          messages,
          max_tokens = 1000,
          temperature,
        } = args;

        if (!messages || !Array.isArray(messages)) {
          throw new Error('Missing required argument: messages (array of {role, content})');
        }

        const payload = {
          model,
          messages,
          max_tokens,
        };
        if (temperature !== undefined) payload.temperature = temperature;

        const res = await fetch(`${LLM_GATEWAY_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: getCoreHeaders(),
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`LLM Gateway error (${res.status}): ${JSON.stringify(data)}`);
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'list_llm_models': {
        const res = await fetch(`${LLM_GATEWAY_BASE_URL}/models`, {
          headers: getCoreHeaders(),
        });
        const data = await res.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `AssemblyAI MCP Error [${name}]: ${error.message}`,
        },
      ],
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AssemblyAI Account & Product Development MCP Server running on stdio');
}

run().catch((err) => {
  console.error('Fatal error running AssemblyAI MCP Server:', err);
  process.exit(1);
});
