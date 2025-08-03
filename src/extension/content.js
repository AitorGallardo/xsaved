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
    
    // Create grid overlay
    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'xsaved-grid-overlay';
    gridOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgb(0, 0, 0);
      z-index: 10000;
      padding: 20px;
      overflow-y: auto;
    `;

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
  }

  async loadBookmarksGrid(container) {
    // Get recent bookmarks from service worker
    safeRuntimeMessage({ 
      action: 'searchBookmarks', 
      query: { text: '', limit: 50, sortBy: 'created_at', sortOrder: 'desc' }
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
          const aDate = new Date(a.created_at || a.bookmark_timestamp || 0);
          const bDate = new Date(b.created_at || b.bookmark_timestamp || 0);
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

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Left side: Title and back button
    const leftSide = document.createElement('div');
    leftSide.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
    `;

    const backButton = document.createElement('button');
    backButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path d="M19 12H5m7-7l-7 7 7 7"/>
      </svg>
      Back to Twitter
    `;
    backButton.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background: rgba(29, 161, 242, 0.2);
      border: 1px solid rgba(29, 161, 242, 0.4);
      border-radius: 20px;
      color: #1DA1F2;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    backButton.addEventListener('mouseenter', () => {
      backButton.style.background = 'rgba(29, 161, 242, 0.3)';
    });
    backButton.addEventListener('mouseleave', () => {
      backButton.style.background = 'rgba(29, 161, 242, 0.2)';
    });

    backButton.addEventListener('click', () => {
      console.log('🔙 Back button clicked, switching to default view');
      isGridModeActive = false;
      
      // Update the original toggle state
      const originalToggle = document.getElementById('xsaved-bookmarks-toggle');
      if (originalToggle) {
        const toggleInput = originalToggle.querySelector('input[type="checkbox"]');
        const toggleSlider = originalToggle.querySelector('span');
        const toggleDot = toggleSlider ? toggleSlider.querySelector('span') : null;
        const labelText = originalToggle.querySelector('span');
        
        if (toggleInput) toggleInput.checked = false;
        if (toggleSlider) toggleSlider.style.backgroundColor = '#ccc';
        if (toggleDot) toggleDot.style.left = '3px';
        if (labelText) labelText.textContent = 'Default View';
      }
      
      this.hideGridInterface();
    });

    const title = document.createElement('h2');
    title.style.cssText = 'color: white; margin: 0; font-size: 24px;';
    title.textContent = `XSaved Grid (${bookmarks.length})`;

    leftSide.appendChild(backButton);
    leftSide.appendChild(title);

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

    header.appendChild(leftSide);
    header.appendChild(searchBox);

    // Create grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    `;

    // Render bookmark cards
    bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
    });

    container.appendChild(header);
    container.appendChild(grid);

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
      bookmark_timestamp: bookmark?.bookmark_timestamp || bookmark?.created_at || new Date().toISOString()
    };

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
      cursor: pointer;
      position: relative;
    `;

    // Hover effect
    card.addEventListener('mouseenter', () => {
      card.style.background = 'rgba(255, 255, 255, 0.08)';
      card.style.borderColor = 'rgba(29, 161, 242, 0.5)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.background = 'rgba(255, 255, 255, 0.05)';
      card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    });

    // Author
    const author = document.createElement('div');
    author.style.cssText = `
      color: #1DA1F2;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
    `;
    author.textContent = `@${safeBookmark.author}`;

    // Content
    const content = document.createElement('div');
    content.style.cssText = `
      color: white;
      line-height: 1.5;
      margin-bottom: 12px;
      font-size: 14px;
    `;
    content.textContent = safeBookmark.text.length > 200 
      ? safeBookmark.text.substring(0, 200) + '...' 
      : safeBookmark.text;

    // Tags
    const tagsContainer = document.createElement('div');
    tagsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
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

    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
    `;
    timestamp.textContent = new Date(safeBookmark.bookmark_timestamp).toLocaleDateString();

    // Assemble card
    card.appendChild(author);
    card.appendChild(content);
    card.appendChild(tagsContainer);
    card.appendChild(timestamp);

    // Click to open original tweet
    card.addEventListener('click', () => {
      window.open(`https://x.com/i/web/status/${bookmark.id}`, '_blank');
    });

    return card;
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

    // Clear and re-render grid
    grid.innerHTML = '';
    filteredBookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      grid.appendChild(card);
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
    if (dataId && /^\d+$/.test(dataId)) {
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
      
      removeButton.addEventListener('click', () => {
        // Clear auto-fade timeout when user is actively interacting
        this.clearTooltipTimeout();
        
        const index = currentTags.indexOf(tagText);
        if (index > -1) {
          currentTags.splice(index, 1);
          tagElement.remove();
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

    // Enter key to save (only if no text in input, otherwise it creates a tag)
    tagsInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !tagsInput.value.trim()) {
        this.handleSaveBookmark(tweetData, currentTags, saveButton);
      }
    });

    actionsContainer.appendChild(cancelButton);
    actionsContainer.appendChild(saveButton);

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(preview);
    dialog.appendChild(tagsSection);
    dialog.appendChild(actionsContainer);

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

    // Add escape key dismissal
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        console.log('⌨️ Escape key pressed, closing dialog');
        this.removeTooltip();
        document.removeEventListener('keydown', handleEscapeKey);
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    dialog._escapeKeyHandler = handleEscapeKey;

    return dialog;
  }

  handleSaveBookmark(tweetData, tags, saveButton) {
    console.log('💾 Saving bookmark with tags:', tags);
    
    // Disable save button during save
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    saveButton.style.opacity = '0.7';

    // Create bookmark entity
    const bookmarkEntity = {
      ...tweetData,
      tags,
      bookmark_timestamp: new Date().toISOString()
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
        console.error('❌ Failed to save bookmark:', response?.error);
        
        // Show error state
        saveButton.textContent = 'Error!';
        saveButton.style.background = '#f91880';
        
        // Reset after delay
        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.style.background = '#1DA1F2';
          saveButton.disabled = false;
          saveButton.style.opacity = '1';
        }, 2000);
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
      if (currentTooltip._escapeKeyHandler) {
        document.removeEventListener('keydown', currentTooltip._escapeKeyHandler);
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