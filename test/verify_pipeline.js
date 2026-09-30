import WebSocket from 'ws';

console.log('--- Starting HyperSDR End-to-End Pipeline Verification ---');

const ws = new WebSocket('ws://localhost:3000/ws/call');

let receivedReady = false;
let receivedAgentSpeaking = false;
let receivedAudio = false;
let receivedTranscript = false;
let receivedSummary = false;

ws.on('open', () => {
  console.log('✓ Connected to HyperSDR WebSocket server.');
  
  // Start call to Hugo Fernandez (Just Digital Inc.)
  console.log('✓ Initiating outbound call to AGY-002 (Just Digital Inc.)...');
  ws.send(JSON.stringify({
    type: 'start_call',
    leadId: 'AGY-002',
    voiceId: 'george'
  }));
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  // console.log(`[Event]: ${msg.type}`);

  if (msg.type === 'call_status' && msg.status === 'in_progress') {
    receivedReady = true;
    console.log(`✓ Call Connected! AssemblyAI Session ID: ${msg.sessionId}`);
  }

  if (msg.type === 'agent_speaking_started') {
    receivedAgentSpeaking = true;
    console.log('✓ Agent Voice Output Started (Speech Synthesized by AssemblyAI)');
  }

  if (msg.type === 'agent_audio' && !receivedAudio) {
    receivedAudio = true;
    console.log(`✓ Received Audio Stream Chunk (Length: ${msg.audio.length} bytes base64)`);
  }

  if (msg.type === 'transcript') {
    receivedTranscript = true;
    console.log(`✓ Received Live Spoken Transcript [${msg.speaker}]: "${msg.text}"`);

    // Once we receive the initial greeting transcript, let's trigger call wrap-up
    setTimeout(() => {
      console.log('✓ Triggering end_call to audit post-call intelligence...');
      ws.send(JSON.stringify({ type: 'end_call' }));
    }, 1500);
  }

  if (msg.type === 'call_summary') {
    receivedSummary = true;
    const s = msg.summary;
    console.log('====================================================');
    console.log('✓ POST-CALL SPEECH INTELLIGENCE & BANT AUDIT RECEIVED:');
    console.log(`  Lead: ${s.agencyName} (${s.decisionMaker})`);
    console.log(`  BANT Score: ${s.totalBantScore}/100 [${s.disposition}]`);
    console.log(`  Executive Summary: ${s.executiveSummary.slice(0, 100)}...`);
    console.log(`  Follow-Up Email Preview: ${s.followUpEmail.split('\n')[0]}`);
    console.log('====================================================');

    ws.close();

    // Verify all assertions
    if (receivedReady && receivedAudio && receivedTranscript && receivedSummary) {
      console.log('\n🎉 ALL PIPELINE VERIFICATION CHECKS PASSED SUCCESSFULLY! 🎉\n');
      process.exit(0);
    } else {
      console.error('\n❌ Some pipeline checks failed to complete.\n');
      process.exit(1);
    }
  }
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
  process.exit(1);
});

// Timeout safeguard
setTimeout(() => {
  console.error('❌ Pipeline verification timed out after 30 seconds.');
  process.exit(1);
}, 30000);
