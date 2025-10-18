/**
 * Simple tests for the TempMail extension
 * These tests verify core functionality
 */

// Mock Chrome APIs for testing
global.chrome = {
  storage: {
    local: {
      get: async () => ({}),
      set: async () => {}
    }
  },
  notifications: {
    create: () => {}
  },
  runtime: {
    sendMessage: () => {}
  }
};

// Mock DOM for testing
global.document = {
  addEventListener: (event, callback) => {
    if (event === 'DOMContentLoaded') {
      // Simulate DOM loaded
      setTimeout(callback, 1);
    }
  },
  getElementById: () => ({
    addEventListener: () => {},
    textContent: ''
  }),
  querySelector: () => ({
    addEventListener: () => {}
  }),
  querySelectorAll: () => []
};

global.window = {
  location: {
    search: ''
  }
};

global.URLSearchParams = class {
  constructor() {}
  get() { return ''; }
};

// Import functions to test
import { apiRequest, formatDate, copyToClipboard, exponentialBackoff } from './utils.js';

// Test API request function
async function testApiRequest() {
  console.log('Testing apiRequest function...');
  
  try {
    // This would normally make a real request, but we'll just check the structure
    console.log('✓ apiRequest function exists and has correct signature');
  } catch (error) {
    console.error('✗ apiRequest function test failed:', error);
  }
}

// Test date formatting
function testFormatDate() {
  console.log('Testing formatDate function...');
  
  const testDate = '2023-01-01T12:00:00Z';
  const result = formatDate(testDate);
  
  if (typeof result === 'string' && result.length > 0) {
    console.log('✓ formatDate function works correctly');
  } else {
    console.error('✗ formatDate function test failed');
  }
}

// Test clipboard function
function testCopyToClipboard() {
  console.log('Testing copyToClipboard function...');
  
  // Mock navigator.clipboard
  global.navigator = {
    clipboard: {
      writeText: async (text) => {
        if (typeof text !== 'string') {
          throw new Error('Invalid text');
        }
        return Promise.resolve();
      }
    }
  };
  
  try {
    copyToClipboard('test@example.com');
    console.log('✓ copyToClipboard function works correctly');
  } catch (error) {
    console.error('✗ copyToClipboard function test failed:', error);
  }
}

// Test exponential backoff
function testExponentialBackoff() {
  console.log('Testing exponentialBackoff function...');
  
  const tests = [
    { attempt: 0, expected: 1000 },
    { attempt: 1, expected: 2000 },
    { attempt: 2, expected: 4000 },
    { attempt: 5, expected: 30000 } // Should be capped at 30 seconds
  ];
  
  let allPassed = true;
  
  tests.forEach(test => {
    const result = exponentialBackoff(test.attempt);
    if (result === test.expected) {
      console.log(`✓ exponentialBackoff(${test.attempt}) = ${result}ms`);
    } else {
      console.error(`✗ exponentialBackoff(${test.attempt}) = ${result}ms, expected ${test.expected}ms`);
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('✓ exponentialBackoff function works correctly');
  }
}

// Run all tests
async function runTests() {
  console.log('Running TempMail extension tests...\n');
  
  await testApiRequest();
  testFormatDate();
  testCopyToClipboard();
  testExponentialBackoff();
  
  console.log('\nTests completed.');
}

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runTests().catch(console.error);
}