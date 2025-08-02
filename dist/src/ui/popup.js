/**
 * XSaved Extension v2 - Popup Interface
 * Modern UI with real-time data from service worker and IndexedDB
 */

class XSavedPopup {
  constructor() {
    this.isInitialized = false;
    this.lastStats = null;
    this.searchDebounceTimer = null;
    
    // DOM elements
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
    this.nextSync = document.getElementById('nextSync');
    this.bookmarkCount = document.getElementById('bookmarkCount');
    this.tagCount = document.getElementById('tagCount');
    this.cacheHits = document.getElementById('cacheHits');
    this.lastSyncTime = document.getElementById('lastSyncTime');
    this.dbStatus = document.getElementById('dbStatus');
    this.searchStatus = document.getElementById('searchStatus');
    this.storageUsed = document.getElementById('storageUsed');
    this.errorMessage = document.getElementById('errorMessage');
    this.searchInput = document.getElementById('searchInput');
    this.syncButton = document.getElementById('syncButton');
    this.searchButton = document.getElementById('searchButton');
    this.settingsButton = document.getElementById('settingsButton');
    this.syncIcon = document.getElementById('syncIcon');
    this.syncText = document.getElementById('syncText');
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initializing XSaved v2 Popup...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      this.isInitialized = true;
      console.log('✅ Popup initialized successfully');
      
    } catch (error) {
      console.error('❌ Popup initialization failed:', error);
      this.showError('Failed to initialize popup: ' + error.message);
    }
  }

  setupEventListeners() {
    // Sync button
    this.syncButton.addEventListener('click', () => this.handleSync());
    
    // Search input with debouncing
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    });
    
    // Advanced search button
    this.searchButton.addEventListener('click', () => this.handleAdvancedSearch());
    
    // Settings button
    this.settingsButton.addEventListener('click', () => this.handleSettings());
    
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
        this.lastStats = response.stats;
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
      this.cacheHits.textContent = '-';
      this.storageUsed.textContent = '-';
      this.dbStatus.textContent = 'Error';
      this.searchStatus.textContent = 'Error';
      return;
    }

    // Main stats
    this.bookmarkCount.textContent = this.formatNumber(stats.totalBookmarks || 0);
    this.tagCount.textContent = this.formatNumber(stats.totalTags || 0);
    this.cacheHits.textContent = this.formatNumber(stats.searchCache?.hits || 0);
    
    // Storage
    this.storageUsed.textContent = this.formatBytes(stats.storageUsed || 0);
    
    // Component status
    this.dbStatus.textContent = stats.totalBookmarks !== undefined ? '✅ Ready' : '❌ Error';
    this.searchStatus.textContent = stats.searchCache ? '✅ Ready' : '❌ Error';
    
    // Last sync
    if (stats.lastSync) {
      this.lastSyncTime.textContent = this.formatRelativeTime(stats.lastSync);
    } else {
      this.lastSyncTime.textContent = 'Never';
    }
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
      this.setStatus('error', 'Unknown status');
      return;
    }

    if (state.error) {
      this.setStatus('error', `Error: ${state.error}`);
      this.nextSync.textContent = '-';
      return;
    }

    if (state.isRunning) {
      this.setStatus('active', 'Syncing bookmarks...');
      this.nextSync.textContent = 'Active';
      this.setSyncButtonLoading(true);
    } else {
      this.setStatus('idle', 'Ready');
      this.nextSync.textContent = state.nextRun ? this.formatRelativeTime(state.nextRun) : '-';
      this.setSyncButtonLoading(false);
    }
  }

  setStatus(type, text) {
    this.statusIndicator.className = `status-indicator status-${type}`;
    this.statusText.textContent = text;
  }

  setSyncButtonLoading(loading) {
    if (loading) {
      this.syncIcon.textContent = '⏳';
      this.syncText.textContent = 'Syncing...';
      this.syncButton.disabled = true;
    } else {
      this.syncIcon.textContent = '🔄';
      this.syncText.textContent = 'Sync Now';
      this.syncButton.disabled = false;
    }
  }

  async handleSync() {
    try {
      this.setSyncButtonLoading(true);
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'startExtraction',
        options: { isDeltaSync: true }
      });
      
      if (response && response.success) {
        console.log('✅ Sync completed successfully');
        // Stats will update automatically via state updates
      } else {
        throw new Error(response?.error || 'Sync failed');
      }
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.showError('Sync failed: ' + error.message);
      this.setSyncButtonLoading(false);
    }
  }

  async handleSearch(query) {
    if (!query || query.length < 2) return;
    
    try {
      console.log('🔍 Searching for:', query);
      
      const response = await chrome.runtime.sendMessage({
        action: 'searchBookmarks',
        query: {
          text: query,
          limit: 10
        }
      });
      
      if (response && response.success) {
        console.log(`✅ Found ${response.result?.results?.length || 0} bookmarks`);
        // For now just log results - in a full implementation, 
        // we might show results in a dropdown or redirect to a results page
      } else {
        console.error('❌ Search failed:', response?.error);
      }
      
    } catch (error) {
      console.error('❌ Search error:', error);
    }
  }

  handleAdvancedSearch() {
    // Instead of closing popup, redirect to X.com bookmarks page where our interface lives
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('x.com')) {
        // If already on X.com, navigate to bookmarks
        chrome.tabs.update(tabs[0].id, { url: 'https://x.com/i/bookmarks' });
      } else {
        // Open X.com bookmarks in new tab
        chrome.tabs.create({ url: 'https://x.com/i/bookmarks' });
      }
    });
  }

  handleSettings() {
    // Open extension options page or settings tab
    chrome.runtime.openOptionsPage?.() || chrome.tabs.create({ 
      url: chrome.runtime.getURL('src/ui/settings.html')
    });
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
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideError(), 5000);
  }

  hideError() {
    this.errorMessage.style.display = 'none';
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

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const popup = new XSavedPopup();
    await popup.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize popup:', error);
    document.getElementById('errorMessage').textContent = 'Failed to initialize: ' + error.message;
    document.getElementById('errorMessage').style.display = 'block';
  }
});

console.log('📦 XSaved v2 Popup script loaded'); 