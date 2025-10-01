 /**
 * XSaved Extension v2 - Selection Manager
 * Handles bookmark selection mode and bulk operations
 * Integrates with existing grid overlay and notification system
 */

import { 
  showProgress, 
  showSuccess, 
  showError, 
  showWarning,
  initializeNotificationSystem 
} from './notification-system.js';

/**
 * Selection Manager Class
 * Manages bookmark selection state and UI
 */
export class SelectionManager {
  constructor() {
    this.isSelectionMode = false;
    this.selectedBookmarks = new Set();
    this.bookmarkElements = new Map(); // Map bookmark IDs to DOM elements
    
    // UI Elements
    this.selectionToggle = null;
    this.selectionToolbar = null;
    this.bulkProgressModal = null;
    
    // Callback for button state updates
    this.onSelectionModeChange = null;
    
    // Event handlers
    this.boundHandlers = {
      toggleSelection: this.toggleSelectionMode.bind(this),
      selectAll: this.selectAll.bind(this),
      selectNone: this.selectNone.bind(this),
      deleteSelected: this.deleteSelected.bind(this),
      cancelSelection: this.cancelSelection.bind(this)
    };
    
    // Initialize notification system
    initializeNotificationSystem();
    
    console.log('📋 Selection Manager initialized');
  }

  /**
   * Initialize selection mode UI components
   * @param {HTMLElement} gridContainer - The grid container element
   */
  initialize(gridContainer) {
    this.gridContainer = gridContainer;
    this.createSelectionToolbar();
    this.attachEventListeners();
    
    console.log('✅ Selection Manager UI initialized');
  }

  /**
   * Set callback for selection mode changes
   * @param {Function} callback - Function to call when selection mode changes
   */
  setSelectionModeChangeCallback(callback) {
    this.onSelectionModeChange = callback;
  }


