/**
 * XSaved Extension v2 - Enhanced Service Worker
 * Combines proven smart scheduling with IndexedDB and Search Engine
 */

// Import our Components 1 & 2 (TypeScript source - Webpack will bundle)
import { db } from '../db/index';
import { searchEngine } from '../search/index';

// Import existing proven utilities (keep .js extension for webpack)
import { 
  fetchBookmarksV2, 
  processBookmarksResponse, 
  getCsrfToken,
  checkXLoginStatus 
} from './utils/fetcher.js';
import { notifyContentScript, updateProgress, notifyPopup } from './utils/communicator.js';
import { delay, NetworkError, RateLimitError } from './utils/helpers.js';

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
let lastBookmarkId: string | null = null;
let lastSyncTimestamp: number | null = null;
let isDeltaSync = false;
let newestBookmarkId: string | null = null;

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
  public initialized = false;
  public db: any = null;
  public searchEngine: any = null;

  constructor() {
    this.initialized = false;
    this.db = null;
    this.searchEngine = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing Enhanced Service Worker...');
      
      // Initialize IndexedDB (Component 1) - USING STATIC IMPORTS
      console.log('📀 Initializing IndexedDB...');
      try {
        await db.initialize();
        this.db = db;
        console.log('✅ IndexedDB initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize IndexedDB:', error);
        this.db = null;
      }
      
      // Initialize Search Engine (Component 2) - USING STATIC IMPORTS
      console.log('🔍 Initializing Search Engine...');
      try {
        this.searchEngine = searchEngine;
        console.log('✅ Search Engine initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Search Engine:', error);
        this.searchEngine = null;
      }
      
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
    return await checkXLoginStatus();
  }

  async backgroundFetch() {
    updateExtractionState({
      isBackground: true,
      message: 'Background sync starting...'
    });
    
    await extractAllBookmarks();
  }

  scheduleNextFetch() {
    // Clear any existing alarm
    chrome.alarms.clear('fetchBookmarks');
    
    // Schedule next alarm based on current interval
    const nextFetchInMinutes = currentScheduleInterval;
    chrome.alarms.create('fetchBookmarks', { delayInMinutes: nextFetchInMinutes });
    
    console.log(`⏰ Next automatic fetch scheduled in ${nextFetchInMinutes} minutes`);
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
    
    // Save to IndexedDB (Component 1) - TEMPORARILY USE CHROME.STORAGE FOR TESTING
    if (serviceWorker.db) {
      console.log('💾 Using IndexedDB for bookmark storage');
      const result = await serviceWorker.db.addBookmark(bookmarkEntity);
      
      if (result.success) {
        console.log(`✅ Saved bookmark ${bookmark.id} to IndexedDB`);
        extractionState.bookmarkCount++;
        broadcastStateUpdate();
        return { success: true, data: result.data };
      } else {
        console.error('❌ Failed to save bookmark to IndexedDB:', result.error);
        return { 
          success: false, 
          error: result.error || 'IndexedDB save failed',
          details: `Database addBookmark operation failed for bookmark ${bookmark.id}`
        };
      }
    } else {
      // Fallback to chrome.storage.local for testing
      console.log('💾 Using chrome.storage.local for bookmark storage (testing mode)');
      try {
        const key = `bookmark_${bookmark.id}`;
        await chrome.storage.local.set({ [key]: bookmarkEntity });
        console.log(`✅ Saved bookmark ${bookmark.id} to local storage`);
        extractionState.bookmarkCount++;
        broadcastStateUpdate();
        return { success: true, data: bookmarkEntity };
      } catch (storageError) {
        console.error('❌ Failed to save bookmark to chrome.storage:', storageError);
        return { 
          success: false, 
          error: storageError.message || 'Chrome storage save failed',
          details: `Chrome storage operation failed for bookmark ${bookmark.id}: ${storageError.message}`
        };
      }
    }
    
  } catch (error) {
    console.error('❌ Error saving bookmark to local storage:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown save error',
      details: `Unexpected error in saveBookmarkToLocal for bookmark ${bookmark?.id}: ${error.message || error}`
    };
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
    // Get CSRF token (keep existing logic)
    console.log('🔑 Getting CSRF token...');
    const csrfToken = await getCsrfToken();
    
    let hasMore = true;
    let consecutiveEmptyBatches = 0;
    
    while (hasMore && consecutiveEmptyBatches < 3) {
      try {
        console.log(`📥 Fetching batch ${Math.floor(allExtractedBookmarks.length / 100) + 1}...`);
        
        // Use existing fetcher logic
        const { bookmarks, nextCursor } = await fetchBookmarksV2(cursor, csrfToken, isDeltaSync);
        
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
      
    case "getState":
      handleGetState(sendResponse);
      return true;
  }
});

