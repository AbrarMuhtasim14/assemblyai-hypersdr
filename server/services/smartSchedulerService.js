/**
 * SmartSchedulerService
 * 
 * Computes prospect local time, TCPA compliance windows, B2B answer probability,
 * and next optimal dialing windows based on city, state, country, and area code.
 */

// Mapping of US State / City patterns and major global locations to IANA timezones
const LOCATION_TIMEZONE_MAP = [
  // US Eastern
  { pattern: /\b(NY|New York|Boston|MA|Miami|FL|Atlanta|GA|Philadelphia|PA|Washington|DC|Detroit|MI|Charlotte|NC|Orlando|Baltimore|MD)\b/i, tz: 'America/New_York' },
  // US Central
  { pattern: /\b(IL|Chicago|TX|Austin|Dallas|Houston|Fort Worth|San Antonio|TN|Nashville|Memphis|MN|Minneapolis|MO|St\.? Louis|Kansas City|WI|Milwaukee|LA|New Orleans|OK|Oklahoma City)\b/i, tz: 'America/Chicago' },
  // US Mountain
  { pattern: /\b(CO|Denver|Boulder|AZ|Phoenix|Scottsdale|UT|Salt Lake City|NM|Albuquerque|ID|Boise|MT|WY)\b/i, tz: 'America/Denver' },
  // US Pacific
  { pattern: /\b(CA|Los Angeles|San Francisco|San Diego|San Jose|Sacramento|WA|Seattle|OR|Portland|NV|Las Vegas|Reno)\b/i, tz: 'America/Los_Angeles' },
  // UK
  { pattern: /\b(UK|United Kingdom|London|Manchester|Birmingham|Leeds|Glasgow|Edinburgh|Bristol)\b/i, tz: 'Europe/London' },
  // Western / Central Europe
  { pattern: /\b(Germany|Berlin|Munich|Frankfurt|France|Paris|Netherlands|Amsterdam|Utrecht|Belgium|Brussels|Spain|Madrid|Barcelona|Poland|Warsaw|Portugal|Lisbon|Bulgaria|Sofia)\b/i, tz: 'Europe/Paris' },
  // Australia
  { pattern: /\b(Australia|Melbourne|Sydney|Brisbane|Gold Coast|Perth|Adelaide)\b/i, tz: 'Australia/Sydney' },
  // Canada (approximate to major centers)
  { pattern: /\b(Toronto|Montreal|Ottawa|Quebec)\b/i, tz: 'America/Toronto' },
  { pattern: /\b(Vancouver|BC|British Columbia)\b/i, tz: 'America/Vancouver' }
];

export class SmartSchedulerService {
  /**
   * Resolve IANA timezone from lead location metadata
   */
  resolveTimezone(lead) {
    if (lead.timezone) return lead.timezone;

    const locString = `${lead.cityHq || ''} ${lead.country || ''}`;
    for (const entry of LOCATION_TIMEZONE_MAP) {
      if (entry.pattern.test(locString)) {
        return entry.tz;
      }
    }

    // Default based on country
    const country = (lead.country || '').toLowerCase();
    if (country.includes('uk') || country.includes('united kingdom')) return 'Europe/London';
    if (country.includes('australia')) return 'Australia/Sydney';
    if (country.includes('germany') || country.includes('netherlands') || country.includes('france') || country.includes('poland')) return 'Europe/Berlin';
    
    // Default US Eastern
    return 'America/New_York';
  }

