import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    deleteDoc,
    query,
    where,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { getUserId } from './auth.js';

const COLLECTIONS = {
    QUOTES: 'quotes',
    INVOICES: 'invoices',
    EXPENSES: 'expenses',
    TRAVEL_LOGS: 'travelLogs',
    JOB_NOTES: 'jobNotes',
    CONTACTS: 'contacts',
    BUSINESS_PROFILE: 'businessProfile',
    COUNTERS: 'counters'
};

export async function init() {
    console.log('[Storage] Initializing Firestore...');
    
    // Initialize counters if needed
    await ensureCounters();
    
    console.log('[Storage] Firestore initialized');
}

async function ensureCounters() {
    const userId = getUserId();
    if (!userId) return;
    
    const counterRef = doc(window.firebaseDb, COLLECTIONS.COUNTERS, userId);
    const counterSnap = await getDoc(counterRef);
    
    if (!counterSnap.exists()) {
        await setDoc(counterRef, {
            quoteCounter: 0,
            invoiceCounter: 0
        });
    }
}

// Helper to get user's collection reference
function getUserCollection(collectionName) {
    const userId = getUserId();
    if (!userId) throw new Error('User not logged in');
    return collection(window.firebaseDb, `users/${userId}/${collectionName}`);
}

// Helper to get user's document reference
function getUserDoc(collectionName, docId) {
    const userId = getUserId();
    if (!userId) throw new Error('User not logged in');
    return doc(window.firebaseDb, `users/${userId}/${collectionName}/${docId}`);
}

// Quotes
export async function getQuotes() {
    try {
        const quotesCol = getUserCollection(COLLECTIONS.QUOTES);
        const snapshot = await getDocs(quotesCol);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting quotes:', error);
        return [];
    }
}

export async function saveQuote(quote) {
    try {
        const quoteRef = getUserDoc(COLLECTIONS.QUOTES, quote.id);
        await setDoc(quoteRef, quote);
    } catch (error) {
        console.error('Error saving quote:', error);
        throw error;
    }
}

export async function deleteQuote(id) {
    try {
        const quoteRef = getUserDoc(COLLECTIONS.QUOTES, id);
        await deleteDoc(quoteRef);
    } catch (error) {
        console.error('Error deleting quote:', error);
        throw error;
    }
}

export async function getNextQuoteNumber() {
    try {
        const userId = getUserId();
        const counterRef = doc(window.firebaseDb, COLLECTIONS.COUNTERS, userId);
        const counterSnap = await getDoc(counterRef);
        
        // ✅ FIXED: Ensure we parse as integer
        const current = counterSnap.exists() ? parseInt(counterSnap.data().quoteCounter || 0, 10) : 0;
        const next = current + 1;
        
        await setDoc(counterRef, { quoteCounter: next }, { merge: true });
        return next;
    } catch (error) {
        console.error('Error getting next quote number:', error);
        return 1;
    }
}

// Invoices
export async function getInvoices() {
    try {
        const invoicesCol = getUserCollection(COLLECTIONS.INVOICES);
        const snapshot = await getDocs(invoicesCol);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting invoices:', error);
        return [];
    }
}

export async function saveInvoice(invoice) {
    try {
        const invoiceRef = getUserDoc(COLLECTIONS.INVOICES, invoice.id);
        await setDoc(invoiceRef, invoice);
    } catch (error) {
        console.error('Error saving invoice:', error);
        throw error;
    }
}

export async function deleteInvoice(id) {
    try {
        const invoiceRef = getUserDoc(COLLECTIONS.INVOICES, id);
        await deleteDoc(invoiceRef);
    } catch (error) {
        console.error('Error deleting invoice:', error);
        throw error;
    }
}

export async function getNextInvoiceNumber() {
    try {
        const userId = getUserId();
        const counterRef = doc(window.firebaseDb, COLLECTIONS.COUNTERS, userId);
        const counterSnap = await getDoc(counterRef);
        
        // ✅ FIXED: Ensure we parse as integer
        const current = counterSnap.exists() ? parseInt(counterSnap.data().invoiceCounter || 0, 10) : 0;
        const next = current + 1;
        
        await setDoc(counterRef, { invoiceCounter: next }, { merge: true });
        return next;
    } catch (error) {
        console.error('Error getting next invoice number:', error);
        return 1;
    }
}

