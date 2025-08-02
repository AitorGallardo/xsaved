/**
 * XSaved Extension v2 - Communication Utilities
 * Robust message passing between service worker, content scripts, and popup
 * Adapted from proven v1 extension with enhancements
 */

/**
 * Safely notify content script in a specific tab
 * @param {number} tabId - Tab ID to send message to
 * @param {Object} message - Message object to send
 * @returns {Promise} Promise that resolves with response or silently on error
 */
export const notifyContentScript = (tabId, message) => new Promise((resolve, reject) => {
  if (!tabId) {
    resolve(); // Don't reject, just resolve silently
    return;
  }
  
  // Check if tab exists first
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      // Tab doesn't exist, resolve silently
      console.log(`📱 Tab ${tabId} not found (normal during navigation)`);
      resolve();
      return;
    }
    
    // Check if tab is still valid (not chrome:// or extension pages)
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log(`📱 Tab ${tabId} not valid for messaging`);
      resolve();
      return;
    }
    
    // Tab exists and is valid, send message
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not available, resolve silently (common during navigation)
        console.log(`📱 Content script not available in tab ${tabId} (normal during reload/navigation)`);
        resolve();
      } else {
        console.log(`📱 Message sent to tab ${tabId}:`, message.action || 'unknown');
        resolve(response);
      }
    });
  });
});

/**
 * Safely notify popup (if open)
 * @param {Object} message - Message object to send
 */
export const notifyPopup = (message) => {
  try {
    chrome.runtime.sendMessage(message);
    console.log(`🪟 Message sent to popup:`, message.action || 'unknown');
  } catch (error) {
    // Popup might not be open, fail silently
    console.log(`🪟 Popup not available (normal when closed)`);
  }
};

/**
 * Update progress in content script with enhanced error handling
 * @param {number} current - Current progress count
 * @param {number} total - Total expected count
 * @param {number} tabId - Tab ID to notify
 * @param {Object} metadata - Additional progress metadata
 */
export const updateProgress = async (current, total, tabId, metadata = {}) => {
  if (!tabId) return;
  
  try {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const progressMessage = { 
      action: "updateProgress", 
      bookmarkCount: current,
      totalBookmarks: total,
      percentage: percentage,
      phase: metadata.phase || 'processing',
      message: metadata.message || `Processing ${current}/${total}...`,
      ...metadata
    };
    
    await notifyContentScript(tabId, progressMessage);
    
  } catch (error) {
    // Silently handle tab/content script errors
    console.log("📱 Tab unavailable for progress update (normal during long operations)");
  }
};

/**
 * Broadcast message to all X.com tabs
 * @param {Object} message - Message to broadcast
 * @param {Object} options - Broadcast options
 * @param {boolean} options.activeOnly - Only send to active tabs
 * @returns {Promise<Array>} Array of responses from tabs
 */
export const broadcastToXTabs = async (message, options = {}) => {
  const { activeOnly = false } = options;
  
  return new Promise((resolve) => {
    // Query for X.com tabs
    const queryOptions = { 
      url: ["https://twitter.com/*", "https://x.com/*"]
    };
    
    if (activeOnly) {
      queryOptions.active = true;
    }
    
    chrome.tabs.query(queryOptions, async (tabs) => {
      console.log(`📡 Broadcasting to ${tabs.length} X.com tabs:`, message.action || 'unknown');
      
      const responses = [];
      
      // Send to all matching tabs
      for (const tab of tabs) {
        try {
          const response = await notifyContentScript(tab.id, message);
          responses.push({ tabId: tab.id, response });
        } catch (error) {
          responses.push({ tabId: tab.id, error: error.message });
        }
      }
      
      resolve(responses);
    });
  });
};

/**
 * Send message with retry logic
 * @param {number} tabId - Tab ID to send message to
 * @param {Object} message - Message to send
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.retryDelay - Delay between retries in ms
 * @returns {Promise} Promise that resolves with response
 */
