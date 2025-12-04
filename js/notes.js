import * as storage from './storage.js';
import { 
    formatDate,
    getTodayString,
    generateId,
    showToast,
    showConfirm,
    showModal
} from './utils.js';

let jobNotes = [];
let currentNote = null;

export function init() {
    console.log('[Notes] Initializing...');
    
    window.addEventListener('dataLoaded', async (e) => {
        jobNotes = e.detail.jobNotes || [];
        await render();
    });
    
    window.addEventListener('dataRefresh', async () => {
        await refresh();
    });
    
    window.addEventListener('tabChanged', async (e) => {
        if (e.detail.tab === 'notes') {
            await refresh();
        }
    });
    
    document.getElementById('newNoteBtn').addEventListener('click', () => openNoteModal());
    
    document.addEventListener('click', handleNoteActions);
}

async function refresh() {
    try {
        jobNotes = await storage.getJobNotes();
        await render();
    } catch (error) {
        console.error('[Notes] Error refreshing:', error);
        jobNotes = [];
        render();
    }
}

function handleNoteActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (!action || !id) return;
    
    switch(action) {
        case 'view-note':
            viewNote(id);
            break;
        case 'edit-note':
            editNote(id);
            break;
        case 'delete-note':
            deleteNote(id);
            break;
    }
}

async function render() {
    const container = document.getElementById('notesList');
    
    if (!Array.isArray(jobNotes) || jobNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">No job notes yet</div>
                <p>Add your first note to get started</p>
            </div>
        `;
        return;
    }
    
    const sorted = [...jobNotes].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(note => {
        const content = note.content || note.notes || '';
        const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        
        return `
            <div class="data-item">
                <div class="data-item-content">
                    <div class="data-item-title">${note.title || 'Untitled'}</div>
                    <div class="data-item-meta">
                        <span>Date: ${formatDate(note.date)}</span>
                        ${note.customer ? `<span>Customer: ${note.customer}</span>` : ''}
                        ${preview ? `<span>${preview}</span>` : ''}
                    </div>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-small btn-secondary" data-action="view-note" data-id="${note.id}">View</button>
                    <button class="btn btn-small btn-primary" data-action="edit-note" data-id="${note.id}">Edit</button>
                    <button class="btn btn-small btn-danger" data-action="delete-note" data-id="${note.id}">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function openNoteModal(note = null) {
    currentNote = note;
    
    const isEdit = !!note;
    const title = isEdit ? 'Edit Job Note' : 'New Job Note';
    
    const formData = note ? {
        date: note.date,
        title: note.title || '',
        customer: note.customer || '',
        content: note.content || note.notes || ''
    } : {
        date: getTodayString(),
        title: '',
        customer: '',
        content: ''
    };
    
    const form = createNoteForm(formData);
    
    const modalObj = showModal(title, form, []);
    
    if (!modalObj) {
        console.error('Modal object is undefined - check if modalContainer exists in HTML');
        return;
    }
    
    setTimeout(() => {
        if (modalObj.footer) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', modalObj.close);
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn btn-primary';
            saveBtn.textContent = '💾 Save Note';
            saveBtn.type = 'button';
            saveBtn.addEventListener('click', async () => {
                const saved = await saveNote(form);
                if (saved) {
                    modalObj.close();
                }
            });
            
            modalObj.footer.appendChild(cancelBtn);
            modalObj.footer.appendChild(saveBtn);
        }
    }, 100);
}

function createNoteForm(data) {
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group">
            <label for="noteDate">Date *</label>
            <input type="date" id="noteDate" name="date" value="${data.date}" required>
        </div>
        
        <div class="form-group">
            <label for="noteTitle">Title *</label>
            <input type="text" id="noteTitle" name="title" value="${data.title}" required>
        </div>
        
        <div class="form-group">
            <label for="noteCustomer">Customer/Job</label>
            <input type="text" id="noteCustomer" name="customer" value="${data.customer}" placeholder="Optional">
        </div>
        
        <div class="form-group">
            <label for="noteContent">Notes *</label>
            <textarea id="noteContent" name="content" rows="8" required>${data.content}</textarea>
        </div>
    `;
    
    return form;
}

async function saveNote(form) {
    const title = form.querySelector('#noteTitle')?.value.trim();
    const content = form.querySelector('#noteContent')?.value.trim();
    
    if (!title || !content) {
        showToast('Title and content are required', 'error');
        return false;
    }
    
    const noteData = {
        id: currentNote?.id || generateId(),
        date: form.querySelector('#noteDate')?.value,
        title,
        customer: form.querySelector('#noteCustomer')?.value.trim() || '',
        content
    };
    
    try {
        await storage.saveJobNote(noteData);
        showToast('Job note saved', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        return true;
    } catch (error) {
        showToast('Error saving job note', 'error');
        console.error(error);
        return false;
    }
}

function viewNote(id) {
    const note = jobNotes.find(n => n.id === id);
    if (!note) return;
    
    const content = note.content || note.notes || '';
    
    const noteContent = `
        <div class="note-view">
            <p><strong>Date:</strong> ${formatDate(note.date)}</p>
            ${note.customer ? `<p><strong>Customer/Job:</strong> ${note.customer}</p>` : ''}
            <div style="margin-top: 1rem; white-space: pre-wrap; line-height: 1.6;">${content}</div>
        </div>
    `;
    
    const modalObj = showModal(note.title || 'Untitled', noteContent, []);
    
    setTimeout(() => {
        if (modalObj.footer) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.textContent = 'Close';
            closeBtn.addEventListener('click', () => modalObj.close());
            modalObj.footer.appendChild(closeBtn);
        }
    }, 100);
}

function editNote(id) {
    const note = jobNotes.find(n => n.id === id);
    if (!note) return;
    openNoteModal(note);
}

async function deleteNote(id) {
    if (!showConfirm('Are you sure you want to delete this note?')) return;
    
    try {
        await storage.deleteJobNote(id);
        showToast('Job note deleted', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error deleting job note', 'error');
        console.error(error);
    }
}
