import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const CALL_LOGS_PATH = path.join(DATA_DIR, 'call_logs.json');

class CRMService {
  constructor() {
    this.logs = [];
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(CALL_LOGS_PATH)) {
        const data = fs.readFileSync(CALL_LOGS_PATH, 'utf-8');
        this.logs = JSON.parse(data);
      } else {
        this.logs = [];
        fs.writeFileSync(CALL_LOGS_PATH, JSON.stringify([], null, 2));
      }
    } catch (err) {
      console.error('[CRMService] Error initializing CRM logs:', err);
      this.logs = [];
    }
  }

  saveCallLog(logEntry) {
    this.logs.unshift(logEntry);
    try {
      fs.writeFileSync(CALL_LOGS_PATH, JSON.stringify(this.logs, null, 2));
      console.log(`[CRMService] Saved call log for ${logEntry.agencyName} (Score: ${logEntry.totalBantScore}/100)`);
    } catch (err) {
      console.error('[CRMService] Failed to save call log:', err);
    }
    return logEntry;
  }

  getAllLogs() {
    return this.logs;
  }

  getLogsByLeadId(leadId) {
    return this.logs.filter(log => log.leadId === leadId);
  }
}

export const crmService = new CRMService();
