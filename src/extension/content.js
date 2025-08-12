/**
 * XSaved Extension v2 - Enhanced Content Script
 * Phase 3: Content Script & DOM Injection
 * 
 * Features:
 * - Bookmark button interception with save dialog
 * - X.com /bookmarks page toggle for grid view
 * - Robust messaging with service worker
 * - Integration with Components 1 & 2 (IndexedDB + Search)
 */

console.log('🚀 XSaved v2 Enhanced Content Script loaded:', window.location.href);

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

// ===== INITIALIZATION =====
class XSavedContentScript {
  constructor() {
    this.initialized = false;
    this.stats = null;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('📀 Initializing XSaved Content Script...');
    
    try {
      // Get current stats from service worker
      await this.updateStats();
      
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

  async updateStats() {
    return new Promise((resolve) => {
      safeRuntimeMessage({ action: 'getStats' }, (response) => {
        if (response?.success) {
          this.stats = response.stats;
          console.log('📊 Updated stats:', this.stats);
        } else {
          console.warn('Failed to get stats from service worker');
        }
        resolve();
      });
    });
  }

  // ===== BOOKMARKS PAGE FEATURES =====
  initializeBookmarksPage() {
    console.log('🔖 Initializing bookmarks page features...');
    
    // Wait for Twitter SPA to fully load the bookmarks content
    this.waitForBookmarksPageLoad().then(() => {
      // Add toggle button to switch between default and grid view
      this.addBookmarksPageToggle();
    });
    
    // Listen for bookmark data changes
    this.setupBookmarksPageObserver();
  }

  async waitForBookmarksPageLoad() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10; // Maximum 5 seconds (10 * 500ms)
      
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
          }
        ];
        
        let foundHeader = null;
        for (const strategy of strategies) {
          foundHeader = strategy();
          if (foundHeader) {
            console.log(`✅ Bookmarks page content detected using strategy, proceeding with toggle placement`);
            console.log('📍 Found header text:', foundHeader.textContent);
            resolve();
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.warn(`⚠️ Bookmarks page content detection timed out after ${maxAttempts} attempts. Proceeding anyway...`);
          resolve(); // Proceed anyway to avoid infinite loop
          return;
        }
        
        console.log(`⏳ Waiting for bookmarks page content to load... (attempt ${attempts}/${maxAttempts})`);
        setTimeout(checkForContent, 500);
      };
      
