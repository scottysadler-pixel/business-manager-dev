import * as storage from './storage.js';
import { formatCurrency, isInvoiceOverdue } from './utils.js';
import { CONFIG } from './config.js';

export function init() {
    console.log('[Dashboard] Initializing...');
    
    window.addEventListener('dataLoaded', async (e) => {
        await render(e.detail);
    });
    
    window.addEventListener('dataRefresh', async () => {
        await refresh();
    });
    
    window.addEventListener('tabChanged', async (e) => {
        if (e.detail.tab === 'dashboard') {
            await refresh();
        }
    });
}

async function refresh() {
    try {
        const data = {
            invoices: await storage.getInvoices(),
            quotes: await storage.getQuotes(),
            expenses: await storage.getExpenses(),
            travelLogs: await storage.getTravelLogs()
        };
        await render(data);
    } catch (error) {
        console.error('[Dashboard] Error refreshing:', error);
        await render({
            invoices: [],
            quotes: [],
            expenses: [],
            travelLogs: []
        });
    }
}

async function render(data) {
    const { invoices = [], quotes = [], expenses = [], travelLogs = [] } = data;
    
    // Render business header with logo
    await renderBusinessHeader();
    
    renderFinancialSummary(invoices, expenses);
    renderTravelSummary(travelLogs);
}

async function renderBusinessHeader() {
    const container = document.getElementById('dashboardHeader');
    
    if (!container) {
        console.error('[Dashboard] dashboardHeader element not found');
        return;
    }
    
    try {
        const profile = await storage.getBusinessProfile();
        
        if (profile && (profile.logoDataUrl || profile.businessName)) {
            container.innerHTML = `
                <div class="dashboard-business-info">
                    ${profile.logoDataUrl ? `<img src="${profile.logoDataUrl}" alt="Business Logo" class="dashboard-logo">` : ''}
                    ${profile.businessName ? `<h2 class="dashboard-business-name">${profile.businessName}</h2>` : ''}
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    } catch (error) {
        console.error('[Dashboard] Error loading business profile:', error);
        container.innerHTML = '';
    }
}

function renderFinancialSummary(invoices, expenses) {
    const container = document.getElementById('financialSummary');
    
    if (!container) {
        console.error('[Dashboard] financialSummary element not found');
        return;
    }
    
    // Calculate totals
    const totalPaid = invoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const totalOutstanding = invoices
        .filter(inv => inv.status !== 'Paid')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const overdueInvoices = invoices.filter(inv => isInvoiceOverdue(inv));
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const overdueCount = overdueInvoices.length;
    
    const unpaidCount = invoices.filter(inv => inv.status !== 'Paid').length;
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    const netIncome = totalPaid - totalExpenses;
    
    container.innerHTML = `
        <div class="stat">
            <span class="stat-label">Total Paid:</span>
            <span class="stat-value">${formatCurrency(totalPaid)}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Outstanding:</span>
            <span class="stat-value">${formatCurrency(totalOutstanding)}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Unpaid Count:</span>
            <span class="stat-value">${unpaidCount}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Overdue Amount:</span>
            <span class="stat-value ${overdueAmount > 0 ? 'warning' : ''}">${formatCurrency(overdueAmount)}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Overdue Count:</span>
            <span class="stat-value ${overdueCount > 0 ? 'warning' : ''}">${overdueCount}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Total Expenses:</span>
            <span class="stat-value">${formatCurrency(totalExpenses)}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Net Income:</span>
            <span class="stat-value highlight">${formatCurrency(netIncome)}</span>
        </div>
    `;
}

function renderTravelSummary(travelLogs) {
    const container = document.getElementById('travelSummary');
    
    if (!container) {
        console.error('[Dashboard] travelSummary element not found');
        return;
    }
    
    // Calculate totals
    const totalKms = travelLogs.reduce((sum, log) => {
        const distance = log.distance || log.kms || log.km || 0;
        return sum + distance;
    }, 0);
    
    const taxDeduction = totalKms * CONFIG.TRAVEL_DEDUCTION_RATE;
    
    container.innerHTML = `
        <div class="stat">
            <span class="stat-label">Total KMs:</span>
            <span class="stat-value">${totalKms.toFixed(1)}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Tax Deduction:</span>
            <span class="stat-value highlight">${formatCurrency(taxDeduction)}</span>
        </div>
    `;
}