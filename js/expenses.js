import * as storage from './storage.js';
import { 
    formatCurrency, 
    formatDate,
    getTodayString,
    generateId,
    showToast,
    downloadCSV
} from './utils.js';
import { showModal, showConfirm } from './modal.js';  // ✅ FIXED: Import from modal.js

let expenses = [];
let currentExpense = null;

export function init() {
    console.log('[Expenses] Initializing...');
    
    window.addEventListener('dataLoaded', async (e) => {
        expenses = e.detail.expenses || [];
        await render();
    });
    
    window.addEventListener('dataRefresh', async () => {
        await refresh();
    });
    
    window.addEventListener('tabChanged', async (e) => {
        if (e.detail.tab === 'expenses') {
            await refresh();
        }
    });
    
    document.getElementById('newExpenseBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('exportExpensesCSV').addEventListener('click', exportCSV);
    
    document.addEventListener('click', handleExpenseActions);
}

async function refresh() {
    try {
        expenses = await storage.getExpenses();
        await render();
    } catch (error) {
        console.error('[Expenses] Error refreshing:', error);
        expenses = [];
        render();
    }
}

function handleExpenseActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (!action || !id) return;
    
    switch(action) {
        case 'edit-expense':
            editExpense(id);
            break;
        case 'delete-expense':
            deleteExpense(id);
            break;
    }
}

async function render() {
    const container = document.getElementById('expensesList');
    
    if (!Array.isArray(expenses) || expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <div class="empty-state-text">No expenses yet</div>
                <p>Add your first expense to get started</p>
            </div>
        `;
        return;
    }
    
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(expense => `
        <div class="data-item">
            <div class="data-item-content">
                <div class="data-item-title">${expense.description}</div>
                <div class="data-item-meta">
                    <span>Date: ${formatDate(expense.date)}</span>
                    <span>Category: ${expense.category}</span>
                    <span>Amount: ${formatCurrency(expense.amount)}</span>
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-small btn-primary" data-action="edit-expense" data-id="${expense.id}">Edit</button>
                <button class="btn btn-small btn-danger" data-action="delete-expense" data-id="${expense.id}">Delete</button>
            </div>
        </div>
    `).join('');
}

function openExpenseModal(expense = null) {
    currentExpense = expense;
    
    const isEdit = !!expense;
    const title = isEdit ? 'Edit Expense' : 'New Expense';
    
    const formData = expense || {
        date: getTodayString(),
        description: '',
        category: '',
        amount: 0
    };
    
    const form = createExpenseForm(formData);
    
    showModal(form, {
        title: title,
        buttons: [
            {
                text: 'Cancel',
                primary: false,
                onClick: () => {}
            },
            {
                text: '💾 Save Expense',
                primary: true,
                onClick: async () => {
                    await saveExpense(form);
                }
            }
        ]
    });
}

function createExpenseForm(data) {
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group">
            <label for="expenseDate">Date *</label>
            <input type="date" id="expenseDate" name="date" value="${data.date}" required>
        </div>
        
        <div class="form-group">
            <label for="expenseDescription">Description *</label>
            <input type="text" id="expenseDescription" name="description" value="${data.description}" required>
        </div>
        
        <div class="form-group-inline">
            <div class="form-group">
                <label for="expenseCategory">Category *</label>
                <input type="text" id="expenseCategory" name="category" value="${data.category}" required list="categoryList">
                <datalist id="categoryList">
                    <option value="Fuel">
                    <option value="Tools">
                    <option value="Materials">
                    <option value="Office Supplies">
                    <option value="Vehicle Maintenance">
                    <option value="Insurance">
                    <option value="Software">
                    <option value="Marketing">
                    <option value="Professional Fees">
                    <option value="Other">
                </datalist>
            </div>
            <div class="form-group">
                <label for="expenseAmount">Amount *</label>
                <input type="number" id="expenseAmount" name="amount" value="${data.amount}" min="0" step="0.01" required>
            </div>
        </div>
    `;
    
    return form;
}

async function saveExpense(form) {
    const description = form.querySelector('#expenseDescription')?.value.trim();
    const category = form.querySelector('#expenseCategory')?.value.trim();
    const amount = parseFloat(form.querySelector('#expenseAmount')?.value);
    
    if (!description || !category || !amount) {
        showToast('Please fill in all required fields', 'error');
        return false;
    }
    
    const expenseData = {
        id: currentExpense?.id || generateId(),
        date: form.querySelector('#expenseDate')?.value,
        description,
        category,
        amount
    };
    
    try {
        await storage.saveExpense(expenseData);
        showToast('Expense saved', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        return true;
    } catch (error) {
        showToast('Error saving expense', 'error');
        console.error(error);
        return false;
    }
}

function editExpense(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    openExpenseModal(expense);
}

async function deleteExpense(id) {
    const confirmed = await showConfirm('Are you sure you want to delete this expense?');
    if (!confirmed) return;
    
    try {
        await storage.deleteExpense(id);
        showToast('Expense deleted', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error deleting expense', 'error');
        console.error(error);
    }
}

function exportCSV() {
    const headers = ['date', 'description', 'category', 'amount'];
    const filename = `expenses_${getTodayString()}.csv`;
    downloadCSV(expenses, filename, headers);
}