// Expenses
export async function getExpenses() {
    try {
        const expensesCol = getUserCollection(COLLECTIONS.EXPENSES);
        const snapshot = await getDocs(expensesCol);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting expenses:', error);
        return [];
    }
}

export async function saveExpense(expense) {
    try {
        const expenseRef = getUserDoc(COLLECTIONS.EXPENSES, expense.id);
        await setDoc(expenseRef, expense);
    } catch (error) {
        console.error('Error saving expense:', error);
        throw error;
    }
}

export async function deleteExpense(id) {
    try {
        const expenseRef = getUserDoc(COLLECTIONS.EXPENSES, id);
        await deleteDoc(expenseRef);
    } catch (error) {
        console.error('Error deleting expense:', error);
        throw error;
    }
}

// Travel Logs
export async function getTravelLogs() {
    try {
        const logsCol = getUserCollection(COLLECTIONS.TRAVEL_LOGS);
        const snapshot = await getDocs(logsCol);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting travel logs:', error);
        return [];
    }
}

export async function saveTravelLog(log) {
    try {
        const logRef = getUserDoc(COLLECTIONS.TRAVEL_LOGS, log.id);
        await setDoc(logRef, log);
    } catch (error) {
        console.error('Error saving travel log:', error);
        throw error;
    }
}

export async function deleteTravelLog(id) {
    try {
        const logRef = getUserDoc(COLLECTIONS.TRAVEL_LOGS, id);
        await deleteDoc(logRef);
    } catch (error) {
        console.error('Error deleting travel log:', error);
        throw error;
    }
}

// Job Notes
export async function getJobNotes() {
    try {
        const notesCol = getUserCollection(COLLECTIONS.JOB_NOTES);
        const snapshot = await getDocs(notesCol);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting job notes:', error);
        return [];
    }
}

export async function saveJobNote(note) {
    try {
        const noteRef = getUserDoc(COLLECTIONS.JOB_NOTES, note.id);
        await setDoc(noteRef, note);
    } catch (error) {
        console.error('Error saving job note:', error);
        throw error;
    }
}

export async function deleteJobNote(id) {
    try {
        const noteRef = getUserDoc(COLLECTIONS.JOB_NOTES, id);
        await deleteDoc(noteRef);
    } catch (error) {
        console.error('Error deleting job note:', error);
        throw error;
    }
}

// Contacts
export async function getContacts() {
    try {
        const contactsCol = getUserCollection(COLLECTIONS.CONTACTS);
        const snapshot = await getDocs(contactsCol);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting contacts:', error);
        return [];
    }
}

export async function saveContact(contact) {
    try {
        const contactRef = getUserDoc(COLLECTIONS.CONTACTS, contact.id);
        await setDoc(contactRef, contact);
    } catch (error) {
        console.error('Error saving contact:', error);
        throw error;
    }
}

export async function deleteContact(id) {
    try {
        const contactRef = getUserDoc(COLLECTIONS.CONTACTS, id);
        await deleteDoc(contactRef);
    } catch (error) {
        console.error('Error deleting contact:', error);
        throw error;
    }
}

export async function findContactByEmail(email) {
    if (!email) return null;
    const contacts = await getContacts();
    return contacts.find(c => c.email?.toLowerCase() === email?.toLowerCase());
}

export async function addContactIfNotExists(contactData) {
    if (!contactData.email) return false;
    
    const existing = await findContactByEmail(contactData.email);
    if (existing) {
        return false; // already exists
    }
    
    // Generate ID for new contact
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    await saveContact({
        id: id,
        name: contactData.name || '',
        email: contactData.email,
        phone: contactData.phone || '',
        address: contactData.address || '',
        createdAt: new Date().toISOString()
    });
    
    return true; // was added
}

// Business Profile
export async function getBusinessProfile() {
    try {
        const userId = getUserId();
        const profileRef = doc(window.firebaseDb, `users/${userId}/settings`, 'businessProfile');
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
            return profileSnap.data();
        }
        
        return {
            businessName: '',
            address: '',
            phone: '',
            email: '',
            abn: '',
            logoDataUrl: '',
            bankName: '',
            bankBSB: '',
            bankAccount: '',
            bankAccountName: ''
        };
    } catch (error) {
        console.error('Error getting business profile:', error);
        return {};
    }
}

