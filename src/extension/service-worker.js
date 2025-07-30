/**
 * XSaved Extension v2 - Enhanced Service Worker
 * Combines proven smart scheduling with IndexedDB and Search Engine
 */

// Import our Components 1 & 2 (now compiled from TypeScript)
import { db } from '../dist/db/index.js';
import { searchEngine } from '../dist/search/index.js';

// Import existing proven utilities (temporarily disabled - need to create these)
// TODO: Create these utility files
// import { 
//   fetchBookmarksV2, 
//   processBookmarksResponse, 
//   getCsrfToken,
//   checkXLoginStatus 
// } from './utils/fetcher.js';
// import { notifyContentScript, updateProgress, notifyPopup } from './utils/communicator.js';
// import { delay, NetworkError, RateLimitError } from './utils/helpers.js';

// Temporary inline implementations for testing
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class NetworkError extends Error { constructor(msg) { super(msg); this.name = "NetworkError"; } }
class RateLimitError extends Error { constructor(msg) { super(msg); this.name = "RateLimitError"; } }
const notifyContentScript = () => {}; // stub
const updateProgress = () => {}; // stub
const notifyPopup = () => {}; // stub

// ===============================
// PROVEN SCHEDULING CONSTANTS (Keep from background.js)
// ===============================

const SCHEDULE_INTERVALS = {
  FREQUENT: 5,    // 5 minutes - when user is active
  NORMAL: 15,     // 15 minutes - default
  INFREQUENT: 60, // 1 hour - when user is inactive
  OFFLINE: 240    // 4 hours - when user seems offline
};

const AUTOMATIC_MIN_FETCH_INTERVAL = SCHEDULE_INTERVALS.FREQUENT * 60 * 1000; // 5 minutes
const AUTOMATIC_SCHEDULED_FETCH_INTERVAL_IN_MINUTES = SCHEDULE_INTERVALS.NORMAL; // 15 minutes
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds
const INITIAL_REQUESTS_LEFT = 20;
const USER_ACTIVITY_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours
const EXPONENTIAL_BACKOFF_BASE = 2;
const MAX_BACKOFF_MINUTES = 240; // 4 hours max backoff

// ===============================
// STATE MANAGEMENT (Keep from background.js)
// ===============================

let currentScheduleInterval = SCHEDULE_INTERVALS.NORMAL;
let consecutiveFailures = 0;
let lastUserActivity = Date.now();
let authSession = null;
let isExtracting = false;
let requestsLeft = INITIAL_REQUESTS_LEFT;
let bookmarksTabId = null;
let estimatedTotalBookmarks = 0;

// Delta sync variables (Keep existing logic)
let lastBookmarkId = null;
let lastSyncTimestamp = null;
let isDeltaSync = false;
let newestBookmarkId = null;

// Extraction state tracking
let extractionState = {
  phase: 'idle', // 'idle', 'twitter_api_fetch', 'indexeddb_save'
  startTime: null,
  message: '',
  bookmarkCount: 0,
  totalBookmarks: 0,
  isBackground: false,
  percentage: 0
};

// ===============================
// ENHANCED INITIALIZATION
// ===============================

