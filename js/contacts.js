import * as storage from './storage.js';
import { 
    generateId,
    showToast,
    showConfirm,
    showModal
} from './utils.js';

let contacts = [];
let currentContact = null;

export function init() {
    console.log('[Contacts] Initializing...');
    
    window.addEventListener('dataLoaded', (e) => {
        contacts = e.detail.contacts || [];
        render();
    });
    
    window.addEventListener('dataRefresh', async () => {
        contacts = await storage.getContacts();
        render();
    });
    
    window.addEventListener('tabChanged', (e) => {
        if (e.detail.tab === 'contacts') {
            refresh();
        }
    });
    
    document.getElementById('newContactBtn').addEventListener('click', () => openContactModal());
    document.getElementById('contactSearch').addEventListener('input', handleSearch);
    
    document.addEventListener('click', handleContactActions);
}

async function refresh() {
    contacts = await storage.getContacts();
    render();
}

function handleContactActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (!action || !id) return;
    
    switch(action) {
        case 'edit-contact':
            editContact(id);
            break;
        case 'delete-contact':
            deleteContact(id);
            break;
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchTerm)) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm))
    );
    render(filtered);
}

function render(contactsToRender = contacts) {
    const container = document.getElementById('contactsList');
    
    if (contactsToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">No contacts yet</div>
                <p>Add your first contact to get started</p>
            </div>
        `;
        return;
    }
    
    const sorted = [...contactsToRender].sort((a, b) => a.name.localeCompare(b.name));
    
    container.innerHTML = sorted.map(contact => `
        <div class="data-item">
            <div class="data-item-content">
                <div class="data-item-title">${contact.name}${contact.company ? ` - ${contact.company}` : ''}</div>
                <div class="data-item-meta">
                    ${contact.email ? `<span>📧 ${contact.email}</span>` : ''}
                    ${contact.phone ? `<span>📱 ${contact.phone}</span>` : ''}
                    ${contact.address ? `<span>📍 ${contact.address.substring(0, 50)}...</span>` : ''}
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-small btn-primary" data-action="edit-contact" data-id="${contact.id}">Edit</button>
                <button class="btn btn-small btn-danger" data-action="delete-contact" data-id="${contact.id}">Delete</button>
            </div>
        </div>
    `).join('');
}

function openContactModal(contact = null) {
    currentContact = contact;
    
    const isEdit = !!contact;
    const title = isEdit ? `Edit Contact` : 'New Contact';
    
    const formData = contact || {
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
    };
    
    const form = createContactForm(formData);
    
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
            saveBtn.textContent = '💾 Save Contact';
            saveBtn.type = 'button';
            saveBtn.addEventListener('click', () => {
                if (saveContact(form)) {
                    modal.close();
                }
            });
            
            footer.appendChild(cancelBtn);
            footer.appendChild(saveBtn);
        }
    }, 100);
}

function createContactForm(data) {
    const form = document.createElement('form');
    form.innerHTML = `
        <div class="form-group">
            <label for="contactName">Name *</label>
            <input type="text" id="contactName" name="name" value="${data.name}" required>
        </div>
        
        <div class="form-group">
            <label for="contactCompany">Company</label>
            <input type="text" id="contactCompany" name="company" value="${data.company || ''}">
        </div>
        
        <div class="form-group-inline">
            <div class="form-group">
                <label for="contactEmail">Email</label>
                <input type="email" id="contactEmail" name="email" value="${data.email || ''}">
            </div>
            <div class="form-group">
                <label for="contactPhone">Phone</label>
                <input type="tel" id="contactPhone" name="phone" value="${data.phone || ''}">
            </div>
        </div>
        
        <div class="form-group">
            <label for="contactAddress">Address</label>
            <textarea id="contactAddress" name="address" rows="3">${data.address || ''}</textarea>
        </div>
        
        <div class="form-group">
            <label for="contactNotes">Notes</label>
            <textarea id="contactNotes" name="notes" rows="3">${data.notes || ''}</textarea>
        </div>
    `;
    
    return form;
}

async function saveContact(form) {
    const name = form.querySelector('#contactName')?.value.trim();
    if (!name) {
        showToast('Contact name is required', 'error');
        return false;
    }
    
    const contactData = {
        id: currentContact?.id || generateId(),
        name: form.querySelector('#contactName')?.value.trim(),
        company: form.querySelector('#contactCompany')?.value.trim() || '',
        email: form.querySelector('#contactEmail')?.value.trim() || '',
        phone: form.querySelector('#contactPhone')?.value.trim() || '',
        address: form.querySelector('#contactAddress')?.value.trim() || '',
        notes: form.querySelector('#contactNotes')?.value.trim() || '',
        updatedAt: new Date().toISOString()
    };
    
    try {
        await storage.saveContact(contactData);
        showToast('Contact saved', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        return true;
    } catch (error) {
        showToast('Error saving contact', 'error');
        console.error(error);
        return false;
    }
}

function editContact(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    openContactModal(contact);
}

async function deleteContact(id) {
    if (!showConfirm('Are you sure you want to delete this contact?')) return;
    
    try {
        await storage.deleteContact(id);
        showToast('Contact deleted', 'success');
        await refresh();
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error deleting contact', 'error');
        console.error(error);
    }
}

// Public function to get contacts for autocomplete
export function getAllContacts() {
    return contacts;
}