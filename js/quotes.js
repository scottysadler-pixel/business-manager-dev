import * as storage from './storage.js';
import { 
    formatCurrency, 
    formatDate, 
    formatDateInput,
    getTodayString,
    getDateInDays,
    calculateTotal,
    generateId,
    showToast,
    downloadCSV,
    isQuoteExpired,
    isQuoteExpiringSoon
} from './utils.js';
import { showModal, showConfirm } from './modal.js';
import { CONFIG } from './config.js';

let quotes = [];
let currentQuote = null;

export function init() {
    console.log('[Quotes] Initializing...');
    
    window.addEventListener('dataLoaded', async (e) => {
        quotes = e.detail.quotes || [];
        await render();
    });
    
    window.addEventListener('dataRefresh', async () => {
        await refresh();
    });
    
    window.addEventListener('tabChanged', async (e) => {
        if (e.detail.tab === 'quotes') {
            await refresh();
        }
    });
    
    document.getElementById('newQuoteBtn').addEventListener('click', () => openQuoteModal());
    document.getElementById('exportQuotesCSV').addEventListener('click', exportCSV);
    
    document.addEventListener('click', handleQuoteActions);
}

async function refresh() {
    try {
        quotes = await storage.getQuotes();
        await render();
    } catch (error) {
        console.error('[Quotes] Error refreshing:', error);
        quotes = [];
        render();
    }
}

function handleQuoteActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (!action || !id) return;
    
    switch(action) {
        case 'view-quote':
            viewQuote(id);
            break;
        case 'edit-quote':
            editQuote(id);
            break;
        case 'print-quote':
            printQuote(id);
            break;
        case 'convert-to-invoice':
            convertToInvoice(id);
            break;
        case 'delete-quote':
            deleteQuote(id);
            break;
    }
}

