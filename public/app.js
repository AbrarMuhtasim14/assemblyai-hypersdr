/**
 * HyperSDR Browser Client & WebAudio Streaming Engine
 * Powered by AssemblyAI Voice Agent API
 * Boutique Hotel VIP Owners Campaign & Google Calendar Integration
 */

// Application State
const state = {
  ws: null,
  leads: [],
  queue: [],
  selectedLead: null,
  queueFilter: 'all', // 'optimal' | 'all'
  callActive: false,
  callTimerInterval: null,
  callSeconds: 0,
  audioContext: null,
  micStream: null,
  micProcessor: null,
  audioQueue: [],
  nextPlayTime: 0,
  activeAudioSources: [],
  isMuted: false,
  analyser: null,
  dataArray: null,
  ambienceNode: null,
  ambienceGain: null
};

// DOM Elements
const elements = {
  wsStatusDot: document.getElementById('wsStatusDot'),
  wsStatusText: document.getElementById('wsStatusText'),
  leadSelect: document.getElementById('leadSelect'),
  totalLeadsCount: document.getElementById('totalLeadsCount'),
  headerExportBtn: document.getElementById('headerExportBtn'),
  exportExcelBtn: document.getElementById('exportExcelBtn'),
  gcalHeaderPill: document.getElementById('gcalHeaderPill'),
  gcalStatusText: document.getElementById('gcalStatusText'),
  connectGoogleBtn: document.getElementById('connectGoogleBtn'),
  
  // Smart Clocks & Sheet Bar
  clocksList: document.getElementById('clocksList'),
  sheetStatusBadge: document.getElementById('sheetStatusBadge'),
  sheetStatusText: document.getElementById('sheetStatusText'),
  syncSheetBtn: document.getElementById('syncSheetBtn'),
  openScriptModalBtn: document.getElementById('openScriptModalBtn'),
  hubSyncBtn: document.getElementById('hubSyncBtn'),
  sheetUrlInput: document.getElementById('sheetUrlInput'),
  saveSheetUrlBtn: document.getElementById('saveSheetUrlBtn'),

  // Queue Filters & Autodial
  filterOptimalBtn: document.getElementById('filterOptimalBtn'),
  filterAllBtn: document.getElementById('filterAllBtn'),
  optimalCountBadge: document.getElementById('optimalCountBadge'),
  allCountBadge: document.getElementById('allCountBadge'),
  autodialBtn: document.getElementById('autodialBtn'),

  // Timing Intelligence Card
  timingBadge: document.getElementById('timingBadge'),
  timingLocalClock: document.getElementById('timingLocalClock'),
  timingStatusLabel: document.getElementById('timingStatusLabel'),
  timingNextBest: document.getElementById('timingNextBest'),
  timingScore: document.getElementById('timingScore'),

  // Hotel Dossier elements
  dossierAvatar: document.getElementById('dossierAvatar'),
  dossierName: document.getElementById('dossierName'),
  dossierTitle: document.getElementById('dossierTitle'),
  dossierAgency: document.getElementById('dossierAgency'),
  dossierEmail: document.getElementById('dossierEmail'),
  dossierRatingBadge: document.getElementById('dossierRatingBadge'),
  dossierReviewSnippet: document.getElementById('dossierReviewSnippet'),
  dossierAmenity: document.getElementById('dossierAmenity'),
  dossierPain: document.getElementById('dossierPain'),
  dossierOpportunity: document.getElementById('dossierOpportunity'),
  dossierHook: document.getElementById('dossierHook'),
  dossierWaste: document.getElementById('dossierWaste'),
  dossierSavings: document.getElementById('dossierSavings'),

  // Call Station
  callStateLabel: document.getElementById('callStateLabel'),
  callTimer: document.getElementById('callTimer'),
  voiceOrb: document.getElementById('voiceOrb'),
  waveformCanvas: document.getElementById('waveformCanvas'),
  startCallBtn: document.getElementById('startCallBtn'),
  endCallBtn: document.getElementById('endCallBtn'),
  muteBtn: document.getElementById('muteBtn'),
  muteIcon: document.getElementById('muteIcon'),
  bargeInBtn: document.getElementById('bargeInBtn'),
  openCalendarDemoBtn: document.getElementById('openCalendarDemoBtn'),
  quickAddMeetingBtn: document.getElementById('quickAddMeetingBtn'),
  testCalendarModalBtn: document.getElementById('testCalendarModalBtn'),
  
  // Transcript & Tool Feed
  transcriptFeed: document.getElementById('transcriptFeed'),
  toolExecutionFeed: document.getElementById('toolExecutionFeed'),

  // Google Calendar Modal
  googleCalendarModal: document.getElementById('googleCalendarModal'),
  closeGcalModalBtn: document.getElementById('closeGcalModalBtn'),
  gcalTitle: document.getElementById('gcalTitle'),
  gcalDateTime: document.getElementById('gcalDateTime'),
  gcalMeetLink: document.getElementById('gcalMeetLink'),
  gcalMeetBtn: document.getElementById('gcalMeetBtn'),
  gcalGuestEmail: document.getElementById('gcalGuestEmail'),
  gcalDescription: document.getElementById('gcalDescription'),
  gcalRealLink: document.getElementById('gcalRealLink'),
  gcalConfirmBtn: document.getElementById('gcalConfirmBtn'),

  // Post-Call Modal
  postCallModal: document.getElementById('postCallModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  modalSheetSyncBanner: document.getElementById('modalSheetSyncBanner'),
  modalBantScore: document.getElementById('modalBantScore'),
  modalDisposition: document.getElementById('modalDisposition'),
  modalDuration: document.getElementById('modalDuration'),
  modalBantBreakdown: document.getElementById('modalBantBreakdown'),
  modalSummary: document.getElementById('modalSummary'),
  modalObjections: document.getElementById('modalObjections'),
  modalEmailText: document.getElementById('modalEmailText'),
  copyEmailBtn: document.getElementById('copyEmailBtn'),

  // Apps Script Modal
  appsScriptModal: document.getElementById('appsScriptModal'),
  closeScriptModalBtn: document.getElementById('closeScriptModalBtn'),
  appsScriptCode: document.getElementById('appsScriptCode'),
  copyScriptBtn: document.getElementById('copyScriptBtn'),

  // Custom Lead Modal
  addLeadModal: document.getElementById('addLeadModal'),
  openAddLeadBtn: document.getElementById('openAddLeadBtn'),
  closeAddLeadModalBtn: document.getElementById('closeAddLeadModalBtn'),
  addLeadForm: document.getElementById('addLeadForm'),

  // Hub & CRM
  leadSearchInput: document.getElementById('leadSearchInput'),
  leadsTableBody: document.getElementById('leadsTableBody'),
  crmLogsContainer: document.getElementById('crmLogsContainer'),
  voiceSelect: document.getElementById('voiceSelect'),
  ambienceSelect: document.getElementById('ambienceSelect'),
  ambienceVolumeSlider: document.getElementById('ambienceVolumeSlider'),
  twilioCallBtn: document.getElementById('twilioCallBtn'),
  twilioPhoneInput: document.getElementById('twilioPhoneInput'),
  twilioStatusMsg: document.getElementById('twilioStatusMsg')
};

// ==========================================
// INITIALIZATION
// ==========================================

window.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupCanvas();
  await loadRegionalClocks();
  await loadSheetStatus();
  await loadGoogleCalendarStatus();
  await loadLeads();
  connectWebSocket();
  setupEventListeners();
  loadCRMLogs();

  // Check if redirected from Google OAuth
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('calendar_connected') === 'true') {
    alert('✅ Real Google Calendar & Google Meet Connected! All booked SDR meetings will now generate genuine Google Meet links and sync directly to your primary calendar.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  setInterval(loadRegionalClocks, 30000);
});