const handleStartExtraction = async (sendResponse, options = {}) => {
  try {
    await serviceWorker.initialize();
    
    const isLoggedIn = await serviceWorker.checkXLoginStatus();
    if (isLoggedIn) {
      // Update extraction options
      extractionState.isBackground = (options as any).isBackground || false;
      
      await extractAllBookmarks();
      sendResponse({ success: true, status: "started" });
    } else {
      sendResponse({ success: false, error: "X.com login required" });
    }
  } catch (error) {
    console.error('Error starting extraction:', error);
    sendResponse({ success: false, error: error.message });
  }
};

const handleSearchBookmarks = async (query, sendResponse) => {
  try {
    await serviceWorker.initialize();
    
    if (serviceWorker.searchEngine) {
      const result = await serviceWorker.searchEngine.search(query);
      sendResponse({ success: true, result });
    } else {
      // Fallback to chrome.storage.local search for testing
      console.log('🔍 Using fallback search (testing mode)');
      const result = await chrome.storage.local.get(null);
      const bookmarks = Object.keys(result)
        .filter(key => key.startsWith('bookmark_'))
        .map(key => result[key])
        .filter(bookmark => {
          if (query.text) {
            return bookmark.text.toLowerCase().includes(query.text.toLowerCase());
          }
          if (query.tags && query.tags.length > 0) {
            return query.tags.some(tag => bookmark.tags.includes(tag));
          }
          return true;
        })
        .slice(0, query.limit || 50);
      
      sendResponse({ success: true, result: { results: bookmarks, totalFound: bookmarks.length } });
    }
  } catch (error) {
    console.error('Search error:', error);
    sendResponse({ success: false, error: error.message });
  }
};

const handleSaveBookmark = async (bookmark, sendResponse) => {
  try {
    console.log('📝 Attempting to save bookmark:', { id: bookmark.id, text: bookmark.text?.substring(0, 50) });
    const result = await saveBookmarkToLocal(bookmark, bookmark.tags);
    
    if (result.success) {
      console.log('✅ Bookmark saved successfully:', result.data?.id);
      sendResponse({ success: true, bookmark: result.data });
    } else {
      console.error('❌ Bookmark save failed:', result.error);
      sendResponse({ 
        success: false, 
        error: result.error || 'Unknown database error',
        details: result.details || 'Database operation failed without details'
      });
    }
  } catch (error) {
    console.error('❌ Save bookmark error:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Unknown error',
      details: error.stack || 'No error stack available'
    });
  }
};

