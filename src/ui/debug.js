/**
 * XSaved Extension v2 - Debug Interface
 * Provides IndexDB debugging capabilities with minimal UI
 */

class XSavedDebug {
  constructor() {
    this.isInitialized = false;
    
    // DOM elements
    this.dbConnection = document.getElementById('dbConnection');
    this.bookmarkCount = document.getElementById('bookmarkCount');
    this.tagCount = document.getElementById('tagCount');
    this.storageUsed = document.getElementById('storageUsed');
    this.swState = document.getElementById('swState');
    this.lastSync = document.getElementById('lastSync');
    this.nextSync = document.getElementById('nextSync');
    this.errorMessage = document.getElementById('errorMessage');
    this.successMessage = document.getElementById('successMessage');
    this.testQueryBtn = document.getElementById('testQueryBtn');
    this.clearConsoleBtn = document.getElementById('clearConsoleBtn');
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initializing XSaved v2 Debug Interface...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      this.isInitialized = true;
      console.log('✅ Debug interface initialized successfully');
      
      // Show success message
      this.showSuccess('Debug interface ready! DevTools should open automatically.');
      
      // Auto-open DevTools
      this.autoOpenDevTools();
      
    } catch (error) {
      console.error('❌ Debug interface initialization failed:', error);
      this.showError('Failed to initialize debug interface: ' + error.message);
    }
  }

  setupEventListeners() {
    // Test query button
    this.testQueryBtn.addEventListener('click', () => this.runTestQuery());
    
    // Clear console button
    this.clearConsoleBtn.addEventListener('click', () => this.clearConsole());
    
    // Listen for service worker state updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'stateUpdate') {
        this.handleStateUpdate(message);
      }
    });
  }

  async loadInitialData() {
    try {
      // Get service worker state and stats
      await this.updateStats();
      await this.updateStatus();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      this.showError('Failed to load data from service worker');
    }
  }

  async updateStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      if (response && response.success) {
        this.renderStats(response.stats);
        this.hideError();
      } else {
        throw new Error(response?.error || 'Failed to get stats');
      }
      
    } catch (error) {
      console.error('❌ Error updating stats:', error);
      this.showError('Failed to load statistics');
      this.renderStats(null);
    }
  }

  renderStats(stats) {
    if (!stats) {
      this.bookmarkCount.textContent = '-';
      this.tagCount.textContent = '-';
      this.storageUsed.textContent = '-';
      this.dbConnection.textContent = '❌ Error';
      return;
    }

    // Main stats
    this.bookmarkCount.textContent = this.formatNumber(stats.totalBookmarks || 0);
    this.tagCount.textContent = this.formatNumber(stats.totalTags || 0);
    this.storageUsed.textContent = this.formatBytes(stats.storageUsed || 0);
    
    // Database connection status
    this.dbConnection.textContent = stats.totalBookmarks !== undefined ? '✅ Connected' : '❌ Error';
  }

  async updateStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getState' });
      
      if (response && response.success) {
        this.renderStatus(response.state);
      }
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      this.renderStatus({ isRunning: false, error: 'Communication error' });
    }
  }

  renderStatus(state) {
    if (!state) {
      this.setStatus('Unknown', '-', '-');
      return;
    }

    if (state.error) {
      this.setStatus('Error', '-', '-');
      return;
    }

    if (state.isRunning) {
      this.setStatus('Active', 'Running', 'Active');
    } else {
      this.setStatus('Idle', 
        state.lastSync ? this.formatRelativeTime(state.lastSync) : 'Never',
        state.nextRun ? this.formatRelativeTime(state.nextRun) : '-'
      );
    }
  }

  setStatus(swState, lastSync, nextSync) {
    this.swState.textContent = swState;
    this.lastSync.textContent = lastSync;
    this.nextSync.textContent = nextSync;
  }

  async runTestQuery() {
    try {
      console.log('🧪 Running test database query...');
      
      // Test a simple search query
      const response = await chrome.runtime.sendMessage({
        action: 'searchBookmarks',
        query: {
          text: 'test',
          limit: 5
        }
      });
      
      if (response && response.success) {
        const result = response.result;
        console.log('✅ Test query successful:', result);
        this.showSuccess(`Test query successful! Found ${result?.results?.length || 0} results. Check console for details.`);
      } else {
        throw new Error(response?.error || 'Test query failed');
      }
      
    } catch (error) {
      console.error('❌ Test query failed:', error);
      this.showError('Test query failed: ' + error.message);
    }
  }

  clearConsole() {
    console.clear();
    console.log('🧹 Console cleared');
    this.showSuccess('Console cleared!');
  }

  handleStateUpdate(message) {
    // Real-time updates from service worker
    if (message.extractionState) {
      this.renderStatus(message.extractionState);
    }
    
    // Refresh stats if extraction completed
    if (message.extractionState?.phase === 'idle' && !message.isExtracting) {
      setTimeout(() => this.updateStats(), 1000);
    }
  }

  startPeriodicUpdates() {
    // Update stats every 30 seconds
    setInterval(() => {
      if (this.isInitialized) {
        this.updateStats();
        this.updateStatus();
      }
    }, 30000);
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
    this.successMessage.style.display = 'none';
    
    // Auto-hide after 8 seconds
    setTimeout(() => this.hideError(), 8000);
  }

  showSuccess(message) {
    this.successMessage.textContent = message;
    this.successMessage.style.display = 'block';
    this.errorMessage.style.display = 'none';
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideSuccess(), 5000);
  }

  hideError() {
    this.errorMessage.style.display = 'none';
  }

  hideSuccess() {
    this.successMessage.style.display = 'none';
  }

  autoOpenDevTools() {
    try {
      // Try to open DevTools using Chrome's debugging API
      if (chrome && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            // Use chrome.debugger API to open DevTools
            chrome.debugger.attach({ tabId: tabs[0].id }, '1.3', () => {
              if (chrome.runtime.lastError) {
                console.log('⚠️ Could not auto-open DevTools (requires debugger permission):', chrome.runtime.lastError.message);
                this.showDevToolsInstructions();
              } else {
                console.log('✅ DevTools opened automatically');
                // Detach debugger after opening DevTools
                chrome.debugger.detach({ tabId: tabs[0].id });
              }
            });
          }
        });
      } else {
        // Fallback: show instructions
        this.showDevToolsInstructions();
      }
    } catch (error) {
      console.log('⚠️ Auto-opening DevTools failed:', error.message);
      this.showDevToolsInstructions();
    }

    // Also try to send a keyboard shortcut (F12) to the page
    // This is a fallback method that might work in some cases
    setTimeout(() => {
      this.tryKeyboardShortcut();
    }, 500);
  }

  tryKeyboardShortcut() {
    try {
      // Try to simulate Fn+F12 key press for macOS
      const fnF12Event = new KeyboardEvent('keydown', {
        key: 'F12',
        keyCode: 123,
        which: 123,
        bubbles: true,
        cancelable: true,
        fnKey: true // Simulate Fn key press
      });
      
      document.dispatchEvent(fnF12Event);
      
      // Also try to focus the page and send the event
      window.focus();
      document.body.focus();
      
      console.log('🔧 Attempted to trigger Fn+F12 shortcut');
    } catch (error) {
      console.log('⚠️ Keyboard shortcut simulation failed:', error.message);
    }
  }

  showDevToolsInstructions() {
    // Show a more prominent instruction to open DevTools manually
    const instructions = document.querySelector('.instructions');
    if (instructions) {
      instructions.innerHTML = `
        <h3>🔧 How to Debug IndexDB</h3>
        <ol>
          <li><strong>Right-click on this page and select <code>Inspect</code> (or press F12)</strong></li>
          <li>Go to the <code>Application</code> tab in DevTools</li>
          <li>Expand <code>Storage</code> → <code>IndexedDB</code></li>
          <li>You should see your XSaved database with all tables</li>
          <li>Use the <code>Console</code> tab to run database queries</li>
        </ol>
        <p style="margin-top: 12px; padding: 8px; background: #1DA1F2; border-radius: 6px; color: white; font-weight: 600;">
          💡 <strong>Quick Tip:</strong> Press F12 to open DevTools instantly!
        </p>
      `;
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatRelativeTime(timestamp) {
    const now = Date.now();
    const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const diffMs = Math.abs(now - time);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Date(time).toLocaleDateString();
  }
}

// Initialize debug interface when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const debug = new XSavedDebug();
    await debug.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize debug interface:', error);
    document.getElementById('errorMessage').textContent = 'Failed to initialize: ' + error.message;
    document.getElementById('errorMessage').style.display = 'block';
  }
});

console.log('📦 XSaved v2 Debug script loaded');
console.log('🔧 Debug interface ready - use this page to inspect IndexDB in DevTools');