  /**
   * Create the selection toolbar (initially hidden)
   */
  createSelectionToolbar() {
    if (this.selectionToolbar) return;

    this.selectionToolbar = document.createElement('div');
    this.selectionToolbar.className = 'xsaved-selection-toolbar';
    this.selectionToolbar.innerHTML = `
      <div class="xsaved-selection-count">
        <span class="count">0</span> selected
      </div>
      <div class="xsaved-selection-actions">
        <button class="xsaved-selection-btn select-all">Select All</button>
        <button class="xsaved-selection-btn select-none">Select None</button>
        <button class="xsaved-selection-btn danger delete-selected" disabled>
          🗑️ Delete Selected
        </button>
        <button class="xsaved-selection-btn cancel">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(this.selectionToolbar);
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    if (this.selectionToolbar) {
      const selectAllBtn = this.selectionToolbar.querySelector('.select-all');
      const selectNoneBtn = this.selectionToolbar.querySelector('.select-none');
      const deleteBtn = this.selectionToolbar.querySelector('.delete-selected');
      const cancelBtn = this.selectionToolbar.querySelector('.cancel');

      selectAllBtn?.addEventListener('click', this.boundHandlers.selectAll);
      selectNoneBtn?.addEventListener('click', this.boundHandlers.selectNone);
      deleteBtn?.addEventListener('click', this.boundHandlers.deleteSelected);
      cancelBtn?.addEventListener('click', this.boundHandlers.cancelSelection);
    }
  }

  /**
   * Toggle selection mode on/off
   */
  toggleSelectionMode() {
    this.isSelectionMode = !this.isSelectionMode;
    
    if (this.isSelectionMode) {
      this.enterSelectionMode();
    } else {
      this.exitSelectionMode();
    }
  }

  /**
   * Enter selection mode
   */
  enterSelectionMode() {
    console.log('📋 Entering selection mode');
    
    // Update UI
    if (this.gridContainer) {
      this.gridContainer.classList.add('xsaved-selection-mode');
    }
    
    
    if (this.selectionToolbar) {
      this.selectionToolbar.classList.add('show');
    }
    
    // Add selection checkboxes to existing bookmark cards
    this.addSelectionCheckboxes();
    
    // Update selection count
    this.updateSelectionCount();
    
    // Notify content.js about selection mode change
    if (this.onSelectionModeChange) {
      this.onSelectionModeChange(true);
    }
  }

  /**
   * Exit selection mode
   */
  exitSelectionMode() {
    console.log('📋 Exiting selection mode');
    
    // Clear selections
    this.selectedBookmarks.clear();
    
    // Update UI
    if (this.gridContainer) {
      this.gridContainer.classList.remove('xsaved-selection-mode');
    }
    
    
    if (this.selectionToolbar) {
      this.selectionToolbar.classList.remove('show');
    }
    
    // Remove selection checkboxes
    this.removeSelectionCheckboxes();
    
    // Notify content.js about selection mode change
    if (this.onSelectionModeChange) {
      this.onSelectionModeChange(false);
    }
  }

  /**
   * Add selection checkboxes to bookmark cards
   */
  addSelectionCheckboxes() {
    const bookmarkCards = this.gridContainer?.querySelectorAll('.tweet-card') || [];
    
    bookmarkCards.forEach(card => {
      const bookmarkId = card.dataset.bookmarkId || card.dataset.tweetId;
      if (!bookmarkId) return;
      
      // Store reference
      this.bookmarkElements.set(bookmarkId, card);
      
      // Create checkbox if it doesn't exist
      let checkbox = card.querySelector('.xsaved-selection-checkbox');
      if (!checkbox) {
        checkbox = document.createElement('div');
        checkbox.className = 'xsaved-selection-checkbox';
        checkbox.dataset.bookmarkId = bookmarkId;
        card.appendChild(checkbox);
        
        // Add click handler
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleBookmarkSelection(bookmarkId);
        });
        
        // Also allow clicking on the card itself
        card.addEventListener('click', (e) => {
          if (this.isSelectionMode && !e.target.closest('.xsaved-selection-checkbox')) {
            this.toggleBookmarkSelection(bookmarkId);
          }
        });
      }
    });
  }

  /**
   * Remove selection checkboxes from bookmark cards
   */
  removeSelectionCheckboxes() {
    const checkboxes = document.querySelectorAll('.xsaved-selection-checkbox');
    checkboxes.forEach(checkbox => checkbox.remove());
    
    // Clear stored references
    this.bookmarkElements.clear();
    
    // Remove selected state from cards
    const selectedCards = document.querySelectorAll('.tweet-card.selected');
    selectedCards.forEach(card => card.classList.remove('selected'));
  }

  /**
   * Toggle selection state of a bookmark
   * @param {string} bookmarkId - The bookmark ID to toggle
   */
  toggleBookmarkSelection(bookmarkId) {
    const card = this.bookmarkElements.get(bookmarkId);
    const checkbox = card?.querySelector('.xsaved-selection-checkbox');
    
    if (!card || !checkbox) return;
    
    if (this.selectedBookmarks.has(bookmarkId)) {
      // Deselect
      this.selectedBookmarks.delete(bookmarkId);
      card.classList.remove('selected');
      checkbox.classList.remove('checked');
    } else {
      // Select
      this.selectedBookmarks.add(bookmarkId);
      card.classList.add('selected');
      checkbox.classList.add('checked');
    }
    
    this.updateSelectionCount();
  }

  /**
   * Select all visible bookmarks
   */
  selectAll() {
    const bookmarkCards = this.gridContainer?.querySelectorAll('.tweet-card') || [];
    
    bookmarkCards.forEach(card => {
      const bookmarkId = card.dataset.bookmarkId || card.dataset.tweetId;
      if (bookmarkId && !this.selectedBookmarks.has(bookmarkId)) {
        this.selectedBookmarks.add(bookmarkId);
        card.classList.add('selected');
        
        const checkbox = card.querySelector('.xsaved-selection-checkbox');
        if (checkbox) {
          checkbox.classList.add('checked');
        }
      }
    });
    
    this.updateSelectionCount();
    
    showSuccess('Selected All', `Selected ${this.selectedBookmarks.size} bookmarks`);
  }

  /**
   * Deselect all bookmarks
   */
  selectNone() {
    this.selectedBookmarks.clear();
    
    const selectedCards = document.querySelectorAll('.tweet-card.selected');
    selectedCards.forEach(card => {
      card.classList.remove('selected');
      const checkbox = card.querySelector('.xsaved-selection-checkbox');
      if (checkbox) {
        checkbox.classList.remove('checked');
      }
    });
    
    this.updateSelectionCount();
  }

  /**
   * Update the selection count display
   */
  updateSelectionCount() {
    const countElement = this.selectionToolbar?.querySelector('.xsaved-selection-count .count');
    const deleteButton = this.selectionToolbar?.querySelector('.delete-selected');
    
    if (countElement) {
      countElement.textContent = this.selectedBookmarks.size;
    }
    
    if (deleteButton) {
      deleteButton.disabled = this.selectedBookmarks.size === 0;
    }
  }

  /**
   * Delete selected bookmarks
   */
  async deleteSelected() {
    const selectedIds = Array.from(this.selectedBookmarks);
    
    if (selectedIds.length === 0) {
      showWarning('No Selection', 'Please select bookmarks to delete');
      return;
    }
    
    // Confirm deletion
    const confirmed = confirm(
      `Are you sure you want to delete ${selectedIds.length} selected bookmark${selectedIds.length > 1 ? 's' : ''}?\n\n` +
      'This will remove them from both your local storage and X.com.'
    );
    
    if (!confirmed) return;
    
    console.log(`🗑️ Deleting ${selectedIds.length} selected bookmarks`);
    
    // Show progress modal
    this.showBulkProgress('Deleting Bookmarks', selectedIds.length);
    
    try {
      // Send bulk delete request to service worker
      const response = await chrome.runtime.sendMessage({
        action: 'deleteBulkBookmarks',
        tweetIds: selectedIds,
        options: {
          batchSize: 5,
          delayBetweenBatches: 2000,
          deleteFromApi: true
        }
      });
      
      this.hideBulkProgress();
      
      if (response.success) {
        // Remove deleted cards from UI
        selectedIds.forEach(id => {
          const card = this.bookmarkElements.get(id);
          if (card) {
            card.remove();
            this.bookmarkElements.delete(id);
          }
        });
        
        // Clear selection
        this.selectedBookmarks.clear();
        this.updateSelectionCount();
        
        // Show success notification
        const { database, api } = response;
        let message = `Deleted ${database.deleted} bookmarks from local storage`;
        
        if (api) {
          if (api.success) {
            message += ` and ${api.summary.successful} from X.com`;
          } else {
            message += `, but ${api.summary.failed} failed to delete from X.com`;
          }
        }
        
        showSuccess('Bookmarks Deleted', message);
        
        // Exit selection mode
        this.exitSelectionMode();
        
      } else {
        showError('Delete Failed', response.error || 'Failed to delete bookmarks');
      }
      
    } catch (error) {
      this.hideBulkProgress();
      console.error('❌ Error deleting selected bookmarks:', error);
      showError('Delete Error', error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Cancel selection mode
   */
  cancelSelection() {
    this.exitSelectionMode();
  }

  /**
   * Show bulk operation progress modal
   * @param {string} title - Progress title
   * @param {number} total - Total items to process
   */
  showBulkProgress(title, total) {
    this.hideBulkProgress(); // Remove any existing modal
    
    this.bulkProgressModal = document.createElement('div');
    this.bulkProgressModal.className = 'xsaved-bulk-progress';
    this.bulkProgressModal.innerHTML = `
      <div class="xsaved-bulk-progress-title">${title}</div>
      <div class="xsaved-bulk-progress-bar">
        <div class="xsaved-bulk-progress-fill" style="width: 0%;"></div>
      </div>
      <div class="xsaved-bulk-progress-text">Starting...</div>
    `;
    
    document.body.appendChild(this.bulkProgressModal);
  }

  /**
   * Update bulk operation progress
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {string} text - Progress text
   */
  updateBulkProgress(current, total, text = '') {
    if (!this.bulkProgressModal) return;
    
    const percentage = Math.min(100, (current / total) * 100);
    const progressFill = this.bulkProgressModal.querySelector('.xsaved-bulk-progress-fill');
    const progressText = this.bulkProgressModal.querySelector('.xsaved-bulk-progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = text || `${current} of ${total} completed`;
    }
  }

  /**
   * Hide bulk operation progress modal
   */
  hideBulkProgress() {
    if (this.bulkProgressModal) {
      this.bulkProgressModal.remove();
      this.bulkProgressModal = null;
    }
  }

  /**
   * Handle progress updates from service worker
   * @param {Object} progressData - Progress update data
   */
  handleProgressUpdate(progressData) {
    if (progressData.action === 'bulkDeleteProgress') {
      this.updateBulkProgress(
        progressData.current,
        progressData.total,
        `Deleting from X.com: ${progressData.current}/${progressData.total} (${progressData.failed} failed)`
      );
    }
  }

  /**
   * Cleanup and remove all UI elements
   */
  destroy() {
    this.exitSelectionMode();
    
    if (this.selectionToolbar) {
      this.selectionToolbar.remove();
      this.selectionToolbar = null;
    }
    
    this.hideBulkProgress();
    
    console.log('🧹 Selection Manager destroyed');
  }
}

// Export singleton instance
export const selectionManager = new SelectionManager();

console.log('📋 XSaved Selection Manager loaded');
