import { showNotification } from './utils.js';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'newMessages') {
    // Show desktop notification for new messages
    showNotification(
      'New Messages',
      `You have ${message.count} new message${message.count > 1 ? 's' : ''} in ${message.email}`
    );
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('TempMail Tester installed');
  
  // Initialize storage
  chrome.storage.local.set({
    inboxes: [],
    autoRefreshEnabled: true,
    pollingInterval: 5000
  }).catch(error => {
    console.error('Failed to initialize storage:', error);
  });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('TempMail Tester started');
});