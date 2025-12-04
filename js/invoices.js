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
    isInvoiceOverdue
} from './utils.js';
import { showModal, showConfirm } from './modal.js';
import { CONFIG } from './config.js';

let invoices = [];
let currentInvoice = null;
let currentFilter = 'all';
let currentSort = 'number';

export function init() {
    console.log('[Invoices] Initializing...');
    
    window.addEventListener('dataLoaded', async (e) => {
        invoices = e.detail.invoices || [];
        await render();
    });
    
    window.addEventListener('dataRefresh', async () => {
        await refresh();
    });
    
    window.addEventListener('tabChanged', async (e) => {
        if (e.detail.tab === 'invoices') {
            await refresh();
        }
    });
    
    document.getElementById('newInvoiceBtn').addEventListener('click', () => openInvoiceModal());
    document.getElementById('exportInvoicesCSV').addEventListener('click', exportCSV);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            render();
        });
    });
    
    // Sort dropdown
    document.getElementById('invoiceSort').addEventListener('change', (e) => {
        currentSort = e.target.value;
        render();
    });
    
    document.addEventListener('click', handleInvoiceActions);
}

async function refresh() {
    try {
        invoices = await storage.getInvoices();
        await render();
    } catch (error) {
        console.error('[Invoices] Error refreshing:', error);
        invoices = [];
        render();
    }
}

function handleInvoiceActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (!action || !id) return;
    
    switch(action) {
        case 'view-invoice':
            viewInvoice(id);
            break;
        case 'edit-invoice':
            editInvoice(id);
            break;
        case 'print-invoice':
            printInvoice(id);
            break;
        case 'mark-paid':
            markAsPaid(id);
            break;
        case 'mark-submitted':
            markAsSubmitted(id);
            break;
        case 'delete-invoice':
            deleteInvoice(id);
            break;
    }
}

