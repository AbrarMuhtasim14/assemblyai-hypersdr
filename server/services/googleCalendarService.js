import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKENS_PATH = path.resolve(__dirname, '../../data/google_tokens.json');

export class GoogleCalendarService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    this.isAuthenticated = false;

    // Listen for automatic token refreshes from google-auth-library
    this.oauth2Client.on('tokens', (newTokens) => {
      console.log('[GoogleCalendarService] OAuth2 client refreshed tokens automatically.');
      if (newTokens.refresh_token || newTokens.access_token) {
        try {
          const existing = fs.existsSync(TOKENS_PATH) ? JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8')) : {};
          const merged = { ...existing, ...newTokens };
          const dir = path.dirname(TOKENS_PATH);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(TOKENS_PATH, JSON.stringify(merged, null, 2));
        } catch (e) {
          // ignore in read-only environments
        }
      }
    });

    this.loadSavedTokens();
  }

  loadSavedTokens() {
    try {
      // 1. Check full tokens JSON from environment variable (ideal for Render cloud deployment)
      if (process.env.GOOGLE_OAUTH_TOKENS) {
        try {
          const tokens = typeof process.env.GOOGLE_OAUTH_TOKENS === 'string'
            ? JSON.parse(process.env.GOOGLE_OAUTH_TOKENS)
            : process.env.GOOGLE_OAUTH_TOKENS;
          this.oauth2Client.setCredentials(tokens);
          this.isAuthenticated = true;
          console.log('[GoogleCalendarService] Loaded Google OAuth tokens from GOOGLE_OAUTH_TOKENS environment variable.');
          return;
        } catch (parseErr) {
          console.warn('[GoogleCalendarService] Could not parse GOOGLE_OAUTH_TOKENS:', parseErr.message);
        }
      }

      // 2. Check refresh token from environment variable
      const envRefreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
      if (envRefreshToken) {
        this.oauth2Client.setCredentials({ refresh_token: envRefreshToken.trim() });
        this.isAuthenticated = true;
        console.log('[GoogleCalendarService] Loaded Google OAuth refresh token from environment variable.');
        return;
      }

      // 3. Fall back to local file on disk
      if (fs.existsSync(TOKENS_PATH)) {
        const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
        this.oauth2Client.setCredentials(tokens);
        this.isAuthenticated = true;
        console.log('[GoogleCalendarService] Loaded existing Google OAuth tokens from disk.');
      }
    } catch (e) {
      console.warn('[GoogleCalendarService] Could not load saved tokens:', e.message);
      this.isAuthenticated = false;
    }
  }

  saveTokens(tokens) {
    try {
      const dir = path.dirname(TOKENS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;
      console.log('[GoogleCalendarService] Saved new Google OAuth tokens to disk.');
    } catch (e) {
      console.error('[GoogleCalendarService] Error saving tokens:', e);
    }
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });
  }

  async handleCallbackCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.saveTokens(tokens);
    return tokens;
  }

  getStatus() {
    return {
      configured: !!(this.clientId && this.clientSecret),
      authenticated: this.isAuthenticated,
      clientId: this.clientId ? `${this.clientId.slice(0, 15)}...` : null,
      redirectUri: this.redirectUri
    };
  }

  /**
   * Creates a REAL Google Calendar event with authentic Google Meet link via Google Calendar API
   */
  async createRealCalendarEvent(lead, meetingInfo = {}) {
    const day = meetingInfo.day || meetingInfo.preferred_day || 'Thursday';
    const time = meetingInfo.time || meetingInfo.preferred_time || '2:00 PM';
    const recipientEmail = meetingInfo.email || meetingInfo.prospect_email || lead.email;
    const propertyName = lead.propertyName || 'Boutique Hotel';
    const decisionMaker = lead.decisionMaker || 'Innkeeper';

    const eventTitle = `15-Min Strategy Sync: Syed Abrar Mohtasim x ${decisionMaker} - ${propertyName}`;
    const description = `Boutique Review Concierge & Direct Booking Strategy Discussion.\n` +
      `Property: ${propertyName} (${lead.cityHq || 'USA'})\n` +
      `Decision Maker: ${decisionMaker} (${lead.title || 'Owner'})\n` +
      `Host: Syed Mohammed Abrar Mohtasim (abrarmuhtasim400@gmail.com)\n\n` +
      `Agenda:\n` +
      `1. Protecting ${propertyName}'s Google 3-Pack placement via 48-hour private review routing.\n` +
      `2. Direct Booking Recovery: Shifting repeat guests off Expedia/Booking.com to recover 18-22% in OTA commissions.\n` +
      `3. Turnkey review concierge overview.`;

    // Parse date/time or default to upcoming Thursday 2:00 PM EST
    const { startDateTime, endDateTime, formattedDay, formattedTime, slotLabel } = this.calculateEventTimes(day, time, lead.timezone);

    // Safe Test Email Shield: Whitelist of allowed recipient emails during development/testing
    const SAFE_TEST_EMAILS = ['abrarmuhtasim400@gmail.com', 'picturecompile@gmail.com'];
    const isSafeEmail = SAFE_TEST_EMAILS.includes((recipientEmail || '').trim().toLowerCase());
    const safeGuestEmail = isSafeEmail ? recipientEmail : 'picturecompile@gmail.com';

    // If OAuth authenticated, call official Google Calendar API with Google Meet conference generation
    if (this.isAuthenticated) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const eventPayload = {
          summary: eventTitle,
          description: description,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: lead.timezone || 'America/New_York'
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: lead.timezone || 'America/New_York'
          },
          attendees: [
            { email: safeGuestEmail, displayName: decisionMaker },
            { email: 'abrarmuhtasim400@gmail.com', displayName: 'Syed Mohammed Abrar Mohtasim' }
          ],
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 15 }
            ]
          }
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          conferenceDataVersion: 1,
          sendUpdates: 'none', // Strictly prevent external email dispatches to real leads during testing
          requestBody: eventPayload
        });

        const createdEvent = response.data;
        const realMeetUri = createdEvent.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri 
          || createdEvent.hangoutLink 
          || `https://meet.google.com/abr-boutique-sync`;

        console.log(`[GoogleCalendarService] Successfully created REAL Google Calendar event ID: ${createdEvent.id}`);
        console.log(`[GoogleCalendarService] Authentic Google Meet Link: ${realMeetUri}`);
        console.log(`[GoogleCalendarService] Slot Booked: ${slotLabel} (${lead.timezone || 'America/New_York'})`);

        return {
          success: true,
          realApiCreated: true,
          eventId: createdEvent.id,
          eventUrl: createdEvent.htmlLink,
          googleMeetLink: realMeetUri,
          title: eventTitle,
          day: formattedDay,
          time: formattedTime,
          slotLabel: slotLabel,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          guestEmail: safeGuestEmail,
          host: 'Syed Mohammed Abrar Mohtasim (abrarmuhtasim400@gmail.com)',
          googleCalendarUrl: createdEvent.htmlLink
        };
      } catch (err) {
        console.error('[GoogleCalendarService] Google Calendar API error, falling back to instant calendar URL:', err.message);
      }
    }

    // Fallback: Build official Google Calendar 1-click template URL
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent('https://meet.google.com/new')}&dates=${this.formatGCalDates(startDateTime, endDateTime)}`;

    return {
      success: true,
      realApiCreated: false,
      eventId: `LOCAL-${Date.now()}`,
      eventUrl: gcalUrl,
      googleMeetLink: 'https://meet.google.com/new',
      title: eventTitle,
      day: formattedDay,
      time: formattedTime,
      slotLabel: slotLabel,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      guestEmail: safeGuestEmail,
      host: 'Syed Mohammed Abrar Mohtasim (abrarmuhtasim400@gmail.com)',
      googleCalendarUrl: gcalUrl
    };
  }

  calculateEventTimes(dayStr, timeStr, timezone = 'America/New_York') {
    const now = new Date();
    const lowerDay = (dayStr || '').toLowerCase();
    const lowerTime = (timeStr || '').toLowerCase();

    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed
    let targetDate = now.getDate();

    // Check for month names (e.g. October, Oct, Nov, etc.)
    const monthsMap = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
      may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
      september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11
    };
    
    let monthFound = false;
    for (const [mName, mIdx] of Object.entries(monthsMap)) {
      if (lowerDay.includes(mName)) {
        targetMonth = mIdx;
        monthFound = true;
        break;
      }
    }

    // Check for specific date numbers (e.g. "7th", "October 7th", "7", "23rd")
    const dateNumMatch = lowerDay.match(/(\d{1,2})(?:st|nd|rd|th)?/);
    if (dateNumMatch) {
      targetDate = parseInt(dateNumMatch[1], 10);
      if (!monthFound && targetDate < now.getDate()) {
        // If date is earlier this month, advance to next month
        targetMonth = (targetMonth + 1) % 12;
        if (targetMonth === 0) targetYear++;
      }
    } else if (lowerDay.includes('tomorrow')) {
      const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      targetYear = tmrw.getFullYear();
      targetMonth = tmrw.getMonth();
      targetDate = tmrw.getDate();
    } else {
      // Days of the week (Sunday -> Saturday)
      const daysMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      let dayMatched = false;
      for (const [name, index] of Object.entries(daysMap)) {
        if (lowerDay.includes(name)) {
          const currentDay = now.getDay();
          let distance = (index + 7 - currentDay) % 7;
          if (distance === 0) distance = 7; // Next week if today
          const target = new Date(now.getTime() + distance * 24 * 60 * 60 * 1000);
          targetYear = target.getFullYear();
          targetMonth = target.getMonth();
          targetDate = target.getDate();
          dayMatched = true;
          break;
        }
      }
      if (!dayMatched) {
        // Default to tomorrow if unspecified
        const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        targetYear = tmrw.getFullYear();
        targetMonth = tmrw.getMonth();
        targetDate = tmrw.getDate();
      }
    }

    // Parse hour and minute (e.g. "5:00 PM", "5 PM", "after 5 PM", "17:00", "2:30 PM")
    let hour = 14;
    let minute = 0;
    const combinedTime = `${lowerTime} ${lowerDay}`.trim();
    const timeMatch = combinedTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      if (!ampm && (combinedTime.includes('after 5') || combinedTime.includes('5pm') || combinedTime.includes('evening')) && hour < 12) hour += 12;
    } else if (combinedTime.includes('morning')) {
      hour = 10;
    } else if (combinedTime.includes('afternoon')) {
      hour = 14;
    } else if (combinedTime.includes('evening')) {
      hour = 17;
    }

    // Calculate timezone offset for the prospect's timezone on the target date
    const testUtc = new Date(Date.UTC(targetYear, targetMonth, targetDate, hour, minute));
    const tzFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' });
    const parts = tzFormatter.formatToParts(testUtc);
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-4';

    function formatOffset(tzVal) {
      if (!tzVal || tzVal === 'GMT' || tzVal === 'UTC') return '+00:00';
      const m = tzVal.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return '+00:00';
      return m[1] + m[2].padStart(2, '0') + ':' + (m[3] ? m[3].padStart(2, '0') : '00');
    }

    const offsetStr = formatOffset(tzPart);
    const isoLocal = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDate).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${offsetStr}`;
    const startDateTime = new Date(isoLocal);
    const endDateTime = new Date(startDateTime.getTime() + 15 * 60 * 1000);

    // Format display strings formatted directly in the prospect's timezone
    const dayOptions = { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' };
    const formattedDay = new Intl.DateTimeFormat('en-US', dayOptions).format(startDateTime);
    
    const timeOptions = { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true };
    const formattedTimeOnly = new Intl.DateTimeFormat('en-US', timeOptions).format(startDateTime);

    const tzNameFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' });
    const tzName = tzNameFormatter.formatToParts(startDateTime).find(p => p.type === 'timeZoneName')?.value || 'EDT';

    const formattedTime = `${formattedTimeOnly} ${tzName}`;
    const slotLabel = `${formattedDay} @ ${formattedTime}`;

    return {
      startDateTime,
      endDateTime,
      formattedDay,
      formattedTime,
      slotLabel
    };
  }

  formatGCalDates(start, end) {
    const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    return `${format(start)}/${format(end)}`;
  }
}

export const googleCalendarService = new GoogleCalendarService();
