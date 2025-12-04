import * as storage from './storage.js';
import { 
    showToast,
    showConfirm,
    showPrompt,
    downloadJSON,
    readFileAsDataURL
} from './utils.js';

let businessProfile = {};

export function init() {
    console.log('[Settings] Initializing...');
    
    window.addEventListener('dataLoaded', (e) => {
        businessProfile = e.detail.businessProfile || {};
        renderBusinessProfile();
    });
    
    window.addEventListener('dataRefresh', async () => {
        businessProfile = await storage.getBusinessProfile();
        renderBusinessProfile();
    });
    
    window.addEventListener('tabChanged', (e) => {
        if (e.detail.tab === 'settings') {
            refresh();
        }
    });
    
    document.getElementById('businessProfileForm').addEventListener('submit', saveBusinessProfile);
    document.getElementById('businessLogo').addEventListener('change', handleLogoUpload);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('migrateFromLocalBtn').addEventListener('click', migrateFromLocal);
    document.getElementById('importDataFile').addEventListener('change', importData);
}

async function refresh() {
    businessProfile = await storage.getBusinessProfile();
    renderBusinessProfile();
}

function renderBusinessProfile() {
    document.getElementById('businessName').value = businessProfile.businessName || '';
    document.getElementById('businessAddress').value = businessProfile.address || '';
    document.getElementById('businessPhone').value = businessProfile.phone || '';
    document.getElementById('businessEmail').value = businessProfile.email || '';
    document.getElementById('businessABN').value = businessProfile.abn || '';
    document.getElementById('bankName').value = businessProfile.bankName || '';
    document.getElementById('bankBSB').value = businessProfile.bankBSB || '';
    document.getElementById('bankAccount').value = businessProfile.bankAccount || '';
    document.getElementById('bankAccountName').value = businessProfile.bankAccountName || '';
    
    const logoPreview = document.getElementById('logoPreview');
    if (businessProfile.logoDataUrl) {
        logoPreview.innerHTML = `<img src="${businessProfile.logoDataUrl}" alt="Business Logo">`;
    } else {
        logoPreview.innerHTML = '';
    }
}

async function saveBusinessProfile(e) {
    e.preventDefault();
    
    const profile = {
        businessName: document.getElementById('businessName').value,
        address: document.getElementById('businessAddress').value,
        phone: document.getElementById('businessPhone').value,
        email: document.getElementById('businessEmail').value,
        abn: document.getElementById('businessABN').value,
        bankName: document.getElementById('bankName').value,
        bankBSB: document.getElementById('bankBSB').value,
        bankAccount: document.getElementById('bankAccount').value,
        bankAccountName: document.getElementById('bankAccountName').value,
        logoDataUrl: businessProfile.logoDataUrl || ''
    };
    
    try {
        await storage.saveBusinessProfile(profile);
        businessProfile = profile;
        showToast('Business profile saved', 'success');
    } catch (error) {
        showToast('Error saving profile', 'error');
        console.error(error);
    }
}

async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image size must be less than 2MB', 'error');
        return;
    }
    
    try {
        const dataUrl = await readFileAsDataURL(file);
        businessProfile.logoDataUrl = dataUrl;
        
        document.getElementById('logoPreview').innerHTML = `<img src="${dataUrl}" alt="Business Logo">`;
        
        showToast('Logo uploaded. Click "Save Profile" to save changes.', 'info');
    } catch (error) {
        showToast('Error uploading logo', 'error');
        console.error(error);
    }
}

async function exportData() {
    try {
        const exportData = await storage.exportAllData();
        const filename = `business-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        downloadJSON(exportData, filename);
    } catch (error) {
        showToast('Error exporting data', 'error');
        console.error(error);
    }
}

async function migrateFromLocal() {
    if (!showConfirm('Import all data from localStorage to Firebase?\n\nThis will copy your quotes, invoices, expenses, travel logs, job notes, and business profile to the cloud.')) {
        return;
    }
    
    try {
        await storage.migrateFromLocalStorage();
        showToast('Data migrated successfully!', 'success');
        
        // Refresh all data
        window.dispatchEvent(new CustomEvent('dataRefresh'));
    } catch (error) {
        showToast('Error migrating data: ' + error.message, 'error');
        console.error(error);
    }
}

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!showConfirm('Import data? This will merge with existing data.')) {
        e.target.value = '';
        return;
    }
    
    try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.data) {
            throw new Error('Invalid backup file format');
        }
        
        await storage.importAllData(importData);
        
        showToast('Data imported successfully', 'success');
        
        window.dispatchEvent(new CustomEvent('dataRefresh'));
        
    } catch (error) {
        showToast('Error importing data: ' + error.message, 'error');
        console.error(error);
    }
    
    e.target.value = '';
}