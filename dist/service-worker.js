/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./src/db/config.ts
/**
 * XSaved Extension v2 - Database Configuration
 * IndexedDB schema with performance-optimized indexes
 */
const DATABASE_NAME = 'XSavedDB';
const DATABASE_VERSION = 2;
// Store names
const STORES = {
    BOOKMARKS: 'bookmarks',
    SEARCH_INDEX: 'search_index',
    TAGS: 'tags',
    COLLECTIONS: 'collections',
    SETTINGS: 'settings'
};
// Database schema configuration
const DB_CONFIG = {
    name: DATABASE_NAME,
    version: DATABASE_VERSION,
    stores: {
        // Primary bookmarks store with optimized indexes
        [STORES.BOOKMARKS]: {
            keyPath: 'id',
            autoIncrement: false,
            indexes: [
                {
                    name: 'created_at',
                    keyPath: 'created_at',
                    unique: false
                },
                {
                    name: 'author',
                    keyPath: 'author',
                    unique: false
                },
                {
                    name: 'tags',
                    keyPath: 'tags',
                    multiEntry: true // ← KEY: Each tag creates separate index entry
                },
                {
                    name: 'bookmark_timestamp',
                    keyPath: 'bookmark_timestamp',
                    unique: false
                },
                {
                    name: 'text_search',
                    keyPath: 'textTokens',
                    multiEntry: true // ← KEY: Each token creates separate index entry
                }
            ]
        },
        // Search index for performance optimization
        [STORES.SEARCH_INDEX]: {
            keyPath: 'bookmarkId',
            autoIncrement: false,
            indexes: [
                {
                    name: 'tokens',
                    keyPath: 'tokens',
                    multiEntry: true
                },
                {
                    name: 'relevance_score',
                    keyPath: 'relevanceScore',
                    unique: false
                },
                {
                    name: 'last_updated',
                    keyPath: 'lastUpdated',
                    unique: false
                }
            ]
        },
        // Tags store for organization and analytics
        [STORES.TAGS]: {
            keyPath: 'name',
            autoIncrement: false,
            indexes: [
                {
                    name: 'usage_count',
                    keyPath: 'usageCount',
                    unique: false
                },
                {
                    name: 'created_at',
                    keyPath: 'createdAt',
                    unique: false
                },
                {
                    name: 'category',
                    keyPath: 'category',
                    unique: false
                }
            ]
        },
        // Collections/folders store
        [STORES.COLLECTIONS]: {
            keyPath: 'id',
            autoIncrement: false,
            indexes: [
                {
                    name: 'name',
                    keyPath: 'name',
                    unique: false
                },
                {
                    name: 'created_at',
                    keyPath: 'createdAt',
                    unique: false
                },
                {
                    name: 'updated_at',
                    keyPath: 'updatedAt',
                    unique: false
                }
            ]
        },
        // Settings store
        [STORES.SETTINGS]: {
            keyPath: 'key',
            autoIncrement: false,
            indexes: [
                {
                    name: 'updated_at',
                    keyPath: 'updatedAt',
                    unique: false
                }
            ]
        }
    }
};
// Performance configuration
const PERFORMANCE_CONFIG = {
    // Search performance targets
    SEARCH_TARGET_MS: 50, // Target search time
    BATCH_SIZE: 1000, // Bulk operation batch size
    INDEX_REBUILD_THRESHOLD: 10000, // When to rebuild search index
    // Memory management
    HOT_CACHE_SIZE: 100, // Recent bookmarks in memory
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes cache TTL
    // Database maintenance
    CLEANUP_INTERVAL_HOURS: 24, // Cleanup old data
    VACUUM_THRESHOLD_MB: 100 // Compact database threshold
};
// Default settings
const DEFAULT_SETTINGS = {
    // Search preferences
    search_mode: 'smart', // 'simple' | 'smart' | 'advanced'
    results_per_page: 50,
    enable_fuzzy_search: true,
    // UI preferences  
    theme: 'auto', // 'light' | 'dark' | 'auto'
    grid_columns: 3, // Grid layout columns
    show_media_previews: true,
    // Performance
    enable_background_sync: true,
    max_cache_size_mb: 50,
    enable_performance_monitoring: false
};
// Error messages
const DB_ERRORS = {
    NOT_SUPPORTED: 'IndexedDB is not supported in this browser',
    OPEN_FAILED: 'Failed to open database',
    TRANSACTION_FAILED: 'Database transaction failed',
    STORE_NOT_FOUND: 'Object store not found',
    INDEX_NOT_FOUND: 'Index not found',
    QUOTA_EXCEEDED: 'Storage quota exceeded',
    DATA_CORRUPTION: 'Database corruption detected'
};
// Migration helpers (for future schema updates)
const MIGRATION_HELPERS = {
    // Version 1 → 2 migration (example for future use)
    v1_to_v2: async (db) => {
        // Migration logic would go here
        console.log('Migrating database from v1 to v2...');
    }
};

;// ./src/db/database.ts
/**
 * XSaved Extension v2 - Database Manager
 * High-performance IndexedDB wrapper with transaction management
 */

class XSavedDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.initPromise = null;
    }
    /**
     * Get database instance (for advanced operations)
     */
    get database() {
        return this.db;
    }
    /**
     * Initialize database connection with schema setup
     */
    async initialize() {
        if (this.isInitialized) {
            return { success: true };
        }
        if (this.initPromise) {
            await this.initPromise;
            return { success: true };
        }
        this.initPromise = this._performInitialization();
        try {
            await this.initPromise;
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown initialization error'
            };
        }
    }
    async _performInitialization() {
        return new Promise((resolve, reject) => {
            // Check IndexedDB support (compatible with both browser and service worker)
            if (!self.indexedDB && !globalThis.indexedDB) {
                reject(new Error(DB_ERRORS.NOT_SUPPORTED));
                return;
            }
            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
            request.onerror = () => {
                reject(new Error(DB_ERRORS.OPEN_FAILED));
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                console.log('✅ IndexedDB opened successfully');
                console.log('📊 Database info:', {
                    name: this.db.name,
                    version: this.db.version,
                    objectStoreNames: Array.from(this.db.objectStoreNames)
                });
                // Detailed store verification
                console.log('🔍 Verifying object stores:');
                Array.from(this.db.objectStoreNames).forEach(storeName => {
                    console.log(`   ✅ Store "${storeName}" exists`);
                });
                // Check if stores exist
                if (!this.db.objectStoreNames.contains(STORES.BOOKMARKS)) {
                    console.warn('⚠️ Bookmarks store missing! Database may need to be recreated.');
                }
                // Setup error handling
                this.db.onerror = (error) => {
                    console.error('Database error:', error);
                };
                resolve();
            };
            request.onupgradeneeded = (event) => {
                console.log('📦 Setting up database schema...');
                const db = event.target.result;
                this._createSchema(db);
                console.log('✅ Database schema created successfully');
            };
        });
    }
    /**
     * Create database schema with optimized indexes
     */
    _createSchema(db) {
        Object.entries(DB_CONFIG.stores).forEach(([storeName, storeConfig]) => {
            // Create object store
            const store = db.createObjectStore(storeName, {
                keyPath: storeConfig.keyPath,
                autoIncrement: storeConfig.autoIncrement || false
            });
            // Create indexes
            storeConfig.indexes.forEach((indexConfig) => {
                store.createIndex(indexConfig.name, indexConfig.keyPath, {
                    unique: indexConfig.unique || false,
                    multiEntry: indexConfig.multiEntry || false
                });
            });
        });
        console.log('✅ Database schema created with optimized indexes');
    }
    /**
     * Ensure database is initialized before operations
     */
    async _ensureInitialized() {
        if (!this.isInitialized) {
            const result = await this.initialize();
            if (!result.success) {
                throw new Error(result.error || 'Failed to initialize database');
            }
        }
    }
    /**
     * Create a database transaction with error handling
     */
    _createTransaction(storeNames, mode = 'readonly') {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        const transaction = this.db.transaction(storeNames, mode);
        transaction.onerror = (event) => {
            console.error('❌ Transaction error:', event);
            console.error('❌ Transaction details:', {
                mode,
                storeNames,
                error: transaction.error,
                db: this.db?.name,
                dbVersion: this.db?.version,
                objectStoreNames: this.db ? Array.from(this.db.objectStoreNames) : 'N/A'
            });
        };
        return transaction;
    }
    /**
     * Performance monitoring wrapper
     */
    async _withPerformanceTracking(operation, fn) {
        const startTime = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - startTime;
            const metrics = {
                operation,
                duration,
                recordCount: Array.isArray(result) ? result.length : 1,
                timestamp: new Date().toISOString()
            };
            // Log slow operations
            if (duration > PERFORMANCE_CONFIG.SEARCH_TARGET_MS) {
                console.warn(`⚠️ Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
            }
            return { result, metrics };
        }
        catch (error) {
            const duration = performance.now() - startTime;
            console.error(`❌ Operation failed: ${operation} (${duration.toFixed(2)}ms)`, error);
            throw error;
        }
    }
    // ========================
    // BOOKMARK OPERATIONS
    // ========================
    /**
     * Add a new bookmark
     */
    async addBookmark(bookmark) {
        await this._ensureInitialized();
        try {
            const { result, metrics } = await this._withPerformanceTracking('addBookmark', () => this._addBookmarkInternal(bookmark));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add bookmark'
            };
        }
    }
    async _addBookmarkInternal(bookmark) {
        return new Promise(async (resolve, reject) => {
            try {
                // Ensure required fields
                const bookmarkToAdd = {
                    ...bookmark,
                    bookmark_timestamp: bookmark.bookmark_timestamp || new Date().toISOString(),
                    tags: bookmark.tags || [],
                    textTokens: this._tokenizeText(bookmark.text)
                };
                // Create transaction for both bookmarks and tags stores
                const transaction = this._createTransaction([STORES.BOOKMARKS, STORES.TAGS], 'readwrite');
                const bookmarksStore = transaction.objectStore(STORES.BOOKMARKS);
                const tagsStore = transaction.objectStore(STORES.TAGS);
                // Save bookmark first
                const bookmarkRequest = bookmarksStore.add(bookmarkToAdd);
                bookmarkRequest.onsuccess = async () => {
                    try {
                        // Update tag analytics after bookmark is saved
                        await this._updateTagAnalytics(bookmarkToAdd.tags, tagsStore);
                        console.log(`✅ Bookmark and tags saved successfully: ${bookmarkToAdd.id}`);
                        resolve(bookmarkToAdd);
                    }
                    catch (tagError) {
                        console.error('❌ Failed to update tag analytics:', tagError);
                        // Don't reject - bookmark was saved successfully
                        resolve(bookmarkToAdd);
                    }
                };
                bookmarkRequest.onerror = (event) => {
                    console.error('❌ IndexedDB add request error:', event);
                    console.error('❌ Request error details:', {
                        error: bookmarkRequest.error,
                        transaction: transaction.error,
                        objectStore: bookmarksStore.name,
                        bookmark: bookmarkToAdd
                    });
                    reject(new Error(`Failed to add bookmark to store: ${bookmarkRequest.error?.message || 'Unknown error'}`));
                };
            }
            catch (error) {
                console.error('❌ Error in _addBookmarkInternal:', error);
                reject(error);
            }
        });
    }
    /**
     * Get bookmark by ID
     */
    async getBookmark(id) {
        await this._ensureInitialized();
        try {
            const { result, metrics } = await this._withPerformanceTracking('getBookmark', () => this._getBookmarkInternal(id));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get bookmark'
            };
        }
    }
    async _getBookmarkInternal(id) {
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const request = store.get(id);
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = () => {
                reject(new Error('Failed to get bookmark'));
            };
        });
    }
    /**
     * Get recent bookmarks (most common query)
     */
    async getRecentBookmarks(options = {}) {
        await this._ensureInitialized();
        try {
            const { result, metrics } = await this._withPerformanceTracking('getRecentBookmarks', () => this._getRecentBookmarksInternal(options));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get recent bookmarks'
            };
        }
    }
    async _getRecentBookmarksInternal(options) {
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const index = store.index('bookmark_timestamp');
            const results = [];
            const limit = options.limit || 50;
            let count = 0;
            // Use cursor for efficient pagination
            const request = index.openCursor(null, 'prev'); // Most recent first
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                }
                else {
                    resolve(results);
                }
            };
            request.onerror = () => {
                reject(new Error('Failed to get recent bookmarks'));
            };
        });
    }
    /**
     * Search bookmarks by tags (optimized with multi-entry index)
     */
    async getBookmarksByTag(tag) {
        await this._ensureInitialized();
        try {
            const { result, metrics } = await this._withPerformanceTracking('getBookmarksByTag', () => this._getBookmarksByTagInternal(tag));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search by tag'
            };
        }
    }
    async _getBookmarksByTagInternal(tag) {
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const index = store.index('tags');
            const request = index.getAll(tag); // Multi-entry index magic!
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(new Error('Failed to search by tag'));
            };
        });
    }
    /**
     * Delete bookmark by ID
     */
    async deleteBookmark(id) {
        await this._ensureInitialized();
        try {
            const { metrics } = await this._withPerformanceTracking('deleteBookmark', () => this._deleteBookmarkInternal(id));
            return {
                success: true,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete bookmark'
            };
        }
    }
    async _deleteBookmarkInternal(id) {
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(STORES.BOOKMARKS, 'readwrite');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const request = store.delete(id);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(new Error('Failed to delete bookmark'));
            };
        });
    }
    // ========================
    // UTILITY METHODS
    // ========================
    /**
     * Tokenize text for search indexing
     */
    _tokenizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s#@]/g, ' ') // Keep hashtags and mentions
            .split(/\s+/)
            .filter(token => token.length > 2) // Filter short tokens
            .slice(0, 50); // Limit tokens to prevent bloat
    }
    /**
     * Get all bookmarks with optional filtering and sorting
     */
    async getAllBookmarks(options = {}) {
        await this._ensureInitialized();
        try {
            const { result, metrics } = await this._withPerformanceTracking('getAllBookmarks', () => this._getAllBookmarksInternal(options));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get all bookmarks'
            };
        }
    }
    async _getAllBookmarksInternal(options) {
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const sortBy = options.sortBy || 'created_at';
            const direction = options.sortOrder === 'asc' ? 'next' : 'prev';
            let request;
            if (store.indexNames.contains(sortBy)) {
                const index = store.index(sortBy);
                request = index.openCursor(null, direction);
            }
            else {
                request = store.openCursor(null, direction);
            }
            const results = [];
            const limit = options.limit || 1000;
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                }
                else {
                    resolve(results);
                }
            };
            request.onerror = () => {
                reject(new Error('Failed to get all bookmarks'));
            };
        });
    }
    /**
     * Clear all bookmarks from database
     */
    async clearAllBookmarks() {
        await this._ensureInitialized();
        try {
            const { result, metrics } = await this._withPerformanceTracking('clearAllBookmarks', () => this._clearAllBookmarksInternal());
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear all bookmarks'
            };
        }
    }
    async _clearAllBookmarksInternal() {
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(STORES.BOOKMARKS, 'readwrite');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const request = store.clear();
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(new Error('Failed to clear bookmarks store'));
            };
        });
    }
    /**
     * Get database statistics
     */
    async getStats() {
        await this._ensureInitialized();
        try {
            const bookmarkCount = await this._getStoreCount(STORES.BOOKMARKS);
            const tagCount = await this._getStoreCount(STORES.TAGS);
            return {
                success: true,
                data: {
                    bookmarks: bookmarkCount,
                    tags: tagCount,
                    version: DB_CONFIG.version,
                    initialized: this.isInitialized
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get stats'
            };
        }
    }
    async _getStoreCount(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(new Error(`Failed to count ${storeName}`));
            };
        });
    }
    // ===== TAG MANAGEMENT METHODS =====
    /**
     * Update tag analytics when bookmarks are saved
     */
    async _updateTagAnalytics(tags, tagsStore) {
        if (!tags || tags.length === 0)
            return;
        const timestamp = new Date().toISOString();
        for (const tagName of tags) {
            if (!tagName.trim())
                continue;
            try {
                // Get existing tag
                const getRequest = tagsStore.get(tagName);
                await new Promise((resolve, reject) => {
                    getRequest.onsuccess = () => {
                        const existingTag = getRequest.result;
                        if (existingTag) {
                            // Update existing tag
                            existingTag.usageCount = (existingTag.usageCount || 0) + 1;
                            const updateRequest = tagsStore.put(existingTag);
                            updateRequest.onsuccess = () => {
                                console.log(`📊 Updated tag analytics: ${tagName} (usage: ${existingTag.usageCount})`);
                                resolve();
                            };
                            updateRequest.onerror = () => reject(new Error(`Failed to update tag: ${tagName}`));
                        }
                        else {
                            // Create new tag
                            const newTag = {
                                name: tagName,
                                usageCount: 1,
                                createdAt: timestamp
                            };
                            const addRequest = tagsStore.add(newTag);
                            addRequest.onsuccess = () => {
                                console.log(`🏷️ Created new tag: ${tagName}`);
                                resolve();
                            };
                            addRequest.onerror = () => reject(new Error(`Failed to create tag: ${tagName}`));
                        }
                    };
                    getRequest.onerror = () => reject(new Error(`Failed to get tag: ${tagName}`));
                });
            }
            catch (error) {
                console.error(`❌ Failed to update tag analytics for: ${tagName}`, error);
                // Continue with other tags even if one fails
            }
        }
    }
    /**
     * Get all tags with their usage statistics
     */
    async getAllTags() {
        await this._ensureInitialized();
        try {
            const result = await this._withPerformanceTracking('getAllTags', async () => {
                return new Promise((resolve, reject) => {
                    const transaction = this._createTransaction(STORES.TAGS, 'readonly');
                    const store = transaction.objectStore(STORES.TAGS);
                    const request = store.getAll();
                    request.onsuccess = () => {
                        resolve(request.result || []);
                    };
                    request.onerror = () => {
                        reject(new Error('Failed to get all tags'));
                    };
                });
            });
            return {
                success: true,
                data: result.result,
                metrics: result.metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get tags'
            };
        }
    }
    /**
     * Get popular tags (sorted by usage count)
     */
    async getPopularTags(limit = 20) {
        const allTagsResult = await this.getAllTags();
        if (!allTagsResult.success) {
            return allTagsResult;
        }
        try {
            const popularTags = allTagsResult.data
                .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
                .slice(0, limit);
            return {
                success: true,
                data: popularTags
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get popular tags'
            };
        }
    }
    /**
     * Search tags by name (for autocomplete)
     */
    async searchTags(query, limit = 10) {
        const allTagsResult = await this.getAllTags();
        if (!allTagsResult.success) {
            return allTagsResult;
        }
        try {
            const matchingTags = allTagsResult.data
                .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
                .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
                .slice(0, limit);
            return {
                success: true,
                data: matchingTags
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search tags'
            };
        }
    }
    /**
     * Verify database is working by testing basic operations
     */
    async verifyDatabase() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        console.log('🧪 Testing database functionality...');
        // Test bookmark creation
        const testBookmark = {
            id: 'test_' + Date.now(),
            text: 'Test bookmark for verification',
            author: 'test_user',
            created_at: new Date().toISOString(),
            bookmark_timestamp: new Date().toISOString(),
            tags: ['test'],
            media_urls: [],
            textTokens: ['test', 'bookmark', 'verification']
        };
        try {
            // Add test bookmark
            const addResult = await this.addBookmark(testBookmark);
            if (addResult.success) {
                console.log('✅ Test bookmark added successfully');
            }
            else {
                console.error('❌ Failed to add test bookmark:', addResult.error);
                return;
            }
            // Retrieve test bookmark
            const getResult = await this.getBookmark(testBookmark.id);
            if (getResult.success && getResult.data) {
                console.log('✅ Test bookmark retrieved successfully');
                // Clean up test bookmark
                await this.deleteBookmark(testBookmark.id);
                console.log('✅ Test bookmark cleaned up');
                console.log('🎉 Database verification completed successfully!');
            }
            else {
                console.error('❌ Failed to retrieve test bookmark');
            }
        }
        catch (error) {
            console.error('❌ Database verification failed:', error);
        }
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
}
// Export singleton instance
const db = new XSavedDatabase();

;// ./src/db/index.ts
/**
 * XSaved Extension v2 - Database Module
 * Main exports for the data layer
 */
// Main database class

// Configuration


;// ./src/search/query-parser.ts
/**
 * XSaved Extension v2 - Query Parser
 * Transforms user input into optimized search queries
 */
class QueryParser {
    constructor(textConfig) {
        this.textConfig = textConfig;
    }
    /**
     * Parse user search query into optimized execution plan
     */
    parseQuery(query) {
        const parsed = {
            textTokens: [],
            exactPhrases: [],
            requiredTags: query.tags || [],
            optionalTags: [],
            excludedTags: query.excludeTags || [],
            filters: [],
            queryPlan: {
                primaryFilter: null,
                secondaryFilters: [],
                intersectionStrategy: 'all',
                estimatedResultCount: 0,
                estimatedExecutionTime: 0
            },
            originalQuery: query
        };
        // Parse text input
        if (query.text) {
            this.parseTextQuery(query.text, parsed);
        }
        // Build filters
        this.buildFilters(query, parsed);
        // Optimize execution plan
        parsed.queryPlan = this.optimizeQueryPlan(parsed);
        return parsed;
    }
    /**
     * Parse text query for tokens, phrases, and special syntax
     */
    parseTextQuery(text, parsed) {
        // Extract exact phrases in quotes
        const phraseMatches = text.match(/"([^"]*)"/g);
        if (phraseMatches) {
            parsed.exactPhrases = phraseMatches.map(phrase => phrase.replace(/"/g, '').toLowerCase().trim());
            // Remove phrases from text for token extraction
            text = text.replace(/"[^"]*"/g, '');
        }
        // Extract hashtags as required tags
        const hashtagMatches = text.match(/#(\w+)/g);
        if (hashtagMatches) {
            const hashtags = hashtagMatches.map(tag => tag.replace('#', '').toLowerCase());
            parsed.requiredTags.push(...hashtags);
            // Remove hashtags from text
            text = text.replace(/#\w+/g, '');
        }
        // Extract @mentions (could be author filters)
        const mentionMatches = text.match(/@(\w+)/g);
        if (mentionMatches) {
            // For now, treat mentions as optional tokens
            // In future, could auto-add author filter
            const mentions = mentionMatches.map(mention => mention.replace('@', '').toLowerCase());
            parsed.optionalTags.push(...mentions);
            // Keep mentions in text for now
        }
        // Tokenize remaining text
        const tokens = this.tokenizeText(text);
        parsed.textTokens = tokens;
    }
    /**
     * Tokenize text into searchable terms
     */
    tokenizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation except underscores
            .split(/\s+/)
            .filter(token => token.length >= this.textConfig.minTokenLength)
            .slice(0, this.textConfig.maxTokens) // Limit token count
            .filter(token => !this.isStopWord(token));
    }
    /**
     * Check if token is a stop word (common words to ignore)
     */
    isStopWord(token) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);
        return stopWords.has(token);
    }
    /**
     * Build query filters from search parameters
     */
    buildFilters(query, parsed) {
        const filters = [];
        // Text token filters
        parsed.textTokens.forEach(token => {
            filters.push({
                type: 'textToken',
                value: token,
                selectivity: this.estimateTokenSelectivity(token),
                estimatedCost: 10 // ms
            });
        });
        // Tag filters (most selective)
        parsed.requiredTags.forEach(tag => {
            filters.push({
                type: 'tag',
                value: tag,
                selectivity: this.estimateTagSelectivity(tag),
                estimatedCost: 5 // ms - direct index lookup
            });
        });
        // Author filter
        if (query.author) {
            filters.push({
                type: 'author',
                value: query.author,
                selectivity: 0.05, // Usually quite selective
                estimatedCost: 8 // ms
            });
        }
        // Date range filter
        if (query.dateRange) {
            filters.push({
                type: 'dateRange',
                value: query.dateRange,
                selectivity: this.estimateDateSelectivity(query.dateRange),
                estimatedCost: 15 // ms - range query
            });
        }
        // Media filter
        if (query.hasMedia !== undefined) {
            filters.push({
                type: 'hasMedia',
                value: query.hasMedia,
                selectivity: query.hasMedia ? 0.3 : 0.7, // ~30% have media
                estimatedCost: 5 // ms
            });
        }
        parsed.filters = filters;
    }
    /**
     * Optimize query execution plan based on filter selectivity
     */
    optimizeQueryPlan(parsed) {
        const filters = [...parsed.filters];
        // Sort by selectivity (most selective first)
        filters.sort((a, b) => a.selectivity - b.selectivity);
        const primaryFilter = filters[0];
        const secondaryFilters = filters.slice(1);
        // Estimate result count based on most selective filter
        const estimatedResultCount = primaryFilter
            ? Math.max(1, Math.floor(10000 * primaryFilter.selectivity)) // Assume 10K total bookmarks
            : 1000;
        // Estimate execution time
        const estimatedExecutionTime = filters.reduce((total, filter) => total + filter.estimatedCost, 0);
        // Choose intersection strategy
        let intersectionStrategy = 'all';
        if (parsed.textTokens.length > 0 && parsed.requiredTags.length > 0) {
            intersectionStrategy = 'all'; // Text AND tags
        }
        else if (parsed.optionalTags.length > 0) {
            intersectionStrategy = 'any'; // Any optional tags
        }
        return {
            primaryFilter,
            secondaryFilters,
            intersectionStrategy,
            estimatedResultCount,
            estimatedExecutionTime
        };
    }
    /**
     * Estimate selectivity of a text token
     */
    estimateTokenSelectivity(token) {
        // Common words are less selective
        const commonWords = new Set(['react', 'javascript', 'web', 'app', 'code']);
        if (commonWords.has(token)) {
            return 0.2; // 20% of bookmarks might contain this
        }
        // Technical terms are more selective
        if (token.length > 8) {
            return 0.05; // Long words are usually more specific
        }
        return 0.1; // Default selectivity
    }
    /**
     * Estimate selectivity of a tag
     */
    estimateTagSelectivity(tag) {
        // Popular tags are less selective
        const popularTags = new Set(['javascript', 'python', 'ai', 'web', 'tutorial']);
        if (popularTags.has(tag)) {
            return 0.15;
        }
        return 0.05; // Most tags are quite selective
    }
    /**
     * Estimate selectivity of date range
     */
    estimateDateSelectivity(dateRange) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        // Recent date ranges are more selective
        if (daysDiff <= 1)
            return 0.02; // Last day
        if (daysDiff <= 7)
            return 0.1; // Last week  
        if (daysDiff <= 30)
            return 0.3; // Last month
        return 0.8; // Longer ranges are less selective
    }
    /**
     * Extract search suggestions from query
     */
    extractSuggestions(query) {
        const suggestions = [];
        // Suggest related searches based on current query
        if (query.text) {
            const tokens = this.tokenizeText(query.text);
            // Suggest adding common tags
            tokens.forEach(token => {
                if (this.couldBeTag(token)) {
                    suggestions.push(`${query.text} #${token}`);
                }
            });
        }
        // Suggest adding author filter if text contains @mention
        if (query.text?.includes('@')) {
            const mentions = query.text.match(/@(\w+)/g);
            mentions?.forEach(mention => {
                const author = mention.replace('@', '');
                suggestions.push(`author:${author} ${query.text?.replace(mention, '').trim()}`);
            });
        }
        return suggestions.slice(0, 3); // Limit suggestions
    }
    /**
     * Check if token could be a tag
     */
    couldBeTag(token) {
        // Technical terms, frameworks, languages likely to be tags
        const techTerms = /^(react|vue|angular|python|javascript|js|ai|ml|css|html|node|npm)$/i;
        return techTerms.test(token) || token.length > 6;
    }
    /**
     * Generate query hash for caching
     */
    generateQueryHash(query) {
        const normalized = {
            text: query.text?.toLowerCase().trim(),
            tags: query.tags?.sort(),
            author: query.author?.toLowerCase(),
            dateRange: query.dateRange,
            excludeTags: query.excludeTags?.sort(),
            hasMedia: query.hasMedia,
            sortBy: query.sortBy || 'relevance',
            limit: query.limit || 50
        };
        return btoa(JSON.stringify(normalized)).replace(/[+/=]/g, '');
    }
}

