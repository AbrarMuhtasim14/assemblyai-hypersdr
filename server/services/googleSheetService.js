import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { googleCalendarService } from './googleCalendarService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYNC_CACHE_FILE = path.resolve(__dirname, '../../data/sheet_sync_cache.json');

/**
 * Robust CSV parser that handles quotes and embedded commas
 */
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentToken.trim());
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

export class GoogleSheetService {
  constructor() {
    this.sheetUrl = process.env.GOOGLE_SHEET_CSV_URL || '';
    this.webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || '';
    this.lastSyncTime = null;
    this.syncStatus = 'idle';
    this.syncedRowCount = 0;
    this.loadCache();
  }

  loadCache() {
    try {
      if (fs.existsSync(SYNC_CACHE_FILE)) {
        const raw = fs.readFileSync(SYNC_CACHE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.lastSyncTime = data.lastSyncTime || null;
        this.syncedRowCount = data.syncedRowCount || 0;
        this.sheetUrl = data.sheetUrl || this.sheetUrl;
      }
    } catch (e) {
      console.warn('[GoogleSheetService] Could not load sync cache:', e.message);
    }
  }

  saveCache() {
    try {
      const data = {
        lastSyncTime: this.lastSyncTime,
        syncedRowCount: this.syncedRowCount,
        sheetUrl: this.sheetUrl
      };
      const dir = path.dirname(SYNC_CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SYNC_CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.warn('[GoogleSheetService] Could not save sync cache:', e.message);
    }
  }

  setSheetUrl(url) {
    this.sheetUrl = url;
    this.saveCache();
  }

  /**
   * Sync hotel leads dynamically from Google Sheet (Real-Time API v4 with Zero Cache)
   */
  async fetchFromPublishedSheet(customUrl = null) {
    // METHOD 1: Direct Google Sheets API v4 via OAuth 2.0 (100% Live, Zero Edge Caching)
    if (googleCalendarService.isAuthenticated) {
      try {
        this.syncStatus = 'syncing';
        const spreadsheetId = this.getSpreadsheetId();
        const sheets = google.sheets({ version: 'v4', auth: googleCalendarService.oauth2Client });
        
        console.log(`[GoogleSheetService] Fetching LIVE real-time leads via Google Sheets API v4 (Spreadsheet ID: ${spreadsheetId})...`);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'A1:U'
        });

        const rows = res.data.values;
        if (rows && rows.length >= 2) {
          const headers = rows[0].map(h => (h || '').toString().trim());
          const rawLeads = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || !row[0]) continue;

            const rawObj = {};
            headers.forEach((h, idx) => {
              rawObj[h] = row[idx] !== undefined ? row[idx].toString().trim() : '';
            });

            rawLeads.push(rawObj);
          }

          this.lastSyncTime = new Date().toISOString();
          this.syncedRowCount = rawLeads.length;
          this.syncStatus = 'synced';
          this.saveCache();

          console.log(`[GoogleSheetService] Successfully fetched ${rawLeads.length} live leads directly via Sheets API v4!`);
          return {
            success: true,
            totalFetched: rawLeads.length,
            headers,
            rawLeads,
            syncedAt: this.lastSyncTime,
            method: 'google_sheets_api_v4_live'
          };
        }
      } catch (apiErr) {
        console.warn('[GoogleSheetService] Sheets API v4 direct read error, falling back to CSV fetch:', apiErr.message);
      }
    }

    // METHOD 2: HTTP CSV Fetch (Fallback)
    let targetUrl = customUrl || this.sheetUrl;
    if (!targetUrl) {
      return { success: false, error: 'No Google Sheet CSV URL configured' };
    }

    const separator = targetUrl.includes('?') ? '&' : '?';
    const freshUrl = `${targetUrl}${separator}_t=${Date.now()}`;

    try {
      this.syncStatus = 'syncing';
      console.log(`[GoogleSheetService] Fetching dynamic hotel leads from Google Sheet: ${freshUrl}`);
      
      const response = await fetch(freshUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const rows = parseCSV(csvText);

      if (rows.length < 2) {
        throw new Error('Google Sheet returned empty or invalid CSV content');
      }

      const headers = rows[0].map(h => h.trim());
      const rawLeads = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3 || !row[0]) continue;

        const rawObj = {};
        headers.forEach((h, idx) => {
          rawObj[h] = row[idx] || '';
        });

        rawLeads.push(rawObj);
      }

      this.lastSyncTime = new Date().toISOString();
      this.syncedRowCount = rawLeads.length;
      this.syncStatus = 'synced';
      this.sheetUrl = targetUrl;
      this.saveCache();

      return {
        success: true,
        totalFetched: rawLeads.length,
        headers,
        rawLeads,
        syncedAt: this.lastSyncTime,
        method: 'csv_export_endpoint'
      };
    } catch (err) {
      this.syncStatus = 'error';
      console.error('[GoogleSheetService] Sync failed:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  getSpreadsheetId() {
    const url = process.env.GOOGLE_SHEET_EDIT_URL || process.env.GOOGLE_SHEET_CSV_URL || this.sheetUrl;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '1g7cJF2smRWjYsyOfMkJCFRhKMDgOubrf0XnSgDwZcLE';
  }

  /**
   * Two-Way Sync: Write call disposition, meeting details, and call summary back to Google Sheet
   * Supports BOTH Direct Google Sheets API v4 (via OAuth) AND Apps Script Webhook
   */
  async updateSheetRow(callOutcome) {
    const { leadId, agencyName, disposition, qualificationScore, keyTakeaways, durationSeconds, recordingUrl } = callOutcome;

    console.log(`[GoogleSheetService] Writing call outcome back to Google Sheet database for ${agencyName} (${leadId})...`);

    // METHOD 1: Direct Google Sheets API v4 via OAuth 2.0 (Automatic when Google Account is connected)
    if (googleCalendarService.isAuthenticated) {
      try {
        const spreadsheetId = this.getSpreadsheetId();
        const sheets = google.sheets({ version: 'v4', auth: googleCalendarService.oauth2Client });

        // Fetch headers and lead IDs from sheet
        const getRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'A1:U'
        });

        const rows = getRes.data.values;
        if (rows && rows.length >= 2) {
          const headers = rows[0];
          const colMap = {};
          headers.forEach((h, idx) => {
            colMap[h.trim()] = idx; // 0-indexed column
          });

          let targetRowIndex = -1;
          const idColIdx = colMap['Lead_ID'] !== undefined ? colMap['Lead_ID'] : 0;
          const propColIdx = colMap['Property_Name'] !== undefined ? colMap['Property_Name'] : 1;

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cellId = (row[idColIdx] || '').toString().trim();
            const cellProp = (row[propColIdx] || '').toString().trim().toLowerCase();
            const searchId = (leadId || '').toString().trim();
            const searchProp = (agencyName || '').toString().trim().toLowerCase();

            if ((searchId && cellId === searchId) || (searchProp && cellProp === searchProp)) {
              targetRowIndex = i + 1; // 1-indexed for Sheets range
              break;
            }
          }

          if (targetRowIndex !== -1) {
            const updates = [];
            const setCell = (colName, val) => {
              if (colMap[colName] !== undefined) {
                const colLetter = String.fromCharCode(65 + colMap[colName]);
                updates.push({
                  range: `${colLetter}${targetRowIndex}`,
                  values: [[val]]
                });
              }
            };

            setCell('Call_Status', 'COMPLETED');
            setCell('Outcome', disposition || 'COMPLETED');
            setCell('Meeting_Booked', (disposition || '').toLowerCase().includes('meeting') ? 'YES' : 'NO');
            setCell('Meeting_Slot', callOutcome.meetingDetails ? (callOutcome.meetingDetails.slotLabel || `${callOutcome.meetingDetails.day} @ ${callOutcome.meetingDetails.time}`) : '');
            setCell('Meeting_Meet_Link', callOutcome.meetingDetails ? (callOutcome.meetingDetails.googleMeetLink || '') : '');
            setCell('Call_Summary', keyTakeaways || callOutcome.executiveSummary || '');
            setCell('Last_Call_Timestamp', new Date().toISOString());

            await sheets.spreadsheets.values.batchUpdate({
              spreadsheetId,
              requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updates
              }
            });

            console.log(`[GoogleSheetService] Successfully updated Google Sheet row ${targetRowIndex} via Google Sheets API!`);
            return { liveSynced: true, method: 'google_sheets_api', updatedRow: targetRowIndex };
          } else {
            // If lead not found in existing rows, append a new row to Google Sheet
            const newRow = new Array(headers.length).fill('');
            const setCol = (colName, val) => {
              if (colMap[colName] !== undefined) newRow[colMap[colName]] = val;
            };
            setCol('Lead_ID', leadId || `LEAD-${Date.now()}`);
            setCol('Property_Name', agencyName || 'Direct Prospect');
            setCol('Call_Status', 'COMPLETED');
            setCol('Outcome', disposition || 'COMPLETED');
            setCol('Meeting_Booked', (disposition || '').toLowerCase().includes('meeting') ? 'YES' : 'NO');
            setCol('Meeting_Slot', callOutcome.meetingDetails ? (callOutcome.meetingDetails.slotLabel || `${callOutcome.meetingDetails.day} @ ${callOutcome.meetingDetails.time}`) : '');
            setCol('Meeting_Meet_Link', callOutcome.meetingDetails ? (callOutcome.meetingDetails.googleMeetLink || '') : '');
            setCol('Call_Summary', keyTakeaways || callOutcome.executiveSummary || '');
            setCol('Last_Call_Timestamp', new Date().toISOString());

            const appendRes = await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: 'A1',
              valueInputOption: 'USER_ENTERED',
              insertDataOption: 'INSERT_ROWS',
              requestBody: {
                values: [newRow]
              }
            });

            console.log(`[GoogleSheetService] Appended new row for ${agencyName} to Google Sheet.`);
            return { liveSynced: true, method: 'google_sheets_api_append', details: appendRes.data };
          }
        }
      } catch (apiErr) {
        console.warn('[GoogleSheetService] Google Sheets API write error:', apiErr.message);
      }
    }

    // METHOD 2: Google Apps Script Webhook (Fallback)
    if (this.webhookUrl) {
      try {
        const payload = {
          action: 'UPDATE_CALL_LOG',
          leadId,
          propertyName: agencyName,
          disposition: disposition || 'COMPLETED',
          qualificationScore: qualificationScore || 85,
          meetingBooked: (disposition || '').toLowerCase().includes('meeting') ? 'YES' : 'NO',
          meetingSlot: callOutcome.meetingDetails ? (callOutcome.meetingDetails.slotLabel || `${callOutcome.meetingDetails.day} @ ${callOutcome.meetingDetails.time}`) : '',
          meetingMeetLink: callOutcome.meetingDetails ? callOutcome.meetingDetails.googleMeetLink : '',
          keyTakeaways: keyTakeaways || callOutcome.executiveSummary || '',
          durationSeconds: durationSeconds || 0,
          recordingUrl: recordingUrl || 'N/A',
          timestamp: new Date().toISOString()
        };

        const res = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log(`[GoogleSheetService] Webhook write-back status: ${res.status}`);
        return { liveSynced: true, method: 'apps_script_webhook', status: res.status };
      } catch (e) {
        console.warn(`[GoogleSheetService] Webhook write-back error:`, e.message);
        return { liveSynced: false, error: e.message };
      }
    }

    return {
      liveSynced: false,
      message: 'Logged in memory and persisted to disk. Connect Google Account via OAuth or configure GOOGLE_SHEET_WEBHOOK_URL for live cloud write-back.'
    };
  }

  /**
   * Ready-to-paste Google Apps Script code for 2-Way Google Sheet Database
   */
  getAppsScriptTemplate() {
    return `/**
 * HyperSDR Two-Way Google Sheet Database Synchronizer
 * 
 * Instructions:
 * 1. In your Google Sheet, click Extensions -> Apps Script
 * 2. Paste this code and save.
 * 3. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL into .env as GOOGLE_SHEET_WEBHOOK_URL
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (data.action === "UPDATE_CALL_LOG") {
      var leadId = data.leadId;
      var values = sheet.getDataRange().getValues();
      if (values.length < 2) {
        return ContentService.createTextOutput(JSON.stringify({ status: "empty_sheet" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Dynamic header mapping to eliminate any column offset issues
      var headers = values[0];
      var colMap = {};
      for (var h = 0; h < headers.length; h++) {
        colMap[headers[h].toString().trim()] = h + 1;
      }
      
      var idColIdx = colMap["Lead_ID"] ? (colMap["Lead_ID"] - 1) : 0;
      var propColIdx = colMap["Property_Name"] ? (colMap["Property_Name"] - 1) : 1;
      
      for (var i = 1; i < values.length; i++) {
        var rowId = values[i][idColIdx];
        var rowProp = values[i][propColIdx];
        
        if (rowId == leadId || (data.propertyName && rowProp == data.propertyName)) {
          var row = i + 1;
          
          if (colMap["Call_Status"]) sheet.getRange(row, colMap["Call_Status"]).setValue("COMPLETED");
          if (colMap["Outcome"]) sheet.getRange(row, colMap["Outcome"]).setValue(data.disposition || "COMPLETED");
          if (colMap["Meeting_Booked"]) sheet.getRange(row, colMap["Meeting_Booked"]).setValue(data.meetingBooked || "NO");
          if (colMap["Meeting_Slot"]) sheet.getRange(row, colMap["Meeting_Slot"]).setValue(data.meetingSlot || "");
          if (colMap["Meeting_Meet_Link"]) sheet.getRange(row, colMap["Meeting_Meet_Link"]).setValue(data.meetingMeetLink || "");
          if (colMap["Call_Summary"]) sheet.getRange(row, colMap["Call_Summary"]).setValue(data.keyTakeaways || "");
          if (colMap["Last_Call_Timestamp"]) sheet.getRange(row, colMap["Last_Call_Timestamp"]).setValue(data.timestamp || new Date().toISOString());
          
          return ContentService.createTextOutput(JSON.stringify({ 
            status: "success", 
            message: "Google Sheet updated for " + (leadId || rowProp),
            updatedRow: row 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "not_found", leadId: data.leadId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Triggered automatically when user adds or edits a row in Google Sheet
 * Forwards newly added leads into HyperSDR's Priority Dialing Queue
 */
function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var row = e.range.getRow();
    if (row <= 1) return; // Header row
    
    var rowValues = sheet.getRange(row, 1, 1, 12).getValues()[0];
    var leadId = rowValues[0];
    var propertyName = rowValues[1];
    var decisionMaker = rowValues[2];
    var email = rowValues[4];
    var phone = rowValues[5];
    var timezone = rowValues[6];
    
    if (!leadId || !propertyName) return;

    var payload = {
      Lead_ID: leadId,
      Property_Name: propertyName,
      Decision_Maker_Name: decisionMaker,
      Direct_Email: email,
      Verified_Phone: phone,
      Recipient_Timezone: timezone || "America/New_York",
      City: rowValues[7] || "",
      State: rowValues[8] || ""
    };
    
    // Change this to your deployed HyperSDR URL (or ngrok/tunnel during local dev)
    var hypersdrUrl = "http://localhost:3000/api/leads/webhook";
    
    UrlFetchApp.fetch(hypersdrUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("onEdit webhook error: " + err);
  }
}
`;
  }

  getStatus() {
    return {
      sheetUrl: this.sheetUrl,
      webhookConfigured: !!this.webhookUrl,
      lastSyncTime: this.lastSyncTime,
      syncedRowCount: this.syncedRowCount,
      syncStatus: this.syncStatus
    };
  }
}

export const googleSheetService = new GoogleSheetService();
