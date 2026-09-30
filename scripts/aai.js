import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.ASSEMBLYAI_API_KEY || '';
const AGENTS_URL = 'https://agents.assemblyai.com/v1';
const CORE_URL = 'https://api.assemblyai.com/v2';

const agentHeaders = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

const coreHeaders = {
  'Authorization': API_KEY,
  'Content-Type': 'application/json',
};

const [,, cmd, ...args] = process.argv;

async function main() {
  switch (cmd) {
    case 'list-agents':
    case 'agents': {
      const res = await fetch(`${AGENTS_URL}/agents`, { headers: agentHeaders });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'get-agent': {
      const id = args[0] || 'agent_735f85fdf5e14bf3adb196d459e8f439';
      const res = await fetch(`${AGENTS_URL}/agents/${id}`, { headers: agentHeaders });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'token': {
      const secs = args[0] || 600;
      const res = await fetch(`${AGENTS_URL}/token?expires_in_seconds=${secs}`, { headers: agentHeaders });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'sessions': {
      const res = await fetch(`${AGENTS_URL}/sessions`, { headers: agentHeaders });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'get-session': {
      const id = args[0];
      if (!id) {
        console.error('Usage: node scripts/aai.js get-session <session_id>');
        process.exit(1);
      }
      const res = await fetch(`${AGENTS_URL}/sessions/${id}`, { headers: agentHeaders });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'transcripts': {
      const limit = args[0] || 10;
      const res = await fetch(`${CORE_URL}/transcript?limit=${limit}`, { headers: coreHeaders });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    default:
      console.log(`
AssemblyAI Developer CLI
Usage:
  node scripts/aai.js agents            - List all Voice Agents in account
  node scripts/aai.js get-agent [id]    - Show full config of an agent
  node scripts/aai.js token [seconds]   - Mint client WebSocket auth token
  node scripts/aai.js sessions          - List recent agent call sessions
  node scripts/aai.js get-session <id>  - Get session details, audio recording URL, and events
  node scripts/aai.js transcripts       - List STT transcripts
`);
  }
}

main().catch(console.error);