  /**
   * Get current date/time object in the target timezone
   */
  getZonedDateTime(timeZone) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      weekday: 'short'
    });

    const parts = formatter.formatToParts(now);
    const dateObj = {};
    parts.forEach(p => { dateObj[p.type] = p.value; });

    const hour = parseInt(dateObj.hour, 10);
    const minute = parseInt(dateObj.minute, 10);
    const weekday = dateObj.weekday; // 'Mon', 'Tue', etc.
    const timeFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(now);

    return {
      hour,
      minute,
      decimalHour: hour + (minute / 60),
      weekday,
      timeFormatted,
      timeZone
    };
  }

  /**
   * Determine dial window status and answer probability score
   * 
   * B2B Sales Call Benchmarks:
   * - Golden Peak: Tue-Thu, 10:00-11:30 AM & 2:00-4:00 PM (85-95% probability)
   * - Acceptable: 9:00-10:00 AM, 1:30-2:00 PM, 4:00-5:00 PM (65-75% probability)
   * - Suboptimal: 8:00-9:00 AM, 12:00-1:00 PM (lunch), 5:00-6:00 PM (30-50% probability)
   * - Do Not Call: Before 8:00 AM, After 6:00 PM, Weekends (TCPA compliant)
   */
  evaluateDialWindow(timeZone) {
    const zdt = this.getZonedDateTime(timeZone);
    const { decimalHour, weekday, timeFormatted } = zdt;

    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    const isPeakDay = ['Tue', 'Wed', 'Thu'].includes(weekday);
    const isModerateDay = ['Mon', 'Fri'].includes(weekday);

    // Hard TCPA boundaries
    if (isWeekend || decimalHour < 8.0 || decimalHour >= 18.0) {
      return {
        status: 'DO_NOT_CALL',
        statusLabel: 'Outside Business Hours',
        badgeColor: 'red',
        probability: 0,
        localTime: timeFormatted,
        weekday,
        canCallNow: false,
        reason: isWeekend ? 'Weekend (TCPA Compliance)' : (decimalHour < 8 ? 'Before 8:00 AM Local' : 'After 6:00 PM Local'),
        nextOptimal: isWeekend ? 'Next Monday at 10:00 AM' : (decimalHour < 8 ? 'Today at 10:00 AM' : 'Tomorrow at 10:00 AM')
      };
    }

    // Lunch block (12:00 PM - 1:00 PM)
    if (decimalHour >= 12.0 && decimalHour < 13.0) {
      return {
        status: 'LUNCH_BREAK',
        statusLabel: 'Lunch Hour',
        badgeColor: 'orange',
        probability: 25,
        localTime: timeFormatted,
        weekday,
        canCallNow: false,
        reason: 'Prospects rarely answer cold calls during lunch',
        nextOptimal: 'Today at 2:00 PM (Afternoon Peak)'
      };
    }

    // Golden Window 1: 10:00 AM - 11:30 AM
    // Golden Window 2: 2:00 PM - 4:00 PM
    const inMorningPeak = decimalHour >= 10.0 && decimalHour <= 11.5;
    const inAfternoonPeak = decimalHour >= 14.0 && decimalHour <= 16.0;

    if (inMorningPeak || inAfternoonPeak) {
      const baseProb = isPeakDay ? 94 : 86;
      return {
        status: 'OPTIMAL_WINDOW',
        statusLabel: '🔥 Peak Golden Window',
        badgeColor: 'green',
        probability: baseProb,
        localTime: timeFormatted,
        weekday,
        canCallNow: true,
        reason: inMorningPeak ? 'Morning triage complete; peak executive alertness' : 'Afternoon strategy & review block',
        nextOptimal: 'Call Now (Active Window)'
      };
    }

    // Acceptable Windows: 9:00 - 10:00 AM, 1:30 - 2:00 PM, 4:00 - 5:00 PM
    const inAcceptable = (decimalHour >= 9.0 && decimalHour < 10.0) || 
                         (decimalHour >= 13.5 && decimalHour < 14.0) || 
                         (decimalHour > 16.0 && decimalHour <= 17.0);

    if (inAcceptable) {
      const baseProb = isPeakDay ? 74 : 64;
      return {
        status: 'ACCEPTABLE_WINDOW',
        statusLabel: 'Acceptable Window',
        badgeColor: 'yellow',
        probability: baseProb,
        localTime: timeFormatted,
        weekday,
        canCallNow: true,
        reason: 'Decent pickup rate outside peak executive blocks',
        nextOptimal: decimalHour < 14.0 ? 'Today at 2:00 PM (Peak)' : 'Call Now or Tomorrow at 10:00 AM'
      };
    }

    // Shoulder / Suboptimal Windows (8-9 AM or 5-6 PM)
    return {
      status: 'SUBOPTIMAL_WINDOW',
      statusLabel: 'Low Answer Probability',
      badgeColor: 'gray',
      probability: 38,
      localTime: timeFormatted,
      weekday,
      canCallNow: true,
      reason: decimalHour < 9 ? 'Early commute / morning meeting block' : 'End-of-day wrap-up',
      nextOptimal: decimalHour < 9 ? 'Today at 10:00 AM (Peak)' : 'Tomorrow at 10:00 AM (Peak)'
    };
  }

  /**
   * Enrich lead with real-time smart dialing intelligence
   */
  enrichLeadWithSchedule(lead) {
    const timezone = this.resolveTimezone(lead);
    const evaluation = this.evaluateDialWindow(timezone);

    // Compute composite priority score:
    // Probability * (Team Size multiplier) * (Annual Savings factor)
    const teamSizeMultiplier = (lead.teamSize || '').includes('10+') ? 1.5 : 
                               (lead.teamSize || '').includes('5–10') ? 1.3 : 1.0;
    const savingsFactor = Math.min((lead.potentialAnnualSavings || 40000) / 40000, 2.0);
    
    // Priority score normalized roughly 0 - 100
    const priorityScore = Math.round(
      (evaluation.probability * 0.6) + 
      (teamSizeMultiplier * 20) + 
      (savingsFactor * 20)
    );

    return {
      ...lead,
      timezone,
      schedule: {
        ...evaluation,
        priorityScore
      }
    };
  }

  /**
   * Sort leads into a prioritized execution queue
   */
  prioritizeQueue(leads) {
    const enriched = leads.map(lead => this.enrichLeadWithSchedule(lead));

    return enriched.sort((a, b) => {
      // 1. Leads currently in OPTIMAL_WINDOW first
      const aOptimal = a.schedule.status === 'OPTIMAL_WINDOW' ? 1 : 0;
      const bOptimal = b.schedule.status === 'OPTIMAL_WINDOW' ? 1 : 0;
      if (aOptimal !== bOptimal) return bOptimal - aOptimal;

      // 2. Leads that can be called right now
      const aCanCall = a.schedule.canCallNow ? 1 : 0;
      const bCanCall = b.schedule.canCallNow ? 1 : 0;
      if (aCanCall !== bCanCall) return bCanCall - aCanCall;

      // 3. Highest priority score
      return b.schedule.priorityScore - a.schedule.priorityScore;
    });
  }

  /**
   * Get current regional clocks for global awareness
   */
  getRegionalClocks() {
    const regions = [
      { code: 'PST', label: 'US Pacific', tz: 'America/Los_Angeles' },
      { code: 'MST', label: 'US Mountain', tz: 'America/Denver' },
      { code: 'CST', label: 'US Central', tz: 'America/Chicago' },
      { code: 'EST', label: 'US Eastern', tz: 'America/New_York' },
      { code: 'GMT', label: 'UK London', tz: 'Europe/London' },
      { code: 'CET', label: 'Europe (Paris/Berlin)', tz: 'Europe/Paris' },
      { code: 'AEST', label: 'Australia (Sydney)', tz: 'Australia/Sydney' }
    ];

    return regions.map(reg => {
      const zdt = this.getZonedDateTime(reg.tz);
      const evalResult = this.evaluateDialWindow(reg.tz);
      return {
        ...reg,
        time: zdt.timeFormatted,
        weekday: zdt.weekday,
        status: evalResult.status,
        statusLabel: evalResult.statusLabel,
        badgeColor: evalResult.badgeColor
      };
    });
  }
}

export const smartSchedulerService = new SmartSchedulerService();
