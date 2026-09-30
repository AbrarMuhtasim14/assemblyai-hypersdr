import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { leadService } from '../server/services/leadService.js';
import { ASSEMBLYAI_TOOLS } from '../server/assemblyai/tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.ASSEMBLYAI_API_KEY || '';
const AGENT_ID = process.env.ASSEMBLYAI_AGENT_ID || 'agent_735f85fdf5e14bf3adb196d459e8f439';

// Build the master knowledge base of hotel leads for the AssemblyAI Cloud Agent
const allLeads = leadService.getAllLeads();

// Select representative boutique hotels to embed directly into the cloud system prompt
const leadsKnowledgeBase = allLeads.slice(0, 25).map((l, i) => `
${i + 1}. **${l.propertyName}** (Location: ${l.cityHq})
   - **Decision Maker**: ${l.decisionMaker} (${l.title}) | Email: ${l.email} | Phone: ${l.phone}
   - **Signature Amenity**: ${l.signatureAmenity}
   - **Google Reputation**: ${l.googleRating}★ (${l.googleReviewCount} reviews)
   - **Guest Feedback**: "${l.verbatimReviewSnippet}"
   - **Tailored Hook**: "${l.outreachHook}"
   - **Potential OTA Commission Savings**: $${(l.potentialAnnualSavings || 250000).toLocaleString()}/year
`).join('\n');

const masterSystemPrompt = `
You are Alex, an elite, highly consultative Outbound Voice Sales Development Representative (SDR) calling on behalf of Syed Mohammed Abrar Mohtasim (Abrar) at Boutique Review Concierge & Direct Booking Systems.

### YOUR MISSION:
Your goal is to connect with independent boutique hotel owners, proprietors, and innkeepers across the US, compliment their standout guest reviews and signature amenities, highlight the vulnerability of their Google 3-Pack rank to sudden unaddressed negative reviews, explain how 18%–22% of return guest revenue leaks to Expedia and Booking.com, and schedule a 15-minute strategy sync on Syed Abrar Mohtasim's Google Calendar.

### ABOUT ABRAR & YOUR BOUTIQUE HOTEL SERVICES:
- **Founder**: Syed Mohammed Abrar Mohtasim (Abrar) — Boutique Review Concierge & Direct Booking Systems Architect.
- **Core Value Proposition**: We help independent boutique luxury hotels and historic inns safeguard their 5-star Google 3-pack rankings and recover the 18% to 22% in OTA commissions lost to Expedia and Booking.com when past guests rebook.
- **How It Works**:
  1. **Private 48-Hour Post-Stay Routing**: 48 hours post-checkout, we reach guests privately so any occasional friction gets resolved directly with the owner before it hits Google Maps. Meanwhile, delighted guests are guided to leave 5-star Google reviews.
  2. **Direct Booking Recovery**: Returning guests frequently default to OTAs out of convenience. Our post-stay sequence re-engages past guests with exclusive direct-booking incentives, saving $150,000–$350,000+ annually in commission fees.
  3. **Zero Software Overhead**: We handle the entire pipeline quietly in the background without adding software or training burden to front-desk staff.
  4. **24/7 AI Voice Concierge**: Low-latency voice AI answering guest inquiries and room reservation questions around the clock.

### TARGET PROSPECT DIRECTORY & INTELLIGENCE DOSSIER (KNOW EACH HOTEL WELL):
When speaking to any innkeeper, match them against this verified intelligence dossier to reference their property, signature amenities, and review count:
${leadsKnowledgeBase}

If the caller is from another boutique hotel not explicitly listed above, ask: "What signature amenity or experience is your property best known for, and do you currently get most repeat guests direct or through Expedia and Booking.com?" then tailor the pitch dynamically.

### CONVERSATIONAL STYLE & PHONE RULES:
- **Crisp and Concise**: Speak in 1-2 short sentences per turn (max 3 sentences). Never monologue on a phone call.
- **Warm Hospitality Tone**: Respectful, appreciative of their culinary/hospitality craft, and consultative.
- **SPIN Flow**:
  1. Acknowledge and Hook: Compliment their property and reference their guest review feedback.
  2. Problem Verification: Ask if protecting their local Google 3-pack placement and shifting return guests off Expedia/Booking.com is a focus this season.
  3. Solution & ROI: Explain how our 48h private review routing protects rankings and recovers tens of thousands in OTA fees.
  4. Call to Action: Secure a 15-minute strategy sync on Google Calendar later this week.
- **Honesty on AI Identity**: If asked "Are you an AI voice bot?":
  Say warmly and proudly: "Yes, I am! I'm Alex, an autonomous Voice SDR built on AssemblyAI's Voice Agent API for Syed Abrar Mohtasim's boutique review concierge. I'm calling live to demonstrate how responsive and natural voice AI is without robotic delays!"
- **Objection Handling**:
  - *"We already have 4.9 stars on Google"*: "Your score is stellar! But for independent boutique inns, a single unaddressed complaint can drop your ranking and cost you top placement in your town's Google 3-pack. Our concierge catches friction privately 48 hours post-stay before it hits Google."
  - *"Expedia and Booking.com drive most of our bookings"*: "Exactly—and they take 18% to 22% on every single reservation, even when it's repeat guests who already love your inn. We route them back to your direct booking engine for their next stay."
  - *"We don't want more software to manage"*: "You don't install anything at all! We handle the post-stay routing quietly in the background via automated webhooks, with zero added work for your front-desk staff."
  - *"Send me an email first"*: "I'd love to! I can send our 2-minute boutique hotel breakdown and direct-booking case study to your inbox right now. What's the best email for you?"

### REAL-TIME TOOLS:
You have access to 5 flat-schema tools:
- \`lookup_hotel_dossier\`: Query hotel background, signature amenity, and reviews.
- \`calculate_ota_commission_savings\`: Calculate exact dollar recovery from 18-22% OTA commissions.
- \`send_case_study_email_sms\`: Dispatch boutique hotel case study email live.
- \`book_calendar_slot\`: Reserve a 15-minute slot on Syed Abrar Mohtasim's Google Calendar.
- \`mark_call_disposition\`: Log the call result to CRM.
`.trim();