export const sendMessageWithRetry = async (tabId, message, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await notifyContentScript(tabId, message);
      return response;
      
    } catch (error) {
      console.warn(`🔄 Message retry ${attempt + 1}/${maxRetries} for tab ${tabId}`);
      
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

/**
 * Check if content script is available in tab
 * @param {number} tabId - Tab ID to check
 * @returns {Promise<boolean>} True if content script is available
 */
export const isContentScriptAvailable = async (tabId) => {
  try {
    const response = await notifyContentScript(tabId, { action: 'ping' });
    return !!response;
  } catch (error) {
    return false;
  }
};

/**
 * Get active X.com tab ID
 * @returns {Promise<number|null>} Active X.com tab ID or null
 */
export const getActiveXTabId = async () => {
  return new Promise((resolve) => {
    chrome.tabs.query({ 
      active: true, 
      currentWindow: true,
      url: ["https://twitter.com/*", "https://x.com/*"]
    }, (tabs) => {
      resolve(tabs.length > 0 ? tabs[0].id : null);
    });
  });
};

/**
 * Wait for content script to be ready in tab
 * @param {number} tabId - Tab ID to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if content script becomes available
 */
export const waitForContentScript = async (tabId, timeout = 10000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isContentScriptAvailable(tabId)) {
      return true;
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
};

/**
 * Enhanced state update broadcaster with filtering
 * @param {Object} state - State object to broadcast
 * @param {Object} options - Broadcast options
 * @param {Array} options.includeActions - Only send to tabs expecting these actions
 * @param {boolean} options.onlyActiveTab - Only send to active tab
 */
export const broadcastStateUpdate = async (state, options = {}) => {
  const { includeActions = [], onlyActiveTab = false } = options;
  
  const stateMessage = {
    action: "stateUpdate",
    ...state,
    timestamp: Date.now()
  };
  
  try {
    if (onlyActiveTab) {
      const activeTabId = await getActiveXTabId();
      if (activeTabId) {
        await notifyContentScript(activeTabId, stateMessage);
      }
    } else {
      await broadcastToXTabs(stateMessage);
    }
    
    // Also notify popup
    notifyPopup(stateMessage);
    
  } catch (error) {
    console.error('❌ Error broadcasting state update:', error);
  }
};

/**
 * Message queue for handling high-frequency updates
 */
class MessageQueue {
  constructor(options = {}) {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.processInterval = options.processInterval || 100;
  }
  
  /**
   * Add message to queue
   * @param {number} tabId - Tab ID
   * @param {Object} message - Message to queue
   */
  enqueue(tabId, message) {
    // Prevent queue overflow
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('📬 Message queue full, dropping oldest message');
      this.queue.shift();
    }
    
    this.queue.push({ tabId, message, timestamp: Date.now() });
    this.processQueue();
  }
  
  /**
   * Process queued messages
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { tabId, message } = this.queue.shift();
      
      try {
        await notifyContentScript(tabId, message);
      } catch (error) {
        console.warn('📬 Queued message failed:', error.message);
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, this.processInterval));
    }
    
    this.processing = false;
  }
}

// Global message queue instance
export const messageQueue = new MessageQueue();

/**
 * Queue message for delivery (useful for high-frequency updates)
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message to queue
 */
export const queueMessage = (tabId, message) => {
  messageQueue.enqueue(tabId, message);
};

/**
 * Heartbeat system to maintain connection with content scripts
 */
class HeartbeatManager {
  constructor() {
    this.connectedTabs = new Set();
    this.heartbeatInterval = null;
  }
  
  start() {
    if (this.heartbeatInterval) return;
    
    console.log('💓 Starting heartbeat manager');
    
    this.heartbeatInterval = setInterval(async () => {
      await this.checkConnections();
    }, 30000); // Check every 30 seconds
  }
  
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💓 Heartbeat manager stopped');
    }
  }
  
  async checkConnections() {
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ url: ["https://twitter.com/*", "https://x.com/*"] }, resolve);
    });
    
    for (const tab of tabs) {
      const isConnected = await isContentScriptAvailable(tab.id);
      
      if (isConnected) {
        this.connectedTabs.add(tab.id);
      } else {
        this.connectedTabs.delete(tab.id);
      }
    }
    
    console.log(`💓 Heartbeat: ${this.connectedTabs.size} content scripts connected`);
  }
  
  isTabConnected(tabId) {
    return this.connectedTabs.has(tabId);
  }
}

// Global heartbeat manager
export const heartbeatManager = new HeartbeatManager();

console.log('📡 XSaved v2 Communicator utility loaded - ready for message passing'); 