/**
 * XSaved Extension v2 - Enhanced Service Worker
 * Combines proven smart scheduling with IndexedDB and Search Engine
 */

// Import our Components 1 & 2 (TypeScript source - Webpack will bundle)
import { db } from '../db/index';
import { searchEngine } from '../search/index';
import { Limits } from '../config/limits';

// Import existing proven utilities (keep .js extension for webpack)
import { 
  fetchBookmarksV2, 
  processBookmarksResponse, 
  getCsrfToken,
  checkXLoginStatus,
  deleteBookmarkV2,
  deleteBulkBookmarksV2
} from './utils/fetcher.js';
import { getSortIndexDateISO, getSortIndexDate, normalizeDateToISO } from '../utils/sortIndex-utils';
import { notifyContentScript, updateProgress, notifyPopup } from './utils/communicator.js';
import { delay, NetworkError, RateLimitError } from './utils/helpers.js';

// ===============================
// PROVEN SCHEDULING CONSTANTS (Keep from background.js)
// ===============================

const SCHEDULE_INTERVALS = {
  ACTIVE: 15,     // 15 minutes - when user is on X.com
  OFFLINE: 240    // 4 hours - when user is offline/away from X.com
};

// Different intervals for different purposes
const QUICK_SYNC_MIN_INTERVAL = 10 * 1000; // 10 seconds minimum between quick syncs (grid toggle spam prevention)
const AUTOMATIC_SCHEDULED_FETCH_INTERVAL_IN_MINUTES = SCHEDULE_INTERVALS.ACTIVE; // 15 minutes
const AUTOMATIC_MIN_FETCH_INTERVAL = SCHEDULE_INTERVALS.ACTIVE * 60 * 1000; // 15 minutes for automatic scheduled fetches
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds
const INITIAL_REQUESTS_LEFT = 20;
const USER_ACTIVITY_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours
const EXPONENTIAL_BACKOFF_BASE = 2;
const MAX_BACKOFF_MINUTES = 240; // 4 hours max backoff

// ===============================
// STATE MANAGEMENT (Keep from background.js)
// ===============================

let currentScheduleInterval = SCHEDULE_INTERVALS.ACTIVE;
let consecutiveFailures = 0;
let lastUserActivity = Date.now();
let authSession = null;
let isExtracting = false;
let requestsLeft = INITIAL_REQUESTS_LEFT;
let bookmarksTabId = null;
let estimatedTotalBookmarks = 0;

// Tab session tracking to prevent re-sync on navigation
let activeTabs = new Set(); // Track tabs that have already triggered sync this session

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

// Multi-user database state tracking
let currentTwitterUsername: string | null = null;
let currentTwitterUserId: string | null = null;
let currentDatabaseName: string | null = null;
let activeXcomTabId: number | null = null; // Track currently active X.com tab

// ===============================
// USER DETECTION & DATABASE SWITCHING
// ===============================

/**
 * Detect currently logged-in Twitter user using multiple methods
 * Priority: Cookies > DOM parsing > Cached value
 * Returns: { username, userId } or null if detection fails
 * 
 * CRITICAL: No fallback to 'default' - if no user detected, return null
 */
async function detectCurrentTwitterUser(): Promise<{ username: string; userId: string | null } | null> {
  try {
    console.log('🔍 Detecting current Twitter user...');
    
    // ================================================
    // METHOD 1: Cookie-based detection (most reliable)
    // ================================================
    const userFromCookies = await getUserFromCookies();
    if (userFromCookies) {
      console.log('✅ User detected from cookies:', userFromCookies);
      return userFromCookies;
    }
    
    // ================================================
    // METHOD 2: DOM parsing via content script
    // ================================================
    const userFromDom = await getUserFromDom();
    if (userFromDom) {
      console.log('✅ User detected from DOM:', userFromDom);
      return userFromDom;
    }
    
    // ================================================
    // METHOD 3: Use cached value from previous detection
    // ================================================
    const cached = await chrome.storage.local.get([
      'cached_twitter_username',
      'cached_twitter_user_id'
    ]);
    
    if (cached.cached_twitter_username && cached.cached_twitter_username !== 'default') {
      console.log('⚠️ Using cached username:', cached.cached_twitter_username);
      return {
        username: cached.cached_twitter_username,
        userId: cached.cached_twitter_user_id || null
      };
    }
    
    console.warn('⚠️ No valid user detected - user must be logged in to Twitter');
    return null; // NO FALLBACK TO DEFAULT
    
  } catch (error) {
    console.error('❌ User detection failed:', error);
    return null; // NO FALLBACK TO DEFAULT
  }
}

/**
 * METHOD 1: Extract user from X.com cookies
 * Twitter stores user ID in 'twid' cookie format: u=1234567890
 */
async function getUserFromCookies(): Promise<{ username: string; userId: string } | null> {
  try {
    const cookies = await chrome.cookies.getAll({ domain: '.x.com' });
    // Check if user is logged in (auth_token must exist)
    const authToken = cookies.find(c => c.name === 'auth_token');
    if (!authToken) {
      console.log('🚫 No auth_token cookie - user is logged out');
      return null;
    }
    
    // Extract user ID from 'twid' cookie
    const twidCookie = cookies.find(c => c.name === 'twid');
    if (twidCookie) {
      // twidCookie.value is URL-encoded, e.g. "u%3D1212476452702056449"
      const decodedTwid = decodeURIComponent(twidCookie.value); // "u=1212476452702056449"
      const userIdMatch = decodedTwid.match(/u=(\d+)/);
      const userId = userIdMatch?.[1];
      
      if (userId) {
        console.log('🔍 Found Twitter user ID in cookies:', userId);
        
        // Try to get username from stored mapping
        const mapping = await chrome.storage.local.get(['userId_to_username']);
        const username = mapping.userId_to_username?.[userId];
        
        if (username) {
          console.log('🔍 Mapped user ID to username:', userId, '→', username);
          return { username, userId };
        }
        
        // If no mapping yet, try to get it from DOM
        const userFromDom = await getUserFromDom();
        if (userFromDom?.username) {
          // Store the mapping for future use
          await storeUserIdMapping(userId, userFromDom.username);
          return { username: userFromDom.username, userId };
        }
        
        // Fallback: use user ID as identifier
        console.warn('⚠️ No username mapping found, using user ID');
        return { username: `user_${userId}`, userId };
      }
    }
      console.log('🚫🆔 No twid cookie - user is logged out');
    return null;
  } catch (error) {
    console.error('❌ Cookie detection failed:', error);
    return null;
  }
}

/**
 * METHOD 2: Extract username from DOM via content script
 */
async function getUserFromDom(): Promise<{ username: string; userId: string | null } | null> {
  try {
    // Get all X.com tabs
    const tabs = await chrome.tabs.query({ url: '*://*.x.com/*' });
    
    if (tabs.length === 0) {
      console.log('⚠️ No X.com tabs open');
      return null;
    }
    
    // Try active tab first, then others
    const activeTab = tabs.find(t => t.active) || tabs[0];
    
    if (!activeTab?.id) {
      return null;
    }
    
    // Ask content script for logged-in user
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'GET_CURRENT_TWITTER_USER'
      });
      
      if (response?.username) {
        console.log('🔍 Found username from DOM:', response.username);
        
        // Cache the result
        await chrome.storage.local.set({
          cached_twitter_username: response.username,
          cached_twitter_user_id: response.userId || null
        });
        
        return {
          username: response.username,
          userId: response.userId || null
        };
      }
    } catch (e) {
      console.warn('⚠️ Content script not ready or tab not responsive');
    }
    
    return null;
  } catch (error) {
    console.error('❌ DOM detection failed:', error);
    return null;
  }
}

/**
 * Store user ID to username mapping for cookie-based detection
 */
