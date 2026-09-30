import { googleCalendarService } from './googleCalendarService.js';
import { leadService } from './leadService.js';

export class PostCallService {
  /**
   * Analyzes the call transcript and produces structured CRM insights
   */
  async analyzeCall(lead, transcripts, callDurationSeconds = 0) {
    const fullTranscriptText = transcripts
      .map(t => `${t.speaker === 'agent' ? 'Alex (SDR)' : (lead.firstName || 'Innkeeper')}: ${t.text}`)
      .join('\n');

    console.log(`[PostCallService] Analyzing call for ${lead.propertyName || lead.agencyName} (${callDurationSeconds}s)...`);

    const lowerText = fullTranscriptText.toLowerCase();

    // Check if lead already has meetingDetails booked live via tool
    let masterLead = lead;
    if (lead?.id) {
      const stored = leadService.getLeadById(lead.id);
      if (stored) masterLead = stored;
    }

    // Check for meeting booking signals
    const meetingBooked = !!(masterLead.meetingBooked || 
                            masterLead.meetingDetails ||
                            lead.meetingBooked ||
                            lead.meetingDetails ||
                            lowerText.includes('reserved') || 
                            lowerText.includes('calendar') || 
                            lowerText.includes('scheduled') || 
                            lowerText.includes('google meet') ||
                            lowerText.includes('locked in'));

    // Check for case study / email signals
    const caseStudySent = lowerText.includes('case study') || 
                          lowerText.includes('dispatched') || 
                          lowerText.includes('email');

    // Check for objections handled
    const objectionsFound = [];
    if (lowerText.includes('review') || lowerText.includes('google') || lowerText.includes('rating')) {
      objectionsFound.push({
        topic: 'Google 3-Pack Reputation',
        status: 'Handled',
        notes: 'SDR explained private 48-hour post-checkout review routing preventing public negative reviews.'
      });
    }
    if (lowerText.includes('expedia') || lowerText.includes('booking.com') || lowerText.includes('ota') || lowerText.includes('commission')) {
      objectionsFound.push({
        topic: 'OTA Commission Leakage (18-22%)',
        status: 'Handled',
        notes: 'SDR presented direct-booking re-engagement strategy to shift return guests to direct hotel booking.'
      });
    }
    if (lowerText.includes('ai') || lowerText.includes('bot') || lowerText.includes('robot')) {
      objectionsFound.push({
        topic: 'AI Identity Verification',
        status: 'Acknowledged Positively',
        notes: 'SDR transparently confirmed being an autonomous voice agent built on AssemblyAI Voice Agent API.'
      });
    }
    if (lowerText.includes('software') || lowerText.includes('install') || lowerText.includes('complicated')) {
      objectionsFound.push({
        topic: 'Software Overhead Concern',
        status: 'Handled',
        notes: 'SDR reassured that the concierge operates via background webhook with zero software for innkeepers to install.'
      });
    }

    // Calculate BANT Score
    let budgetScore = lowerText.includes('commission') || lowerText.includes('savings') || lowerText.includes('cost') ? 25 : 20;
    let authorityScore = (lead.title || '').toLowerCase().includes('proprietor') || (lead.title || '').toLowerCase().includes('owner') || (lead.title || '').toLowerCase().includes('innkeeper') ? 25 : 20;
    let needScore = lowerText.includes('review') || lowerText.includes('ota') || lowerText.includes('guest') ? 25 : 20;
    let timelineScore = meetingBooked ? 25 : (caseStudySent ? 15 : 10);

    const totalBantScore = Math.min(100, budgetScore + authorityScore + needScore + timelineScore);

    // Call Disposition
    let disposition = 'Follow-Up Requested';
    if (meetingBooked) {
      disposition = 'Meeting Booked (Hot Lead)';
    } else if (totalBantScore >= 70) {
      disposition = 'Highly Qualified (Nurture)';
    } else if (callDurationSeconds < 15) {
      disposition = 'Screened / Voicemail';
    }

    // Meeting Details: Prioritize actual tool booking details
    let meetingDetails = masterLead.meetingDetails || lead.meetingDetails || null;
    if (!meetingDetails && meetingBooked) {
      // Dynamic fallback extraction from conversation with strict day/month boundaries
      let extractedDay = 'Tomorrow';
      let extractedTime = '2:00 PM';

      const dayMatch = lowerText.match(/(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|(?:october|oct|november|nov|december|dec|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep)\s+\d{1,2}(?:st|nd|rd|th)?)/i);
      if (dayMatch) extractedDay = dayMatch[1];

      const timeMatch = lowerText.match(/(?:at\s+|after\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)|after\s+\d{1,2}(?:\s*(?:am|pm))?|morning|afternoon|evening)/i);
      if (timeMatch) extractedTime = timeMatch[1];

      const calculated = googleCalendarService.calculateEventTimes(extractedDay, extractedTime, lead.timezone);
      const meetLink = "https://meet.google.com/abr-boutique-sync";
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`15-Min Strategy Sync: Syed Abrar Mohtasim x ${lead.decisionMaker} (${lead.propertyName})`)}&details=${encodeURIComponent(`Review Concierge & Direct Booking Discussion for ${lead.propertyName}`)}&location=${encodeURIComponent(meetLink)}`;
      
      meetingDetails = {
        day: calculated.formattedDay || extractedDay,
        time: calculated.formattedTime || extractedTime,
        slotLabel: calculated.slotLabel || `${extractedDay} @ ${extractedTime}`,
        title: `15-Min Strategy Sync: Syed Abrar Mohtasim x ${lead.decisionMaker} - ${lead.propertyName}`,
        googleMeetLink: meetLink,
        googleCalendarUrl: gcalUrl
      };
    }

    const slotDisplay = meetingDetails ? (meetingDetails.slotLabel || `${meetingDetails.day} @ ${meetingDetails.time}`) : '';

    // Executive Summary
    const summary = meetingBooked
      ? `Highly productive conversation with ${lead.decisionMaker} (${lead.title} at ${lead.propertyName}). Addressed safeguarding ${lead.propertyName}'s stellar ${lead.googleRating}-star Google score and recovering 18-22% in OTA commissions. Innkeeper scheduled a 15-minute strategy sync with Syed Abrar Mohtasim on Google Calendar (${slotDisplay}).`
      : `Outbound discussion with ${lead.decisionMaker} regarding ${lead.propertyName}'s guest review flow and direct booking strategy in ${lead.cityHq}. Dispatched 2-minute overview and case study to ${lead.email}.`;

    // Follow-Up Email Generation
    const followUpEmail = `Subject: Great speaking earlier, ${lead.firstName} — note on ${lead.propertyName}'s Google reviews + direct bookings

Hi ${lead.firstName},

Great connecting briefly over the phone earlier today!

As mentioned, Syed Abrar Mohtasim's boutique review concierge helps independent properties like ${lead.propertyName}:
1. Safeguard your stellar ${lead.googleRating} Google rating: Reaching guests privately 48 hours post-checkout so friction is resolved before reaching Google Maps.
2. Recover 18% to 22% in OTA commissions: Re-engaging past guests to book directly on your website for their return visits.
3. Zero software overhead: Runs quietly in the background without burdening your front-desk staff.

${meetingBooked ? `Looking forward to our quick strategy sync! We've sent a Google Calendar invite to ${lead.email} with the Google Meet link.` : `I've sent our 2-minute boutique hotel breakdown here. If you'd like to explore how this applies to ${lead.propertyName}, feel free to grab a quick 15-minute slot on Abrar's calendar: https://calendar.google.com/calendar/render?action=TEMPLATE`}

Best regards,

Alex (on behalf of Syed Mohammed Abrar Mohtasim)
Boutique Review Concierge & Direct Booking Systems
Email: abrarmuhtasim400@gmail.com | Phone: +1 707-253-1331`;

    return {
      callId: `CALL-${Date.now().toString().slice(-6)}`,
      leadId: lead.id,
      propertyName: lead.propertyName,
      agencyName: lead.propertyName,
      decisionMaker: lead.decisionMaker,
      callDurationSeconds,
      disposition,
      meetingBooked,
      meetingDetails,
      totalBantScore,
      qualificationScore: totalBantScore,
      bantBreakdown: {
        budget: `${budgetScore}/25 (OTA Commission Recovery)`,
        authority: `${authorityScore}/25 (${lead.title})`,
        need: `${needScore}/25 (Review Protection & Direct Bookings)`,
        timeline: `${timelineScore}/25`
      },
      objectionsAudited: objectionsFound.length > 0 ? objectionsFound : [{ topic: 'None Raised', status: 'Smooth Call', notes: 'Innkeeper was receptive to discussion' }],
      executiveSummary: summary,
      followUpEmail,
      analyzedAt: new Date().toISOString()
    };
  }
}

export const postCallService = new PostCallService();
