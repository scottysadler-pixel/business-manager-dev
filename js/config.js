// Configuration constants and defaults
export const CONFIG = {
    // Storage prefix for localStorage keys
    STORAGE_PREFIX: 'mrcybersafe_',
    
    // Default tax rate (GST in Australia)
    DEFAULT_TAX_RATE: 10,
    
    // Travel deduction rate per km (AUD)
    TRAVEL_DEDUCTION_RATE: 0.85,
    CENTS_PER_KM: 85, // ATO rate in cents (for display)
    
    // Date format
    DATE_FORMAT: 'YYYY-MM-DD',
    
    // Quote validity period (days)
    QUOTE_VALIDITY_DAYS: 30,
    
    // Invoice payment terms (days)
    INVOICE_PAYMENT_TERMS: 14,
    
    // Toast notification duration (ms)
    TOAST_DURATION: 3000,
    
    // Expense categories
    EXPENSE_CATEGORIES: [
        'Materials',
        'Equipment',
        'Fuel',
        'Maintenance',
        'Supplies',
        'Insurance',
        'Subcontractors',
        'Other'
    ],
    
    // Currency settings
    CURRENCY: {
        code: 'AUD',
        symbol: '$',
        locale: 'en-AU'
    }
};