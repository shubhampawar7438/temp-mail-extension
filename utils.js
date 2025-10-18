/**
 * Utility functions for the TempMail extension
 */

// API base URL - mail.tm API endpoint
const API_BASE_URL = 'https://api.mail.tm';

/**
 * Make an API request to the temp mail service
 * @param {string} endpoint - API endpoint (e.g., '/accounts')
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {object} body - Request body for POST/PUT requests
 * @param {string} token - Bearer token for authentication
 * @returns {Promise<object>} - Parsed JSON response
 */
export async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  // Add authentication header if token is provided
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    // Handle rate limiting
    if (response.status === 429) {
      throw new Error('Rate limited by API');
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Some endpoints return 204 No Content (delete operations)
    if (response.status === 204) {
      return {};
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get available domains
 * @returns {Promise<Array>} - Array of domains
 */
export async function getDomains() {
  const response = await apiRequest('/domains?page=1');
  return response['hydra:member'] || [];
}

/**
 * Create a new account
 * @param {string} address - Email address
 * @param {string} password - Account password
 * @returns {Promise<object>} - Account information
 */
export async function createAccount(address, password) {
  return await apiRequest('/accounts', 'POST', { address, password });
}

/**
 * Get authentication token
 * @param {string} address - Email address
 * @param {string} password - Account password
 * @returns {Promise<object>} - Token information
 */
export async function getToken(address, password) {
  return await apiRequest('/token', 'POST', { address, password });
}

/**
 * Create a new temporary inbox
 * @returns {Promise<{id: string, email: string, password: string, token: string}>} - Inbox details
 */
export async function createInbox() {
  try {
    // Get available domains
    const domains = await getDomains();
    if (domains.length === 0) {
      throw new Error('No domains available');
    }
    
    // Generate a random username
    const username = 'user' + Math.random().toString(36).substring(2, 10);
    const domain = domains[0].domain;
    const email = `${username}@${domain}`;
    const password = 'TempMail' + Math.random().toString(36).substring(2, 12);
    
    // Create account
    const account = await createAccount(email, password);
    
    // Get authentication token
    const tokenData = await getToken(email, password);
    
    return {
      id: account.id,
      email: email,
      password: password,
      token: tokenData.token
    };
  } catch (error) {
    console.error('Failed to create inbox:', error);
    throw error;
  }
}

/**
 * Get messages for a specific inbox
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of messages
 */
export async function getMessages(token) {
  try {
    const response = await apiRequest('/messages?page=1', 'GET', null, token);
    return response['hydra:member'] || [];
  } catch (error) {
    console.error('Failed to get messages:', error);
    throw error;
  }
}

/**
 * Get a specific message
 * @param {string} messageId - Message ID
 * @param {string} token - Authentication token
 * @returns {Promise<object>} - Message details
 */
export async function getMessage(messageId, token) {
  try {
    return await apiRequest(`/messages/${messageId}`, 'GET', null, token);
  } catch (error) {
    console.error('Failed to get message:', error);
    throw error;
  }
}

/**
 * Delete an inbox
 * @param {string} accountId - The ID of the account to delete
 * @param {string} token - Authentication token
 */
export async function deleteInbox(accountId, token) {
  try {
    await apiRequest(`/accounts/${accountId}`, 'DELETE', null, token);
  } catch (error) {
    console.error('Failed to delete inbox:', error);
    throw error;
  }
}

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date string
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

/**
 * Show a desktop notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
export function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title,
    message
  });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

/**
 * Exponential backoff function
 * @param {number} attempt - Current attempt number
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} - Delay in milliseconds
 */
export function exponentialBackoff(attempt, baseDelay = 1000) {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}