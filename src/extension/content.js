/**
 * XSaved Extension v2 - Content Script
 * Phase 3: Content Script & DOM Injection
 * 
 * Features:
 * - Bookmark button interception with save dialog
 * - X.com /bookmarks page toggle for grid view
 * - Robust messaging with service worker
 * - Integration with Components 1 & 2 (IndexedDB + Search)
 * 
 * =============================================================================
 * 📊 DATA LOADING FLOWS DOCUMENTATION
 * =============================================================================
 * 
 * 🔄 **1. INITIAL LOADING SEARCH**
 * Flow: loadBookmarksGrid() → loadBookmarksPage() → Service Worker → SearchEngine
 * Trigger: User opens extension grid interface
 * Query: { limit: INITIAL_LOAD, offset: 0, sortBy: 'created_at', sortOrder: 'desc' }
 * Result: Loads first page of bookmarks with default sorting
 * 
 * 📄 **2. PAGINATION SEARCH**
 * Flow: loadNextPage() → loadBookmarksPage(append=true) → Service Worker → SearchEngine
 * Trigger: User scrolls to bottom of grid
 * Query: Uses this.pagination.currentQuery + incremented offset
 * Result: Appends more results to existing grid without replacing
 * 
 * 🔍 **3. TEXT SEARCH**
 * Flow: User types → updateFilter('text') → executeSearch() → loadBookmarksPage()
 * Trigger: Text input with debounce (300ms)
 * State: activeFilters = [{type: 'text', value: 'search term', label: 'search term'}]
 * Query: { text: 'search term', limit: INITIAL_LOAD, offset: 0, sortBy: current, sortOrder: current }
 * Result: Replaces grid with text search results
 * 
 * 👤 **4. AUTHOR SEARCH**
 * Flow: Type '@' → Author dropdown → selectAuthor() → updateFilter('author') → executeSearch()
 * Trigger: User selects author from '@' dropdown
 * State: activeFilters = [{type: 'author', value: 'username', label: '@username', avatarUrl: '...'}]
 * Query: { author: 'username', limit: INITIAL_LOAD, offset: 0, sortBy: current, sortOrder: current }
 * Result: Replaces grid with author-specific tweets, search box shows author with avatar
 * 
 * 🏷️ **5. TAG SEARCH**
 * Flow: selectActiveTag() → loadBookmarksPage() → Service Worker → SearchEngine
 * Trigger: User clicks tag filter
 * State: this.currentSelectedTags = Set(['tag1', 'tag2'])
 * Query: { tags: ['tag1', 'tag2'], limit: INITIAL_LOAD, offset: 0, sortBy: current, sortOrder: current }
 * Result: Replaces grid with tag-filtered results
 * 
 * 🔄 **6. SORT SEARCH**
 * Flow: Sort button → showSortMenuWithFilters() → executeSearch() → loadBookmarksPage()
 * Trigger: User changes sort order/field
 * State: this.currentSort = {field: 'created_at', order: 'desc'}
 * Query: Combines current activeFilters + new sort settings
 * Result: Re-executes current search with new sorting, preserving all filters
 * 
 * =============================================================================
 * 🔗 **UNIFIED SEARCH ARCHITECTURE**
 * =============================================================================
 * 
 * **State Management:**
 * - activeFilters[] = Unified filter state (text, author, future: tags, dates)
 * - this.currentSort = Sort state shared across all searches
 * - this.pagination.currentQuery = Last executed query for pagination
 * 
 * **Single Entry Point:**
 * - executeSearch() = ONLY function that builds final query and triggers search
 * - All search types → updateFilter() → executeSearch() → loadBookmarksPage()
 * 
 * **Search Persistence:**
 * - Text + Author filters persist through sorting
 * - Sort settings persist through filter changes
 * - Pagination uses stored query for consistency
 * 
 * **Query Building:**
 * executeSearch() reads activeFilters + this.currentSort → Builds unified query →
 * Service Worker → SearchEngine.search() → Database → Results
 */

console.log('🚀 XSaved v2 Enhanced Content Script loaded:', window.location.href);

// Import delete functionality
import { selectionManager } from '../utils/selection-manager.js';
import { showSuccess, showError, showWarning, initializeNotificationSystem } from '../utils/notification-system.js';

// ===== CONFIGURATION =====
const XSAVED_CONFIG = {
  selectors: {
    bookmarkButton: '[data-testid="bookmark"], [data-testid="removeBookmark"]',
    // Target the exact h2 element from the Twitter bookmarks page
    bookmarksPageHeader: 'h2[dir="ltr"][aria-level="2"][role="heading"]',
    // Fallback: target the container if the specific h2 isn't found
    bookmarksContainer: 'div.css-175oi2r.r-1habvwh',
    tweetContainer: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userAvatar: '[data-testid="Tweet-User-Avatar"]',
    userName: '[data-testid="User-Name"]'
  },
  pages: {
    bookmarks: '/i/bookmarks',
    isBookmarksPage: () => window.location.pathname.includes('/i/bookmarks')
  },
  ui: {
    fadeTimeout: 2000,  // 2 seconds auto-fade as requested
    animationDuration: 300
  }
};

// ===== STATE MANAGEMENT =====
let currentTooltip = null;
let tooltipTimeout = null;
let interceptedButtons = new Set();
let isGridModeActive = false;
let bookmarkButtonObserver = null;

// ===== SAFE MESSAGING =====
const safeRuntimeMessage = (message, callback) => {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Extension context unavailable (normal during reload/navigation)');
        if (callback) callback(null);
      } else {
        if (callback) callback(response);
      }
    });
  } catch (error) {
    console.log('Extension context unavailable (normal during reload/navigation)');
    if (callback) callback(null);
  }
};

// ===== CONFIGURATION =====
// Centralized limits configuration - matches limits.ts
const DEFAULT_BOOKMARK_LIMIT = 5000; // Default search limit (matches limits.ts)
const PAGINATION_CONFIG = {
  INITIAL_LOAD: 200,        // First load: 200 bookmarks (matches limits.ts)
  PAGE_SIZE: 200,           // Each subsequent load: 200 more bookmarks (matches limits.ts)
  SCROLL_THRESHOLD: 0.9    // Trigger next load when 90% scrolled (matches limits.ts)
};

// ===== INITIALIZATION =====
class XSavedContentScript {
  constructor() {
    this.initialized = false;
    this.stats = null;
    this.themeUnsubscribe = null;
    this.allBookmarks = []; // Store all bookmarks for filtering
    this.currentSelectedTags = new Set(['All']); // Track current tag selection
    this.currentGridContainer = null; // Store reference to current grid container
    
    // NEW: Pagination state
    this.pagination = {
      currentOffset: 0,           // Current pagination offset
      hasMore: true,              // Whether more bookmarks are available
      isLoading: false,           // Prevent multiple simultaneous loads
      currentQuery: null,         // Store current search query for pagination
      totalLoaded: 0              // Track total bookmarks loaded
    };
    
    // Initialize delete functionality
    this.selectionManager = selectionManager;
    this.deleteEnabled = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('📀 Initializing XSaved Content Script...');
    
    try {
      // Initialize theme synchronization first
      this.initializeThemeSync();
      
      // Initialize notification system
      initializeNotificationSystem();
      
      // Get current stats from service worker
      await this.updateStats();
      
      // Set up sync state monitoring
      this.setupSyncStateListener();
      
      // Initialize based on current page
      if (XSAVED_CONFIG.pages.isBookmarksPage()) {
        this.initializeBookmarksPage();
      }
      
      // Always initialize bookmark button interception
      this.initializeBookmarkInterception();
      
      // Set up navigation listener for SPA changes
      this.setupNavigationListener();
      
      console.log('✅ XSaved Content Script initialized successfully');
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Content Script initialization failed:', error);
    }
  }

  /**
   * Initialize theme synchronization with X.com
   */
  initializeThemeSync() {
    if (window.XSavedTheme) {
      console.log('🎨 Setting up theme synchronization...');
      
      // Subscribe to theme changes
      this.themeUnsubscribe = window.XSavedTheme.onThemeChange((theme) => {
        console.log('🎨 Theme updated in content script:', theme);
        this.onThemeChanged(theme);
      });
      
      // Get current theme
      const currentTheme = window.XSavedTheme.getCurrentTheme();
      if (currentTheme) {
        this.onThemeChanged(currentTheme);
      }
    } else {
      console.warn('🎨 XSavedTheme not available, theme sync disabled');
    }
  }

  /**
   * Handle theme changes
   */
  onThemeChanged(theme) {
    // Update any dynamic UI elements with new theme
    console.log('🎨 Applying theme to XSaved UI elements:', theme.mode);
    
    // You can add specific theme-dependent logic here
    // For example, adjusting overlay opacity, shadows, etc.
    this.updateUIForTheme(theme);
  }

  /**
   * Update UI elements for new theme
   */
  updateUIForTheme(theme) {
    // Update grid overlay if it exists
    const gridOverlay = document.getElementById('xsaved-grid-overlay');
    if (gridOverlay) {
      gridOverlay.setAttribute('data-theme', theme.mode);
    }

    // Update save dialog if it exists
    const saveDialog = document.querySelector('.xsaved-save-dialog');
    if (saveDialog) {
      saveDialog.setAttribute('data-theme', theme.mode);
    }

    // Update bookmarks toggle if it exists
    const bookmarksToggle = document.getElementById('xsaved-bookmarks-toggle');
    if (bookmarksToggle) {
      bookmarksToggle.setAttribute('data-theme', theme.mode);
    }

    // Update fixed header/navbar if it exists
    const fixedHeader = document.getElementById('xsaved-fixed-header');
    if (fixedHeader) {
      fixedHeader.setAttribute('data-theme', theme.mode);
      console.log('🎨 Updated fixed header with theme:', theme.mode);
    }
  }

  async updateStats() {
    return new Promise((resolve) => {
      safeRuntimeMessage({ action: 'getStats' }, (response) => {
        if (response?.success) {
          this.stats = response.stats;
          console.log('📊 Updated stats:', this.stats);
          
          // Update stats indicator if it exists
          this.updateStatsIndicator();
        } else {
          console.warn('Failed to get stats from service worker');
        }
        resolve();
      });
    });
  }

  // ===== SYNC SPINNER MANAGEMENT =====
  showSyncSpinner() {
    const spinner = document.getElementById('xsaved-sync-spinner');
    if (spinner) {
      spinner.style.display = 'block';
      console.log('🔄 Sync spinner shown');
    }
  }

  hideSyncSpinner() {
    const spinner = document.getElementById('xsaved-sync-spinner');
    if (spinner) {
      spinner.style.display = 'none';
      console.log('⏹️ Sync spinner hidden');
    }
  }

  updateStatsIndicator() {
    const statsIndicator = document.getElementById('xsaved-stats-indicator');
    if (statsIndicator && this.stats) {
      statsIndicator.textContent = `${this.stats.totalBookmarks.toLocaleString()} saved`;
    }
  }

