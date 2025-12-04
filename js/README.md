# Business Manager

A lightweight, offline-capable business management web application for trades and small businesses.

## Features

- **Dashboard**: Financial and travel summaries with real-time calculations
- **Quotes**: Create, manage, and convert quotes to invoices
- **Invoices**: Generate invoices with GST-inclusive pricing support
- **Expenses**: Track business expenses with optional receipt images
- **Travel Log**: Record business travel and calculate tax deductions
- **Job Notes**: Keep organized notes for jobs and customers
- **Settings**: Manage business profile and data backup/restore

## Quick Start

### 1. Setup

1. Download or clone this repository
2. No build step required - pure HTML/CSS/JS!

### 2. Running Locally

You need to serve the files over HTTP (not file://) for ES modules to work.

**Option A: VS Code Live Server (Recommended)**
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. App will open at `http://127.0.0.1:5500`

**Option B: Python HTTP Server**
```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

**Option C: Node.js HTTP Server**
```bash
npx http-server -p 8000

# Then open: http://localhost:8000
```

### 3. Using the App

1. **Setup Business Profile**: Go to Settings → Enter your business details
2. **Create Quotes**: Go to Quotes → New Quote → Fill in customer and line items
3. **Convert to Invoice**: Accept a quote → Click "Convert to Invoice"
4. **Track Expenses**: Record expenses with optional receipt images
5. **Log Travel**: Record business travel for tax deduction calculations
6. **Backup Data**: Settings → Export All Data (saves JSON file)

## File Structure

```
mr-cybersafe-business-manager/
├── index.html          # Main HTML structure
├── css/
│   └── styles.css      # All styling
├── js/
│   ├── app.js          # Main bootstrap (single entry point)
│   ├── config.js       # Configuration constants
│   ├── utils.js        # Shared utility functions
│   ├── storage.js      # localStorage wrapper
│   ├── dashboard.js    # Dashboard module
│   ├── quotes.js       # Quotes management
│   ├── invoices.js     # Invoices management
│   ├── expenses.js     # Expenses tracking
│   ├── travel.js       # Travel log
│   ├── notes.js        # Job notes
│   └── settings.js     # Settings & data management
└── README.md           # This file
```

## Architecture

### ES Modules
- Single module entry point: `<script type="module" src="js/app.js">`
- app.js imports all other modules
- No separate script tags needed in HTML

### Event System
- `dataLoaded`: Fired when initial data is loaded from storage
- `dataRefresh`: Fired when data is imported or cleared
- `tabChanged`: Fired when user switches tabs

### Data Storage
- Uses localStorage (browser-based, offline-capable)
- Automatic persistence on every save
- Export/import for backups (JSON format)
- Future migration to Firebase planned

## Configuration

Edit `js/config.js` to customize:

- Tax rate (default: 10% GST)
- Travel deduction rate (default: $0.85/km)
- Quote validity period (default: 30 days)
- Invoice payment terms (default: 14 days)
- Expense categories

## Key Features

### GST-Inclusive Pricing
When creating invoices, check "Prices include GST" to automatically calculate:
- Subtotal = Total / 1.1
- GST = Total - Subtotal

### Quote to Invoice Conversion
- Accept a quote → Click "Convert to Invoice"
- Creates invoice with same line items
- Marks quote as converted
- Links quote to invoice

### Two-Step Data Clearing
To prevent accidental data loss:
1. Confirm deletion warning
2. Type "DELETE ALL DATA" exactly

### Print Support
- Print quotes and invoices
- Includes business logo and details
- Clean, professional layout

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11+)

Requires modern browser with:
- ES6 modules support
- localStorage
- FileReader API (for image uploads)

## Data Backup

**Important**: Your data is stored locally in your browser. Always keep backups!

1. Go to Settings
2. Click "Export All Data (JSON)"
3. Save the file somewhere safe
4. To restore: Click "Import Data (JSON)" and select the file

## Troubleshooting

### "Failed to load module" error
- Make sure you're serving over HTTP, not opening file:// directly
- Use Live Server or a local HTTP server

### Data not persisting
- Check browser localStorage isn't disabled
- Check available storage space
- Try a different browser

### Images not uploading
- Max image size: 2MB
- Supported formats: JPG, PNG, GIF, WebP
- Large localStorage can slow down the app

### Module import errors
- Check all files are saved with UTF-8 encoding (no BOM)
- Verify file paths match exactly (case-sensitive)
- Clear browser cache and hard reload

## Future Enhancements

- [ ] Firebase integration for cloud sync
- [ ] Multi-user authentication
- [ ] Email quotes/invoices directly
- [ ] PDF export
- [ ] Recurring invoices
- [ ] Payment tracking
- [ ] Reports and analytics
- [ ] Mobile app version

## Support

For issues or questions:
1. Check browser console for errors (F12)
2. Verify all files are present and named correctly
3. Ensure you're using a local HTTP server
4. Check localStorage isn't full or disabled

## License

MIT License - Free to use and modify for personal or commercial use.

---

**Built with**: Pure HTML, CSS, and vanilla JavaScript ES6 modules  
**Storage**: localStorage (offline-capable)  
**No dependencies**: Zero npm packages, no build step required