import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { smartSchedulerService } from './smartSchedulerService.js';
import { googleSheetService } from './googleSheetService.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Primary Excel file paths (bundled data folder or project root)
const EXCEL_PATH_DATA = path.resolve(__dirname, '../../data/usa_boutique_hotels_vip_named_owners_QUALIFIED_AUTOMATED.xlsx');
const EXCEL_PATH_PARENT = path.resolve(__dirname, '../../../usa_boutique_hotels_vip_named_owners_QUALIFIED_AUTOMATED.xlsx');

class LeadService {
  constructor() {
    this.leads = [];
    this.leadsById = new Map();
    this.excelLoaded = false;
    this.loadLeads();
  }

  loadLeads() {
    try {
      let targetPath = null;
      if (fs.existsSync(EXCEL_PATH_DATA)) {
        targetPath = EXCEL_PATH_DATA;
      } else if (fs.existsSync(EXCEL_PATH_PARENT)) {
        targetPath = EXCEL_PATH_PARENT;
      }

      if (targetPath) {
        console.log(`[LeadService] Loading boutique hotel leads from Excel: ${targetPath}`);
        const workbook = XLSX.readFile(targetPath);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows && rows.length > 0) {
          const parsedLeads = [];

          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const leadId = r.Lead_ID || `USA-VIP-${(i + 1).toString().padStart(4, '0')}`;
            const propertyName = r.Property_Name || 'Boutique Hotel';
            const decisionMaker = r.Decision_Maker_Name || 'Owner';
            const firstName = (decisionMaker || '').split(' ')[0] || decisionMaker;
            const title = r.Executive_Title || 'Owner/Innkeeper';
            const email = r.Direct_Email || `innkeeper@${(r.Hotel_Domain || 'boutiquehotel.com').toLowerCase()}`;
            const phone = r.Verified_Phone || '';
            const timezone = r.Recipient_Timezone || 'America/New_York';
            const city = r.City || '';
            const state = r.State || '';
            const cityHq = city && state ? `${city}, ${state}` : (city || state || 'USA');
            const signatureAmenity = r.Signature_Amenity || 'Historic luxury suites and curated guest hospitality';
            const googleRating = parseFloat(r.Google_Rating) || 4.9;
            const googleReviewCount = parseInt(r.Google_Review_Count, 10) || 250;
            const verbatimReviewSnippet = r.Verbatim_Review_Snippet || 'The hospitality and attention to detail were exceptional.';
            const touch1Subject = r.Touch1_Subject || `note regarding ${propertyName}'s Google reviews`;
            const touch1Body = r.Touch1_Body || '';

            // Calculate estimated OTA commission loss (e.g., 20 rooms * $250 avg rate * 70% occupancy * 20% OTA commission = ~$255k/yr)
            const estimatedRooms = googleReviewCount > 300 ? 25 : (googleReviewCount > 150 ? 16 : 10);
            const avgDailyRate = 265;
            const annualOtaLoss = Math.round(estimatedRooms * avgDailyRate * 0.70 * 0.20 * 365);

            const baseLead = {
              id: leadId,
              source: 'Boutique Hotels VIP Database',
              propertyName,
              agencyName: propertyName, // Backwards compatible for UI
              hotelDomain: r.Hotel_Domain || '',
              decisionMaker,
              firstName,
              title,
              email,
              phone,
              timezone,
              city,
              state,
              cityHq,
              country: 'United States',
              address: r.Verified_Address || '',
              googleMapsUrl: r.Google_Maps_URL || '',
              signatureAmenity,
              googleRating,
              googleReviewCount,
              verbatimReviewSnippet,
              assignedBucket: r.Assigned_Bucket || 'Bucket D',
              touch1Subject,
              touch1Body,
              niche: 'Independent Luxury Boutique Hotel & Historic Inn',
              painPoint: `Vulnerability to sudden Google 3-pack drops from unaddressed complaints, plus 18–22% lost to OTA commissions (Expedia / Booking.com)`,
              serviceOpportunity: `Boutique Review Concierge & 48h Post-Stay Direct Booking Recovery Pipeline`,
              outreachHook: `Hi ${firstName}, admire what you host at ${propertyName} in ${city} — traveler feedback noting "${verbatimReviewSnippet.slice(0, 60)}..." really stands out.`,
              collaborationModel: `Boutique Review & Direct Booking Partner`,
              techStack: ['Google Maps 3-Pack', 'Direct Booking Engine', 'Expedia / Booking.com OTA', 'Stripe'],
              estimatedMonthlyWastedHours: 20,
              potentialAnnualSavings: annualOtaLoss,
              objectionPlaybook: this.generateHotelObjectionPlaybook(propertyName, firstName),
              
              // Call status and outcome tracking
              callStatus: 'pending', // 'pending' | 'in_call' | 'completed'
              outcome: 'pending',    // 'pending' | 'meeting_booked' | 'follow_up_requested' | 'not_interested' | 'voicemail'
              meetingBooked: false,
              meetingDetails: null,  // { day, time, title, googleMeetLink, googleCalendarUrl }
              callSummary: null,
              lastCallResult: null,
              lastCallTimestamp: null
            };

            const enriched = smartSchedulerService.enrichLeadWithSchedule(baseLead);
            parsedLeads.push(enriched);
            this.leadsById.set(enriched.id, enriched);
          }

          this.leads = parsedLeads;
          this.excelLoaded = true;
          console.log(`[LeadService] Successfully loaded ${this.leads.length} qualified boutique hotel leads.`);
          return;
        }
      }