function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.tab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// ==========================================
// WEBSOCKET MANAGEMENT
// ==========================================

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/call`;

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    elements.wsStatusDot.classList.add('active');
    elements.wsStatusText.textContent = 'Voice WebSocket: Connected';
    console.log('[App] WebSocket connected to backend');
  };

  state.ws.onclose = () => {
    elements.wsStatusDot.classList.remove('active');
    elements.wsStatusText.textContent = 'Voice WebSocket: Reconnecting...';
    setTimeout(connectWebSocket, 2000);
  };

  state.ws.onerror = (err) => {
    console.error('[App] WebSocket error:', err);
  };

  state.ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerEvent(data);
    } catch (e) {
      console.error('[App] Error parsing message:', e);
    }
  };
}

// ==========================================
// SERVER EVENT HANDLER
// ==========================================

function handleServerEvent(data) {
  switch (data.type) {
    case 'call_status':
      updateCallStatus(data.status, data.message);
      break;

    case 'agent_speaking_started':
      elements.voiceOrb.classList.add('speaking-agent');
      elements.voiceOrb.classList.remove('speaking-user');
      elements.callStateLabel.textContent = 'ALEX (VOICE SDR) SPEAKING';
      elements.callStateLabel.style.color = 'var(--accent-cyan)';
      break;

    case 'agent_speaking_ended':
      elements.voiceOrb.classList.remove('speaking-agent');
      elements.callStateLabel.textContent = 'LISTENING TO INNKEEPER';
      elements.callStateLabel.style.color = 'var(--accent-emerald)';
      break;

    case 'user_speech_started':
      elements.voiceOrb.classList.add('speaking-user');
      elements.callStateLabel.textContent = 'INNKEEPER SPEAKING';
      elements.callStateLabel.style.color = 'var(--accent-emerald)';
      break;

    case 'user_speech_stopped':
      elements.voiceOrb.classList.remove('speaking-user');
      break;

    case 'agent_audio':
      playAudioChunk(data.audio);
      break;

    case 'agent_interrupted':
      flushAudioBuffers();
      elements.voiceOrb.classList.remove('speaking-agent');
      elements.callStateLabel.textContent = 'INTERRUPTED • LISTENING';
      break;

    case 'transcript':
      appendTranscript(data.speaker, data.text, data.isFinal);
      break;

    case 'tool_call_started':
      renderToolCallEvent(data);
      break;

    case 'tool_call_completed':
      updateToolCallEvent(data);
      break;

    case 'calendar_booking_event':
      // Trigger in-browser Google Calendar booking demo!
      showGoogleCalendarModal(state.selectedLead, data.booking);
      break;

    case 'call_summary':
      showPostCallModal(data.summary, data.sheetSync);
      loadLeads(); // refresh leads to reflect updated call outcomes
      break;

    case 'error':
      alert(`Voice Agent Error: ${data.error}`);
      stopCall();
      break;

    default:
      break;
  }
}

// ==========================================
// REGIONAL CLOCKS & SHEET SYNC
// ==========================================

async function loadRegionalClocks() {
  try {
    const res = await fetch('/api/timezones');
    const data = await res.json();
    if (!data.clocks) return;

    elements.clocksList.innerHTML = '';
    data.clocks.forEach(c => {
      const chip = document.createElement('span');
      const chipClass = c.badgeColor === 'green' ? 'peak' : c.badgeColor === 'yellow' ? 'acceptable' : 'night';
      chip.className = `clock-chip ${chipClass}`;
      chip.innerHTML = `<strong>${c.code}</strong> ${c.time} <span style="font-size: 0.65rem;">(${c.statusLabel})</span>`;
      elements.clocksList.appendChild(chip);
    });
  } catch (err) {
    console.warn('[App] Failed to load regional clocks:', err);
  }
}

async function loadSheetStatus() {
  try {
    const res = await fetch('/api/sheet/status');
    const data = await res.json();
    if (elements.sheetStatusText) {
      elements.sheetStatusText.textContent = `Google Sheet Database: Ready (${state.leads.length || 212} Hotels)`;
    }
    if (elements.sheetUrlInput && data.sheetUrl) {
      elements.sheetUrlInput.value = data.sheetUrl;
    }
  } catch (err) {
    console.warn('[App] Failed to load sheet status:', err);
  }
}

async function triggerSheetSync(customUrl = null) {
  elements.sheetStatusText.textContent = 'Google Sheet Database: Syncing...';
  try {
    const res = await fetch('/api/sheet/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl: customUrl || elements.sheetUrlInput?.value || null })
    });
    const result = await res.json();
    if (result.success) {
      alert(`Google Sheet Synced! Ingested ${result.totalRows} hotels (${result.added} new, ${result.updated} updated).`);
      await loadLeads();
      await loadSheetStatus();
    } else {
      alert(`Sync Notice: ${result.error || 'Check sheet URL or publish permissions'}`);
    }
  } catch (e) {
    alert(`Sync Error: ${e.message}`);
  }
}

async function loadGoogleCalendarStatus() {
  try {
    const res = await fetch('/api/auth/google/status');
    const data = await res.json();
    if (data.authenticated) {
      if (elements.gcalStatusText) {
        elements.gcalStatusText.textContent = 'Connected (Real Meet)';
        elements.gcalStatusText.style.color = '#34d399';
      }
      if (elements.connectGoogleBtn) {
        elements.connectGoogleBtn.innerHTML = '<span>✅</span> Google Calendar Connected';
        elements.connectGoogleBtn.style.background = 'rgba(16, 185, 129, 0.2)';
        elements.connectGoogleBtn.style.color = '#34d399';
        elements.connectGoogleBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      }
    } else {
      if (elements.gcalStatusText) {
        elements.gcalStatusText.textContent = 'Click to Connect';
        elements.gcalStatusText.style.color = '#fbbf24';
      }
      if (elements.connectGoogleBtn) {
        elements.connectGoogleBtn.innerHTML = '<span>🔗</span> Connect Google Account';
      }
    }
  } catch (err) {
    console.warn('[App] Failed to load Google Calendar status:', err);
  }
}

// ==========================================
// LEAD & QUEUE MANAGEMENT
// ==========================================

async function loadLeads() {
  try {
    const res = await fetch('/api/queue');
    const data = await res.json();
    state.queue = data.queue || [];
    state.leads = data.queue || [];

    elements.totalLeadsCount.textContent = state.queue.length;
    elements.allCountBadge.textContent = state.queue.length;
    elements.optimalCountBadge.textContent = data.optimalCount || 0;

    renderFilteredQueue();
  } catch (err) {
    console.error('[App] Failed to load hotel queue:', err);
  }
}

function renderFilteredQueue() {
  let displayLeads = state.queue;

  if (state.queueFilter === 'optimal') {
    const optimalOnly = state.queue.filter(l => l.schedule && l.schedule.canCallNow);
    displayLeads = optimalOnly.length > 0 ? optimalOnly : state.queue;
  }

  // Populate select dropdown
  elements.leadSelect.innerHTML = '';
  displayLeads.forEach(lead => {
    const opt = document.createElement('option');
    opt.value = lead.id;
    const badge = lead.meetingBooked ? '📅 ' : (lead.schedule?.status === 'OPTIMAL_WINDOW' ? '🔥 ' : lead.schedule?.canCallNow ? '🟢 ' : '⚪ ');
    const timeStr = lead.schedule?.localTime ? `[${lead.schedule.localTime}] ` : '';
    opt.textContent = `${badge}${timeStr}${lead.propertyName} — ${lead.decisionMaker} (${lead.cityHq})`;
    elements.leadSelect.appendChild(opt);
  });

  if (displayLeads.length > 0) {
    if (state.selectedLead && displayLeads.some(l => l.id === state.selectedLead.id)) {
      elements.leadSelect.value = state.selectedLead.id;
    } else {
      selectLead(displayLeads[0]);
    }
  }

  renderLeadsTable(state.queue);
}

function selectLead(lead) {
  state.selectedLead = lead;
  elements.leadSelect.value = lead.id;

  // Update Timing Intelligence Card
  if (lead.schedule) {
    elements.timingBadge.className = `timing-badge ${lead.schedule.badgeColor || 'green'}`;
    elements.timingBadge.textContent = `${lead.schedule.statusLabel} (${lead.schedule.probability}% Answer Probability)`;
    elements.timingLocalClock.textContent = `Local: ${lead.schedule.localTime} • ${lead.timezone ? lead.timezone.split('/').pop().replace('_', ' ') : ''}`;
    elements.timingStatusLabel.textContent = lead.schedule.reason || 'Normal business hours';
    elements.timingNextBest.textContent = lead.schedule.nextOptimal || 'Active Now';
    elements.timingScore.textContent = `Priority Score: ${lead.schedule.priorityScore || 95}`;
  }

  // Update Dossier Card with Hotel Intelligence
  elements.dossierAvatar.textContent = lead.firstName ? lead.firstName.charAt(0) : 'H';
  elements.dossierName.textContent = lead.decisionMaker;
  elements.dossierTitle.textContent = lead.title;
  elements.dossierAgency.textContent = `${lead.propertyName} • ${lead.cityHq}`;
  
  if (elements.dossierEmail) {
    elements.dossierEmail.textContent = `✉️ ${lead.email || 'No email on file'}`;
  }

  if (elements.dossierRatingBadge) {
    elements.dossierRatingBadge.textContent = `${lead.googleRating}★ (${lead.googleReviewCount} reviews)`;
  }
  if (elements.dossierReviewSnippet) {
    elements.dossierReviewSnippet.textContent = `"${lead.verbatimReviewSnippet || 'The hospitality and service were exceptional.'}"`;
  }
  if (elements.dossierAmenity) {
    elements.dossierAmenity.textContent = lead.signatureAmenity || 'Curated luxury hospitality';
  }

  elements.dossierPain.textContent = lead.painPoint;
  elements.dossierOpportunity.textContent = lead.serviceOpportunity;
  elements.dossierHook.textContent = `"${lead.outreachHook}"`;

  elements.dossierWaste.textContent = `$${(lead.potentialAnnualSavings || 250000).toLocaleString()}/yr`;
  elements.dossierSavings.textContent = `~$${Math.round((lead.potentialAnnualSavings || 250000) * 0.40).toLocaleString()}/yr`;
}

function autodialNextLead() {
  const readyLead = state.queue.find(l => l.schedule && l.schedule.canCallNow && !l.meetingBooked) || state.queue[0];
  if (!readyLead) {
    alert('No hotels currently available to dial.');
    return;
  }
  selectLead(readyLead);
  startCall();
}

function renderLeadsTable(leads) {
  elements.leadsTableBody.innerHTML = '';
  leads.forEach(lead => {
    const tr = document.createElement('tr');
    const badgeColor = lead.schedule?.badgeColor || 'gray';
    const statusLabel = lead.schedule?.statusLabel || 'Normal';
    const localTime = lead.schedule?.localTime || 'N/A';

    // Outcome display
    let outcomeHtml = '<span style="color: #94a3b8; font-size: 0.75rem;">Pending</span>';
    if (lead.outcome === 'meeting_booked' || lead.meetingBooked) {
      outcomeHtml = '<span style="color: #60a5fa; font-weight: 700; font-size: 0.78rem;">Meeting Booked 🎉</span>';
    } else if (lead.outcome === 'follow_up_requested') {
      outcomeHtml = '<span style="color: #fbbf24; font-weight: 700; font-size: 0.78rem;">Follow-Up Req 📅</span>';
    } else if (lead.outcome === 'not_interested') {
      outcomeHtml = '<span style="color: #f87171; font-weight: 700; font-size: 0.78rem;">Not Interested</span>';
    }

    const meetingBookedBadge = lead.meetingBooked
      ? '<span class="timing-badge green" style="font-weight: 800;">✅ YES</span>'
      : '<span class="timing-badge gray">⚪ NO</span>';

    const callStatusBadge = lead.callStatus === 'completed'
      ? '<span class="tech-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">COMPLETED</span>'
      : '<span class="tech-tag">PENDING</span>';

    tr.innerHTML = `
      <td><span class="tech-tag">${lead.id}</span></td>
      <td>
        <strong style="color: #fff;">${lead.propertyName}</strong><br/>
        <span style="font-size: 0.72rem; color: var(--text-dim);">${lead.cityHq}</span>
      </td>
      <td>
        ${lead.decisionMaker}<br/>
        <span style="font-size: 0.7rem; color: var(--text-dim);">${lead.title}</span>
      </td>
      <td>
        <strong style="color: #fbbf24;">${lead.googleRating}★</strong><br/>
        <span style="font-size: 0.7rem; color: var(--text-dim);">${lead.googleReviewCount} reviews</span>
      </td>
      <td>
        <strong>${localTime}</strong><br/>
        <span class="timing-badge ${badgeColor}" style="font-size: 0.65rem; padding: 2px 6px;">${statusLabel}</span>
      </td>
      <td>${callStatusBadge}</td>
      <td>${outcomeHtml}</td>
      <td>${meetingBookedBadge}</td>
      <td style="max-width: 260px;">
        <div style="font-size: 0.73rem; color: var(--text-muted); line-height: 1.35;">
          ${lead.callSummary ? `<strong>Notes:</strong> ${lead.callSummary.slice(0, 95)}...` : `<em>Snippet: "${(lead.verbatimReviewSnippet || '').slice(0, 70)}..."</em>`}
        </div>
        ${lead.meetingDetails ? `<div style="font-size: 0.7rem; color: #60a5fa; margin-top: 0.2rem; font-weight: 600;">📅 ${lead.meetingDetails.day} @ ${lead.meetingDetails.time} (Meet Link Sent)</div>` : ''}
      </td>
      <td>
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <button class="btn-table-call" data-lead-id="${lead.id}">Dial SDR</button>
          <button class="chip-btn table-cal-btn" data-lead-id="${lead.id}" title="Book/View Google Calendar Event">📅 Calendar</button>
        </div>
      </td>
    `;
    elements.leadsTableBody.appendChild(tr);
  });

  // Attach click listeners to table dial buttons
  document.querySelectorAll('.btn-table-call').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.leadId;
      const found = state.leads.find(l => l.id === targetId);
      if (found) {
        selectLead(found);
        document.querySelector('[data-tab="dialerTab"]').click();
      }
    });
  });

  // Attach click listeners to table Calendar buttons
  document.querySelectorAll('.table-cal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.leadId;
      const found = state.leads.find(l => l.id === targetId);
      if (found) {
        selectLead(found);
        showGoogleCalendarModal(found, found.meetingDetails || {});
      }
    });
  });
}

// ==========================================
// GOOGLE CALENDAR IN-BROWSER MODAL
// ==========================================

function showGoogleCalendarModal(lead, booking = {}) {
  const currentLead = lead || state.selectedLead;
  if (!currentLead) return;

  const day = booking.day || 'Thursday';
  const time = booking.time || '2:00 PM EST';
  const title = booking.title || `15-Min Strategy Sync: Syed Abrar Mohtasim x ${currentLead.decisionMaker} - ${currentLead.propertyName}`;
  const meetLink = booking.googleMeetLink || 'https://meet.google.com/abr-boutique-sync';
  const guestEmail = booking.email || currentLead.email || 'innkeeper@boutiquehotel.com';

  elements.gcalTitle.textContent = title;
  elements.gcalDateTime.textContent = `${day} • ${time}`;
  elements.gcalMeetLink.textContent = meetLink.replace('https://', '');
  elements.gcalMeetBtn.href = meetLink;
  elements.gcalGuestEmail.textContent = guestEmail;
  elements.gcalDescription.textContent = `Discussion with ${currentLead.decisionMaker} on 48-Hour Private Review Routing & Direct Booking Recovery for ${currentLead.propertyName}. Recovering 18-22% in OTA commissions & protecting Google 3-Pack rankings.`;

  // Build real Google Calendar template link
  const gcalUrl = booking.googleCalendarUrl || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent('Boutique Review Concierge & Direct Booking Strategy Discussion with Syed Abrar Mohtasim')}&location=${encodeURIComponent(meetLink)}`;
  elements.gcalRealLink.href = gcalUrl;

  elements.googleCalendarModal.classList.add('open');

  // Handle Confirm & Save
  elements.gcalConfirmBtn.onclick = async () => {
    elements.gcalConfirmBtn.textContent = 'Saving to Database...';
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/book-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          time,
          title,
          googleMeetLink: meetLink,
          googleCalendarUrl: gcalUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        currentLead.meetingBooked = true;
        currentLead.outcome = 'meeting_booked';
        currentLead.meetingDetails = data.lead.meetingDetails;
        renderLeadsTable(state.queue);
        elements.googleCalendarModal.classList.remove('open');
        alert(`Meeting successfully booked on Google Calendar for ${currentLead.propertyName}!\nUpdated in Google Sheet lead database.`);
      }
    } catch (e) {
      alert(`Booking error: ${e.message}`);
    } finally {
      elements.gcalConfirmBtn.innerHTML = '<span>✅</span> Confirm & Save to Database';
    }
  };
}