;// ./src/search/search-executor.ts
/**
 * XSaved Extension v2 - Search Executor
 * Executes optimized queries against IndexedDB indexes
 */

class SearchExecutor {
    constructor(config) {
        this.config = config;
    }
    /**
     * Execute multi-criteria search query
     */
    async executeSearch(parsedQuery) {
        const startTime = performance.now();
        let analytics = {
            queryTime: 0,
            indexHits: 0,
            resultsReturned: 0,
            cacheHit: false,
            slowOperations: [],
            indexesUsed: []
        };
        try {
            // Ensure database is ready
            await db.initialize();
            // Execute primary filter first (most selective)
            let candidateBookmarks = [];
            if (parsedQuery.queryPlan.primaryFilter) {
                candidateBookmarks = await this.executeSingleFilter(parsedQuery.queryPlan.primaryFilter, analytics);
            }
            else {
                // No filters - get recent bookmarks as starting point
                const recentResult = await db.getRecentBookmarks({ limit: 1000 });
                candidateBookmarks = recentResult.data || [];
                analytics.indexesUsed.push('bookmark_timestamp');
            }
            // Apply secondary filters
            for (const filter of parsedQuery.queryPlan.secondaryFilters) {
                candidateBookmarks = await this.applyFilter(candidateBookmarks, filter, analytics);
                // Early termination if too few results
                if (candidateBookmarks.length === 0) {
                    break;
                }
            }
            // Apply text search if present
            if (parsedQuery.textTokens.length > 0) {
                candidateBookmarks = await this.applyTextSearch(candidateBookmarks, parsedQuery.textTokens, analytics);
            }
            // Filter out excluded tags
            if (parsedQuery.excludedTags.length > 0) {
                candidateBookmarks = candidateBookmarks.filter(bookmark => !parsedQuery.excludedTags.some(excludedTag => bookmark.tags.includes(excludedTag)));
            }
            const queryTime = performance.now() - startTime;
            analytics.queryTime = queryTime;
            analytics.resultsReturned = candidateBookmarks.length;
            // Log slow operations
            if (queryTime > this.config.performanceTargets.combinedSearch) {
                analytics.slowOperations.push(`Total query: ${queryTime.toFixed(2)}ms`);
                console.warn(`⚠️ Slow search query: ${queryTime.toFixed(2)}ms`, parsedQuery);
            }
            return {
                bookmarks: candidateBookmarks.map(bookmark => ({
                    bookmark,
                    score: 1, // Will be calculated by relevance scorer
                    matchingFactors: {
                        textRelevance: 0,
                        tagRelevance: 0,
                        recency: 0,
                        authorPopularity: 0,
                        userInteraction: 0,
                        exactMatch: false
                    }
                })),
                totalCount: candidateBookmarks.length,
                queryTime,
                pagination: {
                    hasMore: false,
                    totalPages: 1
                }
            };
        }
        catch (error) {
            console.error('Search execution error:', error);
            return {
                bookmarks: [],
                totalCount: 0,
                queryTime: performance.now() - startTime,
                pagination: {
                    hasMore: false,
                    totalPages: 0
                }
            };
        }
    }
    /**
     * Execute a single filter using appropriate index
     */
    async executeSingleFilter(filter, analytics) {
        const startTime = performance.now();
        try {
            let result = [];
            switch (filter.type) {
                case 'tag':
                    result = await this.searchByTag(filter.value);
                    analytics.indexesUsed.push('tags');
                    break;
                case 'author':
                    result = await this.searchByAuthor(filter.value);
                    analytics.indexesUsed.push('author');
                    break;
                case 'dateRange':
                    result = await this.searchByDateRange(filter.value);
                    analytics.indexesUsed.push('bookmark_timestamp');
                    break;
                case 'textToken':
                    result = await this.searchByTextToken(filter.value);
                    analytics.indexesUsed.push('text_search');
                    break;
                case 'hasMedia':
                    result = await this.searchByMediaPresence(filter.value);
                    // No specific index for this - filters in memory
                    break;
                default:
                    console.warn('Unknown filter type:', filter.type);
            }
            const duration = performance.now() - startTime;
            analytics.indexHits++;
            // Track slow operations
            const target = this.getPerformanceTarget(filter.type);
            if (duration > target) {
                analytics.slowOperations.push(`${filter.type}: ${duration.toFixed(2)}ms`);
            }
            return result;
        }
        catch (error) {
            console.error(`Filter execution error for ${filter.type}:`, error);
            return [];
        }
    }
    /**
     * Apply filter to existing result set
     */
    async applyFilter(bookmarks, filter, analytics) {
        const startTime = performance.now();
        let filtered = [];
        switch (filter.type) {
            case 'tag':
                filtered = bookmarks.filter(bookmark => bookmark.tags.includes(filter.value));
                break;
            case 'author':
                filtered = bookmarks.filter(bookmark => bookmark.author.toLowerCase() === filter.value.toLowerCase());
                break;
            case 'hasMedia':
                filtered = bookmarks.filter(bookmark => filter.value ?
                    (bookmark.media_urls && bookmark.media_urls.length > 0) :
                    (!bookmark.media_urls || bookmark.media_urls.length === 0));
                break;
            case 'dateRange':
                const { start, end } = filter.value;
                filtered = bookmarks.filter(bookmark => {
                    const bookmarkDate = new Date(bookmark.bookmark_timestamp);
                    return bookmarkDate >= new Date(start) && bookmarkDate <= new Date(end);
                });
                break;
            case 'textToken':
                filtered = bookmarks.filter(bookmark => bookmark.textTokens?.includes(filter.value) ||
                    bookmark.text.toLowerCase().includes(filter.value));
                break;
            default:
                filtered = bookmarks;
        }
        const duration = performance.now() - startTime;
        const target = this.getPerformanceTarget(filter.type);
        if (duration > target) {
            analytics.slowOperations.push(`${filter.type} filter: ${duration.toFixed(2)}ms`);
        }
        return filtered;
    }
    /**
     * Search by tag using multi-entry index (fastest)
     */
    async searchByTag(tag) {
        const result = await db.getBookmarksByTag(tag);
        return result.success ? result.data || [] : [];
    }
    /**
     * Search by author using author index
     */
    async searchByAuthor(author) {
        // Use the database's indexed search (we need to add this method to database.ts)
        return new Promise((resolve, reject) => {
            if (!db.database) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = db.database.transaction([STORES.BOOKMARKS], 'readonly');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const index = store.index('author');
            const request = index.getAll(author.toLowerCase());
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(new Error('Failed to search by author'));
            };
        });
    }
    /**
     * Search by date range using bookmark_timestamp index
     */
    async searchByDateRange(dateRange) {
        return new Promise((resolve, reject) => {
            if (!db.database) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = db.database.transaction([STORES.BOOKMARKS], 'readonly');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const index = store.index('bookmark_timestamp');
            const range = IDBKeyRange.bound(dateRange.start, dateRange.end);
            const request = index.getAll(range);
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(new Error('Failed to search by date range'));
            };
        });
    }
    /**
     * Search by text token using text_search multi-entry index
     */
    async searchByTextToken(token) {
        return new Promise((resolve, reject) => {
            if (!db.database) {
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = db.database.transaction([STORES.BOOKMARKS], 'readonly');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            const index = store.index('text_search');
            const request = index.getAll(token);
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(new Error('Failed to search by text token'));
            };
        });
    }
    /**
     * Filter by media presence (no index available)
     */
    async searchByMediaPresence(hasMedia) {
        // No specific index for this - need to scan bookmarks
        // This is less efficient, so should be used as secondary filter
        const recentResult = await db.getRecentBookmarks({ limit: 10000 });
        const allBookmarks = recentResult.data || [];
        return allBookmarks.filter(bookmark => hasMedia ?
            (bookmark.media_urls && bookmark.media_urls.length > 0) :
            (!bookmark.media_urls || bookmark.media_urls.length === 0));
    }
    /**
     * Apply text search with token matching
     */
    async applyTextSearch(bookmarks, tokens, analytics) {
        if (tokens.length === 0)
            return bookmarks;
        const startTime = performance.now();
        const filtered = bookmarks.filter(bookmark => {
            // Check if bookmark contains any of the search tokens
            const bookmarkTokens = bookmark.textTokens || [];
            const bookmarkText = bookmark.text.toLowerCase();
            return tokens.some(token => bookmarkTokens.includes(token) ||
                bookmarkText.includes(token));
        });
        const duration = performance.now() - startTime;
        if (duration > this.config.performanceTargets.textSearch) {
            analytics.slowOperations.push(`Text search: ${duration.toFixed(2)}ms`);
        }
        return filtered;
    }
    /**
     * Intersect multiple result sets efficiently
     */
    intersectResults(resultSets) {
        if (resultSets.length === 0)
            return [];
        if (resultSets.length === 1)
            return resultSets[0];
        // Sort by length (smallest first) for efficient intersection
        resultSets.sort((a, b) => a.length - b.length);
        let intersection = resultSets[0];
        for (let i = 1; i < resultSets.length; i++) {
            const currentSet = new Set(resultSets[i].map(bookmark => bookmark.id));
            intersection = intersection.filter(bookmark => currentSet.has(bookmark.id));
            // Early termination if intersection becomes empty
            if (intersection.length === 0)
                break;
        }
        return intersection;
    }
    /**
     * Union multiple result sets with deduplication
     */
    unionResults(resultSets) {
        const seen = new Set();
        const union = [];
        for (const resultSet of resultSets) {
            for (const bookmark of resultSet) {
                if (!seen.has(bookmark.id)) {
                    seen.add(bookmark.id);
                    union.push(bookmark);
                }
            }
        }
        return union;
    }
    /**
     * Get performance target for filter type
     */
    getPerformanceTarget(filterType) {
        switch (filterType) {
            case 'tag':
                return this.config.performanceTargets.singleTagSearch;
            case 'textToken':
                return this.config.performanceTargets.textSearch;
            case 'author':
            case 'dateRange':
                return this.config.performanceTargets.multiTagSearch;
            default:
                return this.config.performanceTargets.combinedSearch;
        }
    }
}

