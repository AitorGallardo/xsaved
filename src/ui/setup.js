/**
 * XSaved First-Time Setup Page
 * Auto-opened tab for setup progress and feedback
 */

class SetupPage {
  constructor() {
    this.setupState = null;
    this.progressMonitor = null;
    this.autoCloseTimer = null;
    
    // DOM elements
    this.statusIcon = document.getElementById('statusIcon');
    this.setupTitle = document.getElementById('setupTitle');
    this.setupMessage = document.getElementById('setupMessage');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.bookmarkCount = document.getElementById('bookmarkCount');
    this.actionContainer = document.getElementById('actionContainer');
    this.actionButton = document.getElementById('actionButton');
    this.autoCloseNotice = document.getElementById('autoCloseNotice');
  }

  async initialize() {
    console.log('🚀 Initializing setup page...');
    
    // Check for setup state
    await this.loadSetupState();
    
    if (this.setupState) {
      this.renderSetupState();
      
      // Start monitoring progress if extracting
      if (this.setupState.type === 'extracting') {
        this.startProgressMonitoring();
      }
    } else {
      // No setup state, redirect to normal extension
      this.showError('Setup state not found', 'Redirecting to extension...');
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  }

  async loadSetupState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['firstTimeSetup'], (result) => {
        this.setupState = result.firstTimeSetup;
        resolve();
      });
    });
  }

  renderSetupState() {
    const { type, options } = this.setupState;
    
    switch (type) {
      case 'extracting':
        this.showExtracting(options);
        break;
      case 'login_required':
        this.showLoginRequired(options);
        break;
      case 'success':
        this.showSuccess(options);
        break;
      case 'extraction_failed':
      case 'rate_limited':
      case 'network_error':
      case 'unknown_error':
        this.showError(type, options);
        break;
    }
  }

  showExtracting(options) {
    this.statusIcon.textContent = '🚀';
    this.setupTitle.textContent = 'Setting up XSaved!';
    this.setupMessage.textContent = 'We\'re extracting your bookmarks for the first time. This may take a few moments...';
    
    this.progressContainer.classList.remove('hidden');
    this.progressFill.classList.add('progress-pulse');
    this.progressText.textContent = 'Starting extraction...';
    this.bookmarkCount.classList.remove('hidden');
  }

  showLoginRequired(options) {
    this.statusIcon.textContent = '🔐';
    this.setupTitle.textContent = options.title;
    this.setupMessage.textContent = options.message;
    
    this.progressContainer.classList.add('hidden');
    this.actionContainer.classList.remove('hidden');
    this.actionButton.textContent = options.action;
    this.actionButton.onclick = () => {
      chrome.tabs.create({ url: options.actionUrl });
      window.close();
    };
  }

  showSuccess(options) {
    this.statusIcon.textContent = '🎉';
    this.setupTitle.textContent = options.title;
    this.setupMessage.textContent = options.message;
    
    this.progressContainer.classList.add('hidden');
    this.actionContainer.classList.remove('hidden');
    this.actionButton.textContent = options.action;
    this.actionButton.classList.add('success');
    this.actionButton.onclick = () => {
      chrome.tabs.create({ url: options.actionUrl });
      window.close();
    };
    
    // Auto-close after 10 seconds
    this.autoCloseNotice.classList.remove('hidden');
    this.startAutoClose();
  }

  showError(type, options) {
    this.statusIcon.textContent = '⚠️';
    this.setupTitle.textContent = options.title;
    this.setupMessage.textContent = options.message;
    
    this.progressContainer.classList.add('hidden');
    this.actionContainer.classList.remove('hidden');
    this.actionButton.textContent = options.action;
    this.actionButton.classList.add('error');
    
    this.actionButton.onclick = () => {
      if (options.action === 'Try Manual Sync') {
        // Open extension popup
        chrome.action.openPopup?.() || chrome.tabs.create({ url: 'https://x.com/i/bookmarks' });
      } else if (options.action === 'Retry Setup') {
        chrome.runtime.sendMessage({ action: 'retryFirstTimeSetup' });
        this.setupState.type = 'extracting';
        this.renderSetupState();
        this.startProgressMonitoring();
      } else {
        chrome.tabs.create({ url: 'https://x.com/i/bookmarks' });
      }
    };
  }

  startProgressMonitoring() {
    const monitorProgress = () => {
      chrome.runtime.sendMessage({ action: 'getProgress' }, (response) => {
        if (response && response.extractionState) {
          this.updateProgress(response.extractionState, response.bookmarkCount || 0);
          
          if (response.extractionState.phase === 'idle') {
            // Extraction completed
            this.onExtractionComplete();
          } else {
            // Continue monitoring
            this.progressMonitor = setTimeout(monitorProgress, 1000);
          }
        }
      });
    };
    
    // Start monitoring after a short delay
    this.progressMonitor = setTimeout(monitorProgress, 1000);
  }

  updateProgress(state, bookmarkCount) {
    // Update progress text
    if (state.message) {
      this.progressText.textContent = state.message;
    }
    
    // Update bookmark count
    if (bookmarkCount > 0) {
      this.bookmarkCount.textContent = `${bookmarkCount.toLocaleString()} bookmarks processed`;
      this.bookmarkCount.classList.remove('hidden');
    }
    
    // Update progress bar based on phase
    if (state.phase === 'twitter_api_fetch') {
      this.progressFill.style.width = '30%';
      this.progressFill.classList.remove('progress-pulse');
    } else if (state.phase === 'indexeddb_save') {
      this.progressFill.style.width = '70%';
    }
  }

  onExtractionComplete() {
    if (this.progressMonitor) {
      clearTimeout(this.progressMonitor);
      this.progressMonitor = null;
    }
    
    // Complete the progress bar
    this.progressFill.style.width = '100%';
    this.progressFill.classList.remove('progress-pulse');
    this.progressText.textContent = 'Extraction complete!';
    
    // Wait for updated setup state
    setTimeout(async () => {
      await this.loadSetupState();
      if (this.setupState && this.setupState.type === 'success') {
        this.renderSetupState();
      } else {
        // Fallback success display
        this.showGenericSuccess();
      }
    }, 2000);
  }

  showGenericSuccess() {
    this.statusIcon.textContent = '🎉';
    this.setupTitle.textContent = 'Setup Complete!';
    this.setupMessage.textContent = 'Your bookmarks have been successfully imported.';
    
    this.progressContainer.classList.add('hidden');
    this.actionContainer.classList.remove('hidden');
    this.actionButton.textContent = 'Open Bookmarks';
    this.actionButton.classList.add('success');
    this.actionButton.onclick = () => {
      chrome.tabs.create({ url: 'https://x.com/i/bookmarks' });
      window.close();
    };
    
    this.autoCloseNotice.classList.remove('hidden');
    this.startAutoClose();
  }

  startAutoClose() {
    let countdown = 10;
    this.autoCloseNotice.textContent = `This tab will close automatically in ${countdown} seconds`;
    
    const updateCountdown = () => {
      countdown--;
      if (countdown > 0) {
        this.autoCloseNotice.textContent = `This tab will close automatically in ${countdown} seconds`;
        this.autoCloseTimer = setTimeout(updateCountdown, 1000);
      } else {
        // Clear setup state and close
        chrome.storage.local.remove(['firstTimeSetup']);
        window.close();
      }
    };
    
    this.autoCloseTimer = setTimeout(updateCountdown, 1000);
  }

  cleanup() {
    if (this.progressMonitor) {
      clearTimeout(this.progressMonitor);
    }
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }
}

// Global action handler for buttons
function handleAction() {
  // This is handled by individual button onclick handlers
}

// Initialize setup page
let setupPage;

document.addEventListener('DOMContentLoaded', async () => {
  setupPage = new SetupPage();
  await setupPage.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (setupPage) {
    setupPage.cleanup();
  }
});

console.log('📦 XSaved Setup Page loaded');
