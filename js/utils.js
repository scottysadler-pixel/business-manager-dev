import { CONFIG } from './config.js';

/**
 * Format a number as currency
 */
export function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat(CONFIG.CURRENCY.locale, {
        style: 'currency',
        currency: CONFIG.CURRENCY.code
    }).format(num);
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    return new Intl.DateTimeFormat(CONFIG.CURRENCY.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayString() {
    return formatDateInput(new Date());
}

/**
 * Get date in X days as YYYY-MM-DD
 */
export function getDateInDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return formatDateInput(date);
}

/**
 * Check if an invoice is overdue
 */
export function isInvoiceOverdue(invoice) {
    if (invoice.status === 'Paid') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
}

/**
 * Check if a quote is expired
 */
export function isQuoteExpired(quote) {
    if (quote.status === 'Accepted' || quote.status === 'Rejected') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validUntil = new Date(quote.validUntil);
    validUntil.setHours(0, 0, 0, 0);
    return validUntil < today;
}

/**
 * Check if a quote is expiring soon (within 7 days)
 */
export function isQuoteExpiringSoon(quote) {
    if (quote.status === 'Accepted' || quote.status === 'Rejected') return false;
    if (isQuoteExpired(quote)) return false; // Already expired
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validUntil = new Date(quote.validUntil);
    validUntil.setHours(0, 0, 0, 0);
    
    const daysUntilExpiry = Math.floor((validUntil - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
}

/**
 * Calculate totals from line items and tax rate
 */
export function calculateTotal(lineItems, taxRate, gstInclusive = false) {
    const subtotalCalc = lineItems.reduce((sum, item) => {
        const qty = parseFloat(item.qty) || 0;
        const price = parseFloat(item.price) || 0;
        return sum + (qty * price);
    }, 0);
    
    let subtotal, taxAmount, total;
    
    if (gstInclusive) {
        // Prices include GST - calculate backwards
        const totalInc = subtotalCalc;
        const taxMultiplier = 1 + (taxRate / 100);
        subtotal = totalInc / taxMultiplier;
        taxAmount = totalInc - subtotal;
        total = totalInc;
    } else {
        // Prices are exclusive - calculate forwards
        subtotal = subtotalCalc;
        taxAmount = subtotal * (taxRate / 100);
        total = subtotal + taxAmount;
    }
    
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100
    };
}

/**
 * Generate unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Download data as CSV
 */
export function downloadCSV(data, filename, headers) {
    if (!data || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    // Build CSV content
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') ? `"${escaped}"` : escaped;
        });
        csv += values.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filename}`, 'success');
}

/**
 * Download object as JSON
 */
export function downloadJSON(obj, filename) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Downloaded ${filename}`, 'success');
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show confirm dialog
 */
export function showConfirm(message) {
    return window.confirm(message);
}

/**
 * Show prompt dialog
 */
export function showPrompt(message, defaultValue = '') {
    return window.prompt(message, defaultValue);
}

/**
 * Read file as data URL
 */
export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Show modal
 */
export function showModal(title, content, buttons = []) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
        <h3>${title}</h3>
        <button class="modal-close">&times;</button>
    `;
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
        body.innerHTML = content;
    } else {
        body.appendChild(content);
    }
    
    // ALWAYS create footer, even if buttons array is empty
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    buttons.forEach(btn => footer.appendChild(btn));
    
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer); // Always append footer
    
    overlay.appendChild(modal);
    container.appendChild(overlay);
    
    // Close handlers
    const close = () => {
        overlay.remove();
    };
    
    header.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    
    return { close, modal, body, footer };
}