async function storeUserIdMapping(userId: string, username: string): Promise<void> {
  try {
    const mappings = await chrome.storage.local.get(['userId_to_username']);
    await chrome.storage.local.set({
      userId_to_username: {
        ...(mappings.userId_to_username || {}),
        [userId]: username
      }
    });
    console.log('📝 Stored user mapping:', userId, '→', username);
  } catch (error) {
    console.error('❌ Failed to store user mapping:', error);
  }
}

/**
 * Switch to database for specific Twitter user
 * Implements "active tab wins" strategy
 * Closes old DB, opens/creates new DB, updates all references
 * 
 * CRITICAL: Only works with valid usernames (not 'default')
 */
async function switchToUserDatabase(username: string, userId: string | null = null): Promise<void> {
  // SECURITY: Block 'default' database usage
  if (username === 'default') {
    console.error('❌ SECURITY: Cannot use default database - user must be logged in');
    throw new Error('No valid user detected - please log in to Twitter');
  }
  
  const newDbName = `XSavedDB_twitter_${username}`;
  
  // Skip if already using this database
  if (currentDatabaseName === newDbName && serviceWorker.db) {
    console.log('✅ Already using database for @' + username);
    return;
  }
  
  console.log('🔄 Switching database:', currentDatabaseName || 'none', '→', newDbName);
  console.log('👤 User:', currentTwitterUsername || 'none', '→', username);
  
  try {
    // Step 1: Close existing database connection
    if (serviceWorker.db) {
      console.log('🔌 Closing old database connection...');
      await serviceWorker.db.close();
    }
    
    // Step 2: Create new database instance for this user
    console.log('📂 Opening database:', newDbName);
    const { createUserDatabase } = await import('../db/index');
    const newDb = createUserDatabase(newDbName);
    await newDb.initialize();
    
    // Step 3: Update all references
    serviceWorker.db = newDb;
    
    // Update search engine and executor references if they exist
    if (serviceWorker.searchEngine) {
      serviceWorker.searchEngine.db = newDb;
      console.log('🔍 Updated search engine database reference');
      
      // CRITICAL: Also update the SearchExecutor's db reference
      if (serviceWorker.searchEngine.searchExecutor) {
        serviceWorker.searchEngine.searchExecutor.db = newDb;
        console.log('🔍 Updated search executor database reference');
      }
    }
    
    // Step 4: Update global state
    currentTwitterUsername = username;
    currentTwitterUserId = userId;
    currentDatabaseName = newDbName;
    
    // Step 5: Store current user for next startup
    await chrome.storage.local.set({
      current_twitter_username: username,
      current_twitter_user_id: userId,
      current_database_name: newDbName,
      last_db_switch: Date.now()
    });
    
    console.log('✅ Successfully switched to database for @' + username);
    
    // Step 6: Notify UI components of the switch
    chrome.runtime.sendMessage({
      action: 'DATABASE_SWITCHED',
      username: username,
      userId: userId,
      dbName: newDbName
    }).catch(() => {
      // No listeners yet, that's fine
    });
    
    // Step 7: Notify content scripts
    const tabs = await chrome.tabs.query({ url: '*://*.x.com/*' });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'DATABASE_SWITCHED',
          username: username,
          dbName: newDbName
        }).catch(() => {
          // Content script not ready yet
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to switch database:', error);
    throw error;
  }
}

/**
 * Check if Twitter account has changed and switch DB if needed
 * Called when tabs switch or pages load
 * 
 * CRITICAL: If no user detected, blocks all operations
 */
