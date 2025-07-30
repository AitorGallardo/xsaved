/**
 * XSaved Extension v2 - Database Manager
 * High-performance IndexedDB wrapper with transaction management
 */
import { DB_CONFIG, STORES, PERFORMANCE_CONFIG, DB_ERRORS } from './config';
export class XSavedDatabase {
    db = null;
    isInitialized = false;
    initPromise = null;
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
            // Check IndexedDB support
            if (!window.indexedDB) {
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
                // Setup error handling
                this.db.onerror = (error) => {
                    console.error('Database error:', error);
                };
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this._createSchema(db);
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
            console.error('Transaction error:', event);
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
        return new Promise((resolve, reject) => {
            const transaction = this._createTransaction(STORES.BOOKMARKS, 'readwrite');
            const store = transaction.objectStore(STORES.BOOKMARKS);
            // Ensure required fields
            const bookmarkToAdd = {
                ...bookmark,
                bookmark_timestamp: bookmark.bookmark_timestamp || new Date().toISOString(),
                tags: bookmark.tags || [],
                textTokens: this._tokenizeText(bookmark.text)
            };
            const request = store.add(bookmarkToAdd);
            request.onsuccess = () => {
                resolve(bookmarkToAdd);
            };
            request.onerror = () => {
                reject(new Error('Failed to add bookmark to store'));
            };
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
export const db = new XSavedDatabase();
//# sourceMappingURL=database.js.map