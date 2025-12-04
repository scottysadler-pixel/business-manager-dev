# 📊 **BUSINESS MANAGER - PROJECT SUMMARY**

## 🎯 **Overview**
A complete cloud-based business management system for tracking quotes, invoices, expenses, travel logs, job notes, and contacts. Built with vanilla JavaScript and Firebase for real-time cloud synchronization.

---

## 🌐 **Live Application**
**URL:** https://scottysadler-pixel.github.io/business-manager/  
**GitHub Repository:** https://github.com/scottysadler-pixel/business-manager

---

## 🔧 **Technology Stack**

### **Frontend:**
- Pure JavaScript (ES6 modules)
- HTML5
- CSS3 (responsive design)
- No frameworks - lightweight and fast

### **Backend/Database:**
- Firebase Authentication (email/password)
- Firebase Firestore (NoSQL cloud database)
- GitHub Pages (static hosting)

### **Key Libraries:**
- Firebase SDK 10.7.1
- Modular imports for tree-shaking

---

## 📱 **Core Features**

### **1. Dashboard**
- Real-time financial summary
- Quote/invoice statistics
- Expense tracking overview
- Travel log summaries
- Quick-access cards to all modules

### **2. Quotes Module**
- Create professional quotes with line items
- GST-inclusive pricing (10%)
- Set validity period (default 30 days)
- Track quote status (Draft/Sent/Accepted/Rejected)
- Convert quotes to invoices
- Print/export quotes with business branding
- Add job descriptions for clarity

### **3. Invoices Module**
- Generate tax invoices with ABN
- Track payment status (Draft/Sent/Paid)
- Payment terms (default 30 days)
- Print professional invoices with logo
- Bank details automatically included
- Mark invoices as paid
- Export to CSV

### **4. Expenses Module**
- Track business expenses by category
- Categories: Fuel, Tools, Materials, Office Supplies, Vehicle Maintenance, Insurance, Software, Marketing, Professional Fees, Other
- Date-based organization
- CSV export for tax time

### **5. Travel Log**
- Record business mileage
- Track: Date, From, To, Distance (km), Purpose
- Automatic deduction calculations
- Export travel records

### **6. Job Notes**
- Quick notes for jobs/projects
- Link notes to customers
- Date-stamped entries
- Searchable and sortable

### **7. Contacts Module**
- Customer contact management
- Store: Name, Email, Phone, Address
- Quick access when creating quotes/invoices

### **8. Settings**
- **Business Profile:**
  - Business Name
  - Address
  - Phone & Email
  - ABN (Australian Business Number)
  - Business Logo Upload (displays on invoices/quotes)
  
- **Bank Details:**
  - Bank Name
  - BSB
  - Account Number
  - Account Name
  - (Automatically shown on invoices)

- **Data Management:**
  - Export all data (JSON backup)
  - Import data from backup
  - Migrate from localStorage to Firebase

---

## 🗄️ **Database Structure**

### **Firestore Collections:**
