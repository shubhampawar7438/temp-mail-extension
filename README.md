# TempMail Tester Chrome Extension

A Chrome extension for testing temporary email services with the mail.tm API.

## Features

- Create temporary email inboxes
- View messages in each inbox
- Multiple inboxes as tabs
- Auto-refresh with configurable intervals (5s, 10s, 30s)
- Desktop notifications for new messages
- Copy email addresses with one click
- Open messages in a separate tab
- Delete inboxes when done
- Enhanced UI with modern design

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should now appear in your Chrome toolbar

## Usage

1. Click the extension icon in the toolbar
2. Click "New Inbox" to create a temporary email address
3. Your inbox will appear as a tab at the top
4. Messages will automatically appear in the inbox
5. Use the controls to:
   - Create additional inboxes
   - Toggle auto-refresh on/off
   - Change polling interval
   - Copy email addresses
   - Delete inboxes
   - Open messages in a new tab

## API Configuration

To use a different temporary email service:

1. Open [utils.js](utils.js)
2. Modify the `API_BASE_URL` constant to point to your service
3. Adjust the API endpoints in the functions:
   - `createInbox()` - endpoint for creating new inboxes
   - `getMessages()` - endpoint for retrieving messages
   - `deleteInbox()` - endpoint for deleting inboxes

## Permissions

This extension requires the following permissions:
- `storage` - To save inboxes and settings locally
- `notifications` - To show desktop notifications for new messages
- `alarms` - For background polling (optional)
- `https://api.mail.tm/*` - To communicate with the mail.tm API

## Files

- `manifest.json` - Extension configuration
- `popup.html/css/js` - Main UI for managing inboxes
- `background.js` - Background service worker for notifications
- `utils.js` - Helper functions for API communication
- `styles.css` - Styling for all UI components
- `icon*.png` - Extension icons

## Testing

To run the tests:

1. Ensure you have Node.js installed
2. Install testing dependencies:
   ```bash
   npm install
   ```
3. Run the tests:
   ```bash
   npm test
   ```

## Security & Privacy

- No data is sent to any server except the configured mail API
- All data is stored locally in Chrome's storage
- Message contents are not logged to the console in production
- Minimal permissions are requested

## UI Enhancements

The extension now features:
- Modern, clean design with improved visual hierarchy
- Professional icons (Font Awesome) throughout the interface
- Custom email-themed logo for browser taskbar
- Enhanced message viewing with proper HTML rendering
- Better loading states with spinners
- Improved empty states with icons
- Hover effects and subtle animations
- Responsive design that works on different screen sizes
- Better error handling with user-friendly messages
- Window management controls (minimize, expand, close)