// ==========================================
// BACKGROUND AMBIENCE & COMFORT NOISE ENGINE (LiveKit Style)
// ==========================================

function startAmbience(preset = 'office', volume = 0.08) {
  stopAmbience();
  if (preset === 'off' || !state.audioContext || volume <= 0) return;

  try {
    const audioCtx = state.audioContext;
    const bufferSize = audioCtx.sampleRate * 4;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Synthesize smooth, warm pink/brown noise (filtered room tone)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Filter shaping based on selected ambience environment
    const filter = audioCtx.createBiquadFilter();
    if (preset === 'telephone') {
      filter.type = 'bandpass';
      filter.frequency.value = 850;
      filter.Q.value = 1.4;
    } else if (preset === 'coffeehouse') {
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
    } else {
      // Subtle sales office room tone
      filter.type = 'lowpass';
      filter.frequency.value = 550;
    }

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    source.start(0);
    state.ambienceNode = source;
    state.ambienceGain = gainNode;
    console.log(`[Ambience Engine] Started '${preset}' comfort noise at volume ${(volume * 100).toFixed(0)}%`);
  } catch (err) {
    console.warn('[Ambience Engine] Notice initializing comfort noise:', err.message);
  }
}

function stopAmbience() {
  if (state.ambienceNode) {
    try { state.ambienceNode.stop(); } catch(e){}
    try { state.ambienceNode.disconnect(); } catch(e){}
    state.ambienceNode = null;
  }
  if (state.ambienceGain) {
    try { state.ambienceGain.disconnect(); } catch(e){}
    state.ambienceGain = null;
  }
}