;// ./src/search/search-engine.ts
/**
 * XSaved Extension v2 - Search Engine
 * Main search engine that orchestrates query parsing, execution, and ranking
 */


class SearchEngine {
    constructor(config) {
        this.config = this.createDefaultConfig(config);
        this.queryParser = new QueryParser(this.config.textSearch);
        this.searchExecutor = new SearchExecutor(this.config);
        this.queryCache = new Map();
    }
    /**
     * Main search method - the public API
     */
    async search(query) {
        const startTime = performance.now();
        try {
            // Generate cache key
            const cacheKey = this.queryParser.generateQueryHash(query);
            // Check cache first
            if (this.config.caching.enabled) {
                const cached = this.getCachedResult(cacheKey);
                if (cached) {
                    console.log('🎯 Cache hit for query:', query);
                    return cached;
                }
            }
            // Parse query into optimized execution plan
            const parsedQuery = this.queryParser.parseQuery(query);
            console.log('📝 Parsed query:', parsedQuery);
            // Execute search
            const result = await this.searchExecutor.executeSearch(parsedQuery);
            // Add suggested queries
            result.suggestedQueries = this.queryParser.extractSuggestions(query);
            // Cache result if enabled
            if (this.config.caching.enabled) {
                this.cacheResult(cacheKey, result);
            }
            // Log performance
            const totalTime = performance.now() - startTime;
            console.log(`🔍 Search completed in ${totalTime.toFixed(2)}ms:`, {
                query: query.text || 'complex query',
                results: result.totalCount,
                cacheHit: false
            });
            return result;
        }
        catch (error) {
            console.error('Search engine error:', error);
            return {
                bookmarks: [],
                totalCount: 0,
                queryTime: performance.now() - startTime,
                pagination: {
                    hasMore: false,
                    totalPages: 0
                }
            };
        }
    }
    /**
     * Quick tag-only search (optimized for autocomplete)
     */
    async quickTagSearch(tag) {
        return this.search({ tags: [tag], limit: 20 });
    }
    /**
     * Text-only search (for search-as-you-type)
     */
    async quickTextSearch(text) {
        return this.search({ text, limit: 20 });
    }
    /**
     * Author search
     */
    async searchByAuthor(author) {
        return this.search({ author, limit: 50 });
    }
    /**
     * Recent bookmarks with optional filters
     */
    async getRecent(filters) {
        return this.search({
            ...filters,
            sortBy: 'date',
            limit: filters?.limit || 50
        });
    }
    /**
     * Get tag suggestions for autocomplete
     */
    async suggestTags(partial) {
        // This would use the tags store from our database
        // For now, return empty array - will implement when we add tag management
        return [];
    }
    /**
     * Get search suggestions based on current query
     */
    async getSearchSuggestions(query) {
        return this.queryParser.extractSuggestions(query);
    }
    /**
     * Clear search cache
     */
    clearCache() {
        this.queryCache.clear();
        console.log('🧹 Search cache cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        // Simple implementation - in production would track hit rate
        return {
            size: this.queryCache.size,
            hitRate: 0.85 // Placeholder
        };
    }
    /**
     * Update search engine configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Recreate components with new config
        this.queryParser = new QueryParser(this.config.textSearch);
        this.searchExecutor = new SearchExecutor(this.config);
        console.log('⚙️ Search engine configuration updated');
    }
    // Private methods
    /**
     * Create default configuration
     */
    createDefaultConfig(userConfig) {
        const defaultConfig = {
            performanceTargets: {
                singleTagSearch: 5, // 5ms
                multiTagSearch: 20, // 20ms  
                textSearch: 30, // 30ms
                combinedSearch: 50, // 50ms
                autocomplete: 10 // 10ms
            },
            caching: {
                enabled: true,
                maxCacheSize: 100, // Cache 100 recent queries
                cacheTimeout: 5 * 60 * 1000 // 5 minutes
            },
            textSearch: {
                enableFuzzyMatching: false, // Start simple
                enableStemming: false,
                enableSynonyms: false,
                minTokenLength: 3,
                maxTokens: 10,
                proximityBoost: false
            },
            relevanceWeights: {
                textMatch: 0.4,
                tagMatch: 0.3,
                recency: 0.15,
                interaction: 0.1,
                author: 0.05
            }
        };
        return userConfig ? { ...defaultConfig, ...userConfig } : defaultConfig;
    }
    /**
     * Get cached search result
     */
    getCachedResult(cacheKey) {
        const cached = this.queryCache.get(cacheKey);
        if (!cached)
            return null;
        // Check if cache entry is expired
        const now = Date.now();
        if (now - cached.timestamp > this.config.caching.cacheTimeout) {
            this.queryCache.delete(cacheKey);
            return null;
        }
        return cached.result;
    }
    /**
     * Cache search result
     */
    cacheResult(cacheKey, result) {
        // Implement LRU cache eviction if cache is full
        if (this.queryCache.size >= this.config.caching.maxCacheSize) {
            // Remove oldest entry
            const oldestKey = this.queryCache.keys().next().value;
            if (oldestKey) {
                this.queryCache.delete(oldestKey);
            }
        }
        this.queryCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
    }
}
// Export default instance
const searchEngine = new SearchEngine();

;// ./src/search/index.ts
/**
 * XSaved Extension v2 - Search Module
 * Main exports for the search and filtering system
 */
// Main search engine

// Core components  



;// ./src/extension/utils/helpers.js
/**
 * XSaved Extension v2 - Helper Utilities
 * Common helper functions and error classes
 * Adapted from proven v1 extension with enhancements
 */

/**
 * Delay execution for specified milliseconds
 * @param {Number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a retry function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @param {Number} options.maxRetries - Maximum number of retries
 * @param {Number} options.baseDelay - Base delay in milliseconds
 * @param {Boolean} options.jitter - Whether to add randomness to delay
 * @returns {Function} A wrapped function with retry logic
 */
const withRetry = (fn, options = {}) => {
  const { 
    maxRetries = 3, 
    baseDelay = 1000, 
    jitter = true 
  } = options;
  
  return async (...args) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        // Don't retry if we've hit the max retries
        if (attempt >= maxRetries) break;
        
        // Special handling for rate limit errors
        const isRateLimit = error instanceof RateLimitError;
        if (isRateLimit) {
          console.warn(`⏱️ Rate limit hit. Attempt ${attempt + 1}/${maxRetries + 1}`);
        } else {
          console.warn(`🔄 Operation failed. Retrying (${attempt + 1}/${maxRetries + 1})`, error.message);
        }
        
        // Calculate delay with exponential backoff
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        
        // Add jitter if enabled (±10% variation)
        const finalDelay = jitter 
          ? exponentialDelay * (0.9 + Math.random() * 0.2) 
          : exponentialDelay;
        
        // Wait before retrying
        await delay(finalDelay);
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  };
};