const handleGetState = async (sendResponse) => {
  try {
    await serviceWorker.initialize();
    
    sendResponse({
      success: true,
      state: {
        isRunning: isExtracting,
        nextRun: lastSyncTimestamp ? new Date(lastSyncTimestamp + (currentScheduleInterval * 60 * 1000)).toISOString() : null,
        error: null,
        phase: extractionState.phase,
        bookmarkCount: extractionState.bookmarkCount,
        percentage: extractionState.percentage
      }
    });
  } catch (error) {
    console.error('Error getting state:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
};

const handleGetStats = async (sendResponse) => {
  try {
    await serviceWorker.initialize();
    
    if (serviceWorker.db && serviceWorker.searchEngine) {
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
    } else {
      // Fallback to chrome.storage.local stats for testing
      console.log('📊 Using fallback stats (testing mode)');
      const result = await chrome.storage.local.get(null);
      const bookmarkCount = Object.keys(result).filter(key => key.startsWith('bookmark_')).length;
      
      sendResponse({
        success: true,
        stats: {
          totalBookmarks: bookmarkCount,
          totalTags: 0,
          storageUsed: 0,
          searchCache: { size: 0, hits: 0, misses: 0 },
          lastSync: lastSyncTimestamp,
          syncMode: isDeltaSync ? 'delta' : 'full'
        }
      });
    }
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

// Export for testing in Service Worker environment
if (typeof self !== 'undefined') {
  (self as any).testXSaved = {
    extractionState,
    serviceWorker,
    verifyDatabase: async () => {
      if (serviceWorker.db) {
        await serviceWorker.db.verifyDatabase();
      } else {
        console.error('❌ Database not initialized');
      }
    },
    getStats: async () => {
      if (serviceWorker.db) {
        const stats = await serviceWorker.db.getStats();
        console.log('📊 Database stats:', stats);
        return stats;
      } else {
        console.error('❌ Database not initialized');
      }
    },
    
    // === COMPREHENSIVE IndexedDB DEBUGGING ===
    
    inspectDB: async () => {
      console.log('🔍 === IndexedDB Inspection ===');
      if (!serviceWorker.db) {
        console.error('❌ Database not initialized');
        return;
      }
      
      try {
        // Database info
        console.log('📊 Database Info:', {
          name: serviceWorker.db.db?.name,
          version: serviceWorker.db.db?.version,
          initialized: serviceWorker.db.isInitialized,
          objectStores: serviceWorker.db.db ? Array.from(serviceWorker.db.db.objectStoreNames) : 'N/A'
        });
        
        // Test connection
        const testResult = await serviceWorker.db.getStats();
        console.log('✅ Database connection: OK');
        console.log('📈 Current stats:', testResult);
        
      } catch (error) {
        console.error('❌ Database inspection failed:', error);
      }
    },
    
    listBookmarks: async (limit = 10) => {
      console.log(`🔍 === Last ${limit} Bookmarks ===`);
      if (!serviceWorker.db) {
        console.error('❌ Database not initialized');
        return;
      }
      
      try {
        const result = await serviceWorker.db.getAllBookmarks({ limit, sortBy: 'created_at', sortOrder: 'desc' });
        if (result.success) {
          console.table(result.data?.map(b => ({
            id: b.id,
            text: b.text.substring(0, 50) + '...',
            author: b.author,
            created_at: b.created_at,
            tags: b.tags?.join(', ') || 'none'
          })));
          return result.data;
        } else {
          console.error('❌ Failed to list bookmarks:', result.error);
        }
      } catch (error) {
        console.error('❌ List bookmarks error:', error);
      }
    },
    
    testBookmarkCRUD: async () => {
      console.log('🧪 === Testing Bookmark CRUD Operations ===');
      if (!serviceWorker.db) {
        console.error('❌ Database not initialized');
        return;
      }
      
      const testBookmark = {
        id: 'test_crud_' + Date.now(),
        text: 'Test bookmark for CRUD operations',
        author: 'test_user',
        created_at: new Date().toISOString(),
        bookmark_timestamp: new Date().toISOString(),
        tags: ['test', 'crud'],
        media_urls: [],
        textTokens: ['test', 'bookmark', 'crud', 'operations']
      };
      
      try {
        // CREATE
        console.log('📝 Testing CREATE...');
        const addResult = await serviceWorker.db.addBookmark(testBookmark);
        if (!addResult.success) {
          console.error('❌ CREATE failed:', addResult.error);
          return false;
        }
        console.log('✅ CREATE: Success');
        
        // READ
        console.log('📖 Testing READ...');
        const getResult = await serviceWorker.db.getBookmark(testBookmark.id);
        if (!getResult.success || !getResult.data) {
          console.error('❌ READ failed:', getResult.error);
          return false;
        }
        console.log('✅ READ: Success');
        
        // UPDATE
        console.log('✏️ Testing UPDATE...');
        const updatedBookmark = { ...testBookmark, text: 'Updated test bookmark' };
        const updateResult = await serviceWorker.db.updateBookmark(testBookmark.id, updatedBookmark);
        if (!updateResult.success) {
          console.error('❌ UPDATE failed:', updateResult.error);
          return false;
        }
        console.log('✅ UPDATE: Success');
        
        // DELETE
        console.log('🗑️ Testing DELETE...');
        const deleteResult = await serviceWorker.db.deleteBookmark(testBookmark.id);
        if (!deleteResult.success) {
          console.error('❌ DELETE failed:', deleteResult.error);
          return false;
        }
        console.log('✅ DELETE: Success');
        
        console.log('🎉 All CRUD operations passed!');
        return true;
        
      } catch (error) {
        console.error('❌ CRUD test failed with exception:', error);
        return false;
      }
    },
    
    checkIndexes: async () => {
      console.log('🔍 === Checking IndexedDB Indexes ===');
      if (!serviceWorker.db?.db) {
        console.error('❌ Database not available');
        return;
      }
      
      try {
        const db = serviceWorker.db.db;
        const storeNames = Array.from(db.objectStoreNames);
        
        for (const storeName of storeNames) {
          console.log(`📦 Store: ${storeName}`);
          
          // Create a read transaction to inspect the store
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          
          console.log(`  📋 Key path: ${store.keyPath}`);
          console.log(`  🔢 Auto increment: ${store.autoIncrement}`);
          
          const indexNames = Array.from(store.indexNames);
          console.log(`  📚 Indexes (${indexNames.length}):`);
          
          for (const indexName of indexNames) {
            const index = store.index(indexName);
            console.log(`    - ${indexName}: keyPath=${index.keyPath}, unique=${index.unique}, multiEntry=${index.multiEntry}`);
          }
        }
        
      } catch (error) {
        console.error('❌ Index check failed:', error);
      }
    },
    
    clearDB: async () => {
      console.log('🗑️ === CLEARING ALL DATA ===');
      if (!serviceWorker.db) {
        console.error('❌ Database not initialized');
        return;
      }
      
      const confirmed = confirm('⚠️ This will delete ALL bookmarks. Are you sure?');
      if (!confirmed) {
        console.log('❌ Operation cancelled');
        return;
      }
      
      try {
        const result = await serviceWorker.db.clearAllBookmarks();
        if (result.success) {
          console.log('✅ Database cleared successfully');
        } else {
          console.error('❌ Failed to clear database:', result.error);
        }
      } catch (error) {
        console.error('❌ Clear database error:', error);
      }
    },
    
    forceReinit: async () => {
      console.log('🔄 === FORCING DATABASE REINITIALIZATION ===');
      try {
        serviceWorker.initialized = false;
        serviceWorker.db = null;
        await serviceWorker.initialize();
        console.log('✅ Database reinitialized successfully');
      } catch (error) {
        console.error('❌ Reinitialization failed:', error);
      }
    }
  };
  
  console.log('🔧 === XSaved v2 Debug Console ===');
  console.log('Available commands:');
  console.log('  • self.testXSaved.inspectDB() - Database overview');
  console.log('  • self.testXSaved.listBookmarks(10) - Show recent bookmarks');
  console.log('  • self.testXSaved.testBookmarkCRUD() - Test all operations');
  console.log('  • self.testXSaved.checkIndexes() - Inspect database schema');
  console.log('  • self.testXSaved.getStats() - Get performance stats');
  console.log('  • self.testXSaved.clearDB() - Clear all data (WARNING!)');
  console.log('  • self.testXSaved.forceReinit() - Reinitialize database');
  console.log('  • self.testXSaved.verifyDatabase() - Basic verification');
} 