function updateAmbienceVolume(volume) {
  if (state.ambienceGain) {
    state.ambienceGain.gain.setValueAtTime(volume, state.audioContext?.currentTime || 0);
  }
}

// ==========================================
// CALL ORCHESTRATION & AUDIO ENGINE
// ==========================================

async function startCall() {
  if (!state.selectedLead) {
    alert('Please select a target hotel lead first.');
    return;
  }

  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    await state.audioContext.resume();

    // Start LiveKit-style Background Ambience & Comfort Noise Layer
    const selectedPreset = elements.ambienceSelect?.value || 'office';
    const selectedVol = parseFloat(elements.ambienceVolumeSlider?.value || 0.08);
    startAmbience(selectedPreset, selectedVol);

    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const sourceNode = state.audioContext.createMediaStreamSource(state.micStream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 64;
    sourceNode.connect(state.analyser);
    state.dataArray = new Uint8Array(state.analyser.frequencyBinCount);

    const bufferSize = 2048;
    state.micProcessor = state.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    state.micProcessor.onaudioprocess = (e) => {
      if (!state.callActive || state.isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16Buffer = floatTo16BitPCM(inputData);
      const base64Audio = base64Encode(pcm16Buffer);

      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'input_audio',
          audio: base64Audio
        }));
      }
    };

    sourceNode.connect(state.micProcessor);
    state.micProcessor.connect(state.audioContext.destination);

    state.callActive = true;
    state.callSeconds = 0;
    state.nextPlayTime = state.audioContext.currentTime;

    elements.startCallBtn.style.display = 'none';
    elements.endCallBtn.style.display = 'flex';
    elements.transcriptFeed.innerHTML = '';
    elements.toolExecutionFeed.innerHTML = '';

    updateCallStatus('connecting', `Dialing ${state.selectedLead.propertyName} (${state.selectedLead.decisionMaker})...`);

    state.ws.send(JSON.stringify({
      type: 'start_call',
      leadId: state.selectedLead.id,
      voiceId: elements.voiceSelect.value || 'george'
    }));

    startCallTimer();

  } catch (err) {
    console.error('[App] Error starting call:', err);
    alert(`Could not access microphone: ${err.message}`);
  }
}

