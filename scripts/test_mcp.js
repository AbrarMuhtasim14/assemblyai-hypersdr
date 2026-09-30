import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mcpServerPath = path.resolve(__dirname, '../mcp-server/index.js');

console.log('--- Testing AssemblyAI Product Development MCP Server v1.1.0 ---');

const child = spawn('node', [mcpServerPath], {
  env: { ...process.env, ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY || '' },
  stdio: ['pipe', 'pipe', 'inherit']
});

let step = 0;
let raw = '';

const tests = [
  {
    name: 'initialize',
    req: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'verifier', version: '1.1' } }
    },
    verify: (res) => res.result?.serverInfo?.name === 'assemblyai-account-mcp'
  },
  {
    name: 'tools/list',
    req: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    verify: (res) => {
      const toolNames = res.result?.tools?.map(t => t.name) || [];
      console.log(`  Discovered ${toolNames.length} MCP tools:`, toolNames.join(', '));
      return toolNames.includes('list_voice_agents') && toolNames.includes('create_voice_agent') && toolNames.includes('llm_gateway_chat');
    }
  },
  {
    name: 'tools/call (list_voice_agents)',
    req: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_voice_agents', arguments: {} } },
    verify: (res) => {
      const parsed = JSON.parse(res.result.content[0].text);
      console.log(`  Found ${parsed.agents.length} agent(s). First: "${parsed.agents[0]?.name}" (ID: ${parsed.agents[0]?.id})`);
      return parsed.agents.length > 0;
    }
  },
  {
    name: 'tools/call (mint_agent_token)',
    req: { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'mint_agent_token', arguments: { expires_in_seconds: 300 } } },
    verify: (res) => {
      const parsed = JSON.parse(res.result.content[0].text);
      console.log(`  Minted WebSocket token valid for ${parsed.expires_in_seconds}s (Token length: ${parsed.token?.length})`);
      return !!parsed.token;
    }
  },
  {
    name: 'tools/call (llm_gateway_chat)',
    req: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'llm_gateway_chat',
        arguments: {
          model: 'qwen3.5-4b-32k-fast',
          messages: [{ role: 'user', content: 'Reply with the word VERIFIED.' }],
          max_tokens: 20
        }
      }
    },
    verify: (res) => {
      const parsed = JSON.parse(res.result.content[0].text);
      const text = parsed.choices?.[0]?.message?.content || '';
      console.log(`  LLM Gateway response: "${text.trim()}"`);
      return text.length > 0;
    }
  }
];

function sendNext() {
  if (step >= tests.length) {
    console.log('\n[SUCCESS] All AssemblyAI MCP tools tested and verified perfectly!');
    child.kill();
    process.exit(0);
    return;
  }
  const current = tests[step];
  child.stdin.write(JSON.stringify(current.req) + '\n');
}

child.stdout.on('data', (d) => {
  raw += d.toString();
  const lines = raw.split('\n');
  raw = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const json = JSON.parse(line);
      const current = tests[step];
      if (json.id === current.req.id) {
        const ok = current.verify(json);
        console.log(`  [PASS] Test #${step + 1}: ${current.name} -> ${ok ? 'PASSED' : 'FAILED'}`);
        if (!ok) {
          console.error('Failure payload:', json);
          child.kill();
          process.exit(1);
        }
        step++;
        sendNext();
      }
    } catch (e) {
      console.error('Error parsing line:', e);
    }
  }
});

sendNext();