class ExtensionServiceWorker {
  constructor() {
    this.initialized = false;
    this.db = null;
    this.searchEngine = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing Enhanced Service Worker...');
      
      // Initialize IndexedDB (Component 1) - now enabled!
      console.log('📀 Initializing IndexedDB...');
      const dbResult = await db.initialize();
      if (dbResult.success) {
        this.db = db;
        console.log('✅ IndexedDB initialized successfully');
      } else {
        throw new Error(`IndexedDB initialization failed: ${dbResult.error}`);
      }
      
      // Initialize Search Engine (Component 2) - now enabled!
      console.log('🔍 Initializing Search Engine...');
      this.searchEngine = searchEngine;
      console.log('✅ Search Engine initialized successfully');
      
      // Load existing sync state from chrome.storage
      await this.loadSyncState();
      
      // Set up smart scheduling (keep existing logic)
      this.setupSmartScheduling();
      
      console.log('✅ Enhanced Service Worker initialized successfully');
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Service Worker initialization failed:', error);
      throw error;
    }
  }

  async loadSyncState() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'lastBookmarkId', 
        'lastSyncTimestamp', 
        'syncMode',
        'requestsLeft'
      ], (result) => {
        lastBookmarkId = result.lastBookmarkId || null;
        lastSyncTimestamp = result.lastSyncTimestamp || null;
        requestsLeft = result.requestsLeft || INITIAL_REQUESTS_LEFT;
        
        // Determine if we can do delta sync
        const timeSinceLastSync = lastSyncTimestamp ? Date.now() - lastSyncTimestamp : null;
        isDeltaSync = !!(lastBookmarkId && timeSinceLastSync < 24 * 60 * 60 * 1000);
        
        console.log('📊 Loaded sync state:', {
          lastBookmarkId: lastBookmarkId ? `${lastBookmarkId.substring(0, 15)}...` : null,
          isDeltaSync,
          timeSinceLastSync: timeSinceLastSync ? Math.round(timeSinceLastSync / 60000) + 'min' : null
        });
        
        resolve();
      });
    });
  }

  setupSmartScheduling() {
    try {
      // Check if chrome.alarms API is available
      if (typeof chrome !== 'undefined' && chrome.alarms) {
        console.log('⏰ Setting up smart scheduling with alarms');
        
        // Keep existing alarm logic
        chrome.alarms.onAlarm.addListener(async (alarm) => {
          if (alarm.name === 'fetchBookmarks') {
            if (await this.isAllowedToAutomaticFetch()) {
              console.log('⏰ SMART ALARM: Fetching bookmarks');
              await this.backgroundFetch();
            }
          }
        });

        // Schedule initial alarm
        this.scheduleNextFetch();
      } else {
        console.warn('⚠️ Chrome alarms API not available - scheduling disabled');
      }
    } catch (error) {
      console.error('❌ Error setting up smart scheduling:', error);
    }
  }

  async isAllowedToAutomaticFetch() {
    const now = Date.now();
    
    // Check if extraction is already in progress
    if (isExtracting) {
      console.log('⏸️ Extraction already in progress, skipping automatic fetch');
      return false;
    }
    
    // Check minimum interval
    if (lastSyncTimestamp && (now - lastSyncTimestamp) < AUTOMATIC_MIN_FETCH_INTERVAL) {
      console.log('⏸️ Too soon since last sync, skipping automatic fetch');
      return false;
    }
    
    // Check if user is logged in to X.com
    const isLoggedIn = await this.checkXLoginStatus();
    if (!isLoggedIn) {
      console.log('⏸️ User not logged in to X.com, skipping automatic fetch');
      return false;
    }
    
    return true;
  }

  async checkXLoginStatus() {
    // Temporary stub - return true for testing
    console.log('🔍 Login status check (stubbed - always returns true for testing)');
    return true;
  }

  async backgroundFetch() {
    updateExtractionState({
      isBackground: true,
      message: 'Background sync starting...'
    });
    
    await extractAllBookmarks();
  }

  scheduleNextFetch() {
    try {
      if (typeof chrome !== 'undefined' && chrome.alarms) {
        // Clear any existing alarm
        chrome.alarms.clear('fetchBookmarks');
        
        // Schedule next alarm based on current interval
        const nextFetchInMinutes = currentScheduleInterval;
        chrome.alarms.create('fetchBookmarks', { delayInMinutes: nextFetchInMinutes });
        
        console.log(`⏰ Next automatic fetch scheduled in ${nextFetchInMinutes} minutes`);
      } else {
        console.log('⏰ Alarms not available - scheduling skipped');
      }
    } catch (error) {
      console.error('❌ Error scheduling next fetch:', error);
    }
  }

  updateScheduleInterval() {
    const timeSinceActivity = Date.now() - lastUserActivity;
    const oldInterval = currentScheduleInterval;
    
    if (timeSinceActivity < USER_ACTIVITY_THRESHOLD) {
      currentScheduleInterval = SCHEDULE_INTERVALS.FREQUENT;
    } else if (timeSinceActivity < USER_ACTIVITY_THRESHOLD * 2) {
      currentScheduleInterval = SCHEDULE_INTERVALS.NORMAL;
    } else if (timeSinceActivity < USER_ACTIVITY_THRESHOLD * 4) {
      currentScheduleInterval = SCHEDULE_INTERVALS.INFREQUENT;
    } else {
      currentScheduleInterval = SCHEDULE_INTERVALS.OFFLINE;
    }
    
    if (oldInterval !== currentScheduleInterval) {
      console.log(`📊 Schedule interval updated: ${oldInterval}min → ${currentScheduleInterval}min`);
      this.scheduleNextFetch();
    }
  }
}

// ===============================
// ENHANCED BOOKMARK SAVING (NEW: IndexedDB Integration)
// ===============================

