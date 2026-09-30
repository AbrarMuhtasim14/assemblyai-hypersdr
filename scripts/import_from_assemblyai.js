import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.ASSEMBLYAI_API_KEY;
const AGENT_ID = process.argv[2] || process.env.ASSEMBLYAI_AGENT_ID;

if (!API_KEY) {
  console.error('Error: ASSEMBLYAI_API_KEY is not defined in .env');
  process.exit(1);
}

if (!AGENT_ID) {
  console.error('Usage: node scripts/import_from_assemblyai.js <AGENT_ID>');
  process.exit(1);
}

async function importAgent() {
  console.log(`📥 Fetching agent ${AGENT_ID} from AssemblyAI Cloud...`);

  try {
    const res = await fetch(`https://agents.assemblyai.com/v1/agents/${AGENT_ID}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch agent: ${res.status} - ${await res.text()}`);
    }

    const agentData = await res.json();
    const agentsDir = path.resolve(__dirname, '../agents');
    if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });

    const outputPath = path.join(agentsDir, `${agentData.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(agentData, null, 2));

    console.log('====================================================');
    console.log(`✓ Agent successfully imported from AssemblyAI!`);
    console.log(`  Name: ${agentData.name}`);
    console.log(`  ID: ${agentData.id}`);
    console.log(`  File saved to: ${outputPath}`);
    console.log('====================================================');
  } catch (err) {
    console.error('Error importing agent:', err.message);
  }
}

importAgent();
