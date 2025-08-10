# Debug Page Usage Guide

## Overview
The XSaved v2 extension includes a dedicated debug page that provides easy access to IndexDB for debugging purposes. This solves the common Chrome extension issue where IndexDB is not visible in service worker DevTools.

## Quick Access Methods

### 1. Right-Click Extension Icon (Recommended)
- Right-click on the XSaved extension icon in your browser toolbar
- Select "🔧 Open Debug Page" from the context menu
- The debug page will open in a new tab

### 2. From Extension Popup
- Click the XSaved extension icon to open the popup
- Click the "🔧 Debug Mode" button at the bottom
- The debug page will open in a new tab

### 3. Keyboard Shortcut
- Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
- This opens the extension popup, then click "🔧 Debug Mode"

## Using the Debug Page

### Opening DevTools
**🚀 DevTools opens automatically!** When the debug page loads, it will attempt to open DevTools automatically.

**Manual fallback (if auto-open fails):**
1. Right-click anywhere on the page and select "Inspect" (or press F12)
2. DevTools will open with the debug page context

### Accessing IndexDB
1. In DevTools, go to the **Application** tab
2. Expand **Storage** → **IndexedDB**
3. You should see your XSaved database with all tables
4. Browse through the object stores and indexes

### Console Access
- Use the **Console** tab in DevTools to run database queries
- The debug page provides test buttons to verify database functionality
- All console logs will appear in the DevTools console

## Debug Features

### Database Status
- Real-time connection status
- Total bookmarks count
- Total tags count
- Storage usage information

### Service Worker Status
- Current service worker state
- Last sync timestamp
- Next scheduled sync

### Debug Actions
- **Test Database Query**: Runs a sample search query
- **Clear Console**: Clears the DevTools console

## Why This Approach Works

Chrome extensions have limitations with IndexDB visibility in service worker DevTools. The debug page works because:

**🚀 Auto-DevTools Feature:**
- Automatically attempts to open DevTools when the page loads
- Uses Chrome's debugger API for seamless integration
- Falls back to manual instructions if auto-open fails
- Provides multiple methods for DevTools access

1. **Same Context**: It runs in the same extension context as the popup
2. **IndexDB Access**: Has full access to the extension's IndexDB
3. **DevTools Support**: Standard HTML page that DevTools can fully inspect
4. **Real-time Updates**: Shows live data from the service worker

## Troubleshooting

### Debug Page Not Loading
- Ensure the extension is properly installed and enabled
- Check that all files were built correctly
- Try reloading the extension

### IndexDB Not Visible
- Make sure you're inspecting the debug page, not the service worker
- Verify DevTools is open on the debug page tab
- Check the Application tab → Storage → IndexedDB

### Database Connection Issues
- The debug page will show connection status
- Check the service worker console for any errors
- Verify the extension has proper permissions

## Development Notes

- The debug page reuses the same database access patterns as the popup
- All database operations are logged to the console for debugging
- The page automatically refreshes data every 30 seconds
- Error messages are displayed prominently for easy identification