const saveBookmarkToLocal = async (bookmark, userTags = []) => {
  try {
    // Ensure service worker is initialized
    await serviceWorker.initialize();
    
    // Create BookmarkEntity for Component 1
    const bookmarkEntity = {
      id: bookmark.id,
      text: bookmark.text || '',
      author: bookmark.author || '',
      created_at: bookmark.created_at || new Date().toISOString(),
      bookmark_timestamp: new Date().toISOString(),
      tags: userTags.length > 0 ? userTags : (bookmark.tags || []),
      media_urls: bookmark.media_urls || [],
      // Add search tokenization for Component 2
      textTokens: tokenizeText(bookmark.text || '')
    };
    
    // Save to IndexedDB (Component 1) - now enabled!
    const result = await serviceWorker.db.addBookmark(bookmarkEntity);
    
    if (!result.success) {
      throw new Error(`Failed to save bookmark: ${result.error}`);
    }
    
    console.log(`✅ Saved bookmark ${bookmark.id} to IndexedDB`);
    
    // Update extraction state
    extractionState.bookmarkCount++;
    broadcastStateUpdate();
    
    return result.data;
    
  } catch (error) {
    console.error('❌ Error saving bookmark to local storage:', error);
    return null;
  }
};

// ===============================
// ENHANCED EXTRACTION FLOW (Keep existing + IndexedDB)
// ===============================

const extractAllBookmarks = async () => {
  if (isExtracting) {
    console.log('⚠️ Extraction already in progress');
    return;
  }

  await serviceWorker.initialize();
  
  isExtracting = true;
  let cursor = null;
  let allExtractedBookmarks = [];
  let retryCount = 0;
  
  updateExtractionState({
    phase: 'twitter_api_fetch',
    startTime: Date.now(),
    message: isDeltaSync ? 'Delta sync: Checking for new bookmarks...' : 'Full sync: Extracting all bookmarks...',
    bookmarkCount: 0,
    isBackground: extractionState.isBackground
  });

  try {
    // Get CSRF token (stubbed for testing)
    console.log('🔑 CSRF token stubbed for testing');
    const csrfToken = 'test_token';
    
    let hasMore = true;
    let consecutiveEmptyBatches = 0;
    
    while (hasMore && consecutiveEmptyBatches < 3) {
      try {
        console.log(`📥 Fetching batch ${Math.floor(allExtractedBookmarks.length / 100) + 1}...`);
        
        // Stub fetcher logic for testing
        console.log('📥 Fetching stubbed for testing');
        const bookmarks = []; // Empty for testing
        const nextCursor = null;
        
        if (bookmarks.length === 0) {
          consecutiveEmptyBatches++;
          console.log(`⚠️ Empty batch ${consecutiveEmptyBatches}/3`);
        } else {
          consecutiveEmptyBatches = 0;
        }
        
        // Process bookmarks in batches
        updateExtractionState({
          phase: 'indexeddb_save',
          message: `Processing ${bookmarks.length} bookmarks...`
        });
        
        for (const bookmark of bookmarks) {
          // Check for delta sync termination
          if (isDeltaSync && lastBookmarkId && bookmark.id === lastBookmarkId) {
            console.log('🎯 Delta sync: Reached last known bookmark, stopping');
            hasMore = false;
            break;
          }
          
          // Save to IndexedDB instead of server
          await saveBookmarkToLocal(bookmark);
          allExtractedBookmarks.push(bookmark);
          
          // Update newest bookmark ID
          if (!newestBookmarkId) {
            newestBookmarkId = bookmark.id;
          }
        }
        
        // Update cursor and continue
        cursor = nextCursor;
        hasMore = !!nextCursor && consecutiveEmptyBatches < 3;
        
        // Rate limiting (keep existing logic)
        requestsLeft--;
        if (requestsLeft <= 0) {
          console.log('⏸️ Rate limit reached, stopping extraction');
          break;
        }
        
        // Delay between requests
        if (hasMore) {
          await delay(RATE_LIMIT_DELAY);
        }
        
      } catch (error) {
        console.error('❌ Error in extraction batch:', error);
        
        if (error instanceof RateLimitError) {
          console.log('⏸️ Rate limited, stopping extraction');
          break;
        }
        
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error('❌ Max retries reached, stopping extraction');
          break;
        }
        
        await delay(RATE_LIMIT_DELAY * retryCount);
      }
    }
    
    // Update sync state (keep existing logic)
    if (newestBookmarkId) {
      lastBookmarkId = newestBookmarkId;
      lastSyncTimestamp = Date.now();
      
      chrome.storage.local.set({
        lastBookmarkId,
        lastSyncTimestamp,
        requestsLeft,
        syncType: isDeltaSync ? 'delta' : 'full'
      });
    }
    
    updateExtractionState({
      phase: 'idle',
      message: `✅ Extraction complete! Processed ${allExtractedBookmarks.length} bookmarks`,
      percentage: 100
    });
    
    console.log(`🎉 Extraction complete: ${allExtractedBookmarks.length} bookmarks saved to IndexedDB`);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    updateExtractionState({
      phase: 'idle',
      message: `❌ Extraction failed: ${error.message}`,
      percentage: 0
    });
  } finally {
    isExtracting = false;
    
    // Schedule next fetch (keep existing logic)
    serviceWorker.scheduleNextFetch();
  }
};

