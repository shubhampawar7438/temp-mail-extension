import { createInbox, getMessages, getMessage, deleteInbox, formatDate, copyToClipboard } from './utils.js';

// DOM elements
const newInboxBtn = document.getElementById('newInboxBtn');
const toggleAutoRefreshBtn = document.getElementById('toggleAutoRefresh');
const pollingIntervalSelect = document.getElementById('pollingInterval');
const tabsContainer = document.getElementById('tabs');
const tabContent = document.getElementById('tabContent');
const messageList = document.getElementById('messageList');
const statusElement = document.getElementById('status');
const minimizeBtn = document.getElementById('minimizeBtn');
const expandBtn = document.getElementById('expandBtn');
const closeBtn = document.getElementById('closeBtn');

// State
let inboxes = [];
let currentInboxId = null;
let autoRefreshEnabled = true;
let pollingInterval = 5000; // Default 5 seconds
let pollingTimers = {};
let isExpanded = false;

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  setupEventListeners();
  setupWindowControls();
  await loadInboxes();
  renderTabs();
  
  // If we have inboxes, select the first one
  if (inboxes.length > 0) {
    selectInbox(inboxes[0].id);
  } else {
    showEmptyState();
  }
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['autoRefreshEnabled', 'pollingInterval']);
    autoRefreshEnabled = result.autoRefreshEnabled !== false; // Default to true
    pollingInterval = result.pollingInterval || 5000; // Default to 5 seconds
    
    // Update UI to reflect settings
    toggleAutoRefreshBtn.textContent = `Auto Refresh: ${autoRefreshEnabled ? 'ON' : 'OFF'}`;
    pollingIntervalSelect.value = pollingInterval;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    await chrome.storage.local.set({
      autoRefreshEnabled,
      pollingInterval
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  newInboxBtn.addEventListener('click', createNewInbox);
  
  toggleAutoRefreshBtn.addEventListener('click', () => {
    autoRefreshEnabled = !autoRefreshEnabled;
    toggleAutoRefreshBtn.textContent = `Auto Refresh: ${autoRefreshEnabled ? 'ON' : 'OFF'}`;
    saveSettings();
    
    // Update all polling timers
    inboxes.forEach(inbox => {
      if (autoRefreshEnabled) {
        startPolling(inbox.id);
      } else {
        stopPolling(inbox.id);
      }
    });
  });
  
  pollingIntervalSelect.addEventListener('change', () => {
    pollingInterval = parseInt(pollingIntervalSelect.value);
    saveSettings();
    
    // Restart polling for all inboxes with new interval
    inboxes.forEach(inbox => {
      if (autoRefreshEnabled) {
        stopPolling(inbox.id);
        startPolling(inbox.id);
      }
    });
  });
}

// Set up window controls
function setupWindowControls() {
  minimizeBtn.addEventListener('click', () => {
    // Minimize by reducing the size
    document.body.style.width = '320px';
    document.body.style.height = '400px';
    isExpanded = false;
    expandBtn.innerHTML = '<i class="fas fa-expand"></i>'; // Square for expand
  });
  
  expandBtn.addEventListener('click', () => {
    if (isExpanded) {
      // Collapse to normal size
      document.body.style.width = '600px';
      document.body.style.height = '700px';
      isExpanded = false;
      expandBtn.innerHTML = '<i class="fas fa-expand"></i>'; // Square for expand
    } else {
      // Expand to larger size
      document.body.style.width = '800px';
      document.body.style.height = '800px';
      isExpanded = true;
      expandBtn.innerHTML = '<i class="fas fa-compress"></i>'; // Collapse icon
    }
  });
  
  closeBtn.addEventListener('click', () => {
    // Close the popup by focusing on the window and then blurring
    window.close();
  });
}

// Load inboxes from storage
async function loadInboxes() {
  try {
    const result = await chrome.storage.local.get(['inboxes']);
    inboxes = result.inboxes || [];
  } catch (error) {
    console.error('Failed to load inboxes:', error);
    inboxes = [];
  }
}

// Save inboxes to storage
async function saveInboxes() {
  try {
    await chrome.storage.local.set({ inboxes });
  } catch (error) {
    console.error('Failed to save inboxes:', error);
  }
}

// Create a new inbox
async function createNewInbox() {
  try {
    setStatus('Creating new inbox...');
    // Show loading state
    messageList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><i class="fas fa-envelope"></i> Creating your temporary inbox...</div>';
    
    const inboxData = await createInbox();
    
    const newInbox = {
      id: inboxData.id,
      email: inboxData.email,
      password: inboxData.password, // Store password for authentication
      token: inboxData.token,       // Store token for API requests
      messages: [],
      unreadCount: 0,
      lastError: null,
      errorCount: 0
    };
    
    inboxes.push(newInbox);
    await saveInboxes();
    renderTabs();
    selectInbox(newInbox.id);
    setStatus('Inbox created successfully! 🎉');
    
    // Start polling for this inbox
    if (autoRefreshEnabled) {
      startPolling(newInbox.id);
    }
  } catch (error) {
    setStatus(`Error creating inbox: ${error.message}`);
    messageList.innerHTML = `
      <div class="error">
        <i class="fas fa-exclamation-circle"></i> Failed to create inbox: ${error.message}
      </div>
      <button id="retryBtn" class="btn-primary"><i class="fas fa-redo"></i> Try Again</button>
    `;
    document.getElementById('retryBtn').addEventListener('click', createNewInbox);
    console.error('Failed to create inbox:', error);
  }
}

// Delete an inbox
async function deleteInboxUI(inboxId) {
  try {
    setStatus('Deleting inbox...');
    const inbox = inboxes.find(i => i.id === inboxId);
    if (inbox) {
      await deleteInbox(inbox.id, inbox.token);
    }
    
    // Stop polling for this inbox
    stopPolling(inboxId);
    
    // Remove from inboxes array
    inboxes = inboxes.filter(inbox => inbox.id !== inboxId);
    await saveInboxes();
    
    // If we deleted the current inbox, select another one
    if (currentInboxId === inboxId) {
      if (inboxes.length > 0) {
        selectInbox(inboxes[0].id);
      } else {
        currentInboxId = null;
        showEmptyState();
        // Hide active inbox header when no inboxes
        document.getElementById('activeInboxHeader').classList.remove('active');
      }
    }
    
    renderTabs();
    setStatus('Inbox deleted successfully');
  } catch (error) {
    setStatus(`Error deleting inbox: ${error.message}`);
    console.error('Failed to delete inbox:', error);
  }
}

// Select an inbox to view
function selectInbox(inboxId) {
  currentInboxId = inboxId;
  renderTabs();
  loadMessages(inboxId);
  showActiveInboxHeader(inboxId);
}

// Show active inbox header with email and actions
function showActiveInboxHeader(inboxId) {
  const activeInboxHeader = document.getElementById('activeInboxHeader');
  const activeInboxEmail = document.getElementById('activeInboxEmail');
  const copyEmailBtn = document.getElementById('copyEmailBtn');
  const deleteInboxBtn = document.getElementById('deleteInboxBtn');
  
  const inbox = inboxes.find(i => i.id === inboxId);
  if (inbox) {
    activeInboxHeader.classList.add('active');
    activeInboxEmail.textContent = inbox.email;
    
    // Remove existing event listeners to prevent duplicates
    const newCopyBtn = copyEmailBtn.cloneNode(true);
    copyEmailBtn.parentNode.replaceChild(newCopyBtn, copyEmailBtn);
    const newDeleteBtn = deleteInboxBtn.cloneNode(true);
    deleteInboxBtn.parentNode.replaceChild(newDeleteBtn, deleteInboxBtn);
    
    // Add event listeners
    newCopyBtn.addEventListener('click', () => {
      copyToClipboard(inbox.email);
      setStatus('Email copied to clipboard ✅');
    });
    
    newDeleteBtn.addEventListener('click', () => {
      if (confirm(`Delete inbox ${inbox.email}?`)) {
        deleteInboxUI(inboxId);
      }
    });
  } else {
    activeInboxHeader.classList.remove('active');
  }
}

// Render tabs for all inboxes
function renderTabs() {
  tabsContainer.innerHTML = '';
  
  if (inboxes.length === 0) {
    // Hide active inbox header when no inboxes
    document.getElementById('activeInboxHeader').classList.remove('active');
    return;
  }
  
  inboxes.forEach((inbox, index) => {
    const tab = document.createElement('div');
    tab.className = `tab ${inbox.id === currentInboxId ? 'active' : ''} ${inbox.unreadCount > 0 ? 'unread' : ''}`;
    tab.dataset.id = inbox.id;
    
    // Show serial number in tab title instead of email
    const tabNumber = document.createElement('span');
    tabNumber.textContent = `Inbox ${index + 1}`;
    tabNumber.className = 'tab-number';
    
    tab.appendChild(tabNumber);
    tab.addEventListener('click', () => selectInbox(inbox.id));
    
    tabsContainer.appendChild(tab);
  });
}

// Load messages for an inbox
async function loadMessages(inboxId) {
  const inbox = inboxes.find(i => i.id === inboxId);
  if (!inbox) return;
  
  try {
    setStatus('Loading messages...');
    // Show loading state in message list
    messageList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><i class="fas fa-envelope-open"></i> Loading messages...</div>';
    
    const messages = await getMessages(inbox.token);
    
    // Update inbox with new messages
    const oldUnreadCount = inbox.unreadCount;
    inbox.messages = messages;
    inbox.unreadCount = messages.filter(m => !m.seen).length; // mail.tm uses 'seen' instead of 'read'
    inbox.lastError = null;
    inbox.errorCount = 0;
    
    // Show notification if new messages arrived
    if (inbox.unreadCount > oldUnreadCount) {
      const newMessages = inbox.unreadCount - oldUnreadCount;
      chrome.runtime.sendMessage({
        type: 'newMessages',
        inboxId,
        email: inbox.email,
        count: newMessages
      });
    }
    
    await saveInboxes();
    renderMessages(inboxId);
    setStatus('Messages loaded');
  } catch (error) {
    setStatus(`Error loading messages: ${error.message}`);
    inbox.lastError = error.message;
    inbox.errorCount = (inbox.errorCount || 0) + 1;
    await saveInboxes();
    renderMessages(inboxId);
    console.error('Failed to load messages:', error);
  }
}

// Render messages for the current inbox
function renderMessages(inboxId) {
  const inbox = inboxes.find(i => i.id === inboxId);
  if (!inbox) return;
  
  if (inbox.lastError) {
    messageList.innerHTML = `
      <div class="error">
        <i class="fas fa-exclamation-circle"></i> Error loading messages: ${inbox.lastError}
        ${inbox.errorCount > 1 ? `(Attempt ${inbox.errorCount})` : ''}
      </div>
      <button id="refreshBtn" class="btn-primary"><i class="fas fa-redo"></i> Retry</button>
    `;
    document.getElementById('refreshBtn').addEventListener('click', () => {
      loadMessages(inboxId);
    });
    return;
  }
  
  if (inbox.messages.length === 0) {
    messageList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
        <p>No messages yet.</p>
        <p>Check back later or manually refresh.</p>
        <button id="refreshBtn" class="btn-primary"><i class="fas fa-sync"></i> Refresh</button>
      </div>
    `;
    document.getElementById('refreshBtn').addEventListener('click', () => {
      loadMessages(inboxId);
    });
    return;
  }
  
  messageList.innerHTML = inbox.messages.map(message => `
    <div class="message-item">
      <div class="message-header">
        <div class="message-subject">${escapeHtml(message.subject || '(No subject)')}</div>
        <div class="message-date">${formatDate(message.createdAt || message.date)}</div>
      </div>
      <div class="message-from"><i class="fas fa-user"></i> From: ${escapeHtml(message.from ? (message.from.address || message.from.name || message.from || 'Unknown') : 'Unknown')}</div>
      <div class="message-preview"><i class="fas fa-envelope-open-text"></i> ${escapeHtml(message.intro || message.text || message.preview || 'No preview available')}</div>
      <div class="message-actions">
        <button class="btn-copy" data-email="${escapeHtml(inbox.email)}"><i class="fas fa-copy"></i> Copy Email</button>
        <button class="btn-open" data-message-id="${message.id}" data-inbox-id="${inboxId}"><i class="fas fa-external-link-alt"></i> Open</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to buttons
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      copyToClipboard(btn.dataset.email);
      setStatus('Email copied to clipboard');
    });
  });
  
  document.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', () => {
      // Show message detail within the popup instead of opening a new tab
      showMessageDetail(btn.dataset.messageId, btn.dataset.inboxId);
    });
  });
}