      console.warn('[LeadService] Excel file not found. Loading fallback hotel leads.');
      this.loadFallbackLeads();
    } catch (err) {
      console.error('[LeadService] Error loading leads Excel:', err);
      this.loadFallbackLeads();
    }
  }

  generateHotelObjectionPlaybook(propertyName, firstName) {
    return [
      {
        objection: "We already have great reviews on Google Maps.",
        response: `Your ${propertyName} reviews are stellar! But with independent boutique properties, a single unaddressed complaint over minor friction can quickly drop your score and cost you top placement in your local 3-pack. Our review concierge reaches guests privately 48 hours post-checkout so issues reach you before hitting Google.`
      },
      {
        objection: "Expedia and Booking.com drive most of our reservations anyway.",
        response: `Exactly—and OTAs take 18% to 22% on every booking, including return guests who already know ${propertyName}. Our 48-hour post-stay sequence guides guests back to booking directly on your website for their next stay, saving tens of thousands in commissions.`
      },
      {
        objection: "We don't want to install complicated new hotel software.",
        response: `You don't install anything at all! We handle the private post-stay routing quietly in the background via automated webhooks, with zero added software or training for your front-desk staff.`
      },
      {
        objection: "Are you an AI voice agent?",
        response: `Yes, I'm Alex, an autonomous Voice SDR built on AssemblyAI's Voice Agent API for Syed Abrar Mohtasim's boutique review concierge. I'm calling live to demonstrate how responsive and natural voice AI is without robotic delays!`
      },
      {
        objection: "Send me an email first.",
        response: `I'd love to! I can send our 2-minute boutique hotel breakdown and direct-booking case study to your inbox right now. Would that be ${firstName ? 'the best email on file' : 'a good place to start'}?`
      }
    ];
  }

  loadFallbackLeads() {
    const fallbacks = [
      {
        id: "USA-VIP-0001",
        propertyName: "The Inn On First",
        agencyName: "The Inn On First",
        hotelDomain: "theinnonfirst.com",
        decisionMaker: "Jim Gunther",
        firstName: "Jim",
        title: "Proprietor/Innkeeper",
        email: "innkeeper@theinnonfirst.com",
        phone: "+1 707-253-1331",
        timezone: "America/Los_Angeles",
        city: "Napa",
        state: "California",
        cityHq: "Napa, California",
        country: "United States",
        address: "1938 1st St, Napa, CA 94559, United States",
        signatureAmenity: "Chef Jim Gunther's scratch-made culinary breakfasts & private whirlpool soaking tubs",
        googleRating: 4.9,
        googleReviewCount: 367,
        verbatimReviewSnippet: "Jim's culinary breakfasts were unbelievable and he kept a record so we never had the same dish twice.",
        niche: "Independent Luxury Boutique Hotel & Historic Inn",
        painPoint: "Vulnerability to sudden Google 3-pack drops from unaddressed complaints, plus 18–22% lost to OTA commissions (Expedia / Booking.com)",
        serviceOpportunity: "Boutique Review Concierge & 48h Post-Stay Direct Booking Recovery Pipeline",
        outreachHook: "Hi Jim, admire what you host at The Inn On First in Napa — traveler feedback noting 'Jim's culinary breakfasts were unbelievable' really stands out.",
        collaborationModel: "Boutique Review & Direct Booking Partner",
        techStack: ['Google Maps 3-Pack', 'Direct Booking Engine', 'Expedia / Booking.com OTA'],
        estimatedMonthlyWastedHours: 20,
        potentialAnnualSavings: 255000,
        objectionPlaybook: this.generateHotelObjectionPlaybook("The Inn On First", "Jim"),
        callStatus: 'pending',
        outcome: 'pending',
        meetingBooked: false,
        meetingDetails: null,
        callSummary: null,
        lastCallResult: null,
        lastCallTimestamp: null
      },
      {
        id: "USA-VIP-0006",
        propertyName: "Berry Manor Inn",
        agencyName: "Berry Manor Inn",
        hotelDomain: "berrymanorinn.com",
        decisionMaker: "Cheryl Michaelsen",
        firstName: "Cheryl",
        title: "Owner/Innkeeper",
        email: "info@berrymanorinn.com",
        phone: "(207) 596-7696",
        timezone: "America/New_York",
        city: "Rockland",
        state: "Maine",
        cityHq: "Rockland, Maine",
        country: "United States",
        address: "81 Talbot Ave, Rockland, ME 04841",
        signatureAmenity: "24/7 guest pantry with homemade artisan pies and historic Victorian luxury suites",
        googleRating: 4.8,
        googleReviewCount: 285,
        verbatimReviewSnippet: "The inn was beautiful and well maintained, and the staff was outstanding. And the pies!",
        niche: "Independent Luxury Boutique Hotel & Historic Inn",
        painPoint: "Vulnerability to sudden Google 3-pack drops from unaddressed complaints, plus 18–22% lost to OTA commissions (Expedia / Booking.com)",
        serviceOpportunity: "Boutique Review Concierge & 48h Post-Stay Direct Booking Recovery Pipeline",
        outreachHook: "Hi Cheryl, admire what you host at Berry Manor Inn in Rockland — traveler feedback noting 'The inn was beautiful and well maintained' really stands out.",
        collaborationModel: "Boutique Review & Direct Booking Partner",
        techStack: ['Google Maps 3-Pack', 'Direct Booking Engine', 'Expedia / Booking.com OTA'],
        estimatedMonthlyWastedHours: 20,
        potentialAnnualSavings: 215000,
        objectionPlaybook: this.generateHotelObjectionPlaybook("Berry Manor Inn", "Cheryl"),
        callStatus: 'pending',
        outcome: 'pending',
        meetingBooked: false,
        meetingDetails: null,
        callSummary: null,
        lastCallResult: null,
        lastCallTimestamp: null
      }
    ];

    this.leads = fallbacks.map(f => smartSchedulerService.enrichLeadWithSchedule(f));
    this.leads.forEach(l => this.leadsById.set(l.id, l));
  }

  getAllLeads() {
    return this.leads.map(lead => smartSchedulerService.enrichLeadWithSchedule(lead));
  }

  getLeadById(id) {
    const lead = this.leadsById.get(id);
    if (!lead) return null;
    return smartSchedulerService.enrichLeadWithSchedule(lead);
  }

  getPrioritizedQueue() {
    return smartSchedulerService.prioritizeQueue(this.leads);
  }

  /**
   * Record call outcome and update in-memory lead state
   */
  async recordCallResult(leadId, callOutcome) {
    const lead = this.leadsById.get(leadId);
    if (!lead) return null;

    lead.callStatus = 'completed';
    lead.outcome = callOutcome.disposition || 'completed';
    lead.callSummary = callOutcome.executiveSummary || callOutcome.keyTakeaways || 'Call completed';
    lead.lastCallTimestamp = new Date().toISOString();
    lead.lastCallResult = {
      ...callOutcome,
      timestamp: lead.lastCallTimestamp
    };

    // If meeting was booked, track details
    if (callOutcome.meetingBooked || (callOutcome.disposition && callOutcome.disposition.toLowerCase().includes('meeting')) || lead.meetingBooked) {
      lead.meetingBooked = true;
      lead.outcome = 'meeting_booked';
      
      const existing = lead.meetingDetails || {};
      const incoming = callOutcome.meetingDetails || {};

      lead.meetingDetails = {
        day: incoming.day || existing.day || 'Thursday',
        time: incoming.time || existing.time || '2:00 PM EST',
        slotLabel: incoming.slotLabel || existing.slotLabel || `${incoming.day || existing.day} @ ${incoming.time || existing.time}`,
        title: existing.title || incoming.title || `15-Min Strategy Sync: Syed Abrar Mohtasim x ${lead.decisionMaker} - ${lead.propertyName}`,
        googleMeetLink: (existing.googleMeetLink && !existing.googleMeetLink.includes('abr-boutique-sync')) 
          ? existing.googleMeetLink 
          : (incoming.googleMeetLink || existing.googleMeetLink || 'https://meet.google.com/abr-boutique-sync'),
        googleCalendarUrl: existing.googleCalendarUrl || incoming.googleCalendarUrl || '',
        eventId: existing.eventId || incoming.eventId || null,
        realApiCreated: existing.realApiCreated !== undefined ? existing.realApiCreated : incoming.realApiCreated,
        bookedAt: existing.bookedAt || incoming.bookedAt || new Date().toISOString()
      };
    }

    this.leadsById.set(leadId, lead);
    this.saveLeadsToDisk();

    // Sync back to Google Sheet if configured
    const sheetSyncResult = await googleSheetService.updateSheetRow({
      leadId,
      agencyName: lead.propertyName,
      disposition: lead.outcome,
      qualificationScore: callOutcome.qualificationScore || callOutcome.totalBantScore || 85,
      keyTakeaways: lead.callSummary,
      durationSeconds: callOutcome.durationSeconds || callOutcome.callDurationSeconds || 0,
      recordingUrl: callOutcome.recordingUrl || null,
      meetingDetails: lead.meetingDetails || callOutcome.meetingDetails || null
    });

    return {
      lead,
      sheetSyncResult
    };
  }

  /**
   * Book meeting slot directly for a lead
   */
  async bookMeeting(leadId, meetingInfo) {
    const lead = this.leadsById.get(leadId);
    if (!lead) return null;

    lead.meetingBooked = true;
    lead.outcome = 'meeting_booked';
    const slotLabel = meetingInfo.slotLabel || `${meetingInfo.day || 'Thursday'} @ ${meetingInfo.time || '2:00 PM EST'}`;
    lead.meetingDetails = {
      day: meetingInfo.day || meetingInfo.preferred_day || 'Thursday',
      time: meetingInfo.time || meetingInfo.preferred_time || '2:00 PM EST',
      slotLabel: slotLabel,
      title: meetingInfo.title || `15-Min Strategy Sync: Syed Abrar Mohtasim x ${lead.decisionMaker} - ${lead.propertyName}`,
      googleMeetLink: meetingInfo.googleMeetLink || 'https://meet.google.com/abr-boutique-sync',
      googleCalendarUrl: meetingInfo.googleCalendarUrl || this.generateGoogleCalendarUrl(lead, meetingInfo),
      bookedAt: new Date().toISOString()
    };

    this.leadsById.set(leadId, lead);
    this.saveLeadsToDisk();

    // Immediately push meeting booking to Google Sheet
    try {
      await googleSheetService.updateSheetRow({
        leadId,
        agencyName: lead.propertyName,
        disposition: 'meeting_booked',
        qualificationScore: 90,
        keyTakeaways: lead.callSummary || `Meeting booked for ${lead.meetingDetails.slotLabel || `${lead.meetingDetails.day} @ ${lead.meetingDetails.time}`}`,
        meetingDetails: lead.meetingDetails
      });
    } catch (e) {
      console.warn('[LeadService] Live sheet booking sync notice:', e.message);
    }

    return lead;
  }

  /**
   * Persists leads and call outcomes directly back into the Excel files on disk
   */
  saveLeadsToDisk() {
    try {
      const exportData = this.leads.map(lead => ({
        Lead_ID: lead.id,
        Property_Name: lead.propertyName,
        Decision_Maker_Name: lead.decisionMaker,
        Executive_Title: lead.title,
        Direct_Email: lead.email,
        Verified_Phone: lead.phone,
        Recipient_Timezone: lead.timezone,
        City: lead.city,
        State: lead.state,
        Google_Rating: lead.googleRating,
        Google_Review_Count: lead.googleReviewCount,
        Signature_Amenity: lead.signatureAmenity,
        Verbatim_Review_Snippet: lead.verbatimReviewSnippet,
        Call_Status: (lead.callStatus || 'pending').toUpperCase(),
        Outcome: lead.outcome || 'pending',
        Meeting_Booked: lead.meetingBooked ? 'YES' : 'NO',
        Meeting_Slot: lead.meetingDetails ? (lead.meetingDetails.slotLabel || `${lead.meetingDetails.day} @ ${lead.meetingDetails.time}`) : '',
        Meeting_Meet_Link: lead.meetingDetails ? lead.meetingDetails.googleMeetLink : '',
        Call_Summary: lead.callSummary || '',
        Potential_Annual_OTA_Savings_USD: lead.potentialAnnualSavings,
        Last_Call_Timestamp: lead.lastCallTimestamp || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Campaign_Leads');

      const targetPaths = [
        path.resolve(__dirname, '../../../usa_boutique_hotels_vip_named_owners_WITH_CALL_RESULTS.xlsx'),
        path.resolve(__dirname, '../../data/usa_boutique_hotels_vip_named_owners_QUALIFIED_AUTOMATED.xlsx')
      ];

      for (const p of targetPaths) {
        try {
          XLSX.writeFile(workbook, p);
          console.log(`[LeadService] Persisted updated call results to disk: ${p}`);
        } catch (fileErr) {
          console.warn(`[LeadService] Could not write to ${p} (file may be open in Excel):`, fileErr.message);
        }
      }
    } catch (err) {
      console.warn('[LeadService] Notice during auto-save to disk:', err.message);
    }
  }

  generateGoogleCalendarUrl(lead, meetingInfo) {
    const title = encodeURIComponent(`15-Min Strategy Sync: Syed Abrar Mohtasim x ${lead.decisionMaker} (${lead.propertyName})`);
    const details = encodeURIComponent(
      `Strategy Discussion: Boutique Review Routing & Direct Booking Concierge.\n` +
      `Property: ${lead.propertyName} (${lead.cityHq})\n` +
      `Decision Maker: ${lead.decisionMaker} (${lead.title})\n` +
      `Key Goal: Recover 18-22% OTA commissions & protect Google Maps 3-Pack rating.\n\n` +
      `Google Meet Link: https://meet.google.com/abr-boutique-sync\n` +
      `Organizer: Syed Mohammed Abrar Mohtasim (abrarmuhtasim400@gmail.com)`
    );
    const location = encodeURIComponent('Google Meet: https://meet.google.com/abr-boutique-sync');
    
    // Future slot calculation (e.g., tomorrow 2 PM - 2:15 PM UTC equivalent)
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start.getTime() + 15 * 60 * 1000);

    const formatGCalTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const dates = `${formatGCalTime(start)}/${formatGCalTime(end)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
  }

  /**
   * Export all leads with updated call summaries and meeting outcomes to Excel (.xlsx)
   */
  exportLeadsToExcel() {
    const exportData = this.leads.map(lead => ({
      Lead_ID: lead.id,
      Property_Name: lead.propertyName,
      Decision_Maker_Name: lead.decisionMaker,
      Executive_Title: lead.title,
      Direct_Email: lead.email,
      Verified_Phone: lead.phone,
      Recipient_Timezone: lead.timezone,
      City: lead.city,
      State: lead.state,
      Google_Rating: lead.googleRating,
      Google_Review_Count: lead.googleReviewCount,
      Signature_Amenity: lead.signatureAmenity,
      Call_Status: lead.callStatus,
      Outcome: lead.outcome,
      Meeting_Booked: lead.meetingBooked ? 'YES' : 'NO',
      Meeting_Slot: lead.meetingDetails ? (lead.meetingDetails.slotLabel || `${lead.meetingDetails.day} @ ${lead.meetingDetails.time}`) : '',
      Meeting_Meet_Link: lead.meetingDetails ? lead.meetingDetails.googleMeetLink : '',
      Call_Summary: lead.callSummary || '',
      Potential_Annual_OTA_Savings_USD: lead.potentialAnnualSavings,
      Last_Call_Timestamp: lead.lastCallTimestamp || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Outreach_Outcomes');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  async syncGoogleSheet(customUrl = null) {
    const result = await googleSheetService.fetchFromPublishedSheet(customUrl);
    if (!result.success) return result;

    let addedCount = 0;
    let updatedCount = 0;

    for (const raw of result.rawLeads) {
      const oppId = raw['Lead_ID'] || raw['ID'] || `HOTEL-${Date.now().toString().slice(-4)}`;
      const propertyName = raw['Property_Name'] || raw['Hotel_Name'] || raw['Name'] || 'Boutique Hotel';
      const decisionMaker = raw['Decision_Maker_Name'] || raw['Contact'] || 'Owner';
      const city = raw['City'] || '';
      const state = raw['State'] || '';

      const leadData = {
        id: oppId,
        source: 'Google Sheet',
        propertyName,
        agencyName: propertyName,
        decisionMaker,
        firstName: decisionMaker.split(' ')[0] || decisionMaker,
        title: raw['Executive_Title'] || 'Owner/Innkeeper',
        email: raw['Direct_Email'] || raw['Email'] || '',
        phone: raw['Verified_Phone'] || raw['Phone'] || '',
        timezone: raw['Recipient_Timezone'] || 'America/New_York',
        city,
        state,
        cityHq: city && state ? `${city}, ${state}` : 'USA',
        country: 'United States',
        signatureAmenity: raw['Signature_Amenity'] || 'Curated luxury hospitality',
        googleRating: parseFloat(raw['Google_Rating']) || 4.9,
        googleReviewCount: parseInt(raw['Google_Review_Count'], 10) || 200,
        verbatimReviewSnippet: raw['Verbatim_Review_Snippet'] || 'Outstanding experience',
        niche: 'Independent Luxury Boutique Hotel & Historic Inn',
        painPoint: 'Vulnerability to sudden Google 3-pack drops, plus 18-22% lost to OTA commissions',
        serviceOpportunity: 'Boutique Review Concierge & 48h Direct Booking Recovery',
        outreachHook: `Hi ${decisionMaker.split(' ')[0]}, admire what you host at ${propertyName}.`,
        collaborationModel: 'Boutique Review & Direct Booking Partner',
        techStack: ['Google Maps 3-Pack', 'Direct Booking Engine', 'Expedia / Booking.com OTA'],
        estimatedMonthlyWastedHours: 20,
        potentialAnnualSavings: 250000,
        objectionPlaybook: this.generateHotelObjectionPlaybook(propertyName, decisionMaker.split(' ')[0]),
        callStatus: raw['Call_Status'] || 'pending',
        outcome: raw['Outcome'] || 'pending',
        meetingBooked: raw['Meeting_Booked'] === 'YES',
        meetingDetails: null,
        callSummary: raw['Call_Summary'] || null,
        lastCallResult: null,
        lastCallTimestamp: null
      };

      const enriched = smartSchedulerService.enrichLeadWithSchedule(leadData);

      if (this.leadsById.has(oppId)) {
        const existingIdx = this.leads.findIndex(l => l.id === oppId);
        if (existingIdx !== -1) this.leads[existingIdx] = enriched;
        this.leadsById.set(oppId, enriched);
        updatedCount++;
      } else {
        this.leads.unshift(enriched);
        this.leadsById.set(oppId, enriched);
        addedCount++;
      }
    }

    return {
      success: true,
      totalRows: result.totalFetched,
      added: addedCount,
      updated: updatedCount,
      syncedAt: result.syncedAt
    };
  }

  handleIncomingWebhook(leadData) {
    const oppId = leadData.id || leadData.Lead_ID || `HOTEL-INBOUND-${Date.now().toString().slice(-4)}`;
    const propertyName = leadData.propertyName || leadData.Property_Name || 'Boutique Property';
    const decisionMaker = leadData.decisionMaker || leadData.Decision_Maker_Name || 'Innkeeper';
    const city = leadData.city || leadData.City || '';
    const state = leadData.state || leadData.State || '';

    const lead = {
      id: oppId,
      source: 'Google Sheet Webhook (Live)',
      propertyName,
      agencyName: propertyName,
      decisionMaker,
      firstName: decisionMaker.split(' ')[0] || decisionMaker,
      title: leadData.title || leadData.Executive_Title || 'Owner',
      email: leadData.email || leadData.Direct_Email || '',
      phone: leadData.phone || leadData.Verified_Phone || '',
      timezone: leadData.timezone || leadData.Recipient_Timezone || 'America/New_York',
      city,
      state,
      cityHq: city && state ? `${city}, ${state}` : 'USA',
      country: 'United States',
      signatureAmenity: leadData.signatureAmenity || 'Curated luxury hospitality',
      googleRating: parseFloat(leadData.googleRating || leadData.Google_Rating) || 4.9,
      googleReviewCount: parseInt(leadData.googleReviewCount || leadData.Google_Review_Count, 10) || 250,
      verbatimReviewSnippet: leadData.verbatimReviewSnippet || 'Wonderful stay and service.',
      niche: 'Independent Luxury Boutique Hotel & Historic Inn',
      painPoint: 'Vulnerability to sudden Google 3-pack drops, plus 18-22% lost to OTA commissions',
      serviceOpportunity: 'Boutique Review Concierge & 48h Direct Booking Recovery',
      outreachHook: `Hi ${decisionMaker.split(' ')[0]}, admire what you host at ${propertyName}.`,
      collaborationModel: 'Boutique Review & Direct Booking Partner',
      techStack: ['Google Maps 3-Pack', 'Direct Booking Engine', 'Expedia / Booking.com OTA'],
      estimatedMonthlyWastedHours: 20,
      potentialAnnualSavings: 250000,
      objectionPlaybook: this.generateHotelObjectionPlaybook(propertyName, decisionMaker.split(' ')[0]),
      callStatus: 'pending',
      outcome: 'pending',
      meetingBooked: false,
      meetingDetails: null,
      callSummary: null,
      lastCallResult: null,
      lastCallTimestamp: null
    };

    const enriched = smartSchedulerService.enrichLeadWithSchedule(lead);
    this.leads.unshift(enriched);
    this.leadsById.set(oppId, enriched);
    return enriched;
  }

  addCustomLead(leadData) {
    return this.handleIncomingWebhook(leadData);
  }
}

export const leadService = new LeadService();