// ===============================
// MESSAGE HANDLING (Enhanced with search)
// ===============================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Enhanced Service Worker received message:", request);

  switch (request.action) {
    case "startExtraction":
      handleStartExtraction(sendResponse, request.options);
      return true;
      
    case "searchBookmarks":
      handleSearchBookmarks(request.query, sendResponse);
      return true;
      
    case "saveBookmark":
      handleSaveBookmark(request.bookmark, sendResponse);
      return true;
      
    case "getProgress":
      sendResponse({
        isExtracting,
        bookmarkCount: extractionState.bookmarkCount,
        totalBookmarks: estimatedTotalBookmarks || extractionState.bookmarkCount,
        extractionState: extractionState,
        canStartExtraction: !isExtracting
      });
      break;
      
    case "getStats":
      handleGetStats(sendResponse);
      return true;
  }
});

const handleStartExtraction = async (sendResponse, options = {}) => {
  try {
    await serviceWorker.initialize();
    
    const isLoggedIn = await serviceWorker.checkXLoginStatus();
    if (isLoggedIn) {
      // Update extraction options
      extractionState.isBackground = options.isBackground || false;
      
      await extractAllBookmarks();
      sendResponse({ status: "started" });
    } else {
      sendResponse({ status: "login_required" });
    }
  } catch (error) {
    console.error('Error starting extraction:', error);
    sendResponse({ status: "error", error: error.message });
  }
};

const handleSearchBookmarks = async (query, sendResponse) => {
  try {
    await serviceWorker.initialize();
    
    const result = await serviceWorker.searchEngine.search(query);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Search error:', error);
    sendResponse({ success: false, error: error.message });
  }
};

const handleSaveBookmark = async (bookmark, sendResponse) => {
  try {
    const saved = await saveBookmarkToLocal(bookmark, bookmark.tags);
    sendResponse({ success: !!saved, bookmark: saved });
  } catch (error) {
    console.error('Save bookmark error:', error);
    sendResponse({ success: false, error: error.message });
  }
};

const handleGetStats = async (sendResponse) => {
  try {
    await serviceWorker.initialize();
    
    // Get statistics from IndexedDB
    const stats = await serviceWorker.db.getStats();
    const searchStats = serviceWorker.searchEngine.getCacheStats();
    
    sendResponse({
      success: true,
      stats: {
        totalBookmarks: stats.data?.totalBookmarks || 0,
        totalTags: stats.data?.uniqueTags || 0,
        storageUsed: stats.data?.storageSize || 0,
        searchCache: searchStats,
        lastSync: lastSyncTimestamp,
        syncMode: isDeltaSync ? 'delta' : 'full'
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    sendResponse({ success: false, error: error.message });
  }
};

// ===============================
// UTILITY FUNCTIONS (Keep + enhance)
// ===============================

const tokenizeText = (text) => {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 3)
    .slice(0, 10);
};

const updateExtractionState = (updates) => {
  extractionState = { ...extractionState, ...updates };
  console.log(`📊 State updated:`, extractionState);
  broadcastStateUpdate();
};

const broadcastStateUpdate = () => {
  const stateMessage = {
    action: "stateUpdate",
    extractionState: extractionState,
    isExtracting: isExtracting
  };
  
  // Notify content scripts
  chrome.tabs.query({ url: "https://x.com/*" }, (tabs) => {
    tabs.forEach(tab => {
      notifyContentScript(tab.id, stateMessage).catch(() => {});
    });
  });
  
  // Notify popup
  notifyPopup(stateMessage);
};

// ===============================
// INITIALIZATION
// ===============================

const serviceWorker = new ExtensionServiceWorker();

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension startup - initializing service worker');
  serviceWorker.initialize();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Extension installed - initializing service worker');
  serviceWorker.initialize();
});

// Keep existing alarm and activity tracking
// (Additional existing background.js logic will be adapted in subsequent files)

// User activity tracking (keep from background.js)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('x.com')) {
    lastUserActivity = Date.now();
    console.log('👤 User activity detected on X.com');
    
    // Update schedule interval based on activity
    serviceWorker.updateScheduleInterval();
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.includes('x.com')) {
      lastUserActivity = Date.now();
      serviceWorker.updateScheduleInterval();
    }
  });
});

console.log('📡 Enhanced Service Worker loaded - ready for initialization'); 