      checkForContent();
    });
  }

  addBookmarksPageToggle() {
    // Debug current DOM state
    this.debugDOMState();
    
    // Strategy 1: Try to find the specific h2 header directly
    let header = document.querySelector(XSAVED_CONFIG.selectors.bookmarksPageHeader);
    let container = null;
    
    if (header) {
      console.log('✅ Found bookmarks header directly:', header.textContent);
      // Get the parent container for proper placement
      container = header.closest('div.css-175oi2r.r-1habvwh') || header.parentElement;
    } else {
      console.warn('⚠️ Specific header not found, trying fallback strategy...');
      
      // Strategy 2: Fallback - find container and then h2 within it
      container = document.querySelector(XSAVED_CONFIG.selectors.bookmarksContainer);
      if (container) {
        header = container.querySelector('h2[dir="ltr"]');
        if (header) {
          console.log('✅ Found header via fallback strategy:', header.textContent);
        }
      }
      
      // Strategy 3: Look for any h2 that could be the bookmarks header
      if (!header) {
        const allH2s = document.querySelectorAll('h2');
        Array.from(allH2s).forEach((h2, index) => {
          console.log(`H2 ${index + 1}:`, h2.textContent, h2.className);
          if (h2.textContent && h2.textContent.toLowerCase().includes('bookmark')) {
            header = h2;
            container = h2.closest('div') || h2.parentElement;
            console.log('✅ Found header via text search strategy:', header.textContent);
          }
        });
      }
    }

    if (!header || !container) {
      console.warn('❌ Could not find bookmarks page header or container. Retrying...');
      setTimeout(() => this.addBookmarksPageToggle(), 1000); // Retry after 1 second
      return;
    }

    // Check if toggle already exists
    if (document.getElementById('xsaved-bookmarks-toggle')) {
      console.log('⚠️ Bookmarks toggle already exists');
      return;
    }

    console.log('✅ Ready to place toggle. Header text:', header.textContent, 'Container:', container.tagName);

    // Create toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.id = 'xsaved-bookmarks-toggle';
    toggleContainer.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 16px;
      padding: 6px 12px;
      background: rgba(29, 161, 242, 0.1);
      border: 1px solid rgba(29, 161, 242, 0.3);
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
      color: rgb(29, 161, 242);
      transition: all 0.2s ease;
      cursor: pointer;
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
      height: 24px;
      cursor: pointer;
    `;

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = isGridModeActive;
    toggleInput.style.cssText = 'opacity: 0; width: 0; height: 0;';

    const toggleSlider = document.createElement('span');
    toggleSlider.style.cssText = `
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${isGridModeActive ? '#1DA1F2' : '#ccc'};
      transition: 0.3s;
      border-radius: 24px;
    `;

    const toggleDot = document.createElement('span');
    toggleDot.style.cssText = `
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: ${isGridModeActive ? '27px' : '3px'};
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    `;

    toggleSlider.appendChild(toggleDot);
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);

    // Create label text
    const labelText = document.createElement('span');
    labelText.textContent = isGridModeActive ? 'XSaved Grid' : 'Default View';
    labelText.style.fontWeight = '600';

    // Create stats indicator
    const statsIndicator = document.createElement('span');
    statsIndicator.style.cssText = `
      background: rgba(29, 161, 242, 0.2);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    `;
    statsIndicator.textContent = this.stats ? `${this.stats.totalBookmarks} saved` : 'Loading...';

    // Add toggle event
    toggleInput.addEventListener('change', (e) => {
      isGridModeActive = e.target.checked;
      labelText.textContent = isGridModeActive ? 'XSaved Grid' : 'Default View';
      toggleSlider.style.backgroundColor = isGridModeActive ? '#1DA1F2' : '#ccc';
      toggleDot.style.left = isGridModeActive ? '27px' : '3px';
      
      this.toggleGridMode(isGridModeActive);
    });

    // Assemble toggle
    toggleContainer.appendChild(labelText);
    toggleContainer.appendChild(toggleSwitch);
    toggleContainer.appendChild(statsIndicator);

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

    console.log('✅ Added bookmarks page toggle inside container next to header');
    console.log('📍 Toggle placement details:');
    console.log('- Toggle ID:', toggleContainer.id);
    console.log('- Header text:', header.textContent);
    console.log('- Container classes:', container.className);
    console.log('- Container now using flexbox layout');
    console.log('- Toggle position relative to header:', 'afterend');
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
    
    if (activate) {
      this.showGridInterface();
    } else {
      this.hideGridInterface();
    }
  }

  showGridInterface() {
    console.log('🏗️ Showing XSaved grid interface...');
    
    // TODO: Overlay UI Improvements
    // - Changed inset to 50px 0px 0px 0px to partially cover X.com bookmarks page
    // - Disabled main page scrolling to prevent interference with overlay
    // - Hidden X.com search input when overlay is active
    
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

    // Create loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: white;
      font-size: 18px;
    `;
    loadingDiv.innerHTML = `
      <div style="animation: spin 1s linear infinite; margin-bottom: 16px;">🔄</div>
      Loading your bookmarks...
    `;

    gridOverlay.appendChild(loadingDiv);
    document.body.appendChild(gridOverlay);

    // Load bookmarks from service worker
    this.loadBookmarksGrid(gridOverlay);
  }

  hideGridInterface() {
    console.log('🔍 Hiding XSaved grid interface...');
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

    // Show X.com search input
    const searchContainer = document.querySelector('div[data-xsaved-hidden="true"]');
    if (searchContainer) {
      searchContainer.style.display = '';
      searchContainer.removeAttribute('data-xsaved-hidden');
    }
  }

  async loadBookmarksGrid(container) {
    // Get recent bookmarks from service worker
    safeRuntimeMessage({ 
      action: 'searchBookmarks', 
      query: { text: '', limit: 10000, sortBy: 'created_at', sortOrder: 'desc' }
    }, (response) => {
      if (response?.success) {
        let bookmarks = [];
        
        // Handle different response structures
        if (response.result?.bookmarks) {
          // Search engine result: { bookmarks: ScoredBookmark[] }
          bookmarks = response.result.bookmarks.map(scoredBookmark => {
            // Extract actual bookmark from ScoredBookmark structure
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
        
        // Sort bookmarks by created_at descending (newest first) as a fallback
        bookmarks.sort((a, b) => {
          const aDate = new Date(a.bookmarked_at || 0);
          const bDate = new Date(b.bookmarked_at || 0);
          return bDate.getTime() - aDate.getTime();
        });
        
        console.log(`✅ Loaded ${bookmarks.length} bookmarks (latest first by created_at)`);
        this.renderBookmarksGrid(container, bookmarks);
      } else {
        console.error('❌ Search failed:', response);
        this.renderGridError(container, response?.error || 'Failed to load bookmarks');
      }
    });
  }

  renderBookmarksGrid(container, bookmarks) {
    container.innerHTML = '';

    // Helper function to group bookmarks by month/year
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
      
      // Convert to array and sort by date (newest first)
      return Object.values(grouped).sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    // Convert grouped bookmarks to grid items with separators
    const createGridItems = (bookmarks) => {
      const grouped = groupBookmarksByDate(bookmarks);
      const items = [];
      let dealIndex = 0;
      
      grouped.forEach((group, groupIndex) => {
        // Add separator for each group (except the very first one)
        if (groupIndex > 0) {
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

    // Create fixed header container (outside the overlay container)
    const headerContainer = document.createElement('div');
    headerContainer.id = 'xsaved-fixed-header';
    headerContainer.style.cssText = `
      position: fixed;
      top: 50px;
      left: 0;
      right: 0;
      background: rgb(0, 0, 0);
      z-index: 10001;
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Create header with search, export, and tag filters in one row
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    `;

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
    
    // Track selected tags for multi-select
    const selectedTags = new Set(['All']);
    
    sampleTags.forEach(tag => {
      const tagButton = document.createElement('button');
      tagButton.textContent = tag;
      tagButton.dataset.tag = tag;
      tagButton.style.cssText = `
        padding: 8px 16px;
        background: ${tag === 'All' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.1)'};
        color: ${tag === 'All' ? 'rgb(0, 0, 0)' : 'rgba(255, 255, 255, 0.9)'};
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
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
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
            btn.style.color = 'rgba(255, 255, 255, 0.9)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          });
          tagButton.style.background = 'rgba(255, 255, 255, 0.9)';
          tagButton.style.color = 'rgb(0, 0, 0)';
        } else {
          // Remove "All" from selection when other tags are selected
          selectedTags.delete('All');
          const allButton = tagSelector.querySelector('[data-tag="All"]');
          if (allButton) {
            allButton.style.background = 'rgba(255, 255, 255, 0.1)';
            allButton.style.color = 'rgba(255, 255, 255, 0.9)';
          }

          if (selectedTags.has(tag)) {
            // Deselect tag
            selectedTags.delete(tag);
            tagButton.style.background = 'rgba(255, 255, 255, 0.1)';
            tagButton.style.color = 'rgba(255, 255, 255, 0.9)';
            tagButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          } else {
            // Select tag
            selectedTags.add(tag);
            tagButton.style.background = 'rgba(29, 161, 242, 0.8)';
            tagButton.style.color = 'white';
            tagButton.style.borderColor = 'rgba(29, 161, 242, 1)';
          }

          // If no tags selected, select "All"
          if (selectedTags.size === 0) {
            selectedTags.add('All');
            const allButton = tagSelector.querySelector('[data-tag="All"]');
            if (allButton) {
              allButton.style.background = 'rgba(255, 255, 255, 0.9)';
              allButton.style.color = 'rgb(0, 0, 0)';
            }
          }
        }
        
        console.log(`🏷️ Selected tags:`, Array.from(selectedTags));
        // TODO: Implement tag filtering functionality
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

    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.placeholder = 'Search bookmarks...';
    searchBox.style.cssText = `
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 14px;
      width: 300px;
    `;

    const exportButton = document.createElement('button');
    exportButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path d="M12 2C13.1 2 14 2.9 14 4V12L16.5 9.5C16.9 9.1 17.5 9.1 17.9 9.5C18.3 9.9 18.3 10.5 17.9 10.9L12.7 16.1C12.3 16.5 11.7 16.5 11.3 16.1L6.1 10.9C5.7 10.5 5.7 9.9 6.1 9.5C6.5 9.1 7.1 9.1 7.5 9.5L10 12V4C10 2.9 10.9 2 12 2Z"/>
        <path d="M20 20H4V18H20V20Z"/>
      </svg>
      Export
    `;
    exportButton.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      border-radius: 20px;
      color: #22C55E;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    exportButton.addEventListener('mouseenter', () => {
      exportButton.style.background = 'rgba(34, 197, 94, 0.3)';
    });
    exportButton.addEventListener('mouseleave', () => {
      exportButton.style.background = 'rgba(34, 197, 94, 0.2)';
    });

    exportButton.addEventListener('click', () => {
      console.log('📤 Export button clicked');
      this.showExportDialog(bookmarks);
    });

    rightSide.appendChild(searchBox);
    rightSide.appendChild(exportButton);

    header.appendChild(tagSelector);
    header.appendChild(rightSide);
    headerContainer.appendChild(header);

    // Add header to document body (outside the overlay container)
    document.body.appendChild(headerContainer);

    // Create content container with top margin to account for fixed header
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      margin-top: 100px;
      padding: 0 20px;
    `;

    // Create grid
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.id = 'xsaved-bookmarks-grid';
    grid.style.cssText = `
      display: grid;
      justify-content: center;
      grid-template-columns: repeat(3, minmax(0, 210px));
      gap: 24px;
      justify-items: center;
      margin-bottom: 40px;
    `;

    // Render grouped bookmark cards with date separators
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

    container.appendChild(contentContainer);
    contentContainer.appendChild(grid);

    // Add search functionality
    searchBox.addEventListener('input', (e) => {
      this.filterBookmarksGrid(e.target.value, grid, bookmarks);
    });

    console.log(`✅ Rendered grid with ${bookmarks.length} bookmarks`);
  }

  createBookmarkCard(bookmark) {
    // Safe property access with fallbacks
    const safeBookmark = {
      id: bookmark?.id || 'unknown',
      text: bookmark?.text || 'No content available',
      author: bookmark?.author || 'unknown',
      tags: bookmark?.tags || [],
      media_urls: bookmark?.media_urls || [],
      bookmarked_at: bookmark?.bookmarked_at || bookmark?.created_at || new Date().toISOString()
    };

    const card = document.createElement('div');
    
    // Apply base card styles without floating animations
    card.className = 'tweet-card';
    card.style.cssText = `
      background-color: #1A1A1A;
      width: 240px;
      height: 280px;
      border-radius: 12px;
      margin: 10px;
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      position: relative;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.8);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Hover effect
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.3)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.8)';
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
      z-index: 10;
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
      window.open(`https://x.com/i/web/status/${safeBookmark.id}`, '_blank');
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
    
    // Get first letter of username for profile pic
    const getInitial = (name) => {
      return name.charAt(0).toUpperCase();
    };
    
    profilePic.textContent = getInitial(safeBookmark.author);

    // User info
    const userInfo = document.createElement('div');
    
    const userName = document.createElement('div');
    userName.style.cssText = `
      color: #FFFFFF;
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
    userHandle.style.cssText = `
      color: #888888;
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
    tweetText.style.cssText = `
      color: #FFFFFF;
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

    // Check if text is truncated and add "more" link
    if (safeBookmark.text.length > 200) {
      const moreLink = document.createElement('span');
      moreLink.style.cssText = `
        color: #3498db;
        cursor: pointer;
        position: absolute;
        right: 0;
        bottom: 0;
        background-color: #1A1A1A;
        padding-left: 4px;
      `;
      moreLink.innerHTML = '<small class="underline">more</small>';
      
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
        width: calc(100% - 0px);
        height: 100px;
        margin-top: auto;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
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

    if (safeBookmark.tags && safeBookmark.tags.length > 0) {
      safeBookmark.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.style.cssText = `
          background: rgba(29, 161, 242, 0.2);
          color: #1DA1F2;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        `;
        tagElement.textContent = `#${tag}`;
        tagsContainer.appendChild(tagElement);
      });
    }

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

    // Click to open original tweet
    card.addEventListener('click', () => {
      window.open(`https://x.com/i/web/status/${safeBookmark.id}`, '_blank');
    });

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
      z-index: 10000;
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
    
    const getInitial = (name) => {
      return name.charAt(0).toUpperCase();
    };
    
    profilePic.textContent = getInitial(tweet.author);

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
        `;
        tagElement.textContent = `#${tag}`;
        tagsSection.appendChild(tagElement);
      });
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

  filterBookmarksGrid(query, grid, bookmarks) {
    if (!Array.isArray(bookmarks)) {
      console.error('❌ Bookmarks is not an array!', bookmarks);
      return;
    }
    
    const filteredBookmarks = bookmarks.filter(bookmark => {
      const text = bookmark?.text || '';
      const author = bookmark?.author || '';
      const tags = bookmark?.tags || [];
      
      return text.toLowerCase().includes(query.toLowerCase()) ||
             author.toLowerCase().includes(query.toLowerCase()) ||
             tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    });

    // Helper function to group bookmarks by month/year (same as in renderBookmarksGrid)
    const groupBookmarksByDate = (bookmarks) => {
      const grouped = bookmarks.reduce((acc, bookmark) => {
        const date = new Date(bookmark.bookmarked_at || bookmark.created_at);
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
        // Add separator for each group (except the very first one)
        if (groupIndex > 0) {
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
            // Use the improved timing logic
            this.waitForBookmarksPageLoad().then(() => {
              this.addBookmarksPageToggle();
            });
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
          
          // Show our save dialog after delay
          setTimeout(() => {
            console.log('🏷️ Showing save dialog...');
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
      background: linear-gradient(135deg, rgba(21, 32, 43, 0.98), rgba(21, 32, 43, 0.95));
      backdrop-filter: blur(16px);
      border: 1px solid rgba(29, 161, 242, 0.4);
      border-radius: 16px;
      padding: 20px;
      z-index: 10000;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
      min-width: 320px;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #ffffff;
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
      color: #1DA1F2;
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
      Save to XSaved
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
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
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      border-left: 3px solid #1DA1F2;
    `;

    const previewAuthor = document.createElement('div');
    previewAuthor.style.cssText = `
      font-weight: 600;
      color: #1DA1F2;
      font-size: 14px;
      margin-bottom: 4px;
    `;
    previewAuthor.textContent = `@${tweetData.author}`;

    const previewText = document.createElement('div');
    previewText.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
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
      color: rgba(255, 255, 255, 0.9);
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
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
    `;

    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.className = 'xsaved-tag-input';
    tagsInput.placeholder = 'Type tags and press space or comma...';
    tagsInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      color: white;
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
        background: rgba(29, 161, 242, 0.2);
        color: #1DA1F2;
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
      tagsInput.style.borderColor = '#1DA1F2';
      tagsContainer.style.borderColor = '#1DA1F2';
      // Only reset timeout on initial focus, not on every interaction
      this.resetTooltipTimeout();
    });
    tagsInput.addEventListener('blur', () => {
      tagsInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      tagsContainer.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      
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
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: transparent;
      color: rgba(255, 255, 255, 0.8);
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
    saveButton.textContent = 'Save';
    saveButton.style.cssText = `
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      background: #1DA1F2;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    // Button hover effects
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.borderColor = 'rgba(255, 255, 255, 0.5)';
      cancelButton.style.color = 'white';
    });
    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      cancelButton.style.color = 'rgba(255, 255, 255, 0.8)';
    });

    saveButton.addEventListener('mouseenter', () => {
      saveButton.style.background = '#1991db';
    });
    saveButton.addEventListener('mouseleave', () => {
      saveButton.style.background = '#1DA1F2';
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

  handleSaveBookmark(tweetData, tags, saveButton) {
    console.log('💾 Saving bookmark with tags:', tags);
    
    // Disable save button during save
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    saveButton.style.opacity = '0.7';

          // Create bookmark entity - let service worker handle sortIndex parsing
      const bookmarkEntity = {
        ...tweetData,
        tags
      };

    // Send to service worker
    safeRuntimeMessage({
      action: 'saveBookmark',
      bookmark: bookmarkEntity
    }, (response) => {
      if (response?.success) {
        console.log('✅ Bookmark saved successfully');
        
        // Show success state
        saveButton.textContent = '✓ Saved!';
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
        currentUrl = window.location.href;
        console.log('🧭 URL changed to:', currentUrl);
        
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
      setTimeout(() => {
        if (XSAVED_CONFIG.pages.isBookmarksPage()) {
          console.log('📍 Popstate to bookmarks page, initializing...');
          this.initializeBookmarksPage();
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

// Also initialize after a short delay for dynamic pages
setTimeout(() => {
  xsavedContentScript.initialize();
}, 1000);

// Global cleanup
window.addEventListener('beforeunload', () => {
  if (bookmarkButtonObserver) {
    bookmarkButtonObserver.disconnect();
  }
});

// Export for testing
window.xsavedContentScript = xsavedContentScript;

console.log('✅ XSaved v2 Enhanced Content Script ready!'); 