async function render() {
    const container = document.getElementById('invoicesList');
    
    if (!Array.isArray(invoices) || invoices.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🧾</div>
                <div class="empty-state-text">No invoices yet</div>
                <p>Create your first invoice to get started</p>
            </div>
        `;
        return;
    }
    
    // Filter invoices
    let filtered = [...invoices];
    if (currentFilter === 'unpaid') {
        filtered = filtered.filter(inv => inv.status !== 'Paid');
    } else if (currentFilter === 'overdue') {
        filtered = filtered.filter(inv => isInvoiceOverdue(inv));
    } else if (currentFilter === 'paid') {
        filtered = filtered.filter(inv => inv.status === 'Paid');
    }
    
    // Sort invoices
    if (currentSort === 'number') {
        filtered.sort((a, b) => b.invoiceNumber - a.invoiceNumber);
    } else if (currentSort === 'dueDate') {
        filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } else if (currentSort === 'amount') {
        filtered.sort((a, b) => b.totalAmount - a.totalAmount);
    } else if (currentSort === 'customer') {
        filtered.sort((a, b) => a.customerName.localeCompare(b.customerName));
    }
    
    container.innerHTML = filtered.map(invoice => {
        const overdue = isInvoiceOverdue(invoice);
        return `
        <div class="data-item ${overdue ? 'overdue' : ''}">
            <div class="data-item-content">
                <div class="data-item-title">
                    Invoice #${invoice.invoiceNumber} - ${invoice.customerName}
                    ${invoice.jobDescription ? `<span style="color: #64748b; font-weight: 400;"> - ${invoice.jobDescription}</span>` : ''}
                </div>
                <div class="data-item-meta">
                    <span>Date: ${formatDate(invoice.invoiceDate)}</span>
                    <span>Due: ${formatDate(invoice.dueDate)}</span>
                    <span>Total: ${formatCurrency(invoice.totalAmount)}</span>
                    <span class="status-badge ${invoice.status.toLowerCase()}">${invoice.status}</span>
                    ${overdue ? '<span class="overdue-badge">⚠️ OVERDUE</span>' : ''}
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-small btn-secondary" data-action="view-invoice" data-id="${invoice.id}">View</button>
                <button class="btn btn-small btn-primary" data-action="edit-invoice" data-id="${invoice.id}">Edit</button>
                <button class="btn btn-small btn-secondary" data-action="print-invoice" data-id="${invoice.id}">Print</button>
                ${invoice.status === 'Sent' ? 
                    `<button class="btn btn-small btn-submitted" data-action="mark-submitted" data-id="${invoice.id}">Mark Submitted</button>` 
                    : ''}
                ${invoice.status !== 'Paid' ? 
                    `<button class="btn btn-small btn-success" data-action="mark-paid" data-id="${invoice.id}">Mark Paid</button>` 
                    : ''}
                <button class="btn btn-small btn-danger" data-action="delete-invoice" data-id="${invoice.id}">Delete</button>
            </div>
        </div>
    `;
    }).join('');
}

function openInvoiceModal(invoice = null) {
    currentInvoice = invoice;
    
    const isEdit = !!invoice;
    const title = isEdit ? `Edit Invoice #${invoice.invoiceNumber}` : 'New Invoice';
    
    const formData = invoice || {
        customerName: '',
        customerEmail: '',
        customerAddress: '',
        jobDescription: '',
        invoiceDate: getTodayString(),
        dueDate: getDateInDays(CONFIG.INVOICE_PAYMENT_TERMS),
        lineItems: [{ description: '', qty: 1, price: 0, itemTotal: 0 }],
        taxRate: CONFIG.DEFAULT_TAX_RATE,
        gstInclusive: true,
        status: 'Draft'
    };
    
    if (!formData.hasOwnProperty('gstInclusive')) {
        formData.gstInclusive = true;
    }
    
    const form = createInvoiceForm(formData);
    
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
                    const saved = await saveInvoice(form, false);
                    if (saved && saved.id) {
                        setTimeout(() => printInvoice(saved.id), 100);
                    }
                }
            },
            {
                text: '💾 Save Invoice',
                primary: true,
                onClick: async () => {
                    await saveInvoice(form, true);
                }
            }
        ]
    });
    
    setTimeout(() => {
        setupFormEvents(form);
    }, 100);
}

