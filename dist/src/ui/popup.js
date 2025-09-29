/**
 * XSaved Extension - Simplified Popup Interface
 * Clean, focused UI with essential features only
 */

class XSavedPopup {
  constructor() {
    this.isInitialized = false;
    this.isSyncing = false;
    this.progressMonitor = null;
    
    // DOM elements
    this.errorMessage = document.getElementById('errorMessage');
    this.bookmarkCount = document.getElementById('bookmarkCount');
    this.tagCount = document.getElementById('tagCount');
    this.syncButton = document.getElementById('syncButton');
    this.syncIcon = document.getElementById('syncIcon');
    this.syncText = document.getElementById('syncText');
    this.progressSection = document.getElementById('progressSection');
    this.progressText = document.getElementById('progressText');
    this.progressCount = document.getElementById('progressCount');
    this.progressFill = document.getElementById('progressFill');
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initializing XSaved Popup...');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadStats();
      
      // Check if currently syncing
      await this.checkSyncStatus();
      
      this.isInitialized = true;
      console.log('✅ Popup initialized successfully');
      
    } catch (error) {
      console.error('❌ Popup initialization failed:', error);
      this.showError('Failed to initialize: ' + error.message);
    }
  }

  setupEventListeners() {
    // Sync button
    this.syncButton.addEventListener('click', () => this.handleSync());
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      if (response && response.success) {
        this.renderStats(response.stats);
      } else {
        this.showError('Failed to load stats');
      }
    } catch (error) {
      console.error('❌ Failed to load stats:', error);
      this.showError('Failed to load stats: ' + error.message);
    }
  }

  renderStats(stats) {
    this.bookmarkCount.textContent = this.formatNumber(stats.totalBookmarks || 0);
    this.tagCount.textContent = this.formatNumber(stats.totalTags || 0);
  }

  async checkSyncStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getProgress' });
      
      if (response && response.isExtracting) {
        this.startSyncProgress();
      }
    } catch (error) {
      console.error('❌ Failed to check sync status:', error);
    }
  }

  async handleSync() {
    if (this.isSyncing) return;
    
    try {
      this.startSyncProgress();
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'startExtraction',
        options: { isDeltaSync: true }
      });
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Sync failed');
      }
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.showError('Sync failed: ' + error.message);
      this.stopSyncProgress();
    }
  }

  startSyncProgress() {
    this.isSyncing = true;
    
    // Update button state
    this.syncButton.disabled = true;
    this.syncIcon.classList.add('spinning');
    this.syncText.textContent = 'Syncing...';
    
    // Show progress section
    this.progressSection.classList.add('active');
    this.progressText.textContent = 'Starting sync...';
    this.progressCount.textContent = '0 bookmarks processed';
    this.progressFill.style.width = '0%';
    
    // Start monitoring progress
    this.startProgressMonitoring();
  }

  stopSyncProgress() {
    this.isSyncing = false;
    
    // Update button state
    this.syncButton.disabled = false;
    this.syncIcon.classList.remove('spinning');
    this.syncText.textContent = 'Sync Now';
    
    // Hide progress section
    this.progressSection.classList.remove('active');
    
    // Stop monitoring
    if (this.progressMonitor) {
      clearTimeout(this.progressMonitor);
      this.progressMonitor = null;
    }
    
    // Clear badge
    chrome.runtime.sendMessage({ action: 'clearBadge' });
  }

  startProgressMonitoring() {
    const monitorProgress = () => {
      chrome.runtime.sendMessage({ action: 'getProgress' }, (response) => {
        if (response) {
          this.updateProgress(response);
          
          if (response.isExtracting) {
            // Continue monitoring
            this.progressMonitor = setTimeout(monitorProgress, 1000);
          } else {
            // Sync completed
            this.onSyncComplete();
          }
        }
      });
    };
    
    // Start monitoring after a short delay
    this.progressMonitor = setTimeout(monitorProgress, 1000);
  }

  updateProgress(response) {
    const { extractionState, bookmarkCount = 0 } = response;
    
    if (extractionState) {
      // Update progress text
      if (extractionState.message) {
        this.progressText.textContent = extractionState.message;
      }
      
      // Update progress bar based on phase
      if (extractionState.phase === 'twitter_api_fetch') {
        this.progressFill.style.width = '30%';
      } else if (extractionState.phase === 'indexeddb_save') {
        this.progressFill.style.width = '70%';
      }
    }
    
    // Update total bookmark count
    if (bookmarkCount > 0) {
      this.progressCount.textContent = `${this.formatNumber(bookmarkCount)} bookmarks processed`;
    }
  }

  onSyncComplete() {
    // Complete the progress bar
    this.progressFill.style.width = '100%';
    this.progressText.textContent = 'Sync complete!';
    
    // Wait a moment, then stop progress and refresh stats
    setTimeout(async () => {
      this.stopSyncProgress();
      await this.loadStats();
    }, 1500);
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.errorMessage.style.display = 'none';
    }, 5000);
  }

  formatNumber(num) {
    // Always show full numbers with comma separators
    return num.toLocaleString();
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

console.log('📦 XSaved Popup script loaded');