async function render() {
    const container = document.getElementById('quotesList');
    
    if (!Array.isArray(quotes) || quotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No quotes yet</div>
                <p>Create your first quote to get started</p>
            </div>
        `;
        return;
    }
    
    const sorted = [...quotes].sort((a, b) => b.quoteNumber - a.quoteNumber);
    
    container.innerHTML = sorted.map(quote => {
        const expired = isQuoteExpired(quote);
        const expiringSoon = isQuoteExpiringSoon(quote);
        const cssClass = expired ? 'expired' : (expiringSoon ? 'expiring-soon' : '');
        
        return `
        <div class="data-item ${cssClass}">
            <div class="data-item-content">
                <div class="data-item-title">
                    Quote #${quote.quoteNumber} - ${quote.customerName}
                    ${quote.jobDescription ? `<span style="color: #64748b; font-weight: 400;"> - ${quote.jobDescription}</span>` : ''}
                </div>
                <div class="data-item-meta">
                    <span>Date: ${formatDate(quote.quoteDate)}</span>
                    <span>Valid Until: ${formatDate(quote.validUntil)}</span>
                    <span>Total: ${formatCurrency(quote.totalAmount)}</span>
                    <span class="status-badge ${quote.status.toLowerCase()}">${quote.status}</span>
                    ${expired ? '<span class="expired-badge">⚠️ EXPIRED</span>' : ''}
                    ${expiringSoon ? '<span class="expiring-soon-badge">⏰ Expiring Soon</span>' : ''}
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-small btn-secondary" data-action="view-quote" data-id="${quote.id}">View</button>
                <button class="btn btn-small btn-primary" data-action="edit-quote" data-id="${quote.id}">Edit</button>
                <button class="btn btn-small btn-secondary" data-action="print-quote" data-id="${quote.id}">Print</button>
                <button class="btn btn-small btn-success" data-action="convert-to-invoice" data-id="${quote.id}">→ Invoice</button>
                <button class="btn btn-small btn-danger" data-action="delete-quote" data-id="${quote.id}">Delete</button>
            </div>
        </div>
    `;
    }).join('');
}

function openQuoteModal(quote = null) {
    currentQuote = quote;
    
    const isEdit = !!quote;
    const title = isEdit ? `Edit Quote #${quote.quoteNumber}` : 'New Quote';
    
    const formData = quote || {
        customerName: '',
        customerEmail: '',
        customerAddress: '',
        jobDescription: '',
        quoteDate: getTodayString(),
        validUntil: getDateInDays(CONFIG.QUOTE_VALIDITY_DAYS),
        lineItems: [{ description: '', qty: 1, price: 0, itemTotal: 0 }],
        taxRate: CONFIG.DEFAULT_TAX_RATE,
        gstInclusive: true,
        status: 'Draft'
    };
    
    if (!formData.hasOwnProperty('gstInclusive')) {
        formData.gstInclusive = true;
    }
    
    const form = createQuoteForm(formData);
    
    showModal(form, {
        title: title,
        className: 'modal-large',
        buttons: [
            {
                text: 'Cancel',
                primary: false,
                onClick: () => {}
            },
            {
                text: '🖨️ Print',
                primary: false,
                onClick: async () => {
                    const saved = await saveQuote(form, false);
                    if (saved && saved.id) {
                        setTimeout(() => printQuote(saved.id), 100);
                    }
                }
            },
            {
                text: '💾 Save Quote',
                primary: true,
                onClick: async () => {
                    await saveQuote(form, true);
                }
            }
        ]
    });
    
    setTimeout(() => {
        setupFormEvents(form);
    }, 100);
}

function createQuoteForm(data) {
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group-inline">
            <div class="form-group">
                <label for="quoteDate">Quote Date *</label>
                <input type="date" id="quoteDate" name="quoteDate" value="${data.quoteDate}" required>
            </div>
            <div class="form-group">
                <label for="validUntil">Valid Until *</label>
                <input type="date" id="validUntil" name="validUntil" value="${data.validUntil}" required>
            </div>
            <div class="form-group">
                <label for="quoteStatus">Status</label>
                <select id="quoteStatus" name="status">
                    <option value="Draft" ${data.status === 'Draft' ? 'selected' : ''}>Draft</option>
                    <option value="Sent" ${data.status === 'Sent' ? 'selected' : ''}>Sent</option>
                    <option value="Accepted" ${data.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                    <option value="Rejected" ${data.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
        </div>
        
        <div class="form-group">
            <label for="customerName">Customer Name *</label>
            <input type="text" id="customerName" name="customerName" value="${data.customerName}" required>
        </div>
        
        <div class="form-group">
            <label for="jobDescription">Job/Project Description</label>
            <input type="text" id="jobDescription" name="jobDescription" value="${data.jobDescription || ''}" placeholder="e.g., Kitchen renovation, Website development, etc.">
        </div>
        
        <div class="form-group-inline">
            <div class="form-group">
                <label for="customerEmail">Email</label>
                <input type="email" id="customerEmail" name="customerEmail" value="${data.customerEmail || ''}">
            </div>
            <div class="form-group">
                <label for="customerAddress">Address</label>
                <input type="text" id="customerAddress" name="customerAddress" value="${data.customerAddress || ''}">
            </div>
        </div>
        
        <div style="background: #f0f9ff; padding: 0.75rem; border-radius: 0.375rem; margin-bottom: 1rem; border-left: 4px solid #2563eb;">
            <strong>ℹ️ All prices include GST (${data.taxRate}%)</strong>
        </div>
        
        <input type="hidden" id="taxRate" value="${data.taxRate}">
        <input type="hidden" id="gstInclusive" value="true">
        
        <div class="line-items-container">
            <label>Line Items *</label>
            <div id="lineItemsContainer"></div>
            <button type="button" class="btn btn-secondary btn-small add-line-btn" id="addLineBtn">Add Line Item</button>
        </div>
        
        <div class="totals-summary" id="totalsSummary"></div>
    `;
    
    form._initialLineItems = data.lineItems;
    
    return form;
}

function setupFormEvents(form) {
    if (form._initialLineItems) {
        renderLineItems(form._initialLineItems);
        updateTotals();
    }
    
    const addBtn = form.querySelector('#addLineBtn');
    
    if (addBtn) {
        addBtn.addEventListener('click', addLineItem);
    }
}

function renderLineItems(items) {
    const container = document.querySelector('#lineItemsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="line-items">
            <div class="line-item line-item-header">
                <div>Description</div>
                <div>Qty</div>
                <div>Price (inc GST)</div>
                <div>Total</div>
                <div></div>
            </div>
            ${items.map((item, index) => `
                <div class="line-item" data-index="${index}">
                    <input type="text" class="line-desc" value="${item.description}" placeholder="Description">
                    <input type="number" class="line-qty" value="${item.qty}" min="0" step="0.01">
                    <input type="number" class="line-price" value="${item.price}" min="0" step="0.01">
                    <div class="line-item-total">${formatCurrency(item.qty * item.price)}</div>
                    <button type="button" class="remove-line-btn" data-index="${index}">×</button>
                </div>
            `).join('')}
        </div>
    `;
    
    container.querySelectorAll('.line-item:not(.line-item-header)').forEach(row => {
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', updateLineTotal);
        });
    });
    
    container.querySelectorAll('.remove-line-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeLineItem(index);
        });
    });
}

