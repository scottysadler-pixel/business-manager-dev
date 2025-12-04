import * as storage from './storage.js';
import { downloadJSON } from './utils.js';

const BACKUP_INTERVAL_DAYS = 1; // Daily backups
const LAST_BACKUP_KEY = 'lastAutoBackup';

export function init() {
    console.log('[Auto Backup] Initializing...');
    
    // Check if backup is needed on app start
    window.addEventListener('userLoggedIn', checkAndBackup);
}

async function checkAndBackup() {
    try {
        const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
        const now = Date.now();
        
        if (!lastBackup) {
            // First time - set the timestamp but don't backup yet
            localStorage.setItem(LAST_BACKUP_KEY, now.toString());
            return;
        }
        
        const daysSinceBackup = (now - parseInt(lastBackup)) / (1000 * 60 * 60 * 24);
        
        if (daysSinceBackup >= BACKUP_INTERVAL_DAYS) {
            await performBackup();
            localStorage.setItem(LAST_BACKUP_KEY, now.toString());
        }
    } catch (error) {
        console.error('[Auto Backup] Error:', error);
    }
}

async function performBackup() {
    try {
        const data = {
            exportDate: new Date().toISOString(),
            quotes: await storage.getQuotes(),
            invoices: await storage.getInvoices(),
            expenses: await storage.getExpenses(),
            travelLogs: await storage.getTravelLogs(),
            jobNotes: await storage.getJobNotes(),
            contacts: await storage.getContacts(),
            businessProfile: await storage.getBusinessProfile()
        };
        
        const date = new Date().toISOString().split('T')[0];
        const filename = `business-manager-backup-${date}.json`;
        
        // Automatically download backup
        downloadJSON(data, filename);
        
        console.log(`[Auto Backup] Backup created: ${filename}`);
    } catch (error) {
        console.error('[Auto Backup] Failed to create backup:', error);
    }
}