export async function saveBusinessProfile(profile) {
    try {
        const userId = getUserId();
        const profileRef = doc(window.firebaseDb, `users/${userId}/settings`, 'businessProfile');
        await setDoc(profileRef, profile);
    } catch (error) {
        console.error('Error saving business profile:', error);
        throw error;
    }
}

// Get All Data
export async function getAll() {
    const [quotes, invoices, expenses, travelLogs, jobNotes, contacts, businessProfile] = await Promise.all([
        getQuotes(),
        getInvoices(),
        getExpenses(),
        getTravelLogs(),
        getJobNotes(),
        getContacts(),
        getBusinessProfile()
    ]);
    
    return {
        quotes,
        invoices,
        expenses,
        travelLogs,
        jobNotes,
        contacts,
        businessProfile
    };
}

// Export All Data
export async function exportAllData() {
    const data = await getAll();
    
    const userId = getUserId();
    const counterRef = doc(window.firebaseDb, COLLECTIONS.COUNTERS, userId);
    const counterSnap = await getDoc(counterRef);
    const counters = counterSnap.exists() ? counterSnap.data() : { quoteCounter: 0, invoiceCounter: 0 };
    
    return {
        version: '2.0',
        exportDate: new Date().toISOString(),
        data,
        counters
    };
}

// Import All Data
export async function importAllData(importData) {
    if (!importData.data) {
        throw new Error('Invalid import data');
    }
    
    const { quotes, invoices, expenses, travelLogs, jobNotes, contacts, businessProfile } = importData.data;
    
    // Import all collections
    if (quotes) {
        for (const quote of quotes) {
            await saveQuote(quote);
        }
    }
    
    if (invoices) {
        for (const invoice of invoices) {
            await saveInvoice(invoice);
        }
    }
    
    if (expenses) {
        for (const expense of expenses) {
            await saveExpense(expense);
        }
    }
    
    if (travelLogs) {
        for (const log of travelLogs) {
            await saveTravelLog(log);
        }
    }
    
    if (jobNotes) {
        for (const note of jobNotes) {
            await saveJobNote(note);
        }
    }
    
    if (contacts) {
        for (const contact of contacts) {
            await saveContact(contact);
        }
    }
    
    if (businessProfile) {
        await saveBusinessProfile(businessProfile);
    }
    
    // Import counters
    if (importData.counters) {
        const userId = getUserId();
        const counterRef = doc(window.firebaseDb, COLLECTIONS.COUNTERS, userId);
        await setDoc(counterRef, importData.counters);
    }
}

// Migrate from localStorage
export async function migrateFromLocalStorage() {
    const KEYS = {
        QUOTES: 'businessManager_quotes',
        INVOICES: 'businessManager_invoices',
        EXPENSES: 'businessManager_expenses',
        TRAVEL_LOGS: 'businessManager_travelLogs',
        JOB_NOTES: 'businessManager_jobNotes',
        BUSINESS_PROFILE: 'businessManager_businessProfile',
        QUOTE_COUNTER: 'businessManager_quoteCounter',
        INVOICE_COUNTER: 'businessManager_invoiceCounter'
    };
    
    const getJSON = (key, defaultValue = []) => {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        try {
            return JSON.parse(item);
        } catch (e) {
            return defaultValue;
        }
    };
    
    const quotes = getJSON(KEYS.QUOTES, []);
    const invoices = getJSON(KEYS.INVOICES, []);
    const expenses = getJSON(KEYS.EXPENSES, []);
    const travelLogs = getJSON(KEYS.TRAVEL_LOGS, []);
    const jobNotes = getJSON(KEYS.JOB_NOTES, []);
    const businessProfile = getJSON(KEYS.BUSINESS_PROFILE, {});
    
    const counters = {
        quoteCounter: parseInt(localStorage.getItem(KEYS.QUOTE_COUNTER) || '0'),
        invoiceCounter: parseInt(localStorage.getItem(KEYS.INVOICE_COUNTER) || '0')
    };
    
    // Import to Firestore
    await importAllData({
        version: '2.0',
        exportDate: new Date().toISOString(),
        data: {
            quotes,
            invoices,
            expenses,
            travelLogs,
            jobNotes,
            contacts: [],
            businessProfile
        },
        counters
    });
}