function addLineItem() {
    const items = getLineItems();
    items.push({ description: '', qty: 1, price: 0, itemTotal: 0 });
    renderLineItems(items);
    updateTotals();
}

function removeLineItem(index) {
    const items = getLineItems();
    items.splice(index, 1);
    if (items.length === 0) {
        items.push({ description: '', qty: 1, price: 0, itemTotal: 0 });
    }
    renderLineItems(items);
    updateTotals();
}

function updateLineTotal(e) {
    const row = e.target.closest('.line-item');
    if (!row) return;
    
    const qty = parseFloat(row.querySelector('.line-qty').value) || 0;
    const price = parseFloat(row.querySelector('.line-price').value) || 0;
    const total = qty * price;
    
    const totalEl = row.querySelector('.line-item-total');
    if (totalEl) {
        totalEl.textContent = formatCurrency(total);
    }
    
    updateTotals();
}

function getLineItems() {
    const rows = document.querySelectorAll('.line-item:not(.line-item-header)');
    return Array.from(rows).map(row => {
        const desc = row.querySelector('.line-desc')?.value || '';
        const qty = parseFloat(row.querySelector('.line-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.line-price')?.value) || 0;
        return {
            description: desc,
            qty,
            price,
            itemTotal: qty * price
        };
    });
}

