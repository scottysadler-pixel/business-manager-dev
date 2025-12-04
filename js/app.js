import * as auth from './auth.js';
import * as storage from './storage.js';
import * as dashboard from './dashboard.js';
import * as quotes from './quotes.js';
import * as invoices from './invoices.js';
import * as expenses from './expenses.js';
import * as travel from './travel.js';
import * as notes from './notes.js';
import * as contacts from './contacts.js';
import * as settings from './settings.js';
import * as autoBackup from './auto-backup.js';

console.log('[App] Starting Business Manager...');

function initializeApp() {
    console.log('[App] Initializing modules...');
    
    auth.init();
    storage.init();
    dashboard.init();
    quotes.init();
    invoices.init();
    expenses.init();
    travel.init();
    notes.init();
    contacts.init();
    settings.init();
    autoBackup.init();
    
    console.log('[App] All modules initialized');
}

// Tab navigation
function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn:not(#logoutBtn)');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            if (!tabName) return;
            
            // Update active states
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabContents.forEach(tab => tab.classList.remove('active'));
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
                
                // Dispatch tab changed event
                window.dispatchEvent(new CustomEvent('tabChanged', {
                    detail: { tab: tabName }
                }));
            }
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        setupTabNavigation();
    });
} else {
    initializeApp();
    setupTabNavigation();
}

console.log('[App] Setup complete');