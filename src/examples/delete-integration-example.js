/**
 * XSaved Extension v2 - Delete Integration Example
 * Shows how to integrate the delete functionality into existing UI components
 */

import { selectionManager } from '../utils/selection-manager.js';
import { showSuccess, showError, showWarning } from '../utils/notification-system.js';

/**
 * Example integration with existing grid overlay
 * This shows how to add delete functionality to your bookmark grid
 */
export class DeleteIntegrationExample {
  constructor(gridContainer) {
    this.gridContainer = gridContainer;
    this.selectionManager = selectionManager;
  }

  /**
   * Initialize delete functionality in the grid
   */
  initialize() {
    // Initialize selection manager with the grid container
    this.selectionManager.initialize(this.gridContainer);
    
    // Listen for progress updates from service worker
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'bulkDeleteProgress') {
        this.selectionManager.handleProgressUpdate(message);
      }
    });
    
    // Add individual delete buttons to bookmark cards (optional)
    this.addIndividualDeleteButtons();
    
    console.log('✅ Delete integration initialized');
  }

  /**
   * Add individual delete buttons to each bookmark card
   * This is optional - you can use only selection mode if preferred
   */
  addIndividualDeleteButtons() {
    const bookmarkCards = this.gridContainer.querySelectorAll('.tweet-card');
    
    bookmarkCards.forEach(card => {
      const bookmarkId = card.dataset.bookmarkId || card.dataset.tweetId;
      if (!bookmarkId) return;
      
      // Check if delete button already exists
      if (card.querySelector('.xsaved-delete-btn')) return;
      
      // Create delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'xsaved-delete-btn';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Delete bookmark';
      deleteBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(220, 38, 38, 0.9);
        border: none;
        border-radius: 4px;
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 5;
      `;
      
      // Show on hover
      card.addEventListener('mouseenter', () => {
        if (!this.selectionManager.isSelectionMode) {
          deleteBtn.style.opacity = '1';
        }
      });
      
      card.addEventListener('mouseleave', () => {
        deleteBtn.style.opacity = '0';
      });
      
      // Handle click
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteIndividualBookmark(bookmarkId, card);
      });
      
      card.appendChild(deleteBtn);
    });
  }

  /**
   * Delete a single bookmark (individual delete button)
   * @param {string} bookmarkId - The bookmark ID to delete
   * @param {HTMLElement} card - The bookmark card element
   */
  async deleteIndividualBookmark(bookmarkId, card) {
    const confirmed = confirm('Are you sure you want to delete this bookmark?');
    if (!confirmed) return;
    
    try {
      // Show loading state
      card.style.opacity = '0.5';
      card.style.pointerEvents = 'none';
      
      // Send delete request to service worker
      const response = await chrome.runtime.sendMessage({
        action: 'deleteBookmark',
        tweetId: bookmarkId
      });
      
      if (response.success) {
        // Remove card from UI
        card.remove();
        
        // Show success notification
        let message = 'Bookmark deleted from local storage';
        if (response.deletedFromApi) {
          message += ' and X.com';
        } else if (response.alreadyDeletedFromApi) {
          message += ' (already removed from X.com)';
        } else if (response.rateLimited) {
          message += ' (X.com deletion rate limited)';
        } else if (response.apiError) {
          message += ' (X.com deletion failed)';
        }
        
        showSuccess('Deleted', message);
        
      } else {
        // Restore card state
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        
        showError('Delete Failed', response.error || 'Failed to delete bookmark');
      }
      
    } catch (error) {
      // Restore card state
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
      
      console.error('❌ Error deleting bookmark:', error);
      showError('Delete Error', error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Programmatically select bookmarks by criteria
   * Example: Select all bookmarks from a specific author
   * @param {Function} criteria - Function that returns true for bookmarks to select
   */
  selectBookmarksByCriteria(criteria) {
    if (!this.selectionManager.isSelectionMode) {
      this.selectionManager.toggleSelectionMode();
    }
    
    const bookmarkCards = this.gridContainer.querySelectorAll('.tweet-card');
    let selectedCount = 0;
    
    bookmarkCards.forEach(card => {
      const bookmarkId = card.dataset.bookmarkId || card.dataset.tweetId;
      if (!bookmarkId) return;
      
      // Extract bookmark data from card (you might need to adjust this based on your card structure)
      const bookmarkData = {
        id: bookmarkId,
        author: card.querySelector('.tweet-author')?.textContent || '',
        text: card.querySelector('.tweet-text')?.textContent || '',
        // Add other fields as needed
      };
      
      if (criteria(bookmarkData)) {
        this.selectionManager.toggleBookmarkSelection(bookmarkId);
        selectedCount++;
      }
    });
    
    showSuccess('Selection Updated', `Selected ${selectedCount} bookmarks`);
  }

  /**
   * Example: Select all bookmarks from a specific author
   * @param {string} authorName - The author's username
   */
  selectBookmarksByAuthor(authorName) {
    this.selectBookmarksByCriteria(bookmark => 
      bookmark.author.toLowerCase().includes(authorName.toLowerCase())
    );
  }

  /**
   * Example: Select bookmarks containing specific text
   * @param {string} searchText - Text to search for
   */
  selectBookmarksByText(searchText) {
    this.selectBookmarksByCriteria(bookmark => 
      bookmark.text.toLowerCase().includes(searchText.toLowerCase())
    );
  }

  /**
   * Cleanup when grid is destroyed
   */
  destroy() {
    this.selectionManager.destroy();
  }
}

/**
 * Edge Cases Handled by the Delete System:
 * 
 * 1. **Already Deleted on X.com**: 
 *    - API returns 404, we treat as success and remove from local DB
 *    - User gets notification that bookmark was already deleted
 * 
 * 2. **Rate Limiting**: 
 *    - API calls are batched with delays to avoid rate limits
 *    - If rate limited, we extend delays and continue
 *    - Local deletion succeeds, API deletion may be delayed
 * 
 * 3. **Network Errors**: 
 *    - Local deletion happens first (optimistic update)
 *    - If API fails, user is notified but local deletion persists
 *    - User can retry API deletion later if needed
 * 
 * 4. **Partial Failures in Bulk Operations**: 
 *    - Each bookmark is processed individually
 *    - Failed deletions are tracked and reported
 *    - Successful deletions are not rolled back
 * 
 * 5. **Authentication Issues**: 
 *    - CSRF token is automatically retrieved
 *    - If authentication fails, user is notified
 *    - Local deletion may still succeed
 * 
 * 6. **Database Errors**: 
 *    - Database operations are wrapped in transactions
 *    - If DB deletion fails, API deletion is not attempted
 *    - User gets clear error message
 * 
 * 7. **UI State Management**: 
 *    - Selection state is properly cleaned up
 *    - Progress indicators are shown for long operations
 *    - UI is restored to normal state on errors
 * 
 * 8. **Tag and Index Cleanup**: 
 *    - Tag usage counts are decremented
 *    - Unused tags are automatically removed
 *    - Search index entries are cleaned up
 * 
 * 9. **Concurrent Operations**: 
 *    - Multiple delete operations are queued properly
 *    - Selection mode prevents conflicts during bulk operations
 *    - Progress updates are synchronized
 * 
 * 10. **Memory Management**: 
 *     - Large bookmark sets are processed in batches
 *     - DOM elements are properly cleaned up
 *     - Event listeners are removed when components are destroyed
 */

console.log('📚 XSaved Delete Integration Example loaded');