function updateTotals() {
    const lineItems = getLineItems();
    const taxRate = parseFloat(document.querySelector('#taxRate')?.value) || CONFIG.DEFAULT_TAX_RATE;
    
    const { subtotal, taxAmount, total } = calculateTotal(lineItems, taxRate, true);
    
    const summaryDiv = document.querySelector('#totalsSummary');
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div class="totals-row total">
                <span>TOTAL (inc GST):</span>
                <span>${formatCurrency(total)}</span>
            </div>
        `;
    }
}

async function saveQuote(form, shouldClose = true) {
    const lineItems = getLineItems();
    
    const customerName = form.querySelector('#customerName')?.value.trim();
    if (!customerName) {
        showToast('Customer name is required', 'error');
        return null;
    }
    
    if (lineItems.length === 0 || lineItems.every(item => !item.description)) {
        showToast('At least one line item is required', 'error');
        return null;
    }
    
    const taxRate = parseFloat(form.querySelector('#taxRate')?.value) || CONFIG.DEFAULT_TAX_RATE;
    const { subtotal, taxAmount, total } = calculateTotal(lineItems, taxRate, true);
    
    const quoteData = {
        id: currentQuote?.id || generateId(),
        quoteNumber: currentQuote?.quoteNumber || await storage.getNextQuoteNumber(),
        quoteDate: form.querySelector('#quoteDate')?.value,
        validUntil: form.querySelector('#validUntil')?.value,
        customerName: form.querySelector('#customerName')?.value,
        jobDescription: form.querySelector('#jobDescription')?.value || '',
        customerEmail: form.querySelector('#customerEmail')?.value || '',
        customerAddress: form.querySelector('#customerAddress')?.value || '',
        lineItems,
        taxRate,
        gstInclusive: true,
        subtotal,
        taxAmount,
        totalAmount: total,
        status: form.querySelector('#quoteStatus')?.value || 'Draft'
    };
    
    try {
        await storage.saveQuote(quoteData);
        currentQuote = quoteData;
        
        // Auto-add customer to contacts if email provided
        if (quoteData.customerEmail) {
            const wasAdded = await storage.addContactIfNotExists({
                name: quoteData.customerName,
                email: quoteData.customerEmail,
                phone: '',
                address: quoteData.customerAddress
            });
            if (wasAdded) {
                showToast('Customer added to contacts', 'info');
            }
        }
        
        showToast(quoteData.quoteNumber ? 'Quote saved' : 'Quote created', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        
        return quoteData;
    } catch (error) {
        showToast('Error saving quote', 'error');
        console.error(error);
        return null;
    }
}

function viewQuote(id) {
    const quote = quotes.find(q => q.id === id);
    if (!quote) return;
    
    const content = `
        <div class="quote-view">
            <p><strong>Customer:</strong> ${quote.customerName}</p>
            ${quote.jobDescription ? `<p><strong>Job:</strong> ${quote.jobDescription}</p>` : ''}
            <p><strong>Email:</strong> ${quote.customerEmail || 'N/A'}</p>
            <p><strong>Address:</strong> ${quote.customerAddress || 'N/A'}</p>
            <p><strong>Quote Date:</strong> ${formatDate(quote.quoteDate)}</p>
            <p><strong>Valid Until:</strong> ${formatDate(quote.validUntil)}</p>
            <p><strong>Status:</strong> <span class="status-badge ${quote.status.toLowerCase()}">${quote.status}</span></p>
            
            <h4>Line Items</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="border: 1px solid #ccc; padding: 0.5rem; text-align: left;">Description</th>
                        <th style="border: 1px solid #ccc; padding: 0.5rem; text-align: right;">Qty</th>
                        <th style="border: 1px solid #ccc; padding: 0.5rem; text-align: right;">Price</th>
                        <th style="border: 1px solid #ccc; padding: 0.5rem; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${quote.lineItems.map(item => `
                        <tr>
                            <td style="border: 1px solid #ccc; padding: 0.5rem;">${item.description}</td>
                            <td style="border: 1px solid #ccc; padding: 0.5rem; text-align: right;">${item.qty}</td>
                            <td style="border: 1px solid #ccc; padding: 0.5rem; text-align: right;">${formatCurrency(item.price)}</td>
                            <td style="border: 1px solid #ccc; padding: 0.5rem; text-align: right;">${formatCurrency(item.itemTotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 1rem; text-align: right;">
                <p style="font-size: 1.2rem;"><strong>TOTAL (inc GST):</strong> ${formatCurrency(quote.totalAmount)}</p>
            </div>
        </div>
    `;
    
    showModal(content, {
        title: `Quote #${quote.quoteNumber}`,
        buttons: [{ text: 'Close', primary: false }]
    });
}

function editQuote(id) {
    const quote = quotes.find(q => q.id === id);
    if (!quote) return;
    openQuoteModal(quote);
}