// Show message detail within the popup
async function showMessageDetail(messageId, inboxId) {
  const inbox = inboxes.find(i => i.id === inboxId);
  if (!inbox) {
    setStatus('Inbox not found');
    return;
  }
  
  try {
    setStatus('Loading message...');
    // Show loading state
    messageList.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading message...</div>';
    
    // Get the specific message using the token
    const message = await getMessage(messageId, inbox.token);
    
    if (!message) {
      showMessageError('Message not found');
      return;
    }
    
    // Display message details within the popup
    messageList.innerHTML = `
      <div class="message-detail">
        <div class="message-detail-header">
          <button id="backBtn" class="btn-secondary"><i class="fas fa-arrow-left"></i> Back to Messages</button>
          <h2 class="message-detail-subject"><i class="fas fa-envelope"></i> ${escapeHtml(message.subject || '(No subject)')}</h2>
          <div class="message-detail-meta">
            <div class="message-detail-from"><i class="fas fa-user"></i> From: ${escapeHtml(message.from ? (message.from.address || message.from.name || message.from || 'Unknown') : 'Unknown')}</div>
            <div class="message-detail-date"><i class="far fa-calendar-alt"></i> Date: ${formatDate(message.createdAt || message.date)}</div>
          </div>
          <div class="message-detail-actions">
            <button id="copySenderBtn" class="btn-primary"><i class="fas fa-copy"></i> Copy Sender Email</button>
          </div>
        </div>
        <div class="message-detail-content">
          ${(message.html && Array.isArray(message.html)) ? 
            `<div class="rendered-html">${message.html.join('')}</div>` : 
            (message.html && typeof message.html === 'string') ? 
            `<div class="rendered-html">${message.html}</div>` : 
            `<pre class="plain-text">${escapeHtml(message.text || 'No content available')}</pre>`}
        </div>
      </div>
    `;
    
    // Add event listeners for the detail view
    document.getElementById('backBtn').addEventListener('click', () => {
      renderMessages(inboxId);
    });
    
    const copySenderBtn = document.getElementById('copySenderBtn');
    const senderAddress = message.from && (message.from.address || (typeof message.from === 'string' ? message.from : null));
    if (senderAddress) {
      copySenderBtn.addEventListener('click', () => {
        copyToClipboard(senderAddress);
        const originalText = copySenderBtn.innerHTML;
        copySenderBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          copySenderBtn.innerHTML = originalText;
        }, 2000);
      });
    } else {
      copySenderBtn.style.display = 'none';
    }
    
    setStatus('Message loaded');
  } catch (error) {
    showMessageError(`Failed to load message: ${error.message}`);
    console.error('Error loading message:', error);
  }
}

