import { smartSchedulerService } from '../server/services/smartSchedulerService.js';
import { leadService } from '../server/services/leadService.js';
import { googleSheetService } from '../server/services/googleSheetService.js';

console.log('--- 🧪 STARTING SMART SCHEDULER & GOOGLE SHEET SYNC VERIFICATION ---\n');

let failed = 0;
let passed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Timezone Resolution
console.log('[Test 1] Timezone Resolution');
const denverLead = { cityHq: 'Denver, CO', country: 'United States' };
const laLead = { cityHq: 'Los Angeles, CA', country: 'United States' };
const londonLead = { cityHq: 'London, UK', country: 'United Kingdom' };
const sydneyLead = { cityHq: 'Sydney', country: 'Australia' };

assert(smartSchedulerService.resolveTimezone(denverLead) === 'America/Denver', 'Denver maps to America/Denver');
assert(smartSchedulerService.resolveTimezone(laLead) === 'America/Los_Angeles', 'LA maps to America/Los_Angeles');
assert(smartSchedulerService.resolveTimezone(londonLead) === 'Europe/London', 'London maps to Europe/London');
assert(smartSchedulerService.resolveTimezone(sydneyLead) === 'Australia/Sydney', 'Sydney maps to Australia/Sydney');

// 2. Dial Window Evaluation
console.log('\n[Test 2] Dial Window Evaluation');
const denverEval = smartSchedulerService.evaluateDialWindow('America/Denver');
assert(denverEval.localTime !== undefined, `Denver local time formatted: ${denverEval.localTime}`);
assert(typeof denverEval.probability === 'number', `Probability score is numeric: ${denverEval.probability}%`);
assert(['OPTIMAL_WINDOW', 'ACCEPTABLE_WINDOW', 'SUBOPTIMAL_WINDOW', 'LUNCH_BREAK', 'DO_NOT_CALL'].includes(denverEval.status), `Valid status: ${denverEval.status} (${denverEval.statusLabel})`);

// 3. Regional Clocks
console.log('\n[Test 3] Regional Clocks');
const clocks = smartSchedulerService.getRegionalClocks();
assert(clocks.length >= 7, `Retrieved ${clocks.length} regional clocks (PST, MST, CST, EST, GMT, CET, AEST)`);
console.log('Sample Clocks:', clocks.map(c => `${c.code}: ${c.time} [${c.status}]`).join(' | '));

// 4. Prioritized Queue
console.log('\n[Test 4] Prioritized Dialing Queue');
const queue = leadService.getPrioritizedQueue();
assert(queue.length > 0, `Queue populated with ${queue.length} leads`);
const firstLead = queue[0];
assert(firstLead.schedule !== undefined, `First lead has schedule object`);
assert(firstLead.schedule.priorityScore >= 0, `Priority score computed: ${firstLead.schedule.priorityScore}`);
console.log(`Top Priority Lead: ${firstLead.agencyName} | Local Time: ${firstLead.schedule.localTime} | Status: ${firstLead.schedule.statusLabel} | Score: ${firstLead.schedule.priorityScore}`);

// 5. Inbound Webhook (Google Sheet Row Push)
console.log('\n[Test 5] Inbound Webhook Lead Ingestion');
const webhookPayload = {
  id: 'GS-LIVE-999',
  agencyName: 'Apex Cloud Automations',
  cityHq: 'Austin, TX',
  niche: 'B2B Enterprise AI Systems',
  decisionMaker: 'David Sterling',
  painPoint: 'HighLevel SMS deliverability drops and slow manual lead qualification',
  email: 'david@apexcloud.io'
};

const ingestedLead = leadService.handleIncomingWebhook(webhookPayload);
assert(ingestedLead.id === 'GS-LIVE-999', 'Ingested lead has correct ID');
assert(ingestedLead.timezone === 'America/Chicago', `Austin, TX maps to America/Chicago (got: ${ingestedLead.timezone})`);
assert(ingestedLead.potentialAnnualSavings > 0, `Calculated potential savings: $${ingestedLead.potentialAnnualSavings}`);
assert(leadService.getLeadById('GS-LIVE-999') !== null, 'Lead accessible in LeadService repository');

// 6. Post-Call Outcome & Two-Way Sync Record
console.log('\n[Test 6] Post-Call Result & Two-Way Sync');
const callResult = {
  disposition: 'meeting_booked',
  qualificationScore: 92,
  keyTakeaways: 'High intent. Wants n8n GHL subaccount provisioning; booked Thursday 2pm.',
  durationSeconds: 145
};

const syncRecord = await leadService.recordCallResult('GS-LIVE-999', callResult);
assert(syncRecord.lead.callStatus === 'meeting_booked', `Lead callStatus updated to meeting_booked`);
assert(syncRecord.lead.lastCallResult.qualificationScore === 92, `Score logged: 92`);

// 7. Google Apps Script Template
console.log('\n[Test 7] Google Apps Script Code Generator');
const scriptTemplate = googleSheetService.getAppsScriptTemplate();
assert(scriptTemplate.includes('function doPost(e)'), 'Template includes doPost handler');
assert(scriptTemplate.includes('UPDATE_CALL_LOG'), 'Template handles UPDATE_CALL_LOG action');

console.log('\n========================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