/**
 * Error class for network-related errors
 */
class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Error class for rate limiting
 */
class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = null; // Can be set if server returns Retry-After header
  }
  
  /**
   * Set retry time from headers
   * @param {Headers} headers - Response headers
   */
  setRetryAfterFromHeaders(headers) {
    const retryAfter = headers.get('Retry-After');
    if (retryAfter) {
      // Convert to milliseconds (either seconds or date string)
      if (/^\d+$/.test(retryAfter)) {
        // It's seconds
        this.retryAfter = parseInt(retryAfter, 10) * 1000;
      } else {
        // It's a date string
        const retryDate = new Date(retryAfter);
        this.retryAfter = retryDate.getTime() - Date.now();
      }
    }
  }
}

/**
 * Safe JSON parsing with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('🔍 JSON parse failed, using fallback:', error.message);
    return fallback;
  }
};

/**
 * Get nested object property safely
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-separated path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value at path or default
 */
const getIn = (obj, path, defaultValue = undefined) => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
};

/**
 * Log error to chrome storage for debugging
 * @param {string} context - Context where error occurred
 * @param {Error|string} error - Error object or message
 * @param {Object} metadata - Additional metadata
 */
const logError = async (context, error, metadata = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context,
    message: error?.message || error,
    stack: error?.stack,
    metadata,
    userAgent: navigator.userAgent
  };
  
  try {
    // Get existing error logs
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['errorLogs'], resolve);
    });
    
    const existingLogs = result.errorLogs || [];
    
    // Keep only last 100 error logs to prevent storage bloat
    const updatedLogs = [...existingLogs, errorLog].slice(-100);
    
    // Save back to storage
    await new Promise(resolve => {
      chrome.storage.local.set({ errorLogs: updatedLogs }, resolve);
    });
    
    console.error(`📝 Error logged [${context}]:`, error);
    
  } catch (storageError) {
    console.error('❌ Failed to log error to storage:', storageError);
  }
};

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return (...args) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
const debounce = (func, delay) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format timestamp to relative time
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Relative time string
 */