function showMessageError(message) {
  messageList.innerHTML = `
    <div class="error">
      <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(message)}
    </div>
    <button id="backBtn" class="btn-secondary"><i class="fas fa-arrow-left"></i> Back to Messages</button>
  `;
  document.getElementById('backBtn').addEventListener('click', () => {
    const inbox = inboxes.find(i => i.id === currentInboxId);
    if (inbox) {
      renderMessages(currentInboxId);
    }
  });
}

// Show empty state when no inboxes exist
function showEmptyState() {
  tabsContainer.innerHTML = '';
  messageList.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
      <p>No inboxes created yet.</p>
      <p>Click "New Inbox" to create your first temporary email address.</p>
    </div>
  `;
  // Hide active inbox header when no inboxes
  document.getElementById('activeInboxHeader').classList.remove('active');
}

// Start polling for an inbox
function startPolling(inboxId) {
  // Clear any existing timer for this inbox
  stopPolling(inboxId);
  
  // Set up new polling timer
  pollingTimers[inboxId] = setTimeout(async function poll() {
    // Only poll if auto-refresh is enabled and we're not on the new inbox page
    if (autoRefreshEnabled && inboxes.some(i => i.id === inboxId)) {
      // If this is the current inbox, reload messages
      if (currentInboxId === inboxId) {
        await loadMessages(inboxId);
      }
      
      // Schedule next poll
      pollingTimers[inboxId] = setTimeout(poll, pollingInterval);
    }
  }, pollingInterval);
}

// Stop polling for an inbox
function stopPolling(inboxId) {
  if (pollingTimers[inboxId]) {
    clearTimeout(pollingTimers[inboxId]);
    delete pollingTimers[inboxId];
  }
}

// Set status message
function setStatus(message) {
  statusElement.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}