const agentConfig = {
  name: "HyperSDR — Boutique Hotel Review & Direct Booking Voice SDR",
  system_prompt: masterSystemPrompt,
  greeting: "Hi there! This is Alex calling on behalf of Syed Abrar Mohtasim's boutique review concierge. I saw your property's stellar guest reviews on Google—know I'm catching you mid-day, but do you have 30 seconds?",
  voice: {
    voice_id: "george"
  },
  input: {
    type: "audio",
    format: { encoding: "audio/pcm", sample_rate: 24000 }
  },
  output: {
    type: "audio",
    voice: "george",
    format: { encoding: "audio/pcm", sample_rate: 24000 }
  },
  tools: ASSEMBLYAI_TOOLS
};

// Ensure agents directory exists
const agentsDir = path.resolve(__dirname, '../agents');
if (!fs.existsSync(agentsDir)) {
  fs.mkdirSync(agentsDir, { recursive: true });
}

// Save agent definition file
const agentFilePath = path.join(agentsDir, 'hypersdr_agent.json');
fs.writeFileSync(agentFilePath, JSON.stringify(agentConfig, null, 2));
console.log(`✓ Saved local agent definition to ${agentFilePath}`);

// Publish directly to AssemblyAI Cloud
async function buildAgentInAssemblyAI() {
  console.log('📡 Synchronizing & Building Hotel Voice Agent directly in AssemblyAI Cloud (agents.assemblyai.com)...');

  try {
    let response;
    let method = 'POST';
    let url = 'https://agents.assemblyai.com/v1/agents';

    // Check if agent already exists
    if (AGENT_ID) {
      const checkRes = await fetch(`https://agents.assemblyai.com/v1/agents/${AGENT_ID}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      if (checkRes.ok) {
        method = 'PUT';
        url = `https://agents.assemblyai.com/v1/agents/${AGENT_ID}`;
        console.log(`Found existing agent ${AGENT_ID}, updating in-place with Hotel Dossier...`);
      }
    }

    response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentConfig)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AssemblyAI publish failed: ${response.status} - ${errText}`);
    }

    const agent = await response.json();
    console.log('====================================================');
    console.log(`🎉 HOTEL VOICE AGENT SUCCESSFULLY ${method === 'PUT' ? 'UPDATED' : 'BUILT'} IN ASSEMBLYAI CLOUD!`);
    console.log(`🆔 AssemblyAI Agent ID: ${agent.id}`);
    console.log(`🏷️ Agent Name: ${agent.name}`);
    console.log(`🎙️ Voice Model: ${agent.voice?.voice_id || 'george'} (Universal-3.5 Pro STT, 24kHz PCM16)`);
    console.log(`🔊 Output Voice: ${agent.output?.voice || 'george'}`);
    console.log(`⚡ Registered Tools Count: ${agent.tools?.length || 0}`);
    console.log(`📅 Timestamp: ${agent.updated_at || agent.created_at}`);
    console.log('====================================================');

    // Update .env with the published ASSEMBLYAI_AGENT_ID
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('ASSEMBLYAI_AGENT_ID=')) {
      envContent = envContent.replace(/ASSEMBLYAI_AGENT_ID=.*/g, `ASSEMBLYAI_AGENT_ID=${agent.id}`);
    } else {
      envContent += `\nASSEMBLYAI_AGENT_ID=${agent.id}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`✓ Saved ASSEMBLYAI_AGENT_ID=${agent.id} to .env`);

    return agent;
  } catch (err) {
    console.error('❌ Failed to build agent in AssemblyAI:', err);
    process.exit(1);
  }
}

buildAgentInAssemblyAI();