async function deleteQuote(id) {
    const confirmed = await showConfirm('Are you sure you want to delete this quote?');
    if (!confirmed) return;
    
    try {
        await storage.deleteQuote(id);
        showToast('Quote deleted', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error deleting quote', 'error');
        console.error(error);
    }
}

async function convertToInvoice(id) {
    const quote = quotes.find(q => q.id === id);
    if (!quote) return;
    
    const confirmed = await showConfirm('Convert this quote to an invoice?');
    if (!confirmed) return;
    
    try {
        const invoiceData = {
            id: generateId(),
            invoiceNumber: await storage.getNextInvoiceNumber(),
            invoiceDate: getTodayString(),
            dueDate: getDateInDays(CONFIG.INVOICE_PAYMENT_TERMS),
            customerName: quote.customerName,
            jobDescription: quote.jobDescription || '',
            customerEmail: quote.customerEmail || '',
            customerAddress: quote.customerAddress || '',
            lineItems: quote.lineItems,
            taxRate: quote.taxRate,
            gstInclusive: quote.gstInclusive,
            subtotal: quote.subtotal,
            taxAmount: quote.taxAmount,
            totalAmount: quote.totalAmount,
            status: 'Draft'
        };
        
        await storage.saveInvoice(invoiceData);
        
        quote.status = 'Accepted';
        await storage.saveQuote(quote);
        
        showToast('Quote converted to invoice', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        
    } catch (error) {
        showToast('Error converting quote', 'error');
        console.error(error);
    }
}

async function printQuote(id) {
    const quote = quotes.find(q => q.id === id);
    if (!quote) return;
    
    const profile = await storage.getBusinessProfile();
    
    const originalTitle = document.title;
    document.title = `Quote-${quote.quoteNumber}`;
    
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div class="print-content">
            <div class="print-header">
                <div>
                    ${profile.logoDataUrl ? `<div class="print-logo"><img src="${profile.logoDataUrl}" alt="Logo"></div>` : ''}
                </div>
                <div class="print-business-info">
                    <div><strong style="font-size: 1.2rem;">${profile.businessName || 'Your Business'}</strong></div>
                    <div>${profile.address || ''}</div>
                    <div>${profile.phone || ''}</div>
                    <div>${profile.email || ''}</div>
                    <div>ABN: ${profile.abn || ''}</div>
                </div>
            </div>
            
            <h1 class="print-title">QUOTE #${quote.quoteNumber}</h1>
            ${quote.jobDescription ? `<p style="font-size: 1.1rem; margin-bottom: 1rem;"><strong>Re:</strong> ${quote.jobDescription}</p>` : ''}
            
            <div class="print-details">
                <div>
                    <strong>To:</strong><br>
                    ${quote.customerName}<br>
                    ${quote.customerEmail ? quote.customerEmail + '<br>' : ''}
                    ${quote.customerAddress ? quote.customerAddress.replace(/\n/g, '<br>') : ''}
                </div>
                <div>
                    <strong>Quote Date:</strong> ${formatDate(quote.quoteDate)}<br>
                    <strong>Valid Until:</strong> ${formatDate(quote.validUntil)}<br>
                    <strong>Status:</strong> ${quote.status}
                </div>
            </div>
            
            <div class="print-line-items">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Price (inc GST)</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${quote.lineItems.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td>${item.qty}</td>
                                <td>${formatCurrency(item.price)}</td>
                                <td>${formatCurrency(item.itemTotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="print-totals">
                <div class="print-totals-row total">
                    <span>TOTAL (inc GST ${quote.taxRate}%):</span>
                    <span>${formatCurrency(quote.totalAmount)}</span>
                </div>
            </div>
            
            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ccc;">
                <p>This quote is valid until ${formatDate(quote.validUntil)}</p>
                ${profile.bankName ? `
                    <div style="margin-top: 1rem;">
                        <p><strong>Payment Details:</strong></p>
                        <p><strong>Bank:</strong> ${profile.bankName}</p>
                        <p><strong>BSB:</strong> ${profile.bankBSB || ''} &nbsp;&nbsp; <strong>Account:</strong> ${profile.bankAccount || ''}</p>
                        <p><strong>Account Name:</strong> ${profile.bankAccountName || ''}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    window.print();
    
    setTimeout(() => {
        document.title = originalTitle;
    }, 100);
}

function exportCSV() {
    const headers = ['quoteNumber', 'quoteDate', 'validUntil', 'customerName', 'jobDescription', 'status', 'totalAmount'];
    const filename = `quotes_${getTodayString()}.csv`;
    downloadCSV(quotes, filename, headers);
}