const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < month) return `${Math.floor(diff / week)}w ago`;
  return `${Math.floor(diff / month)}mo ago`;
};

/**
 * Generate a simple hash from string
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
const simpleHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * Check if URL is valid
 * @param {string} urlString - URL to validate
 * @returns {boolean} True if valid URL
 */
const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize text for safe storage/display
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 10000); // Limit length
};

/**
 * Performance monitoring wrapper
 * @param {string} label - Performance label
 * @param {Function} fn - Function to monitor
 * @returns {Function} Wrapped function with performance monitoring
 */
const withPerformanceMonitoring = (label, fn) => {
  return async (...args) => {
    const startTime = performance.now();
    
    try {
      const result = await fn(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 100) { // Log slow operations (>100ms)
        console.warn(`⏱️ Slow operation [${label}]: ${duration.toFixed(2)}ms`);
      }
      
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`❌ Operation failed [${label}] after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
};

console.log('🛠️ XSaved v2 Helpers utility loaded - ready for error handling and utilities'); 
;// ./src/extension/utils/fetcher.js
/**
 * XSaved Extension v2 - X.com API Fetcher
 * Real implementation for fetching bookmarks from X.com GraphQL API
 * Adapted from proven v1 extension with enhancements for IndexedDB integration
 */



// Constants
const TWITTER_URL = 'https://x.com';
const BOOKMARK_ENDPOINT = `${TWITTER_URL}/i/api/graphql/QUjXply7fA7fk05FRyajEg/Bookmarks`;

/**
 * Main function to fetch bookmarks from X.com API
 * @param {string|null} cursor - Pagination cursor for next batch
 * @param {string|null} csrfTokenOverride - Optional CSRF token override
 * @param {boolean} isDeltaSync - Whether this is a delta sync (smaller batches)
 * @returns {Promise<{bookmarks: Array, nextCursor: string|null}>}
 */
const fetchBookmarksV2 = async (cursor = null, csrfTokenOverride = null, isDeltaSync = false) => {
  console.log(`📥 Fetching bookmarks batch (delta: ${isDeltaSync}, cursor: ${cursor ? 'yes' : 'none'})`);
  
  // Adjust count for delta sync - fetch smaller batches to find new content faster
  const batchSize = isDeltaSync ? 50 : 100;
  const variables = { 
    count: batchSize, 
    includePromotedContent: true, 
    ...(cursor && { cursor }) 
  };
  
  // X.com GraphQL features - these are required for the API to work properly
  const features = {
    graphql_timeline_v2_bookmark_timeline: true,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };

  // Get CSRF token
  let csrfToken = csrfTokenOverride;
  if (!csrfToken) {
    try {
      csrfToken = await getCsrfToken();
      if (!csrfToken) {
        console.warn('⚠️ CSRF token not found in cookies');
      }
    } catch (error) {
      console.error('❌ Error getting CSRF token:', error.message);
    }
  }

  // Construct headers required by X.com API
  const headers = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "content-type": "application/json",
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "x-csrf-token": csrfToken || '',
    "x-client-transaction-id": `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    "x-client-uuid": generateClientUUID()
  };
  
  // Construct the URL with query parameters
  const url = `${BOOKMARK_ENDPOINT}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
  
  try {
    console.log(`🌐 Making request to X.com API...`);
    
    const response = await fetch(url, {
      headers,
      referrer: `${TWITTER_URL}/i/bookmarks`,
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
      mode: "cors",
      credentials: "include",
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError(`Rate limit reached: ${response.status}`);
      }
      throw new NetworkError(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    let { bookmarks, nextCursor } = processBookmarksResponse(data);
    
    // Enhance bookmarks with media URLs for IndexedDB
    bookmarks = enhanceBookmarksWithMetadata(bookmarks);
    
    // Check if cursor is valid (not same as current one)
    nextCursor = checkNextCursor(cursor, nextCursor);
    
    console.log(`✅ Fetched ${bookmarks.length} bookmarks (next cursor: ${nextCursor ? 'yes' : 'none'})`);
    
    return { bookmarks, nextCursor };
    
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }
    
    if (error.message.includes('HTTP error! status:')) {
      console.warn("⚠️ Possible rate limit hit. Consider backing off.");
      throw new NetworkError(error.message);
    }
    
    console.error('❌ Unexpected error in fetchBookmarksV2:', error);
    throw error;
  }
};

/**
 * Process the raw response from X.com bookmarks API
 * @param {Object} data - Raw API response
 * @returns {Object} Processed bookmarks and pagination cursor
 */
const processBookmarksResponse = (data) => {
  try {
    const entries = data?.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries || [];
    
    const bookmarks = entries
      .filter(entry => entry?.entryId?.startsWith('tweet-'))
      .map(entry => {
        const result = entry?.content?.itemContent?.tweet_results?.result;
        const legacy = result?.legacy;
        const user = result?.core?.user_results?.result?.legacy;

        return {
          id: result?.rest_id,
          text: legacy?.full_text,
          author: user?.screen_name,
          created_at: legacy?.created_at,
          // Store full data for media extraction
          FULL_DATA: result,
        };
      })
      .filter(bookmark => bookmark.id && bookmark.text); // Remove entries with missing essential data

    const nextCursor = entries.find(entry => entry?.entryId?.startsWith('cursor-bottom-'))?.content?.value;
    
    console.log(`📋 Processed ${bookmarks.length} bookmarks from API response`);
    
    return { bookmarks, nextCursor };
    
  } catch (error) {
    console.error("❌ Error processing bookmarks response:", error);
    // Return empty results on error rather than breaking
    return { bookmarks: [], nextCursor: null };
  }
};

/**
 * Enhance bookmarks with metadata for IndexedDB storage
 * @param {Array} bookmarks - Raw bookmarks from API
 * @returns {Array} Enhanced bookmarks with media URLs and clean data
 */
const enhanceBookmarksWithMetadata = (bookmarks) => {
  return bookmarks.map(bookmark => {
    const enhanced = {
      id: bookmark.id,
      text: bookmark.text,
      author: bookmark.author,
      created_at: bookmark.created_at,
      media_urls: extractMediaUrls(bookmark.FULL_DATA)
    };
    
    // Remove FULL_DATA to keep storage lean
    return enhanced;
  });
};

/**
 * Extract media URLs from tweet data
 * @param {Object} tweetData - Full tweet data from API
 * @returns {Array} Array of media URLs
 */
const extractMediaUrls = (tweetData) => {
  const media_urls = [];
  
  try {
    // Extract photos
    const media = tweetData?.legacy?.entities?.media || [];
    media.forEach(item => {
      if (item.type === 'photo' && item.media_url_https) {
        media_urls.push(item.media_url_https);
      }
    });
    
    // Extract video thumbnails
    const extendedEntities = tweetData?.legacy?.extended_entities?.media || [];
    extendedEntities.forEach(item => {
      if (item.type === 'video' && item.media_url_https) {
        media_urls.push(item.media_url_https);
      }
    });
    
  } catch (error) {
    console.warn('⚠️ Error extracting media URLs:', error);
  }
  
  return [...new Set(media_urls)]; // Remove duplicates
};

/**
 * Get CSRF token from browser cookies
 * @returns {Promise<string|null>} CSRF token or null if not found
 */
const getCsrfToken = () => {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: TWITTER_URL, name: 'ct0' }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error getting CSRF token:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      
      if (cookie) {
        console.log('🔑 CSRF token retrieved successfully');
        resolve(cookie.value);
      } else {
        console.log('⚠️ No CSRF token found in cookies');
        resolve(null);
      }
    });
  });
};

/**
 * Check if user is logged into X.com by verifying CSRF token
 * @returns {Promise<boolean>} True if logged in, false otherwise
 */
const checkXLoginStatus = async () => {
  try {
    const token = await getCsrfToken();
    if (!token) {
      console.log('❌ User not logged into X.com (no CSRF token)');
      return false;
    }
    
    console.log('✅ User is logged into X.com');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking X login status:', error);
    return false;
  }
};

/**
 * Generate a client UUID for request headers
 * @returns {string} UUID string
 */
const generateClientUUID = () => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

/**
 * Check if cursor is different from previous one (indicates more data available)
 * @param {string|null} currentCursor - Current cursor
 * @param {string|null} nextCursor - Next cursor from API
 * @returns {string|null} Next cursor or null if no more data
 */
const checkNextCursor = (currentCursor, nextCursor) => {
  return nextCursor === currentCursor ? null : nextCursor;
};

console.log('📡 XSaved v2 Fetcher utility loaded - ready for X.com API integration'); 
;// ./src/extension/utils/communicator.js
/**
 * XSaved Extension v2 - Communication Utilities
 * Robust message passing between service worker, content scripts, and popup
 * Adapted from proven v1 extension with enhancements
 */

/**
 * Safely notify content script in a specific tab
 * @param {number} tabId - Tab ID to send message to
 * @param {Object} message - Message object to send
 * @returns {Promise} Promise that resolves with response or silently on error
 */
const notifyContentScript = (tabId, message) => new Promise((resolve, reject) => {
  if (!tabId) {
    resolve(); // Don't reject, just resolve silently
    return;
  }
  
  // Check if tab exists first
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      // Tab doesn't exist, resolve silently
      console.log(`📱 Tab ${tabId} not found (normal during navigation)`);
      resolve();
      return;
    }
    
    // Check if tab is still valid (not chrome:// or extension pages)
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log(`📱 Tab ${tabId} not valid for messaging`);
      resolve();
      return;
    }
    
    // Tab exists and is valid, send message
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not available, resolve silently (common during navigation)
        console.log(`📱 Content script not available in tab ${tabId} (normal during reload/navigation)`);
        resolve();
      } else {
        console.log(`📱 Message sent to tab ${tabId}:`, message.action || 'unknown');
        resolve(response);
      }
    });
  });
});

/**
 * Safely notify popup (if open)
 * @param {Object} message - Message object to send
 */
const notifyPopup = (message) => {
  try {
    chrome.runtime.sendMessage(message);
    console.log(`🪟 Message sent to popup:`, message.action || 'unknown');
  } catch (error) {
    // Popup might not be open, fail silently
    console.log(`🪟 Popup not available (normal when closed)`);
  }
};

/**
 * Update progress in content script with enhanced error handling
 * @param {number} current - Current progress count
 * @param {number} total - Total expected count
 * @param {number} tabId - Tab ID to notify
 * @param {Object} metadata - Additional progress metadata
 */
const updateProgress = async (current, total, tabId, metadata = {}) => {
  if (!tabId) return;
  
  try {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const progressMessage = { 
      action: "updateProgress", 
      bookmarkCount: current,
      totalBookmarks: total,
      percentage: percentage,
      phase: metadata.phase || 'processing',
      message: metadata.message || `Processing ${current}/${total}...`,
      ...metadata
    };
    
    await notifyContentScript(tabId, progressMessage);
    
  } catch (error) {
    // Silently handle tab/content script errors
    console.log("📱 Tab unavailable for progress update (normal during long operations)");
  }
};

/**
 * Broadcast message to all X.com tabs
 * @param {Object} message - Message to broadcast
 * @param {Object} options - Broadcast options
 * @param {boolean} options.activeOnly - Only send to active tabs
 * @returns {Promise<Array>} Array of responses from tabs
 */
const broadcastToXTabs = async (message, options = {}) => {
  const { activeOnly = false } = options;
  
  return new Promise((resolve) => {
    // Query for X.com tabs
    const queryOptions = { 
      url: ["https://twitter.com/*", "https://x.com/*"]
    };
    
    if (activeOnly) {
      queryOptions.active = true;
    }
    
    chrome.tabs.query(queryOptions, async (tabs) => {
      console.log(`📡 Broadcasting to ${tabs.length} X.com tabs:`, message.action || 'unknown');
      
      const responses = [];
      
      // Send to all matching tabs
      for (const tab of tabs) {
        try {
          const response = await notifyContentScript(tab.id, message);
          responses.push({ tabId: tab.id, response });
        } catch (error) {
          responses.push({ tabId: tab.id, error: error.message });
        }
      }
      
      resolve(responses);
    });
  });
};

/**
 * Send message with retry logic
 * @param {number} tabId - Tab ID to send message to
 * @param {Object} message - Message to send
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.retryDelay - Delay between retries in ms
 * @returns {Promise} Promise that resolves with response
 */
const sendMessageWithRetry = async (tabId, message, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await notifyContentScript(tabId, message);
      return response;
      
    } catch (error) {
      console.warn(`🔄 Message retry ${attempt + 1}/${maxRetries} for tab ${tabId}`);
      
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

/**
 * Check if content script is available in tab
 * @param {number} tabId - Tab ID to check
 * @returns {Promise<boolean>} True if content script is available
 */
const isContentScriptAvailable = async (tabId) => {
  try {
    const response = await notifyContentScript(tabId, { action: 'ping' });
    return !!response;
  } catch (error) {
    return false;
  }
};

/**
 * Get active X.com tab ID
 * @returns {Promise<number|null>} Active X.com tab ID or null
 */
const getActiveXTabId = async () => {
  return new Promise((resolve) => {
    chrome.tabs.query({ 
      active: true, 
      currentWindow: true,
      url: ["https://twitter.com/*", "https://x.com/*"]
    }, (tabs) => {
      resolve(tabs.length > 0 ? tabs[0].id : null);
    });
  });
};

/**
 * Wait for content script to be ready in tab
 * @param {number} tabId - Tab ID to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if content script becomes available
 */
const waitForContentScript = async (tabId, timeout = 10000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isContentScriptAvailable(tabId)) {
      return true;
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
};

/**
 * Enhanced state update broadcaster with filtering
 * @param {Object} state - State object to broadcast
 * @param {Object} options - Broadcast options
 * @param {Array} options.includeActions - Only send to tabs expecting these actions
 * @param {boolean} options.onlyActiveTab - Only send to active tab
 */
const broadcastStateUpdate = async (state, options = {}) => {
  const { includeActions = [], onlyActiveTab = false } = options;
  
  const stateMessage = {
    action: "stateUpdate",
    ...state,
    timestamp: Date.now()
  };
  
  try {
    if (onlyActiveTab) {
      const activeTabId = await getActiveXTabId();
      if (activeTabId) {
        await notifyContentScript(activeTabId, stateMessage);
      }
    } else {
      await broadcastToXTabs(stateMessage);
    }
    
    // Also notify popup
    notifyPopup(stateMessage);
    
  } catch (error) {
    console.error('❌ Error broadcasting state update:', error);
  }
};

/**
 * Message queue for handling high-frequency updates
 */
class MessageQueue {
  constructor(options = {}) {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.processInterval = options.processInterval || 100;
  }
  
  /**
   * Add message to queue
   * @param {number} tabId - Tab ID
   * @param {Object} message - Message to queue
   */
  enqueue(tabId, message) {
    // Prevent queue overflow
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('📬 Message queue full, dropping oldest message');
      this.queue.shift();
    }
    
    this.queue.push({ tabId, message, timestamp: Date.now() });
    this.processQueue();
  }
  
  /**
   * Process queued messages
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { tabId, message } = this.queue.shift();
      
      try {
        await notifyContentScript(tabId, message);
      } catch (error) {
        console.warn('📬 Queued message failed:', error.message);
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, this.processInterval));
    }
    
    this.processing = false;
  }
}

// Global message queue instance
const messageQueue = new MessageQueue();

/**
 * Queue message for delivery (useful for high-frequency updates)
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message to queue
 */
const queueMessage = (tabId, message) => {
  messageQueue.enqueue(tabId, message);
};

/**
 * Heartbeat system to maintain connection with content scripts
 */
class HeartbeatManager {
  constructor() {
    this.connectedTabs = new Set();
    this.heartbeatInterval = null;
  }
  
  start() {
    if (this.heartbeatInterval) return;
    
    console.log('💓 Starting heartbeat manager');
    
    this.heartbeatInterval = setInterval(async () => {
      await this.checkConnections();
    }, 30000); // Check every 30 seconds
  }
  
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💓 Heartbeat manager stopped');
    }
  }
  
  async checkConnections() {
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ url: ["https://twitter.com/*", "https://x.com/*"] }, resolve);
    });
    
    for (const tab of tabs) {
      const isConnected = await isContentScriptAvailable(tab.id);
      
      if (isConnected) {
        this.connectedTabs.add(tab.id);
      } else {
        this.connectedTabs.delete(tab.id);
      }
    }
    
    console.log(`💓 Heartbeat: ${this.connectedTabs.size} content scripts connected`);
  }
  
  isTabConnected(tabId) {
    return this.connectedTabs.has(tabId);
  }
}

// Global heartbeat manager
const heartbeatManager = new HeartbeatManager();

console.log('📡 XSaved v2 Communicator utility loaded - ready for message passing'); 
;// ./src/extension/service-worker.ts
/**
 * XSaved Extension v2 - Enhanced Service Worker
 * Combines proven smart scheduling with IndexedDB and Search Engine
 */
// Import our Components 1 & 2 (TypeScript source - Webpack will bundle)


// Import existing proven utilities (keep .js extension for webpack)



// ===============================
// PROVEN SCHEDULING CONSTANTS (Keep from background.js)
// ===============================
const SCHEDULE_INTERVALS = {
    FREQUENT: 5, // 5 minutes - when user is active
    NORMAL: 15, // 15 minutes - default
    INFREQUENT: 60, // 1 hour - when user is inactive
    OFFLINE: 240 // 4 hours - when user seems offline
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
        this.initialized = false;
        this.db = null;
        this.searchEngine = null;
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            console.log('🚀 Initializing Enhanced Service Worker...');
            // Initialize IndexedDB (Component 1) - USING STATIC IMPORTS
            console.log('📀 Initializing IndexedDB...');
            try {
                await db.initialize();
                this.db = db;
                console.log('✅ IndexedDB initialized successfully');
            }
            catch (error) {
                console.error('❌ Failed to initialize IndexedDB:', error);
                this.db = null;
            }
            // Initialize Search Engine (Component 2) - USING STATIC IMPORTS
            console.log('🔍 Initializing Search Engine...');
            try {
                this.searchEngine = searchEngine;
                console.log('✅ Search Engine initialized successfully');
            }
            catch (error) {
                console.error('❌ Failed to initialize Search Engine:', error);
                this.searchEngine = null;
            }
            // Load existing sync state from chrome.storage
            await this.loadSyncState();
            // Set up smart scheduling (keep existing logic)
            this.setupSmartScheduling();
            console.log('✅ Enhanced Service Worker initialized successfully');
            this.initialized = true;
        }
        catch (error) {
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
        }
        else if (timeSinceActivity < USER_ACTIVITY_THRESHOLD * 2) {
            currentScheduleInterval = SCHEDULE_INTERVALS.NORMAL;
        }
        else if (timeSinceActivity < USER_ACTIVITY_THRESHOLD * 4) {
            currentScheduleInterval = SCHEDULE_INTERVALS.INFREQUENT;
        }
        else {
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
                service_worker_broadcastStateUpdate();
                return { success: true, data: result.data };
            }
            else {
                console.error('❌ Failed to save bookmark to IndexedDB:', result.error);
                return {
                    success: false,
                    error: result.error || 'IndexedDB save failed',
                    details: `Database addBookmark operation failed for bookmark ${bookmark.id}`
                };
            }
        }
        else {
            // Fallback to chrome.storage.local for testing
            console.log('💾 Using chrome.storage.local for bookmark storage (testing mode)');
            try {
                const key = `bookmark_${bookmark.id}`;
                await chrome.storage.local.set({ [key]: bookmarkEntity });
                console.log(`✅ Saved bookmark ${bookmark.id} to local storage`);
                extractionState.bookmarkCount++;
                service_worker_broadcastStateUpdate();
                return { success: true, data: bookmarkEntity };
            }
            catch (storageError) {
                console.error('❌ Failed to save bookmark to chrome.storage:', storageError);
                return {
                    success: false,
                    error: storageError.message || 'Chrome storage save failed',
                    details: `Chrome storage operation failed for bookmark ${bookmark.id}: ${storageError.message}`
                };
            }
        }
    }
    catch (error) {
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
                }
                else {
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
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('❌ Extraction failed:', error);
        updateExtractionState({
            phase: 'idle',
            message: `❌ Extraction failed: ${error.message}`,
            percentage: 0
        });
    }
    finally {
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
        case "exportBookmarks":
            handleExportBookmarks(request.bookmarks, request.options, sendResponse);
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
            sendResponse({ success: true, status: "started" });
        }
        else {
            sendResponse({ success: false, error: "X.com login required" });
        }
    }
    catch (error) {
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
        }
        else {
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
    }
    catch (error) {
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
        }
        else {
            console.error('❌ Bookmark save failed:', result.error);
            sendResponse({
                success: false,
                error: result.error || 'Unknown database error',
                details: result.details || 'Database operation failed without details'
            });
        }
    }
    catch (error) {
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
    }
    catch (error) {
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
        }
        else {
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
    }
    catch (error) {
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
            const blob = result.data;
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
        }
        else {
            sendResponse({
                success: false,
                error: result.error || 'Export failed'
            });
        }
    }
    catch (error) {
        console.error('Export error:', error);
        sendResponse({
            success: false,
            error: error.message || 'Export failed'
        });
    }
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
            bookmark_timestamp: bookmark.bookmark_timestamp,
            tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
            url: bookmark.url,
            // Only include safe, serializable properties
            // Exclude any properties that might contain circular references
        }));
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('❌ [SW] Array buffer to base64 conversion failed:', error);
        // Return empty string as fallback
        return '';
    }
};
const tokenizeText = (text) => {
    if (!text)
        return [];
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
    service_worker_broadcastStateUpdate();
};
const service_worker_broadcastStateUpdate = () => {
    const stateMessage = {
        action: "stateUpdate",
        extractionState: extractionState,
        isExtracting: isExtracting
    };
    // Notify content scripts
    chrome.tabs.query({ url: "https://x.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            notifyContentScript(tab.id, stateMessage).catch(() => { });
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
        }
        catch (error) {
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
                'id', 'text', 'author', 'created_at', 'bookmark_timestamp',
                'tags', 'url'
            ];
            const rows = bookmarks.map(bookmark => [
                bookmark.id || '',
                this.escapeCsvField(bookmark.text || ''),
                bookmark.author || '',
                bookmark.created_at || '',
                bookmark.bookmark_timestamp || '',
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
        }
        catch (error) {
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
                    bookmark_timestamp: bookmark.bookmark_timestamp,
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
        }
        catch (error) {
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
            const maxBookmarksForPDF = 500;
            const limitedBookmarks = bookmarks.slice(0, maxBookmarksForPDF);
            if (bookmarks.length > maxBookmarksForPDF) {
                console.warn(`⚠️ [SW] PDF export limited to ${maxBookmarksForPDF} bookmarks (requested: ${bookmarks.length})`);
            }
            // Create a simplified HTML content for PDF
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>XSaved Bookmarks Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .bookmark { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
        .author { color: #666; font-size: 14px; }
        .tags { color: #888; font-size: 12px; }
        .date { color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <h1>XSaved Bookmarks Export</h1>
    <p>Exported on: ${new Date().toLocaleString()}</p>
    <p>Total bookmarks: ${limitedBookmarks.length}${bookmarks.length > maxBookmarksForPDF ? ` (limited from ${bookmarks.length})` : ''}</p>
    <hr>
    ${limitedBookmarks.map(bookmark => `
        <div class="bookmark">
            <div class="text">${this.escapeHTML(bookmark.text || '')}</div>
            <div class="author">By: ${bookmark.author || 'Unknown'}</div>
            <div class="date">Created: ${bookmark.created_at || 'Unknown'}</div>
            <div class="tags">Tags: ${(bookmark.tags || []).join(', ') || 'None'}</div>
        </div>
    `).join('')}
</body>
</html>`;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            return {
                success: true,
                data: blob,
                filename: options.filename || `bookmarks-${Date.now()}.html`,
                size: blob.size,
                metadata: {
                    originalCount: bookmarks.length,
                    exportedCount: limitedBookmarks.length,
                    limited: bookmarks.length > maxBookmarksForPDF
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'PDF generation failed',
                filename: options.filename || `bookmarks-${Date.now()}.html`
            };
        }
    }
    escapeCsvField(field) {
        if (!field)
            return '';
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
        }
        catch (error) {
            return JSON.stringify({ error: 'Object could not be stringified due to circular references' });
        }
    }
}
// Export for testing in Service Worker environment
if (typeof self !== 'undefined') {
    self.testXSaved = {
        extractionState,
        serviceWorker,
        verifyDatabase: async () => {
            if (serviceWorker.db) {
                await serviceWorker.db.verifyDatabase();
            }
            else {
                console.error('❌ Database not initialized');
            }
        },
        getStats: async () => {
            if (serviceWorker.db) {
                const stats = await serviceWorker.db.getStats();
                console.log('📊 Database stats:', stats);
                return stats;
            }
            else {
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
            }
            catch (error) {
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
                }
                else {
                    console.error('❌ Failed to list bookmarks:', result.error);
                }
            }
            catch (error) {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
                }
                else {
                    console.error('❌ Failed to clear database:', result.error);
                }
            }
            catch (error) {
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
            }
            catch (error) {
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

/******/ })()
;
//# sourceMappingURL=service-worker.js.map