  setupSyncStateListener() {
    // Listen for sync state updates from the service worker
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'stateUpdate' && message.extractionState) {
        this.handleSyncStateUpdate(message.extractionState);
      } else if (message.action === 'bulkDeleteProgress') {
        // Forward progress updates to selection manager
        if (this.deleteEnabled && this.selectionManager) {
          this.selectionManager.handleProgressUpdate(message);
        }
      }
    });
    
    // Also periodically check sync state if on bookmarks page
    if (XSAVED_CONFIG.pages.isBookmarksPage()) {
      this.startSyncStateMonitoring();
    }
  }

  handleSyncStateUpdate(extractionState) {
    const { phase, isBackground } = extractionState;
    
    // Show spinner when sync is active
    if (phase === 'twitter_api_fetch' || phase === 'indexeddb_save') {
      this.showSyncSpinner();
    } else if (phase === 'idle') {
      // Hide spinner when sync completes
      setTimeout(() => {
        this.hideSyncSpinner();
        // Update stats after sync completes
        this.updateStats();
      }, 1000);
    }
  }

  startSyncStateMonitoring() {
    // Check sync state every 2 seconds while on bookmarks page
    const checkSyncState = () => {
      if (!XSAVED_CONFIG.pages.isBookmarksPage()) {
        return; // Stop monitoring if user navigated away
      }
      
      chrome.runtime.sendMessage({ action: 'getProgress' }, (response) => {
        if (response && response.extractionState) {
          this.handleSyncStateUpdate(response.extractionState);
        }
        
        // Continue monitoring
        setTimeout(checkSyncState, 2000);
      });
    };
    
    // Start monitoring after a delay
    setTimeout(checkSyncState, 2000);
  }

  // ===== BOOKMARKS PAGE FEATURES =====
  initializeBookmarksPage() {
    console.log('🔖 Initializing bookmarks page features...');
    
    // Set up mutation observer to wait for exact bookmarks content to load
    this.setupBookmarksContentObserver();
    
    // Listen for bookmark data changes
    this.setupBookmarksPageObserver();
  }

  setupBookmarksContentObserver() {
    console.log('🔍 Setting up bookmarks content observer...');
    
    // Check if toggle already exists
    if (document.getElementById('xsaved-bookmarks-toggle')) {
      console.log('⚠️ Bookmarks toggle already exists, skipping observer setup');
      return;
    }
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain bookmarks page structure (NOT messages drawer)
          const hasBookmarksHeader = Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              
              // Look for h2 elements in the added nodes
              const h2Elements = element.querySelectorAll ? 
                Array.from(element.querySelectorAll('h2')) : 
                (element.tagName === 'H2' ? [element] : []);
              
              if (h2Elements.length === 0) return false;
              
              // NUCLEAR PREVENTION: Only allow h2 elements that are DEFINITELY in bookmarks page
              return h2Elements.some(h2 => {
                console.log('🔍 STRICT VALIDATION for h2:', h2.textContent);
                
                // STEP 1: ABSOLUTE BLACKLIST - Messages drawer
                const isInMessagesDrawer = h2.closest('[data-testid="DMDrawer"]') || 
                                          h2.closest('[data-testid="DMDrawerHeader"]');
                
                if (isInMessagesDrawer) {
                  console.log('🚫 BLOCKED: h2 in messages drawer:', h2.textContent);
                  return false;
                }
                
                // STEP 2: WHITELIST VALIDATION - Must have bookmarks page indicators
                const hasBackButton = document.querySelector('[data-testid="app-bar-back"]');
                const isInPrimaryColumn = h2.closest('[data-testid="primaryColumn"]');
                const isInMainContent = h2.closest('main') || h2.closest('[role="main"]');
                
                // STEP 3: CONTAINER STRUCTURE VALIDATION
                const container = h2.closest('div.css-175oi2r.r-1habvwh');
                const containerNotInMessagesDrawer = container && !container.closest('[data-testid="DMDrawer"]');
                
                // STEP 4: ADDITIONAL SAFETY CHECKS
                const hasCorrectParentStructure = h2.parentElement && 
                                                 h2.parentElement.classList.contains('css-175oi2r');
                
                // STEP 5: FINAL VALIDATION - All conditions must be true
                const isValid = hasBackButton && // Must have back button (bookmarks page indicator)
                               (isInPrimaryColumn || isInMainContent) && // Must be in main content
                               containerNotInMessagesDrawer && // Container must not be in messages drawer
                               hasCorrectParentStructure; // Must have correct parent structure
                
                console.log('🔍 STRICT VALIDATION RESULTS:');
                console.log('  - Has back button (REQUIRED):', !!hasBackButton);
                console.log('  - In primary column:', !!isInPrimaryColumn);
                console.log('  - In main content:', !!isInMainContent);
                console.log('  - Container not in messages drawer:', !!containerNotInMessagesDrawer);
                console.log('  - Has correct parent structure:', !!hasCorrectParentStructure);
                console.log('  - FINAL RESULT:', isValid);
                
                if (!isValid) {
                  console.log('🚫 BLOCKED: h2 failed strict validation:', h2.textContent);
                }
                
                return isValid;
              });
            }
            return false;
          });
          
          if (hasBookmarksHeader && XSAVED_CONFIG.pages.isBookmarksPage()) {
            console.log('🎯 Detected bookmarks header content, attempting toggle placement...');
            
            // Small delay to ensure DOM is stable
            setTimeout(() => {
              this.attemptBookmarksTogglePlacement();
            }, 100);
          }
        }
      });
    });
    
    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also try immediately in case content is already loaded
    setTimeout(() => {
      this.attemptBookmarksTogglePlacement();
    }, 500);
    
    // Clean up observer after 30 seconds to avoid memory leaks
    setTimeout(() => {
      observer.disconnect();
      console.log('🧹 Cleaned up bookmarks content observer');
    }, 30000);
  }

  attemptBookmarksTogglePlacement() {
    console.log('🎯 Attempting bookmarks toggle placement...');
    
    // Check if toggle already exists
    if (document.getElementById('xsaved-bookmarks-toggle')) {
      console.log('⚠️ Toggle already exists, skipping placement');
      return;
    }
    
    // Try to find the exact bookmarks page structure
    const bookmarksHeader = this.findBookmarksHeader();
    
    if (bookmarksHeader.header && bookmarksHeader.container) {
      console.log('✅ Found proper bookmarks structure, placing toggle...');
      this.placeBookmarksToggle(bookmarksHeader.header, bookmarksHeader.container);
    } else {
      console.log('⏳ Bookmarks structure not ready yet, will retry...');
    }
  }

  findBookmarksHeader() {
    console.log('🔍 Searching for bookmarks header using structural selectors...');
    
    // Strategy 1: Look for h2 with back button (most reliable indicator of bookmarks page)
    const backButton = document.querySelector('[data-testid="app-bar-back"]');
    if (backButton) {
      console.log('✅ Found back button, looking for nearby h2...');
      
      // Find h2 in the same container structure as the back button
      const h2WithBackButton = backButton.closest('div').querySelector('h2');
      if (h2WithBackButton) {
        // NUCLEAR SAFETY: Triple-check it's NOT in messages drawer
        const isInMessagesDrawer = h2WithBackButton.closest('[data-testid="DMDrawer"]') ||
                                  h2WithBackButton.closest('[data-testid="DMDrawerHeader"]');
        
        if (!isInMessagesDrawer) {
          console.log('✅ VALIDATED: Found bookmarks header via back button:', h2WithBackButton.textContent);
          console.log('✅ Header path:', this.getElementPath(h2WithBackButton));
          
          const container = this.findProperContainer(h2WithBackButton);
          if (container) {
            return { header: h2WithBackButton, container };
          } else {
            console.log('🚫 Container validation failed for back button header');
          }
        } else {
          console.log('🚫 BLOCKED: Back button h2 is in messages drawer!');
        }
      }
    }
    
    // Strategy 2: Look for h2 in primary column that's NOT in messages drawer
    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (primaryColumn) {
      const headers = primaryColumn.querySelectorAll('h2');
      for (const h2 of headers) {
        console.log('🔍 Checking h2 in primaryColumn:', h2.textContent);
        
        // Exclude messages drawer
        const isInMessagesDrawer = h2.closest('[data-testid="DMDrawer"]') || 
                                  h2.closest('[data-testid="DMDrawerHeader"]');
        
        if (!isInMessagesDrawer) {
          // Check if it's in the correct container structure
          const isInCorrectContainer = h2.closest('div.css-175oi2r.r-1habvwh');
          
          if (isInCorrectContainer) {
            console.log('✅ Found bookmarks header in primary column:', h2.textContent);
            const container = this.findProperContainer(h2);
            return { header: h2, container };
          }
        } else {
          console.log('🚫 Skipping h2 in messages drawer:', h2.textContent);
        }
      }
    }
    
    // Strategy 3: Look for h2 in main content areas, excluding messages drawer
    const mainContentSelectors = ['main', '[role="main"]'];
    for (const selector of mainContentSelectors) {
      const mainContent = document.querySelector(selector);
      if (mainContent) {
        const headers = mainContent.querySelectorAll('h2');
        for (const h2 of headers) {
          console.log('🔍 Checking h2 in main content:', h2.textContent);
          
          // Exclude messages drawer
          const isInMessagesDrawer = h2.closest('[data-testid="DMDrawer"]') || 
                                    h2.closest('[data-testid="DMDrawerHeader"]');
          
          if (!isInMessagesDrawer) {
            // Check if it's in the correct container structure
            const isInCorrectContainer = h2.closest('div.css-175oi2r.r-1habvwh');
            
            if (isInCorrectContainer) {
              console.log('✅ Found bookmarks header in main content:', h2.textContent);
              const container = this.findProperContainer(h2);
              return { header: h2, container };
            }
          } else {
            console.log('🚫 Skipping h2 in messages drawer:', h2.textContent);
          }
        }
      }
    }
    
    console.log('❌ No suitable bookmarks header found');
    console.log('🔍 Available h2 elements:');
    document.querySelectorAll('h2').forEach((h2, index) => {
      const isInMessagesDrawer = h2.closest('[data-testid="DMDrawer"]');
      console.log(`  ${index + 1}: "${h2.textContent}" (Messages drawer: ${!!isInMessagesDrawer})`);
    });
    
    return { header: null, container: null };
  }

  findProperContainer(header) {
    console.log('🔍 Finding proper container for header:', header.textContent);
    
    // CRITICAL: Ensure we're not in messages drawer
    const isInMessagesDrawer = header.closest('[data-testid="DMDrawer"]') || 
                              header.closest('[data-testid="DMDrawerHeader"]');
    
    if (isInMessagesDrawer) {
      console.log('🚫 Header is in messages drawer, aborting container search');
      return null;
    }
    
    // Strategy 1: Find the immediate parent container with the specific CSS classes
    // This is the div that directly contains the h2 and where we want to place the toggle
    let container = header.closest('div.css-175oi2r.r-1habvwh');
    if (container) {
      // Double-check this container is not in messages drawer
      const containerInMessagesDrawer = container.closest('[data-testid="DMDrawer"]');
      if (!containerInMessagesDrawer) {
        console.log('📍 Found direct parent container with CSS classes (verified not in messages drawer)');
        console.log('📍 Container classes:', container.className);
        console.log('📍 Container contains h2:', !!container.querySelector('h2'));
        return container;
      } else {
        console.log('🚫 Container is in messages drawer, skipping');
      }
    }
    
    // Strategy 2: Look for parent element that can be styled with flexbox
    container = header.parentElement;
    if (container && container.tagName === 'DIV') {
      const containerInMessagesDrawer = container.closest('[data-testid="DMDrawer"]');
      if (!containerInMessagesDrawer) {
        console.log('📍 Using direct parent div container (verified not in messages drawer)');
        console.log('📍 Parent container classes:', container.className);
        return container;
      } else {
        console.log('🚫 Parent container is in messages drawer, skipping');
      }
    }
    
    // Strategy 3: Fallback to primaryColumn (less ideal as it's too broad)
    container = header.closest('[data-testid="primaryColumn"]');
    if (container) {
      console.log('⚠️ Using broad primaryColumn container (fallback)');
      return container;
    }
    
    // Strategy 4: Last resort - main content area
    container = header.closest('main');
    if (container) {
      console.log('⚠️ Using main container (last resort)');
      return container;
    }
    
    // Final fallback
    console.log('⚠️ Using header parent element as final fallback');
    return header.parentElement;
  }

  placeBookmarksToggle(header, container) {
    console.log('🎯 Attempting to place toggle next to header:', header.textContent);
    
    // ABSOLUTE PREVENTION: Triple-check we're not in messages drawer
    const isHeaderInMessagesDrawer = header.closest('[data-testid="DMDrawer"]') || 
                                    header.closest('[data-testid="DMDrawerHeader"]');
    
    const isContainerInMessagesDrawer = container.closest('[data-testid="DMDrawer"]') || 
                                       container.closest('[data-testid="DMDrawerHeader"]');
    
    if (isHeaderInMessagesDrawer || isContainerInMessagesDrawer) {
      console.error('🚫 BLOCKED: Attempted to place toggle in messages drawer!');
      console.error('🚫 Header in messages drawer:', isHeaderInMessagesDrawer);
      console.error('🚫 Container in messages drawer:', isContainerInMessagesDrawer);
      console.error('🚫 Header path:', this.getElementPath(header));
      console.error('🚫 Container path:', this.getElementPath(container));
      return; // ABORT COMPLETELY
    }
    
    // WHITELIST VALIDATION: Only allow placement in verified bookmarks page structure
    const hasBackButton = document.querySelector('[data-testid="app-bar-back"]');
    const isInPrimaryColumn = header.closest('[data-testid="primaryColumn"]');
    
    if (!hasBackButton && !isInPrimaryColumn) {
      console.error('🚫 BLOCKED: No back button and not in primary column - not bookmarks page!');
      return; // ABORT COMPLETELY
    }
    
    // FINAL VALIDATION: Check container structure
    const containerHasCorrectStructure = container.classList.contains('css-175oi2r') && 
                                        container.classList.contains('r-1habvwh');
    
    if (!containerHasCorrectStructure) {
      console.error('🚫 BLOCKED: Container does not have correct CSS structure!');
      console.error('🚫 Container classes:', container.className);
      return; // ABORT COMPLETELY
    }
    
    console.log('✅ VALIDATED: Safe to place toggle');
    console.log('✅ Header path:', this.getElementPath(header));
    console.log('✅ Container path:', this.getElementPath(container));
    
    // Create toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.id = 'xsaved-bookmarks-toggle';
    toggleContainer.style.cssText = `
      display: contents;
      align-items: center;
      gap: 12px;
      margin-left: 16px;
      padding: 6px 12px;
      background: rgba(29, 161, 242, 0.1);
      border: 1px solid rgba(29, 161, 242, 0.3);
      border-radius: 18px;
      font-size: 13px;
      font-weight: 500;
      color: rgb(29, 161, 242);
      transition: all 0.2s ease;
      vertical-align: middle;
      position: relative;
      z-index: 1000;
    `;
    
    // Create toggle switch
    const toggleSwitch = document.createElement('label');
    toggleSwitch.style.cssText = `
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      cursor: pointer;
    `;
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.style.cssText = `
      opacity: 0;
      width: 0;
      height: 0;
    `;
    toggleInput.checked = false;
    
    const toggleSlider = document.createElement('span');
    toggleSlider.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      border-radius: 26px;
      transition: background-color 0.2s ease;
      box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.1);
    `;
    
    const toggleDot = document.createElement('span');
    toggleDot.style.cssText = `
      position: absolute;
      height: 20px;
      width: 20px;
      left: 3px;
      top: 3px;
      background-color: white;
      border-radius: 50%;
      transition: left 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);
    toggleSlider.appendChild(toggleDot);
    
    // Create stats indicator (bookmark count)
    const statsIndicator = document.createElement('span');
    statsIndicator.id = 'xsaved-stats-indicator';
    statsIndicator.style.cssText = `
      background: rgba(29, 161, 242, 0.2);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      color: rgb(29, 161, 242);
    `;
    statsIndicator.textContent = this.stats ? `${this.stats.totalBookmarks} saved` : 'Loading...';
    
    // Create sync spinner
    const syncSpinner = document.createElement('div');
    syncSpinner.id = 'xsaved-sync-spinner';
    syncSpinner.style.cssText = `
      width: 16px;
      height: 16px;
      border: 2px solid rgba(29, 161, 242, 0.2);
      border-top: 2px solid rgb(29, 161, 242);
      border-radius: 50%;
      animation: xsaved-spin 1s linear infinite;
      display: none;
      margin-left: 8px;
    `;
    
    // Add spinner animation CSS
    if (!document.getElementById('xsaved-spinner-styles')) {
      const spinnerStyles = document.createElement('style');
      spinnerStyles.id = 'xsaved-spinner-styles';
      spinnerStyles.textContent = `
        @keyframes xsaved-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(spinnerStyles);
    }
    
    // Add toggle event - IMMEDIATE ANIMATION (no waiting for grid load)
    toggleInput.addEventListener('change', (e) => {
      const isActive = e.target.checked;
      
      // IMMEDIATE animation update - no lag
      toggleSlider.style.backgroundColor = isActive ? '#1DA1F2' : '#ccc';
      toggleDot.style.left = isActive ? '25px' : '3px';
      
      // Trigger grid mode asynchronously (don't wait for it)
      if (isActive) {
        // Show grid mode but don't block the toggle animation
        setTimeout(() => {
          this.showGridInterface();
        }, 0); // Immediate but async
      } else {
        this.hideGridInterface();
      }
    });
    
    // Assemble toggle (no text labels, just toggle + count + spinner)
    toggleContainer.appendChild(toggleSwitch);
    toggleContainer.appendChild(statsIndicator);
    toggleContainer.appendChild(syncSpinner);
    
    // Style the container to use flexbox layout
    container.style.cssText = `
      display: flex;
      align-items: center;
      flex-direction: row;
      gap: 16px;
    `;
    
    // Insert toggle inside the container, right after the h2 header
    header.style.display = 'inline-block';
    header.insertAdjacentElement('afterend', toggleContainer);
    
    console.log('✅ Successfully placed bookmarks toggle');
  }

  getElementPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
      }
      
      if (current.className) {
        const classes = current.className.split(' ').slice(0, 3); // First 3 classes only
        selector += '.' + classes.join('.');
      }
      
      if (current.hasAttribute('data-testid')) {
        selector += `[data-testid="${current.getAttribute('data-testid')}"]`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  async waitForBookmarksPageLoad() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20; // Increased to 10 seconds (20 * 500ms)
      
      const checkForContent = () => {
        attempts++;
        
        // Multiple strategies to detect bookmarks page content
        const strategies = [
          // Strategy 1: Look for specific h2 with bookmarks text
          () => {
            const headers = document.querySelectorAll('h2[dir="ltr"]');
            return Array.from(headers).find(h => 
              h.textContent && h.textContent.toLowerCase().includes('bookmark')
            );
          },
          // Strategy 2: Look for the container we know should exist
          () => {
            const container = document.querySelector('div.css-175oi2r.r-1habvwh');
            if (container) {
              const h2 = container.querySelector('h2');
              return h2 && h2.textContent && h2.textContent.toLowerCase().includes('bookmark') ? h2 : null;
            }
            return null;
          },
          // Strategy 3: Look for any h2 that might be the bookmarks header
          () => {
            const headers = document.querySelectorAll('h2');
            return Array.from(headers).find(h => {
              const text = h.textContent ? h.textContent.toLowerCase() : '';
              return text.includes('bookmark') || text.includes('saved') || text === 'bookmarks';
            });
          },
          // Strategy 4: Look for any content that indicates bookmarks page is loading
          () => {
            const currentUrl = window.location.pathname;
            if (currentUrl.includes('/bookmarks') || currentUrl.includes('/i/bookmarks')) {
              // Only proceed if we can find some bookmarks-specific content, not just any main element
              const bookmarksContent = document.querySelector('[data-testid="primaryColumn"] h2') ||
                                     document.querySelector('main h2') ||
                                     document.querySelector('[role="main"] h2');
              return bookmarksContent;
            }
            return null;
          }
        ];
        
        let foundHeader = null;
        for (const strategy of strategies) {
          foundHeader = strategy();
          if (foundHeader) {
            console.log(`✅ Bookmarks page content detected using strategy, proceeding with toggle placement`);
            console.log('📍 Found header text:', foundHeader.textContent || 'URL-based detection');
            resolve();
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.warn(`⚠️ Bookmarks page content detection timed out after ${maxAttempts} attempts.`);
          reject(new Error('Bookmarks page content not detected'));
          return;
        }
        
        console.log(`⏳ Waiting for bookmarks page content to load... (attempt ${attempts}/${maxAttempts})`);
        setTimeout(checkForContent, 500);
      };
      
      checkForContent();
    });
  }



  tryAlternativeTogglePlacement() {
    console.log('🔧 Trying alternative toggle placement strategies...');
    
    // Strategy 1: Try to find any main content area
    const mainContent = document.querySelector('main') || 
                       document.querySelector('[data-testid="primaryColumn"]') ||
                       document.querySelector('[role="main"]');
    
    if (mainContent) {
      console.log('📍 Found main content area, attempting placement...');
      
      // Create a simple toggle container
      const toggleContainer = document.createElement('div');
      toggleContainer.id = 'xsaved-bookmarks-toggle';
      toggleContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(29, 161, 242, 0.9);
        border: 1px solid rgba(29, 161, 242, 1);
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      
      // Create toggle switch
      const toggleSwitch = document.createElement('label');
      toggleSwitch.style.cssText = `
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
        cursor: pointer;
      `;
      
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.style.opacity = '0';
      toggleInput.checked = false;
      
      const toggleSlider = document.createElement('span');
      toggleSlider.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        border-radius: 24px;
        transition: 0.4s;
      `;
      
      const toggleDot = document.createElement('span');
      toggleDot.style.cssText = `
        position: absolute;
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: 0.4s;
      `;
      
      toggleSwitch.appendChild(toggleInput);
      toggleSwitch.appendChild(toggleSlider);
      toggleSlider.appendChild(toggleDot);
      
      // Create label
      const labelText = document.createElement('span');
      labelText.textContent = 'XSaved Grid';
      labelText.style.fontWeight = '600';
      
      // Add to container
      toggleContainer.appendChild(labelText);
      toggleContainer.appendChild(toggleSwitch);
      
      // Add to page
      document.body.appendChild(toggleContainer);
      
      // Add toggle functionality
      toggleInput.addEventListener('change', (e) => {
        const isActive = e.target.checked;
        labelText.textContent = isActive ? 'XSaved Grid' : 'Default View';
        toggleSlider.style.backgroundColor = isActive ? '#1DA1F2' : '#ccc';
        toggleDot.style.left = isActive ? '27px' : '3px';
        this.toggleGridMode(isActive);
      });
      
      console.log('✅ Successfully placed toggle using alternative strategy (fixed position)');
      return true;
    }
    
    return false;
  }

  debugDOMState() {
    console.log('🔍 DOM Debug State:');
    console.log('- Current URL:', window.location.href);
    console.log('- Available h2 elements:', document.querySelectorAll('h2').length);
    console.log('- Available containers:', document.querySelectorAll('div.css-175oi2r.r-1habvwh').length);
    
    const allH2s = document.querySelectorAll('h2');
    console.log('- H2 elements found:');
    Array.from(allH2s).forEach((h2, index) => {
      console.log(`  ${index + 1}: "${h2.textContent}" (${h2.className})`);
    });
    
    const containers = document.querySelectorAll('div.css-175oi2r.r-1habvwh');
    console.log('- Containers found:');
    Array.from(containers).forEach((container, index) => {
      const h2InContainer = container.querySelector('h2');
      console.log(`  ${index + 1}: Has h2: ${!!h2InContainer}, H2 text: "${h2InContainer?.textContent || 'none'}"`);
    });
  }

  toggleGridMode(activate) {
    console.log(`🔄 Toggling grid mode: ${activate ? 'ON' : 'OFF'}`);
    
    // Update grid state tracking
    isGridModeActive = activate;
    
    // Simple immediate toggle - no waiting for content
    if (activate) {
      this.showGridInterface();
    } else {
      this.hideGridInterface();
    }
  }

  async waitForBookmarksContent() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkForContent = () => {
        attempts++;
        
        // Check if bookmarks content is loaded
        const bookmarksContent = document.querySelector('[data-testid="tweet"]') ||
                                document.querySelector('[data-testid="tweetText"]') ||
                                document.querySelector('[data-testid="primaryColumn"] [data-testid="tweet"]');
        
        if (bookmarksContent) {
          console.log('✅ Bookmarks content is loaded, proceeding with grid mode');
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.warn('⚠️ Bookmarks content detection timed out');
          reject(new Error('Content not loaded'));
          return;
        }
        
        console.log(`⏳ Waiting for bookmarks content... (attempt ${attempts}/${maxAttempts})`);
        setTimeout(checkForContent, 500);
      };
      
      checkForContent();
    });
  }

  showGridInterface() {
    console.log('🏗️ Showing XSaved grid interface...');
    
    // Create grid overlay
    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'xsaved-grid-overlay';
    gridOverlay.className = 'xsaved-grid-overlay';
    gridOverlay.style.cssText = `
      position: fixed;
      top: 50px;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgb(0, 0, 0);
      z-index: 10000;
      padding: 20px;
      overflow-y: auto;
    `;

    // Disable scrolling on the main page
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Hide X.com search input
    const searchInput = document.querySelector('input[data-testid="SearchBox_Search_Input"]');
    if (searchInput) {
      const searchContainer = searchInput.closest('div.css-175oi2r.r-1awozwy.r-aqfbo4.r-kemksi.r-18u37iz.r-1h3ijdo.r-6gpygo.r-15ysp7h.r-1xcajam.r-ipm5af.r-136ojw6.r-1hycxz');
      if (searchContainer) {
        searchContainer.style.display = 'none';
        searchContainer.setAttribute('data-xsaved-hidden', 'true');
      }
    }

    document.body.appendChild(gridOverlay);

    // Initialize selection manager with the grid container
    this.selectionManager.initialize(gridOverlay);
    this.deleteEnabled = true;
    
    // Set up callback to update button state when selection mode changes
    this.selectionManager.setSelectionModeChangeCallback((isActive) => {
      this.updateSelectionButtonState(isActive);
    });

    // Render the static layout (navbar, search, tags)
    this.renderLayout(gridOverlay);

    // Load bookmarks immediately with existing data
    this.loadBookmarksGrid(gridOverlay);
    
    // Trigger quick delta sync in background and refresh if new data found
    console.log('🚀 Grid activated - starting background sync');
    chrome.runtime.sendMessage({ action: 'quickDeltaSync' }, (response) => {
      if (response?.success) {
        if (response.skipped) {
          console.log(`⏸️ Quick sync skipped: ${response.message} (${response.reason})`);
        } else {
          console.log('✅ Quick sync completed - checking for grid refresh');
          // Refresh the grid to show any new data
          this.refreshGridAfterSync();
        }
      } else {
        console.log('⚠️ Quick sync failed on grid activation:', response?.error);
      }
    });
  }

  /**
   * Render the static layout (navbar, search, tags, sort buttons)
   * This creates the UI shell that persists across data updates
   */
  renderLayout(container) {
    // Store container reference for filtering
    this.currentGridContainer = container;
    
    // Clean up any existing fixed header to prevent sizing issues
    const existingHeader = document.getElementById('xsaved-fixed-header');
    if (existingHeader) {
      existingHeader.remove();
    }

    // Create fixed header container (outside the overlay container)
    const headerContainer = document.createElement('div');
    headerContainer.id = 'xsaved-fixed-header';
    headerContainer.className = 'xsaved-navbar';
    headerContainer.style.cssText = `
      position: fixed;
      top: 50px;
      left: 0;
      right: 0;
      z-index: 10001;
      padding: 20px;
    `;

    // Create header with search, export, and tag filters in one row
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    `;

    // TODO: TEMPORARILY DISABLED - Filters navbar (tag selectors) 
    // This feature will be re-implemented in a future version with improved UX
    // The tag filtering system needs to be redesigned to work better with the search functionality
    // and provide a more intuitive user experience for organizing bookmarks by categories.
    
    // Left side: Tag filters
    const tagSelector = document.createElement('div');
    tagSelector.style.cssText = `
      display: flex;
      gap: 12px;
      overflow-x: auto;
      flex: 1;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding-right: 20px;
    `;
    tagSelector.style.webkitScrollbar = 'none';

    // Extended sample tags for scroll testing
    const sampleTags = [
      'All', 'Tech', 'AI', 'Programming', 'Design', 'Music', 'Gaming', 'News', 
      'Sports', 'Entertainment', 'Science', 'Business', 'Finance', 'Health', 
      'Travel', 'Food', 'Fashion', 'Art', 'Education', 'Politics', 'Environment'
    ];
    
    // Track selected tags for multi-select - use class-level state
    const selectedTags = this.currentSelectedTags;
    
    sampleTags.forEach(tag => {
      const tagButton = document.createElement('button');
      tagButton.textContent = tag;
      tagButton.dataset.tag = tag;
      tagButton.className = `xsaved-tag-selector ${tag === 'All' ? 'active' : ''}`;
      tagButton.style.cssText = `
        white-space: nowrap;
        flex-shrink: 0;
        position: relative;
      `;

      tagButton.addEventListener('click', () => {
        if (tag === 'All') {
          // If "All" is clicked, deselect everything else and select only "All"
          selectedTags.clear();
          selectedTags.add('All');
          tagSelector.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
          });
          tagButton.classList.add('active');
        } else {
          // Remove "All" from selection when other tags are selected
          selectedTags.delete('All');
          const allButton = tagSelector.querySelector('[data-tag="All"]');
          if (allButton) {
            allButton.classList.remove('active');
          }

          if (selectedTags.has(tag)) {
            // Deselect tag
            selectedTags.delete(tag);
            tagButton.classList.remove('active');
          } else {
            // Select tag
            selectedTags.add(tag);
            tagButton.classList.add('active');
          }

          // If no tags selected, select "All"
          if (selectedTags.size === 0) {
            selectedTags.add('All');
            const allButton = tagSelector.querySelector('[data-tag="All"]');
            if (allButton) {
              allButton.classList.add('active');
            }
          }
        }
        
        console.log(`🏷️ Selected tags:`, Array.from(selectedTags));
        
        // Trigger bookmark filtering based on selected tags
        this.filterBookmarksByTags(Array.from(selectedTags), this.currentGridContainer);
      });

      tagSelector.appendChild(tagButton);
    });
    
    // Right side: Search and Export
    const rightSide = document.createElement('div');
    rightSide.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    `;

    // Create search container (revert to original)
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
      position: relative;
      display: inline-block;
    `;

    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.placeholder = 'Search bookmarks... (use @ for authors)';
    searchBox.className = 'xsaved-search-input';
    searchBox.style.cssText = `
      width: 300px;
    `;
    
    // Create author dropdown
    const authorDropdown = document.createElement('div');
    authorDropdown.className = 'xsaved-author-dropdown';
    authorDropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 300px;
      background: var(--xsaved-surface-color);
      border: 1px solid var(--xsaved-border-color);
      border-radius: var(--xsaved-radius-medium);
      box-shadow: var(--xsaved-shadow-heavy);
      z-index: 10001;
      overflow-y: auto;
      display: none;
    `;

    searchContainer.appendChild(searchBox);
    searchContainer.appendChild(authorDropdown);

    // Sort button
    const sortButton = document.createElement('button');
    sortButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
      </svg>
    `;
    sortButton.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: var(--xsaved-surface-color);
      border: 1px solid var(--xsaved-border-color);
      border-radius: 20px;
      color: var(--xsaved-text-color);
      cursor: pointer;
      transition: all 0.2s ease;
      margin-right: 8px;
    `;

    sortButton.addEventListener('mouseenter', () => {
      sortButton.style.background = 'var(--xsaved-hover-color)';
    });
    sortButton.addEventListener('mouseleave', () => {
      sortButton.style.background = 'var(--xsaved-surface-color)';
    });

    sortButton.addEventListener('click', () => {
      console.log('🔄 Sort button clicked');
      this.showSortMenuWithFilters(sortButton, executeSearch);
    });

    // Selection toggle button
    const selectionToggle = document.createElement('button');
    selectionToggle.id = 'xsaved-selection-toggle';
    selectionToggle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
        <path d="M200-200v80q-33 0-56.5-23.5T120-200h80Zm-80-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm80-160h-80q0-33 23.5-56.5T200-840v80Zm80 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 560h80q0 33-23.5 56.5T760-120v-80Zm0-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80q33 0 56.5 23.5T840-760h-80Z"/>
      </svg>
    `;
    selectionToggle.title = 'Toggle selection mode';
    selectionToggle.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: var(--xsaved-surface-color);
      border: 1px solid var(--xsaved-border-color);
      border-radius: 20px;
      color: var(--xsaved-text-color);
      cursor: pointer;
      transition: all 0.2s ease;
      margin-right: 8px;
      font-size: 14px;
      font-weight: 500;
    `;

    selectionToggle.addEventListener('mouseenter', () => {
      if (!this.selectionManager.isSelectionMode) {
        selectionToggle.style.background = 'var(--xsaved-hover-color)';
      }
    });
    selectionToggle.addEventListener('mouseleave', () => {
      if (!this.selectionManager.isSelectionMode) {
        selectionToggle.style.background = 'var(--xsaved-surface-color)';
      }
    });

    selectionToggle.addEventListener('click', () => {
      console.log('📋 Selection toggle clicked');
      this.toggleSelectionMode(selectionToggle);
    });

    // TODO: TEMPORARILY DISABLED - Export/Download button
    // This feature will be re-implemented in a future version with enhanced export options
    // The export system needs to be redesigned to support more formats, better filtering,
    // and improved user experience for exporting bookmark collections.
    
    /*
    // Download button
    const downloadButton = document.createElement('button');
    downloadButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C13.1 2 14 2.9 14 4V12L16.5 9.5C16.9 9.1 17.5 9.1 17.9 9.5C18.3 9.9 18.3 10.5 17.9 10.9L12.7 16.1C12.3 16.5 11.7 16.5 11.3 16.1L6.1 10.9C5.7 10.5 5.7 9.9 6.1 9.5C6.5 9.1 7.1 9.1 7.5 9.5L10 12V4C10 2.9 10.9 2 12 2Z"/>
        <path d="M20 20H4V18H20V20Z"/>
      </svg>
    `;
    downloadButton.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: color-mix(in srgb, var(--xsaved-accent-color) 20%, transparent);
      border: 1px solid color-mix(in srgb, var(--xsaved-accent-color) 40%, transparent);
      border-radius: 20px;
      color: var(--xsaved-accent-color);
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    downloadButton.addEventListener('mouseenter', () => {
      downloadButton.style.background = 'color-mix(in srgb, var(--xsaved-accent-color) 30%, transparent)';
    });
    downloadButton.addEventListener('mouseleave', () => {
      downloadButton.style.background = 'color-mix(in srgb, var(--xsaved-accent-color) 20%, transparent)';
    });

    downloadButton.addEventListener('click', () => {
      console.log('📤 Download button clicked');
      this.showExportDialog(this.allBookmarks || []);
    });
    */

    rightSide.appendChild(searchContainer);
    rightSide.appendChild(sortButton);
    rightSide.appendChild(selectionToggle);
    // rightSide.appendChild(downloadButton); // Temporarily disabled

    header.appendChild(tagSelector);
    header.appendChild(rightSide);
    headerContainer.appendChild(header);

    // Add header to document body (outside the overlay container)
    document.body.appendChild(headerContainer);

    // Create content container with top margin to account for fixed header
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      margin-top: 100px;
      padding: 0 8px;
    `;

    // Create grid container
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.id = 'xsaved-bookmarks-grid';
    
    // Card size constraints
    const CARD_SIZES = {
      MIN_WIDTH: 160,    // Minimum card width
      MAX_WIDTH: 280,    // Maximum card width  
      IDEAL_WIDTH: 220,  // Preferred card width
    };

    // Function to calculate optimal grid layout
    const updateOptimalGridLayout = () => {
      // Get actual available width accounting for all padding/margins
      const contentPadding = 16; // 8px on each side from contentContainer
      const viewportWidth = window.innerWidth;
      const availableWidth = viewportWidth - contentPadding;
      
      let columns, gap;
      
      console.log(`🔍 Debug: viewport=${viewportWidth}px, available=${availableWidth}px`);
      
      // Mobile constraint: ≤640px always shows exactly 2 columns
      if (viewportWidth <= 640) {
        columns = 2;
        gap = 2;
        console.log(`📱 Mobile mode: ${columns} columns, ${gap}px gap`);
      } else {
        // Calculate optimal columns for larger screens
        // Start with ideal width and adjust based on constraints
        let testColumns = Math.floor(availableWidth / CARD_SIZES.IDEAL_WIDTH);
        
        // Ensure minimum 2 columns
        testColumns = Math.max(2, testColumns);
        
        // Initialize gap for calculations (will be set properly later)
        gap = 4; // Default gap for calculations
        
        // Calculate actual card width with this column count
        let actualCardWidth = (availableWidth - (gap * (testColumns - 1))) / testColumns;
        
        // If cards would be too wide, increase columns
        while (actualCardWidth > CARD_SIZES.MAX_WIDTH && testColumns < 8) {
          testColumns++;
          actualCardWidth = (availableWidth - (gap * (testColumns - 1))) / testColumns;
        }
        
        // If cards would be too narrow, decrease columns
        while (actualCardWidth < CARD_SIZES.MIN_WIDTH && testColumns > 2) {
          testColumns--;
          actualCardWidth = (availableWidth - (gap * (testColumns - 1))) / testColumns;
        }
        
        columns = testColumns;
        
        // Progressive gap sizing based on screen width
        if (availableWidth <= 768) {
          gap = 3;
        } else if (availableWidth <= 1200) {
          gap = 4;
        } else if (availableWidth <= 1600) {
          gap = 5;
        } else {
          gap = 6;
        }
      }
      
      // Apply the calculated layout with !important to override any conflicting CSS
      grid.style.cssText = `
        display: grid !important;
        grid-template-columns: repeat(${columns}, 1fr) !important;
        gap: ${gap}px !important;
        width: 100% !important;
        margin-bottom: 40px !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        justify-content: stretch !important;
      `;
      
      console.log(`📐 Applied Grid: ${columns} cols, ${gap}px gap, template-columns: repeat(${columns}, 1fr)`);
    };
    
    // Initial layout
    updateOptimalGridLayout();
    
    // Debounced resize handler for better performance
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateOptimalGridLayout, 100);
    };
    
    // Update on resize
    window.addEventListener('resize', debouncedResize);

    container.appendChild(contentContainer);
    contentContainer.appendChild(grid);

    // Unified search state management
    let activeFilters = []; // All search criteria: text, author, tags, etc.
    let searchTimeout;
    let authorSearchTimeout;
    let selectedAuthorIndex = -1;
    let currentAuthors = [];
    
    // Unified filter management
    const updateFilter = (type, value, label, avatarUrl) => {
      console.log(`🔧 updateFilter called:`, { type, value, label, avatarUrl });
      
      // Remove existing filter of same type
      activeFilters = activeFilters.filter(f => f.type !== type);
      
      // Add new filter if value provided
      if (value && value.trim()) {
        activeFilters.push({ type, value: value.trim(), label, avatarUrl });
      }
      
      console.log(`🔧 Updated activeFilters:`, activeFilters);
      
      updateSearchBoxForFilters();
      executeSearch();
    };
    
    const removeFilter = (type) => {
      activeFilters = activeFilters.filter(f => f.type !== type);
      updateSearchBoxForFilters();
      executeSearch();
    };
    
    const clearAllFilters = () => {
      activeFilters = [];
      searchBox.value = '';
      updateSearchBoxForFilters();
      executeSearch();
    };
    
    const getFilterByType = (type) => {
      return activeFilters.find(f => f.type === type);
    };
    
    const updateSearchBoxForFilters = () => {
      // Check for author filter first (priority display)
      const authorFilter = getFilterByType('author');
      const textFilter = getFilterByType('text');
      
      if (authorFilter) {
        // Show author filter with avatar
        const existingAvatar = searchContainer.querySelector('.filter-avatar');
        if (existingAvatar) {
          existingAvatar.remove();
        }
        
        // Add avatar if available
        if (authorFilter.avatarUrl) {
          const avatar = document.createElement('img');
          avatar.src = authorFilter.avatarUrl;
          avatar.className = 'filter-avatar';
          avatar.style.cssText = `
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            border-radius: 50%;
            z-index: 1;
          `;
          
          avatar.onerror = () => {
            avatar.style.display = 'none';
          };
          
          searchContainer.appendChild(avatar);
          searchBox.style.paddingLeft = '36px';
        } else {
          searchBox.style.paddingLeft = '8px';
        }
        
        searchBox.value = authorFilter.label + ' (click to remove)';
        searchBox.readOnly = true;
        searchBox.style.color = '#60A5FA';
        searchBox.style.cursor = 'pointer';
        
        searchBox.onclick = () => {
          removeFilter('author');
        };
      } else if (textFilter) {
        // Show text in search box normally
        const existingAvatar = searchContainer.querySelector('.filter-avatar');
        if (existingAvatar) {
          existingAvatar.remove();
        }
        
        searchBox.value = textFilter.value;
        searchBox.readOnly = false;
        searchBox.style.color = 'white';
        searchBox.style.cursor = 'text';
        searchBox.style.paddingLeft = '8px';
        searchBox.placeholder = 'Search bookmarks... (use @ for authors)';
        searchBox.onclick = null;
      } else {
        // No filters - restore default
        const existingAvatar = searchContainer.querySelector('.filter-avatar');
        if (existingAvatar) {
          existingAvatar.remove();
        }
        
        searchBox.value = '';
        searchBox.readOnly = false;
        searchBox.style.color = 'white';
        searchBox.style.cursor = 'text';
        searchBox.style.paddingLeft = '8px';
        searchBox.placeholder = 'Search bookmarks... (use @ for authors)';
        searchBox.onclick = null;
      }
    };
    
    const executeSearch = () => {
      // Build unified search query from all active filters
      const searchQuery = {
        limit: PAGINATION_CONFIG.INITIAL_LOAD,
        offset: 0,
        sortBy: this.currentSort?.field || 'created_at',
        sortOrder: this.currentSort?.order || 'desc'
      };
      
      // Apply all active filters
      activeFilters.forEach(filter => {
        switch (filter.type) {
          case 'text':
            searchQuery.text = filter.value;
            break;
          case 'author':
            searchQuery.author = filter.value;
            break;
          case 'tag':
            searchQuery.tags = searchQuery.tags || [];
            searchQuery.tags.push(filter.value);
            break;
          // Future: date ranges, media filters, etc.
        }
      });
      
      console.log(`🔍 Unified search query:`, searchQuery, 'from filters:', activeFilters);
      console.log(`🔍 About to call loadBookmarksPage with query:`, JSON.stringify(searchQuery, null, 2));
      
      // Reset pagination and execute
      this.resetPagination();
      this.pagination.currentQuery = searchQuery;
      this.scrollToTopOfGrid();
      this.loadBookmarksPage(container, searchQuery, false);
    };
    
    const showAuthorDropdown = async (query = '') => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'searchAuthors',
          query: query,
          limit: 10
        });
        
        if (response && response.success) {
          currentAuthors = response.authors;
          renderAuthorDropdown(currentAuthors);
          authorDropdown.style.display = 'block';
          selectedAuthorIndex = -1;
        } else {
          console.error('❌ Author search failed:', response?.error);
        }
      } catch (error) {
        console.error('❌ Author search error:', error);
      }
    };

    // PROVISIONAL FUNCTION: Same as showAuthorDropdown but offsets the first result
    const showAuthorDropdownProvisional = async (query = '') => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'searchAuthors',
          query: query,
          limit: 10
        });
        
        if (response && response.success) {
          // Offset the first result by moving it to the end
          let authors = response.authors;
          if (authors.length > 1) {
            const firstAuthor = authors.shift(); // Remove first author
            authors.push(firstAuthor); // Add it to the end
          }
          
          currentAuthors = authors;
          renderAuthorDropdown(currentAuthors);
          authorDropdown.style.display = 'block';
          selectedAuthorIndex = -1;
        } else {
          console.error('❌ Author search failed:', response?.error);
        }
      } catch (error) {
        console.error('❌ Author search error:', error);
      }
    };
    
    const hideAuthorDropdown = () => {
      authorDropdown.style.display = 'none';
      selectedAuthorIndex = -1;
      currentAuthors = [];
    };
    
    const renderAuthorDropdown = (authors) => {
      authorDropdown.innerHTML = '';
      
      if (authors.length === 0) {
        const noResults = document.createElement('div');
        noResults.textContent = 'No authors found';
        noResults.style.cssText = `
          padding: 12px 16px;
          color: var(--xsaved-text-secondary);
          font-style: italic;
        `;
        authorDropdown.appendChild(noResults);
        return;
      }
      
      authors.forEach((authorData, index) => {
        const item = document.createElement('div');
        item.className = 'author-dropdown-item';
        item.style.cssText = `
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--xsaved-border-color);
          transition: background-color 0.15s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        `;
        
        // Create avatar image
        const avatar = document.createElement('img');
        avatar.src = authorData.avatar_url || '';
        avatar.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--xsaved-border-color);
        `;
        
        // Handle missing or broken avatars
        avatar.onerror = () => {
          avatar.style.display = 'none';
        };
        
        // Create content container
        const content = document.createElement('div');
        content.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
        `;
        
        content.innerHTML = `
          <span style="color: var(--xsaved-text-color); font-weight: 500;">@${authorData.author}</span>
          <span style="color: var(--xsaved-text-secondary); font-size: 12px;">${authorData.count} tweets</span>
        `;
        
        item.appendChild(avatar);
        item.appendChild(content);
        
        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = 'var(--xsaved-hover-color)';
          selectedAuthorIndex = index;
          updateDropdownSelection();
        });
        
        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = 'transparent';
        });
        
        item.addEventListener('click', () => {
          selectAuthor(authorData.author, authorData.avatar_url);
        });
        
        authorDropdown.appendChild(item);
      });
    };
    
    const updateDropdownSelection = () => {
      const items = authorDropdown.querySelectorAll('.author-dropdown-item');
      items.forEach((item, index) => {
        if (index === selectedAuthorIndex) {
          item.style.backgroundColor = 'color-mix(in srgb, var(--xsaved-primary-color) 20%, transparent)';
        } else {
          item.style.backgroundColor = 'transparent';
        }
      });
    };
    
    const selectAuthor = (author, avatarUrl) => {
      console.log(`👤 selectAuthor called:`, { author, avatarUrl });
      
      // Clear the @ from search input if it exists
      const currentValue = searchBox.value;
      const atIndex = currentValue.lastIndexOf('@');
      
      // Remove text filter first (without triggering search)
      if (atIndex !== -1) {
        const remainingText = currentValue.substring(0, atIndex).trim();
        activeFilters = activeFilters.filter(f => f.type !== 'text');
        if (remainingText) {
          activeFilters.push({ type: 'text', value: remainingText, label: remainingText });
        }
      }
      
      // Add author filter (this will trigger search once)
      updateFilter('author', author, `@${author}`, avatarUrl);
      
      hideAuthorDropdown();
      searchBox.focus();
    };
    
    searchBox.addEventListener('input', (e) => {
      // Don't process input if in filter mode (readonly)
      if (searchBox.readOnly) {
        return;
      }
      
      const query = e.target.value;
      console.log(`🔍 Search input event fired: "${query}"`);
      
      // Check if user typed @ symbol
      const atIndex = query.lastIndexOf('@');
      if (atIndex !== -1) {
        // Extract text after the last @
        const afterAt = query.substring(atIndex + 1);
        console.log(`👥 @ detected, searching authors with: "${afterAt}"`);
        
        // Clear previous timeout
        if (authorSearchTimeout) {
          clearTimeout(authorSearchTimeout);
        }
        
        // Debounce author search
        authorSearchTimeout = setTimeout(() => {
          // Provisional in order to do demo.
          // showAuthorDropdown(afterAt);
          showAuthorDropdownProvisional(afterAt);
        }, 200);
        
        return; // Don't trigger regular search while showing author dropdown
      } else {
        hideAuthorDropdown();
      }
      
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Debounce search to avoid excessive calls
      searchTimeout = setTimeout(() => {
        console.log(`🔍 Debounced search triggered for: "${query}"`);
        // Update text filter and execute search
        updateFilter('text', query, query);
      }, 300); // 300ms delay
    });
    
    searchBox.addEventListener('keydown', (e) => {
      if (authorDropdown.style.display === 'block') {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            selectedAuthorIndex = Math.min(selectedAuthorIndex + 1, currentAuthors.length - 1);
            updateDropdownSelection();
            break;
          case 'ArrowUp':
            e.preventDefault();
            selectedAuthorIndex = Math.max(selectedAuthorIndex - 1, 0);
            updateDropdownSelection();
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedAuthorIndex >= 0 && selectedAuthorIndex < currentAuthors.length) {
              const selectedAuthor = currentAuthors[selectedAuthorIndex];
              selectAuthor(selectedAuthor.author, selectedAuthor.avatar_url);
            }
            break;
          case 'Escape':
            e.preventDefault();
            hideAuthorDropdown();
            break;
        }
      }
    });
    
    // Click outside to close dropdown
    document.addEventListener('click', (e) => {
      if (!searchContainer.contains(e.target)) {
        hideAuthorDropdown();
      }
    });

    console.log('✅ Layout rendered');
  }

  /**
   * Render the dynamic grid content (bookmark cards)
   * This updates only the grid items without touching the layout
   */
  renderGrid(bookmarks) {
    const gridEl = document.getElementById('xsaved-bookmarks-grid');
    if (!gridEl) {
      console.error('❌ Grid element not found');
      return;
    }

    gridEl.innerHTML = '';

    // Group bookmarks by date
    const groups = this.groupBookmarksByDateSimple(bookmarks);
    groups.forEach((group, index) => {
      // Always add date separator for each group
      const sep = this.createDateSeparatorSimple(group.date);
      gridEl.appendChild(sep);

      // Append cards
      group.bookmarks.forEach(b => {
        const card = this.createBookmarkCard(b);
        gridEl.appendChild(card);
      });
    });

    console.log(`✅ Grid rendered with ${bookmarks.length} bookmarks`);
  }

  /**
   * Refresh grid after background sync completes
   * Only refreshes if we're currently showing the default view (no active filters)
   */
  refreshGridAfterSync() {
    const gridOverlay = document.getElementById('xsaved-grid-overlay');
    if (!gridOverlay) {
      console.log('⚠️ Grid overlay not found, skipping refresh');
      return;
    }

    // Only refresh if we're showing the default view (no active search/filters)
    const hasActiveFilters = this.activeFilters && this.activeFilters.length > 0;
    const hasActiveSearch = document.getElementById('xsaved-search-input')?.value?.trim();
    
    if (hasActiveFilters || hasActiveSearch) {
      console.log('⏸️ Skipping grid refresh - user has active filters/search');
      return;
    }

    console.log('🔄 Refreshing grid with latest data after sync');
    
    // Reset pagination and reload with fresh data
    this.resetPagination();
    
    // Create fresh query for newest bookmarks
    const query = { 
      text: '', 
      limit: PAGINATION_CONFIG.INITIAL_LOAD, 
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc' 
    };
    
    this.pagination.currentQuery = query;
    this.loadBookmarksPage(gridOverlay, query, false); // false = replace existing data
  }

  hideGridInterface() {
    console.log('🔍 Hiding XSaved grid interface...');
    
    // Clean up selection manager
    if (this.deleteEnabled) {
      this.selectionManager.destroy();
      this.deleteEnabled = false;
    }
    
    const gridOverlay = document.getElementById('xsaved-grid-overlay');
    if (gridOverlay) {
      gridOverlay.remove();
    }

    // Remove the fixed header
    const fixedHeader = document.getElementById('xsaved-fixed-header');
    if (fixedHeader) {
      fixedHeader.remove();
    }

    // Restore scrolling on the main page
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // Reset grid state
    isGridModeActive = false;

    // Show X.com search input
    const searchContainer = document.querySelector('div[data-xsaved-hidden="true"]');
    if (searchContainer) {
      searchContainer.style.display = '';
      searchContainer.removeAttribute('data-xsaved-hidden');
    }
  }

  /**
   * Toggle selection mode on/off
   * @param {HTMLElement} toggleButton - The selection toggle button element
   */
  toggleSelectionMode(toggleButton) {
    if (!this.deleteEnabled) {
      console.warn('⚠️ Selection mode not available - delete functionality not enabled');
      return;
    }

    // Toggle the selection mode
    this.selectionManager.toggleSelectionMode();
    
    // The button state will be updated via the callback
  }

  /**
   * Update the selection button state
   * @param {boolean} isActive - Whether selection mode is active
   */
  updateSelectionButtonState(isActive) {
    const toggleButton = document.getElementById('xsaved-selection-toggle');
    if (!toggleButton) return;

    if (isActive) {
      // Active state - blue background
      toggleButton.style.background = 'var(--xsaved-accent-color, #1DA1F2)';
      toggleButton.style.borderColor = 'var(--xsaved-accent-color, #1DA1F2)';
      toggleButton.style.color = 'white';
      toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
          <path d="M200-200v80q-33 0-56.5-23.5T120-200h80Zm-80-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm80-160h-80q0-33 23.5-56.5T200-840v80Zm80 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 560h80q0 33-23.5 56.5T760-120v-80Zm0-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80q33 0 56.5 23.5T840-760h-80Z"/>
        </svg>
      `;
    } else {
      // Inactive state - normal appearance
      toggleButton.style.background = 'var(--xsaved-surface-color)';
      toggleButton.style.borderColor = 'var(--xsaved-border-color)';
      toggleButton.style.color = 'var(--xsaved-text-color)';
      toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
          <path d="M200-200v80q-33 0-56.5-23.5T120-200h80Zm-80-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm80-160h-80q0-33 23.5-56.5T200-840v80Zm80 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 560h80q0 33-23.5 56.5T760-120v-80Zm0-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80q33 0 56.5 23.5T840-760h-80Z"/>
        </svg>
      `;
    }
  }

  /**
   * Get bookmark limit from configuration
   * @returns {number} Bookmark limit
   */
  getBookmarkLimit() {
    return DEFAULT_BOOKMARK_LIMIT;
  }

  /**
   * Load initial bookmarks with pagination (OPTIMIZED)
   * Loads only 50 bookmarks initially for fast rendering
   */
  async loadBookmarksGrid(container) {
    console.log('📚 Loading bookmarks with pagination...');
    
    // Reset pagination state for fresh load
    this.resetPagination();
    
    // Create initial query (use created_at for newest tweets)
    const query = { 
      text: '', 
      limit: PAGINATION_CONFIG.INITIAL_LOAD, 
      offset: 0,
      sortBy: 'created_at',  // FIXED: Use created_at for newest tweets
      sortOrder: 'desc' 
    };
    
    // Store query for pagination
    this.pagination.currentQuery = query;
    
    // Load first page
    this.loadBookmarksPage(container, query, false); // false = not appending
  }

  /**
   * Reset pagination state for new search/filter
   */
  resetPagination() {
    this.pagination = {
      currentOffset: 0,
      hasMore: true,
      isLoading: false,
      currentQuery: null,
      totalLoaded: 0
    };
    this.allBookmarks = [];
  }

  /**
   * Load a page of bookmarks (initial or additional)
   * @param {Element} container - Grid container
   * @param {Object} query - Search query
   * @param {boolean} append - Whether to append to existing results
   */
  loadBookmarksPage(container, query, append = true) {
    if (this.pagination.isLoading) {
      console.log('⏳ Already loading, skipping...');
      return;
    }
    
    this.pagination.isLoading = true;
    
    // Show loading indicator
    if (append) {
      this.showLoadingIndicator(container);
    }
    
    console.log(`🔍 loadBookmarksPage: Sending search request:`, query);
    
    safeRuntimeMessage({ 
      action: 'searchBookmarks', 
      query: query
    }, (response) => {
      console.log(`🔍 loadBookmarksPage: Received response:`, response);
      this.pagination.isLoading = false;
      
      if (response?.success) {
        let bookmarks = [];
        
        // Handle different response structures
        if (response.result?.bookmarks) {
          // Search engine result: { bookmarks: ScoredBookmark[] }
          bookmarks = response.result.bookmarks.map(scoredBookmark => {
            return scoredBookmark.bookmark || scoredBookmark;
          });
        } else if (response.result?.results) {
          // Fallback result: { results: BookmarkEntity[] }
          bookmarks = response.result.results;
        } else {
          console.warn('❌ Unexpected response structure:', response);
          this.renderGridError(container, 'Unexpected data format');
          return;
        }
        
        // REMOVED: Client-side sorting - trust database sorting!
        
        // Update pagination state
        this.pagination.currentOffset += bookmarks.length;
        this.pagination.totalLoaded += bookmarks.length;
        this.pagination.hasMore = bookmarks.length === query.limit; // If we got less than requested, no more pages
        
        // Clean: No debug logging
        
        if (append) {
          // Grid-only update: append and re-render items (keep header intact)
          this.allBookmarks = [...this.allBookmarks, ...bookmarks];
          this.renderGrid(this.allBookmarks);
        } else {
          // Replace dataset and render
          this.allBookmarks = bookmarks;
          this.renderGrid(bookmarks);
          
          // Initialize currentSort if not set
          if (!this.currentSort) {
            this.currentSort = { field: 'created_at', order: 'desc' };
          }
        }
        
        // Set up infinite scroll after first load
        if (!append) {
          this.setupInfiniteScroll(container);
        }
        
      } else {
        console.error('❌ Failed to load bookmarks:', response?.error);
        this.renderGridError(container, response?.error || 'Failed to load bookmarks');
      }
      
      // Hide loading indicator
      this.hideLoadingIndicator(container);
    });
  }

  // REMOVED: Simple append method - using re-render approach for consistent date grouping

  /**
   * Set up infinite scroll detection
   */
  setupInfiniteScroll(container) {
    // Remove existing scroll listener to prevent duplicates
    if (this.scrollListener) {
      container.removeEventListener('scroll', this.scrollListener);
    }
    
    // Create scroll listener
    this.scrollListener = () => {
      if (this.pagination.isLoading || !this.pagination.hasMore) {
        return;
      }
      
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // Calculate scroll percentage
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      // Trigger load when reaching threshold (90% scrolled)
      if (scrollPercentage >= PAGINATION_CONFIG.SCROLL_THRESHOLD) {
        this.loadMoreBookmarks(container);
      }
    };
    
    // Add scroll listener
    container.addEventListener('scroll', this.scrollListener);
    // Clean: No debug logging
  }

  /**
   * Load more bookmarks (next page)
   */
  loadMoreBookmarks(container) {
    if (!this.pagination.currentQuery || !this.pagination.hasMore) {
      return;
    }
    
    // Create next page query
    const nextQuery = {
      ...this.pagination.currentQuery,
      offset: this.pagination.currentOffset,
      limit: PAGINATION_CONFIG.PAGE_SIZE
    };
    
    // Clean: No debug logging
    
    // Load next page
    this.loadBookmarksPage(container, nextQuery, true); // true = append
  }

  /**
   * Show loading indicator at bottom of grid
   */
  showLoadingIndicator(container) {
    // Remove existing indicator
    this.hideLoadingIndicator(container);
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'xsaved-loading-indicator';
    loadingDiv.style.cssText = `
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    `;
    loadingDiv.innerHTML = '⏳ Loading more bookmarks...';
    
    container.appendChild(loadingDiv);
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator(container) {
    const indicator = container.querySelector('#xsaved-loading-indicator');
    if (indicator) {
      indicator.remove();
    }
  }



  /**
   * Group bookmarks by month/year using created_at and current sort
   */
  groupBookmarksByDateSimple(bookmarks) {
    // Ensure sort defaults
    if (!this.currentSort) {
      this.currentSort = { field: 'created_at', order: 'desc' };
    }

    const grouped = bookmarks.reduce((acc, bookmark) => {
      const date = new Date(bookmark.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!acc[key]) {
        acc[key] = {
          date: new Date(date.getFullYear(), date.getMonth(), 1),
          bookmarks: []
        };
      }
      acc[key].bookmarks.push(bookmark);
      return acc;
    }, {});

    const dir = this.currentSort.order === 'asc' ? 1 : -1;
    return Object.values(grouped).sort((a, b) => dir * (a.date.getTime() - b.date.getTime()));
  }

  /**
   * Create a simple date separator element
   */
  createDateSeparatorSimple(date) {
    const separator = document.createElement('div');
    separator.style.cssText = `
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      margin: 24px 0;
      padding-left: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const dateText = document.createElement('span');
    dateText.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: #9CA3AF;
      white-space: nowrap;
    `;
    dateText.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const line = document.createElement('div');
    line.style.cssText = `
      flex-grow: 1;
      height: 1px;
      margin-left: 16px;
      background: linear-gradient(to right, #4B5563, transparent);
    `;

    separator.appendChild(dateText);
    separator.appendChild(line);
    return separator;
  }

  /**
   * Filter bookmarks by selected tags using search engine (CONSISTENT WITH SEARCH INPUT)
   * @param {Array} selectedTags - Array of selected tag names
   * @param {Element} container - Grid container to update
   */
  async filterBookmarksByTags(selectedTags, container) {
    console.log(`🔍 Tag filtering with search engine:`, selectedTags);
    
    // Update current selected tags
    this.currentSelectedTags = new Set(selectedTags);
    
    // Create search query for tag filtering
    const searchQuery = {
      text: '', // No text search for tag filtering
      tags: selectedTags.includes('All') || selectedTags.length === 0 ? [] : selectedTags,
      limit: PAGINATION_CONFIG.INITIAL_LOAD,
      offset: 0,
      sortBy: this.currentSort?.field || 'created_at',
      sortOrder: this.currentSort?.order || 'desc'
    };
    
    console.log(`🔍 Tag search query:`, searchQuery);
    
    // Reset pagination for tag filtering
    this.resetPagination();
    this.pagination.currentQuery = searchQuery;
    
    // Use the same search engine flow as search input
    this.loadBookmarksPage(container, searchQuery, false);
  }

  /**
   * Update only the grid content without recreating the navbar
   * @param {Array} bookmarks - Filtered bookmarks to display
   */
  updateGridContent(bookmarks) {
    console.log(`🔄 Updating grid content with ${bookmarks.length} bookmarks`);
    
    // Find the existing grid container
    const grid = document.getElementById('xsaved-bookmarks-grid');
    if (!grid) {
      console.error('❌ Grid element not found');
      return;
    }
    
    // Helper function to group bookmarks by month/year
    const groupBookmarksByDate = (bookmarks) => {
      // Ensure currentSort has a default value
      if (!this.currentSort) {
        this.currentSort = { field: 'created_at', order: 'desc' };
      }
      
      // Use the same date field that was used for sorting
      const dateField = this.currentSort.field === 'bookmarked_at' ? 'bookmarked_at' : 'created_at';
      
      const grouped = bookmarks.reduce((acc, bookmark) => {
        const date = new Date(bookmark[dateField] || bookmark.created_at);
        const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!acc[monthYear]) {
          acc[monthYear] = {
            date: new Date(date.getFullYear(), date.getMonth(), 1),
            bookmarks: []
          };
        }
        
        acc[monthYear].bookmarks.push(bookmark);
        return acc;
      }, {});
      
      // Respect current sort order instead of hardcoding newest first
      const sortDirection = this.currentSort.order === 'asc' ? 1 : -1;
      return Object.values(grouped).sort((a, b) => 
        sortDirection * (a.date.getTime() - b.date.getTime())
      );
    };

    // Convert grouped bookmarks to grid items with separators
    const createGridItems = (bookmarks) => {
      const grouped = groupBookmarksByDate(bookmarks);
      const items = [];
      let dealIndex = 0;
      
      grouped.forEach((group, groupIndex) => {
        // Add separator for each group
        // Only show first separator if we have explicit sorting, otherwise skip first
        const showFirstSeparator = this.currentSort && (this.currentSort.field !== 'created_at' || this.currentSort.order !== 'desc');
        if (groupIndex > 0 || showFirstSeparator) {
          items.push({
            type: 'separator',
            date: group.date
          });
        }
        
        // Add all bookmarks in this group
        group.bookmarks.forEach(bookmark => {
          items.push({
            type: 'bookmark',
            bookmark: bookmark,
            dealIndex
          });
          dealIndex++;
        });
      });
      
      return items;
    };

    // Create date separator element
    const createDateSeparator = (date) => {
      const separator = document.createElement('div');
      separator.style.cssText = `
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        margin: 24px 0;
        padding-left: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const dateText = document.createElement('span');
      dateText.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #9CA3AF;
        white-space: nowrap;
      `;
      dateText.textContent = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });

      const line = document.createElement('div');
      line.style.cssText = `
        flex-grow: 1;
        height: 1px;
        margin-left: 16px;
        background: linear-gradient(to right, #4B5563, transparent);
      `;

      separator.appendChild(dateText);
      separator.appendChild(line);
      return separator;
    };

    // Clear and re-populate grid
    grid.innerHTML = '';
    
    const gridItems = createGridItems(bookmarks);
    gridItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = createDateSeparator(item.date);
        grid.appendChild(separator);
      } else {
        const card = this.createBookmarkCard(item.bookmark);
        grid.appendChild(card);
      }
    });
    
    console.log(`✅ Grid content updated with ${bookmarks.length} bookmarks`);
  }


  /**
   * Show sort menu dropdown with filter support
   * @param {Element} sortButton - The sort button element
   * @param {Function} executeSearch - The executeSearch function from filter scope
   */
  showSortMenuWithFilters(sortButton, executeSearch) {
    // Remove existing sort menu if any
    const existingMenu = document.getElementById('xsaved-sort-menu');
    if (existingMenu) {
      existingMenu.remove();
      return; // Toggle behavior - close if already open
    }

    // Track current sort state
    this.currentSort = this.currentSort || { field: 'created_at', order: 'desc' };

    // Create sort menu
    const sortMenu = document.createElement('div');
    sortMenu.id = 'xsaved-sort-menu';
    sortMenu.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--xsaved-surface-color);
      border: 1px solid var(--xsaved-border-color);
      border-radius: var(--xsaved-radius-medium);
      box-shadow: var(--xsaved-shadow-heavy);
      z-index: 10002;
      min-width: 180px;
      margin-top: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const sortFields = [
      { field: 'created_at', label: 'Created At' },
      // TODO: Add bookmarked at when we have it properly fixed
      ];

    sortFields.forEach((fieldInfo, index) => {
      const menuItem = document.createElement('div');
      const isActive = this.currentSort.field === fieldInfo.field;
      const currentOrder = isActive ? this.currentSort.order : 'desc';
      const arrow = currentOrder === 'desc' ? '↓' : '↑';
      
      menuItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        color: var(--xsaved-text-color);
        cursor: pointer;
        transition: background-color 0.2s ease;
        border-bottom: ${index < sortFields.length - 1 ? '1px solid var(--xsaved-border-color)' : 'none'};
        background-color: ${isActive ? 'var(--xsaved-hover-color)' : 'transparent'};
      `;

      menuItem.innerHTML = `
        <span style="font-size: 14px; font-weight: ${isActive ? '600' : '500'};">${fieldInfo.label}</span>
        <span style="font-size: 16px; font-weight: bold; margin-left: 8px;">${arrow}</span>
      `;

      menuItem.addEventListener('mouseenter', () => {
        if (!isActive) {
          menuItem.style.backgroundColor = 'var(--xsaved-hover-color)';
        }
      });

      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = isActive ? 'var(--xsaved-hover-color)' : 'transparent';
      });

      menuItem.addEventListener('click', () => {
        // If clicking the same field, toggle order; if different field, use desc
        let newOrder;
        if (this.currentSort.field === fieldInfo.field) {
          newOrder = this.currentSort.order === 'desc' ? 'asc' : 'desc';
        } else {
          newOrder = 'desc'; // Default to desc for new field
        }
        
        console.log('🔄 Sort option selected:', `${fieldInfo.field}-${newOrder}`);
        
        // Update current sort state
        this.currentSort = { field: fieldInfo.field, order: newOrder };
        
        // Use the new executeSearch function to preserve filters
        executeSearch();
        
        sortMenu.remove();
      });

      sortMenu.appendChild(menuItem);
    });

    // Position menu relative to sort button
    sortButton.style.position = 'relative';
    sortButton.appendChild(sortMenu);

    // Close menu when clicking outside
    setTimeout(() => {
      const handleOutsideClick = (e) => {
        if (!sortMenu.contains(e.target) && !sortButton.contains(e.target)) {
          sortMenu.remove();
          document.removeEventListener('click', handleOutsideClick);
        }
      };
      document.addEventListener('click', handleOutsideClick);
    }, 100);
  }

  /**
   * Scroll to top of the grid container
   */
  scrollToTopOfGrid() {
    const gridOverlay = document.getElementById('xsaved-grid-overlay');
    if (gridOverlay) {
      gridOverlay.scrollTo({ top: 0, behavior: 'instant' });
    }
  }


  /**
   * Get currently filtered bookmarks based on active tag selection
   * @returns {Array} Filtered bookmarks array
   */
  getCurrentFilteredBookmarks() {
    if (!this.currentSelectedTags || this.currentSelectedTags.has('All')) {
      return this.allBookmarks;
    }
    
    const selectedTags = Array.from(this.currentSelectedTags);
    return this.allBookmarks.filter(bookmark => {
      const bookmarkTags = bookmark.tags || [];
      return selectedTags.some(selectedTag => 
        bookmarkTags.some(bookmarkTag => 
          bookmarkTag.toLowerCase().includes(selectedTag.toLowerCase())
        )
      );
    });
  }

  createBookmarkCard(bookmark) {
    // Safe property access with fallbacks
    const safeBookmark = {
      id: bookmark?.id || 'unknown',
      text: bookmark?.text || 'No content available',
      author: bookmark?.author || 'unknown',
      avatar_url: bookmark?.avatar_url || null,
      tags: bookmark?.tags || [],
      media_urls: bookmark?.media_urls || [],
      bookmarked_at: bookmark?.bookmarked_at || bookmark?.created_at || new Date().toISOString()
    };

    const card = document.createElement('div');
    card.setAttribute('data-bookmark-id', safeBookmark.id);
    card.setAttribute('data-tweet-id', safeBookmark.id); // For compatibility with selection manager
    
    // Apply base card styles without floating animations
    card.className = 'tweet-card';
    card.style.cssText = `
      width: 100%;
      aspect-ratio: 6/7;
      border-radius: 6px;
      margin: 0;
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      position: relative;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create tag overlay (only if bookmark has tags)
    let tagOverlay = null;
    if (safeBookmark.tags && safeBookmark.tags.length > 0) {
      tagOverlay = document.createElement('div');
      tagOverlay.className = 'xsaved-tag-overlay';
      tagOverlay.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
        color: white;
        display: none;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-start;
        z-index: 50;
        border-radius: 0 0 6px 6px;
        padding: 12px;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        height: 60px;
        pointer-events: none;
      `;

      const tagsContainer = document.createElement('div');
      tagsContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        max-width: 100%;
        overflow: hidden;
      `;

      // Limit to first 3 tags to keep it discrete
      const visibleTags = safeBookmark.tags.slice(0, 3);
      visibleTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.style.cssText = `
          background: rgba(29, 161, 242, 0.9);
          color: white;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 500;
          white-space: nowrap;
        `;
        tagElement.textContent = `#${tag}`;
        tagsContainer.appendChild(tagElement);
      });

      // Show "+X more" if there are more than 3 tags
      if (safeBookmark.tags.length > 3) {
        const moreElement = document.createElement('span');
        moreElement.style.cssText = `
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 500;
          white-space: nowrap;
        `;
        moreElement.textContent = `+${safeBookmark.tags.length - 3}`;
        tagsContainer.appendChild(moreElement);
      }

      tagOverlay.appendChild(tagsContainer);
      card.appendChild(tagOverlay);
    }

    // Hover effect
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px)';
      card.style.zIndex = '10000';
      card.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.3)';
      if (tagOverlay) {
        tagOverlay.style.display = 'flex';
      }
      xIcon.style.display = 'flex';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.8)';
      if (tagOverlay) {
        tagOverlay.style.display = 'none';
      }
      xIcon.style.display = 'none';
    });

    // X icon - show on hover
    const xIcon = document.createElement('div');
    xIcon.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 200;
      transition: background-color 0.2s ease;
    `;
    
    xIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    `;

    // Show/hide X icon on hover
    card.addEventListener('mouseenter', () => {
      xIcon.style.display = 'flex';
    });

    card.addEventListener('mouseleave', () => {
      xIcon.style.display = 'none';
    });

    // X icon hover effect
    xIcon.addEventListener('mouseenter', () => {
      xIcon.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    });

    xIcon.addEventListener('mouseleave', () => {
      xIcon.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    });

    // X icon click handler
    xIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      // Only open tweet if not in selection mode
      if (!this.selectionManager?.isSelectionMode) {
        window.open(`https://x.com/i/web/status/${safeBookmark.id}`, '_blank');
      }
    });

    // Tweet content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      padding: 16px;
      box-sizing: border-box;
      border-radius: 12px;
    `;

    // Profile section
    const profileSection = document.createElement('div');
    profileSection.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    `;

    // Profile pic
    const profilePic = document.createElement('div');
    profilePic.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #5DADEC;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-weight: bold;
      margin-right: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    `;
    
    // Try to display avatar image, fallback to initials
    if (safeBookmark.avatar_url) {
      const avatarImg = document.createElement('img');
      avatarImg.src = safeBookmark.avatar_url;
      avatarImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      `;
      avatarImg.alt = safeBookmark.author;
      
      // Fallback to initials if image fails to load
      avatarImg.onerror = () => {
        profilePic.removeChild(avatarImg);
        profilePic.textContent = safeBookmark.author.charAt(0).toUpperCase();
      };
      
      profilePic.appendChild(avatarImg);
    } else {
      // Fallback to initial if no avatar URL
      profilePic.textContent = safeBookmark.author.charAt(0).toUpperCase();
    }

    // User info
    const userInfo = document.createElement('div');
    
    const userName = document.createElement('div');
    userName.className = 'tweet-card-username';
    userName.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 184px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    userName.textContent = safeBookmark.author;

    const userHandle = document.createElement('div');
    userHandle.className = 'tweet-card-handle';
    userHandle.style.cssText = `
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    userHandle.textContent = `@${safeBookmark.author}`;

    userInfo.appendChild(userName);
    userInfo.appendChild(userHandle);

    profileSection.appendChild(profilePic);
    profileSection.appendChild(userInfo);

    // Tweet text
    const tweetText = document.createElement('div');
    tweetText.className = 'tweet-card-text';
    tweetText.style.cssText = `
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin-bottom: 16px;
      line-height: 1.2;
      max-height: ${safeBookmark.media_urls && safeBookmark.media_urls.length > 0 ? '100px' : '300px'};
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: ${safeBookmark.media_urls && safeBookmark.media_urls.length > 0 ? '3' : 'none'};
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
      position: relative;
    `;
    tweetText.textContent = safeBookmark.text;

    // Smart text truncation based on card size and media presence
    const hasMedia = safeBookmark.media_urls && safeBookmark.media_urls.length > 0;
    const maxTextLength = hasMedia ? 120 : 250; // Shorter text if media present
    
    // Check if text needs truncation and add "more" link
    if (safeBookmark.text.length > maxTextLength) {
      const moreLink = document.createElement('span');
      moreLink.className = 'xsaved-more-link';
      moreLink.style.cssText = `
        color: var(--xsaved-primary-color);
        cursor: pointer;
        position: absolute;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, var(--xsaved-surface-color) 20%);
        padding: 0 0 0 12px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 3px;
        transition: color 0.2s ease;
        z-index: 100;
        pointer-events: auto;
      `;
      moreLink.innerHTML = '<small>more</small>';
      
      // Hover effect for better UX
      moreLink.addEventListener('mouseenter', () => {
        moreLink.style.color = 'var(--xsaved-accent-color)';
      });
      
      moreLink.addEventListener('mouseleave', () => {
        moreLink.style.color = 'var(--xsaved-primary-color)';
      });
      
      moreLink.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showTweetModal(safeBookmark);
      });
      
      tweetText.appendChild(moreLink);
    }

    // Media (if any)
    let mediaContainer = null;
    if (safeBookmark.media_urls && safeBookmark.media_urls.length > 0) {
      mediaContainer = document.createElement('div');
      mediaContainer.style.cssText = `
        width: calc(100% - 32px);
        height: 90px;
        margin-top: auto;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.05);
      `;

      const mediaImage = document.createElement('img');
      mediaImage.src = safeBookmark.media_urls[0];
      mediaImage.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: cover;
        image-rendering: pixelated;
      `;
      mediaImage.alt = '';

      mediaContainer.appendChild(mediaImage);
    }

    // Tags
    const tagsContainer = document.createElement('div');
    tagsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
      position: absolute;
      bottom: ${safeBookmark.media_urls && safeBookmark.media_urls.length > 0 ? '120px' : '16px'};
      left: 16px;
      right: 16px;
    `;

    // Don't render tags in cards - tags are for filtering only
    // Tags display is handled by the navbar, not individual cards

    // Assemble content
    contentContainer.appendChild(profileSection);
    contentContainer.appendChild(tweetText);
    if (mediaContainer) {
      contentContainer.appendChild(mediaContainer);
    }
    contentContainer.appendChild(tagsContainer);

    // Assemble card
    card.appendChild(xIcon);
    card.appendChild(contentContainer);

    // Card click handling is now managed by event delegation in selection manager

    return card;
  }

  showTweetModal(tweet) {
    // Remove existing modal if any
    const existingModal = document.getElementById('xsaved-tweet-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'xsaved-tweet-modal';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background-color: #1A1A1A;
      border-radius: 12px;
      width: 500px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      padding: 24px;
      position: relative;
      color: #FFFFFF;
    `;

    // Close button
    const closeButton = document.createElement('div');
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      color: #FFFFFF;
      font-size: 24px;
      cursor: pointer;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.1);
      transition: background-color 0.2s ease;
    `;
    closeButton.textContent = '×';
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });

    // Profile section
    const profileSection = document.createElement('div');
    profileSection.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    `;

    // Profile pic
    const profilePic = document.createElement('div');
    profilePic.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: #5DADEC;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-weight: bold;
      margin-right: 12px;
      font-size: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    `;
    
    // Try to display avatar image, fallback to initials
    if (tweet.avatar_url) {
      const avatarImg = document.createElement('img');
      avatarImg.src = tweet.avatar_url;
      avatarImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      `;
      avatarImg.alt = tweet.author;
      
      // Fallback to initials if image fails to load
      avatarImg.onerror = () => {
        profilePic.removeChild(avatarImg);
        profilePic.textContent = tweet.author.charAt(0).toUpperCase();
      };
      
      profilePic.appendChild(avatarImg);
    } else {
      // Fallback to initial if no avatar URL
      profilePic.textContent = tweet.author.charAt(0).toUpperCase();
    }

    // User info
    const userInfo = document.createElement('div');
    
    const userName = document.createElement('div');
    userName.style.cssText = `
      color: #FFFFFF;
      font-size: 18px;
      font-weight: bold;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin-bottom: 4px;
    `;
    userName.textContent = tweet.author;

    const userHandle = document.createElement('div');
    userHandle.style.cssText = `
      color: #888888;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    userHandle.textContent = `@${tweet.author}`;

    userInfo.appendChild(userName);
    userInfo.appendChild(userHandle);

    profileSection.appendChild(profilePic);
    profileSection.appendChild(userInfo);

    // Tweet text
    const tweetText = document.createElement('div');
    tweetText.style.cssText = `
      color: #FFFFFF;
      font-size: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin-bottom: 24px;
      line-height: 1.5;
    `;
    tweetText.textContent = tweet.text;

    // Media (if any)
    let mediaSection = null;
    if (tweet.media_urls && tweet.media_urls.length > 0) {
      mediaSection = document.createElement('div');
      mediaSection.style.cssText = `
        width: 100%;
        max-height: 400px;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 12px;
        margin-bottom: 16px;
      `;

      const mediaImage = document.createElement('img');
      mediaImage.src = tweet.media_urls[0];
      mediaImage.style.cssText = `
        width: 100%;
        object-fit: contain;
        max-height: 400px;
      `;
      mediaImage.alt = '';

      mediaSection.appendChild(mediaImage);
    }

    // Tags
    const tagsSection = document.createElement('div');
    tagsSection.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    `;

    if (tweet.tags && tweet.tags.length > 0) {
      tweet.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.style.cssText = `
          background: rgba(29, 161, 242, 0.2);
          color: #1DA1F2;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        tagElement.textContent = `#${tag}`;
        tagsSection.appendChild(tagElement);
      });
    } else {
      // Show placeholder if no tags
      const noTagsElement = document.createElement('span');
      noTagsElement.style.cssText = `
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
        font-style: italic;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      noTagsElement.textContent = 'No tags';
      tagsSection.appendChild(noTagsElement);
    }

    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    timestamp.textContent = new Date(tweet.bookmarked_at).toLocaleString();

    // Assemble modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(profileSection);
    modalContent.appendChild(tweetText);
    if (mediaSection) {
      modalContent.appendChild(mediaSection);
    }
    modalContent.appendChild(tagsSection);
    modalContent.appendChild(timestamp);

    modalOverlay.appendChild(modalContent);

    // Event listeners
    const closeModal = () => {
      modalOverlay.remove();
    };

    closeButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });

    // Keyboard support
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Add to page
    document.body.appendChild(modalOverlay);
  }

  renderGridError(container, message) {
    container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: white;
        text-align: center;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
        <div style="font-size: 18px; margin-bottom: 8px;">Oops!</div>
        <div style="color: rgba(255, 255, 255, 0.7);">${message}</div>
      </div>
    `;
  }

  /**
   * @deprecated - Use executeSearch() instead. This method is kept for compatibility but should not be used.
   */
  filterBookmarksPage(query, container, bookmarks) {
    console.warn('🚨 filterBookmarksPage is deprecated. Use executeSearch() instead.');
    return; // Method disabled
    console.log(`🔍 Search input: "${query}"`);
    
    // Create search query with current sorting
    const searchQuery = {
      text: query.trim(),
      limit: PAGINATION_CONFIG.INITIAL_LOAD,
      offset: 0,
      sortBy: this.currentSort?.field || 'created_at',
      sortOrder: this.currentSort?.order || 'desc'
    };
    
    console.log(`🔍 Search query:`, searchQuery);
    
    // Reset pagination and search
    this.resetPagination();
    this.pagination.currentQuery = searchQuery;
    
    // Scroll to top of grid when searching
    this.scrollToTopOfGrid();
    
    // Load search results with pagination - use append=false to replace results
    this.loadBookmarksPage(container, searchQuery, false);
    
    // No setTimeout needed - search input stays intact since we don't rebuild the entire DOM
    return;
    
    // OLD CODE BELOW - keeping for reference but not executed
    const filteredBookmarks = [];

    // Helper function to group bookmarks by month/year (same as in renderBookmarksGrid)
    const groupBookmarksByDate = (bookmarks) => {
      const grouped = bookmarks.reduce((acc, bookmark) => {
        const date = new Date(bookmark.created_at);
        const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!acc[monthYear]) {
          acc[monthYear] = {
            date: new Date(date.getFullYear(), date.getMonth(), 1),
            bookmarks: []
          };
        }
        
        acc[monthYear].bookmarks.push(bookmark);
        return acc;
      }, {});
      
      return Object.values(grouped).sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    // Convert grouped bookmarks to grid items with separators
    const createGridItems = (bookmarks) => {
      const grouped = groupBookmarksByDate(bookmarks);
      const items = [];
      let dealIndex = 0;
      
      grouped.forEach((group, groupIndex) => {
        // Add separator for each group
        // Only show first separator if we have explicit sorting, otherwise skip first
        const showFirstSeparator = this.currentSort && (this.currentSort.field !== 'created_at' || this.currentSort.order !== 'desc');
        if (groupIndex > 0 || showFirstSeparator) {
          items.push({
            type: 'separator',
            date: group.date
          });
        }
        
        // Add all bookmarks in this group
        group.bookmarks.forEach(bookmark => {
          items.push({
            type: 'bookmark',
            bookmark: bookmark,
            dealIndex
          });
          dealIndex++;
        });
      });
      
      return items;
    };

    // Create date separator element (matching DateSeparator.tsx exactly)
    const createDateSeparator = (date) => {
      const separator = document.createElement('div');
      separator.style.cssText = `
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        margin: 24px 0;
        padding-left: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const dateText = document.createElement('span');
      dateText.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #9CA3AF;
        white-space: nowrap;
      `;
      dateText.textContent = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });

      const line = document.createElement('div');
      line.style.cssText = `
        flex-grow: 1;
        height: 1px;
        margin-left: 16px;
        background: linear-gradient(to right, #4B5563, transparent);
      `;

      separator.appendChild(dateText);
      separator.appendChild(line);
      return separator;
    };

    // Clear and re-render grid with grouped structure
    grid.innerHTML = '';
    const gridItems = createGridItems(filteredBookmarks);
    gridItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = createDateSeparator(item.date);
        grid.appendChild(separator);
      } else {
        const card = this.createBookmarkCard(item.bookmark);
        grid.appendChild(card);
      }
    });
    
    // Scroll to top after search/filtering
    this.scrollToTopOfGrid();
  }


  setupBookmarksPageObserver() {
    // Observe for dynamic content changes on bookmarks page
    // This helps maintain the toggle when X.com updates the page
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if toggle still exists and we're on bookmarks page
          const toggle = document.getElementById('xsaved-bookmarks-toggle');
          if (!toggle && XSAVED_CONFIG.pages.isBookmarksPage()) {
            console.log('🔄 Re-adding bookmarks toggle after page update');
            // Use the new strict validation system
            this.attemptBookmarksTogglePlacement();
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ===== BOOKMARK BUTTON INTERCEPTION =====
  initializeBookmarkInterception() {
    console.log('🔖 Initializing bookmark button interception...');
    
    // Initial scan for bookmark buttons
    this.interceptBookmarkButtons();
    
    // Set up observer for dynamically added buttons
    this.setupBookmarkButtonObserver();
  }

  setupBookmarkButtonObserver() {
    if (bookmarkButtonObserver) {
      bookmarkButtonObserver.disconnect();
    }

    bookmarkButtonObserver = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if new nodes contain bookmark buttons
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const hasBookmarkButton = node.querySelector && 
                (node.querySelector(XSAVED_CONFIG.selectors.bookmarkButton) || 
                 node.matches && node.matches(XSAVED_CONFIG.selectors.bookmarkButton));
              
              if (hasBookmarkButton) {
                shouldRescan = true;
              }
            }
          });
        }
      });

      if (shouldRescan) {
        // Debounce the rescan
        clearTimeout(this.rescanTimeout);
        this.rescanTimeout = setTimeout(() => {
          this.interceptBookmarkButtons();
        }, 300);
      }
    });

    bookmarkButtonObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  interceptBookmarkButtons() {
    const bookmarkButtons = document.querySelectorAll(XSAVED_CONFIG.selectors.bookmarkButton);
    console.log(`🔍 Found ${bookmarkButtons.length} bookmark buttons`);

    bookmarkButtons.forEach((button, index) => {
      // Debug button details
      const ariaLabel = button.getAttribute('aria-label') || '';
      const dataTestId = button.getAttribute('data-testid') || '';
      console.log(`🔍 Button ${index + 1}:`, {
        ariaLabel,
        dataTestId,
        isAlreadyIntercepted: interceptedButtons.has(button),
        hasXSavedClass: button.classList.contains('xsaved-intercepted')
      });

      // Skip if already intercepted
      if (interceptedButtons.has(button)) {
        console.log(`⏭️ Button ${index + 1} already intercepted, skipping`);
        return;
      }

      // Validate this is actually a bookmark button
      if (!this.isValidBookmarkButton(button)) {
        console.warn(`❌ Button ${index + 1} failed validation, skipping`);
        return;
      }

      // Mark as intercepted
      interceptedButtons.add(button);
      button.classList.add('xsaved-intercepted');
      
      // Extract tweet data
      const tweetData = this.extractTweetDataFromButton(button);
      if (!tweetData) {
        console.warn(`❌ Could not extract tweet data from bookmark button ${index + 1}`);
        return;
      }

      console.log(`✅ Successfully extracted tweet data for button ${index + 1}:`, tweetData);

      // Add our click handler
      button.addEventListener('click', (e) => {
        console.log('🖱️ Bookmark button clicked!');
        console.log('🔍 Button that was clicked:', {
          ariaLabel: button.getAttribute('aria-label'),
          dataTestId: button.getAttribute('data-testid'),
          buttonElement: button
        });
        
        const isBookmarking = this.checkIfBookmarkAction(button);
        console.log('Is bookmarking action:', isBookmarking);
        
        if (isBookmarking) {
          // Store event details for tooltip positioning
          const eventDetails = {
            clientX: e.clientX,
            clientY: e.clientY
          };
          
          // Let native bookmark action execute first
          console.log('Allowing native bookmark action to proceed...');
          
          // AUTO-SAVE: Immediately save to IndexedDB with default tags
          console.log('💾 Auto-saving bookmark to IndexedDB...');
          this.autoSaveBookmark(tweetData);
          
          // Show our save dialog after delay for optional tagging
          setTimeout(() => {
            console.log('🏷️ Showing save dialog for optional tagging...');
            const syntheticEvent = {
              clientX: eventDetails.clientX,
              clientY: eventDetails.clientY,
              preventDefault: () => {},
              stopPropagation: () => {}
            };
            this.showSaveDialog(syntheticEvent, tweetData, button);
          }, 200);
        } else {
          console.log('🔄 This is an unbookmark action, no dialog needed');
        }
      }, false);
    });

    console.log(`✅ Successfully intercepted ${bookmarkButtons.length} bookmark buttons`);
  }

  extractTweetDataFromButton(button) {
    try {
      // Navigate up the DOM to find the tweet container
      let tweetContainer = button.closest(XSAVED_CONFIG.selectors.tweetContainer);
      if (!tweetContainer) {
        console.warn('Could not find tweet container');
        return null;
      }

      // Extract tweet ID from data attributes or URLs
      const tweetId = this.extractTweetId(tweetContainer);
      if (!tweetId) {
        console.warn('Could not extract tweet ID');
        return null;
      }

      // Extract text content
      const tweetTextElement = tweetContainer.querySelector(XSAVED_CONFIG.selectors.tweetText);
      const text = tweetTextElement ? tweetTextElement.textContent.trim() : '';

      // Extract author
      const userNameElement = tweetContainer.querySelector(XSAVED_CONFIG.selectors.userName);
      const author = userNameElement ? 
        userNameElement.textContent.replace('@', '').trim() : 
        'unknown';

      // Extract avatar URL
      const avatarElement = tweetContainer.querySelector(XSAVED_CONFIG.selectors.userAvatar + ' img');
      const avatar_url = avatarElement ? avatarElement.getAttribute('src') : null;

      // Extract creation timestamp (best effort)
      const timeElement = tweetContainer.querySelector('time');
      const created_at = timeElement ? 
        timeElement.getAttribute('datetime') || new Date().toISOString() : 
        new Date().toISOString();

      // Extract media URLs
      const media_urls = this.extractMediaUrls(tweetContainer);

      return {
        id: tweetId,
        text,
        author,
        avatar_url,
        created_at,
        media_urls
      };

    } catch (error) {
      console.error('Error extracting tweet data:', error);
      return null;
    }
  }

  extractTweetId(tweetContainer) {
    // Try multiple methods to extract tweet ID
    
    // Method 1: Look for links to the tweet
    const tweetLinks = tweetContainer.querySelectorAll('a[href*="/status/"]');
    for (const link of tweetLinks) {
      const href = link.getAttribute('href');
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    // Method 2: Look for data attributes
    const dataId = tweetContainer.getAttribute('data-tweet-id') || 
                   tweetContainer.getAttribute('data-testid');
    if (dataId && /^\d+/.test(dataId)) {
      return dataId;
    }

    // Method 3: Check for aria-labelledby or other ID patterns
    const ariaLabelledBy = tweetContainer.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const match = ariaLabelledBy.match(/(\d+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  }



  extractMediaUrls(tweetContainer) {
    const media_urls = [];
    
    // Extract images
    const images = tweetContainer.querySelectorAll('img[src*="pbs.twimg.com"]');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !media_urls.includes(src)) {
        media_urls.push(src);
      }
    });

    // Extract videos (placeholder URLs)
    const videos = tweetContainer.querySelectorAll('video');
    videos.forEach(video => {
      const poster = video.getAttribute('poster');
      if (poster && !media_urls.includes(poster)) {
        media_urls.push(poster);
      }
    });

    return media_urls;
  }

  isValidBookmarkButton(button) {
    const ariaLabel = button.getAttribute('aria-label') || '';
    const dataTestId = button.getAttribute('data-testid') || '';
    
    // Must have correct data-testid
    const hasValidTestId = dataTestId === 'bookmark' || dataTestId === 'removeBookmark';
    
    // Must have correct aria-label. Using third check cause in status page aria-label look like this : 102 Bookmarks. Bookmarked
    const hasValidAriaLabel = ariaLabel === 'Bookmark' || ariaLabel === 'Bookmarked' || ariaLabel.toLowerCase().includes('bookmark');
    
    // Must NOT be a share button
    const isNotShareButton = !ariaLabel.toLowerCase().includes('share');
    
    // Must have bookmark icon (SVG with bookmark path)
    const svg = button.querySelector('svg');
    const hasBookmarkIcon = svg && svg.querySelector('path[d*="4.5C4 3.12"]'); // Part of bookmark icon path
    
    const isValid = hasValidTestId && hasValidAriaLabel && isNotShareButton && hasBookmarkIcon;
    
    console.log('🔍 Button validation:', {
      ariaLabel,
      dataTestId,
      hasValidTestId,
      hasValidAriaLabel,
      isNotShareButton,
      hasBookmarkIcon,
      isValid
    });
    
    return isValid;
  }

  checkIfBookmarkAction(button) {
    const ariaLabel = button.getAttribute('aria-label') || '';
    const dataTestId = button.getAttribute('data-testid') || '';
    
    // More precise detection based on data-testid
    const isCurrentlyBookmarked = dataTestId === 'removeBookmark' || ariaLabel === 'Bookmarked';
    const willBookmark = !isCurrentlyBookmarked;
    
    console.log('🔍 Checking bookmark action state:');
    console.log('  aria-label:', ariaLabel);
    console.log('  data-testid:', dataTestId);
    console.log('  is currently bookmarked:', isCurrentlyBookmarked);
    console.log('  → Will bookmark:', willBookmark);
    
    return willBookmark;
  }

  // ===== SAVE DIALOG =====
  showSaveDialog(event, tweetData, bookmarkButton) {
    console.log('🏷️ showSaveDialog called with:', { tweetData, event: !!event, button: !!bookmarkButton });
    
    // Remove existing dialog
    this.removeTooltip();
    
    const dialog = this.createSaveDialog(event, tweetData);
    currentTooltip = dialog;
    
    console.log('📦 Created save dialog element:', !!dialog);
    
    // Position dialog
    this.positionTooltip(dialog, event);
    
    // Add to DOM with animation
    document.body.appendChild(dialog);
    
    // Trigger fade-in animation
    setTimeout(() => {
      dialog.style.opacity = '1';
      dialog.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    console.log('✅ Save dialog added to DOM');
    
    // Focus the input after animation completes
    const input = dialog.querySelector('.xsaved-tag-input');
    if (input) {
      setTimeout(() => {
        try {
          input.focus();
          console.log('🎯 Input focused successfully');
        } catch (error) {
          console.warn('⚠️ Failed to focus input:', error);
          // Retry focus
          setTimeout(() => {
            try {
              input.focus();
              console.log('🎯 Input focused on retry');
            } catch (retryError) {
              console.error('❌ Focus retry failed:', retryError);
            }
          }, 200);
        }
      }, 350); // Wait for fade-in animation to complete
    }
    
    // Set auto-fade timeout
    this.resetTooltipTimeout();
  }

  createSaveDialog(event, tweetData) {
    const dialog = document.createElement('div');
    dialog.className = 'xsaved-save-dialog';
    dialog.style.cssText = `
      position: fixed;
      background: var(--xsaved-surface-color);
      backdrop-filter: blur(16px);
      border: 1px solid var(--xsaved-border-color);
      border-radius: 16px;
      padding: 20px;
      z-index: 10000;
      box-shadow: var(--xsaved-shadow-heavy);
      min-width: 320px;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--xsaved-text-color);
      opacity: 0;
      transform: translateY(15px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 600;
      color: var(--xsaved-text-color);
    `;

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    headerLeft.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      Bookmark Saved! Add Tags?
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: var(--xsaved-text-secondary);
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    `;
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('❌ Close button clicked');
      this.removeTooltip();
    });

    header.appendChild(headerLeft);
    header.appendChild(closeButton);

    // Tweet preview
    const preview = document.createElement('div');
    preview.style.cssText = `
      background: color-mix(in srgb, var(--xsaved-border-color) 20%, transparent);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      border-left: 3px solid var(--xsaved-primary-color);
    `;

    const previewAuthor = document.createElement('div');
    previewAuthor.style.cssText = `
      font-weight: 600;
      color: var(--xsaved-primary-color);
      font-size: 14px;
      margin-bottom: 4px;
    `;
    previewAuthor.textContent = `@${tweetData.author}`;

    const previewText = document.createElement('div');
    previewText.style.cssText = `
      color: var(--xsaved-text-color);
      font-size: 13px;
      line-height: 1.4;
    `;
    previewText.textContent = tweetData.text.length > 120 
      ? tweetData.text.substring(0, 120) + '...' 
      : tweetData.text;

    preview.appendChild(previewAuthor);
    preview.appendChild(previewText);

    // Tags input section
    const tagsSection = document.createElement('div');
    tagsSection.style.cssText = `margin-bottom: 16px;`;

    const tagsLabel = document.createElement('label');
    tagsLabel.style.cssText = `
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--xsaved-text-color);
    `;
    tagsLabel.textContent = 'Tags (optional):';

    // Container for visual tags
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'xsaved-tags-container';
    tagsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
      min-height: 28px;
      padding: 8px;
      border: 1px solid var(--xsaved-border-color);
      border-radius: 8px;
      background: var(--xsaved-input-bg);
    `;

    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.className = 'xsaved-tag-input';
    tagsInput.placeholder = 'Type tags and press space or comma...';
    tagsInput.style.setProperty('--placeholder-color', 'var(--xsaved-placeholder-color)');
    tagsInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--xsaved-border-color);
      border-radius: 8px;
      background: var(--xsaved-input-bg);
      color: var(--xsaved-text-color);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    `;

    // Store tags array
    const currentTags = [];

    // Helper function to create a tag element
    const createTagElement = (tagText) => {
      const tagElement = document.createElement('span');
      tagElement.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: color-mix(in srgb, var(--xsaved-primary-color) 20%, transparent);
        color: var(--xsaved-primary-color);
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        user-select: none;
      `;
      
      const tagLabel = document.createElement('span');
      tagLabel.textContent = `#${tagText}`;
      
      const removeButton = document.createElement('button');
      removeButton.textContent = '×';
      removeButton.style.cssText = `
        background: none;
        border: none;
        color: currentColor;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 0;
        margin-left: 2px;
      `;
      
      removeButton.addEventListener('click', (e) => {
        // Prevent event from bubbling up and closing the dialog
        e.preventDefault();
        e.stopPropagation();
        
        // Clear auto-fade timeout when user is actively interacting
        this.clearTooltipTimeout();
        
        const index = currentTags.indexOf(tagText);
        if (index > -1) {
          currentTags.splice(index, 1);
          tagElement.remove();
          console.log(`🏷️ Removed tag: "${tagText}"`);
        }
      });
      
      tagElement.appendChild(tagLabel);
      tagElement.appendChild(removeButton);
      return tagElement;
    };

    // Helper function to add a tag
    const addTag = (tagText) => {
      const cleanTag = tagText.trim().replace(/^#/, '');
      if (cleanTag && !currentTags.includes(cleanTag)) {
        currentTags.push(cleanTag);
        const tagElement = createTagElement(cleanTag);
        tagsContainer.appendChild(tagElement);
      }
    };

    // Input event handlers for tag creation
    tagsInput.addEventListener('input', (e) => {
      // Clear auto-fade timeout when user is actively typing
      this.clearTooltipTimeout();
      
      const value = e.target.value;
      const lastChar = value.slice(-1);
      
      // Create tag on space or comma
      if (lastChar === ' ' || lastChar === ',') {
        const tagText = value.slice(0, -1);
        if (tagText.trim()) {
          addTag(tagText);
          e.target.value = '';
        }
      }
    });

    tagsInput.addEventListener('keydown', (e) => {
      // Clear auto-fade timeout when user is actively typing
      this.clearTooltipTimeout();
      
      // Create tag on Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        const tagText = e.target.value.trim();
        if (tagText) {
          addTag(tagText);
          e.target.value = '';
        }
      }
      
      // Remove last tag on backspace when input is empty
      if (e.key === 'Backspace' && e.target.value === '' && currentTags.length > 0) {
        const lastTag = currentTags.pop();
        const lastTagElement = tagsContainer.lastElementChild;
        if (lastTagElement) {
          lastTagElement.remove();
        }
      }
    });

    // Also handle paste events
    tagsInput.addEventListener('paste', (e) => {
      console.log('📋 User pasted text, clearing auto-fade timeout');
      this.clearTooltipTimeout();
    });

    // Input focus effects
    tagsInput.addEventListener('focus', () => {
      tagsInput.style.borderColor = 'var(--xsaved-primary-color)';
      tagsContainer.style.borderColor = 'var(--xsaved-primary-color)';
      // Only reset timeout on initial focus, not on every interaction
      this.resetTooltipTimeout();
    });
    tagsInput.addEventListener('blur', () => {
      tagsInput.style.borderColor = 'var(--xsaved-border-color)';
      tagsContainer.style.borderColor = 'var(--xsaved-border-color)';
      
      // Add any remaining text as a tag
      const remainingText = tagsInput.value.trim();
      if (remainingText) {
        addTag(remainingText);
        tagsInput.value = '';
      }
      
      // Restart auto-fade timeout when user stops interacting with input
      setTimeout(() => {
        this.resetTooltipTimeout();
      }, 100); // Small delay to avoid conflicts with other interactions
    });

    tagsSection.appendChild(tagsLabel);
    tagsSection.appendChild(tagsContainer);
    tagsSection.appendChild(tagsInput);

    // Action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--xsaved-border-color);
      border-radius: 6px;
      background: transparent;
      color: var(--xsaved-text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    cancelButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🚫 Cancel button clicked');
      this.removeTooltip();
    });

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Add Tags';
    saveButton.style.cssText = `
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      background: var(--xsaved-primary-color);
      color: var(--xsaved-bg-color);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    // Button hover effects
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.backgroundColor = 'var(--xsaved-hover-color)';
      cancelButton.style.color = 'var(--xsaved-text-color)';
    });
    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.backgroundColor = 'transparent';
      cancelButton.style.color = 'var(--xsaved-text-secondary)';
    });

    saveButton.addEventListener('mouseenter', () => {
      saveButton.style.filter = 'brightness(0.9)';
    });
    saveButton.addEventListener('mouseleave', () => {
      saveButton.style.filter = 'none';
    });

    // Save button action
    saveButton.addEventListener('click', () => {
      // Add any remaining text in the input as a tag before saving
      const remainingText = tagsInput.value.trim();
      if (remainingText) {
        addTag(remainingText);
        tagsInput.value = '';
      }
      this.handleSaveBookmark(tweetData, currentTags, saveButton);
    });

    // Note: Enter key handling is now done at dialog level to avoid conflicts

    actionsContainer.appendChild(cancelButton);
    actionsContainer.appendChild(saveButton);

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(preview);
    dialog.appendChild(tagsSection);
    dialog.appendChild(actionsContainer);

    // Add hover behavior to control auto-fade
    dialog.addEventListener('mouseenter', () => {
      console.log('🖱️ Mouse entered dialog, stopping auto-fade');
      this.clearTooltipTimeout();
    });

    dialog.addEventListener('mouseleave', () => {
      console.log('🖱️ Mouse left dialog, restarting auto-fade');
      this.resetTooltipTimeout();
    });

    // Add outside click dismissal
    setTimeout(() => {
      const handleOutsideClick = (e) => {
        if (!dialog.contains(e.target)) {
          console.log('🖱️ Outside click detected, closing dialog');
          this.removeTooltip();
          document.removeEventListener('click', handleOutsideClick);
        }
      };
      
      // Add the listener after a small delay to prevent immediate closure
      document.addEventListener('click', handleOutsideClick);
      
      // Store reference for cleanup
      dialog._outsideClickHandler = handleOutsideClick;
    }, 100);

    // Add escape key dismissal and enter key save
    const handleDialogKeys = (e) => {
      if (e.key === 'Escape') {
        console.log('⌨️ Escape key pressed, closing dialog');
        this.removeTooltip();
        document.removeEventListener('keydown', handleDialogKeys);
      } else if (e.key === 'Enter') {
        // Only save on Enter if input is not focused (to avoid interference with tag creation)
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && activeElement.classList.contains('xsaved-tag-input');
        
        if (!isInputFocused) {
          console.log('⌨️ Enter key pressed, saving bookmark');
          // Add any remaining text in the input as a tag before saving
          const remainingText = tagsInput.value.trim();
          if (remainingText) {
            addTag(remainingText);
            tagsInput.value = '';
          }
          this.handleSaveBookmark(tweetData, currentTags, saveButton);
        }
      }
    };
    
    document.addEventListener('keydown', handleDialogKeys);
    dialog._keyHandler = handleDialogKeys;

    return dialog;
  }

  // AUTO-SAVE: Save bookmark immediately without user interaction
  autoSaveBookmark(tweetData) {
    console.log('💾 Auto-saving bookmark to IndexedDB:', { id: tweetData.id, text: tweetData.text?.substring(0, 50) });
    
    // Create bookmark entity with empty tags (user can add tags later via modal)
    const bookmarkEntity = {
      ...tweetData,
      tags: [] // Default to empty tags for auto-save
    };

    // Send to service worker for immediate IndexedDB storage
    safeRuntimeMessage({
      action: 'saveBookmark',
      bookmark: bookmarkEntity
    }, (response) => {
      if (response?.success) {
        console.log('✅ Bookmark auto-saved successfully to IndexedDB');
        // Update stats silently
        this.updateStats();
      } else {
        console.error('❌ Auto-save failed:', response?.error || 'Unknown error');
        // Don't show error to user for auto-save failures - they can still use the modal
      }
    });
  }

  handleSaveBookmark(tweetData, tags, saveButton) {
    // Disable save button during save
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Updating...';
    saveButton.disabled = true;
    saveButton.style.opacity = '0.7';

    // Create bookmark entity - this will update the existing bookmark with tags
    const bookmarkEntity = {
      ...tweetData,
      tags
    };

    // Send to service worker (this will update the existing bookmark)
    safeRuntimeMessage({
      action: 'saveBookmark',
      bookmark: bookmarkEntity
    }, (response) => {
      if (response?.success) {
        console.log('✅ Bookmark saved successfully');
        
        // Show success state
        saveButton.textContent = '✓ Updated!';
        saveButton.style.background = '#00ba7c';
        
        // Update stats
        this.updateStats();
        
        // Auto-close after delay
        setTimeout(() => {
          this.removeTooltip();
        }, 1500);
        
      } else {
        // Enhanced error handling with detailed logging
        let errorMessage = 'Unknown error';
        let detailedError = 'No response received';
        
        if (response === null) {
          errorMessage = 'Extension unavailable';
          detailedError = 'Extension context lost (try reloading page)';
        } else if (response === undefined) {
          errorMessage = 'No response';
          detailedError = 'Service worker did not respond';
        } else if (response.error) {
          errorMessage = 'Save failed';
          detailedError = response.error;
        } else if (response.success === false) {
          errorMessage = 'Service worker error';
          detailedError = response.error || response.details || response.message || 'Service worker returned success:false without error details';
        } else {
          errorMessage = 'Save failed';
          detailedError = `Unexpected response: ${JSON.stringify(response)}`;
        }
        
        console.error('❌ Failed to save bookmark:');
        console.error('  Error message:', errorMessage);
        console.error('  Detailed error:', detailedError);
        console.error('  Full response:', response);
        console.error('  Bookmark data:', bookmarkEntity);
        
        // Show error state with tooltip for more details
        saveButton.textContent = 'Error!';
        saveButton.style.background = '#f91880';
        saveButton.title = `${errorMessage}: ${detailedError}`;
        
        // Add error details as a temporary tooltip
        const errorTooltip = document.createElement('div');
        errorTooltip.style.cssText = `
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #f91880;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          margin-bottom: 8px;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        errorTooltip.textContent = detailedError;
        
        saveButton.style.position = 'relative';
        saveButton.appendChild(errorTooltip);
        
        // Reset after delay
        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.style.background = '#1DA1F2';
          saveButton.disabled = false;
          saveButton.style.opacity = '1';
          saveButton.title = '';
          
          // Remove error tooltip
          if (errorTooltip.parentNode) {
            errorTooltip.remove();
          }
        }, 4000); // Longer delay to read error message
      }
    });
  }

  positionTooltip(tooltip, event) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipRect = { width: 400, height: 300 }; // Estimated

    let left = event.clientX + 15;
    let top = event.clientY - 10;

    // Adjust horizontal position
    if (left + tooltipRect.width > viewportWidth - 20) {
      left = event.clientX - tooltipRect.width - 15;
    }

    // Adjust vertical position
    if (top + tooltipRect.height > viewportHeight - 20) {
      top = event.clientY - tooltipRect.height + 10;
    }

    // Ensure minimum margins
    left = Math.max(20, left);
    top = Math.max(20, top);

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  removeTooltip() {
    if (currentTooltip) {
      // Clean up event listeners
      if (currentTooltip._outsideClickHandler) {
        document.removeEventListener('click', currentTooltip._outsideClickHandler);
      }
      if (currentTooltip._keyHandler) {
        document.removeEventListener('keydown', currentTooltip._keyHandler);
      }
      
      // Fade out animation
      currentTooltip.style.opacity = '0';
      currentTooltip.style.transform = 'translateY(10px) scale(0.95)';
      
      setTimeout(() => {
        if (currentTooltip && currentTooltip.parentNode) {
          currentTooltip.parentNode.removeChild(currentTooltip);
        }
        currentTooltip = null;
      }, XSAVED_CONFIG.ui.animationDuration);
    }

    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
  }

  clearTooltipTimeout() {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
      console.log('⏰ Cleared auto-fade timeout (user is actively typing)');
    }
  }

  resetTooltipTimeout() {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      console.log('⏰ Cleared existing timeout');
    }

    console.log(`⏰ Setting auto-fade timeout for ${XSAVED_CONFIG.ui.fadeTimeout}ms`);
    tooltipTimeout = setTimeout(() => {
      console.log('⏰ Auto-fade timeout triggered, closing dialog');
      this.removeTooltip();
    }, XSAVED_CONFIG.ui.fadeTimeout);
  }

  // ===== EXPORT FUNCTIONALITY =====
  showExportDialog(bookmarks) {
    console.log('📤 Showing export dialog for', bookmarks.length, 'bookmarks');
    
    // Create export dialog overlay
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'xsaved-export-dialog';
    dialogOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 20000;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    // Create dialog content
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = `
      background: #15202b;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Generate dialog HTML
    dialogContent.innerHTML = this.generateExportDialogHTML(bookmarks);
    
    dialogOverlay.appendChild(dialogContent);
    document.body.appendChild(dialogOverlay);

    // Setup event listeners
    this.setupExportDialogEvents(dialogOverlay, bookmarks);
  }

  generateExportDialogHTML(bookmarks) {
    const formats = [
      { format: 'csv', name: 'CSV Export', description: 'Spreadsheet format for data analysis', icon: '📊' },
      { format: 'pdf', name: 'PDF Report', description: 'Printable reading list with metadata', icon: '📄' },
      { format: 'json', name: 'JSON API', description: 'Programmatic access to bookmark data', icon: '🔧' }
    ];

    const formatsHTML = formats.map(format => `
      <div class="export-format-option" data-format="${format.format}">
        <div class="format-icon">${format.icon}</div>
        <div class="format-info">
          <div class="format-name">${format.name}</div>
          <div class="format-description">${format.description}</div>
        </div>
        <div class="format-radio">
          <input type="radio" name="export-format" value="${format.format}" ${format.format === 'csv' ? 'checked' : ''}>
        </div>
      </div>
    `).join('');

    return `
      <div class="export-dialog-header" style="display: flex; justify-content: space-between; align-items: center; padding: 24px 24px 0 24px; border-bottom: 1px solid #38444d; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 700;">📤 Export Bookmarks</h2>
        <button class="export-dialog-close" aria-label="Close" style="background: none; border: none; font-size: 24px; color: #8899a6; cursor: pointer; padding: 8px; border-radius: 50%;">×</button>
      </div>
      
      <div class="export-dialog-body" style="padding: 0 24px;">
        <div class="export-summary" style="background: #192734; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; color: #8899a6; font-size: 14px;">Exporting <strong style="color: white;">${bookmarks.length}</strong> bookmarks</p>
        </div>
        
        <div class="export-section" style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">📋 Export Format</h3>
          <div class="export-formats" style="display: flex; flex-direction: column; gap: 12px;">
            ${formatsHTML}
          </div>
        </div>
        
        <div class="export-section" style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🔍 Filters (Optional)</h3>
          <div class="export-filters" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="filter-group">
              <label for="export-tags" style="font-size: 14px; font-weight: 500; margin-bottom: 8px; display: block;">Tags:</label>
              <input type="text" id="export-tags" placeholder="javascript, react, typescript" style="padding: 12px; border: 1px solid #38444d; border-radius: 6px; background: #192734; color: white; font-size: 14px; width: 100%;">
            </div>
            <div class="filter-group">
              <label for="export-author" style="font-size: 14px; font-weight: 500; margin-bottom: 8px; display: block;">Author:</label>
              <input type="text" id="export-author" placeholder="@username" style="padding: 12px; border: 1px solid #38444d; border-radius: 6px; background: #192734; color: white; font-size: 14px; width: 100%;">
            </div>
            <div class="filter-group">
              <label for="export-date-from" style="font-size: 14px; font-weight: 500; margin-bottom: 8px; display: block;">Date From:</label>
              <input type="date" id="export-date-from" style="padding: 12px; border: 1px solid #38444d; border-radius: 6px; background: #192734; color: white; font-size: 14px; width: 100%;">
            </div>
            <div class="filter-group">
              <label for="export-date-to" style="font-size: 14px; font-weight: 500; margin-bottom: 8px; display: block;">Date To:</label>
              <input type="date" id="export-date-to" style="padding: 12px; border: 1px solid #38444d; border-radius: 6px; background: #192734; color: white; font-size: 14px; width: 100%;">
            </div>
          </div>
        </div>
        
        <div class="export-section" style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">📝 Options</h3>
          <div class="export-options" style="display: flex; flex-direction: column; gap: 12px;">
            <label class="option-checkbox" style="display: flex; align-items: center; cursor: pointer; padding: 8px 0;">
              <input type="checkbox" id="export-include-metadata" checked style="width: 18px; height: 18px; margin-right: 12px;">
              <span style="font-size: 14px;">Include metadata and analytics</span>
            </label>
            <label class="option-checkbox" style="display: flex; align-items: center; cursor: pointer; padding: 8px 0;">
              <input type="checkbox" id="export-custom-filename" style="width: 18px; height: 18px; margin-right: 12px;">
              <span style="font-size: 14px;">Custom filename</span>
            </label>
            <div class="custom-filename-input" style="margin-left: 30px; margin-top: 8px; display: none;">
              <input type="text" id="export-filename" placeholder="my-bookmarks" style="width: 100%; padding: 12px; border: 1px solid #38444d; border-radius: 6px; background: #192734; color: white; font-size: 14px;">
            </div>
          </div>
        </div>
      </div>
      
      <div class="export-dialog-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding: 24px; border-top: 1px solid #38444d; margin-top: 20px;">
        <button class="export-btn-cancel" style="padding: 12px 24px; border: 1px solid #38444d; background: #192734; color: white; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;">Cancel</button>
        <button class="export-btn-export" style="padding: 12px 24px; border: none; background: #22C55E; color: white; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;">📤 Export</button>
      </div>
    `;
  }

  setupExportDialogEvents(dialogOverlay, bookmarks) {
    const dialog = dialogOverlay.querySelector('.export-dialog-content') || dialogOverlay;

    // Close button
    dialog.querySelector('.export-dialog-close')?.addEventListener('click', () => {
      this.hideExportDialog();
    });

    // Cancel button
    dialog.querySelector('.export-btn-cancel')?.addEventListener('click', () => {
      this.hideExportDialog();
    });

    // Export button
    dialog.querySelector('.export-btn-export')?.addEventListener('click', () => {
      this.handleExport(bookmarks, dialog);
    });

    // Format selection
    dialog.querySelectorAll('.export-format-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          
          // Update visual selection
          dialog.querySelectorAll('.export-format-option').forEach(opt => {
            opt.style.borderColor = '#38444d';
            opt.style.background = '#192734';
          });
          option.style.borderColor = '#22C55E';
          option.style.background = '#1a3a4a';
        }
      });
    });

    // Custom filename toggle
    const customFilenameCheckbox = dialog.querySelector('#export-custom-filename');
    const customFilenameInput = dialog.querySelector('.custom-filename-input');
    
    customFilenameCheckbox?.addEventListener('change', () => {
      if (customFilenameCheckbox.checked) {
        customFilenameInput.style.display = 'block';
      } else {
        customFilenameInput.style.display = 'none';
      }
    });

    // Outside click to close
    dialogOverlay.addEventListener('click', (e) => {
      if (e.target === dialogOverlay) {
        this.hideExportDialog();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideExportDialog();
      }
    });
  }

  hideExportDialog() {
    const dialog = document.getElementById('xsaved-export-dialog');
    if (dialog) {
      dialog.remove();
    }
  }

  async handleExport(bookmarks, dialog) {
    const exportButton = dialog.querySelector('.export-btn-export');
    const originalText = exportButton.textContent;
    
    try {
      // Show initial progress
      this.showExportProgress(dialog, 'Preparing export...', 10);
      
      // Disable button and show loading
      exportButton.disabled = true;
      exportButton.textContent = '⏳ Exporting...';
      
      // Get export options
      this.showExportProgress(dialog, 'Validating options...', 20);
      const options = this.getExportOptions(dialog);
      
      // Apply filters if specified
      this.showExportProgress(dialog, 'Applying filters...', 30);
      let filteredBookmarks = bookmarks;
      if (options.filters) {
        filteredBookmarks = this.applyExportFilters(bookmarks, options.filters);
      }
      
      this.showExportProgress(dialog, `Processing ${filteredBookmarks.length} bookmarks...`, 50);
      
      // Send export request to service worker with timeout
      const exportTimeout = setTimeout(() => {
        console.error('❌ [CS] Export request timed out after 30 seconds');
        this.showExportError('Export request timed out. Please try again.');
        exportButton.disabled = false;
        exportButton.textContent = originalText;
      }, 30000); // 30 second timeout
      
      safeRuntimeMessage({ 
        action: 'exportBookmarks', 
        bookmarks: filteredBookmarks,
        options: options
      }, (response) => {
        clearTimeout(exportTimeout); // Clear timeout on response
        
        // Safely log response without circular references
        try {
          const safeResponse = this.sanitizeObject(response);
          console.log('📤 [CS] Export response received:', {
            success: safeResponse?.success,
            hasData: !!safeResponse?.data,
            filename: safeResponse?.filename,
            error: safeResponse?.error,
            hasDetails: !!safeResponse?.details
          });
        } catch (logError) {
          console.log('📤 [CS] Export response received (logging failed)');
        }
        
        if (response?.success) {
          this.showExportProgress(dialog, 'Preparing download...', 80);
          
          // Download the file
          this.downloadExportedFile(response.data, response.filename);
          
          this.showExportProgress(dialog, 'Download completed!', 100);
          
          // Show success message
          this.showExportSuccess(response);
          
          // Close dialog after a delay
          setTimeout(() => {
            this.hideExportDialog();
          }, 2000);
        } else {
          // Safely extract error information
          const errorMessage = this.safeExtractError(response);
          throw new Error(errorMessage);
        }
      });
      
    } catch (error) {
      console.error('Export failed:', error);
      
      // Ultra-safe error message extraction
      let errorMessage = 'Export failed';
      try {
        // Try to extract error message safely
        if (error) {
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (typeof error === 'object' && error !== null) {
            if (typeof error.message === 'string') {
              errorMessage = error.message;
            } else if (typeof error.toString === 'function') {
              const errorString = error.toString();
              if (errorString !== '[object Object]') {
                errorMessage = errorString;
              }
            }
          }
        }
      } catch (messageError) {
        console.error('Error processing error message:', messageError);
        errorMessage = 'Export failed (error details unavailable)';
      }
      
      // Ensure error message is not too long or problematic
      if (errorMessage.length > 500) {
        errorMessage = errorMessage.substring(0, 500) + '...';
      }
      
      // Remove any problematic characters
      errorMessage = errorMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      this.showExportError(errorMessage);
    } finally {
      // Restore button
      exportButton.disabled = false;
      exportButton.textContent = originalText;
    }
  }

  getExportOptions(dialog) {
    const format = dialog.querySelector('input[name="export-format"]:checked')?.value || 'csv';
    const includeMetadata = dialog.querySelector('#export-include-metadata')?.checked || false;
    const customFilename = dialog.querySelector('#export-custom-filename')?.checked || false;
    const filename = customFilename ? dialog.querySelector('#export-filename')?.value : undefined;
    
    const filters = {};
    
    // Get filter values
    const tagsInput = dialog.querySelector('#export-tags');
    if (tagsInput?.value) {
      filters.tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    const authorInput = dialog.querySelector('#export-author');
    if (authorInput?.value) {
      filters.author = authorInput.value.trim();
    }
    
    const dateFromInput = dialog.querySelector('#export-date-from');
    if (dateFromInput?.value) {
      filters.dateFrom = dateFromInput.value;
    }
    
    const dateToInput = dialog.querySelector('#export-date-to');
    if (dateToInput?.value) {
      filters.dateTo = dateToInput.value;
    }
    
    return {
      format,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      includeMetadata,
      filename: filename ? `${filename}.${format}` : undefined
    };
  }

  applyExportFilters(bookmarks, filters) {
    return bookmarks.filter(bookmark => {
      // Tag filter
      if (filters.tags?.length) {
        const bookmarkTags = bookmark.tags || [];
        const hasMatchingTag = filters.tags.some(tag => 
          bookmarkTags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      
      // Author filter
      if (filters.author) {
        if (!bookmark.author.toLowerCase().includes(filters.author.toLowerCase())) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const bookmarkDate = new Date(bookmark.created_at);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (bookmarkDate < fromDate) return false;
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          if (bookmarkDate > toDate) return false;
        }
      }
      
      return true;
    });
  }

  downloadExportedFile(data, filename) {
    try {
      console.log('📥 [CS] Starting file download:', filename);
      
      // Convert base64 to blob if needed
      let blob;
      if (typeof data === 'string') {
        // Assume it's base64 encoded
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray]);
      } else {
        blob = new Blob([data]);
      }
      
      console.log('📥 [CS] Blob created, size:', blob.size, 'bytes');
      
      // Use Chrome downloads API for better reliability
      if (chrome.downloads && chrome.downloads.download) {
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('❌ [CS] Chrome download failed:', chrome.runtime.lastError);
            // Fallback to manual download
            this.manualDownload(blob, filename);
          } else {
            console.log('✅ [CS] Chrome download started, ID:', downloadId);
            // Clean up the blob URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        });
      } else {
        // Fallback to manual download
        this.manualDownload(blob, filename);
      }
    } catch (error) {
      console.error('❌ [CS] Download failed:', error);
      throw error;
    }
  }

  manualDownload(blob, filename) {
    console.log('📥 [CS] Using manual download fallback');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('✅ [CS] Manual download completed');
  }

  showExportSuccess(result) {
    // Create a success notification
    const successNotification = document.createElement('div');
    successNotification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #15202b;
      border: 2px solid #22C55E;
      border-radius: 12px;
      padding: 20px;
      z-index: 20001;
      min-width: 300px;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      animation: slideInRight 0.3s ease-out;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    successNotification.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="font-size: 24px; margin-right: 12px;">✅</div>
        <h3 style="color: white; margin: 0; font-size: 16px;">Export Successful!</h3>
      </div>
      <div style="color: #8899a6; font-size: 14px; line-height: 1.4;">
        <p style="margin: 0 0 8px 0;"><strong>File:</strong> ${result.filename}</p>
        <p style="margin: 0 0 8px 0;"><strong>Size:</strong> ${this.formatFileSize(result.size || 0)}</p>
        <p style="margin: 0 0 8px 0;"><strong>Bookmarks:</strong> ${result.metadata?.totalBookmarks || 0}</p>
        <p style="margin: 0; color: #22C55E; font-size: 12px;">File downloaded to your default downloads folder</p>
      </div>
    `;
    
    document.body.appendChild(successNotification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (successNotification.parentNode) {
        successNotification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
          if (successNotification.parentNode) {
            successNotification.remove();
          }
        }, 300);
      }
    }, 5000);
    
    // Also remove style tag
    setTimeout(() => {
      if (style.parentNode) {
        style.remove();
      }
    }, 6000);
  }

  showExportProgress(dialog, message, percentage) {
    // Create or update progress indicator
    let progressContainer = dialog.querySelector('.export-progress');
    
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.className = 'export-progress';
      progressContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #15202b;
        border: 2px solid #22C55E;
        border-radius: 12px;
        padding: 24px;
        z-index: 20001;
        min-width: 300px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      `;
      
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.style.cssText = `
        width: 100%;
        height: 8px;
        background: #38444d;
        border-radius: 4px;
        margin: 16px 0;
        overflow: hidden;
      `;
      
      const progressFill = document.createElement('div');
      progressFill.className = 'progress-fill';
      progressFill.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #22C55E, #16A34A);
        border-radius: 4px;
        transition: width 0.3s ease;
        width: 0%;
      `;
      
      progressBar.appendChild(progressFill);
      progressContainer.appendChild(progressBar);
      
      dialog.appendChild(progressContainer);
    }
    
    // Update progress
    const progressFill = progressContainer.querySelector('.progress-fill');
    const progressText = progressContainer.querySelector('.progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (!progressText) {
      const text = document.createElement('div');
      text.className = 'progress-text';
      text.style.cssText = `
        color: white;
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 8px;
      `;
      progressContainer.insertBefore(text, progressContainer.firstChild);
    }
    
    const text = progressContainer.querySelector('.progress-text');
    if (text) {
      text.textContent = message;
    }
    
    // Add percentage
    const percentageText = progressContainer.querySelector('.progress-percentage');
    if (!percentageText) {
      const percent = document.createElement('div');
      percent.className = 'progress-percentage';
      percent.style.cssText = `
        color: #22C55E;
        font-size: 14px;
        font-weight: 600;
        margin-top: 8px;
      `;
      progressContainer.appendChild(percent);
    }
    
    const percent = progressContainer.querySelector('.progress-percentage');
    if (percent) {
      percent.textContent = `${percentage}%`;
    }
  }

  hideExportProgress(dialog) {
    const progressContainer = dialog.querySelector('.export-progress');
    if (progressContainer) {
      progressContainer.remove();
    }
  }

  showExportError(error) {
    // Create a more user-friendly error display
    const errorDialog = document.createElement('div');
    errorDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #15202b;
      border: 2px solid #EF4444;
      border-radius: 12px;
      padding: 24px;
      z-index: 20001;
      min-width: 400px;
      max-width: 500px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;
    
    errorDialog.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 48px; margin-bottom: 8px;">❌</div>
        <h3 style="color: white; margin: 0 0 8px 0; font-size: 18px;">Export Failed</h3>
        <p style="color: #8899a6; margin: 0; font-size: 14px;">${error}</p>
      </div>
      <div style="background: #1a3a4a; padding: 12px; border-radius: 8px; margin: 16px 0;">
        <p style="color: #22C55E; margin: 0; font-size: 12px; font-weight: 600;">Troubleshooting Tips:</p>
        <ul style="color: #8899a6; margin: 8px 0 0 0; padding-left: 20px; font-size: 12px;">
          <li>Try exporting fewer bookmarks</li>
          <li>Check your internet connection</li>
          <li>Try a different export format</li>
          <li>Refresh the page and try again</li>
        </ul>
      </div>
      <div style="text-align: center;">
        <button class="error-close-btn" style="
          background: #EF4444;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        ">Close</button>
      </div>
    `;
    
    document.body.appendChild(errorDialog);
    
    // Add close functionality
    errorDialog.querySelector('.error-close-btn').addEventListener('click', () => {
      errorDialog.remove();
    });
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      if (errorDialog.parentNode) {
        errorDialog.remove();
      }
    }, 10000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Safe object sanitization to prevent circular references
  sanitizeObject(obj, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return '[Max Depth Reached]';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    try {
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      }));
    } catch (error) {
      return '[Object could not be sanitized]';
    }
  }

  // Safe error extraction to prevent recursion
  safeExtractError(response) {
    try {
      let errorMessage = 'Export failed';
      
      // Safely extract error message
      if (response && typeof response === 'object') {
        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (response.error && typeof response.error.message === 'string') {
          errorMessage = response.error.message;
        }
      }
      
      // Safely add details if available
      if (response && response.details) {
        try {
          const details = this.sanitizeObject(response.details, 2);
          if (details && typeof details === 'object') {
            const detailsString = JSON.stringify(details, null, 2);
            errorMessage += `\n\nDetails: ${detailsString}`;
          }
        } catch (detailsError) {
          errorMessage += '\n\nDetails: [Error details could not be displayed]';
        }
      }
      
      return errorMessage;
    } catch (extractError) {
      return 'Export failed (error details unavailable)';
    }
  }

  // ===== NAVIGATION HANDLING =====
  setupNavigationListener() {
    // Listen for URL changes (SPA navigation)
    let currentUrl = window.location.href;
    
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        const wasOnBookmarksPage = currentUrl.includes('/i/bookmarks');
        currentUrl = window.location.href;
        console.log('🧭 URL changed to:', currentUrl);
        
        // If we were on bookmarks page and navigated away, clean up grid state
        if (wasOnBookmarksPage && !XSAVED_CONFIG.pages.isBookmarksPage()) {
          console.log('🚪 Navigated away from bookmarks page, cleaning up grid state...');
          this.hideGridInterface();
          isGridModeActive = false;
          console.log('🧹 Grid state reset on navigation away from bookmarks');
        }
        
        // Clean up existing toggle on navigation
        const existingToggle = document.getElementById('xsaved-bookmarks-toggle');
        if (existingToggle) {
          existingToggle.remove();
          console.log('🧹 Cleaned up existing toggle on navigation');
        }
        
        // Re-initialize based on new page
        setTimeout(() => {
          if (XSAVED_CONFIG.pages.isBookmarksPage()) {
            console.log('📍 Navigated to bookmarks page, initializing...');
            this.initializeBookmarksPage();
          }
        }, 1000); // Increased delay for SPA navigation
      }
    });

    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      const wasOnBookmarksPage = window.location.href.includes('/i/bookmarks');
      setTimeout(() => {
        if (XSAVED_CONFIG.pages.isBookmarksPage()) {
          console.log('📍 Popstate to bookmarks page, initializing...');
          this.initializeBookmarksPage();
        } else if (wasOnBookmarksPage) {
          console.log('🚪 Popstate away from bookmarks page, cleaning up grid state...');
          this.hideGridInterface();
          isGridModeActive = false;
          console.log('🧹 Grid state reset on popstate away from bookmarks');
        }
      }, 1000); // Increased delay for SPA navigation
    });
  }
}

// ===== INITIALIZATION =====
const xsavedContentScript = new XSavedContentScript();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    xsavedContentScript.initialize();
  });
} else {
  xsavedContentScript.initialize();
}

// Also initialize after delays for dynamic pages and SPA navigation
setTimeout(() => {
  xsavedContentScript.initialize();
}, 1000);

// Additional initialization for slow-loading SPAs
setTimeout(() => {
  xsavedContentScript.initialize();
}, 3000);

// Final fallback initialization
setTimeout(() => {
  xsavedContentScript.initialize();
}, 8000);

// Global cleanup
window.addEventListener('beforeunload', () => {
  if (bookmarkButtonObserver) {
    bookmarkButtonObserver.disconnect();
  }
  
  // Cleanup theme subscription
  if (xsavedContentScript && xsavedContentScript.themeUnsubscribe) {
    xsavedContentScript.themeUnsubscribe();
  }
  
  // Cleanup theme detector
  if (window.xsavedThemeDetector) {
    window.xsavedThemeDetector.destroy();
  }
});

// Export for testing
window.xsavedContentScript = xsavedContentScript;

console.log('✅ XSaved v2 Enhanced Content Script ready!'); 