function createInvoiceForm(data) {
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group-inline">
            <div class="form-group">
                <label for="invoiceDate">Invoice Date *</label>
                <input type="date" id="invoiceDate" name="invoiceDate" value="${data.invoiceDate}" required>
            </div>
            <div class="form-group">
                <label for="dueDate">Due Date *</label>
                <input type="date" id="dueDate" name="dueDate" value="${data.dueDate}" required>
            </div>
            <div class="form-group">
                <label for="invoiceStatus">Status</label>
                <select id="invoiceStatus" name="status">
                    <option value="Draft" ${data.status === 'Draft' ? 'selected' : ''}>Draft</option>
                    <option value="Sent" ${data.status === 'Sent' ? 'selected' : ''}>Sent</option>
                    <option value="Submitted" ${data.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                    <option value="Paid" ${data.status === 'Paid' ? 'selected' : ''}>Paid</option>
                </select>
            </div>
        </div>
        
        <div class="form-group">
            <label for="customerName">Customer Name *</label>
            <input type="text" id="customerName" name="customerName" value="${data.customerName}" required>
        </div>
        
        <div class="form-group">
            <label for="jobDescription">Job/Project Description</label>
            <input type="text" id="jobDescription" name="jobDescription" value="${data.jobDescription || ''}" placeholder="e.g., Ongoing work at Smith St, Website redesign, etc.">
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

async function saveInvoice(form, shouldClose = true) {
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
    
    // ✅ FIXED: Only reuse invoice number if editing an existing invoice
    const isEditing = currentInvoice && invoices.find(i => i.id === currentInvoice.id);
    
    const invoiceData = {
        id: currentInvoice?.id || generateId(),
        invoiceNumber: isEditing ? currentInvoice.invoiceNumber : await storage.getNextInvoiceNumber(),
        invoiceDate: form.querySelector('#invoiceDate')?.value,
        dueDate: form.querySelector('#dueDate')?.value,
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
        status: form.querySelector('#invoiceStatus')?.value || 'Draft'
    };
    
    try {
        await storage.saveInvoice(invoiceData);
        currentInvoice = invoiceData;
        
        showToast(invoiceData.invoiceNumber ? 'Invoice saved' : 'Invoice created', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        
        return invoiceData;
    } catch (error) {
        showToast('Error saving invoice', 'error');
        console.error(error);
        return null;
    }
}

function viewInvoice(id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    
    const content = `
        <div class="invoice-view">
            <p><strong>Customer:</strong> ${invoice.customerName}</p>
            ${invoice.jobDescription ? `<p><strong>Job:</strong> ${invoice.jobDescription}</p>` : ''}
            <p><strong>Email:</strong> ${invoice.customerEmail || 'N/A'}</p>
            <p><strong>Address:</strong> ${invoice.customerAddress || 'N/A'}</p>
            <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
            <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
            <p><strong>Status:</strong> <span class="status-badge ${invoice.status.toLowerCase()}">${invoice.status}</span></p>
            
            ${invoice.status === 'Paid' && invoice.paidDate ? `
                <div style="margin-top: 1rem; padding: 1rem; background: #d1fae5; border-radius: 0.375rem;">
                    <h4 style="margin-top: 0; color: #065f46;">Payment Details</h4>
                    <p><strong>Date Paid:</strong> ${formatDate(invoice.paidDate)}</p>
                    <p><strong>Payment Method:</strong> ${invoice.paymentMethod}</p>
                    ${invoice.paymentReference ? `<p><strong>Reference:</strong> ${invoice.paymentReference}</p>` : ''}
                </div>
            ` : ''}
            
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
                    ${invoice.lineItems.map(item => `
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
                <p style="font-size: 1.2rem;"><strong>TOTAL (inc GST):</strong> ${formatCurrency(invoice.totalAmount)}</p>
            </div>
        </div>
    `;
    
    showModal(content, {
        title: `Invoice #${invoice.invoiceNumber}`,
        buttons: [{ text: 'Close', primary: false }]
    });
}

function editInvoice(id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    openInvoiceModal(invoice);
}

async function deleteInvoice(id) {
    const confirmed = await showConfirm('Are you sure you want to delete this invoice?');
    if (!confirmed) return;
    
    try {
        await storage.deleteInvoice(id);
        showToast('Invoice deleted', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error deleting invoice', 'error');
        console.error(error);
    }
}

async function markAsSubmitted(id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    
    const confirmed = await showConfirm('Mark this invoice as submitted?');
    if (!confirmed) return;
    
    invoice.status = 'Submitted';
    
    try {
        await storage.saveInvoice(invoice);
        showToast('Invoice marked as submitted', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error updating invoice', 'error');
        console.error(error);
    }
}

async function markAsPaid(id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    
    // Create payment details form
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group">
            <label for="paidDate">Date Paid *</label>
            <input type="date" id="paidDate" name="paidDate" value="${getTodayString()}" required>
        </div>
        <div class="form-group">
            <label for="paymentMethod">Payment Method *</label>
            <select id="paymentMethod" name="paymentMethod" required>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
                <option value="PayPal">PayPal</option>
                <option value="Other">Other</option>
            </select>
        </div>
        <div class="form-group">
            <label for="paymentReference">Payment Reference</label>
            <input type="text" id="paymentReference" name="paymentReference" placeholder="e.g., Bank reference, cheque number">
        </div>
    `;
    
    showModal(form, {
        title: 'Payment Details',
        buttons: [
            {
                text: 'Cancel',
                primary: false,
                onClick: () => {}
            },
            {
                text: 'Mark as Paid',
                primary: true,
                onClick: async () => {
                    const paidDate = form.querySelector('#paidDate')?.value;
                    const paymentMethod = form.querySelector('#paymentMethod')?.value;
                    const paymentReference = form.querySelector('#paymentReference')?.value || '';
                    
                    if (!paidDate || !paymentMethod) {
                        showToast('Please fill in required fields', 'error');
                        return;
                    }
                    
                    invoice.status = 'Paid';
                    invoice.paidDate = paidDate;
                    invoice.paymentMethod = paymentMethod;
                    invoice.paymentReference = paymentReference;
                    
                    try {
                        await storage.saveInvoice(invoice);
                        showToast('Invoice marked as paid', 'success');
                        await refresh();
                        window.dispatchEvent(new CustomEvent('dataRefresh'));
                    } catch (error) {
                        showToast('Error updating invoice', 'error');
                        console.error(error);
                    }
                }
            }
        ]
    });
}

async function printInvoice(id) {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;
    
    const profile = await storage.getBusinessProfile();
    
    const originalTitle = document.title;
    document.title = `Invoice-${invoice.invoiceNumber}`;
    
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
            
            <h1 class="print-title">TAX INVOICE #${invoice.invoiceNumber}</h1>
            ${invoice.jobDescription ? `<p style="font-size: 1.1rem; margin-bottom: 1rem;"><strong>Re:</strong> ${invoice.jobDescription}</p>` : ''}
            
            <div class="print-details">
                <div>
                    <strong>To:</strong><br>
                    ${invoice.customerName}<br>
                    ${invoice.customerEmail ? invoice.customerEmail + '<br>' : ''}
                    ${invoice.customerAddress ? invoice.customerAddress.replace(/\n/g, '<br>') : ''}
                </div>
                <div>
                    <strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}<br>
                    <strong>Due Date:</strong> ${formatDate(invoice.dueDate)}<br>
                    <strong>Status:</strong> ${invoice.status}
                </div>
            </div>
            
            ${invoice.status === 'Paid' && invoice.paidDate ? `
                <div style="margin-top: 1rem; padding: 1rem; background: #d1fae5; border: 2px solid #065f46; border-radius: 0.375rem;">
                    <strong style="color: #065f46;">PAID</strong><br>
                    <strong>Date Paid:</strong> ${formatDate(invoice.paidDate)}<br>
                    <strong>Payment Method:</strong> ${invoice.paymentMethod}<br>
                    ${invoice.paymentReference ? `<strong>Reference:</strong> ${invoice.paymentReference}<br>` : ''}
                </div>
            ` : ''}
            
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
                        ${invoice.lineItems.map(item => `
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
                    <span>TOTAL (inc GST ${invoice.taxRate}%):</span>
                    <span>${formatCurrency(invoice.totalAmount)}</span>
                </div>
            </div>
            
            ${invoice.status !== 'Paid' ? `
                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ccc;">
                    <p><strong>Payment Details:</strong></p>
                    <p>Please make payment by ${formatDate(invoice.dueDate)}</p>
                    ${profile.bankName ? `
                        <div style="margin-top: 1rem;">
                            <p><strong>Bank:</strong> ${profile.bankName}</p>
                            <p><strong>BSB:</strong> ${profile.bankBSB || ''} &nbsp;&nbsp; <strong>Account:</strong> ${profile.bankAccount || ''}</p>
                            <p><strong>Account Name:</strong> ${profile.bankAccountName || ''}</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    window.print();
    
    setTimeout(() => {
        document.title = originalTitle;
    }, 100);
}

function exportCSV() {
    const headers = ['invoiceNumber', 'invoiceDate', 'dueDate', 'customerName', 'jobDescription', 'status', 'totalAmount'];
    const filename = `invoices_${getTodayString()}.csv`;
    downloadCSV(invoices, filename, headers);
}
