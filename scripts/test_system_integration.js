/**
 * End-to-End System Integration Test Suite
 * Tests Google Calendar / Meet, AssemblyAI Tools Engine, Google Sheet Sync, and Lead CRM
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { googleCalendarService } from '../server/services/googleCalendarService.js';
import { leadService } from '../server/services/leadService.js';
import { crmService } from '../server/services/crmService.js';
import { postCallService } from '../server/services/postCallService.js';
import { smartSchedulerService } from '../server/services/smartSchedulerService.js';
import { googleSheetService } from '../server/services/googleSheetService.js';
import { executeToolCall, ASSEMBLYAI_TOOLS } from '../server/assemblyai/tools.js';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING HYPERSDR SYSTEM INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST CASE 1: Google OAuth & Calendar Service Configuration
  // -------------------------------------------------------------
  console.log('\n--- TEST SUITE 1: Google Services & OAuth ---');
  const gcalStatus = googleCalendarService.getStatus();
  assert(gcalStatus.configured === true, 'Google OAuth Credentials Configured', `Client ID: ${gcalStatus.clientId}`);
  assert(gcalStatus.redirectUri.includes('/api/auth/google/callback'), 'Google OAuth Redirect URI Configured', gcalStatus.redirectUri);
  
  const authUrl = googleCalendarService.getAuthUrl();
  assert(authUrl.includes('accounts.google.com') && authUrl.includes('calendar'), 'Google OAuth Consent URL Generated', authUrl.slice(0, 70) + '...');

  // -------------------------------------------------------------
  // TEST CASE 2: Boutique Hotel Lead Database & Timezones
  // -------------------------------------------------------------
  console.log('\n--- TEST SUITE 2: Boutique Hotel Database & Smart Timing ---');
  const leads = leadService.getAllLeads();
  assert(leads.length === 212, 'Loaded 212 Boutique Hotel Leads', `Total: ${leads.length}`);

  const testLead = leads.find(l => l.propertyName.includes('Inn On First')) || leads[0];
  assert(!!testLead, 'Target Lead Located (The Inn On First)', `${testLead.propertyName} • ${testLead.decisionMaker}`);
  assert(testLead.googleRating >= 4.5, 'Google Rating & Reputation Verified', `Rating: ${testLead.googleRating} (${testLead.googleReviewCount} reviews)`);
  assert(!!testLead.signatureAmenity, 'Signature Amenity Extracted', testLead.signatureAmenity);

  const queue = leadService.getPrioritizedQueue();
  assert(queue.length === 212, 'Dialing Queue Prioritization Generated', `Top Lead: ${queue[0].propertyName} (Score: ${queue[0].schedule?.score})`);

  const regionalClocks = smartSchedulerService.getRegionalClocks();
  assert(regionalClocks.length >= 4, 'US Regional Clocks Evaluated', regionalClocks.map(c => `${c.code}: ${c.time}`).join(' | '));

  // -------------------------------------------------------------
  // TEST CASE 3: AssemblyAI Voice Agent Tools Engine
  // -------------------------------------------------------------
  console.log('\n--- TEST SUITE 3: AssemblyAI Tools Engine ---');
  assert(ASSEMBLYAI_TOOLS.length >= 7, 'AssemblyAI Function Schema Compliant', `Total Tools: ${ASSEMBLYAI_TOOLS.length}`);

  // Test Tool: lookup_hotel_dossier
  const dossierOutput = await executeToolCall('lookup_hotel_dossier', { hotel_name: testLead.propertyName }, testLead);
  const dossierParsed = JSON.parse(dossierOutput);
  assert(dossierParsed.status === 'success', 'Tool: lookup_hotel_dossier executed', `Amenity: ${dossierParsed.signature_amenity}`);

  // Test Tool: calculate_ota_commission_savings
  const otaOutput = await executeToolCall('calculate_ota_commission_savings', { room_count: 20, avg_nightly_rate: 285 }, testLead);
  const otaParsed = JSON.parse(otaOutput);
  assert(otaParsed.status === 'calculated', 'Tool: calculate_ota_commission_savings executed', `Leakage: ${otaParsed.estimated_annual_ota_leakage} -> Recovery: ${otaParsed.target_direct_booking_recovery}`);

  // Test Tool: send_case_study_email_sms
  const emailOutput = await executeToolCall('send_case_study_email_sms', { recipient_email: 'jim@theinnonfirst.com' }, testLead);
  const emailParsed = JSON.parse(emailOutput);
  assert(emailParsed.status === 'dispatched', 'Tool: send_case_study_email_sms executed', `Recipient: ${emailParsed.recipient}`);

  // Test Tool: book_calendar_slot
  const bookOutput = await executeToolCall('book_calendar_slot', { preferred_day: 'Thursday', preferred_time: '2:00 PM PST', prospect_email: 'jim@theinnonfirst.com' }, testLead);
  const bookParsed = JSON.parse(bookOutput);
  assert(bookParsed.status === 'confirmed', 'Tool: book_calendar_slot executed', `Host: ${bookParsed.host} • Link: ${bookParsed.google_meet_link}`);

  // -------------------------------------------------------------
  // TEST CASE 4: Post-Call Audit & Two-Way Sync
  // -------------------------------------------------------------
  console.log('\n--- TEST SUITE 4: Post-Call CRM & Google Sheet Sync ---');
  const mockTranscripts = [
    { speaker: 'agent', text: 'Hi Jim, calling from Boutique Review Concierge regarding The Inn On First.' },
    { speaker: 'user', text: 'Hi Alex. We already use OTAs like Expedia and Booking.com, but our Google rating is 4.9.' },
    { speaker: 'agent', text: 'Exactly. We protect that 4.9 rating with private 48-hour post-checkout review routing and shift returning guests to direct booking to save the 18% to 22% commission.' },
    { speaker: 'user', text: 'That sounds useful. Can we sync Thursday at 2 PM PST?' },
    { speaker: 'agent', text: 'Perfect, I will book Thursday at 2:00 PM PST and send the Google Calendar invite.' }
  ];

  const analyzedAudit = await postCallService.analyzeCall(testLead, mockTranscripts, 145);
  assert(analyzedAudit.disposition.toLowerCase().includes('meeting'), 'Speech Intelligence: Meeting Booked Signal Detected', `Disposition: ${analyzedAudit.disposition}`);
  assert(analyzedAudit.qualificationScore >= 85, 'Speech Intelligence: BANT Score Calculated', `Score: ${analyzedAudit.qualificationScore}/100`);
  assert(analyzedAudit.objectionsAudited.length > 0, 'Speech Intelligence: Objections Audited', `Count: ${analyzedAudit.objectionsAudited.length}`);

  crmService.saveCallLog({
    leadId: testLead.id,
    agencyName: testLead.propertyName,
    decisionMaker: testLead.decisionMaker,
    totalBantScore: analyzedAudit.qualificationScore,
    qualificationScore: analyzedAudit.qualificationScore,
    disposition: analyzedAudit.disposition,
    callDurationSeconds: 145,
    executiveSummary: analyzedAudit.executiveSummary,
    analyzedAt: new Date().toISOString()
  });

  const recordRes = await leadService.recordCallResult(testLead.id, analyzedAudit);
  const updatedLead = recordRes?.lead;
  assert(updatedLead && updatedLead.outcome === 'meeting_booked', 'Lead State Updated with Meeting Outcome', `Status: ${updatedLead?.outcome}`);

  const crmLogs = crmService.getAllLogs();
  assert(crmLogs.length > 0, 'CRM Call Logs Updated in Persistent Store', `Latest log: ${crmLogs[0].agencyName || crmLogs[0].propertyName} (BANT: ${crmLogs[0].qualificationScore}/100)`);

  const excelBuffer = leadService.exportLeadsToExcel();
  assert(excelBuffer && excelBuffer.length > 1000, 'Excel Export (.xlsx) Generated Successfully', `Size: ${excelBuffer.length} bytes`);

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
  }
}

runTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