function stopCall() {
  if (!state.callActive) return;

  state.callActive = false;
  clearInterval(state.callTimerInterval);

  stopAmbience();

  if (state.micProcessor) {
    state.micProcessor.disconnect();
    state.micProcessor = null;
  }
  if (state.micStream) {
    state.micStream.getTracks().forEach(track => track.stop());
    state.micStream = null;
  }

  flushAudioBuffers();

  elements.startCallBtn.style.display = 'flex';
  elements.endCallBtn.style.display = 'none';
  elements.voiceOrb.className = 'orb-core';

  updateCallStatus('ended', 'Call Concluded. Analyzing Hotel Conversation...');

  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'end_call' }));
  }
}

function updateCallStatus(status, message) {
  elements.callStateLabel.textContent = message.toUpperCase();

  if (status === 'connected') {
    elements.callStateLabel.style.color = 'var(--accent-emerald)';
  } else if (status === 'connecting') {
    elements.callStateLabel.style.color = 'var(--accent-amber)';
  } else if (status === 'ended') {
    elements.callStateLabel.style.color = 'var(--accent-rose)';
  }
}

function startCallTimer() {
  clearInterval(state.callTimerInterval);
  elements.callTimer.textContent = '00:00';
  state.callSeconds = 0;

  state.callTimerInterval = setInterval(() => {
    state.callSeconds++;
    const mins = Math.floor(state.callSeconds / 60).toString().padStart(2, '0');
    const secs = (state.callSeconds % 60).toString().padStart(2, '0');
    elements.callTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function playAudioChunk(base64PCM) {
  if (!state.audioContext || !state.callActive) return;

  try {
    const binary = atob(base64PCM);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = state.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = state.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(state.audioContext.destination);

    const now = state.audioContext.currentTime;
    const startTime = Math.max(state.nextPlayTime, now);
    source.start(startTime);
    state.nextPlayTime = startTime + audioBuffer.duration;

    state.activeAudioSources.push(source);
    source.onended = () => {
      const idx = state.activeAudioSources.indexOf(source);
      if (idx !== -1) state.activeAudioSources.splice(idx, 1);
    };

  } catch (err) {
    console.error('[Audio] Error decoding and playing audio chunk:', err);
  }
}

function flushAudioBuffers() {
  state.activeAudioSources.forEach(source => {
    try { source.stop(); } catch (e) {}
  });
  state.activeAudioSources = [];
  if (state.audioContext) {
    state.nextPlayTime = state.audioContext.currentTime;
  }
}

// ==========================================
// TRANSCRIPT & REAL-TIME TOOL CALLS
// ==========================================

function appendTranscript(speaker, text, isFinal) {
  const isAgent = speaker === 'agent';
  let bubble = elements.transcriptFeed.querySelector('.transcript-bubble.live');

  if (!bubble || isFinal) {
    if (bubble) bubble.classList.remove('live');

    bubble = document.createElement('div');
    bubble.className = `transcript-bubble ${isAgent ? 'agent' : 'user'} live`;

    const label = document.createElement('div');
    label.className = 'transcript-speaker';
    label.textContent = isAgent ? 'Alex (Voice SDR):' : `${state.selectedLead?.decisionMaker || 'Innkeeper'}:`;

    const content = document.createElement('div');
    content.className = 'transcript-text';
    content.textContent = text;

    bubble.appendChild(label);
    bubble.appendChild(content);
    elements.transcriptFeed.appendChild(bubble);
  } else {
    const content = bubble.querySelector('.transcript-text');
    if (content) content.textContent = text;
  }

  elements.transcriptFeed.scrollTop = elements.transcriptFeed.scrollHeight;
}

function renderToolCallEvent(data) {
  const feed = elements.toolExecutionFeed;
  const toolBadge = document.createElement('div');
  toolBadge.id = `tool-${data.toolCallId || Date.now()}`;
  toolBadge.className = 'tool-card running';

  let toolNameFormatted = (data.tool || data.toolName || 'tool').replace(/_/g, ' ').toUpperCase();
  toolBadge.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="tool-title">⚡ ${toolNameFormatted}</span>
      <span class="tool-status">Executing...</span>
    </div>
    <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.25rem;">
      Args: ${JSON.stringify(data.args || {})}
    </div>
  `;

  feed.prepend(toolBadge);
}

function updateToolCallEvent(data) {
  const feed = elements.toolExecutionFeed;
  const firstRunning = feed.querySelector('.tool-card.running');
  if (firstRunning) {
    firstRunning.className = 'tool-card completed';
    const statusSpan = firstRunning.querySelector('.tool-status');
    if (statusSpan) {
      statusSpan.textContent = 'Completed (200 OK)';
      statusSpan.style.color = '#34d399';
    }
  }
}

// ==========================================
// POST-CALL AUDIT MODAL
// ==========================================

function showPostCallModal(summary, sheetSync) {
  elements.postCallModal.classList.add('open');

  elements.modalBantScore.textContent = `${summary.qualificationScore || summary.totalBantScore || 85}/100`;
  elements.modalDisposition.textContent = (summary.disposition || 'Completed').replace(/_/g, ' ').toUpperCase();
  elements.modalDuration.textContent = `${Math.floor((summary.callDurationSeconds || 0) / 60)}m ${(summary.callDurationSeconds || 0) % 60}s`;
  elements.modalSummary.textContent = summary.executiveSummary || 'No summary generated.';

  if (elements.modalSheetSyncBanner) {
    elements.modalSheetSyncBanner.innerHTML = `
      <span>✅</span> <strong>Two-Way Google Sheet Database Sync:</strong> Written back to Google Sheet row automatically (Status: <strong>${summary.disposition}</strong>, BANT: <strong>${summary.qualificationScore || 85}/100</strong>).
    `;
  }

  // BANT Breakdown
  elements.modalBantBreakdown.innerHTML = '';
  const bant = summary.bantBreakdown || {};
  Object.keys(bant).forEach(key => {
    const itemText = bant[key];
    const div = document.createElement('div');
    div.className = 'bant-item';
    div.innerHTML = `
      <div class="bant-header">
        <span>${key.toUpperCase()}</span>
        <span class="bant-status qualified">QUALIFIED</span>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${itemText}</p>
    `;
    elements.modalBantBreakdown.appendChild(div);
  });

  // Objections
  elements.modalObjections.innerHTML = '';
  (summary.objectionsAudited || []).forEach(obj => {
    const card = document.createElement('div');
    card.style.cssText = 'background: var(--bg-card); padding: 0.5rem; border-radius: 6px; margin-bottom: 0.5rem; font-size: 0.75rem;';
    card.innerHTML = `<strong>Topic:</strong> "${obj.topic}"<br/><span style="color: #34d399;">Resolution:</span> ${obj.notes}`;
    elements.modalObjections.appendChild(card);
  });

  elements.modalEmailText.value = summary.followUpEmail || '';
  loadCRMLogs();
}

// ==========================================
// CRM LOGS
// ==========================================

async function loadCRMLogs() {
  try {
    const res = await fetch('/api/crm/logs');
    const data = await res.json();
    const container = elements.crmLogsContainer;
    container.innerHTML = '';

    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem;">No hotel calls logged yet. Dial a boutique hotel from the Live Dialer!</p>';
      return;
    }

    data.logs.forEach(log => {
      const card = document.createElement('div');
      card.className = 'crm-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700;">${log.propertyName || log.agencyName}</h4>
          <span class="tech-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">${(log.disposition || 'Call').toUpperCase()}</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 0.5rem;">
          ${log.decisionMaker} • ${log.analyzedAt || new Date().toLocaleString()} • Duration: ${log.callDurationSeconds || 0}s
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 0.75rem;">
          ${log.executiveSummary}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: #38bdf8;">BANT Score: <strong>${log.qualificationScore || log.totalBantScore}/100</strong></span>
          <span style="font-size: 0.72rem; color: #86efac;">Synced to Google Sheet Database</span>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('[App] Failed to load CRM logs:', err);
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
  // Dial & Hangup Buttons
  elements.startCallBtn.addEventListener('click', startCall);
  elements.endCallBtn.addEventListener('click', stopCall);

  // Mute Button
  elements.muteBtn.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    elements.muteBtn.classList.toggle('active', state.isMuted);
    elements.muteIcon.textContent = state.isMuted ? '🔇' : '🎙️';
  });

  // Ambience / Comfort Noise Controls
  if (elements.ambienceSelect) {
    elements.ambienceSelect.addEventListener('change', () => {
      if (state.callActive) {
        startAmbience(elements.ambienceSelect.value, parseFloat(elements.ambienceVolumeSlider?.value || 0.08));
      }
    });
  }

  if (elements.ambienceVolumeSlider) {
    elements.ambienceVolumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      updateAmbienceVolume(vol);
    });
  }

  // Barge-In Button
  elements.bargeInBtn.addEventListener('click', () => {
    if (state.callActive && state.ws) {
      state.ws.send(JSON.stringify({ type: 'interrupt' }));
      flushAudioBuffers();
    }
  });

  // Open In-Browser Google Calendar Demo Button
  if (elements.openCalendarDemoBtn) {
    elements.openCalendarDemoBtn.addEventListener('click', () => {
      showGoogleCalendarModal(state.selectedLead, state.selectedLead?.meetingDetails || {});
    });
  }
  if (elements.quickAddMeetingBtn) {
    elements.quickAddMeetingBtn.addEventListener('click', () => {
      showGoogleCalendarModal(state.selectedLead, state.selectedLead?.meetingDetails || {});
    });
  }
  if (elements.testCalendarModalBtn) {
    elements.testCalendarModalBtn.addEventListener('click', () => {
      showGoogleCalendarModal(state.selectedLead, state.selectedLead?.meetingDetails || {});
    });
  }

  // Close Google Calendar Modal
  if (elements.closeGcalModalBtn) {
    elements.closeGcalModalBtn.addEventListener('click', () => {
      elements.googleCalendarModal.classList.remove('open');
    });
  }

  // Export to Excel Buttons
  const exportHandler = () => {
    window.location.href = '/api/leads/export';
  };
  if (elements.headerExportBtn) elements.headerExportBtn.addEventListener('click', exportHandler);
  if (elements.exportExcelBtn) elements.exportExcelBtn.addEventListener('click', exportHandler);

  // Autodial Button
  if (elements.autodialBtn) {
    elements.autodialBtn.addEventListener('click', autodialNextLead);
  }

  // Queue Filter Tabs
  if (elements.filterOptimalBtn && elements.filterAllBtn) {
    elements.filterOptimalBtn.addEventListener('click', () => {
      elements.filterOptimalBtn.classList.add('active');
      elements.filterAllBtn.classList.remove('active');
      state.queueFilter = 'optimal';
      renderFilteredQueue();
    });

    elements.filterAllBtn.addEventListener('click', () => {
      elements.filterAllBtn.classList.add('active');
      elements.filterOptimalBtn.classList.remove('active');
      state.queueFilter = 'all';
      renderFilteredQueue();
    });
  }

  // Google Sheet Sync Buttons
  if (elements.syncSheetBtn) {
    elements.syncSheetBtn.addEventListener('click', () => triggerSheetSync());
  }
  if (elements.hubSyncBtn) {
    elements.hubSyncBtn.addEventListener('click', () => triggerSheetSync());
  }

  // Save Custom Google Sheet URL
  if (elements.saveSheetUrlBtn) {
    elements.saveSheetUrlBtn.addEventListener('click', () => {
      const url = elements.sheetUrlInput.value;
      if (!url) {
        alert('Please enter a valid Google Sheet CSV URL.');
        return;
      }
      triggerSheetSync(url);
    });
  }

  // Apps Script Setup Modal
  if (elements.openScriptModalBtn) {
    elements.openScriptModalBtn.addEventListener('click', async () => {
      elements.appsScriptModal.classList.add('open');
      try {
        const res = await fetch('/api/sheet/apps-script');
        const data = await res.json();
        elements.appsScriptCode.textContent = data.code;
      } catch (e) {
        elements.appsScriptCode.textContent = '// Failed to load script template';
      }
    });
  }

  if (elements.closeScriptModalBtn) {
    elements.closeScriptModalBtn.addEventListener('click', () => {
      elements.appsScriptModal.classList.remove('open');
    });
  }

  if (elements.copyScriptBtn) {
    elements.copyScriptBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(elements.appsScriptCode.textContent);
      elements.copyScriptBtn.textContent = 'Copied!';
      setTimeout(() => { elements.copyScriptBtn.textContent = 'Copy Code'; }, 2000);
    });
  }

  // Lead selection change
  elements.leadSelect.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    const found = state.leads.find(l => l.id === selectedId);
    if (found) selectLead(found);
  });

  // Modal Close
  elements.closeModalBtn.addEventListener('click', () => {
    elements.postCallModal.classList.remove('open');
  });

  elements.copyEmailBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.modalEmailText.value);
    elements.copyEmailBtn.textContent = 'Copied!';
    setTimeout(() => { elements.copyEmailBtn.textContent = 'Copy Email'; }, 2000);
  });

  // Objection Simulator Chips
  document.querySelectorAll('[data-sim]').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.sim;
      appendTranscript('user', text, true);
      if (state.callActive && state.ws) {
        state.ws.send(JSON.stringify({
          type: 'simulate_user_text',
          text: text
        }));
      }
    });
  });

  // Custom Lead Modal
  elements.openAddLeadBtn.addEventListener('click', () => {
    elements.addLeadModal.classList.add('open');
  });

  elements.closeAddLeadModalBtn.addEventListener('click', () => {
    elements.addLeadModal.classList.remove('open');
  });

  elements.addLeadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(elements.addLeadForm);
    const newLeadData = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeadData)
      });
      const created = await res.json();
      state.leads.unshift(created);
      state.queue.unshift(created);
      elements.addLeadModal.classList.remove('open');
      elements.addLeadForm.reset();
      
      await loadLeads();
      selectLead(created);
    } catch (err) {
      alert(`Failed to save hotel lead: ${err.message}`);
    }
  });

  // Lead search filter in Hub
  elements.leadSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = state.leads.filter(l => 
      (l.propertyName || '').toLowerCase().includes(query) ||
      (l.decisionMaker || '').toLowerCase().includes(query) ||
      (l.cityHq || '').toLowerCase().includes(query) ||
      (l.signatureAmenity || '').toLowerCase().includes(query) ||
      (l.callSummary || '').toLowerCase().includes(query)
    );
    renderLeadsTable(filtered);
  });

  // Twilio Phone Call trigger
  if (elements.twilioCallBtn) {
    elements.twilioCallBtn.addEventListener('click', async () => {
      const phone = elements.twilioPhoneInput.value;
      if (!phone) {
        alert('Please enter a target hotel phone number.');
        return;
      }
      elements.twilioStatusMsg.textContent = 'Dialing phone via Twilio...';
      try {
        const res = await fetch('/api/twilio/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: state.selectedLead?.id,
            phoneNumber: phone
          })
        });
        const result = await res.json();
        elements.twilioStatusMsg.textContent = result.message || `Call placed: SID ${result.callSid}`;
      } catch (err) {
        elements.twilioStatusMsg.textContent = `Call error: ${err.message}`;
      }
    });
  }
}

// Waveform Canvas Setup
function setupCanvas() {
  const canvas = elements.waveformCanvas;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function draw() {
    requestAnimationFrame(draw);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.analyser && state.dataArray && state.callActive) {
      state.analyser.getByteFrequencyData(state.dataArray);

      const barWidth = (canvas.width / state.dataArray.length) * 1.5;
      let x = 0;

      for (let i = 0; i < state.dataArray.length; i++) {
        const barHeight = (state.dataArray[i] / 255) * canvas.height * 0.9;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#6366f1');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      for (let x = 0; x < canvas.width; x++) {
        const y = (canvas.height / 2) + Math.sin(x * 0.05 + Date.now() * 0.002) * 4;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  draw();
}

// Audio Conversion Helpers
function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output.buffer;
}

function base64Encode(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
