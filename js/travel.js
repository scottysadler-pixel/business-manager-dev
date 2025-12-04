import * as storage from './storage.js';
import { 
    formatDate,
    getTodayString,
    generateId,
    showToast,
    showConfirm,
    showModal
} from './utils.js';
import { CONFIG } from './config.js';

let travelLogs = [];
let currentLog = null;

export function init() {
    console.log('[Travel] Initializing...');
    
    window.addEventListener('dataLoaded', async (e) => {
        travelLogs = e.detail.travelLogs || [];
        await render();
    });
    
    window.addEventListener('dataRefresh', async () => {
        await refresh();
    });
    
    window.addEventListener('tabChanged', async (e) => {
        if (e.detail.tab === 'travel') {
            await refresh();
        }
    });
    
    document.getElementById('newTravelBtn').addEventListener('click', () => openTravelModal());
    
    document.addEventListener('click', handleTravelActions);
}

async function refresh() {
    try {
        travelLogs = await storage.getTravelLogs();
        await render();
    } catch (error) {
        console.error('[Travel] Error refreshing:', error);
        travelLogs = [];
        render();
    }
}

function handleTravelActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (!action || !id) return;
    
    switch(action) {
        case 'edit-travel':
            editTravel(id);
            break;
        case 'delete-travel':
            deleteTravel(id);
            break;
    }
}

async function render() {
    const container = document.getElementById('travelList');
    
    if (!Array.isArray(travelLogs) || travelLogs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚗</div>
                <div class="empty-state-text">No travel logs yet</div>
                <p>Add your first travel entry to get started</p>
            </div>
        `;
        return;
    }
    
    const sorted = [...travelLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(log => {
        // Handle both old format (km/kms) and new format (distance)
        const distance = log.distance || log.kms || log.km || 0;
        const deduction = (distance * CONFIG.CENTS_PER_KM / 100).toFixed(2);
        const from = log.from || log.origin || 'N/A';
        const to = log.to || log.destination || 'N/A';
        
        return `
            <div class="data-item">
                <div class="data-item-content">
                    <div class="data-item-title">${from} → ${to}</div>
                    <div class="data-item-meta">
                        <span>Date: ${formatDate(log.date)}</span>
                        <span>Distance: ${distance} km</span>
                        <span>Deduction: $${deduction}</span>
                        ${log.purpose ? `<span>Purpose: ${log.purpose}</span>` : ''}
                    </div>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-small btn-primary" data-action="edit-travel" data-id="${log.id}">Edit</button>
                    <button class="btn btn-small btn-danger" data-action="delete-travel" data-id="${log.id}">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function openTravelModal(log = null) {
    currentLog = log;
    
    const isEdit = !!log;
    const title = isEdit ? 'Edit Travel Entry' : 'New Travel Entry';
    
    // Handle old data format
    const distance = log ? (log.distance || log.kms || log.km || 0) : 0;
    const from = log ? (log.from || log.origin || '') : '';
    const to = log ? (log.to || log.destination || '') : '';
    
    const formData = log ? {
        date: log.date,
        from,
        to,
        distance,
        purpose: log.purpose || ''
    } : {
        date: getTodayString(),
        from: '',
        to: '',
        distance: 0,
        purpose: ''
    };
    
    const form = createTravelForm(formData);
    
    const modal = showModal(title, form, []);
    
    setTimeout(() => {
        const footer = modal.modal.querySelector('.modal-footer');
        if (footer) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', modal.close);
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn btn-primary';
            saveBtn.textContent = '💾 Save Travel';
            saveBtn.type = 'button';
            saveBtn.addEventListener('click', async () => {
                const saved = await saveTravel(form);
                if (saved) {
                    modal.close();
                }
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(saveBtn);
        }
    }, 100);
}

function createTravelForm(data) {
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group">
            <label for="travelDate">Date *</label>
            <input type="date" id="travelDate" name="date" value="${data.date}" required>
        </div>
        
        <div class="form-group-inline">
            <div class="form-group">
                <label for="travelFrom">From *</label>
                <input type="text" id="travelFrom" name="from" value="${data.from}" required>
            </div>
            <div class="form-group">
                <label for="travelTo">To *</label>
                <input type="text" id="travelTo" name="to" value="${data.to}" required>
            </div>
        </div>
        
        <div class="form-group">
            <label for="travelDistance">Distance (km) *</label>
            <input type="number" id="travelDistance" name="distance" value="${data.distance}" min="0" step="0.1" required>
        </div>
        
        <div class="form-group">
            <label for="travelPurpose">Purpose</label>
            <input type="text" id="travelPurpose" name="purpose" value="${data.purpose || ''}" placeholder="e.g., Client meeting, Site visit">
        </div>
        
        <div style="background: #f0f9ff; padding: 0.75rem; border-radius: 0.375rem; margin-top: 1rem; border-left: 4px solid #2563eb;">
            <strong>ℹ️ Tax deduction rate: ${CONFIG.CENTS_PER_KM}¢ per km</strong>
        </div>
    `;
    
    return form;
}

async function saveTravel(form) {
    const from = form.querySelector('#travelFrom')?.value.trim();
    const to = form.querySelector('#travelTo')?.value.trim();
    const distance = parseFloat(form.querySelector('#travelDistance')?.value);
    
    if (!from || !to || !distance) {
        showToast('Please fill in all required fields', 'error');
        return false;
    }
    
    const travelData = {
        id: currentLog?.id || generateId(),
        date: form.querySelector('#travelDate')?.value,
        from,
        to,
        distance,
        purpose: form.querySelector('#travelPurpose')?.value.trim() || ''
    };
    
    try {
        await storage.saveTravelLog(travelData);
        showToast('Travel entry saved', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        return true;
    } catch (error) {
        showToast('Error saving travel entry', 'error');
        console.error(error);
        return false;
    }
}

function editTravel(id) {
    const log = travelLogs.find(l => l.id === id);
    if (!log) return;
    openTravelModal(log);
}

async function deleteTravel(id) {
    if (!showConfirm('Are you sure you want to delete this travel entry?')) return;
    
    try {
        await storage.deleteTravelLog(id);
        showToast('Travel entry deleted', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error deleting travel entry', 'error');
        console.error(error);
    }
}