async function checkAndSwitchIfNeeded(tabId?: number): Promise<void> {
  try {
    // Detect current user
    const detectedUser = await detectCurrentTwitterUser();
    
    if (!detectedUser) {
      console.warn('⚠️ No valid user detected - blocking all operations');
      
      // Clear current database to prevent operations
      if (serviceWorker.db) {
        await serviceWorker.db.close();
        serviceWorker.db = null;
        currentTwitterUsername = null;
        currentTwitterUserId = null;
        currentDatabaseName = null;
      }
      
      // Notify UI that user needs to log in
      chrome.runtime.sendMessage({
        action: 'USER_NOT_LOGGED_IN',
        message: 'Please log in to Twitter to use XSaved'
      }).catch(() => {
        // No listeners yet, that's fine
      });
      
      return;
    }
    
    // Check if user has changed
    if (detectedUser.username !== currentTwitterUsername) {
      console.log('🔄 Twitter account change detected!');
      console.log('   Previous:', currentTwitterUsername || 'none');
      console.log('   New:', detectedUser.username);
      
      await switchToUserDatabase(detectedUser.username, detectedUser.userId);
    } else {
      console.log('✅ Same user detected, no database switch needed');
    }
    
    // Update active tab tracker
    if (tabId) {
      activeXcomTabId = tabId;
    }
    
  } catch (error) {
    console.error('❌ Failed to check/switch user:', error);
    
    // On error, clear database to prevent operations
    if (serviceWorker.db) {
      await serviceWorker.db.close();
      serviceWorker.db = null;
      currentTwitterUsername = null;
      currentTwitterUserId = null;
      currentDatabaseName = null;
    }
  }
}

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
      
      // ===============================================
      // STEP 1: Detect current Twitter user FIRST
      // ===============================================
      console.log('👤 Detecting current Twitter user...');
      const detectedUser = await detectCurrentTwitterUser();
      
      if (!detectedUser) {
        console.warn('⚠️ No valid user detected - extension will not function');
        console.warn('   User must be logged in to Twitter to use XSaved');
        this.db = null;
        this.initialized = true; // Mark as initialized but with no database
        return; // Exit early - no database operations possible
      }
      
      console.log('✅ Twitter user detected:', detectedUser.username);
      if (detectedUser.userId) {
        console.log('   User ID:', detectedUser.userId);
      }
      
      // ===============================================
      // STEP 2: Initialize user-specific database
      // ===============================================
      console.log('📀 Initializing user-specific IndexedDB...');
      try {
        // Switch to user-specific database (will throw if username is 'default')
        await switchToUserDatabase(detectedUser.username, detectedUser.userId);
        
        console.log('✅ IndexedDB initialized for user:', detectedUser.username);
      } catch (error) {
        console.error('❌ Failed to initialize IndexedDB:', error);
        this.db = null;
        this.initialized = true; // Mark as initialized but with no database
        return; // Exit early - no database operations possible
      }
      
      // ===============================================
      // STEP 3: Initialize Search Engine
      // ===============================================
      console.log('🔍 Initializing Search Engine...');
      try {
        this.searchEngine = searchEngine;
        // Update search engine database reference
        if (this.searchEngine && this.db) {
          this.searchEngine.db = this.db;
          
          // CRITICAL: Also update the SearchExecutor's db reference
          if (this.searchEngine.searchExecutor) {
            this.searchEngine.searchExecutor.db = this.db;
            console.log('🔍 Updated search executor database reference in init');
          }
        }
        console.log('✅ Search Engine initialized successfully:', !!this.searchEngine);
      } catch (error) {
        console.error('❌ Failed to initialize Search Engine:', error);
        this.searchEngine = null;
      }
      
      // ===============================================
      // STEP 4: Load existing sync state
      // ===============================================
      await this.loadSyncState();
      
      // ===============================================
      // STEP 5: Set up smart scheduling
      // ===============================================
      this.setupSmartScheduling();
      
      console.log('✅ Enhanced Service Worker initialized successfully');
      console.log('   Active database:', currentDatabaseName);
      console.log('   Active user:', currentTwitterUsername);
      this.initialized = true;
      
      // Dev tag functions are initialized with testXSaved object below
      
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
        
        resolve(undefined);
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

  // NEW: Quick delta sync for page loads and grid toggles
  async quickDeltaSync() {
    const now = Date.now();
    
    // Prevent too frequent quick syncs (10 seconds minimum)
    if (lastSyncTimestamp && (now - lastSyncTimestamp) < QUICK_SYNC_MIN_INTERVAL) {
      console.log('⏸️ Quick sync skipped - too soon since last sync (10s minimum)');
      return { skipped: true, reason: 'too_soon', message: 'Too soon since last sync' };
    }
    
    // Check if already extracting
    if (isExtracting) {
      console.log('⏸️ Quick sync skipped - extraction already in progress');
      return { skipped: true, reason: 'already_extracting', message: 'Sync already in progress' };
    }
    
    // Check if user is logged in
    const isLoggedIn = await this.checkXLoginStatus();
    if (!isLoggedIn) {
      console.log('⏸️ Quick sync skipped - user not logged in to X.com');
      return { skipped: true, reason: 'not_logged_in', message: 'User not logged in to X.com' };
    }
    
    console.log('🚀 Quick delta sync triggered');
    isDeltaSync = true;
    updateExtractionState({
      isBackground: true,
      message: 'Quick sync: Checking for new bookmarks...'
    });
    
    await extractAllBookmarks();
    return { skipped: false, message: 'Quick sync completed' };
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
    
    // Simplified: 15min if recent X.com activity, 4h if offline
    if (timeSinceActivity < USER_ACTIVITY_THRESHOLD) {
      currentScheduleInterval = SCHEDULE_INTERVALS.ACTIVE;
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
    
    // Determine final tags with detailed logging
    let finalTags;
    if (userTags && Array.isArray(userTags) && userTags.length > 0) {
      finalTags = userTags;
    } else if (bookmark.tags && Array.isArray(bookmark.tags) && bookmark.tags.length > 0) {
      finalTags = bookmark.tags;
    } else {
      finalTags = [];
    }
    
    // Create BookmarkEntity for Component 1
    const bookmarkEntity = {
      id: bookmark.id,
      text: bookmark.text || '',
      author: bookmark.author || '',
      avatar_url: bookmark.avatar_url || null,
      created_at: bookmark.created_at ? normalizeDateToISO(bookmark.created_at) : null, // CRITICAL: Normalize date format for consistent sorting
      bookmarked_at: bookmark.sortIndex ? getSortIndexDateISO(bookmark.sortIndex) : null,
      tags: finalTags,
      media_urls: bookmark.media_urls || [],
      // Add search tokenization for Component 2
      textTokens: tokenizeText(bookmark.text || '')
    };
    
    

    
    if (serviceWorker.db) {
      console.log('💾 Using IndexedDB for bookmark storage');
      const result = await serviceWorker.db.upsertBookmark(bookmarkEntity);
      
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
          details: `Database upsertBookmark operation failed for bookmark ${bookmark.id}`
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
  
  // ============================================
  // CRITICAL: Verify we have a valid user before extraction
  // ============================================
  console.log('🔍 Verifying user authentication before extraction...');
  await checkAndSwitchIfNeeded();
  
  // SECURITY CHECK: Block extraction if no valid user
  if (!currentTwitterUsername || !serviceWorker.db) {
    console.error('❌ SECURITY: Cannot extract bookmarks - no valid user detected');
    console.error('   User must be logged in to Twitter');
    
    // Notify UI that user needs to log in
    chrome.runtime.sendMessage({
      action: 'EXTRACTION_BLOCKED',
      message: 'Please log in to Twitter to sync bookmarks'
    }).catch(() => {
      // No listeners yet, that's fine
    });
    
    return; // Block extraction
  }
  
  console.log('✅ User verification complete');
  console.log('   Active database:', currentDatabaseName);
  console.log('   Active user:', currentTwitterUsername);
  
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
          
          // Check if this bookmark already exists with manual tags
          const existingBookmark = await serviceWorker.db?.getBookmark(bookmark.id);
          if (existingBookmark?.success && existingBookmark.data?.tags?.length > 0) {
            // Preserve existing tags instead of overwriting with Twitter data
            bookmark.tags = existingBookmark.data.tags;
          }
          
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
    
    // Auto-clear badge on successful completion
    chrome.action.setBadgeText({ text: '' });
    
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
      
    case "quickDeltaSync":
      handleQuickDeltaSync(sendResponse);
      return true;
      
    case "searchBookmarks":
      handleSearchBookmarks(request.query, sendResponse);
      return true;
      
    case "searchAuthors":
      handleSearchAuthors(request.query, request.limit, sendResponse);
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
      
    case "exportBookmarks":
      handleExportBookmarks(request.bookmarks, request.options, sendResponse);
      return true;
      
    case "clearCache":
      handleClearCache(sendResponse);
      return true;
      
    case "clearBadge":
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
      break;
      
    case "retryFirstTimeSetup":
      handleFirstTimeSetup();
      sendResponse({ success: true });
      break;
      
    case "deleteBookmark":
      handleDeleteBookmark(request.tweetId, sendResponse);
      return true;
      
    case "deleteBulkBookmarks":
      handleDeleteBulkBookmarks(request.tweetIds, request.options, sendResponse);
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

const handleQuickDeltaSync = async (sendResponse) => {
  try {
    await serviceWorker.initialize();
    const result = await serviceWorker.quickDeltaSync();
    
    if (result && result.skipped) {
      sendResponse({ 
        success: true, 
        skipped: true, 
        reason: result.reason,
        message: result.message 
      });
    } else {
      sendResponse({ success: true, status: "quick_sync_completed" });
    }
  } catch (error) {
    console.error('Error in quick delta sync:', error);
    sendResponse({ success: false, error: error.message });
  }
};

const handleSearchBookmarks = async (query, sendResponse) => {
  try {
    console.log(`🔍 Service Worker search request:`, query);
    await serviceWorker.initialize();
    
    // SECURITY CHECK: Block search if no valid user
    if (!currentTwitterUsername || !serviceWorker.db) {
      console.error('❌ SECURITY: Cannot search bookmarks - no valid user detected');
      sendResponse({ 
        success: false, 
        error: 'Please log in to Twitter to search bookmarks',
        requiresLogin: true
      });
      return;
    }
    
    console.log(`🔍 Search engine available:`, !!serviceWorker.searchEngine);
    
    if (serviceWorker.searchEngine) {
      console.log(`🔍 Using search engine for query:`, query);
      const result = await serviceWorker.searchEngine.search(query);
      console.log(`🔍 Search result:`, result);
      sendResponse({ success: true, result });
    } else {
      // Fallback to chrome.storage.local search for testing
      console.log('🔍 Using fallback search (testing mode)');
      const result = await chrome.storage.local.get(null);
      const data = (result as unknown as Record<string, any>) ?? {};
      const bookmarks = Object.keys(data)
        .filter(key => key.startsWith('bookmark_'))
        .map(key => data[key])
        .filter(bookmark => {
          if (query.text) {
            return bookmark.text.toLowerCase().includes(query.text.toLowerCase());
          }
          if (query.tags && query.tags.length > 0) {
            return query.tags.some(tag => bookmark.tags.includes(tag));
          }
          return true;
        })
        .slice(0, query.limit || Limits.defaultQueryLimit);
      
      console.log(`🔍 Fallback search found ${bookmarks.length} bookmarks`);
      sendResponse({ success: true, result: { results: bookmarks, totalFound: bookmarks.length } });
    }
  } catch (error) {
    console.error('Search error:', error);
    sendResponse({ success: false, error: error.message });
  }
};

const handleSearchAuthors = async (query, limit, sendResponse) => {
  try {
    console.log(`👥 Service Worker author search request: "${query}", limit: ${limit}`);
    await serviceWorker.initialize();
    
    // SECURITY CHECK: Block search if no valid user
    if (!currentTwitterUsername || !serviceWorker.db) {
      console.error('❌ SECURITY: Cannot search authors - no valid user detected');
      sendResponse({ 
        success: false, 
        error: 'Please log in to Twitter to search authors',
        requiresLogin: true
      });
      return;
    }
    
    if (serviceWorker.searchEngine) {
      console.log(`👥 Using search engine for author search`);
      const authors = await serviceWorker.searchEngine.searchAuthors(query || '', limit || 10);
      console.log(`👥 Found ${authors.length} authors`);
      sendResponse({ success: true, authors });
    } else {
      console.log('👥 Search engine not available for author search');
      sendResponse({ success: false, error: 'Search engine not available' });
    }
  } catch (error) {
    console.error('👥 Author search error:', error);
    sendResponse({ success: false, error: error.message });
  }
};

const handleSaveBookmark = async (bookmark, sendResponse) => {
  try {
    
    const result = await saveBookmarkToLocal(bookmark, bookmark.tags);
    
    if (result.success) {
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
    
    // SECURITY CHECK: Block stats if no valid user
    if (!currentTwitterUsername || !serviceWorker.db) {
      console.error('❌ SECURITY: Cannot get stats - no valid user detected');
      sendResponse({ 
        success: false, 
        error: 'Please log in to Twitter to view stats',
        requiresLogin: true
      });
      return;
    }
    
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
      const data = (result as unknown as Record<string, any>) ?? {};
      const bookmarkCount = Object.keys(data).filter(key => key.startsWith('bookmark_')).length;
      
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

const handleExportBookmarks = async (bookmarks, options, sendResponse) => {
  try {
    console.log('📤 Handling export request:', { format: options.format, bookmarkCount: bookmarks.length });
    
    // Safely sanitize bookmarks to prevent circular references
    const sanitizedBookmarks = sanitizeBookmarks(bookmarks);
    console.log('📤 [SW] Bookmarks sanitized successfully');
    
    // Use inline export functionality to avoid any external dependencies
    console.log('📤 [SW] Using inline export functionality...');
    
    const exportManager = new InlineExportManager();
    console.log('📤 [SW] InlineExportManager instantiated successfully');
    
    // Perform export with sanitized bookmarks
    const result = await exportManager.exportBookmarks(sanitizedBookmarks, options);
    
          if (result.success) {
        // Convert blob to base64 for transmission using chunked approach
        const blob = result.data as Blob;
        const arrayBuffer = await blob.arrayBuffer();
        
        // Use chunked approach for large files to prevent stack overflow
        const base64 = arrayBufferToBase64(arrayBuffer);
        
        sendResponse({
          success: true,
          data: base64,
          filename: result.filename,
          size: result.size,
          metadata: result.metadata
        });
    } else {
      sendResponse({
        success: false,
        error: result.error || 'Export failed'
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Export failed'
    });
  }
};

const handleClearCache = async (sendResponse) => {
  try {
    await serviceWorker.initialize();
    
    if (serviceWorker.searchEngine) {
      serviceWorker.searchEngine.clearCache();
      console.log('🧹 Search cache cleared via service worker');
      sendResponse({ success: true, message: 'Cache cleared successfully' });
    } else {
      sendResponse({ success: false, error: 'Search engine not initialized' });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    sendResponse({ success: false, error: error.message });
  }
};

// ===============================
// FIRST-TIME SETUP SYSTEM
// ===============================

const handleFirstTimeSetup = async () => {
  console.log('🚀 Starting first-time setup process...');
  
  try {
    // Wait a bit for extension to fully initialize
    await delay(2000);
    
    // Check if user is logged into X.com
    const isLoggedIn = await serviceWorker.checkXLoginStatus();
    
    if (!isLoggedIn) {
      console.log('❌ User not logged into X.com - showing login popup');
      showFirstTimePopup('login_required', {
        title: 'Welcome to XSaved!',
        message: 'Please log into X.com (Twitter) to start syncing your bookmarks.',
        action: 'Login to X.com',
        actionUrl: 'https://x.com/login'
      });
      return;
    }
    
    // User is logged in - attempt first extraction
    console.log('✅ User logged in - attempting first bookmark extraction');
    showFirstTimePopup('extracting', {
      title: 'Setting up XSaved...',
      message: 'Extracting your bookmarks for the first time. This may take a few moments.',
      progress: true
    });
    
    // Perform first extraction
    await extractAllBookmarks();
    
    // Check if extraction was successful
    if (lastBookmarkId && lastSyncTimestamp) {
      console.log('✅ First extraction successful');
      showFirstTimePopup('success', {
        title: 'Setup Complete!',
        message: `Successfully imported your bookmarks. You can now access them anytime!`,
        action: 'Open Bookmarks',
        actionUrl: 'https://x.com/i/bookmarks'
      });
    } else {
      console.log('❌ First extraction failed');
      showFirstTimePopup('extraction_failed', {
        title: 'Setup Issues',
        message: 'We encountered an issue importing your bookmarks. Please try manually syncing from the extension popup.',
        action: 'Try Manual Sync'
      });
    }
    
  } catch (error) {
    console.error('❌ First-time setup failed:', error);
    
    if (error.message.includes('Rate limit')) {
      showFirstTimePopup('rate_limited', {
        title: 'Rate Limited',
        message: 'X.com is limiting our requests. Please wait a few minutes and try syncing manually.',
        action: 'Open Extension'
      });
    } else if (error.message.includes('Network')) {
      showFirstTimePopup('network_error', {
        title: 'Network Error',
        message: 'Unable to connect to X.com. Please check your internet connection and try again.',
        action: 'Retry Setup'
      });
    } else {
      showFirstTimePopup('unknown_error', {
        title: 'Setup Error',
        message: 'An unexpected error occurred. You can still use the extension by manually syncing your bookmarks.',
        action: 'Open Extension'
      });
    }
  }
};

const showFirstTimePopup = (type, options) => {
  // Create a notification or badge to alert user
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#1DA1F2' });
  
  // Store the setup state for popup to display
  chrome.storage.local.set({
    firstTimeSetup: {
      type,
      options,
      timestamp: Date.now()
    }
  });
  
  // Auto-open setup tab for user feedback
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/ui/setup.html'),
    active: true
  });
  
  console.log(`📢 First-time setup popup: ${type}`, options);
};

// ===============================
// UTILITY FUNCTIONS (Keep + enhance)
// ===============================

// Safe bookmarks sanitization to prevent circular references
const sanitizeBookmarks = (bookmarks) => {
  try {
    return bookmarks.map(bookmark => ({
      id: bookmark.id,
      text: bookmark.text,
      author: bookmark.author,
      created_at: bookmark.created_at,
      bookmarked_at: bookmark.bookmarked_at,
      tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
      url: bookmark.url,
      // Only include safe, serializable properties
      // Exclude any properties that might contain circular references
    }));
  } catch (error) {
    console.error('❌ [SW] Bookmark sanitization failed:', error);
    // Return empty array as fallback
    return [];
  }
};

// Safe array buffer to base64 conversion to prevent stack overflow
const arrayBufferToBase64 = (buffer) => {
  try {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192; // Process in 8KB chunks
    let binary = '';
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('❌ [SW] Array buffer to base64 conversion failed:', error);
    // Return empty string as fallback
    return '';
  }
};

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

/**
 * Handle single bookmark deletion
 */
const handleDeleteBookmark = async (tweetId: string, sendResponse: Function) => {
  try {
    await serviceWorker.initialize();
    
    console.log(`🗑️ Service Worker: Deleting bookmark ${tweetId}`);
    
    // Step 1: Delete from local database first (optimistic update)
    const dbResult = await serviceWorker.db.deleteBookmark(tweetId);
    
    if (!dbResult.success) {
      console.error(`❌ Failed to delete bookmark from database: ${dbResult.error}`);
      sendResponse({ 
        success: false, 
        error: `Database error: ${dbResult.error}` 
      });
      return;
    }
    
    // Step 2: Delete from X.com API
    try {
      const apiResult = await deleteBookmarkV2(tweetId);
      
      if (apiResult.success) {
        console.log(`✅ Successfully deleted bookmark ${tweetId} from both DB and X.com`);
        sendResponse({ 
          success: true, 
          deletedFromApi: !apiResult.alreadyDeleted,
          alreadyDeletedFromApi: apiResult.alreadyDeleted 
        });
      } else {
        console.warn(`⚠️ Failed to delete from X.com API, but removed from local DB: ${apiResult.error}`);
        sendResponse({ 
          success: true, 
          deletedFromApi: false,
          apiError: apiResult.error,
          message: 'Removed from local storage, but X.com deletion failed'
        });
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(`⚠️ Rate limit hit while deleting ${tweetId}, but removed from local DB`);
        sendResponse({ 
          success: true, 
          deletedFromApi: false,
          rateLimited: true,
          message: 'Removed from local storage, X.com deletion rate limited'
        });
      } else {
        console.error(`❌ API error deleting ${tweetId}:`, error);
        sendResponse({ 
          success: true, 
          deletedFromApi: false,
          apiError: error.message,
          message: 'Removed from local storage, but X.com deletion failed'
        });
      }
    }
    
  } catch (error) {
    console.error(`❌ Error in handleDeleteBookmark:`, error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Handle bulk bookmark deletion with progress tracking
 */
const handleDeleteBulkBookmarks = async (tweetIds: string[], options: any = {}, sendResponse: Function) => {
  try {
    await serviceWorker.initialize();
    
    console.log(`🗑️ Service Worker: Bulk deleting ${tweetIds.length} bookmarks`);
    
    const {
      batchSize = 5,
      delayBetweenBatches = 2000,
      deleteFromApi = true
    } = options;
    
    // Step 1: Delete from local database first (optimistic update)
    console.log(`📀 Deleting ${tweetIds.length} bookmarks from local database...`);
    const dbResult = await serviceWorker.db.deleteBookmarksWithTagCleanup(tweetIds);
    
    if (!dbResult.success) {
      console.error(`❌ Failed to delete bookmarks from database: ${dbResult.error}`);
      sendResponse({ 
        success: false, 
        error: `Database error: ${dbResult.error}` 
      });
      return;
    }
    
    console.log(`✅ Deleted ${dbResult.data.deleted} bookmarks from local database`);
    
    // Step 2: Delete from X.com API if requested
    let apiResults = null;
    if (deleteFromApi) {
      try {
        console.log(`🌐 Deleting ${tweetIds.length} bookmarks from X.com API...`);
        
        // Progress callback for API deletions
        const onProgress = (current: number, total: number, failed: number) => {
          // Notify content scripts and popup about progress
          const progressMessage = {
            action: "bulkDeleteProgress",
            current,
            total,
            failed,
            phase: "api"
          };
          
          // Broadcast progress update
          chrome.tabs.query({ url: "https://x.com/*" }, (tabs) => {
            tabs.forEach(tab => {
              notifyContentScript(tab.id, progressMessage).catch(() => {});
            });
          });
          
          notifyPopup(progressMessage);
        };
        
        apiResults = await deleteBulkBookmarksV2(tweetIds, {
          batchSize,
          delayBetweenBatches,
          onProgress
        });
        
        console.log(`✅ API bulk delete completed: ${apiResults.summary.successful} successful, ${apiResults.summary.failed} failed`);
        
      } catch (error) {
        console.error(`❌ API bulk delete error:`, error);
        apiResults = {
          success: false,
          error: error.message,
          summary: { successful: 0, failed: tweetIds.length, errors: [] }
        };
      }
    }
    
    // Prepare response
    const response = {
      success: true,
      database: {
        deleted: dbResult.data.deleted,
        failed: dbResult.data.failed,
        tagsUpdated: dbResult.data.tagsUpdated
      },
      api: apiResults ? {
        success: apiResults.success,
        summary: apiResults.summary,
        error: apiResults.error
      } : null,
      message: `Successfully processed ${dbResult.data.deleted} bookmarks`
    };
    
    sendResponse(response);
    
  } catch (error) {
    console.error(`❌ Error in handleDeleteBulkBookmarks:`, error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
};

// ===============================
// INITIALIZATION
// ===============================

const serviceWorker = new ExtensionServiceWorker();

// Set up context menu for easy debug access
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item for debug page
  chrome.contextMenus.create({
    id: 'openDebugPage',
    title: '🔧 Open Debug Page',
    contexts: ['action'] // Only show when right-clicking extension icon
  });
  
  console.log('🚀 Extension installed - initializing service worker');
  serviceWorker.initialize();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openDebugPage') {
    // Open debug page in new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/ui/debug.html')
    });
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Extension startup - initializing service worker');
  serviceWorker.initialize();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Extension installed - initializing service worker');
  serviceWorker.initialize().then(() => {
    // Check if this is a fresh install (no previous sync state)
    if (!lastBookmarkId && !lastSyncTimestamp) {
      console.log('🆕 Fresh extension install detected - starting first-time setup');
      handleFirstTimeSetup();
    }
  });
});


// User activity tracking + sync on first X.com tab open
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('x.com')) {
    lastUserActivity = Date.now();
    console.log('👤 User activity detected on X.com - page loaded');
    
    // ============================================
    // NEW: Check for account switch on page load
    // ============================================
    console.log('🔍 Checking for Twitter account switch...');
    await checkAndSwitchIfNeeded(tabId);
    
    // Update schedule interval based on activity
    serviceWorker.updateScheduleInterval();
    
    // Only trigger sync on first X.com tab open (not on navigation)
    if (!activeTabs.has(tabId)) {
      activeTabs.add(tabId);
      console.log('🚀 First X.com tab open - triggering sync');
      
      // Use normal extraction (let initialization logic determine delta vs full sync)
      serviceWorker.initialize().then(() => {
        serviceWorker.checkXLoginStatus().then(isLoggedIn => {
          if (isLoggedIn) {
            // Don't force isDeltaSync - let loadSyncState() determine the correct mode
            extractAllBookmarks().catch(error => {
              console.error('❌ Sync failed on first tab open:', error);
            });
          }
        });
      });
    } else {
      console.log('⏸️ X.com navigation detected - no sync needed');
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (tab.url && tab.url.includes('x.com')) {
      lastUserActivity = Date.now();
      
      // ============================================
      // NEW: "Active Tab Wins" - Switch DB when tab becomes active
      // ============================================
      console.log('🎯 X.com tab activated - checking for account switch...');
      await checkAndSwitchIfNeeded(activeInfo.tabId);
      
      serviceWorker.updateScheduleInterval();
    }
  });
});

// Clean up tab tracking when tabs are closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeTabs.has(tabId)) {
    activeTabs.delete(tabId);
    console.log(`🧹 Cleaned up tab tracking for tab ${tabId}`);
  }
});

console.log('📡 Enhanced Service Worker loaded - ready for initialization');

// Inline Export Manager - No external dependencies
class InlineExportManager {
  constructor() {
    // No dependencies, no DOM APIs
  }

  async exportBookmarks(bookmarks, options) {
    try {
      console.log(`📤 [SW] Starting inline export: ${options.format} format for ${bookmarks.length} bookmarks`);
      
      const metadata = {
        totalBookmarks: bookmarks.length,
        exportDate: new Date().toISOString(),
        filters: options.filters || {}
      };

      let result;

      switch (options.format) {
        case 'csv':
          result = await this.generateCSV(bookmarks, options);
          break;
        case 'json':
          result = await this.generateJSON(bookmarks, options);
          break;
        case 'pdf':
          result = await this.generatePDF(bookmarks, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      result.metadata = metadata;
      result.filename = options.filename || this.generateFilename(options.format, metadata);
      
      console.log(`✅ [SW] Inline export completed: ${result.filename} (${bookmarks.length} bookmarks)`);
      return result;

    } catch (error) {
      console.error('❌ [SW] Inline export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
        filename: options.filename || `export-${Date.now()}.${options.format}`
      };
    }
  }

  async generateCSV(bookmarks, options) {
    try {
      console.log(`📊 [SW] Generating CSV for ${bookmarks.length} bookmarks`);

      const headers = [
        'id', 'text', 'author', 'created_at', 'bookmarked_at',
        'tags', 'url'
      ];

      const rows = bookmarks.map(bookmark => [
        bookmark.id || '',
        this.escapeCsvField(bookmark.text || ''),
        bookmark.author || '',
        bookmark.created_at || '',
        bookmark.bookmarked_at || '',
        (bookmark.tags || []).join(', '),
        bookmark.url || ''
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.csv`,
        size: blob.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.csv`
      };
    }
  }

  async generateJSON(bookmarks, options) {
    try {
      console.log(`📄 [SW] Generating JSON for ${bookmarks.length} bookmarks`);

      const data = {
        metadata: {
          totalBookmarks: bookmarks.length,
          exportDate: new Date().toISOString(),
          format: 'json',
          filters: options.filters || {}
        },
        bookmarks: bookmarks.map(bookmark => ({
          id: bookmark.id,
          text: bookmark.text,
          author: bookmark.author,
          created_at: bookmark.created_at,
          bookmarked_at: bookmark.bookmarked_at,
          tags: bookmark.tags || [],
          url: bookmark.url
        }))
      };

      // Safely stringify with circular reference protection
      const jsonContent = this.safeJSONStringify(data);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.json`,
        size: blob.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.json`
      };
    }
  }

  async generatePDF(bookmarks, options) {
    try {
      console.log(`📄 [SW] Generating PDF for ${bookmarks.length} bookmarks`);

      // Limit bookmarks for PDF to prevent hanging
      const limitedBookmarks = bookmarks.slice(0, Limits.maxBookmarksForExport);
      
      if (bookmarks.length > Limits.maxBookmarksForExport) {
        console.warn(`⚠️ [SW] PDF export limited to ${Limits.maxBookmarksForExport} bookmarks (requested: ${bookmarks.length})`);
      }

      // Generate PDF content using a simple text-based format
      // This creates a PDF-like structure that can be opened by PDF viewers
      const pdfContent = this.generatePDFContent(limitedBookmarks, bookmarks.length > Limits.maxBookmarksForExport);

      const blob = new Blob([pdfContent], { type: 'application/pdf' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.pdf`,
        size: blob.size,
        metadata: {
          originalCount: bookmarks.length,
          exportedCount: limitedBookmarks.length,
          limited: bookmarks.length > Limits.maxBookmarksForExport
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.pdf`
      };
    }
  }

  generatePDFContent(bookmarks, wasLimited) {
    // Create a simple PDF-like structure
    // This is a basic approach - for production, consider using a PDF library
    const header = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 5 0 R
>>
stream
BT
/F1 12 Tf
72 720 Td
(XSaved Bookmarks Export) Tj
0 -20 Td
(Exported on: ${new Date().toLocaleString()}) Tj
0 -20 Td
(Total bookmarks: ${bookmarks.length}${wasLimited ? ' (limited)' : ''}) Tj
0 -40 Td`;

    const content = bookmarks.map((bookmark, index) => {
      const text = this.escapePDFText(bookmark.text || '');
      const author = bookmark.author || 'Unknown';
      const date = bookmark.created_at || 'Unknown';
      const tags = (bookmark.tags || []).join(', ') || 'None';
      
      return `(${index + 1}. ${text}) Tj
0 -15 Td
(By: ${author} | Created: ${date} | Tags: ${tags}) Tj
0 -20 Td`;
    }).join('\n');

    const contentLength = header.length + content.length;
    const footer = `
ET
endstream
endobj

5 0 obj
${contentLength + 100}
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
0000000${(contentLength + 100).toString().padStart(10, '0')} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${contentLength + 300}
%%EOF`;

    return header + content + footer;
  }

  escapePDFText(text) {
    // Escape special characters for PDF
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, ' ')
      .substring(0, 100); // Limit text length
  }

  escapeCsvField(field) {
    if (!field) return '';
    const cleanField = field.replace(/[\r\n]/g, ' ');
    if (cleanField.includes(',') || cleanField.includes('"') || cleanField.includes('\n')) {
      return `"${cleanField.replace(/"/g, '""')}"`;
    }
    return cleanField;
  }

  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  generateFilename(format, metadata) {
    const date = new Date().toISOString().split('T')[0];
    const count = metadata.totalBookmarks;
    
    let baseName = `xsaved-bookmarks-${date}-${count}`;
    
    if (metadata.filters.tags?.length) {
      baseName += `-${metadata.filters.tags.join('-')}`;
    }
    if (metadata.filters.author) {
      baseName += `-${metadata.filters.author}`;
    }
    
    return `${baseName}.${format}`;
  }

  validateOptions(options) {
    const errors = [];

    if (!options.format) {
      errors.push('Export format is required');
    }

    if (!['csv', 'pdf', 'json'].includes(options.format)) {
      errors.push(`Unsupported format: ${options.format}`);
    }

    if (options.filters?.dateFrom && options.filters?.dateTo) {
      const fromDate = new Date(options.filters.dateFrom);
      const toDate = new Date(options.filters.dateTo);
      
      if (fromDate > toDate) {
        errors.push('Date range is invalid: from date must be before to date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Safe JSON stringify with circular reference protection
  safeJSONStringify(obj) {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
    } catch (error) {
      return JSON.stringify({ error: 'Object could not be stringified due to circular references' });
    }
  }
}

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

    // REMOVED: Unnecessary date normalization function
    
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
    
    listBookmarks: async (limit = Limits.defaultQueryLimit) => {
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
        bookmarked_at: new Date().toISOString(),
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
    },
    //
    // ===== DEVELOPMENT TAG FUNCTIONS =====
    
    addRandomTags: async (minTags = 2, maxTags = 4, preserveExisting = true, onlyUntagged = true) => {
      const CONTENT_TAGS = ['Tech', 'AI', 'Programming', 'Design', 'Music', 'Gaming', 'News', 'Sports', 'Entertainment', 'Science', 'Business', 'Finance', 'Health', 'Travel', 'Food', 'Fashion', 'Art', 'Education', 'Politics', 'Environment'];
      
      try {
        console.log('🏷️ Starting random tag addition process...');
        
        await serviceWorker.initialize();
        
        if (!serviceWorker.db) {
          console.error('❌ Database not initialized');
          return { success: false, error: 'Database not initialized' };
        }
        
        const result = await serviceWorker.db.getAllBookmarks({ limit: Limits.maxQueryLimit });
        if (!result.success || !result.data) {
          console.error('❌ Failed to fetch bookmarks:', result.error);
          return { success: false, error: result.error };
        }
        
        const allBookmarks = result.data;
        console.log(`📊 Found ${allBookmarks.length} total bookmarks`);
        
        const bookmarksToUpdate = onlyUntagged 
          ? allBookmarks.filter(bookmark => !bookmark.tags || bookmark.tags.length === 0)
          : allBookmarks;
          
        console.log(`🎯 Will update ${bookmarksToUpdate.length} bookmarks`);
        
        if (bookmarksToUpdate.length === 0) {
          console.log('✅ All bookmarks already have tags');
          return { success: true, updated: 0, message: 'All bookmarks already tagged' };
        }
        
        const tagUsageStats = {};
        let updateCount = 0;
        
        for (const bookmark of bookmarksToUpdate) {
          const numNewTags = Math.floor(Math.random() * (maxTags - minTags + 1)) + minTags;
          const selectedTags = [];
          const availableForSelection = [...CONTENT_TAGS];
          
          for (let i = 0; i < numNewTags && availableForSelection.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableForSelection.length);
            const selectedTag = availableForSelection.splice(randomIndex, 1)[0];
            selectedTags.push(selectedTag);
            tagUsageStats[selectedTag] = (tagUsageStats[selectedTag] || 0) + 1;
          }
          
          let finalTags = selectedTags;
          if (preserveExisting && bookmark.tags && bookmark.tags.length > 0) {
            finalTags = [...new Set([...bookmark.tags, ...selectedTags])];
          }
          
          const updateResult = await serviceWorker.db.updateBookmark(bookmark.id, { tags: finalTags });
          
          if (updateResult.success) {
            updateCount++;
            if (updateCount <= 5 || updateCount % 20 === 0) {
              console.log(`🏷️ [${updateCount}/${bookmarksToUpdate.length}] Added [${selectedTags.join(', ')}] to: "${bookmark.text?.substring(0, 50)}..."`);
            }
          }
        }
        
        console.log('🎉 Random tag addition completed!');
        console.log(`✅ Updated ${updateCount}/${bookmarksToUpdate.length} bookmarks`);
        console.log(`📊 Tag usage statistics:`, tagUsageStats);
        
        return { success: true, updated: updateCount, tagStats: tagUsageStats, totalBookmarks: allBookmarks.length };
        
      } catch (error) {
        console.error('❌ Error adding random tags:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    
    getTagStats: async () => {
      try {
        await serviceWorker.initialize();
        
        if (!serviceWorker.db) {
          console.error('❌ Database not initialized');
          return { success: false, error: 'Database not initialized' };
        }
        
        const result = await serviceWorker.db.getAllBookmarks({ limit: Limits.maxQueryLimit });
        if (!result.success || !result.data) {
          return { success: false, error: result.error };
        }
        
        const bookmarks = result.data;
        const tagCounts = {};
        let taggedCount = 0;
        
        bookmarks.forEach(bookmark => {
          if (bookmark.tags && bookmark.tags.length > 0) {
            taggedCount++;
            bookmark.tags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });
        
        const stats = {
          totalBookmarks: bookmarks.length,
          taggedBookmarks: taggedCount,
          untaggedBookmarks: bookmarks.length - taggedCount,
          taggedPercentage: Math.round((taggedCount / bookmarks.length) * 100),
          uniqueTags: Object.keys(tagCounts).length,
          tagDistribution: Object.entries(tagCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .reduce((obj, [tag, count]) => ({ ...obj, [tag]: count }), {})
        };
        
        console.log('📊 === TAG STATISTICS ===');
        console.log(`Total bookmarks: ${stats.totalBookmarks}`);
        console.log(`Tagged bookmarks: ${stats.taggedBookmarks} (${stats.taggedPercentage}%)`);
        console.log(`Untagged bookmarks: ${stats.untaggedBookmarks}`);
        console.log(`Unique tags: ${stats.uniqueTags}`);
        console.log('Top 10 tags:', Object.entries(stats.tagDistribution).slice(0, 10));
        
        return { success: true, stats };
        
      } catch (error) {
        console.error('❌ Error getting tag statistics:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Convenience shortcuts
    addRandomTagsQuick: () => (self as any).testXSaved.addRandomTags(1, 3, true, true),
    addRandomTagsExtensive: () => (self as any).testXSaved.addRandomTags(3, 5, true, true),

    // ===============================
    // DATE DEBUG FUNCTIONS
    // ===============================

    /**
     * Debug bookmark dates - shows raw data and parsed dates
     */
    async debugBookmarkDates() {
      try {
        console.log('🔍 DEBUG: Analyzing bookmark dates...\n');
        
        const result = await db.searchBookmarks({ limit: Limits.defaultQueryLimit, sortBy: 'created_at', sortOrder: 'asc' });
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.log('❌ No bookmarks found or error occurred');
          return;
        }
        
        console.log(`📊 Analyzing ${result.data.length} bookmarks:\n`);
        
        result.data.forEach((bookmark, index) => {
          console.log(`--- Bookmark ${index + 1}: ${bookmark.id} ---`);
          console.log(`Raw created_at: "${bookmark.created_at}"`);
          console.log(`Raw bookmarked_at: "${bookmark.bookmarked_at}"`);
          console.log(`Raw sortIndex: "${bookmark.sortIndex || 'N/A'}"`);
          
          const createdDate = new Date(bookmark.created_at);
          const bookmarkedDate = new Date(bookmark.bookmarked_at);
          
          console.log(`Parsed created_at: ${createdDate.toISOString()} (${createdDate.getFullYear()})`);
          console.log(`Parsed bookmarked_at: ${bookmarkedDate.toISOString()} (${bookmarkedDate.getFullYear()})`);
          
          if (bookmark.sortIndex) {
            try {
              const sortIndexDate = getSortIndexDate(bookmark.sortIndex);
              console.log(`SortIndex parsed: ${sortIndexDate.toISOString()} (${sortIndexDate.getFullYear()})`);
            } catch (error) {
              console.log(`❌ SortIndex parse error: ${error.message}`);
            }
          }
          
          console.log(`Author: ${bookmark.author}`);
          console.log(`Text preview: "${bookmark.text.substring(0, 50)}..."`);
          console.log(''); // Empty line for readability
        });
        
      } catch (error) {
        console.error('❌ Debug function failed:', error);
      }
    },

    /**
     * Validate date consistency across all bookmarks
     */
    async validateDateConsistency() {
      try {
        console.log('🔍 VALIDATION: Checking date consistency...\n');
        
        const result = await db.searchBookmarks({ limit: Limits.maxQueryLimit, sortBy: 'created_at', sortOrder: 'asc' });
        
        if (!result.success || !result.data) {
          console.log('❌ Failed to fetch bookmarks for validation');
          return;
        }
        
        let issues = {
          invalidCreatedAt: 0,
          invalidBookmarkedAt: 0,
          futureCreatedAt: 0,
          futureBookmarkedAt: 0,
          epochDates: 0,
          inconsistentOrder: 0
        };
        
        const now = new Date();
        const twitterLaunch = new Date('2006-03-21'); // Twitter launch date
        
        console.log(`📊 Validating ${result.data.length} bookmarks...\n`);
        
        result.data.forEach((bookmark, index) => {
          const createdDate = new Date(bookmark.created_at);
          const bookmarkedDate = new Date(bookmark.bookmarked_at);
          
          // Check for invalid dates
          if (isNaN(createdDate.getTime())) {
            issues.invalidCreatedAt++;
            console.log(`❌ Invalid created_at: ${bookmark.id} - "${bookmark.created_at}"`);
          }
          
          if (isNaN(bookmarkedDate.getTime())) {
            issues.invalidBookmarkedAt++;
            console.log(`❌ Invalid bookmarked_at: ${bookmark.id} - "${bookmark.bookmarked_at}"`);
          }
          
          // Check for future dates
          if (createdDate > now) {
            issues.futureCreatedAt++;
            console.log(`⚠️ Future created_at: ${bookmark.id} - ${createdDate.toISOString()}`);
          }
          
          if (bookmarkedDate > now) {
            issues.futureBookmarkedAt++;
            console.log(`⚠️ Future bookmarked_at: ${bookmark.id} - ${bookmarkedDate.toISOString()}`);
          }
          
          // Check for epoch dates (Jan 1, 1970)
          if (createdDate.getTime() < twitterLaunch.getTime()) {
            issues.epochDates++;
            console.log(`⚠️ Pre-Twitter date: ${bookmark.id} - ${createdDate.toISOString()}`);
          }
          
          // Check for order consistency (created should generally be <= bookmarked)
          if (createdDate > bookmarkedDate) {
            issues.inconsistentOrder++;
            console.log(`⚠️ Created after bookmarked: ${bookmark.id} - created: ${createdDate.toISOString()}, bookmarked: ${bookmarkedDate.toISOString()}`);
          }
        });
        
        console.log('\n📋 VALIDATION SUMMARY:');
        console.log(`✅ Total bookmarks checked: ${result.data.length}`);
        console.log(`❌ Invalid created_at dates: ${issues.invalidCreatedAt}`);
        console.log(`❌ Invalid bookmarked_at dates: ${issues.invalidBookmarkedAt}`);
        console.log(`⚠️ Future created_at dates: ${issues.futureCreatedAt}`);
        console.log(`⚠️ Future bookmarked_at dates: ${issues.futureBookmarkedAt}`);
        console.log(`⚠️ Pre-Twitter epoch dates: ${issues.epochDates}`);
        console.log(`⚠️ Inconsistent date order: ${issues.inconsistentOrder}`);
        
        const totalIssues = Object.values(issues).reduce((sum, count) => sum + count, 0);
        
        if (totalIssues === 0) {
          console.log('\n🎉 All dates look good!');
        } else {
          console.log(`\n⚠️ Found ${totalIssues} potential issues`);
        }
        
      } catch (error) {
        console.error('❌ Validation failed:', error);
      }
    },

    /**
     * Get 20 oldest tweets by bookmarked_at date
     */
    async getOldestBookmarkedAt() {
      try {
        console.log('🔍 OLDEST BY CREATED_AT: Fetching 20 oldest tweets...\n');
        
        const result = await db.searchBookmarks({ limit: Limits.popularTagsLimit, sortBy: 'created_at', sortOrder: 'asc' });
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.log('❌ No bookmarks found');
          return;
        }
        
        console.log(`📊 Found ${result.data.length} oldest bookmarked tweets:\n`);
        
        result.data.forEach((bookmark, index) => {
          const bookmarkedDate = new Date(bookmark.bookmarked_at);
          const createdDate = new Date(bookmark.created_at);
          
          console.log(`${index + 1}. ${bookmark.id} (@${bookmark.author})`);
          console.log(`   Bookmarked: ${bookmarkedDate.toISOString()} (${bookmarkedDate.getFullYear()})`);
          console.log(`   Created: ${createdDate.toISOString()} (${createdDate.getFullYear()})`);
          console.log(`   Text: "${bookmark.text.substring(0, 60)}..."`);
          console.log('');
        });
        
      } catch (error) {
        console.error('❌ Function failed:', error);
      }
    },

    /**
     * Get 20 newest tweets by bookmarked_at date
     */
    async getNewestBookmarkedAt() {
      try {
        console.log('🔍 NEWEST BY CREATED_AT: Fetching 20 newest tweets...\n');
        
        const result = await db.searchBookmarks({ limit: Limits.popularTagsLimit, sortBy: 'created_at', sortOrder: 'desc' });
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.log('❌ No bookmarks found');
          return;
        }
        
        console.log(`📊 Found ${result.data.length} newest bookmarked tweets:\n`);
        
        result.data.forEach((bookmark, index) => {
          const bookmarkedDate = new Date(bookmark.bookmarked_at);
          const createdDate = new Date(bookmark.created_at);
          
          console.log(`${index + 1}. ${bookmark.id} (@${bookmark.author})`);
          console.log(`   Bookmarked: ${bookmarkedDate.toISOString()} (${bookmarkedDate.getFullYear()})`);
          console.log(`   Created: ${createdDate.toISOString()} (${createdDate.getFullYear()})`);
          console.log(`   Text: "${bookmark.text.substring(0, 60)}..."`);
          console.log('');
        });
        
      } catch (error) {
        console.error('❌ Function failed:', error);
      }
    },

    /**
     * Get 20 oldest tweets by created_at date
     */
    async getOldestCreatedAt() {
      try {
        console.log('🔍 OLDEST BY CREATED_AT: Fetching 20 oldest created tweets...\n');
        
        const result = await db.searchBookmarks({ limit: Limits.popularTagsLimit, sortBy: 'created_at', sortOrder: 'asc' });
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.log('❌ No bookmarks found');
          return;
        }
        
        console.log(`📊 Found ${result.data.length} oldest created tweets:\n`);
        
        result.data.forEach((bookmark, index) => {
          const createdDate = new Date(bookmark.created_at);
          const bookmarkedDate = new Date(bookmark.bookmarked_at);
          
          console.log(`${index + 1}. ${bookmark.id} (@${bookmark.author})`);
          console.log(`   Created: ${createdDate.toISOString()} (${createdDate.getFullYear()})`);
          console.log(`   Bookmarked: ${bookmarkedDate.toISOString()} (${bookmarkedDate.getFullYear()})`);
          console.log(`   Text: "${bookmark.text.substring(0, 60)}..."`);
          console.log('');
        });
        
      } catch (error) {
        console.error('❌ Function failed:', error);
      }
    },

    /**
     * Get 20 newest tweets by created_at date
     */
    async getNewestCreatedAt() {
      try {
        console.log('🔍 NEWEST BY CREATED_AT: Fetching 20 newest created tweets...\n');
        
        const result = await db.searchBookmarks({ limit: Limits.popularTagsLimit, sortBy: 'created_at', sortOrder: 'desc' });
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.log('❌ No bookmarks found');
          return;
        }
        
        console.log(`📊 Found ${result.data.length} newest created tweets:\n`);
        
        result.data.forEach((bookmark, index) => {
          const createdDate = new Date(bookmark.created_at);
          const bookmarkedDate = new Date(bookmark.bookmarked_at);
          
          console.log(`${index + 1}. ${bookmark.id} (@${bookmark.author})`);
          console.log(`   Created: ${createdDate.toISOString()} (${createdDate.getFullYear()})`);
          console.log(`   Bookmarked: ${bookmarkedDate.toISOString()} (${bookmarkedDate.getFullYear()})`);
          console.log(`   Text: "${bookmark.text.substring(0, 60)}..."`);
          console.log('');
        });
        
      } catch (error) {
        console.error('❌ Function failed:', error);
      }
    }
  };

  // Also expose functions globally for direct access
  (self as any).addRandomTags = (self as any).testXSaved.addRandomTags;
  (self as any).getTagStats = (self as any).testXSaved.getTagStats;
  (self as any).debugBookmarkDates = (self as any).testXSaved.debugBookmarkDates;
  (self as any).validateDateConsistency = (self as any).testXSaved.validateDateConsistency;
  (self as any).getOldestBookmarkedAt = (self as any).testXSaved.getOldestBookmarkedAt;
  (self as any).getNewestBookmarkedAt = (self as any).testXSaved.getNewestBookmarkedAt;
  (self as any).getOldestCreatedAt = (self as any).testXSaved.getOldestCreatedAt;
  (self as any).getNewestCreatedAt = (self as any).testXSaved.getNewestCreatedAt;
  
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
  console.log('🏷️ TAG FUNCTIONS (DEV):');
  console.log('  • addRandomTags() or self.testXSaved.addRandomTags() - Add random tags');
  console.log('  • addSmartTags() or self.testXSaved.addSmartTags() - Add content-based tags');
  console.log('  • getTagStats() or self.testXSaved.getTagStats() - Show tag statistics');
  console.log('📅 DATE DEBUG FUNCTIONS:');
  console.log('  • debugBookmarkDates() - Show date analysis for first 10 bookmarks');
  console.log('  • validateDateConsistency() - Check for date inconsistencies');
  console.log('  • getOldestBookmarkedAt() - Show 20 oldest tweets by bookmark date');
  console.log('  • getNewestBookmarkedAt() - Show 20 newest tweets by bookmark date');
  console.log('  • getOldestCreatedAt() - Show 20 oldest tweets by creation date');
  console.log('  • getNewestCreatedAt() - Show 20 newest tweets by creation date');
} 