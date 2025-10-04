/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 286:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   xu: () => (/* binding */ Limits)
/* harmony export */ });
/* unused harmony exports DEFAULT_LIMITS, PRODUCTION_LIMITS, DEVELOPMENT_LIMITS, getLimitsConfig, validateLimit, getLimit */
/**
 * XSaved Extension v2 - Centralized Limits Configuration
 * Prevents hardcoded limits and ensures consistent behavior across the application
 */
/**
 * Default limits configuration
 * These values are carefully chosen based on performance testing and user experience
 */
const DEFAULT_LIMITS = {
    pagination: {
        initialLoad: 200, // First load: 200 bookmarks for good UX
        pageSize: 200, // Each subsequent load: 200 more bookmarks
        maxPages: 50, // Maximum 50 pages (10,000 bookmarks total)
        scrollThreshold: 0.9 // Trigger next load when 90% scrolled
    },
    search: {
        defaultLimit: 5000, // Default search: 3000 results (matches content script)
        maxSearchLimit: 20000, // Maximum search: 10,000 results
        quickSearchLimit: 20, // Fast search: 20 results
        textSearchLimit: 3000, // Text search: 3000 results
        tagSearchLimit: 50, // Tag search: 50 results
        authorSearchLimit: 50 // Author search: 50 results
    },
    database: {
        defaultQueryLimit: 50, // Default database: 50 results
        maxQueryLimit: 10000, // Maximum database: 10,000 results
        substringSearchLimit: 5000, // Substring search: 5000 results
        indexSearchLimit: 2000, // Index search: 2000 results
        popularTagsLimit: 20, // Popular tags: 20 results
        searchTagsLimit: 10 // Tag search: 10 results
    },
    performance: {
        batchSize: 1000, // Bulk operations: 1000 items
        cacheSize: 100, // Cache: 100 entries
        maxBookmarksForExport: 500, // Export: 500 bookmarks max
        maxTokensPerBookmark: 100, // Tokenization: 100 tokens max
        maxTagsPerBookmark: 50 // Tags: 50 tags max per bookmark
    },
    ui: {
        gridColumns: 3, // Grid: 3 columns
        maxVisibleBookmarks: 3000, // UI: 3000 visible bookmarks
        debounceMs: 300, // Search: 300ms debounce
        loadingTimeoutMs: 5000 // Loading: 5s timeout
    }
};
/**
 * Production limits configuration
 * More conservative limits for production environments
 */
const PRODUCTION_LIMITS = {
    ...DEFAULT_LIMITS,
    pagination: {
        ...DEFAULT_LIMITS.pagination,
        initialLoad: 100, // Production: 100 bookmarks first load
        pageSize: 100, // Production: 100 bookmarks per page
        maxPages: 100 // Production: 100 pages max
    },
    search: {
        ...DEFAULT_LIMITS.search,
        defaultLimit: 2000, // Production: 2000 default results
        maxSearchLimit: 5000 // Production: 5000 max results
    }
};
/**
 * Development limits configuration
 * More generous limits for development and testing
 */
const DEVELOPMENT_LIMITS = {
    ...DEFAULT_LIMITS,
    search: {
        ...DEFAULT_LIMITS.search,
        defaultLimit: 5000, // Dev: 5000 default results
        maxSearchLimit: 20000 // Dev: 20,000 max results
    },
    database: {
        ...DEFAULT_LIMITS.database,
        defaultQueryLimit: 100, // Dev: 100 default results
        maxQueryLimit: 20000 // Dev: 20,000 max results
    }
};
/**
 * Get limits configuration - simplified version
 */
function getLimitsConfig() {
    return DEFAULT_LIMITS;
}
/**
 * Validate limit value against configuration
 */
function validateLimit(limit, category, key) {
    const config = getLimitsConfig();
    const maxLimit = config[category][key];
    if (limit > maxLimit) {
        console.warn(`⚠️ Limit ${limit} exceeds maximum ${maxLimit} for ${category}.${key}`);
        return maxLimit;
    }
    return limit;
}
/**
 * Get limit with fallback
 */
function getLimit(requestedLimit, category, key) {
    const config = getLimitsConfig();
    const defaultLimit = config[category][key];
    if (requestedLimit === undefined || requestedLimit === null) {
        return defaultLimit;
    }
    return validateLimit(requestedLimit, category, key);
}
// Export commonly used limit getters for convenience
const Limits = {
    // Pagination
    get initialLoad() { return getLimitsConfig().pagination.initialLoad; },
    get pageSize() { return getLimitsConfig().pagination.pageSize; },
    get maxPages() { return getLimitsConfig().pagination.maxPages; },
    get scrollThreshold() { return getLimitsConfig().pagination.scrollThreshold; },
    // Search
    get defaultSearchLimit() { return getLimitsConfig().search.defaultLimit; },
    get maxSearchLimit() { return getLimitsConfig().search.maxSearchLimit; },
    get quickSearchLimit() { return getLimitsConfig().search.quickSearchLimit; },
    get textSearchLimit() { return getLimitsConfig().search.textSearchLimit; },
    get tagSearchLimit() { return getLimitsConfig().search.tagSearchLimit; },
    get authorSearchLimit() { return getLimitsConfig().search.authorSearchLimit; },
    // Database
    get defaultQueryLimit() { return getLimitsConfig().database.defaultQueryLimit; },
    get maxQueryLimit() { return getLimitsConfig().database.maxQueryLimit; },
    get substringSearchLimit() { return getLimitsConfig().database.substringSearchLimit; },
    get indexSearchLimit() { return getLimitsConfig().database.indexSearchLimit; },
    get popularTagsLimit() { return getLimitsConfig().database.popularTagsLimit; },
    get searchTagsLimit() { return getLimitsConfig().database.searchTagsLimit; },
    // Performance
    get batchSize() { return getLimitsConfig().performance.batchSize; },
    get cacheSize() { return getLimitsConfig().performance.cacheSize; },
    get maxBookmarksForExport() { return getLimitsConfig().performance.maxBookmarksForExport; },
    get maxTokensPerBookmark() { return getLimitsConfig().performance.maxTokensPerBookmark; },
    get maxTagsPerBookmark() { return getLimitsConfig().performance.maxTagsPerBookmark; },
    // UI
    get gridColumns() { return getLimitsConfig().ui.gridColumns; },
    get maxVisibleBookmarks() { return getLimitsConfig().ui.maxVisibleBookmarks; },
    get debounceMs() { return getLimitsConfig().ui.debounceMs; },
    get loadingTimeoutMs() { return getLimitsConfig().ui.loadingTimeoutMs; }
};


/***/ }),

/***/ 709:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  createUserDatabase: () => (/* reexport */ createUserDatabase),
  db: () => (/* reexport */ db)
});

// UNUSED EXPORTS: DATABASE_NAME, DATABASE_VERSION, DB_CONFIG, DB_ERRORS, DEFAULT_SETTINGS, PERFORMANCE_CONFIG, STORES, XSavedDatabase

// EXTERNAL MODULE: ./node_modules/dexie/dist/dexie.min.js
var dexie_min = __webpack_require__(744);
;// ./node_modules/dexie/import-wrapper-prod.mjs
// Making the module version consumable via require - to prohibit
// multiple occurrancies of the same module in the same app
// (dual package hazard, https://nodejs.org/api/packages.html#dual-package-hazard)

const DexieSymbol = Symbol.for("Dexie");
const Dexie = globalThis[DexieSymbol] || (globalThis[DexieSymbol] = dexie_min);
if (dexie_min.semVer !== Dexie.semVer) {
    throw new Error(`Two different versions of Dexie loaded in the same app: ${dexie_min.semVer} and ${Dexie.semVer}`);
}
const {
    liveQuery, mergeRanges, rangesOverlap, RangeSet, cmp, Entity,
    PropModification, replacePrefix, add, remove } = Dexie;

/* harmony default export */ const import_wrapper_prod = (Dexie);

// EXTERNAL MODULE: ./src/config/limits.ts
var limits = __webpack_require__(286);
;// ./src/db/database.ts
/**
 * XSaved Extension v2 - Consolidated Database Layer
 * Single Dexie implementation with consistent API
 * Replaces: database.ts (877 lines) + database-dexie.ts (534 lines)
 */


// ========================
// DATABASE SCHEMA DESIGN
// ========================
class XSavedDatabase extends import_wrapper_prod {
    constructor(dbName) {
        // Use provided name or default to 'XSavedDB'
        const databaseName = dbName || 'XSavedDB';
        super(databaseName);
        this.isInitialized = false;
        console.log(`🗄️ Initializing database: ${databaseName}`);
        // Define schema with indexes
        this.version(1).stores({
            // Bookmarks: Primary storage with multi-entry indexes for fast queries
            bookmarks: `
        id,
        author,
        created_at,
        bookmarked_at,
        *tags,
        *textTokens
      `,
            // Tags: Separate analytics table for tag management
            tags: `
        name,
        usageCount,
        createdAt,
        category
      `,
            // Collections: User-defined bookmark groupings
            collections: `
        id,
        name,
        createdAt,
        *bookmarkIds
      `,
            // Settings: App configuration
            settings: `
        key,
        value,
        updatedAt
      `,
            // Search Index: Full-text search optimization
            searchIndex: `
        bookmarkId,
        *tokens,
        relevanceScore,
        lastUpdated
      `
        });
        // Version 2: Add avatar_url field to bookmarks
        // Note: Dexie automatically handles schema changes by preserving existing data
        this.version(2).stores({
            // Bookmarks: Updated schema with avatar_url field
            bookmarks: `
        id,
        author,
        avatar_url,
        created_at,
        bookmarked_at,
        *tags,
        *textTokens
      `,
            // Keep other stores unchanged
            tags: `
        name,
        usageCount,
        createdAt,
        category
      `,
            collections: `
        id,
        name,
        createdAt,
        *bookmarkIds
      `,
            settings: `
        key,
        value,
        updatedAt
      `,
            searchIndex: `
        bookmarkId,
        *tokens,
        relevanceScore,
        lastUpdated
      `
        });
        // Add hooks for automatic data processing
        this.bookmarks.hook('creating', (primKey, obj, trans) => {
            // Auto-generate textTokens if not provided
            if (!obj.textTokens) {
                obj.textTokens = this.tokenizeBookmark(obj);
            }
            // Ensure both timestamps are valid ISO strings
            const now = new Date().toISOString();
            if (!obj.created_at || !this.isValidDate(obj.created_at)) {
                obj.created_at = now;
                console.warn(`⚠️ Invalid created_at for ${obj.id}, using current time`);
            }
            else if (!obj.created_at.includes('T')) {
                // Convert Twitter format to ISO format
                obj.created_at = new Date(obj.created_at).toISOString();
            }
            if (!obj.bookmarked_at || !this.isValidDate(obj.bookmarked_at)) {
                obj.bookmarked_at = obj.created_at || now;
                console.warn(`⚠️ Invalid bookmarked_at for ${obj.id}, using created_at`);
            }
            else if (!obj.bookmarked_at.includes('T')) {
                // Convert Twitter format to ISO format
                obj.bookmarked_at = new Date(obj.bookmarked_at).toISOString();
            }
            console.log(`🔄 Creating bookmark: ${obj.id}`);
        });
        this.bookmarks.hook('updating', (modifications, primKey, obj, trans) => {
            console.log(`🔄 Updating bookmark: ${primKey}`, modifications);
            // Auto-regenerate textTokens if any searchable field was modified
            const mods = modifications;
            if (mods.text !== undefined || mods.author !== undefined || mods.tags !== undefined) {
                // Merge current object with modifications to get full context
                const currentObj = obj;
                const updatedObj = { ...currentObj, ...mods };
                mods.textTokens = this.tokenizeBookmark(updatedObj);
                console.log(`🔄 Regenerated textTokens for bookmark: ${primKey}`);
            }
        });
        this.bookmarks.hook('deleting', (primKey, obj, trans) => {
            console.log(`🗑️ Deleting bookmark: ${primKey}`);
        });
    }
    // ========================
    // INITIALIZATION & UTILITIES
    // ========================
    /**
     * Initialize database connection
     */
    async initialize() {
        try {
            await this.open();
            this.isInitialized = true;
            console.log('✅ Consolidated Dexie database initialized');
            return { success: true };
        }
        catch (error) {
            console.error('❌ Failed to initialize database:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Database initialization failed'
            };
        }
    }
    /**
     * Get database instance (for compatibility)
     */
    get database() {
        try {
            return this.backendDB();
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Performance tracking wrapper
     */
    async withPerformanceTracking(operation, fn) {
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
            if (duration > 50) { // Log slow operations
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
     * Add a bookmark with consistent API
     */
    async addBookmark(bookmark) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('addBookmark', () => this._addBookmarkInternal(bookmark));
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
    /**
     * Internal bookmark addition
     */
    async _addBookmarkInternal(bookmark) {
        await this.bookmarks.add(bookmark);
        console.log(`✅ Bookmark added successfully: ${bookmark.id}`);
        return bookmark;
    }
    /**
     * Upsert a bookmark (insert or update if exists)
     */
    async upsertBookmark(bookmark) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('upsertBookmark', () => this._upsertBookmarkInternal(bookmark));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upsert bookmark'
            };
        }
    }
    /**
     * Internal bookmark upsert
     */
    async _upsertBookmarkInternal(bookmark) {
        console.log('🔍 DEBUG _upsertBookmarkInternal called with:');
        console.log('  bookmark.id:', bookmark.id);
        console.log('  bookmark.tags:', bookmark.tags);
        console.log('  bookmark.tags type:', typeof bookmark.tags);
        console.log('  bookmark.tags is array:', Array.isArray(bookmark.tags));
        await this.bookmarks.put(bookmark);
        console.log(`✅ Bookmark upserted successfully: ${bookmark.id}`);
        // Verify what was actually stored
        const stored = await this.bookmarks.get(bookmark.id);
        console.log('🔍 DEBUG Verification - stored bookmark tags:', stored?.tags);
        return bookmark;
    }
    /**
     * Get bookmark by ID
     */
    async getBookmark(id) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('getBookmark', () => this.bookmarks.get(id));
            return {
                success: true,
                data: result || null,
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
    /**
     * Update existing bookmark
     */
    async updateBookmark(id, updates) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('updateBookmark', async () => {
                const updated = await this.bookmarks.update(id, updates);
                if (updated) {
                    const updatedBookmark = await this.bookmarks.get(id);
                    console.log(`✅ Bookmark updated: ${id}`);
                    return updatedBookmark || null;
                }
                else {
                    console.warn(`⚠️ Bookmark not found for update: ${id}`);
                    return null;
                }
            });
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update bookmark'
            };
        }
    }
    /**
     * Delete bookmark by ID
     */
    async deleteBookmark(id) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('deleteBookmark', async () => {
                await this.bookmarks.delete(id);
                console.log(`✅ Bookmark deleted: ${id}`);
                return true;
            });
            return {
                success: true,
                data: result,
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
    /**
     * Delete multiple bookmarks by IDs with cleanup
     * @param {string[]} ids - Array of bookmark IDs to delete
     * @returns {Promise<DatabaseResult<{deleted: number, failed: string[]}>>}
     */
    async deleteBulkBookmarks(ids) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('deleteBulkBookmarks', async () => {
                const failed = [];
                let deleted = 0;
                // Use Dexie transaction for atomicity
                await this.transaction('rw', this.bookmarks, this.searchIndex, async () => {
                    for (const id of ids) {
                        try {
                            // Delete from bookmarks table
                            await this.bookmarks.delete(id);
                            // Clean up search index
                            await this.searchIndex.delete(id);
                            deleted++;
                            console.log(`✅ Bulk deleted bookmark: ${id}`);
                        }
                        catch (error) {
                            console.warn(`⚠️ Failed to delete bookmark ${id}:`, error);
                            failed.push(id);
                        }
                    }
                });
                return { deleted, failed };
            });
            console.log(`✅ Bulk delete completed: ${result.deleted} deleted, ${result.failed.length} failed`);
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete bookmarks in bulk'
            };
        }
    }
    /**
     * Delete bookmarks with tag cleanup
     * Removes bookmarks and updates tag usage counts
     * @param {string[]} ids - Array of bookmark IDs to delete
     * @returns {Promise<DatabaseResult<{deleted: number, failed: string[], tagsUpdated: number}>>}
     */
    async deleteBookmarksWithTagCleanup(ids) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('deleteBookmarksWithTagCleanup', async () => {
                const failed = [];
                let deleted = 0;
                const tagUsageChanges = new Map();
                // First, collect tag usage data from bookmarks to be deleted
                const bookmarksToDelete = await this.bookmarks.where('id').anyOf(ids).toArray();
                for (const bookmark of bookmarksToDelete) {
                    if (bookmark.tags && Array.isArray(bookmark.tags)) {
                        for (const tag of bookmark.tags) {
                            tagUsageChanges.set(tag, (tagUsageChanges.get(tag) || 0) + 1);
                        }
                    }
                }
                // Use transaction for atomicity
                await this.transaction('rw', this.bookmarks, this.searchIndex, this.tags, async () => {
                    // Delete bookmarks and search index entries
                    for (const id of ids) {
                        try {
                            await this.bookmarks.delete(id);
                            await this.searchIndex.delete(id);
                            deleted++;
                        }
                        catch (error) {
                            console.warn(`⚠️ Failed to delete bookmark ${id}:`, error);
                            failed.push(id);
                        }
                    }
                    // Update tag usage counts
                    for (const [tagName, decreaseCount] of tagUsageChanges) {
                        try {
                            const tag = await this.tags.get(tagName);
                            if (tag) {
                                const newUsageCount = Math.max(0, tag.usageCount - decreaseCount);
                                if (newUsageCount === 0) {
                                    // Remove tag if no longer used
                                    await this.tags.delete(tagName);
                                }
                                else {
                                    // Update usage count
                                    await this.tags.update(tagName, { usageCount: newUsageCount });
                                }
                            }
                        }
                        catch (error) {
                            console.warn(`⚠️ Failed to update tag usage for ${tagName}:`, error);
                        }
                    }
                });
                return { deleted, failed, tagsUpdated: tagUsageChanges.size };
            });
            console.log(`✅ Delete with tag cleanup completed: ${result.deleted} deleted, ${result.tagsUpdated} tags updated`);
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete bookmarks with tag cleanup'
            };
        }
    }
    /**
     * Get all bookmarks with optional sorting and pagination
     * ENHANCED: Now supports offset for pagination
     */
    async getAllBookmarks(options = {}) {
        try {
            console.log(`🔍 getAllBookmarks called with options:`, options);
            // OPTION A: Ultra-simple Dexie pagination (works because dates are normalized when saving)
            let query = this.bookmarks.orderBy(options.sortBy || 'created_at');
            // Apply sort order
            if (options.sortOrder === 'asc') {
                // Keep ascending order
            }
            else {
                query = query.reverse(); // Default to descending (newest first)
            }
            // Apply pagination (Dexie handles this efficiently)
            if (options.offset) {
                query = query.offset(options.offset);
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }
            const bookmarks = await query.toArray();
            console.log(`🔍 getAllBookmarks found ${bookmarks.length} bookmarks in database`);
            // Clean: No console logging
            return bookmarks;
        }
        catch (error) {
            console.error('❌ Failed to get all bookmarks:', error);
            return [];
        }
    }
    // ========================
    // SEARCH OPERATIONS
    // ========================
    /**
     * Search bookmarks by tags
     */
    async searchByTags(tags, options = {}) {
        try {
            let query;
            if (options.matchAll) {
                // AND operation: bookmark must have ALL tags
                query = this.bookmarks.where('tags').anyOf(tags);
                const results = await query.toArray();
                // Filter to only bookmarks that have ALL required tags
                return results.filter(bookmark => tags.every(tag => bookmark.tags?.includes(tag))).slice(0, options.limit || limits/* Limits */.xu.defaultQueryLimit);
            }
            else {
                // OR operation: bookmark must have ANY of the tags
                query = this.bookmarks
                    .where('tags')
                    .anyOf(tags)
                    .reverse()
                    .limit(options.limit || limits/* Limits */.xu.defaultQueryLimit);
                return await query.toArray();
            }
        }
        catch (error) {
            console.error('❌ Tag search failed:', error);
            return [];
        }
    }
    /**
     * Search bookmarks by author
     */
    async searchByAuthor(author, options = {}) {
        try {
            const results = await this.bookmarks
                .where('author')
                .equalsIgnoreCase(author)
                .reverse()
                .limit(options.limit || limits/* Limits */.xu.defaultQueryLimit)
                .toArray();
            console.log(`👤 Found ${results.length} bookmarks by @${author}`);
            return results;
        }
        catch (error) {
            console.error(`❌ Author search failed for @${author}:`, error);
            return [];
        }
    }
    /**
     * Get all unique authors with bookmark count
     */
    async getAllAuthors() {
        try {
            const authorMap = new Map();
            // Use the author index for efficient grouping
            await this.bookmarks.orderBy('author').each(bookmark => {
                const author = bookmark.author;
                authorMap.set(author, (authorMap.get(author) || 0) + 1);
            });
            // Convert to array and sort by count
            const authors = Array.from(authorMap.entries())
                .map(([author, count]) => ({ author, count }))
                .sort((a, b) => b.count - a.count);
            console.log(`👥 Found ${authors.length} unique authors`);
            return authors;
        }
        catch (error) {
            console.error('❌ Failed to get all authors:', error);
            return [];
        }
    }
    /**
     * Get all unique authors with bookmark count and avatar URLs
     */
    async getAllAuthorsWithAvatars() {
        try {
            const authorMap = new Map();
            // Use the author index for efficient grouping
            await this.bookmarks.orderBy('author').each(bookmark => {
                const author = bookmark.author;
                const existing = authorMap.get(author);
                authorMap.set(author, {
                    count: (existing?.count || 0) + 1,
                    avatar_url: existing?.avatar_url || bookmark.avatar_url
                });
            });
            // Convert to array and sort by count
            const authors = Array.from(authorMap.entries())
                .map(([author, data]) => ({ author, count: data.count, avatar_url: data.avatar_url }))
                .sort((a, b) => b.count - a.count);
            console.log(`👥 Found ${authors.length} unique authors with avatars`);
            return authors;
        }
        catch (error) {
            console.error('❌ Failed to get all authors with avatars:', error);
            return [];
        }
    }
    /**
     * Search authors by name (for autocomplete)
     */
    async searchAuthors(query, limit = 10) {
        try {
            if (!query.trim()) {
                // Return all authors if no query
                const allAuthors = await this.getAllAuthorsWithAvatars();
                return allAuthors.slice(0, limit);
            }
            const queryLower = query.toLowerCase();
            const authorMap = new Map();
            // Search authors that contain the query string
            await this.bookmarks
                .where('author')
                .startsWithIgnoreCase(query)
                .each(bookmark => {
                const author = bookmark.author;
                const existing = authorMap.get(author);
                authorMap.set(author, {
                    count: (existing?.count || 0) + 1,
                    avatar_url: existing?.avatar_url || bookmark.avatar_url
                });
            });
            // Also search for authors that contain the query (not just start with)
            await this.bookmarks.filter(bookmark => bookmark.author.toLowerCase().includes(queryLower) &&
                !authorMap.has(bookmark.author)).each(bookmark => {
                const author = bookmark.author;
                const existing = authorMap.get(author);
                authorMap.set(author, {
                    count: (existing?.count || 0) + 1,
                    avatar_url: existing?.avatar_url || bookmark.avatar_url
                });
            });
            // Convert to array and sort by count
            const authors = Array.from(authorMap.entries())
                .map(([author, data]) => ({ author, count: data.count, avatar_url: data.avatar_url }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
            console.log(`🔍 Found ${authors.length} authors matching "${query}"`);
            return authors;
        }
        catch (error) {
            console.error(`❌ Author search failed for "${query}":`, error);
            return [];
        }
    }
    // ========================
    // TAG OPERATIONS
    // ========================
    /**
     * Get all tags with usage analytics
     */
    async getAllTags() {
        try {
            return await this.tags.orderBy('usageCount').reverse().toArray();
        }
        catch (error) {
            console.error('❌ Failed to get tags:', error);
            return [];
        }
    }
    /**
     * Get popular tags (by usage count)
     */
    async getPopularTags(limit = limits/* Limits */.xu.popularTagsLimit) {
        try {
            return await this.tags
                .orderBy('usageCount')
                .reverse()
                .limit(limit)
                .toArray();
        }
        catch (error) {
            console.error('❌ Failed to get popular tags:', error);
            return [];
        }
    }
    /**
     * Search tags by name
     */
    async searchTags(query, limit = limits/* Limits */.xu.searchTagsLimit) {
        try {
            if (!query.trim())
                return [];
            return await this.tags
                .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
                .limit(limit)
                .toArray();
        }
        catch (error) {
            console.error('❌ Failed to search tags:', error);
            return [];
        }
    }
    /**
     * Update tag analytics when bookmarks change
     */
    async updateTagAnalytics(tags) {
        if (!tags || tags.length === 0)
            return;
        try {
            const timestamp = new Date().toISOString();
            await this.transaction('rw', this.tags, async () => {
                for (const tagName of tags) {
                    if (!tagName.trim())
                        continue;
                    const existingTag = await this.tags.get(tagName);
                    if (existingTag) {
                        await this.tags.update(tagName, {
                            usageCount: (existingTag.usageCount || 0) + 1
                        });
                    }
                    else {
                        await this.tags.add({
                            name: tagName,
                            usageCount: 1,
                            createdAt: timestamp
                        });
                    }
                }
            });
            console.log(`📊 Updated analytics for ${tags.length} tags`);
        }
        catch (error) {
            console.error('❌ Failed to update tag analytics:', error);
        }
    }
    // ========================
    // UTILITY METHODS
    // ========================
    /**
     * Tokenize text for search indexing
     * ENHANCED: Now includes text, author, and tags for comprehensive search
     */
    tokenizeText(text) {
        if (!text)
            return [];
        return text
            .toLowerCase()
            .replace(/[^\w\s#@]/g, ' ') // Keep hashtags and mentions
            .split(/\s+/)
            .filter(token => token.length > 2) // Only tokens longer than 2 chars
            .slice(0, limits/* Limits */.xu.maxTokensPerBookmark); // Limit tokens per bookmark
    }
    /**
     * Tokenize bookmark for comprehensive search indexing
     * NEW: Includes text, author, and tags
     */
    tokenizeBookmark(bookmark) {
        const tokens = new Set();
        // Tokenize tweet text
        if (bookmark.text) {
            const textTokens = this.tokenizeText(bookmark.text);
            textTokens.forEach(token => tokens.add(token));
        }
        // Tokenize author name
        if (bookmark.author) {
            const authorTokens = this.tokenizeText(bookmark.author);
            authorTokens.forEach(token => tokens.add(token));
        }
        // Tokenize tags
        if (bookmark.tags && Array.isArray(bookmark.tags)) {
            bookmark.tags.forEach(tag => {
                if (typeof tag === 'string') {
                    const tagTokens = this.tokenizeText(tag);
                    tagTokens.forEach(token => tokens.add(token));
                }
            });
        }
        return Array.from(tokens).slice(0, limits/* Limits */.xu.maxTokensPerBookmark); // Limit total tokens per bookmark
    }
    /**
     * Get recent bookmarks (compatibility method for search engine)
     */
    async getRecentBookmarks(options = {}) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('getRecentBookmarks', () => this.getAllBookmarks({
                sortBy: options.sortBy || 'created_at',
                sortOrder: 'desc',
                limit: options.limit || limits/* Limits */.xu.defaultQueryLimit,
                offset: options.offset // CRITICAL FIX: Pass offset to getAllBookmarks
            }));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            console.error(`🔍 getRecentBookmarks error:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get recent bookmarks'
            };
        }
    }
    /**
     * Get bookmarks by tag (compatibility method for search engine)
     */
    async getBookmarksByTag(tag) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('getBookmarksByTag', () => this.searchByTags([tag], { limit: limits/* Limits */.xu.maxQueryLimit, matchAll: false }));
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get bookmarks by tag'
            };
        }
    }
    /**
     * Search bookmarks with various criteria (compatible with service worker)
     * ENHANCED: Now supports pagination with offset
     */
    async searchBookmarks(options = {}) {
        try {
            const { result, metrics } = await this.withPerformanceTracking('searchBookmarks', async () => {
                let results = [];
                // Handle different search types
                if (options.text) {
                    results = await this._searchBookmarksByText(options.text, {
                        limit: options.limit,
                        offset: options.offset, // NEW: Pass offset for pagination
                        sortBy: options.sortBy,
                        sortOrder: options.sortOrder
                    });
                }
                else if (options.tags && options.tags.length > 0) {
                    results = await this.searchByTags(options.tags, {
                        limit: options.limit,
                        matchAll: false
                    });
                }
                else if (options.author) {
                    results = await this.searchByAuthor(options.author, {
                        limit: options.limit
                    });
                }
                else {
                    results = await this.getAllBookmarks({
                        sortBy: options.sortBy === 'relevance' ? 'created_at' : options.sortBy,
                        sortOrder: options.sortOrder,
                        limit: options.limit,
                        offset: options.offset // NEW: Pass offset for pagination
                    });
                }
                // Apply date filtering if specified
                if (options.dateFrom || options.dateTo) {
                    results = results.filter(bookmark => {
                        const bookmarkDate = new Date(bookmark.created_at);
                        const fromDate = options.dateFrom ? new Date(options.dateFrom) : null;
                        const toDate = options.dateTo ? new Date(options.dateTo) : null;
                        if (fromDate && bookmarkDate < fromDate)
                            return false;
                        if (toDate && bookmarkDate > toDate)
                            return false;
                        return true;
                    });
                }
                return results;
            });
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Search failed'
            };
        }
    }
    /**
     * Internal text search method
     * ENHANCED: Now supports offset for pagination
     */
    async _searchBookmarksByText(query, options = {}) {
        if (!query.trim()) {
            return this.getAllBookmarks(options);
        }
        const tokens = this.tokenizeText(query);
        // Search using multi-entry textTokens index with pagination
        let query_builder = this.bookmarks
            .where('textTokens')
            .anyOfIgnoreCase(tokens);
        // Apply sorting
        if (options.sortOrder === 'asc') {
            // Keep natural order
        }
        else {
            query_builder = query_builder.reverse(); // Default to newest first
        }
        // Apply pagination
        if (options.offset) {
            query_builder = query_builder.offset(options.offset);
        }
        if (options.limit) {
            query_builder = query_builder.limit(options.limit);
        }
        const results = await query_builder.toArray();
        // Apply pagination to search results
        const result = results.slice(options.offset || 0, (options.offset || 0) + (options.limit || limits/* Limits */.xu.maxQueryLimit));
        console.log(`🔍 Text search "${query}" returned ${result.length} bookmarks`);
        return result;
    }
    // REMOVED: Unnecessary date normalization - dates are already consistent
    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const { result, metrics } = await this.withPerformanceTracking('getStats', async () => {
                const [bookmarkCount, collectionCount, allBookmarks] = await Promise.all([
                    this.bookmarks.count(),
                    this.collections.count(),
                    this.bookmarks.toArray() // Get all bookmarks to count unique tags
                ]);
                // Calculate unique tags from bookmark tags arrays
                const allTags = new Set();
                allBookmarks.forEach(bookmark => {
                    if (bookmark.tags && Array.isArray(bookmark.tags)) {
                        bookmark.tags.forEach(tag => allTags.add(tag));
                    }
                });
                return {
                    totalBookmarks: bookmarkCount,
                    totalTags: allTags.size, // For backward compatibility
                    uniqueTags: allTags.size, // Explicit unique tags count
                    totalCollections: collectionCount
                };
            });
            return {
                success: true,
                data: result,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get database stats'
            };
        }
    }
    /**
     * Validate date string (accepts both ISO and Twitter formats)
     */
    isValidDate(dateString) {
        if (!dateString || typeof dateString !== 'string')
            return false;
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date.getTime() > 0;
    }
    /**
     * Clear all data (for testing/reset)
     */
    async clearAllData() {
        try {
            const { metrics } = await this.withPerformanceTracking('clearAllData', async () => {
                await this.transaction('rw', [this.bookmarks, this.tags, this.collections, this.settings], async () => {
                    await this.bookmarks.clear();
                    await this.tags.clear();
                    await this.collections.clear();
                    await this.settings.clear();
                });
                console.log('🧹 All data cleared');
            });
            return {
                success: true,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear data'
            };
        }
    }
    /**
     * Clear all bookmarks only (keep other data)
     */
    async clearAllBookmarks() {
        try {
            const { metrics } = await this.withPerformanceTracking('clearAllBookmarks', async () => {
                await this.bookmarks.clear();
                console.log('🧹 All bookmarks cleared');
            });
            return {
                success: true,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear bookmarks'
            };
        }
    }
    /**
     * Verify database functionality (for debugging)
     */
    async verifyDatabase() {
        console.log('🧪 Testing database functionality...');
        // Test bookmark creation
        const testBookmark = {
            id: 'test_' + Date.now(),
            text: 'Test bookmark for verification',
            author: 'test_user',
            created_at: new Date().toISOString(),
            bookmarked_at: new Date().toISOString(),
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
                await this.bookmarks.delete(testBookmark.id);
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
    async close() {
        try {
            await super.close();
            this.isInitialized = false;
            console.log('✅ Database closed successfully');
        }
        catch (error) {
            console.error('❌ Failed to close database:', error);
        }
    }
}
// Create default database instance for backward compatibility
const db = new XSavedDatabase();
// Factory function for creating user-specific databases
function createUserDatabase(dbName) {
    return new XSavedDatabase(dbName);
}

;// ./src/db/config.ts
/**
 * XSaved Extension v2 - Database Configuration
 * IndexedDB schema with performance-optimized indexes
 */
const DATABASE_NAME = 'XSavedDB';
const DATABASE_VERSION = 4;
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
                    name: 'bookmarked_at',
                    keyPath: 'bookmarked_at',
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

;// ./src/db/index.ts
/**
 * XSaved Extension v2 - Database Module
 * Consolidated single database implementation
 */
// Main database class (consolidated Dexie implementation)

// Configuration



/***/ }),

/***/ 744:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

(function(e,t){ true?module.exports=t():0})(this,function(){"use strict";var s=function(e,t){return(s=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n])})(e,t)};var _=function(){return(_=Object.assign||function(e){for(var t,n=1,r=arguments.length;n<r;n++)for(var i in t=arguments[n])Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i]);return e}).apply(this,arguments)};function i(e,t,n){if(n||2===arguments.length)for(var r,i=0,o=t.length;i<o;i++)!r&&i in t||((r=r||Array.prototype.slice.call(t,0,i))[i]=t[i]);return e.concat(r||Array.prototype.slice.call(t))}var f="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:__webpack_require__.g,x=Object.keys,k=Array.isArray;function a(t,n){return"object"!=typeof n||x(n).forEach(function(e){t[e]=n[e]}),t}"undefined"==typeof Promise||f.Promise||(f.Promise=Promise);var c=Object.getPrototypeOf,n={}.hasOwnProperty;function m(e,t){return n.call(e,t)}function r(t,n){"function"==typeof n&&(n=n(c(t))),("undefined"==typeof Reflect?x:Reflect.ownKeys)(n).forEach(function(e){l(t,e,n[e])})}var u=Object.defineProperty;function l(e,t,n,r){u(e,t,a(n&&m(n,"get")&&"function"==typeof n.get?{get:n.get,set:n.set,configurable:!0}:{value:n,configurable:!0,writable:!0},r))}function o(t){return{from:function(e){return t.prototype=Object.create(e.prototype),l(t.prototype,"constructor",t),{extend:r.bind(null,t.prototype)}}}}var h=Object.getOwnPropertyDescriptor;var d=[].slice;function b(e,t,n){return d.call(e,t,n)}function p(e,t){return t(e)}function y(e){if(!e)throw new Error("Assertion Failed")}function v(e){f.setImmediate?setImmediate(e):setTimeout(e,0)}function O(e,t){if("string"==typeof t&&m(e,t))return e[t];if(!t)return e;if("string"!=typeof t){for(var n=[],r=0,i=t.length;r<i;++r){var o=O(e,t[r]);n.push(o)}return n}var a=t.indexOf(".");if(-1!==a){var u=e[t.substr(0,a)];return null==u?void 0:O(u,t.substr(a+1))}}function P(e,t,n){if(e&&void 0!==t&&!("isFrozen"in Object&&Object.isFrozen(e)))if("string"!=typeof t&&"length"in t){y("string"!=typeof n&&"length"in n);for(var r=0,i=t.length;r<i;++r)P(e,t[r],n[r])}else{var o,a,u=t.indexOf(".");-1!==u?(o=t.substr(0,u),""===(a=t.substr(u+1))?void 0===n?k(e)&&!isNaN(parseInt(o))?e.splice(o,1):delete e[o]:e[o]=n:P(u=!(u=e[o])||!m(e,o)?e[o]={}:u,a,n)):void 0===n?k(e)&&!isNaN(parseInt(t))?e.splice(t,1):delete e[t]:e[t]=n}}function g(e){var t,n={};for(t in e)m(e,t)&&(n[t]=e[t]);return n}var t=[].concat;function w(e){return t.apply([],e)}var e="BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(w([8,16,32,64].map(function(t){return["Int","Uint","Float"].map(function(e){return e+t+"Array"})}))).filter(function(e){return f[e]}),K=new Set(e.map(function(e){return f[e]}));var E=null;function S(e){E=new WeakMap;e=function e(t){if(!t||"object"!=typeof t)return t;var n=E.get(t);if(n)return n;if(k(t)){n=[],E.set(t,n);for(var r=0,i=t.length;r<i;++r)n.push(e(t[r]))}else if(K.has(t.constructor))n=t;else{var o,a=c(t);for(o in n=a===Object.prototype?{}:Object.create(a),E.set(t,n),t)m(t,o)&&(n[o]=e(t[o]))}return n}(e);return E=null,e}var j={}.toString;function A(e){return j.call(e).slice(8,-1)}var C="undefined"!=typeof Symbol?Symbol.iterator:"@@iterator",T="symbol"==typeof C?function(e){var t;return null!=e&&(t=e[C])&&t.apply(e)}:function(){return null};function q(e,t){t=e.indexOf(t);return 0<=t&&e.splice(t,1),0<=t}var D={};function I(e){var t,n,r,i;if(1===arguments.length){if(k(e))return e.slice();if(this===D&&"string"==typeof e)return[e];if(i=T(e)){for(n=[];!(r=i.next()).done;)n.push(r.value);return n}if(null==e)return[e];if("number"!=typeof(t=e.length))return[e];for(n=new Array(t);t--;)n[t]=e[t];return n}for(t=arguments.length,n=new Array(t);t--;)n[t]=arguments[t];return n}var B="undefined"!=typeof Symbol?function(e){return"AsyncFunction"===e[Symbol.toStringTag]}:function(){return!1},R=["Unknown","Constraint","Data","TransactionInactive","ReadOnly","Version","NotFound","InvalidState","InvalidAccess","Abort","Timeout","QuotaExceeded","Syntax","DataClone"],F=["Modify","Bulk","OpenFailed","VersionChange","Schema","Upgrade","InvalidTable","MissingAPI","NoSuchDatabase","InvalidArgument","SubTransaction","Unsupported","Internal","DatabaseClosed","PrematureCommit","ForeignAwait"].concat(R),M={VersionChanged:"Database version changed by other database connection",DatabaseClosed:"Database has been closed",Abort:"Transaction aborted",TransactionInactive:"Transaction has already completed or failed",MissingAPI:"IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb"};function N(e,t){this.name=e,this.message=t}function L(e,t){return e+". Errors: "+Object.keys(t).map(function(e){return t[e].toString()}).filter(function(e,t,n){return n.indexOf(e)===t}).join("\n")}function U(e,t,n,r){this.failures=t,this.failedKeys=r,this.successCount=n,this.message=L(e,t)}function V(e,t){this.name="BulkError",this.failures=Object.keys(t).map(function(e){return t[e]}),this.failuresByPos=t,this.message=L(e,this.failures)}o(N).from(Error).extend({toString:function(){return this.name+": "+this.message}}),o(U).from(N),o(V).from(N);var z=F.reduce(function(e,t){return e[t]=t+"Error",e},{}),W=N,Y=F.reduce(function(e,n){var r=n+"Error";function t(e,t){this.name=r,e?"string"==typeof e?(this.message="".concat(e).concat(t?"\n "+t:""),this.inner=t||null):"object"==typeof e&&(this.message="".concat(e.name," ").concat(e.message),this.inner=e):(this.message=M[n]||r,this.inner=null)}return o(t).from(W),e[n]=t,e},{});Y.Syntax=SyntaxError,Y.Type=TypeError,Y.Range=RangeError;var $=R.reduce(function(e,t){return e[t+"Error"]=Y[t],e},{});var Q=F.reduce(function(e,t){return-1===["Syntax","Type","Range"].indexOf(t)&&(e[t+"Error"]=Y[t]),e},{});function G(){}function X(e){return e}function H(t,n){return null==t||t===X?n:function(e){return n(t(e))}}function J(e,t){return function(){e.apply(this,arguments),t.apply(this,arguments)}}function Z(i,o){return i===G?o:function(){var e=i.apply(this,arguments);void 0!==e&&(arguments[0]=e);var t=this.onsuccess,n=this.onerror;this.onsuccess=null,this.onerror=null;var r=o.apply(this,arguments);return t&&(this.onsuccess=this.onsuccess?J(t,this.onsuccess):t),n&&(this.onerror=this.onerror?J(n,this.onerror):n),void 0!==r?r:e}}function ee(n,r){return n===G?r:function(){n.apply(this,arguments);var e=this.onsuccess,t=this.onerror;this.onsuccess=this.onerror=null,r.apply(this,arguments),e&&(this.onsuccess=this.onsuccess?J(e,this.onsuccess):e),t&&(this.onerror=this.onerror?J(t,this.onerror):t)}}function te(i,o){return i===G?o:function(e){var t=i.apply(this,arguments);a(e,t);var n=this.onsuccess,r=this.onerror;this.onsuccess=null,this.onerror=null;e=o.apply(this,arguments);return n&&(this.onsuccess=this.onsuccess?J(n,this.onsuccess):n),r&&(this.onerror=this.onerror?J(r,this.onerror):r),void 0===t?void 0===e?void 0:e:a(t,e)}}function ne(e,t){return e===G?t:function(){return!1!==t.apply(this,arguments)&&e.apply(this,arguments)}}function re(i,o){return i===G?o:function(){var e=i.apply(this,arguments);if(e&&"function"==typeof e.then){for(var t=this,n=arguments.length,r=new Array(n);n--;)r[n]=arguments[n];return e.then(function(){return o.apply(t,r)})}return o.apply(this,arguments)}}Q.ModifyError=U,Q.DexieError=N,Q.BulkError=V;var ie="undefined"!=typeof location&&/^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);function oe(e){ie=e}var ae={},ue=100,e="undefined"==typeof Promise?[]:function(){var e=Promise.resolve();if("undefined"==typeof crypto||!crypto.subtle)return[e,c(e),e];var t=crypto.subtle.digest("SHA-512",new Uint8Array([0]));return[t,c(t),e]}(),R=e[0],F=e[1],e=e[2],F=F&&F.then,se=R&&R.constructor,ce=!!e;var le=function(e,t){be.push([e,t]),he&&(queueMicrotask(Se),he=!1)},fe=!0,he=!0,de=[],pe=[],ye=X,ve={id:"global",global:!0,ref:0,unhandleds:[],onunhandled:G,pgp:!1,env:{},finalize:G},me=ve,be=[],ge=0,we=[];function _e(e){if("object"!=typeof this)throw new TypeError("Promises must be constructed via new");this._listeners=[],this._lib=!1;var t=this._PSD=me;if("function"!=typeof e){if(e!==ae)throw new TypeError("Not a function");return this._state=arguments[1],this._value=arguments[2],void(!1===this._state&&Oe(this,this._value))}this._state=null,this._value=null,++t.ref,function t(r,e){try{e(function(n){if(null===r._state){if(n===r)throw new TypeError("A promise cannot be resolved with itself.");var e=r._lib&&je();n&&"function"==typeof n.then?t(r,function(e,t){n instanceof _e?n._then(e,t):n.then(e,t)}):(r._state=!0,r._value=n,Pe(r)),e&&Ae()}},Oe.bind(null,r))}catch(e){Oe(r,e)}}(this,e)}var xe={get:function(){var u=me,t=Fe;function e(n,r){var i=this,o=!u.global&&(u!==me||t!==Fe),a=o&&!Ue(),e=new _e(function(e,t){Ke(i,new ke(Qe(n,u,o,a),Qe(r,u,o,a),e,t,u))});return this._consoleTask&&(e._consoleTask=this._consoleTask),e}return e.prototype=ae,e},set:function(e){l(this,"then",e&&e.prototype===ae?xe:{get:function(){return e},set:xe.set})}};function ke(e,t,n,r,i){this.onFulfilled="function"==typeof e?e:null,this.onRejected="function"==typeof t?t:null,this.resolve=n,this.reject=r,this.psd=i}function Oe(e,t){var n,r;pe.push(t),null===e._state&&(n=e._lib&&je(),t=ye(t),e._state=!1,e._value=t,r=e,de.some(function(e){return e._value===r._value})||de.push(r),Pe(e),n&&Ae())}function Pe(e){var t=e._listeners;e._listeners=[];for(var n=0,r=t.length;n<r;++n)Ke(e,t[n]);var i=e._PSD;--i.ref||i.finalize(),0===ge&&(++ge,le(function(){0==--ge&&Ce()},[]))}function Ke(e,t){if(null!==e._state){var n=e._state?t.onFulfilled:t.onRejected;if(null===n)return(e._state?t.resolve:t.reject)(e._value);++t.psd.ref,++ge,le(Ee,[n,e,t])}else e._listeners.push(t)}function Ee(e,t,n){try{var r,i=t._value;!t._state&&pe.length&&(pe=[]),r=ie&&t._consoleTask?t._consoleTask.run(function(){return e(i)}):e(i),t._state||-1!==pe.indexOf(i)||function(e){var t=de.length;for(;t;)if(de[--t]._value===e._value)return de.splice(t,1)}(t),n.resolve(r)}catch(e){n.reject(e)}finally{0==--ge&&Ce(),--n.psd.ref||n.psd.finalize()}}function Se(){$e(ve,function(){je()&&Ae()})}function je(){var e=fe;return he=fe=!1,e}function Ae(){var e,t,n;do{for(;0<be.length;)for(e=be,be=[],n=e.length,t=0;t<n;++t){var r=e[t];r[0].apply(null,r[1])}}while(0<be.length);he=fe=!0}function Ce(){var e=de;de=[],e.forEach(function(e){e._PSD.onunhandled.call(null,e._value,e)});for(var t=we.slice(0),n=t.length;n;)t[--n]()}function Te(e){return new _e(ae,!1,e)}function qe(n,r){var i=me;return function(){var e=je(),t=me;try{return We(i,!0),n.apply(this,arguments)}catch(e){r&&r(e)}finally{We(t,!1),e&&Ae()}}}r(_e.prototype,{then:xe,_then:function(e,t){Ke(this,new ke(null,null,e,t,me))},catch:function(e){if(1===arguments.length)return this.then(null,e);var t=e,n=arguments[1];return"function"==typeof t?this.then(null,function(e){return(e instanceof t?n:Te)(e)}):this.then(null,function(e){return(e&&e.name===t?n:Te)(e)})},finally:function(t){return this.then(function(e){return _e.resolve(t()).then(function(){return e})},function(e){return _e.resolve(t()).then(function(){return Te(e)})})},timeout:function(r,i){var o=this;return r<1/0?new _e(function(e,t){var n=setTimeout(function(){return t(new Y.Timeout(i))},r);o.then(e,t).finally(clearTimeout.bind(null,n))}):this}}),"undefined"!=typeof Symbol&&Symbol.toStringTag&&l(_e.prototype,Symbol.toStringTag,"Dexie.Promise"),ve.env=Ye(),r(_e,{all:function(){var o=I.apply(null,arguments).map(Ve);return new _e(function(n,r){0===o.length&&n([]);var i=o.length;o.forEach(function(e,t){return _e.resolve(e).then(function(e){o[t]=e,--i||n(o)},r)})})},resolve:function(n){return n instanceof _e?n:n&&"function"==typeof n.then?new _e(function(e,t){n.then(e,t)}):new _e(ae,!0,n)},reject:Te,race:function(){var e=I.apply(null,arguments).map(Ve);return new _e(function(t,n){e.map(function(e){return _e.resolve(e).then(t,n)})})},PSD:{get:function(){return me},set:function(e){return me=e}},totalEchoes:{get:function(){return Fe}},newPSD:Ne,usePSD:$e,scheduler:{get:function(){return le},set:function(e){le=e}},rejectionMapper:{get:function(){return ye},set:function(e){ye=e}},follow:function(i,n){return new _e(function(e,t){return Ne(function(n,r){var e=me;e.unhandleds=[],e.onunhandled=r,e.finalize=J(function(){var t,e=this;t=function(){0===e.unhandleds.length?n():r(e.unhandleds[0])},we.push(function e(){t(),we.splice(we.indexOf(e),1)}),++ge,le(function(){0==--ge&&Ce()},[])},e.finalize),i()},n,e,t)})}}),se&&(se.allSettled&&l(_e,"allSettled",function(){var e=I.apply(null,arguments).map(Ve);return new _e(function(n){0===e.length&&n([]);var r=e.length,i=new Array(r);e.forEach(function(e,t){return _e.resolve(e).then(function(e){return i[t]={status:"fulfilled",value:e}},function(e){return i[t]={status:"rejected",reason:e}}).then(function(){return--r||n(i)})})})}),se.any&&"undefined"!=typeof AggregateError&&l(_e,"any",function(){var e=I.apply(null,arguments).map(Ve);return new _e(function(n,r){0===e.length&&r(new AggregateError([]));var i=e.length,o=new Array(i);e.forEach(function(e,t){return _e.resolve(e).then(function(e){return n(e)},function(e){o[t]=e,--i||r(new AggregateError(o))})})})}),se.withResolvers&&(_e.withResolvers=se.withResolvers));var De={awaits:0,echoes:0,id:0},Ie=0,Be=[],Re=0,Fe=0,Me=0;function Ne(e,t,n,r){var i=me,o=Object.create(i);o.parent=i,o.ref=0,o.global=!1,o.id=++Me,ve.env,o.env=ce?{Promise:_e,PromiseProp:{value:_e,configurable:!0,writable:!0},all:_e.all,race:_e.race,allSettled:_e.allSettled,any:_e.any,resolve:_e.resolve,reject:_e.reject}:{},t&&a(o,t),++i.ref,o.finalize=function(){--this.parent.ref||this.parent.finalize()};r=$e(o,e,n,r);return 0===o.ref&&o.finalize(),r}function Le(){return De.id||(De.id=++Ie),++De.awaits,De.echoes+=ue,De.id}function Ue(){return!!De.awaits&&(0==--De.awaits&&(De.id=0),De.echoes=De.awaits*ue,!0)}function Ve(e){return De.echoes&&e&&e.constructor===se?(Le(),e.then(function(e){return Ue(),e},function(e){return Ue(),Xe(e)})):e}function ze(){var e=Be[Be.length-1];Be.pop(),We(e,!1)}function We(e,t){var n,r=me;(t?!De.echoes||Re++&&e===me:!Re||--Re&&e===me)||queueMicrotask(t?function(e){++Fe,De.echoes&&0!=--De.echoes||(De.echoes=De.awaits=De.id=0),Be.push(me),We(e,!0)}.bind(null,e):ze),e!==me&&(me=e,r===ve&&(ve.env=Ye()),ce&&(n=ve.env.Promise,t=e.env,(r.global||e.global)&&(Object.defineProperty(f,"Promise",t.PromiseProp),n.all=t.all,n.race=t.race,n.resolve=t.resolve,n.reject=t.reject,t.allSettled&&(n.allSettled=t.allSettled),t.any&&(n.any=t.any))))}function Ye(){var e=f.Promise;return ce?{Promise:e,PromiseProp:Object.getOwnPropertyDescriptor(f,"Promise"),all:e.all,race:e.race,allSettled:e.allSettled,any:e.any,resolve:e.resolve,reject:e.reject}:{}}function $e(e,t,n,r,i){var o=me;try{return We(e,!0),t(n,r,i)}finally{We(o,!1)}}function Qe(t,n,r,i){return"function"!=typeof t?t:function(){var e=me;r&&Le(),We(n,!0);try{return t.apply(this,arguments)}finally{We(e,!1),i&&queueMicrotask(Ue)}}}function Ge(e){Promise===se&&0===De.echoes?0===Re?e():enqueueNativeMicroTask(e):setTimeout(e,0)}-1===(""+F).indexOf("[native code]")&&(Le=Ue=G);var Xe=_e.reject;var He=String.fromCharCode(65535),Je="Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.",Ze="String expected.",et=[],tt="__dbnames",nt="readonly",rt="readwrite";function it(e,t){return e?t?function(){return e.apply(this,arguments)&&t.apply(this,arguments)}:e:t}var ot={type:3,lower:-1/0,lowerOpen:!1,upper:[[]],upperOpen:!1};function at(t){return"string"!=typeof t||/\./.test(t)?function(e){return e}:function(e){return void 0===e[t]&&t in e&&delete(e=S(e))[t],e}}function ut(){throw Y.Type()}function st(e,t){try{var n=ct(e),r=ct(t);if(n!==r)return"Array"===n?1:"Array"===r?-1:"binary"===n?1:"binary"===r?-1:"string"===n?1:"string"===r?-1:"Date"===n?1:"Date"!==r?NaN:-1;switch(n){case"number":case"Date":case"string":return t<e?1:e<t?-1:0;case"binary":return function(e,t){for(var n=e.length,r=t.length,i=n<r?n:r,o=0;o<i;++o)if(e[o]!==t[o])return e[o]<t[o]?-1:1;return n===r?0:n<r?-1:1}(lt(e),lt(t));case"Array":return function(e,t){for(var n=e.length,r=t.length,i=n<r?n:r,o=0;o<i;++o){var a=st(e[o],t[o]);if(0!==a)return a}return n===r?0:n<r?-1:1}(e,t)}}catch(e){}return NaN}function ct(e){var t=typeof e;if("object"!=t)return t;if(ArrayBuffer.isView(e))return"binary";e=A(e);return"ArrayBuffer"===e?"binary":e}function lt(e){return e instanceof Uint8Array?e:ArrayBuffer.isView(e)?new Uint8Array(e.buffer,e.byteOffset,e.byteLength):new Uint8Array(e)}var ft=(ht.prototype._trans=function(e,r,t){var n=this._tx||me.trans,i=this.name,o=ie&&"undefined"!=typeof console&&console.createTask&&console.createTask("Dexie: ".concat("readonly"===e?"read":"write"," ").concat(this.name));function a(e,t,n){if(!n.schema[i])throw new Y.NotFound("Table "+i+" not part of transaction");return r(n.idbtrans,n)}var u=je();try{var s=n&&n.db._novip===this.db._novip?n===me.trans?n._promise(e,a,t):Ne(function(){return n._promise(e,a,t)},{trans:n,transless:me.transless||me}):function t(n,r,i,o){if(n.idbdb&&(n._state.openComplete||me.letThrough||n._vip)){var a=n._createTransaction(r,i,n._dbSchema);try{a.create(),n._state.PR1398_maxLoop=3}catch(e){return e.name===z.InvalidState&&n.isOpen()&&0<--n._state.PR1398_maxLoop?(console.warn("Dexie: Need to reopen db"),n.close({disableAutoOpen:!1}),n.open().then(function(){return t(n,r,i,o)})):Xe(e)}return a._promise(r,function(e,t){return Ne(function(){return me.trans=a,o(e,t,a)})}).then(function(e){if("readwrite"===r)try{a.idbtrans.commit()}catch(e){}return"readonly"===r?e:a._completion.then(function(){return e})})}if(n._state.openComplete)return Xe(new Y.DatabaseClosed(n._state.dbOpenError));if(!n._state.isBeingOpened){if(!n._state.autoOpen)return Xe(new Y.DatabaseClosed);n.open().catch(G)}return n._state.dbReadyPromise.then(function(){return t(n,r,i,o)})}(this.db,e,[this.name],a);return o&&(s._consoleTask=o,s=s.catch(function(e){return console.trace(e),Xe(e)})),s}finally{u&&Ae()}},ht.prototype.get=function(t,e){var n=this;return t&&t.constructor===Object?this.where(t).first(e):null==t?Xe(new Y.Type("Invalid argument to Table.get()")):this._trans("readonly",function(e){return n.core.get({trans:e,key:t}).then(function(e){return n.hook.reading.fire(e)})}).then(e)},ht.prototype.where=function(o){if("string"==typeof o)return new this.db.WhereClause(this,o);if(k(o))return new this.db.WhereClause(this,"[".concat(o.join("+"),"]"));var n=x(o);if(1===n.length)return this.where(n[0]).equals(o[n[0]]);var e=this.schema.indexes.concat(this.schema.primKey).filter(function(t){if(t.compound&&n.every(function(e){return 0<=t.keyPath.indexOf(e)})){for(var e=0;e<n.length;++e)if(-1===n.indexOf(t.keyPath[e]))return!1;return!0}return!1}).sort(function(e,t){return e.keyPath.length-t.keyPath.length})[0];if(e&&this.db._maxKey!==He){var t=e.keyPath.slice(0,n.length);return this.where(t).equals(t.map(function(e){return o[e]}))}!e&&ie&&console.warn("The query ".concat(JSON.stringify(o)," on ").concat(this.name," would benefit from a ")+"compound index [".concat(n.join("+"),"]"));var a=this.schema.idxByName;function u(e,t){return 0===st(e,t)}var r=n.reduce(function(e,t){var n=e[0],r=e[1],e=a[t],i=o[t];return[n||e,n||!e?it(r,e&&e.multi?function(e){e=O(e,t);return k(e)&&e.some(function(e){return u(i,e)})}:function(e){return u(i,O(e,t))}):r]},[null,null]),t=r[0],r=r[1];return t?this.where(t.name).equals(o[t.keyPath]).filter(r):e?this.filter(r):this.where(n).equals("")},ht.prototype.filter=function(e){return this.toCollection().and(e)},ht.prototype.count=function(e){return this.toCollection().count(e)},ht.prototype.offset=function(e){return this.toCollection().offset(e)},ht.prototype.limit=function(e){return this.toCollection().limit(e)},ht.prototype.each=function(e){return this.toCollection().each(e)},ht.prototype.toArray=function(e){return this.toCollection().toArray(e)},ht.prototype.toCollection=function(){return new this.db.Collection(new this.db.WhereClause(this))},ht.prototype.orderBy=function(e){return new this.db.Collection(new this.db.WhereClause(this,k(e)?"[".concat(e.join("+"),"]"):e))},ht.prototype.reverse=function(){return this.toCollection().reverse()},ht.prototype.mapToClass=function(r){var e,t=this.db,n=this.name;function i(){return null!==e&&e.apply(this,arguments)||this}(this.schema.mappedClass=r).prototype instanceof ut&&(function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Class extends value "+String(t)+" is not a constructor or null");function n(){this.constructor=e}s(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}(i,e=r),Object.defineProperty(i.prototype,"db",{get:function(){return t},enumerable:!1,configurable:!0}),i.prototype.table=function(){return n},r=i);for(var o=new Set,a=r.prototype;a;a=c(a))Object.getOwnPropertyNames(a).forEach(function(e){return o.add(e)});function u(e){if(!e)return e;var t,n=Object.create(r.prototype);for(t in e)if(!o.has(t))try{n[t]=e[t]}catch(e){}return n}return this.schema.readHook&&this.hook.reading.unsubscribe(this.schema.readHook),this.schema.readHook=u,this.hook("reading",u),r},ht.prototype.defineClass=function(){return this.mapToClass(function(e){a(this,e)})},ht.prototype.add=function(t,n){var r=this,e=this.schema.primKey,i=e.auto,o=e.keyPath,a=t;return o&&i&&(a=at(o)(t)),this._trans("readwrite",function(e){return r.core.mutate({trans:e,type:"add",keys:null!=n?[n]:null,values:[a]})}).then(function(e){return e.numFailures?_e.reject(e.failures[0]):e.lastResult}).then(function(e){if(o)try{P(t,o,e)}catch(e){}return e})},ht.prototype.update=function(e,t){if("object"!=typeof e||k(e))return this.where(":id").equals(e).modify(t);e=O(e,this.schema.primKey.keyPath);return void 0===e?Xe(new Y.InvalidArgument("Given object does not contain its primary key")):this.where(":id").equals(e).modify(t)},ht.prototype.put=function(t,n){var r=this,e=this.schema.primKey,i=e.auto,o=e.keyPath,a=t;return o&&i&&(a=at(o)(t)),this._trans("readwrite",function(e){return r.core.mutate({trans:e,type:"put",values:[a],keys:null!=n?[n]:null})}).then(function(e){return e.numFailures?_e.reject(e.failures[0]):e.lastResult}).then(function(e){if(o)try{P(t,o,e)}catch(e){}return e})},ht.prototype.delete=function(t){var n=this;return this._trans("readwrite",function(e){return n.core.mutate({trans:e,type:"delete",keys:[t]})}).then(function(e){return e.numFailures?_e.reject(e.failures[0]):void 0})},ht.prototype.clear=function(){var t=this;return this._trans("readwrite",function(e){return t.core.mutate({trans:e,type:"deleteRange",range:ot})}).then(function(e){return e.numFailures?_e.reject(e.failures[0]):void 0})},ht.prototype.bulkGet=function(t){var n=this;return this._trans("readonly",function(e){return n.core.getMany({keys:t,trans:e}).then(function(e){return e.map(function(e){return n.hook.reading.fire(e)})})})},ht.prototype.bulkAdd=function(r,e,t){var o=this,a=Array.isArray(e)?e:void 0,u=(t=t||(a?void 0:e))?t.allKeys:void 0;return this._trans("readwrite",function(e){var t=o.schema.primKey,n=t.auto,t=t.keyPath;if(t&&a)throw new Y.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");if(a&&a.length!==r.length)throw new Y.InvalidArgument("Arguments objects and keys must have the same length");var i=r.length,t=t&&n?r.map(at(t)):r;return o.core.mutate({trans:e,type:"add",keys:a,values:t,wantResults:u}).then(function(e){var t=e.numFailures,n=e.results,r=e.lastResult,e=e.failures;if(0===t)return u?n:r;throw new V("".concat(o.name,".bulkAdd(): ").concat(t," of ").concat(i," operations failed"),e)})})},ht.prototype.bulkPut=function(r,e,t){var o=this,a=Array.isArray(e)?e:void 0,u=(t=t||(a?void 0:e))?t.allKeys:void 0;return this._trans("readwrite",function(e){var t=o.schema.primKey,n=t.auto,t=t.keyPath;if(t&&a)throw new Y.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");if(a&&a.length!==r.length)throw new Y.InvalidArgument("Arguments objects and keys must have the same length");var i=r.length,t=t&&n?r.map(at(t)):r;return o.core.mutate({trans:e,type:"put",keys:a,values:t,wantResults:u}).then(function(e){var t=e.numFailures,n=e.results,r=e.lastResult,e=e.failures;if(0===t)return u?n:r;throw new V("".concat(o.name,".bulkPut(): ").concat(t," of ").concat(i," operations failed"),e)})})},ht.prototype.bulkUpdate=function(t){var h=this,n=this.core,r=t.map(function(e){return e.key}),i=t.map(function(e){return e.changes}),d=[];return this._trans("readwrite",function(e){return n.getMany({trans:e,keys:r,cache:"clone"}).then(function(c){var l=[],f=[];t.forEach(function(e,t){var n=e.key,r=e.changes,i=c[t];if(i){for(var o=0,a=Object.keys(r);o<a.length;o++){var u=a[o],s=r[u];if(u===h.schema.primKey.keyPath){if(0!==st(s,n))throw new Y.Constraint("Cannot update primary key in bulkUpdate()")}else P(i,u,s)}d.push(t),l.push(n),f.push(i)}});var s=l.length;return n.mutate({trans:e,type:"put",keys:l,values:f,updates:{keys:r,changeSpecs:i}}).then(function(e){var t=e.numFailures,n=e.failures;if(0===t)return s;for(var r=0,i=Object.keys(n);r<i.length;r++){var o,a=i[r],u=d[Number(a)];null!=u&&(o=n[a],delete n[a],n[u]=o)}throw new V("".concat(h.name,".bulkUpdate(): ").concat(t," of ").concat(s," operations failed"),n)})})})},ht.prototype.bulkDelete=function(t){var r=this,i=t.length;return this._trans("readwrite",function(e){return r.core.mutate({trans:e,type:"delete",keys:t})}).then(function(e){var t=e.numFailures,n=e.lastResult,e=e.failures;if(0===t)return n;throw new V("".concat(r.name,".bulkDelete(): ").concat(t," of ").concat(i," operations failed"),e)})},ht);function ht(){}function dt(i){function t(e,t){if(t){for(var n=arguments.length,r=new Array(n-1);--n;)r[n-1]=arguments[n];return a[e].subscribe.apply(null,r),i}if("string"==typeof e)return a[e]}var a={};t.addEventType=u;for(var e=1,n=arguments.length;e<n;++e)u(arguments[e]);return t;function u(e,n,r){if("object"!=typeof e){var i;n=n||ne;var o={subscribers:[],fire:r=r||G,subscribe:function(e){-1===o.subscribers.indexOf(e)&&(o.subscribers.push(e),o.fire=n(o.fire,e))},unsubscribe:function(t){o.subscribers=o.subscribers.filter(function(e){return e!==t}),o.fire=o.subscribers.reduce(n,r)}};return a[e]=t[e]=o}x(i=e).forEach(function(e){var t=i[e];if(k(t))u(e,i[e][0],i[e][1]);else{if("asap"!==t)throw new Y.InvalidArgument("Invalid event config");var n=u(e,X,function(){for(var e=arguments.length,t=new Array(e);e--;)t[e]=arguments[e];n.subscribers.forEach(function(e){v(function(){e.apply(null,t)})})})}})}}function pt(e,t){return o(t).from({prototype:e}),t}function yt(e,t){return!(e.filter||e.algorithm||e.or)&&(t?e.justLimit:!e.replayFilter)}function vt(e,t){e.filter=it(e.filter,t)}function mt(e,t,n){var r=e.replayFilter;e.replayFilter=r?function(){return it(r(),t())}:t,e.justLimit=n&&!r}function bt(e,t){if(e.isPrimKey)return t.primaryKey;var n=t.getIndexByKeyPath(e.index);if(!n)throw new Y.Schema("KeyPath "+e.index+" on object store "+t.name+" is not indexed");return n}function gt(e,t,n){var r=bt(e,t.schema);return t.openCursor({trans:n,values:!e.keysOnly,reverse:"prev"===e.dir,unique:!!e.unique,query:{index:r,range:e.range}})}function wt(e,o,t,n){var a=e.replayFilter?it(e.filter,e.replayFilter()):e.filter;if(e.or){var u={},r=function(e,t,n){var r,i;a&&!a(t,n,function(e){return t.stop(e)},function(e){return t.fail(e)})||("[object ArrayBuffer]"===(i=""+(r=t.primaryKey))&&(i=""+new Uint8Array(r)),m(u,i)||(u[i]=!0,o(e,t,n)))};return Promise.all([e.or._iterate(r,t),_t(gt(e,n,t),e.algorithm,r,!e.keysOnly&&e.valueMapper)])}return _t(gt(e,n,t),it(e.algorithm,a),o,!e.keysOnly&&e.valueMapper)}function _t(e,r,i,o){var a=qe(o?function(e,t,n){return i(o(e),t,n)}:i);return e.then(function(n){if(n)return n.start(function(){var t=function(){return n.continue()};r&&!r(n,function(e){return t=e},function(e){n.stop(e),t=G},function(e){n.fail(e),t=G})||a(n.value,n,function(e){return t=e}),t()})})}var xt=(kt.prototype.execute=function(e){var t=this["@@propmod"];if(void 0!==t.add){var n=t.add;if(k(n))return i(i([],k(e)?e:[],!0),n,!0).sort();if("number"==typeof n)return(Number(e)||0)+n;if("bigint"==typeof n)try{return BigInt(e)+n}catch(e){return BigInt(0)+n}throw new TypeError("Invalid term ".concat(n))}if(void 0!==t.remove){var r=t.remove;if(k(r))return k(e)?e.filter(function(e){return!r.includes(e)}).sort():[];if("number"==typeof r)return Number(e)-r;if("bigint"==typeof r)try{return BigInt(e)-r}catch(e){return BigInt(0)-r}throw new TypeError("Invalid subtrahend ".concat(r))}n=null===(n=t.replacePrefix)||void 0===n?void 0:n[0];return n&&"string"==typeof e&&e.startsWith(n)?t.replacePrefix[1]+e.substring(n.length):e},kt);function kt(e){this["@@propmod"]=e}var Ot=(Pt.prototype._read=function(e,t){var n=this._ctx;return n.error?n.table._trans(null,Xe.bind(null,n.error)):n.table._trans("readonly",e).then(t)},Pt.prototype._write=function(e){var t=this._ctx;return t.error?t.table._trans(null,Xe.bind(null,t.error)):t.table._trans("readwrite",e,"locked")},Pt.prototype._addAlgorithm=function(e){var t=this._ctx;t.algorithm=it(t.algorithm,e)},Pt.prototype._iterate=function(e,t){return wt(this._ctx,e,t,this._ctx.table.core)},Pt.prototype.clone=function(e){var t=Object.create(this.constructor.prototype),n=Object.create(this._ctx);return e&&a(n,e),t._ctx=n,t},Pt.prototype.raw=function(){return this._ctx.valueMapper=null,this},Pt.prototype.each=function(t){var n=this._ctx;return this._read(function(e){return wt(n,t,e,n.table.core)})},Pt.prototype.count=function(e){var i=this;return this._read(function(e){var t=i._ctx,n=t.table.core;if(yt(t,!0))return n.count({trans:e,query:{index:bt(t,n.schema),range:t.range}}).then(function(e){return Math.min(e,t.limit)});var r=0;return wt(t,function(){return++r,!1},e,n).then(function(){return r})}).then(e)},Pt.prototype.sortBy=function(e,t){var n=e.split(".").reverse(),r=n[0],i=n.length-1;function o(e,t){return t?o(e[n[t]],t-1):e[r]}var a="next"===this._ctx.dir?1:-1;function u(e,t){return st(o(e,i),o(t,i))*a}return this.toArray(function(e){return e.sort(u)}).then(t)},Pt.prototype.toArray=function(e){var o=this;return this._read(function(e){var t=o._ctx;if("next"===t.dir&&yt(t,!0)&&0<t.limit){var n=t.valueMapper,r=bt(t,t.table.core.schema);return t.table.core.query({trans:e,limit:t.limit,values:!0,query:{index:r,range:t.range}}).then(function(e){e=e.result;return n?e.map(n):e})}var i=[];return wt(t,function(e){return i.push(e)},e,t.table.core).then(function(){return i})},e)},Pt.prototype.offset=function(t){var e=this._ctx;return t<=0||(e.offset+=t,yt(e)?mt(e,function(){var n=t;return function(e,t){return 0===n||(1===n?--n:t(function(){e.advance(n),n=0}),!1)}}):mt(e,function(){var e=t;return function(){return--e<0}})),this},Pt.prototype.limit=function(e){return this._ctx.limit=Math.min(this._ctx.limit,e),mt(this._ctx,function(){var r=e;return function(e,t,n){return--r<=0&&t(n),0<=r}},!0),this},Pt.prototype.until=function(r,i){return vt(this._ctx,function(e,t,n){return!r(e.value)||(t(n),i)}),this},Pt.prototype.first=function(e){return this.limit(1).toArray(function(e){return e[0]}).then(e)},Pt.prototype.last=function(e){return this.reverse().first(e)},Pt.prototype.filter=function(t){var e;return vt(this._ctx,function(e){return t(e.value)}),(e=this._ctx).isMatch=it(e.isMatch,t),this},Pt.prototype.and=function(e){return this.filter(e)},Pt.prototype.or=function(e){return new this.db.WhereClause(this._ctx.table,e,this)},Pt.prototype.reverse=function(){return this._ctx.dir="prev"===this._ctx.dir?"next":"prev",this._ondirectionchange&&this._ondirectionchange(this._ctx.dir),this},Pt.prototype.desc=function(){return this.reverse()},Pt.prototype.eachKey=function(n){var e=this._ctx;return e.keysOnly=!e.isMatch,this.each(function(e,t){n(t.key,t)})},Pt.prototype.eachUniqueKey=function(e){return this._ctx.unique="unique",this.eachKey(e)},Pt.prototype.eachPrimaryKey=function(n){var e=this._ctx;return e.keysOnly=!e.isMatch,this.each(function(e,t){n(t.primaryKey,t)})},Pt.prototype.keys=function(e){var t=this._ctx;t.keysOnly=!t.isMatch;var n=[];return this.each(function(e,t){n.push(t.key)}).then(function(){return n}).then(e)},Pt.prototype.primaryKeys=function(e){var n=this._ctx;if("next"===n.dir&&yt(n,!0)&&0<n.limit)return this._read(function(e){var t=bt(n,n.table.core.schema);return n.table.core.query({trans:e,values:!1,limit:n.limit,query:{index:t,range:n.range}})}).then(function(e){return e.result}).then(e);n.keysOnly=!n.isMatch;var r=[];return this.each(function(e,t){r.push(t.primaryKey)}).then(function(){return r}).then(e)},Pt.prototype.uniqueKeys=function(e){return this._ctx.unique="unique",this.keys(e)},Pt.prototype.firstKey=function(e){return this.limit(1).keys(function(e){return e[0]}).then(e)},Pt.prototype.lastKey=function(e){return this.reverse().firstKey(e)},Pt.prototype.distinct=function(){var e=this._ctx,e=e.index&&e.table.schema.idxByName[e.index];if(!e||!e.multi)return this;var n={};return vt(this._ctx,function(e){var t=e.primaryKey.toString(),e=m(n,t);return n[t]=!0,!e}),this},Pt.prototype.modify=function(w){var n=this,r=this._ctx;return this._write(function(d){var a,u,p;p="function"==typeof w?w:(a=x(w),u=a.length,function(e){for(var t=!1,n=0;n<u;++n){var r=a[n],i=w[r],o=O(e,r);i instanceof xt?(P(e,r,i.execute(o)),t=!0):o!==i&&(P(e,r,i),t=!0)}return t});var y=r.table.core,e=y.schema.primaryKey,v=e.outbound,m=e.extractKey,b=200,e=n.db._options.modifyChunkSize;e&&(b="object"==typeof e?e[y.name]||e["*"]||200:e);function g(e,t){var n=t.failures,t=t.numFailures;c+=e-t;for(var r=0,i=x(n);r<i.length;r++){var o=i[r];s.push(n[o])}}var s=[],c=0,t=[];return n.clone().primaryKeys().then(function(l){function f(s){var c=Math.min(b,l.length-s);return y.getMany({trans:d,keys:l.slice(s,s+c),cache:"immutable"}).then(function(e){for(var n=[],t=[],r=v?[]:null,i=[],o=0;o<c;++o){var a=e[o],u={value:S(a),primKey:l[s+o]};!1!==p.call(u,u.value,u)&&(null==u.value?i.push(l[s+o]):v||0===st(m(a),m(u.value))?(t.push(u.value),v&&r.push(l[s+o])):(i.push(l[s+o]),n.push(u.value)))}return Promise.resolve(0<n.length&&y.mutate({trans:d,type:"add",values:n}).then(function(e){for(var t in e.failures)i.splice(parseInt(t),1);g(n.length,e)})).then(function(){return(0<t.length||h&&"object"==typeof w)&&y.mutate({trans:d,type:"put",keys:r,values:t,criteria:h,changeSpec:"function"!=typeof w&&w,isAdditionalChunk:0<s}).then(function(e){return g(t.length,e)})}).then(function(){return(0<i.length||h&&w===Kt)&&y.mutate({trans:d,type:"delete",keys:i,criteria:h,isAdditionalChunk:0<s}).then(function(e){return g(i.length,e)})}).then(function(){return l.length>s+c&&f(s+b)})})}var h=yt(r)&&r.limit===1/0&&("function"!=typeof w||w===Kt)&&{index:r.index,range:r.range};return f(0).then(function(){if(0<s.length)throw new U("Error modifying one or more objects",s,c,t);return l.length})})})},Pt.prototype.delete=function(){var i=this._ctx,n=i.range;return yt(i)&&(i.isPrimKey||3===n.type)?this._write(function(e){var t=i.table.core.schema.primaryKey,r=n;return i.table.core.count({trans:e,query:{index:t,range:r}}).then(function(n){return i.table.core.mutate({trans:e,type:"deleteRange",range:r}).then(function(e){var t=e.failures;e.lastResult,e.results;e=e.numFailures;if(e)throw new U("Could not delete some values",Object.keys(t).map(function(e){return t[e]}),n-e);return n-e})})}):this.modify(Kt)},Pt);function Pt(){}var Kt=function(e,t){return t.value=null};function Et(e,t){return e<t?-1:e===t?0:1}function St(e,t){return t<e?-1:e===t?0:1}function jt(e,t,n){e=e instanceof Dt?new e.Collection(e):e;return e._ctx.error=new(n||TypeError)(t),e}function At(e){return new e.Collection(e,function(){return qt("")}).limit(0)}function Ct(e,s,n,r){var i,c,l,f,h,d,p,y=n.length;if(!n.every(function(e){return"string"==typeof e}))return jt(e,Ze);function t(e){i="next"===e?function(e){return e.toUpperCase()}:function(e){return e.toLowerCase()},c="next"===e?function(e){return e.toLowerCase()}:function(e){return e.toUpperCase()},l="next"===e?Et:St;var t=n.map(function(e){return{lower:c(e),upper:i(e)}}).sort(function(e,t){return l(e.lower,t.lower)});f=t.map(function(e){return e.upper}),h=t.map(function(e){return e.lower}),p="next"===(d=e)?"":r}t("next");e=new e.Collection(e,function(){return Tt(f[0],h[y-1]+r)});e._ondirectionchange=function(e){t(e)};var v=0;return e._addAlgorithm(function(e,t,n){var r=e.key;if("string"!=typeof r)return!1;var i=c(r);if(s(i,h,v))return!0;for(var o=null,a=v;a<y;++a){var u=function(e,t,n,r,i,o){for(var a=Math.min(e.length,r.length),u=-1,s=0;s<a;++s){var c=t[s];if(c!==r[s])return i(e[s],n[s])<0?e.substr(0,s)+n[s]+n.substr(s+1):i(e[s],r[s])<0?e.substr(0,s)+r[s]+n.substr(s+1):0<=u?e.substr(0,u)+t[u]+n.substr(u+1):null;i(e[s],c)<0&&(u=s)}return a<r.length&&"next"===o?e+n.substr(e.length):a<e.length&&"prev"===o?e.substr(0,n.length):u<0?null:e.substr(0,u)+r[u]+n.substr(u+1)}(r,i,f[a],h[a],l,d);null===u&&null===o?v=a+1:(null===o||0<l(o,u))&&(o=u)}return t(null!==o?function(){e.continue(o+p)}:n),!1}),e}function Tt(e,t,n,r){return{type:2,lower:e,upper:t,lowerOpen:n,upperOpen:r}}function qt(e){return{type:1,lower:e,upper:e}}var Dt=(Object.defineProperty(It.prototype,"Collection",{get:function(){return this._ctx.table.db.Collection},enumerable:!1,configurable:!0}),It.prototype.between=function(e,t,n,r){n=!1!==n,r=!0===r;try{return 0<this._cmp(e,t)||0===this._cmp(e,t)&&(n||r)&&(!n||!r)?At(this):new this.Collection(this,function(){return Tt(e,t,!n,!r)})}catch(e){return jt(this,Je)}},It.prototype.equals=function(e){return null==e?jt(this,Je):new this.Collection(this,function(){return qt(e)})},It.prototype.above=function(e){return null==e?jt(this,Je):new this.Collection(this,function(){return Tt(e,void 0,!0)})},It.prototype.aboveOrEqual=function(e){return null==e?jt(this,Je):new this.Collection(this,function(){return Tt(e,void 0,!1)})},It.prototype.below=function(e){return null==e?jt(this,Je):new this.Collection(this,function(){return Tt(void 0,e,!1,!0)})},It.prototype.belowOrEqual=function(e){return null==e?jt(this,Je):new this.Collection(this,function(){return Tt(void 0,e)})},It.prototype.startsWith=function(e){return"string"!=typeof e?jt(this,Ze):this.between(e,e+He,!0,!0)},It.prototype.startsWithIgnoreCase=function(e){return""===e?this.startsWith(e):Ct(this,function(e,t){return 0===e.indexOf(t[0])},[e],He)},It.prototype.equalsIgnoreCase=function(e){return Ct(this,function(e,t){return e===t[0]},[e],"")},It.prototype.anyOfIgnoreCase=function(){var e=I.apply(D,arguments);return 0===e.length?At(this):Ct(this,function(e,t){return-1!==t.indexOf(e)},e,"")},It.prototype.startsWithAnyOfIgnoreCase=function(){var e=I.apply(D,arguments);return 0===e.length?At(this):Ct(this,function(t,e){return e.some(function(e){return 0===t.indexOf(e)})},e,He)},It.prototype.anyOf=function(){var t=this,i=I.apply(D,arguments),o=this._cmp;try{i.sort(o)}catch(e){return jt(this,Je)}if(0===i.length)return At(this);var e=new this.Collection(this,function(){return Tt(i[0],i[i.length-1])});e._ondirectionchange=function(e){o="next"===e?t._ascending:t._descending,i.sort(o)};var a=0;return e._addAlgorithm(function(e,t,n){for(var r=e.key;0<o(r,i[a]);)if(++a===i.length)return t(n),!1;return 0===o(r,i[a])||(t(function(){e.continue(i[a])}),!1)}),e},It.prototype.notEqual=function(e){return this.inAnyRange([[-1/0,e],[e,this.db._maxKey]],{includeLowers:!1,includeUppers:!1})},It.prototype.noneOf=function(){var e=I.apply(D,arguments);if(0===e.length)return new this.Collection(this);try{e.sort(this._ascending)}catch(e){return jt(this,Je)}var t=e.reduce(function(e,t){return e?e.concat([[e[e.length-1][1],t]]):[[-1/0,t]]},null);return t.push([e[e.length-1],this.db._maxKey]),this.inAnyRange(t,{includeLowers:!1,includeUppers:!1})},It.prototype.inAnyRange=function(e,t){var o=this,a=this._cmp,u=this._ascending,n=this._descending,s=this._min,c=this._max;if(0===e.length)return At(this);if(!e.every(function(e){return void 0!==e[0]&&void 0!==e[1]&&u(e[0],e[1])<=0}))return jt(this,"First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower",Y.InvalidArgument);var r=!t||!1!==t.includeLowers,i=t&&!0===t.includeUppers;var l,f=u;function h(e,t){return f(e[0],t[0])}try{(l=e.reduce(function(e,t){for(var n=0,r=e.length;n<r;++n){var i=e[n];if(a(t[0],i[1])<0&&0<a(t[1],i[0])){i[0]=s(i[0],t[0]),i[1]=c(i[1],t[1]);break}}return n===r&&e.push(t),e},[])).sort(h)}catch(e){return jt(this,Je)}var d=0,p=i?function(e){return 0<u(e,l[d][1])}:function(e){return 0<=u(e,l[d][1])},y=r?function(e){return 0<n(e,l[d][0])}:function(e){return 0<=n(e,l[d][0])};var v=p,e=new this.Collection(this,function(){return Tt(l[0][0],l[l.length-1][1],!r,!i)});return e._ondirectionchange=function(e){f="next"===e?(v=p,u):(v=y,n),l.sort(h)},e._addAlgorithm(function(e,t,n){for(var r,i=e.key;v(i);)if(++d===l.length)return t(n),!1;return!p(r=i)&&!y(r)||(0===o._cmp(i,l[d][1])||0===o._cmp(i,l[d][0])||t(function(){f===u?e.continue(l[d][0]):e.continue(l[d][1])}),!1)}),e},It.prototype.startsWithAnyOf=function(){var e=I.apply(D,arguments);return e.every(function(e){return"string"==typeof e})?0===e.length?At(this):this.inAnyRange(e.map(function(e){return[e,e+He]})):jt(this,"startsWithAnyOf() only works with strings")},It);function It(){}function Bt(t){return qe(function(e){return Rt(e),t(e.target.error),!1})}function Rt(e){e.stopPropagation&&e.stopPropagation(),e.preventDefault&&e.preventDefault()}var Ft="storagemutated",Mt="x-storagemutated-1",Nt=dt(null,Ft),Lt=(Ut.prototype._lock=function(){return y(!me.global),++this._reculock,1!==this._reculock||me.global||(me.lockOwnerFor=this),this},Ut.prototype._unlock=function(){if(y(!me.global),0==--this._reculock)for(me.global||(me.lockOwnerFor=null);0<this._blockedFuncs.length&&!this._locked();){var e=this._blockedFuncs.shift();try{$e(e[1],e[0])}catch(e){}}return this},Ut.prototype._locked=function(){return this._reculock&&me.lockOwnerFor!==this},Ut.prototype.create=function(t){var n=this;if(!this.mode)return this;var e=this.db.idbdb,r=this.db._state.dbOpenError;if(y(!this.idbtrans),!t&&!e)switch(r&&r.name){case"DatabaseClosedError":throw new Y.DatabaseClosed(r);case"MissingAPIError":throw new Y.MissingAPI(r.message,r);default:throw new Y.OpenFailed(r)}if(!this.active)throw new Y.TransactionInactive;return y(null===this._completion._state),(t=this.idbtrans=t||(this.db.core||e).transaction(this.storeNames,this.mode,{durability:this.chromeTransactionDurability})).onerror=qe(function(e){Rt(e),n._reject(t.error)}),t.onabort=qe(function(e){Rt(e),n.active&&n._reject(new Y.Abort(t.error)),n.active=!1,n.on("abort").fire(e)}),t.oncomplete=qe(function(){n.active=!1,n._resolve(),"mutatedParts"in t&&Nt.storagemutated.fire(t.mutatedParts)}),this},Ut.prototype._promise=function(n,r,i){var o=this;if("readwrite"===n&&"readwrite"!==this.mode)return Xe(new Y.ReadOnly("Transaction is readonly"));if(!this.active)return Xe(new Y.TransactionInactive);if(this._locked())return new _e(function(e,t){o._blockedFuncs.push([function(){o._promise(n,r,i).then(e,t)},me])});if(i)return Ne(function(){var e=new _e(function(e,t){o._lock();var n=r(e,t,o);n&&n.then&&n.then(e,t)});return e.finally(function(){return o._unlock()}),e._lib=!0,e});var e=new _e(function(e,t){var n=r(e,t,o);n&&n.then&&n.then(e,t)});return e._lib=!0,e},Ut.prototype._root=function(){return this.parent?this.parent._root():this},Ut.prototype.waitFor=function(e){var t,r=this._root(),i=_e.resolve(e);r._waitingFor?r._waitingFor=r._waitingFor.then(function(){return i}):(r._waitingFor=i,r._waitingQueue=[],t=r.idbtrans.objectStore(r.storeNames[0]),function e(){for(++r._spinCount;r._waitingQueue.length;)r._waitingQueue.shift()();r._waitingFor&&(t.get(-1/0).onsuccess=e)}());var o=r._waitingFor;return new _e(function(t,n){i.then(function(e){return r._waitingQueue.push(qe(t.bind(null,e)))},function(e){return r._waitingQueue.push(qe(n.bind(null,e)))}).finally(function(){r._waitingFor===o&&(r._waitingFor=null)})})},Ut.prototype.abort=function(){this.active&&(this.active=!1,this.idbtrans&&this.idbtrans.abort(),this._reject(new Y.Abort))},Ut.prototype.table=function(e){var t=this._memoizedTables||(this._memoizedTables={});if(m(t,e))return t[e];var n=this.schema[e];if(!n)throw new Y.NotFound("Table "+e+" not part of transaction");n=new this.db.Table(e,n,this);return n.core=this.db.core.table(e),t[e]=n},Ut);function Ut(){}function Vt(e,t,n,r,i,o,a){return{name:e,keyPath:t,unique:n,multi:r,auto:i,compound:o,src:(n&&!a?"&":"")+(r?"*":"")+(i?"++":"")+zt(t)}}function zt(e){return"string"==typeof e?e:e?"["+[].join.call(e,"+")+"]":""}function Wt(e,t,n){return{name:e,primKey:t,indexes:n,mappedClass:null,idxByName:(r=function(e){return[e.name,e]},n.reduce(function(e,t,n){n=r(t,n);return n&&(e[n[0]]=n[1]),e},{}))};// removed by dead control flow
{ var r; }}var Yt=function(e){try{return e.only([[]]),Yt=function(){return[[]]},[[]]}catch(e){return Yt=function(){return He},He}};function $t(t){return null==t?function(){}:"string"==typeof t?1===(n=t).split(".").length?function(e){return e[n]}:function(e){return O(e,n)}:function(e){return O(e,t)};// removed by dead control flow
{ var n; }}function Qt(e){return[].slice.call(e)}var Gt=0;function Xt(e){return null==e?":id":"string"==typeof e?e:"[".concat(e.join("+"),"]")}function Ht(e,i,t){function _(e){if(3===e.type)return null;if(4===e.type)throw new Error("Cannot convert never type to IDBKeyRange");var t=e.lower,n=e.upper,r=e.lowerOpen,e=e.upperOpen;return void 0===t?void 0===n?null:i.upperBound(n,!!e):void 0===n?i.lowerBound(t,!!r):i.bound(t,n,!!r,!!e)}function n(e){var h,w=e.name;return{name:w,schema:e,mutate:function(e){var y=e.trans,v=e.type,m=e.keys,b=e.values,g=e.range;return new Promise(function(t,e){t=qe(t);var n=y.objectStore(w),r=null==n.keyPath,i="put"===v||"add"===v;if(!i&&"delete"!==v&&"deleteRange"!==v)throw new Error("Invalid operation type: "+v);var o,a=(m||b||{length:1}).length;if(m&&b&&m.length!==b.length)throw new Error("Given keys array must have same length as given values array.");if(0===a)return t({numFailures:0,failures:{},results:[],lastResult:void 0});function u(e){++l,Rt(e)}var s=[],c=[],l=0;if("deleteRange"===v){if(4===g.type)return t({numFailures:l,failures:c,results:[],lastResult:void 0});3===g.type?s.push(o=n.clear()):s.push(o=n.delete(_(g)))}else{var r=i?r?[b,m]:[b,null]:[m,null],f=r[0],h=r[1];if(i)for(var d=0;d<a;++d)s.push(o=h&&void 0!==h[d]?n[v](f[d],h[d]):n[v](f[d])),o.onerror=u;else for(d=0;d<a;++d)s.push(o=n[v](f[d])),o.onerror=u}function p(e){e=e.target.result,s.forEach(function(e,t){return null!=e.error&&(c[t]=e.error)}),t({numFailures:l,failures:c,results:"delete"===v?m:s.map(function(e){return e.result}),lastResult:e})}o.onerror=function(e){u(e),p(e)},o.onsuccess=p})},getMany:function(e){var f=e.trans,h=e.keys;return new Promise(function(t,e){t=qe(t);for(var n,r=f.objectStore(w),i=h.length,o=new Array(i),a=0,u=0,s=function(e){e=e.target;o[e._pos]=e.result,++u===a&&t(o)},c=Bt(e),l=0;l<i;++l)null!=h[l]&&((n=r.get(h[l]))._pos=l,n.onsuccess=s,n.onerror=c,++a);0===a&&t(o)})},get:function(e){var r=e.trans,i=e.key;return new Promise(function(t,e){t=qe(t);var n=r.objectStore(w).get(i);n.onsuccess=function(e){return t(e.target.result)},n.onerror=Bt(e)})},query:(h=s,function(f){return new Promise(function(n,e){n=qe(n);var r,i,o,t=f.trans,a=f.values,u=f.limit,s=f.query,c=u===1/0?void 0:u,l=s.index,s=s.range,t=t.objectStore(w),l=l.isPrimaryKey?t:t.index(l.name),s=_(s);if(0===u)return n({result:[]});h?((c=a?l.getAll(s,c):l.getAllKeys(s,c)).onsuccess=function(e){return n({result:e.target.result})},c.onerror=Bt(e)):(r=0,i=!a&&"openKeyCursor"in l?l.openKeyCursor(s):l.openCursor(s),o=[],i.onsuccess=function(e){var t=i.result;return t?(o.push(a?t.value:t.primaryKey),++r===u?n({result:o}):void t.continue()):n({result:o})},i.onerror=Bt(e))})}),openCursor:function(e){var c=e.trans,o=e.values,a=e.query,u=e.reverse,l=e.unique;return new Promise(function(t,n){t=qe(t);var e=a.index,r=a.range,i=c.objectStore(w),i=e.isPrimaryKey?i:i.index(e.name),e=u?l?"prevunique":"prev":l?"nextunique":"next",s=!o&&"openKeyCursor"in i?i.openKeyCursor(_(r),e):i.openCursor(_(r),e);s.onerror=Bt(n),s.onsuccess=qe(function(e){var r,i,o,a,u=s.result;u?(u.___id=++Gt,u.done=!1,r=u.continue.bind(u),i=(i=u.continuePrimaryKey)&&i.bind(u),o=u.advance.bind(u),a=function(){throw new Error("Cursor not stopped")},u.trans=c,u.stop=u.continue=u.continuePrimaryKey=u.advance=function(){throw new Error("Cursor not started")},u.fail=qe(n),u.next=function(){var e=this,t=1;return this.start(function(){return t--?e.continue():e.stop()}).then(function(){return e})},u.start=function(e){function t(){if(s.result)try{e()}catch(e){u.fail(e)}else u.done=!0,u.start=function(){throw new Error("Cursor behind last entry")},u.stop()}var n=new Promise(function(t,e){t=qe(t),s.onerror=Bt(e),u.fail=e,u.stop=function(e){u.stop=u.continue=u.continuePrimaryKey=u.advance=a,t(e)}});return s.onsuccess=qe(function(e){s.onsuccess=t,t()}),u.continue=r,u.continuePrimaryKey=i,u.advance=o,t(),n},t(u)):t(null)},n)})},count:function(e){var t=e.query,i=e.trans,o=t.index,a=t.range;return new Promise(function(t,e){var n=i.objectStore(w),r=o.isPrimaryKey?n:n.index(o.name),n=_(a),r=n?r.count(n):r.count();r.onsuccess=qe(function(e){return t(e.target.result)}),r.onerror=Bt(e)})}}}var r,o,a,u=(o=t,a=Qt((r=e).objectStoreNames),{schema:{name:r.name,tables:a.map(function(e){return o.objectStore(e)}).map(function(t){var e=t.keyPath,n=t.autoIncrement,r=k(e),i={},n={name:t.name,primaryKey:{name:null,isPrimaryKey:!0,outbound:null==e,compound:r,keyPath:e,autoIncrement:n,unique:!0,extractKey:$t(e)},indexes:Qt(t.indexNames).map(function(e){return t.index(e)}).map(function(e){var t=e.name,n=e.unique,r=e.multiEntry,e=e.keyPath,r={name:t,compound:k(e),keyPath:e,unique:n,multiEntry:r,extractKey:$t(e)};return i[Xt(e)]=r}),getIndexByKeyPath:function(e){return i[Xt(e)]}};return i[":id"]=n.primaryKey,null!=e&&(i[Xt(e)]=n.primaryKey),n})},hasGetAll:0<a.length&&"getAll"in o.objectStore(a[0])&&!("undefined"!=typeof navigator&&/Safari/.test(navigator.userAgent)&&!/(Chrome\/|Edge\/)/.test(navigator.userAgent)&&[].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1]<604)}),t=u.schema,s=u.hasGetAll,u=t.tables.map(n),c={};return u.forEach(function(e){return c[e.name]=e}),{stack:"dbcore",transaction:e.transaction.bind(e),table:function(e){if(!c[e])throw new Error("Table '".concat(e,"' not found"));return c[e]},MIN_KEY:-1/0,MAX_KEY:Yt(i),schema:t}}function Jt(e,t,n,r){var i=n.IDBKeyRange;return n.indexedDB,{dbcore:(r=Ht(t,i,r),e.dbcore.reduce(function(e,t){t=t.create;return _(_({},e),t(e))},r))}}function Zt(n,e){var t=e.db,e=Jt(n._middlewares,t,n._deps,e);n.core=e.dbcore,n.tables.forEach(function(e){var t=e.name;n.core.schema.tables.some(function(e){return e.name===t})&&(e.core=n.core.table(t),n[t]instanceof n.Table&&(n[t].core=e.core))})}function en(i,e,t,o){t.forEach(function(n){var r=o[n];e.forEach(function(e){var t=function e(t,n){return h(t,n)||(t=c(t))&&e(t,n)}(e,n);(!t||"value"in t&&void 0===t.value)&&(e===i.Transaction.prototype||e instanceof i.Transaction?l(e,n,{get:function(){return this.table(n)},set:function(e){u(this,n,{value:e,writable:!0,configurable:!0,enumerable:!0})}}):e[n]=new i.Table(n,r))})})}function tn(n,e){e.forEach(function(e){for(var t in e)e[t]instanceof n.Table&&delete e[t]})}function nn(e,t){return e._cfg.version-t._cfg.version}function rn(n,r,i,e){var o=n._dbSchema;i.objectStoreNames.contains("$meta")&&!o.$meta&&(o.$meta=Wt("$meta",hn("")[0],[]),n._storeNames.push("$meta"));var a=n._createTransaction("readwrite",n._storeNames,o);a.create(i),a._completion.catch(e);var u=a._reject.bind(a),s=me.transless||me;Ne(function(){return me.trans=a,me.transless=s,0!==r?(Zt(n,i),t=r,((e=a).storeNames.includes("$meta")?e.table("$meta").get("version").then(function(e){return null!=e?e:t}):_e.resolve(t)).then(function(e){return c=e,l=a,f=i,t=[],e=(s=n)._versions,h=s._dbSchema=ln(0,s.idbdb,f),0!==(e=e.filter(function(e){return e._cfg.version>=c})).length?(e.forEach(function(u){t.push(function(){var t=h,e=u._cfg.dbschema;fn(s,t,f),fn(s,e,f),h=s._dbSchema=e;var n=an(t,e);n.add.forEach(function(e){un(f,e[0],e[1].primKey,e[1].indexes)}),n.change.forEach(function(e){if(e.recreate)throw new Y.Upgrade("Not yet support for changing primary key");var t=f.objectStore(e.name);e.add.forEach(function(e){return cn(t,e)}),e.change.forEach(function(e){t.deleteIndex(e.name),cn(t,e)}),e.del.forEach(function(e){return t.deleteIndex(e)})});var r=u._cfg.contentUpgrade;if(r&&u._cfg.version>c){Zt(s,f),l._memoizedTables={};var i=g(e);n.del.forEach(function(e){i[e]=t[e]}),tn(s,[s.Transaction.prototype]),en(s,[s.Transaction.prototype],x(i),i),l.schema=i;var o,a=B(r);a&&Le();n=_e.follow(function(){var e;(o=r(l))&&a&&(e=Ue.bind(null,null),o.then(e,e))});return o&&"function"==typeof o.then?_e.resolve(o):n.then(function(){return o})}}),t.push(function(e){var t,n,r=u._cfg.dbschema;t=r,n=e,[].slice.call(n.db.objectStoreNames).forEach(function(e){return null==t[e]&&n.db.deleteObjectStore(e)}),tn(s,[s.Transaction.prototype]),en(s,[s.Transaction.prototype],s._storeNames,s._dbSchema),l.schema=s._dbSchema}),t.push(function(e){s.idbdb.objectStoreNames.contains("$meta")&&(Math.ceil(s.idbdb.version/10)===u._cfg.version?(s.idbdb.deleteObjectStore("$meta"),delete s._dbSchema.$meta,s._storeNames=s._storeNames.filter(function(e){return"$meta"!==e})):e.objectStore("$meta").put(u._cfg.version,"version"))})}),function e(){return t.length?_e.resolve(t.shift()(l.idbtrans)).then(e):_e.resolve()}().then(function(){sn(h,f)})):_e.resolve();// removed by dead control flow
{ var s, c, l, f, t, h; }}).catch(u)):(x(o).forEach(function(e){un(i,e,o[e].primKey,o[e].indexes)}),Zt(n,i),void _e.follow(function(){return n.on.populate.fire(a)}).catch(u));// removed by dead control flow
{ var e, t; }})}function on(e,r){sn(e._dbSchema,r),r.db.version%10!=0||r.objectStoreNames.contains("$meta")||r.db.createObjectStore("$meta").add(Math.ceil(r.db.version/10-1),"version");var t=ln(0,e.idbdb,r);fn(e,e._dbSchema,r);for(var n=0,i=an(t,e._dbSchema).change;n<i.length;n++){var o=function(t){if(t.change.length||t.recreate)return console.warn("Unable to patch indexes of table ".concat(t.name," because it has changes on the type of index or primary key.")),{value:void 0};var n=r.objectStore(t.name);t.add.forEach(function(e){ie&&console.debug("Dexie upgrade patch: Creating missing index ".concat(t.name,".").concat(e.src)),cn(n,e)})}(i[n]);if("object"==typeof o)return o.value}}function an(e,t){var n,r={del:[],add:[],change:[]};for(n in e)t[n]||r.del.push(n);for(n in t){var i=e[n],o=t[n];if(i){var a={name:n,def:o,recreate:!1,del:[],add:[],change:[]};if(""+(i.primKey.keyPath||"")!=""+(o.primKey.keyPath||"")||i.primKey.auto!==o.primKey.auto)a.recreate=!0,r.change.push(a);else{var u=i.idxByName,s=o.idxByName,c=void 0;for(c in u)s[c]||a.del.push(c);for(c in s){var l=u[c],f=s[c];l?l.src!==f.src&&a.change.push(f):a.add.push(f)}(0<a.del.length||0<a.add.length||0<a.change.length)&&r.change.push(a)}}else r.add.push([n,o])}return r}function un(e,t,n,r){var i=e.db.createObjectStore(t,n.keyPath?{keyPath:n.keyPath,autoIncrement:n.auto}:{autoIncrement:n.auto});return r.forEach(function(e){return cn(i,e)}),i}function sn(t,n){x(t).forEach(function(e){n.db.objectStoreNames.contains(e)||(ie&&console.debug("Dexie: Creating missing table",e),un(n,e,t[e].primKey,t[e].indexes))})}function cn(e,t){e.createIndex(t.name,t.keyPath,{unique:t.unique,multiEntry:t.multi})}function ln(e,t,u){var s={};return b(t.objectStoreNames,0).forEach(function(e){for(var t=u.objectStore(e),n=Vt(zt(a=t.keyPath),a||"",!0,!1,!!t.autoIncrement,a&&"string"!=typeof a,!0),r=[],i=0;i<t.indexNames.length;++i){var o=t.index(t.indexNames[i]),a=o.keyPath,o=Vt(o.name,a,!!o.unique,!!o.multiEntry,!1,a&&"string"!=typeof a,!1);r.push(o)}s[e]=Wt(e,n,r)}),s}function fn(e,t,n){for(var r=n.db.objectStoreNames,i=0;i<r.length;++i){var o=r[i],a=n.objectStore(o);e._hasGetAll="getAll"in a;for(var u=0;u<a.indexNames.length;++u){var s=a.indexNames[u],c=a.index(s).keyPath,l="string"==typeof c?c:"["+b(c).join("+")+"]";!t[o]||(c=t[o].idxByName[l])&&(c.name=s,delete t[o].idxByName[l],t[o].idxByName[s]=c)}}"undefined"!=typeof navigator&&/Safari/.test(navigator.userAgent)&&!/(Chrome\/|Edge\/)/.test(navigator.userAgent)&&f.WorkerGlobalScope&&f instanceof f.WorkerGlobalScope&&[].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1]<604&&(e._hasGetAll=!1)}function hn(e){return e.split(",").map(function(e,t){var n=(e=e.trim()).replace(/([&*]|\+\+)/g,""),r=/^\[/.test(n)?n.match(/^\[(.*)\]$/)[1].split("+"):n;return Vt(n,r||null,/\&/.test(e),/\*/.test(e),/\+\+/.test(e),k(r),0===t)})}var dn=(pn.prototype._parseStoresSpec=function(r,i){x(r).forEach(function(e){if(null!==r[e]){var t=hn(r[e]),n=t.shift();if(n.unique=!0,n.multi)throw new Y.Schema("Primary key cannot be multi-valued");t.forEach(function(e){if(e.auto)throw new Y.Schema("Only primary key can be marked as autoIncrement (++)");if(!e.keyPath)throw new Y.Schema("Index must have a name and cannot be an empty string")}),i[e]=Wt(e,n,t)}})},pn.prototype.stores=function(e){var t=this.db;this._cfg.storesSource=this._cfg.storesSource?a(this._cfg.storesSource,e):e;var e=t._versions,n={},r={};return e.forEach(function(e){a(n,e._cfg.storesSource),r=e._cfg.dbschema={},e._parseStoresSpec(n,r)}),t._dbSchema=r,tn(t,[t._allTables,t,t.Transaction.prototype]),en(t,[t._allTables,t,t.Transaction.prototype,this._cfg.tables],x(r),r),t._storeNames=x(r),this},pn.prototype.upgrade=function(e){return this._cfg.contentUpgrade=re(this._cfg.contentUpgrade||G,e),this},pn);function pn(){}function yn(e,t){var n=e._dbNamesDB;return n||(n=e._dbNamesDB=new er(tt,{addons:[],indexedDB:e,IDBKeyRange:t})).version(1).stores({dbnames:"name"}),n.table("dbnames")}function vn(e){return e&&"function"==typeof e.databases}function mn(e){return Ne(function(){return me.letThrough=!0,e()})}function bn(e){return!("from"in e)}var gn=function(e,t){if(!this){var n=new gn;return e&&"d"in e&&a(n,e),n}a(this,arguments.length?{d:1,from:e,to:1<arguments.length?t:e}:{d:0})};function wn(e,t,n){var r=st(t,n);if(!isNaN(r)){if(0<r)throw RangeError();if(bn(e))return a(e,{from:t,to:n,d:1});var i=e.l,r=e.r;if(st(n,e.from)<0)return i?wn(i,t,n):e.l={from:t,to:n,d:1,l:null,r:null},On(e);if(0<st(t,e.to))return r?wn(r,t,n):e.r={from:t,to:n,d:1,l:null,r:null},On(e);st(t,e.from)<0&&(e.from=t,e.l=null,e.d=r?r.d+1:1),0<st(n,e.to)&&(e.to=n,e.r=null,e.d=e.l?e.l.d+1:1);n=!e.r;i&&!e.l&&_n(e,i),r&&n&&_n(e,r)}}function _n(e,t){bn(t)||function e(t,n){var r=n.from,i=n.to,o=n.l,n=n.r;wn(t,r,i),o&&e(t,o),n&&e(t,n)}(e,t)}function xn(e,t){var n=kn(t),r=n.next();if(r.done)return!1;for(var i=r.value,o=kn(e),a=o.next(i.from),u=a.value;!r.done&&!a.done;){if(st(u.from,i.to)<=0&&0<=st(u.to,i.from))return!0;st(i.from,u.from)<0?i=(r=n.next(u.from)).value:u=(a=o.next(i.from)).value}return!1}function kn(e){var n=bn(e)?null:{s:0,n:e};return{next:function(e){for(var t=0<arguments.length;n;)switch(n.s){case 0:if(n.s=1,t)for(;n.n.l&&st(e,n.n.from)<0;)n={up:n,n:n.n.l,s:1};else for(;n.n.l;)n={up:n,n:n.n.l,s:1};case 1:if(n.s=2,!t||st(e,n.n.to)<=0)return{value:n.n,done:!1};case 2:if(n.n.r){n.s=3,n={up:n,n:n.n.r,s:0};continue}case 3:n=n.up}return{done:!0}}}}function On(e){var t,n,r=((null===(t=e.r)||void 0===t?void 0:t.d)||0)-((null===(n=e.l)||void 0===n?void 0:n.d)||0),i=1<r?"r":r<-1?"l":"";i&&(t="r"==i?"l":"r",n=_({},e),r=e[i],e.from=r.from,e.to=r.to,e[i]=r[i],n[i]=r[t],(e[t]=n).d=Pn(n)),e.d=Pn(e)}function Pn(e){var t=e.r,e=e.l;return(t?e?Math.max(t.d,e.d):t.d:e?e.d:0)+1}function Kn(t,n){return x(n).forEach(function(e){t[e]?_n(t[e],n[e]):t[e]=function e(t){var n,r,i={};for(n in t)m(t,n)&&(r=t[n],i[n]=!r||"object"!=typeof r||K.has(r.constructor)?r:e(r));return i}(n[e])}),t}function En(t,n){return t.all||n.all||Object.keys(t).some(function(e){return n[e]&&xn(n[e],t[e])})}r(gn.prototype,((F={add:function(e){return _n(this,e),this},addKey:function(e){return wn(this,e,e),this},addKeys:function(e){var t=this;return e.forEach(function(e){return wn(t,e,e)}),this},hasKey:function(e){var t=kn(this).next(e).value;return t&&st(t.from,e)<=0&&0<=st(t.to,e)}})[C]=function(){return kn(this)},F));var Sn={},jn={},An=!1;function Cn(e){Kn(jn,e),An||(An=!0,setTimeout(function(){An=!1,Tn(jn,!(jn={}))},0))}function Tn(e,t){void 0===t&&(t=!1);var n=new Set;if(e.all)for(var r=0,i=Object.values(Sn);r<i.length;r++)qn(a=i[r],e,n,t);else for(var o in e){var a,u=/^idb\:\/\/(.*)\/(.*)\//.exec(o);u&&(o=u[1],u=u[2],(a=Sn["idb://".concat(o,"/").concat(u)])&&qn(a,e,n,t))}n.forEach(function(e){return e()})}function qn(e,t,n,r){for(var i=[],o=0,a=Object.entries(e.queries.query);o<a.length;o++){for(var u=a[o],s=u[0],c=[],l=0,f=u[1];l<f.length;l++){var h=f[l];En(t,h.obsSet)?h.subscribers.forEach(function(e){return n.add(e)}):r&&c.push(h)}r&&i.push([s,c])}if(r)for(var d=0,p=i;d<p.length;d++){var y=p[d],s=y[0],c=y[1];e.queries.query[s]=c}}function Dn(f){var h=f._state,r=f._deps.indexedDB;if(h.isBeingOpened||f.idbdb)return h.dbReadyPromise.then(function(){return h.dbOpenError?Xe(h.dbOpenError):f});h.isBeingOpened=!0,h.dbOpenError=null,h.openComplete=!1;var t=h.openCanceller,d=Math.round(10*f.verno),p=!1;function e(){if(h.openCanceller!==t)throw new Y.DatabaseClosed("db.open() was cancelled")}function y(){return new _e(function(s,n){if(e(),!r)throw new Y.MissingAPI;var c=f.name,l=h.autoSchema||!d?r.open(c):r.open(c,d);if(!l)throw new Y.MissingAPI;l.onerror=Bt(n),l.onblocked=qe(f._fireOnBlocked),l.onupgradeneeded=qe(function(e){var t;v=l.transaction,h.autoSchema&&!f._options.allowEmptyDB?(l.onerror=Rt,v.abort(),l.result.close(),(t=r.deleteDatabase(c)).onsuccess=t.onerror=qe(function(){n(new Y.NoSuchDatabase("Database ".concat(c," doesnt exist")))})):(v.onerror=Bt(n),e=e.oldVersion>Math.pow(2,62)?0:e.oldVersion,m=e<1,f.idbdb=l.result,p&&on(f,v),rn(f,e/10,v,n))},n),l.onsuccess=qe(function(){v=null;var e,t,n,r,i,o=f.idbdb=l.result,a=b(o.objectStoreNames);if(0<a.length)try{var u=o.transaction(1===(r=a).length?r[0]:r,"readonly");if(h.autoSchema)t=o,n=u,(e=f).verno=t.version/10,n=e._dbSchema=ln(0,t,n),e._storeNames=b(t.objectStoreNames,0),en(e,[e._allTables],x(n),n);else if(fn(f,f._dbSchema,u),((i=an(ln(0,(i=f).idbdb,u),i._dbSchema)).add.length||i.change.some(function(e){return e.add.length||e.change.length}))&&!p)return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."),o.close(),d=o.version+1,p=!0,s(y());Zt(f,u)}catch(e){}et.push(f),o.onversionchange=qe(function(e){h.vcFired=!0,f.on("versionchange").fire(e)}),o.onclose=qe(function(e){f.on("close").fire(e)}),m&&(i=f._deps,u=c,o=i.indexedDB,i=i.IDBKeyRange,vn(o)||u===tt||yn(o,i).put({name:u}).catch(G)),s()},n)}).catch(function(e){switch(null==e?void 0:e.name){case"UnknownError":if(0<h.PR1398_maxLoop)return h.PR1398_maxLoop--,console.warn("Dexie: Workaround for Chrome UnknownError on open()"),y();break;case"VersionError":if(0<d)return d=0,y()}return _e.reject(e)})}var n,i=h.dbReadyResolve,v=null,m=!1;return _e.race([t,("undefined"==typeof navigator?_e.resolve():!navigator.userAgentData&&/Safari\//.test(navigator.userAgent)&&!/Chrom(e|ium)\//.test(navigator.userAgent)&&indexedDB.databases?new Promise(function(e){function t(){return indexedDB.databases().finally(e)}n=setInterval(t,100),t()}).finally(function(){return clearInterval(n)}):Promise.resolve()).then(y)]).then(function(){return e(),h.onReadyBeingFired=[],_e.resolve(mn(function(){return f.on.ready.fire(f.vip)})).then(function e(){if(0<h.onReadyBeingFired.length){var t=h.onReadyBeingFired.reduce(re,G);return h.onReadyBeingFired=[],_e.resolve(mn(function(){return t(f.vip)})).then(e)}})}).finally(function(){h.openCanceller===t&&(h.onReadyBeingFired=null,h.isBeingOpened=!1)}).catch(function(e){h.dbOpenError=e;try{v&&v.abort()}catch(e){}return t===h.openCanceller&&f._close(),Xe(e)}).finally(function(){h.openComplete=!0,i()}).then(function(){var n;return m&&(n={},f.tables.forEach(function(t){t.schema.indexes.forEach(function(e){e.name&&(n["idb://".concat(f.name,"/").concat(t.name,"/").concat(e.name)]=new gn(-1/0,[[[]]]))}),n["idb://".concat(f.name,"/").concat(t.name,"/")]=n["idb://".concat(f.name,"/").concat(t.name,"/:dels")]=new gn(-1/0,[[[]]])}),Nt(Ft).fire(n),Tn(n,!0)),f})}function In(t){function e(e){return t.next(e)}var r=n(e),i=n(function(e){return t.throw(e)});function n(n){return function(e){var t=n(e),e=t.value;return t.done?e:e&&"function"==typeof e.then?e.then(r,i):k(e)?Promise.all(e).then(r,i):r(e)}}return n(e)()}function Bn(e,t,n){for(var r=k(e)?e.slice():[e],i=0;i<n;++i)r.push(t);return r}var Rn={stack:"dbcore",name:"VirtualIndexMiddleware",level:1,create:function(f){return _(_({},f),{table:function(e){var a=f.table(e),t=a.schema,u={},s=[];function c(e,t,n){var r=Xt(e),i=u[r]=u[r]||[],o=null==e?0:"string"==typeof e?1:e.length,a=0<t,a=_(_({},n),{name:a?"".concat(r,"(virtual-from:").concat(n.name,")"):n.name,lowLevelIndex:n,isVirtual:a,keyTail:t,keyLength:o,extractKey:$t(e),unique:!a&&n.unique});return i.push(a),a.isPrimaryKey||s.push(a),1<o&&c(2===o?e[0]:e.slice(0,o-1),t+1,n),i.sort(function(e,t){return e.keyTail-t.keyTail}),a}e=c(t.primaryKey.keyPath,0,t.primaryKey);u[":id"]=[e];for(var n=0,r=t.indexes;n<r.length;n++){var i=r[n];c(i.keyPath,0,i)}function l(e){var t,n=e.query.index;return n.isVirtual?_(_({},e),{query:{index:n.lowLevelIndex,range:(t=e.query.range,n=n.keyTail,{type:1===t.type?2:t.type,lower:Bn(t.lower,t.lowerOpen?f.MAX_KEY:f.MIN_KEY,n),lowerOpen:!0,upper:Bn(t.upper,t.upperOpen?f.MIN_KEY:f.MAX_KEY,n),upperOpen:!0})}}):e}return _(_({},a),{schema:_(_({},t),{primaryKey:e,indexes:s,getIndexByKeyPath:function(e){return(e=u[Xt(e)])&&e[0]}}),count:function(e){return a.count(l(e))},query:function(e){return a.query(l(e))},openCursor:function(t){var e=t.query.index,r=e.keyTail,n=e.isVirtual,i=e.keyLength;return n?a.openCursor(l(t)).then(function(e){return e&&o(e)}):a.openCursor(t);function o(n){return Object.create(n,{continue:{value:function(e){null!=e?n.continue(Bn(e,t.reverse?f.MAX_KEY:f.MIN_KEY,r)):t.unique?n.continue(n.key.slice(0,i).concat(t.reverse?f.MIN_KEY:f.MAX_KEY,r)):n.continue()}},continuePrimaryKey:{value:function(e,t){n.continuePrimaryKey(Bn(e,f.MAX_KEY,r),t)}},primaryKey:{get:function(){return n.primaryKey}},key:{get:function(){var e=n.key;return 1===i?e[0]:e.slice(0,i)}},value:{get:function(){return n.value}}})}}})}})}};function Fn(i,o,a,u){return a=a||{},u=u||"",x(i).forEach(function(e){var t,n,r;m(o,e)?(t=i[e],n=o[e],"object"==typeof t&&"object"==typeof n&&t&&n?(r=A(t))!==A(n)?a[u+e]=o[e]:"Object"===r?Fn(t,n,a,u+e+"."):t!==n&&(a[u+e]=o[e]):t!==n&&(a[u+e]=o[e])):a[u+e]=void 0}),x(o).forEach(function(e){m(i,e)||(a[u+e]=o[e])}),a}function Mn(e,t){return"delete"===t.type?t.keys:t.keys||t.values.map(e.extractKey)}var Nn={stack:"dbcore",name:"HooksMiddleware",level:2,create:function(e){return _(_({},e),{table:function(r){var y=e.table(r),v=y.schema.primaryKey;return _(_({},y),{mutate:function(e){var t=me.trans,n=t.table(r).hook,h=n.deleting,d=n.creating,p=n.updating;switch(e.type){case"add":if(d.fire===G)break;return t._promise("readwrite",function(){return a(e)},!0);case"put":if(d.fire===G&&p.fire===G)break;return t._promise("readwrite",function(){return a(e)},!0);case"delete":if(h.fire===G)break;return t._promise("readwrite",function(){return a(e)},!0);case"deleteRange":if(h.fire===G)break;return t._promise("readwrite",function(){return function n(r,i,o){return y.query({trans:r,values:!1,query:{index:v,range:i},limit:o}).then(function(e){var t=e.result;return a({type:"delete",keys:t,trans:r}).then(function(e){return 0<e.numFailures?Promise.reject(e.failures[0]):t.length<o?{failures:[],numFailures:0,lastResult:void 0}:n(r,_(_({},i),{lower:t[t.length-1],lowerOpen:!0}),o)})})}(e.trans,e.range,1e4)},!0)}return y.mutate(e);function a(c){var e,t,n,l=me.trans,f=c.keys||Mn(v,c);if(!f)throw new Error("Keys missing");return"delete"!==(c="add"===c.type||"put"===c.type?_(_({},c),{keys:f}):_({},c)).type&&(c.values=i([],c.values,!0)),c.keys&&(c.keys=i([],c.keys,!0)),e=y,n=f,("add"===(t=c).type?Promise.resolve([]):e.getMany({trans:t.trans,keys:n,cache:"immutable"})).then(function(u){var s=f.map(function(e,t){var n,r,i,o=u[t],a={onerror:null,onsuccess:null};return"delete"===c.type?h.fire.call(a,e,o,l):"add"===c.type||void 0===o?(n=d.fire.call(a,e,c.values[t],l),null==e&&null!=n&&(c.keys[t]=e=n,v.outbound||P(c.values[t],v.keyPath,e))):(n=Fn(o,c.values[t]),(r=p.fire.call(a,n,e,o,l))&&(i=c.values[t],Object.keys(r).forEach(function(e){m(i,e)?i[e]=r[e]:P(i,e,r[e])}))),a});return y.mutate(c).then(function(e){for(var t=e.failures,n=e.results,r=e.numFailures,e=e.lastResult,i=0;i<f.length;++i){var o=(n||f)[i],a=s[i];null==o?a.onerror&&a.onerror(t[i]):a.onsuccess&&a.onsuccess("put"===c.type&&u[i]?c.values[i]:o)}return{failures:t,results:n,numFailures:r,lastResult:e}}).catch(function(t){return s.forEach(function(e){return e.onerror&&e.onerror(t)}),Promise.reject(t)})})}}})}})}};function Ln(e,t,n){try{if(!t)return null;if(t.keys.length<e.length)return null;for(var r=[],i=0,o=0;i<t.keys.length&&o<e.length;++i)0===st(t.keys[i],e[o])&&(r.push(n?S(t.values[i]):t.values[i]),++o);return r.length===e.length?r:null}catch(e){return null}}var Un={stack:"dbcore",level:-1,create:function(t){return{table:function(e){var n=t.table(e);return _(_({},n),{getMany:function(t){if(!t.cache)return n.getMany(t);var e=Ln(t.keys,t.trans._cache,"clone"===t.cache);return e?_e.resolve(e):n.getMany(t).then(function(e){return t.trans._cache={keys:t.keys,values:"clone"===t.cache?S(e):e},e})},mutate:function(e){return"add"!==e.type&&(e.trans._cache=null),n.mutate(e)}})}}}};function Vn(e,t){return"readonly"===e.trans.mode&&!!e.subscr&&!e.trans.explicit&&"disabled"!==e.trans.db._options.cache&&!t.schema.primaryKey.outbound}function zn(e,t){switch(e){case"query":return t.values&&!t.unique;case"get":case"getMany":case"count":case"openCursor":return!1}}var Wn={stack:"dbcore",level:0,name:"Observability",create:function(b){var g=b.schema.name,w=new gn(b.MIN_KEY,b.MAX_KEY);return _(_({},b),{transaction:function(e,t,n){if(me.subscr&&"readonly"!==t)throw new Y.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(me.querier));return b.transaction(e,t,n)},table:function(d){var p=b.table(d),y=p.schema,v=y.primaryKey,e=y.indexes,c=v.extractKey,l=v.outbound,m=v.autoIncrement&&e.filter(function(e){return e.compound&&e.keyPath.includes(v.keyPath)}),t=_(_({},p),{mutate:function(a){function u(e){return e="idb://".concat(g,"/").concat(d,"/").concat(e),n[e]||(n[e]=new gn)}var e,o,s,t=a.trans,n=a.mutatedParts||(a.mutatedParts={}),r=u(""),i=u(":dels"),c=a.type,l="deleteRange"===a.type?[a.range]:"delete"===a.type?[a.keys]:a.values.length<50?[Mn(v,a).filter(function(e){return e}),a.values]:[],f=l[0],h=l[1],l=a.trans._cache;return k(f)?(r.addKeys(f),(l="delete"===c||f.length===h.length?Ln(f,l):null)||i.addKeys(f),(l||h)&&(e=u,o=l,s=h,y.indexes.forEach(function(t){var n=e(t.name||"");function r(e){return null!=e?t.extractKey(e):null}function i(e){return t.multiEntry&&k(e)?e.forEach(function(e){return n.addKey(e)}):n.addKey(e)}(o||s).forEach(function(e,t){var n=o&&r(o[t]),t=s&&r(s[t]);0!==st(n,t)&&(null!=n&&i(n),null!=t&&i(t))})}))):f?(h={from:null!==(h=f.lower)&&void 0!==h?h:b.MIN_KEY,to:null!==(h=f.upper)&&void 0!==h?h:b.MAX_KEY},i.add(h),r.add(h)):(r.add(w),i.add(w),y.indexes.forEach(function(e){return u(e.name).add(w)})),p.mutate(a).then(function(o){return!f||"add"!==a.type&&"put"!==a.type||(r.addKeys(o.results),m&&m.forEach(function(t){for(var e=a.values.map(function(e){return t.extractKey(e)}),n=t.keyPath.findIndex(function(e){return e===v.keyPath}),r=0,i=o.results.length;r<i;++r)e[r][n]=o.results[r];u(t.name).addKeys(e)})),t.mutatedParts=Kn(t.mutatedParts||{},n),o})}}),e=function(e){var t=e.query,e=t.index,t=t.range;return[e,new gn(null!==(e=t.lower)&&void 0!==e?e:b.MIN_KEY,null!==(t=t.upper)&&void 0!==t?t:b.MAX_KEY)]},f={get:function(e){return[v,new gn(e.key)]},getMany:function(e){return[v,(new gn).addKeys(e.keys)]},count:e,query:e,openCursor:e};return x(f).forEach(function(s){t[s]=function(i){var e=me.subscr,t=!!e,n=Vn(me,p)&&zn(s,i)?i.obsSet={}:e;if(t){var r=function(e){e="idb://".concat(g,"/").concat(d,"/").concat(e);return n[e]||(n[e]=new gn)},o=r(""),a=r(":dels"),e=f[s](i),t=e[0],e=e[1];if(("query"===s&&t.isPrimaryKey&&!i.values?a:r(t.name||"")).add(e),!t.isPrimaryKey){if("count"!==s){var u="query"===s&&l&&i.values&&p.query(_(_({},i),{values:!1}));return p[s].apply(this,arguments).then(function(t){if("query"===s){if(l&&i.values)return u.then(function(e){e=e.result;return o.addKeys(e),t});var e=i.values?t.result.map(c):t.result;(i.values?o:a).addKeys(e)}else if("openCursor"===s){var n=t,r=i.values;return n&&Object.create(n,{key:{get:function(){return a.addKey(n.primaryKey),n.key}},primaryKey:{get:function(){var e=n.primaryKey;return a.addKey(e),e}},value:{get:function(){return r&&o.addKey(n.primaryKey),n.value}}})}return t})}a.add(w)}}return p[s].apply(this,arguments)}}),t}})}};function Yn(e,t,n){if(0===n.numFailures)return t;if("deleteRange"===t.type)return null;var r=t.keys?t.keys.length:"values"in t&&t.values?t.values.length:1;if(n.numFailures===r)return null;t=_({},t);return k(t.keys)&&(t.keys=t.keys.filter(function(e,t){return!(t in n.failures)})),"values"in t&&k(t.values)&&(t.values=t.values.filter(function(e,t){return!(t in n.failures)})),t}function $n(e,t){return n=e,(void 0===(r=t).lower||(r.lowerOpen?0<st(n,r.lower):0<=st(n,r.lower)))&&(e=e,void 0===(t=t).upper||(t.upperOpen?st(e,t.upper)<0:st(e,t.upper)<=0));// removed by dead control flow
{ var n, r; }}function Qn(e,d,t,n,r,i){if(!t||0===t.length)return e;var o=d.query.index,p=o.multiEntry,y=d.query.range,v=n.schema.primaryKey.extractKey,m=o.extractKey,a=(o.lowLevelIndex||o).extractKey,t=t.reduce(function(e,t){var n=e,r=[];if("add"===t.type||"put"===t.type)for(var i=new gn,o=t.values.length-1;0<=o;--o){var a,u=t.values[o],s=v(u);i.hasKey(s)||(a=m(u),(p&&k(a)?a.some(function(e){return $n(e,y)}):$n(a,y))&&(i.addKey(s),r.push(u)))}switch(t.type){case"add":var c=(new gn).addKeys(d.values?e.map(function(e){return v(e)}):e),n=e.concat(d.values?r.filter(function(e){e=v(e);return!c.hasKey(e)&&(c.addKey(e),!0)}):r.map(function(e){return v(e)}).filter(function(e){return!c.hasKey(e)&&(c.addKey(e),!0)}));break;case"put":var l=(new gn).addKeys(t.values.map(function(e){return v(e)}));n=e.filter(function(e){return!l.hasKey(d.values?v(e):e)}).concat(d.values?r:r.map(function(e){return v(e)}));break;case"delete":var f=(new gn).addKeys(t.keys);n=e.filter(function(e){return!f.hasKey(d.values?v(e):e)});break;case"deleteRange":var h=t.range;n=e.filter(function(e){return!$n(v(e),h)})}return n},e);return t===e?e:(t.sort(function(e,t){return st(a(e),a(t))||st(v(e),v(t))}),d.limit&&d.limit<1/0&&(t.length>d.limit?t.length=d.limit:e.length===d.limit&&t.length<d.limit&&(r.dirty=!0)),i?Object.freeze(t):t)}function Gn(e,t){return 0===st(e.lower,t.lower)&&0===st(e.upper,t.upper)&&!!e.lowerOpen==!!t.lowerOpen&&!!e.upperOpen==!!t.upperOpen}function Xn(e,t){return function(e,t,n,r){if(void 0===e)return void 0!==t?-1:0;if(void 0===t)return 1;if(0===(t=st(e,t))){if(n&&r)return 0;if(n)return 1;if(r)return-1}return t}(e.lower,t.lower,e.lowerOpen,t.lowerOpen)<=0&&0<=function(e,t,n,r){if(void 0===e)return void 0!==t?1:0;if(void 0===t)return-1;if(0===(t=st(e,t))){if(n&&r)return 0;if(n)return-1;if(r)return 1}return t}(e.upper,t.upper,e.upperOpen,t.upperOpen)}function Hn(n,r,i,e){n.subscribers.add(i),e.addEventListener("abort",function(){var e,t;n.subscribers.delete(i),0===n.subscribers.size&&(e=n,t=r,setTimeout(function(){0===e.subscribers.size&&q(t,e)},3e3))})}var Jn={stack:"dbcore",level:0,name:"Cache",create:function(k){var O=k.schema.name;return _(_({},k),{transaction:function(g,w,e){var _,t,x=k.transaction(g,w,e);return"readwrite"===w&&(t=(_=new AbortController).signal,e=function(b){return function(){if(_.abort(),"readwrite"===w){for(var t=new Set,e=0,n=g;e<n.length;e++){var r=n[e],i=Sn["idb://".concat(O,"/").concat(r)];if(i){var o=k.table(r),a=i.optimisticOps.filter(function(e){return e.trans===x});if(x._explicit&&b&&x.mutatedParts)for(var u=0,s=Object.values(i.queries.query);u<s.length;u++)for(var c=0,l=(d=s[u]).slice();c<l.length;c++)En((p=l[c]).obsSet,x.mutatedParts)&&(q(d,p),p.subscribers.forEach(function(e){return t.add(e)}));else if(0<a.length){i.optimisticOps=i.optimisticOps.filter(function(e){return e.trans!==x});for(var f=0,h=Object.values(i.queries.query);f<h.length;f++)for(var d,p,y,v=0,m=(d=h[f]).slice();v<m.length;v++)null!=(p=m[v]).res&&x.mutatedParts&&(b&&!p.dirty?(y=Object.isFrozen(p.res),y=Qn(p.res,p.req,a,o,p,y),p.dirty?(q(d,p),p.subscribers.forEach(function(e){return t.add(e)})):y!==p.res&&(p.res=y,p.promise=_e.resolve({result:y}))):(p.dirty&&q(d,p),p.subscribers.forEach(function(e){return t.add(e)})))}}}t.forEach(function(e){return e()})}}},x.addEventListener("abort",e(!1),{signal:t}),x.addEventListener("error",e(!1),{signal:t}),x.addEventListener("complete",e(!0),{signal:t})),x},table:function(c){var l=k.table(c),i=l.schema.primaryKey;return _(_({},l),{mutate:function(t){var e=me.trans;if(i.outbound||"disabled"===e.db._options.cache||e.explicit||"readwrite"!==e.idbtrans.mode)return l.mutate(t);var n=Sn["idb://".concat(O,"/").concat(c)];if(!n)return l.mutate(t);e=l.mutate(t);return"add"!==t.type&&"put"!==t.type||!(50<=t.values.length||Mn(i,t).some(function(e){return null==e}))?(n.optimisticOps.push(t),t.mutatedParts&&Cn(t.mutatedParts),e.then(function(e){0<e.numFailures&&(q(n.optimisticOps,t),(e=Yn(0,t,e))&&n.optimisticOps.push(e),t.mutatedParts&&Cn(t.mutatedParts))}),e.catch(function(){q(n.optimisticOps,t),t.mutatedParts&&Cn(t.mutatedParts)})):e.then(function(r){var e=Yn(0,_(_({},t),{values:t.values.map(function(e,t){var n;if(r.failures[t])return e;e=null!==(n=i.keyPath)&&void 0!==n&&n.includes(".")?S(e):_({},e);return P(e,i.keyPath,r.results[t]),e})}),r);n.optimisticOps.push(e),queueMicrotask(function(){return t.mutatedParts&&Cn(t.mutatedParts)})}),e},query:function(t){if(!Vn(me,l)||!zn("query",t))return l.query(t);var i="immutable"===(null===(o=me.trans)||void 0===o?void 0:o.db._options.cache),e=me,n=e.requery,r=e.signal,o=function(e,t,n,r){var i=Sn["idb://".concat(e,"/").concat(t)];if(!i)return[];if(!(t=i.queries[n]))return[null,!1,i,null];var o=t[(r.query?r.query.index.name:null)||""];if(!o)return[null,!1,i,null];switch(n){case"query":var a=o.find(function(e){return e.req.limit===r.limit&&e.req.values===r.values&&Gn(e.req.query.range,r.query.range)});return a?[a,!0,i,o]:[o.find(function(e){return("limit"in e.req?e.req.limit:1/0)>=r.limit&&(!r.values||e.req.values)&&Xn(e.req.query.range,r.query.range)}),!1,i,o];case"count":a=o.find(function(e){return Gn(e.req.query.range,r.query.range)});return[a,!!a,i,o]}}(O,c,"query",t),a=o[0],e=o[1],u=o[2],s=o[3];return a&&e?a.obsSet=t.obsSet:(e=l.query(t).then(function(e){var t=e.result;if(a&&(a.res=t),i){for(var n=0,r=t.length;n<r;++n)Object.freeze(t[n]);Object.freeze(t)}else e.result=S(t);return e}).catch(function(e){return s&&a&&q(s,a),Promise.reject(e)}),a={obsSet:t.obsSet,promise:e,subscribers:new Set,type:"query",req:t,dirty:!1},s?s.push(a):(s=[a],(u=u||(Sn["idb://".concat(O,"/").concat(c)]={queries:{query:{},count:{}},objs:new Map,optimisticOps:[],unsignaledParts:{}})).queries.query[t.query.index.name||""]=s)),Hn(a,s,n,r),a.promise.then(function(e){return{result:Qn(e.result,t,null==u?void 0:u.optimisticOps,l,a,i)}})}})}})}};function Zn(e,r){return new Proxy(e,{get:function(e,t,n){return"db"===t?r:Reflect.get(e,t,n)}})}var er=(tr.prototype.version=function(t){if(isNaN(t)||t<.1)throw new Y.Type("Given version is not a positive number");if(t=Math.round(10*t)/10,this.idbdb||this._state.isBeingOpened)throw new Y.Schema("Cannot add version when database is open");this.verno=Math.max(this.verno,t);var e=this._versions,n=e.filter(function(e){return e._cfg.version===t})[0];return n||(n=new this.Version(t),e.push(n),e.sort(nn),n.stores({}),this._state.autoSchema=!1,n)},tr.prototype._whenReady=function(e){var n=this;return this.idbdb&&(this._state.openComplete||me.letThrough||this._vip)?e():new _e(function(e,t){if(n._state.openComplete)return t(new Y.DatabaseClosed(n._state.dbOpenError));if(!n._state.isBeingOpened){if(!n._state.autoOpen)return void t(new Y.DatabaseClosed);n.open().catch(G)}n._state.dbReadyPromise.then(e,t)}).then(e)},tr.prototype.use=function(e){var t=e.stack,n=e.create,r=e.level,i=e.name;i&&this.unuse({stack:t,name:i});e=this._middlewares[t]||(this._middlewares[t]=[]);return e.push({stack:t,create:n,level:null==r?10:r,name:i}),e.sort(function(e,t){return e.level-t.level}),this},tr.prototype.unuse=function(e){var t=e.stack,n=e.name,r=e.create;return t&&this._middlewares[t]&&(this._middlewares[t]=this._middlewares[t].filter(function(e){return r?e.create!==r:!!n&&e.name!==n})),this},tr.prototype.open=function(){var e=this;return $e(ve,function(){return Dn(e)})},tr.prototype._close=function(){var n=this._state,e=et.indexOf(this);if(0<=e&&et.splice(e,1),this.idbdb){try{this.idbdb.close()}catch(e){}this.idbdb=null}n.isBeingOpened||(n.dbReadyPromise=new _e(function(e){n.dbReadyResolve=e}),n.openCanceller=new _e(function(e,t){n.cancelOpen=t}))},tr.prototype.close=function(e){var t=(void 0===e?{disableAutoOpen:!0}:e).disableAutoOpen,e=this._state;t?(e.isBeingOpened&&e.cancelOpen(new Y.DatabaseClosed),this._close(),e.autoOpen=!1,e.dbOpenError=new Y.DatabaseClosed):(this._close(),e.autoOpen=this._options.autoOpen||e.isBeingOpened,e.openComplete=!1,e.dbOpenError=null)},tr.prototype.delete=function(n){var i=this;void 0===n&&(n={disableAutoOpen:!0});var o=0<arguments.length&&"object"!=typeof arguments[0],a=this._state;return new _e(function(r,t){function e(){i.close(n);var e=i._deps.indexedDB.deleteDatabase(i.name);e.onsuccess=qe(function(){var e,t,n;e=i._deps,t=i.name,n=e.indexedDB,e=e.IDBKeyRange,vn(n)||t===tt||yn(n,e).delete(t).catch(G),r()}),e.onerror=Bt(t),e.onblocked=i._fireOnBlocked}if(o)throw new Y.InvalidArgument("Invalid closeOptions argument to db.delete()");a.isBeingOpened?a.dbReadyPromise.then(e):e()})},tr.prototype.backendDB=function(){return this.idbdb},tr.prototype.isOpen=function(){return null!==this.idbdb},tr.prototype.hasBeenClosed=function(){var e=this._state.dbOpenError;return e&&"DatabaseClosed"===e.name},tr.prototype.hasFailed=function(){return null!==this._state.dbOpenError},tr.prototype.dynamicallyOpened=function(){return this._state.autoSchema},Object.defineProperty(tr.prototype,"tables",{get:function(){var t=this;return x(this._allTables).map(function(e){return t._allTables[e]})},enumerable:!1,configurable:!0}),tr.prototype.transaction=function(){var e=function(e,t,n){var r=arguments.length;if(r<2)throw new Y.InvalidArgument("Too few arguments");for(var i=new Array(r-1);--r;)i[r-1]=arguments[r];return n=i.pop(),[e,w(i),n]}.apply(this,arguments);return this._transaction.apply(this,e)},tr.prototype._transaction=function(e,t,n){var r=this,i=me.trans;i&&i.db===this&&-1===e.indexOf("!")||(i=null);var o,a,u=-1!==e.indexOf("?");e=e.replace("!","").replace("?","");try{if(a=t.map(function(e){e=e instanceof r.Table?e.name:e;if("string"!=typeof e)throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");return e}),"r"==e||e===nt)o=nt;else{if("rw"!=e&&e!=rt)throw new Y.InvalidArgument("Invalid transaction mode: "+e);o=rt}if(i){if(i.mode===nt&&o===rt){if(!u)throw new Y.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");i=null}i&&a.forEach(function(e){if(i&&-1===i.storeNames.indexOf(e)){if(!u)throw new Y.SubTransaction("Table "+e+" not included in parent transaction.");i=null}}),u&&i&&!i.active&&(i=null)}}catch(n){return i?i._promise(null,function(e,t){t(n)}):Xe(n)}var s=function i(o,a,u,s,c){return _e.resolve().then(function(){var e=me.transless||me,t=o._createTransaction(a,u,o._dbSchema,s);if(t.explicit=!0,e={trans:t,transless:e},s)t.idbtrans=s.idbtrans;else try{t.create(),t.idbtrans._explicit=!0,o._state.PR1398_maxLoop=3}catch(e){return e.name===z.InvalidState&&o.isOpen()&&0<--o._state.PR1398_maxLoop?(console.warn("Dexie: Need to reopen db"),o.close({disableAutoOpen:!1}),o.open().then(function(){return i(o,a,u,null,c)})):Xe(e)}var n,r=B(c);return r&&Le(),e=_e.follow(function(){var e;(n=c.call(t,t))&&(r?(e=Ue.bind(null,null),n.then(e,e)):"function"==typeof n.next&&"function"==typeof n.throw&&(n=In(n)))},e),(n&&"function"==typeof n.then?_e.resolve(n).then(function(e){return t.active?e:Xe(new Y.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"))}):e.then(function(){return n})).then(function(e){return s&&t._resolve(),t._completion.then(function(){return e})}).catch(function(e){return t._reject(e),Xe(e)})})}.bind(null,this,o,a,i,n);return i?i._promise(o,s,"lock"):me.trans?$e(me.transless,function(){return r._whenReady(s)}):this._whenReady(s)},tr.prototype.table=function(e){if(!m(this._allTables,e))throw new Y.InvalidTable("Table ".concat(e," does not exist"));return this._allTables[e]},tr);function tr(e,t){var o=this;this._middlewares={},this.verno=0;var n=tr.dependencies;this._options=t=_({addons:tr.addons,autoOpen:!0,indexedDB:n.indexedDB,IDBKeyRange:n.IDBKeyRange,cache:"cloned"},t),this._deps={indexedDB:t.indexedDB,IDBKeyRange:t.IDBKeyRange};n=t.addons;this._dbSchema={},this._versions=[],this._storeNames=[],this._allTables={},this.idbdb=null,this._novip=this;var a,r,u,i,s,c={dbOpenError:null,isBeingOpened:!1,onReadyBeingFired:null,openComplete:!1,dbReadyResolve:G,dbReadyPromise:null,cancelOpen:G,openCanceller:null,autoSchema:!0,PR1398_maxLoop:3,autoOpen:t.autoOpen};c.dbReadyPromise=new _e(function(e){c.dbReadyResolve=e}),c.openCanceller=new _e(function(e,t){c.cancelOpen=t}),this._state=c,this.name=e,this.on=dt(this,"populate","blocked","versionchange","close",{ready:[re,G]}),this.on.ready.subscribe=p(this.on.ready.subscribe,function(i){return function(n,r){tr.vip(function(){var t,e=o._state;e.openComplete?(e.dbOpenError||_e.resolve().then(n),r&&i(n)):e.onReadyBeingFired?(e.onReadyBeingFired.push(n),r&&i(n)):(i(n),t=o,r||i(function e(){t.on.ready.unsubscribe(n),t.on.ready.unsubscribe(e)}))})}}),this.Collection=(a=this,pt(Ot.prototype,function(e,t){this.db=a;var n=ot,r=null;if(t)try{n=t()}catch(e){r=e}var i=e._ctx,t=i.table,e=t.hook.reading.fire;this._ctx={table:t,index:i.index,isPrimKey:!i.index||t.schema.primKey.keyPath&&i.index===t.schema.primKey.name,range:n,keysOnly:!1,dir:"next",unique:"",algorithm:null,filter:null,replayFilter:null,justLimit:!0,isMatch:null,offset:0,limit:1/0,error:r,or:i.or,valueMapper:e!==X?e:null}})),this.Table=(r=this,pt(ft.prototype,function(e,t,n){this.db=r,this._tx=n,this.name=e,this.schema=t,this.hook=r._allTables[e]?r._allTables[e].hook:dt(null,{creating:[Z,G],reading:[H,X],updating:[te,G],deleting:[ee,G]})})),this.Transaction=(u=this,pt(Lt.prototype,function(e,t,n,r,i){var o=this;this.db=u,this.mode=e,this.storeNames=t,this.schema=n,this.chromeTransactionDurability=r,this.idbtrans=null,this.on=dt(this,"complete","error","abort"),this.parent=i||null,this.active=!0,this._reculock=0,this._blockedFuncs=[],this._resolve=null,this._reject=null,this._waitingFor=null,this._waitingQueue=null,this._spinCount=0,this._completion=new _e(function(e,t){o._resolve=e,o._reject=t}),this._completion.then(function(){o.active=!1,o.on.complete.fire()},function(e){var t=o.active;return o.active=!1,o.on.error.fire(e),o.parent?o.parent._reject(e):t&&o.idbtrans&&o.idbtrans.abort(),Xe(e)})})),this.Version=(i=this,pt(dn.prototype,function(e){this.db=i,this._cfg={version:e,storesSource:null,dbschema:{},tables:{},contentUpgrade:null}})),this.WhereClause=(s=this,pt(Dt.prototype,function(e,t,n){if(this.db=s,this._ctx={table:e,index:":id"===t?null:t,or:n},this._cmp=this._ascending=st,this._descending=function(e,t){return st(t,e)},this._max=function(e,t){return 0<st(e,t)?e:t},this._min=function(e,t){return st(e,t)<0?e:t},this._IDBKeyRange=s._deps.IDBKeyRange,!this._IDBKeyRange)throw new Y.MissingAPI})),this.on("versionchange",function(e){0<e.newVersion?console.warn("Another connection wants to upgrade database '".concat(o.name,"'. Closing db now to resume the upgrade.")):console.warn("Another connection wants to delete database '".concat(o.name,"'. Closing db now to resume the delete request.")),o.close({disableAutoOpen:!1})}),this.on("blocked",function(e){!e.newVersion||e.newVersion<e.oldVersion?console.warn("Dexie.delete('".concat(o.name,"') was blocked")):console.warn("Upgrade '".concat(o.name,"' blocked by other connection holding version ").concat(e.oldVersion/10))}),this._maxKey=Yt(t.IDBKeyRange),this._createTransaction=function(e,t,n,r){return new o.Transaction(e,t,n,o._options.chromeTransactionDurability,r)},this._fireOnBlocked=function(t){o.on("blocked").fire(t),et.filter(function(e){return e.name===o.name&&e!==o&&!e._state.vcFired}).map(function(e){return e.on("versionchange").fire(t)})},this.use(Un),this.use(Jn),this.use(Wn),this.use(Rn),this.use(Nn);var l=new Proxy(this,{get:function(e,t,n){if("_vip"===t)return!0;if("table"===t)return function(e){return Zn(o.table(e),l)};var r=Reflect.get(e,t,n);return r instanceof ft?Zn(r,l):"tables"===t?r.map(function(e){return Zn(e,l)}):"_createTransaction"===t?function(){return Zn(r.apply(this,arguments),l)}:r}});this.vip=l,n.forEach(function(e){return e(o)})}var nr,F="undefined"!=typeof Symbol&&"observable"in Symbol?Symbol.observable:"@@observable",rr=(ir.prototype.subscribe=function(e,t,n){return this._subscribe(e&&"function"!=typeof e?e:{next:e,error:t,complete:n})},ir.prototype[F]=function(){return this},ir);function ir(e){this._subscribe=e}try{nr={indexedDB:f.indexedDB||f.mozIndexedDB||f.webkitIndexedDB||f.msIndexedDB,IDBKeyRange:f.IDBKeyRange||f.webkitIDBKeyRange}}catch(e){nr={indexedDB:null,IDBKeyRange:null}}function or(h){var d,p=!1,e=new rr(function(r){var i=B(h);var o,a=!1,u={},s={},e={get closed(){return a},unsubscribe:function(){a||(a=!0,o&&o.abort(),c&&Nt.storagemutated.unsubscribe(f))}};r.start&&r.start(e);var c=!1,l=function(){return Ge(t)};var f=function(e){Kn(u,e),En(s,u)&&l()},t=function(){var t,n,e;!a&&nr.indexedDB&&(u={},t={},o&&o.abort(),o=new AbortController,e=function(e){var t=je();try{i&&Le();var n=Ne(h,e);return n=i?n.finally(Ue):n}finally{t&&Ae()}}(n={subscr:t,signal:o.signal,requery:l,querier:h,trans:null}),Promise.resolve(e).then(function(e){p=!0,d=e,a||n.signal.aborted||(u={},function(e){for(var t in e)if(m(e,t))return;return 1}(s=t)||c||(Nt(Ft,f),c=!0),Ge(function(){return!a&&r.next&&r.next(e)}))},function(e){p=!1,["DatabaseClosedError","AbortError"].includes(null==e?void 0:e.name)||a||Ge(function(){a||r.error&&r.error(e)})}))};return setTimeout(l,0),e});return e.hasValue=function(){return p},e.getValue=function(){return d},e}var ar=er;function ur(e){var t=cr;try{cr=!0,Nt.storagemutated.fire(e),Tn(e,!0)}finally{cr=t}}r(ar,_(_({},Q),{delete:function(e){return new ar(e,{addons:[]}).delete()},exists:function(e){return new ar(e,{addons:[]}).open().then(function(e){return e.close(),!0}).catch("NoSuchDatabaseError",function(){return!1})},getDatabaseNames:function(e){try{return t=ar.dependencies,n=t.indexedDB,t=t.IDBKeyRange,(vn(n)?Promise.resolve(n.databases()).then(function(e){return e.map(function(e){return e.name}).filter(function(e){return e!==tt})}):yn(n,t).toCollection().primaryKeys()).then(e)}catch(e){return Xe(new Y.MissingAPI)}// removed by dead control flow
{ var t, n; }},defineClass:function(){return function(e){a(this,e)}},ignoreTransaction:function(e){return me.trans?$e(me.transless,e):e()},vip:mn,async:function(t){return function(){try{var e=In(t.apply(this,arguments));return e&&"function"==typeof e.then?e:_e.resolve(e)}catch(e){return Xe(e)}}},spawn:function(e,t,n){try{var r=In(e.apply(n,t||[]));return r&&"function"==typeof r.then?r:_e.resolve(r)}catch(e){return Xe(e)}},currentTransaction:{get:function(){return me.trans||null}},waitFor:function(e,t){t=_e.resolve("function"==typeof e?ar.ignoreTransaction(e):e).timeout(t||6e4);return me.trans?me.trans.waitFor(t):t},Promise:_e,debug:{get:function(){return ie},set:function(e){oe(e)}},derive:o,extend:a,props:r,override:p,Events:dt,on:Nt,liveQuery:or,extendObservabilitySet:Kn,getByKeyPath:O,setByKeyPath:P,delByKeyPath:function(t,e){"string"==typeof e?P(t,e,void 0):"length"in e&&[].map.call(e,function(e){P(t,e,void 0)})},shallowClone:g,deepClone:S,getObjectDiff:Fn,cmp:st,asap:v,minKey:-1/0,addons:[],connections:et,errnames:z,dependencies:nr,cache:Sn,semVer:"4.0.11",version:"4.0.11".split(".").map(function(e){return parseInt(e)}).reduce(function(e,t,n){return e+t/Math.pow(10,2*n)})})),ar.maxKey=Yt(ar.dependencies.IDBKeyRange),"undefined"!=typeof dispatchEvent&&"undefined"!=typeof addEventListener&&(Nt(Ft,function(e){cr||(e=new CustomEvent(Mt,{detail:e}),cr=!0,dispatchEvent(e),cr=!1)}),addEventListener(Mt,function(e){e=e.detail;cr||ur(e)}));var sr,cr=!1,lr=function(){};return"undefined"!=typeof BroadcastChannel&&((lr=function(){(sr=new BroadcastChannel(Mt)).onmessage=function(e){return e.data&&ur(e.data)}})(),"function"==typeof sr.unref&&sr.unref(),Nt(Ft,function(e){cr||sr.postMessage(e)})),"undefined"!=typeof addEventListener&&(addEventListener("pagehide",function(e){if(!er.disableBfCache&&e.persisted){ie&&console.debug("Dexie: handling persisted pagehide"),null!=sr&&sr.close();for(var t=0,n=et;t<n.length;t++)n[t].close({disableAutoOpen:!1})}}),addEventListener("pageshow",function(e){!er.disableBfCache&&e.persisted&&(ie&&console.debug("Dexie: handling persisted pageshow"),lr(),ur({all:new gn(-1/0,[[]])}))})),_e.rejectionMapper=function(e,t){return!e||e instanceof N||e instanceof TypeError||e instanceof SyntaxError||!e.name||!$[e.name]?e:(t=new $[e.name](t||e.message,e),"stack"in e&&l(t,"stack",{get:function(){return this.inner.stack}}),t)},oe(ie),_(er,Object.freeze({__proto__:null,Dexie:er,liveQuery:or,Entity:ut,cmp:st,PropModification:xt,replacePrefix:function(e,t){return new xt({replacePrefix:[e,t]})},add:function(e){return new xt({add:e})},remove:function(e){return new xt({remove:e})},default:er,RangeSet:gn,mergeRanges:_n,rangesOverlap:xn}),{default:er}),er});
//# sourceMappingURL=dexie.min.js.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";

// EXTERNAL MODULE: ./src/db/index.ts + 3 modules
var db = __webpack_require__(709);
// EXTERNAL MODULE: ./src/config/limits.ts
var limits = __webpack_require__(286);
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
            originalQuery: query,
            sortBy: query.sortBy || 'relevance',
            sortOrder: query.sortOrder || 'desc',
            limit: query.limit || limits/* Limits */.xu.defaultSearchLimit,
            offset: query.offset || 0
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
            .replace(/[^\w\s#@]/g, ' ') // FIXED: Keep hashtags and mentions like database
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
            limit: query.limit || limits/* Limits */.xu.defaultSearchLimit
        };
        return btoa(JSON.stringify(normalized)).replace(/[+/=]/g, '');
    }
}

;// ./src/db/query-builder.ts
/**
 * XSaved Extension v2 - Native Dexie Query Builder
 * Uses proper Dexie native methods for optimal performance
 *
 * Based on Dexie.js API Reference: https://dexie.org/docs/API-Reference
 */

/**
 * Native Dexie Query Builder
 * Uses proper Dexie methods: .where(), .filter(), .and(), .or()
 */
class NativeDexieQueryBuilder {
    constructor(table) {
        this.query = null;
        this.queryOptions = {};
        this.table = table;
    }
    /**
     * Text search using multi-entry textTokens index
     * Uses Dexie's native .where().anyOfIgnoreCase()
     */
    text(searchText) {
        if (!searchText?.trim())
            return this;
        const tokens = this.tokenizeText(searchText);
        if (tokens.length === 0)
            return this;
        // Native Dexie: Use multi-entry index
        if (this.query) {
            this.query = this.query.and(bookmark => tokens.some(token => bookmark.textTokens?.includes(token)));
        }
        else {
            this.query = this.table.where('textTokens').anyOfIgnoreCase(tokens);
        }
        return this;
    }
    /**
     * Author filter using native Dexie .equalsIgnoreCase()
     */
    author(authorName) {
        if (!authorName?.trim())
            return this;
        if (this.query) {
            this.query = this.query.and(bookmark => bookmark.author.toLowerCase() === authorName.toLowerCase());
        }
        else {
            this.query = this.table.where('author').equalsIgnoreCase(authorName);
        }
        return this;
    }
    /**
     * Combined text and author search using native Dexie capabilities
     * Searches through both tweet text content AND author name
     * Uses both textTokens (for performance) and full text field (for comprehensive matching)
     */
    searchTextAndAuthor(searchTerm) {
        if (!searchTerm?.trim())
            return this;
        const tokens = this.tokenizeText(searchTerm);
        const searchTermLower = searchTerm.toLowerCase();
        if (this.query) {
            // Collection: Use .and() with enhanced combined filter
            this.query = this.query.and(bookmark => {
                // Check if search term matches text content OR author
                const authorMatch = bookmark.author.toLowerCase().includes(searchTermLower);
                // Enhanced text matching: try both textTokens and full text field
                let textMatch = false;
                // >>IMPORTANT: This is disabled because it's not working as expected
                // >>IMPORTANT: WE CHECKED AND IT LOOKS LIKE LOOKING DIRECTLY TO TEXT WORKS JUST FINE. SO EXT TOKEN MATCHING IS NOT NEEDED RIGHT NOW.
                // It's causing the query to return no results
                // if (bookmark.textTokens?.length > 0) {
                //   // Fast path: check textTokens for exact matches
                //   textMatch = tokens.some(token => bookmark.textTokens?.includes(token));
                // }
                if (!textMatch && bookmark.text) {
                    // Fallback: check full text field for substring matches
                    textMatch = bookmark.text.toLowerCase().includes(searchTermLower);
                }
                return textMatch || authorMatch;
            });
        }
        else {
            // Table: Use .filter() for enhanced combined search
            this.query = this.table.filter(bookmark => {
                // Check if search term matches text content OR author
                const authorMatch = bookmark.author.toLowerCase().includes(searchTermLower);
                // Enhanced text matching: try both textTokens and full text field
                let textMatch = false;
                if (bookmark.textTokens?.length > 0) {
                    // Fast path: check textTokens for exact matches
                    textMatch = tokens.some(token => bookmark.textTokens?.includes(token));
                }
                if (!textMatch && bookmark.text) {
                    // Fallback: check full text field for substring matches
                    textMatch = bookmark.text.toLowerCase().includes(searchTermLower);
                }
                return textMatch || authorMatch;
            });
        }
        return this;
    }
    /**
     * Tags filter using native Dexie .anyOf()
     */
    tags(tagList) {
        if (!tagList || tagList.length === 0)
            return this;
        if (this.query) {
            this.query = this.query.and(bookmark => tagList.some(tag => bookmark.tags?.includes(tag)));
        }
        else {
            this.query = this.table.where('tags').anyOf(tagList);
        }
        return this;
    }
    /**
     * Date range using native Dexie .between()
     */
    dateRange(start, end) {
        if (!start || !end)
            return this;
        if (this.query) {
            this.query = this.query.and(bookmark => {
                const date = new Date(bookmark.bookmarked_at);
                return date >= new Date(start) && date <= new Date(end);
            });
        }
        else {
            this.query = this.table.where('bookmarked_at').between(start, end, true, true);
        }
        return this;
    }
    /**
     * Media presence filter using native Dexie .filter()
     */
    hasMedia(hasMedia) {
        if (this.query) {
            this.query = this.query.and(bookmark => hasMedia ?
                (bookmark.media_urls && bookmark.media_urls.length > 0) :
                (!bookmark.media_urls || bookmark.media_urls.length === 0));
        }
        else {
            this.query = this.table.filter(bookmark => hasMedia ?
                (bookmark.media_urls && bookmark.media_urls.length > 0) :
                (!bookmark.media_urls || bookmark.media_urls.length === 0));
        }
        return this;
    }
    /**
     * Exclude tags using native Dexie .filter()
     */
    excludeTags(excludeList) {
        if (!excludeList || excludeList.length === 0)
            return this;
        if (this.query) {
            this.query = this.query.and(bookmark => !excludeList.some(excludeTag => bookmark.tags?.includes(excludeTag)));
        }
        else {
            this.query = this.table.filter(bookmark => !excludeList.some(excludeTag => bookmark.tags?.includes(excludeTag)));
        }
        return this;
    }
    /**
     * Set query options
     */
    setOptions(opts) {
        this.queryOptions = { ...this.queryOptions, ...opts };
        return this;
    }
    /**
     * Set limit using native Dexie .limit()
     */
    limit(count) {
        this.queryOptions.limit = count;
        return this;
    }
    /**
     * Set offset using native Dexie .offset()
     */
    offset(count) {
        this.queryOptions.offset = count;
        return this;
    }
    /**
     * Set sorting using native Dexie .orderBy() and .reverse()
     */
    sortBy(field, order = 'desc') {
        this.queryOptions.sortBy = field;
        this.queryOptions.sortOrder = order;
        return this;
    }
    /**
     * Execute the query using native Dexie methods
     */
    async execute() {
        try {
            let query = this.query || this.table;
            // Apply sorting using native Dexie methods
            if (this.queryOptions.sortBy) {
                if (this.query) {
                    console.log('🐈 SORTING~SORTING~SORTING for Collection');
                    // For Collections: reverse() BEFORE sortBy() as per Dexie docs
                    // sortBy() returns a Promise, so we need to handle it differently
                    if (this.queryOptions.sortOrder === 'desc') {
                        query = query.reverse();
                    }
                    // sortBy() returns Promise<BookmarkEntity[]>, not a Collection
                    const results = await query.sortBy(this.queryOptions.sortBy);
                    return this.applyPagination(results);
                }
                else {
                    console.log('🐕 ORDER~ORDER~ORDER for Table');
                    // For Tables: orderBy() then reverse() after
                    query = query.orderBy(this.queryOptions.sortBy);
                    if (this.queryOptions.sortOrder === 'desc') {
                        query = query.reverse();
                    }
                }
            }
            else {
                // Default: newest first
                if (this.query) {
                    // Collection - reverse() BEFORE sortBy()
                    // sortBy() returns Promise<BookmarkEntity[]>, not a Collection
                    const results = await query.reverse().sortBy('created_at');
                    return this.applyPagination(results);
                }
                else {
                    // Table - orderBy() then reverse()
                    query = query.orderBy('created_at').reverse();
                }
            }
            // Apply pagination using native Dexie .offset() and .limit() (for Tables only)
            if (this.queryOptions.offset) {
                query = query.offset(this.queryOptions.offset);
            }
            if (this.queryOptions.limit) {
                query = query.limit(this.queryOptions.limit);
            }
            // Execute using native Dexie .toArray()
            const results = await query.toArray();
            console.log(`🔍 Native Dexie query executed: ${results.length} results`);
            return results;
        }
        catch (error) {
            console.error('❌ Native Dexie query failed:', error);
            return [];
        }
    }
    /**
     * Apply pagination to results (for Collections that use sortBy)
     */
    applyPagination(results) {
        let paginatedResults = results;
        // Apply offset
        if (this.queryOptions.offset) {
            paginatedResults = paginatedResults.slice(this.queryOptions.offset);
        }
        // Apply limit
        if (this.queryOptions.limit) {
            paginatedResults = paginatedResults.slice(0, this.queryOptions.limit);
        }
        return paginatedResults;
    }
    /**
     * Enhanced tokenize text for search
     * More inclusive tokenization to capture more matches
     */
    tokenizeText(text) {
        if (!text)
            return [];
        const tokens = text
            .toLowerCase()
            .replace(/[^\w\s#@-]/g, ' ') // Keep hyphens and @ symbols
            .split(/\s+/)
            .filter(token => token.length > 1) // Reduced from 2 to 1 for more matches
            .slice(0, 20); // Increased from 10 to 20 tokens
        // Add partial matches for longer terms (e.g., "javascript" -> "java", "script")
        const partialTokens = new Set();
        tokens.forEach(token => {
            if (token.length > 4) {
                // Add 3+ character prefixes
                for (let i = 3; i < token.length; i++) {
                    partialTokens.add(token.substring(0, i));
                }
            }
        });
        // Combine original tokens with partial matches
        return [...new Set([...tokens, ...Array.from(partialTokens)])].slice(0, 30);
    }
}
// ========================
// CONVENIENCE FACTORY
// ========================
/**
 * Create a native Dexie query builder
 */
function createBookmarkQuery(table) {
    return new NativeDexieQueryBuilder(table);
}
// ========================
// COMMON QUERY PATTERNS
// ========================
/**
 * Recent bookmarks using native Dexie
 */
async function getRecentBookmarks(table, limit = Limits.defaultQueryLimit, offset = 0) {
    return createBookmarkQuery(table)
        .sortBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();
}
/**
 * Search by text and tags using native Dexie
 */
async function searchBookmarksByTextAndTags(table, searchText, tags, options = {}) {
    return createBookmarkQuery(table)
        .text(searchText)
        .tags(tags)
        .setOptions(options)
        .execute();
}
/**
 * Author's bookmarks with date range using native Dexie
 */
async function getAuthorBookmarksInDateRange(table, author, startDate, endDate, options = {}) {
    return createBookmarkQuery(table)
        .author(author)
        .dateRange(startDate, endDate)
        .setOptions(options)
        .execute();
}

;// ./src/search/search-executor.ts
/**
 * XSaved Extension v2 - Search Executor
 * Executes optimized queries using pure Dexie API
 * OPTIMIZED: Removed raw IndexedDB transactions, now uses native Dexie queries
 */



class SearchExecutor {
    constructor(config) {
        this.config = config;
        this.db = db.db; // Initialize with default, can be replaced with user-specific DB
    }
    /**
     *
     * OLD: Multi-criteria search method (legacy)
     * NOTE: This was our original search pipeline, but it was complex and relied on multi-stage filter intersections.
     * We've since replaced it with a native Dexie composable query builder, which is much simpler and more efficient.
     * Keeping this for reference and fallback, but prefer executeSearchNativeDexie().
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
            // This method required running a primary filter, then intersecting with secondary filters,
            // then doing text search and exclusions in-memory. It was hard to maintain and not optimal for performance.
            // See executeSearchNativeDexie for the new approach.
            await this.db.initialize();
            let candidateBookmarks = [];
            if (parsedQuery.queryPlan.primaryFilter) {
                candidateBookmarks = await this.executeSingleFilter(parsedQuery.queryPlan.primaryFilter, analytics);
            }
            else {
                const sortBy = 'created_at';
                const recentResult = await this.db.getRecentBookmarks({
                    limit: parsedQuery.limit || limits/* Limits */.xu.defaultSearchLimit,
                    sortBy: sortBy,
                    offset: parsedQuery.offset
                });
                candidateBookmarks = recentResult.data || [];
                analytics.indexesUsed.push(sortBy);
            }
            for (const filter of parsedQuery.queryPlan.secondaryFilters) {
                candidateBookmarks = await this.applyFilter(candidateBookmarks, filter, analytics);
                if (candidateBookmarks.length === 0)
                    break;
            }
            if (parsedQuery.textTokens.length > 0) {
                if (candidateBookmarks.length === 0) {
                    candidateBookmarks = await this.searchBySubstring(parsedQuery.textTokens, analytics);
                }
                else {
                    candidateBookmarks = await this.applySubstringFilter(candidateBookmarks, parsedQuery.textTokens, analytics);
                }
            }
            if (parsedQuery.excludedTags.length > 0) {
                candidateBookmarks = candidateBookmarks.filter(bookmark => !parsedQuery.excludedTags.some(excludedTag => bookmark.tags.includes(excludedTag)));
            }
            const queryTime = performance.now() - startTime;
            analytics.queryTime = queryTime;
            analytics.resultsReturned = candidateBookmarks.length;
            if (parsedQuery.sortBy && parsedQuery.sortBy !== 'relevance') {
                candidateBookmarks = this.applySorting(candidateBookmarks, parsedQuery.sortBy, parsedQuery.sortOrder);
            }
            if (parsedQuery.limit && candidateBookmarks.length > parsedQuery.limit) {
                candidateBookmarks = candidateBookmarks.slice(0, parsedQuery.limit);
            }
            if (queryTime > this.config.performanceTargets.combinedSearch) {
                analytics.slowOperations.push(`Total query: ${queryTime.toFixed(2)}ms`);
                console.warn(`⚠️ Slow search query: ${queryTime.toFixed(2)}ms`, parsedQuery);
            }
            return {
                bookmarks: candidateBookmarks.map(bookmark => ({
                    bookmark,
                    score: 1,
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
     * NEW: Execute search using native Dexie composable query system
     * This replaces the complex primary/secondary filter pipeline with clean composition
     *
     * HOW IT WORKS:
     * 1. Convert ParsedQuery to native Dexie query criteria
     * 2. Use createBookmarkQuery() to build a single optimized Dexie query
     * 3. Apply all filters using native Dexie methods (.where(), .and(), .filter())
     * 4. Execute single query instead of multiple filter intersections
     * 5. Return results in same format as original method
     */
    async executeSearchNativeDexie(parsedQuery) {
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
            console.log('🚀 Starting native Dexie composable search...');
            console.log('📋 Parsed query:', {
                textTokens: parsedQuery.textTokens,
                requiredTags: parsedQuery.requiredTags,
                excludedTags: parsedQuery.excludedTags,
                filters: parsedQuery.filters?.map(f => ({ type: f.type, value: f.value })),
                limit: parsedQuery.limit,
                offset: parsedQuery.offset,
                sortBy: parsedQuery.sortBy
            });
            // Ensure database is ready
            await this.db.initialize();
            // STEP 1: Convert ParsedQuery to native Dexie query criteria
            const searchCriteria = this.convertParsedQueryToNativeDexie(parsedQuery);
            console.log('🔄 Converted to native Dexie criteria:', searchCriteria);
            // STEP 2: Build single native Dexie query using composable builder
            const queryBuilder = createBookmarkQuery(this.db.bookmarks);
            // STEP 3: Apply filters conditionally using native Dexie methods
            if (searchCriteria.text) {
                // ALWAYS search both text content AND author for any text search
                console.log('🔍 Adding combined text+author search:', searchCriteria.text);
                queryBuilder.searchTextAndAuthor(searchCriteria.text);
                analytics.indexesUsed.push('textTokens', 'author');
            }
            if (searchCriteria.author && !searchCriteria.text) {
                // Author-only filter (when no text search)
                console.log('👤 Adding author filter:', searchCriteria.author);
                queryBuilder.author(searchCriteria.author);
                analytics.indexesUsed.push('author');
            }
            if (searchCriteria.tags && searchCriteria.tags.length > 0) {
                console.log('🏷️ Adding tags filter:', searchCriteria.tags);
                queryBuilder.tags(searchCriteria.tags);
                analytics.indexesUsed.push('tags');
            }
            if (searchCriteria.excludeTags && searchCriteria.excludeTags.length > 0) {
                console.log('🚫 Adding exclude tags filter:', searchCriteria.excludeTags);
                queryBuilder.excludeTags(searchCriteria.excludeTags);
            }
            if (searchCriteria.dateRange) {
                console.log('📅 Adding date range filter:', searchCriteria.dateRange);
                queryBuilder.dateRange(searchCriteria.dateRange.start, searchCriteria.dateRange.end);
                analytics.indexesUsed.push('bookmarked_at');
            }
            if (searchCriteria.hasMedia !== undefined) {
                console.log('📷 Adding media filter:', searchCriteria.hasMedia);
                queryBuilder.hasMedia(searchCriteria.hasMedia);
            }
            // STEP 4: Apply sorting and pagination options
            const sortBy = parsedQuery.sortBy === 'relevance' ? 'created_at' : parsedQuery.sortBy;
            queryBuilder
                .sortBy(sortBy || 'created_at', parsedQuery.sortOrder || 'desc')
                .limit(parsedQuery.limit || limits/* Limits */.xu.defaultSearchLimit);
            if (parsedQuery.offset) {
                queryBuilder.offset(parsedQuery.offset);
            }
            console.log('⚡ Executing native Dexie query...');
            // STEP 5: Execute single optimized native Dexie query
            const results = await queryBuilder.execute();
            const queryTime = performance.now() - startTime;
            analytics.queryTime = queryTime;
            analytics.resultsReturned = results.length;
            analytics.indexHits = analytics.indexesUsed.length;
            console.log(`✅ Native Dexie search completed in ${queryTime.toFixed(2)}ms:`);
            console.log(`   📊 Results: ${results.length}`);
            console.log(`   🔍 Indexes used: ${analytics.indexesUsed.join(', ')}`);
            console.log(`   ⏱️ Query time: ${queryTime.toFixed(2)}ms`);
            // Log slow operations
            if (queryTime > this.config.performanceTargets.combinedSearch) {
                analytics.slowOperations.push(`Native Dexie query: ${queryTime.toFixed(2)}ms`);
                console.warn(`⚠️ Slow native Dexie query: ${queryTime.toFixed(2)}ms`);
            }
            // STEP 6: Convert to SearchResult format (same as original method)
            const bookmarks = results.map(bookmark => ({
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
            }));
            return {
                bookmarks,
                totalCount: bookmarks.length,
                queryTime,
                pagination: {
                    hasMore: false, // TODO: Implement proper pagination detection
                    totalPages: 1
                }
            };
        }
        catch (error) {
            const queryTime = performance.now() - startTime;
            console.error('❌ Native Dexie search execution error:', error);
            return {
                bookmarks: [],
                totalCount: 0,
                queryTime,
                pagination: {
                    hasMore: false,
                    totalPages: 0
                }
            };
        }
    }
    /**
     * Convert ParsedQuery to native Dexie search criteria
     * This bridges the gap between your existing query parser and native Dexie
     */
    convertParsedQueryToNativeDexie(parsedQuery) {
        const criteria = {};
        // Text search: Convert tokens back to search text
        if (parsedQuery.textTokens.length > 0) {
            criteria.text = parsedQuery.textTokens.join(' ');
        }
        // Author filter: Extract from filters
        const authorFilter = parsedQuery.filters?.find(f => f.type === 'author');
        if (authorFilter) {
            criteria.author = authorFilter.value;
        }
        // Tags: Use required tags
        if (parsedQuery.requiredTags.length > 0) {
            criteria.tags = parsedQuery.requiredTags;
        }
        // Exclude tags
        if (parsedQuery.excludedTags.length > 0) {
            criteria.excludeTags = parsedQuery.excludedTags;
        }
        // Date range filter
        const dateFilter = parsedQuery.filters?.find(f => f.type === 'dateRange');
        if (dateFilter) {
            criteria.dateRange = dateFilter.value;
        }
        // Media filter
        const mediaFilter = parsedQuery.filters?.find(f => f.type === 'hasMedia');
        if (mediaFilter) {
            criteria.hasMedia = mediaFilter.value;
        }
        return criteria;
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
                    analytics.indexesUsed.push('bookmarked_at');
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
                    const bookmarkDate = new Date(bookmark.created_at);
                    return bookmarkDate >= new Date(start) && bookmarkDate <= new Date(end);
                });
                break;
            case 'textToken':
                filtered = bookmarks.filter(bookmark => bookmark.textTokens.includes(filter.value) ||
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
        const result = await this.db.getBookmarksByTag(tag);
        return result.success ? result.data || [] : [];
    }
    /**
     * Search by author using Dexie query (OPTIMIZED)
     */
    async searchByAuthor(author) {
        try {
            // Use native Dexie query - much cleaner!
            const results = await this.db.bookmarks
                .where('author')
                .equalsIgnoreCase(author)
                .reverse()
                .limit(limits/* Limits */.xu.indexSearchLimit)
                .toArray();
            console.log(`👤 Found ${results.length} bookmarks by @${author}`);
            return results;
        }
        catch (error) {
            console.error(`❌ Author search failed for @${author}:`, error);
            return [];
        }
    }
    /**
     * Search by date range using Dexie query (OPTIMIZED)
     */
    async searchByDateRange(dateRange) {
        try {
            // Use native Dexie range query - cleaner and more optimized!
            const results = await this.db.bookmarks
                .where('bookmarked_at')
                .between(dateRange.start, dateRange.end)
                .reverse()
                .limit(limits/* Limits */.xu.substringSearchLimit)
                .toArray();
            console.log(`📅 Found ${results.length} bookmarks in date range ${dateRange.start} to ${dateRange.end}`);
            return results;
        }
        catch (error) {
            console.error('❌ Date range search failed:', error);
            return [];
        }
    }
    /**
     * Search by text token using Dexie multi-entry index (OPTIMIZED)
     */
    async searchByTextToken(token) {
        try {
            // FIXED: Use proper multi-entry index query for fast exact token matching
            const results = await this.db.bookmarks
                .where('textTokens')
                .anyOfIgnoreCase([token])
                .reverse()
                .limit(limits/* Limits */.xu.indexSearchLimit)
                .toArray();
            console.log(`🔍 Found ${results.length} bookmarks with exact token "${token}"`);
            return results;
        }
        catch (error) {
            console.error(`❌ Text token search failed for "${token}":`, error);
            return [];
        }
    }
    /**
     * Search by substring matching (replicates client-side filter logic)
     */
    async searchBySubstring(tokens, analytics) {
        try {
            // Get all bookmarks for substring search
            const allBookmarks = await this.db.bookmarks
                .orderBy('created_at')
                .reverse()
                .limit(limits/* Limits */.xu.substringSearchLimit) // Reasonable limit for substring search
                .toArray();
            console.log(`🔍 Searching ${allBookmarks.length} bookmarks with substring logic`);
            // Apply substring filtering with AND logic for multiple tokens
            const results = allBookmarks.filter(bookmark => {
                const text = bookmark?.text || '';
                const author = bookmark?.author || '';
                const tags = bookmark?.tags || [];
                // For multiple tokens, ALL tokens must match (AND logic)
                return tokens.every(token => {
                    const lowerToken = token.toLowerCase();
                    return text.toLowerCase().includes(lowerToken) ||
                        author.toLowerCase().includes(lowerToken) ||
                        tags.some(tag => tag.toLowerCase().includes(lowerToken));
                });
            });
            console.log(`🔍 Substring search found ${results.length} matches`);
            return results;
        }
        catch (error) {
            console.error(`❌ Substring search failed:`, error);
            return [];
        }
    }
    /**
     * Apply substring filtering to existing candidate bookmarks
     */
    async applySubstringFilter(bookmarks, tokens, analytics) {
        if (tokens.length === 0)
            return bookmarks;
        const startTime = performance.now();
        const filtered = bookmarks.filter(bookmark => {
            const text = bookmark?.text || '';
            const author = bookmark?.author || '';
            const tags = bookmark?.tags || [];
            // For multiple tokens, ALL tokens must match (AND logic)
            return tokens.every(token => {
                const lowerToken = token.toLowerCase();
                return text.toLowerCase().includes(lowerToken) ||
                    author.toLowerCase().includes(lowerToken) ||
                    tags.some(tag => tag.toLowerCase().includes(lowerToken));
            });
        });
        const duration = performance.now() - startTime;
        if (duration > this.config.performanceTargets.textSearch) {
            analytics.slowOperations.push(`Substring filter: ${duration.toFixed(2)}ms`);
        }
        console.log(`🔍 Substring filter: ${tokens.length} tokens, ${filtered.length} results from ${bookmarks.length} bookmarks`);
        return filtered;
    }
    /**
     * Search using Dexie's multi-column filtering (like SQL WHERE with OR conditions)
     * ALTERNATIVE APPROACH: Uses Dexie's native filtering instead of substring search
     */
    async searchByMultiColumn(tokens, analytics) {
        try {
            console.log(`🔍 Dexie multi-column search with tokens:`, tokens);
            // Use Dexie's filter method to search across multiple columns
            // This is similar to SQL: WHERE text LIKE '%token%' OR author LIKE '%token%' OR tags CONTAINS 'token'
            const results = await this.db.bookmarks
                .orderBy('created_at')
                .reverse()
                .filter(bookmark => {
                // For multiple tokens, ALL tokens must match somewhere (AND logic across tokens)
                return tokens.every(token => {
                    const lowerToken = token.toLowerCase();
                    // Check text field
                    if (bookmark.text && bookmark.text.toLowerCase().includes(lowerToken)) {
                        return true;
                    }
                    // Check author field
                    if (bookmark.author && bookmark.author.toLowerCase().includes(lowerToken)) {
                        return true;
                    }
                    // Check tags array
                    if (bookmark.tags && Array.isArray(bookmark.tags)) {
                        if (bookmark.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(lowerToken))) {
                            return true;
                        }
                    }
                    return false;
                });
            })
                .limit(limits/* Limits */.xu.substringSearchLimit) // Reasonable limit
                .toArray();
            console.log(`🔍 Dexie multi-column search found ${results.length} matches`);
            return results;
        }
        catch (error) {
            console.error(`❌ Dexie multi-column search failed:`, error);
            return [];
        }
    }
    /**
     * Filter by media presence using optimized Dexie query (OPTIMIZED)
     */
    async searchByMediaPresence(hasMedia) {
        try {
            // Use Dexie's collection filtering - more efficient than manual scanning
            const results = await this.db.bookmarks
                .filter(bookmark => hasMedia ?
                (bookmark.media_urls && bookmark.media_urls.length > 0) :
                (!bookmark.media_urls || bookmark.media_urls.length === 0))
                .reverse()
                .limit(limits/* Limits */.xu.substringSearchLimit)
                .toArray();
            console.log(`📷 Found ${results.length} bookmarks ${hasMedia ? 'with' : 'without'} media`);
            return results;
        }
        catch (error) {
            console.error('❌ Media presence search failed:', error);
            return [];
        }
    }
    /**
     * Apply text search with token matching
     */
    async applyTextSearch(bookmarks, tokens, analytics) {
        if (tokens.length === 0)
            return bookmarks;
        const startTime = performance.now();
        const filtered = bookmarks.filter(bookmark => {
            const bookmarkTokens = bookmark.textTokens || [];
            const bookmarkText = bookmark.text.toLowerCase();
            // IMPROVED: Check if ALL tokens are present (AND logic for better precision)
            // For single token searches, use exact matching
            if (tokens.length === 1) {
                const token = tokens[0];
                return bookmarkTokens.includes(token) || bookmarkText.includes(token);
            }
            // For multiple tokens, require ALL tokens to be present (AND logic)
            return tokens.every(token => bookmarkTokens.includes(token) || bookmarkText.includes(token));
        });
        const duration = performance.now() - startTime;
        if (duration > this.config.performanceTargets.textSearch) {
            analytics.slowOperations.push(`Text search: ${duration.toFixed(2)}ms`);
        }
        console.log(`🔍 Text search: ${tokens.length} tokens, ${filtered.length} results from ${bookmarks.length} bookmarks`);
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
     * Apply sorting to bookmarks
     */
    applySorting(bookmarks, sortBy, sortOrder) {
        const isAscending = sortOrder === 'asc';
        return bookmarks.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'created_at':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'bookmarked_at':
                    comparison = new Date(a.bookmarked_at).getTime() - new Date(b.bookmarked_at).getTime();
                    break;
                case 'author':
                    comparison = a.author.localeCompare(b.author);
                    break;
                default:
                    return 0; // No sorting
            }
            return isAscending ? comparison : -comparison;
        });
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
    /**
     * TEST METHOD: Compare old vs new search approaches
     * This demonstrates the difference between the complex pipeline and native Dexie
     */
    async testSearchComparison(testQuery) {
        console.log('🧪 Testing search comparison with query:', testQuery);
        // Create a mock ParsedQuery for testing
        const mockParsedQuery = {
            textTokens: testQuery.text ? testQuery.text.split(' ') : [],
            exactPhrases: [],
            requiredTags: testQuery.tags || [],
            optionalTags: [],
            excludedTags: [],
            filters: testQuery.author ? [{
                    type: 'author',
                    value: testQuery.author,
                    selectivity: 0.6,
                    estimatedCost: 5
                }] : [],
            queryPlan: {
                primaryFilter: testQuery.author ? {
                    type: 'author',
                    value: testQuery.author,
                    selectivity: 0.6,
                    estimatedCost: 5
                } : undefined,
                secondaryFilters: [],
                intersectionStrategy: 'all',
                estimatedResultCount: 0,
                estimatedExecutionTime: 0
            },
            originalQuery: testQuery,
            limit: testQuery.limit || 20,
            offset: 0,
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        // Test OLD method (complex pipeline)
        console.log('🔄 Testing OLD search method (complex pipeline)...');
        const oldStart = performance.now();
        const oldResult = await this.executeSearch(mockParsedQuery);
        const oldTime = performance.now() - oldStart;
        // Test NEW method (native Dexie composable)
        console.log('🔄 Testing NEW search method (native Dexie composable)...');
        const newStart = performance.now();
        const newResult = await this.executeSearchNativeDexie(mockParsedQuery);
        const newTime = performance.now() - newStart;
        const improvement = ((oldTime - newTime) / oldTime) * 100;
        console.log('📊 Search comparison results:');
        console.log(`   🔴 OLD method: ${oldTime.toFixed(2)}ms (${oldResult.bookmarks.length} results)`);
        console.log(`   🟢 NEW method: ${newTime.toFixed(2)}ms (${newResult.bookmarks.length} results)`);
        console.log(`   ⚡ Performance improvement: ${improvement.toFixed(1)}%`);
        return {
            oldMethod: oldResult,
            newMethod: newResult,
            performance: {
                oldTime,
                newTime,
                improvement
            }
        };
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
            // Check cache first (but skip for pagination to avoid stale results)
            if (this.config.caching.enabled && query.offset === 0) {
                const cached = this.getCachedResult(cacheKey);
                if (cached) {
                    console.log('🎯 Cache hit for query:', query);
                    return cached;
                }
            }
            // Parse query into optimized execution plan
            const parsedQuery = this.queryParser.parseQuery(query);
            // Execute search using NEW native Dexie composable method
            // OLD: const result = await this.searchExecutor.executeSearch(parsedQuery);
            const result = await this.searchExecutor.executeSearchNativeDexie(parsedQuery);
            // Add suggested queries
            result.suggestedQueries = this.queryParser.extractSuggestions(query);
            // Cache result if enabled (skip for pagination)
            if (this.config.caching.enabled && query.offset === 0) {
                this.cacheResult(cacheKey, result);
            }
            // Log performance
            const totalTime = performance.now() - startTime;
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
        return this.search({ tags: [tag], limit: limits/* Limits */.xu.quickSearchLimit });
    }
    /**
     * Text-only search (for search-as-you-type)
     */
    async quickTextSearch(text) {
        return this.search({ text, limit: limits/* Limits */.xu.quickSearchLimit });
    }
    /**
     * Author search (search bookmarks by author)
     */
    async searchByAuthor(author) {
        return this.search({ author, limit: limits/* Limits */.xu.authorSearchLimit });
    }
    /**
     * Search authors for autocomplete dropdown
     */
    async searchAuthors(query = '', limit = 10) {
        try {
            // Import db from the db module like search executor does
            const { db } = await Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 709));
            // Ensure database is initialized
            await db.initialize();
            // Use the database method we already created
            const authors = await db.searchAuthors(query, limit);
            console.log(`🔍 SearchEngine found ${authors.length} authors for query: "${query}"`);
            return authors;
        }
        catch (error) {
            console.error('❌ SearchEngine author search failed:', error);
            return [];
        }
    }
    /**
     * Recent bookmarks with optional filters
     */
    async getRecent(filters) {
        return this.search({
            ...filters,
            sortBy: 'date',
            limit: filters?.limit || limits/* Limits */.xu.defaultQueryLimit
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
                enabled: false,
                maxCacheSize: limits/* Limits */.xu.cacheSize, // Cache entries from centralized config
                cacheTimeout: 5 * 60 * 1000 // 5 minutes
            },
            textSearch: {
                enableFuzzyMatching: false, // Start simple
                enableStemming: false,
                enableSynonyms: false,
                minTokenLength: 2, // FIXED: Allow 2+ character tokens to match database
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
        // Don't cache empty results to avoid stale empty cache issues
        if (result.bookmarks.length === 0) {
            return;
        }
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
const DELETE_BOOKMARK_ENDPOINT = `${TWITTER_URL}/i/api/graphql/Wlmlj2-xzyS1GN3a6cj-mQ/DeleteBookmark`;

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
        const avatar = result?.core?.user_results?.result?.avatar;

        const avatarUrl = avatar?.image_url || user?.profile_image_url_https;

        return {
          id: result?.rest_id,
          text: legacy?.full_text,
          author: user?.screen_name,
          avatar_url: avatarUrl,
          created_at: legacy?.created_at,
          sortIndex: entry?.sortIndex, 
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
      avatar_url: bookmark.avatar_url,
      created_at: bookmark.created_at,
      sortIndex: bookmark.sortIndex, // Pass through the sortIndex
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
 * Generate transaction ID matching Twitter's format
 * Based on successful request pattern: fC4wC8hk2+Dtk0qhFn6G3eNetLNK25vi/zD3ahuFcHjf7GMgEbmTSl2yTbwW9r7jIhhC8Xj7Aq2N0yCrdT+M+te4GIHzfw
 */
const generateTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < 86; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

/**
 * Delete a single bookmark from X.com API
 * @param {string} tweetId - Tweet ID to remove from bookmarks
 * @param {string|null} csrfTokenOverride - Optional CSRF token override
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const deleteBookmarkV2 = async (tweetId, csrfTokenOverride = null) => {
  console.log(`🗑️ Deleting bookmark: ${tweetId}`);
  
  // Get CSRF token
  let csrfToken = csrfTokenOverride;
  if (!csrfToken) {
    try {
      csrfToken = await getCsrfToken();
      if (!csrfToken) {
        console.warn('⚠️ CSRF token not found for delete operation');
        return { success: false, error: 'Authentication required' };
      }
    } catch (error) {
      console.error('❌ Error getting CSRF token for delete:', error.message);
      return { success: false, error: 'Authentication failed' };
    }
  }

  // Construct headers required by X.com API (matching successful web app requests)
  const headers = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "content-type": "application/json",
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "x-csrf-token": csrfToken,
    // Use simpler transaction ID format like successful requests
    "x-client-transaction-id": generateTransactionId()
    // Removed x-client-uuid as it's not present in successful requests
  };

  // Request body for delete operation
  const requestBody = {
    variables: {
      tweet_id: tweetId
    },
    queryId: "Wlmlj2-xzyS1GN3a6cj-mQ"
  };

  try {
    console.log(`🌐 Making delete request to X.com API for tweet: ${tweetId}`);
    
    const response = await fetch(DELETE_BOOKMARK_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      // Remove referrer and referrerPolicy - let browser handle it naturally
      mode: "cors",
      credentials: "include",
    });
    
    // Always try to parse the response body first
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error(`❌ Failed to parse response JSON for ${tweetId}:`, parseError);
      data = null;
    }
    
    // Handle different response scenarios
    if (response.ok) {
      // Standard success case (200 OK)
      if (data?.data?.tweet_bookmark_delete === "Done") {
        console.log(`✅ Successfully deleted bookmark: ${tweetId}`);
        return { success: true };
      } else {
        console.warn(`⚠️ Unexpected success response for ${tweetId}:`, data);
        return { success: false, error: 'Unexpected API response format' };
      }
    } else {
      // Handle error responses
      if (response.status === 429) {
        throw new RateLimitError(`Rate limit reached during delete: ${response.status}`);
      }
      
      if (response.status === 404) {
        // Bookmark might already be deleted - this is not necessarily an error
        console.log(`⚠️ Bookmark ${tweetId} not found (may already be deleted)`);
        return { success: true, alreadyDeleted: true };
      }
      
      if (response.status === 400) {
        // Twitter API quirk: Sometimes returns 400 but bookmark is actually deleted
        // Check if this is the "InternalServerError" case where deletion succeeded
        if (data?.errors?.[0]?.name === "InternalServerError" && 
            data?.errors?.[0]?.message === "Something went wrong") {
          console.log(`⚠️ Got 400 InternalServerError for ${tweetId}, but bookmark likely deleted successfully`);
          return { success: true, apiQuirk: true };
        }
        
        // Other 400 errors are genuine failures
        const errorMsg = data?.errors?.[0]?.message || 'Bad request';
        console.error(`❌ 400 error deleting ${tweetId}: ${errorMsg}`);
        throw new NetworkError(`Bad request during delete: ${errorMsg}`);
      }
      
      // Other HTTP errors
      const errorMsg = data?.errors?.[0]?.message || `HTTP ${response.status}`;
      throw new NetworkError(`HTTP error during delete! status: ${response.status}, message: ${errorMsg}`);
    }
    
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.warn(`⚠️ Rate limit hit during delete of ${tweetId}`);
      throw error;
    }
    
    if (error instanceof NetworkError) {
      console.error(`❌ Network error deleting ${tweetId}:`, error.message);
      throw error;
    }
    
    console.error(`❌ Unexpected error deleting bookmark ${tweetId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete multiple bookmarks in batches with rate limiting
 * @param {string[]} tweetIds - Array of tweet IDs to delete
 * @param {Object} options - Configuration options
 * @param {number} options.batchSize - Number of deletes per batch (default: 5)
 * @param {number} options.delayBetweenBatches - Delay between batches in ms (default: 2000)
 * @param {Function} options.onProgress - Progress callback (current, total, failed)
 * @param {string|null} csrfTokenOverride - Optional CSRF token override
 * @returns {Promise<{success: boolean, results: Array, summary: Object}>}
 */
const deleteBulkBookmarksV2 = async (tweetIds, options = {}, csrfTokenOverride = null) => {
  const {
    batchSize = 5,
    delayBetweenBatches = 2000,
    onProgress = () => {}
  } = options;

  console.log(`🗑️ Starting bulk delete of ${tweetIds.length} bookmarks (batch size: ${batchSize})`);
  
  const results = [];
  const summary = {
    total: tweetIds.length,
    successful: 0,
    failed: 0,
    alreadyDeleted: 0,
    errors: []
  };

  // Process in batches to avoid rate limits
  for (let i = 0; i < tweetIds.length; i += batchSize) {
    const batch = tweetIds.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tweetIds.length / batchSize)}`);
    
    // Process batch items in parallel (but limited by batch size)
    const batchPromises = batch.map(async (tweetId) => {
      try {
        const result = await deleteBookmarkV2(tweetId, csrfTokenOverride);
        
        if (result.success) {
          if (result.alreadyDeleted) {
            summary.alreadyDeleted++;
          } else {
            summary.successful++;
          }
        } else {
          summary.failed++;
          summary.errors.push({ tweetId, error: result.error });
        }
        
        return { tweetId, ...result };
        
      } catch (error) {
        summary.failed++;
        const errorMsg = error.message || 'Unknown error';
        summary.errors.push({ tweetId, error: errorMsg });
        
        return { 
          tweetId, 
          success: false, 
          error: errorMsg,
          isRateLimit: error instanceof RateLimitError
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Update progress
    const completed = Math.min(i + batchSize, tweetIds.length);
    onProgress(completed, tweetIds.length, summary.failed);
    
    // Check for rate limits in this batch
    const rateLimitErrors = batchResults.filter(r => r.isRateLimit);
    if (rateLimitErrors.length > 0) {
      console.warn(`⚠️ Rate limit detected, extending delay for next batch`);
      await delay(delayBetweenBatches * 2); // Double the delay
    } else if (i + batchSize < tweetIds.length) {
      // Normal delay between batches
      await delay(delayBetweenBatches);
    }
  }

  console.log(`✅ Bulk delete completed: ${summary.successful} successful, ${summary.failed} failed, ${summary.alreadyDeleted} already deleted`);
  
  return {
    success: summary.failed === 0,
    results,
    summary
  };
};

/**
 * Check if a bookmark exists on X.com (useful before attempting delete)
 * @param {string} tweetId - Tweet ID to check
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
const checkBookmarkExists = async (tweetId) => {
  try {
    // We can use a lightweight API call to check if bookmark exists
    // This is a simplified check - in practice, you might want to implement
    // a more specific endpoint if available
    console.log(`🔍 Checking if bookmark exists: ${tweetId}`);
    
    // For now, we'll assume it exists unless we get a 404 during delete
    // A more sophisticated implementation could use the bookmarks fetch
    // with a specific cursor or search
    
    return { exists: true };
    
  } catch (error) {
    console.warn(`⚠️ Error checking bookmark existence for ${tweetId}:`, error);
    return { exists: false, error: error.message };
  }
};

console.log('📡 XSaved v2 Fetcher utility loaded - ready for X.com API integration (with delete support)'); 
;// ./src/utils/sortIndex-utils.ts
/**
 * XSaved Extension v2 - SortIndex Utilities
 * Twitter Snowflake ID parsing and date extraction
 */
/**
 * Extract date from Twitter/X sortIndex (Snowflake ID)
 * @param {string|number|BigInt} sortIndex - The Twitter sortIndex/Snowflake ID
 * @returns {Date} The extracted date
 */
function getSortIndexDate(sortIndex) {
    // Twitter epoch: January 1, 2010 00:00:00 UTC (in milliseconds) -> 1262304000000
    // Twitter epoch told by Grok and ChatGpt (November 4, 2010, 01:42:54 UTC) -> 1288834974657
    // Custom epoch (2011-09-27 01:13:00 UTC) -> 1317959580952
    const TWITTER_EPOCH = 1288834974657;
    try {
        // Convert to BigInt for precise calculation
        const id = BigInt(sortIndex);
        // Extract timestamp (first 41 bits, shifted right by 22 bits)
        const timestampMs = Number(id >> 22n) + TWITTER_EPOCH;
        // Return as Date object
        return new Date(timestampMs);
    }
    catch (error) {
        throw new Error(`Invalid sortIndex: ${sortIndex}. Must be a valid number or string representing a Snowflake ID.`);
    }
}
/**
 * Get ISO string from sortIndex
 * @param {string|number|BigInt} sortIndex - The Twitter sortIndex/Snowflake ID
 * @returns {string} ISO date string
 */
function getSortIndexDateISO(sortIndex) {
    return getSortIndexDate(sortIndex).toISOString();
}
/**
 * Get relative time string from sortIndex (e.g., "2 hours ago")
 * @param {string|number|BigInt} sortIndex - The Twitter sortIndex/Snowflake ID
 * @returns {string} Relative time string
 */
function getSortIndexRelativeTime(sortIndex) {
    const date = getSortIndexDate(sortIndex);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0)
        return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0)
        return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0)
        return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0)
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0)
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (seconds > 0)
        return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    return 'just now';
}
/**
 * Validate if a string/number is a valid Twitter Snowflake ID
 * @param {string|number|bigint} sortIndex - The value to validate
 * @returns {boolean} True if valid Snowflake ID
 */
function isValidSortIndex(sortIndex) {
    try {
        const id = BigInt(sortIndex);
        // Twitter Snowflake IDs are 64-bit integers
        // They should be positive and within reasonable bounds
        return id > 0n && id < 2n ** 64n;
    }
    catch {
        return false;
    }
}
/**
 * Normalize any date format to ISO string for consistent sorting
 * Handles Twitter's old format: "Thu May 31 08:23:54 +0000 2018"
 * and ISO format: "2025-09-20T19:10:11.000Z"
 * @param {string} dateString - The date string to normalize
 * @returns {string} ISO date string
 */
function normalizeDateToISO(dateString) {
    if (!dateString)
        return new Date().toISOString();
    try {
        // If it's already ISO format, return as-is
        if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+'))) {
            return new Date(dateString).toISOString();
        }
        // Handle Twitter's old format: "Thu May 31 08:23:54 +0000 2018"
        // Convert to ISO format
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn(`⚠️ Invalid date format: ${dateString}, using current date`);
            return new Date().toISOString();
        }
        return date.toISOString();
    }
    catch (error) {
        console.warn(`⚠️ Date normalization failed for: ${dateString}, using current date`);
        return new Date().toISOString();
    }
}

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
    ACTIVE: 15, // 15 minutes - when user is on X.com
    OFFLINE: 240 // 4 hours - when user is offline/away from X.com
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
// Multi-user database state tracking
let currentTwitterUsername = null;
let currentTwitterUserId = null;
let currentDatabaseName = null;
let activeXcomTabId = null; // Track currently active X.com tab
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
async function detectCurrentTwitterUser() {
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
    }
    catch (error) {
        console.error('❌ User detection failed:', error);
        return null; // NO FALLBACK TO DEFAULT
    }
}
/**
 * METHOD 1: Extract user from X.com cookies
 * Twitter stores user ID in 'twid' cookie format: u=1234567890
 */
async function getUserFromCookies() {
    try {
        const cookies = await chrome.cookies.getAll({ domain: '.x.com' });
        console.log('🗄️ Cookies Table:');
        console.table(cookies);
        // Check if user is logged in (auth_token must exist)
        const authToken = cookies.find(c => c.name === 'auth_token');
        if (!authToken) {
            console.log('🚫 No auth_token cookie - user is logged out');
            return null;
        }
        // Extract user ID from 'twid' cookie
        const twidCookie = cookies.find(c => c.name === 'twid');
        console.log('🔍c🍪twidCookie:', twidCookie);
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
    }
    catch (error) {
        console.error('❌ Cookie detection failed:', error);
        return null;
    }
}
/**
 * METHOD 2: Extract username from DOM via content script
 */
async function getUserFromDom() {
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
        }
        catch (e) {
            console.warn('⚠️ Content script not ready or tab not responsive');
        }
        return null;
    }
    catch (error) {
        console.error('❌ DOM detection failed:', error);
        return null;
    }
}
/**
 * Store user ID to username mapping for cookie-based detection
 */
async function storeUserIdMapping(userId, username) {
    try {
        const mappings = await chrome.storage.local.get(['userId_to_username']);
        await chrome.storage.local.set({
            userId_to_username: {
                ...(mappings.userId_to_username || {}),
                [userId]: username
            }
        });
        console.log('📝 Stored user mapping:', userId, '→', username);
    }
    catch (error) {
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
async function switchToUserDatabase(username, userId = null) {
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
        const { createUserDatabase } = await Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 709));
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
    }
    catch (error) {
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
async function checkAndSwitchIfNeeded(tabId) {
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
        }
        else {
            console.log('✅ Same user detected, no database switch needed');
        }
        // Update active tab tracker
        if (tabId) {
            activeXcomTabId = tabId;
        }
    }
    catch (error) {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
        // Determine final tags with detailed logging
        let finalTags;
        if (userTags && Array.isArray(userTags) && userTags.length > 0) {
            finalTags = userTags;
        }
        else if (bookmark.tags && Array.isArray(bookmark.tags) && bookmark.tags.length > 0) {
            finalTags = bookmark.tags;
        }
        else {
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
                service_worker_broadcastStateUpdate();
                return { success: true, data: result.data };
            }
            else {
                console.error('❌ Failed to save bookmark to IndexedDB:', result.error);
                return {
                    success: false,
                    error: result.error || 'IndexedDB save failed',
                    details: `Database upsertBookmark operation failed for bookmark ${bookmark.id}`
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
        // Auto-clear badge on successful completion
        chrome.action.setBadgeText({ text: '' });
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
        }
        else {
            sendResponse({ success: true, status: "quick_sync_completed" });
        }
    }
    catch (error) {
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
        }
        else {
            // Fallback to chrome.storage.local search for testing
            console.log('🔍 Using fallback search (testing mode)');
            const result = await chrome.storage.local.get(null);
            const data = result ?? {};
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
                .slice(0, query.limit || limits/* Limits */.xu.defaultQueryLimit);
            console.log(`🔍 Fallback search found ${bookmarks.length} bookmarks`);
            sendResponse({ success: true, result: { results: bookmarks, totalFound: bookmarks.length } });
        }
    }
    catch (error) {
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
        }
        else {
            console.log('👥 Search engine not available for author search');
            sendResponse({ success: false, error: 'Search engine not available' });
        }
    }
    catch (error) {
        console.error('👥 Author search error:', error);
        sendResponse({ success: false, error: error.message });
    }
};
const handleSaveBookmark = async (bookmark, sendResponse) => {
    try {
        const result = await saveBookmarkToLocal(bookmark, bookmark.tags);
        if (result.success) {
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
        }
        else {
            // Fallback to chrome.storage.local stats for testing
            console.log('📊 Using fallback stats (testing mode)');
            const result = await chrome.storage.local.get(null);
            const data = result ?? {};
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
const handleClearCache = async (sendResponse) => {
    try {
        await serviceWorker.initialize();
        if (serviceWorker.searchEngine) {
            serviceWorker.searchEngine.clearCache();
            console.log('🧹 Search cache cleared via service worker');
            sendResponse({ success: true, message: 'Cache cleared successfully' });
        }
        else {
            sendResponse({ success: false, error: 'Search engine not initialized' });
        }
    }
    catch (error) {
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
        }
        else {
            console.log('❌ First extraction failed');
            showFirstTimePopup('extraction_failed', {
                title: 'Setup Issues',
                message: 'We encountered an issue importing your bookmarks. Please try manually syncing from the extension popup.',
                action: 'Try Manual Sync'
            });
        }
    }
    catch (error) {
        console.error('❌ First-time setup failed:', error);
        if (error.message.includes('Rate limit')) {
            showFirstTimePopup('rate_limited', {
                title: 'Rate Limited',
                message: 'X.com is limiting our requests. Please wait a few minutes and try syncing manually.',
                action: 'Open Extension'
            });
        }
        else if (error.message.includes('Network')) {
            showFirstTimePopup('network_error', {
                title: 'Network Error',
                message: 'Unable to connect to X.com. Please check your internet connection and try again.',
                action: 'Retry Setup'
            });
        }
        else {
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
/**
 * Handle single bookmark deletion
 */
const handleDeleteBookmark = async (tweetId, sendResponse) => {
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
            }
            else {
                console.warn(`⚠️ Failed to delete from X.com API, but removed from local DB: ${apiResult.error}`);
                sendResponse({
                    success: true,
                    deletedFromApi: false,
                    apiError: apiResult.error,
                    message: 'Removed from local storage, but X.com deletion failed'
                });
            }
        }
        catch (error) {
            if (error instanceof RateLimitError) {
                console.warn(`⚠️ Rate limit hit while deleting ${tweetId}, but removed from local DB`);
                sendResponse({
                    success: true,
                    deletedFromApi: false,
                    rateLimited: true,
                    message: 'Removed from local storage, X.com deletion rate limited'
                });
            }
            else {
                console.error(`❌ API error deleting ${tweetId}:`, error);
                sendResponse({
                    success: true,
                    deletedFromApi: false,
                    apiError: error.message,
                    message: 'Removed from local storage, but X.com deletion failed'
                });
            }
        }
    }
    catch (error) {
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
const handleDeleteBulkBookmarks = async (tweetIds, options = {}, sendResponse) => {
    try {
        await serviceWorker.initialize();
        console.log(`🗑️ Service Worker: Bulk deleting ${tweetIds.length} bookmarks`);
        const { batchSize = 5, delayBetweenBatches = 2000, deleteFromApi = true } = options;
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
                const onProgress = (current, total, failed) => {
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
                            notifyContentScript(tab.id, progressMessage).catch(() => { });
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
            }
            catch (error) {
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
    }
    catch (error) {
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
        }
        else {
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
            const limitedBookmarks = bookmarks.slice(0, limits/* Limits */.xu.maxBookmarksForExport);
            if (bookmarks.length > limits/* Limits */.xu.maxBookmarksForExport) {
                console.warn(`⚠️ [SW] PDF export limited to ${limits/* Limits */.xu.maxBookmarksForExport} bookmarks (requested: ${bookmarks.length})`);
            }
            // Generate PDF content using a simple text-based format
            // This creates a PDF-like structure that can be opened by PDF viewers
            const pdfContent = this.generatePDFContent(limitedBookmarks, bookmarks.length > limits/* Limits */.xu.maxBookmarksForExport);
            const blob = new Blob([pdfContent], { type: 'application/pdf' });
            return {
                success: true,
                data: blob,
                filename: options.filename || `bookmarks-${Date.now()}.pdf`,
                size: blob.size,
                metadata: {
                    originalCount: bookmarks.length,
                    exportedCount: limitedBookmarks.length,
                    limited: bookmarks.length > limits/* Limits */.xu.maxBookmarksForExport
                }
            };
        }
        catch (error) {
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
            }
            catch (error) {
                console.error('❌ Database inspection failed:', error);
            }
        },
        listBookmarks: async (limit = limits/* Limits */.xu.defaultQueryLimit) => {
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
                const result = await serviceWorker.db.getAllBookmarks({ limit: limits/* Limits */.xu.maxQueryLimit });
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
            }
            catch (error) {
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
                const result = await serviceWorker.db.getAllBookmarks({ limit: limits/* Limits */.xu.maxQueryLimit });
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
                        .sort(([, a], [, b]) => b - a)
                        .reduce((obj, [tag, count]) => ({ ...obj, [tag]: count }), {})
                };
                console.log('📊 === TAG STATISTICS ===');
                console.log(`Total bookmarks: ${stats.totalBookmarks}`);
                console.log(`Tagged bookmarks: ${stats.taggedBookmarks} (${stats.taggedPercentage}%)`);
                console.log(`Untagged bookmarks: ${stats.untaggedBookmarks}`);
                console.log(`Unique tags: ${stats.uniqueTags}`);
                console.log('Top 10 tags:', Object.entries(stats.tagDistribution).slice(0, 10));
                return { success: true, stats };
            }
            catch (error) {
                console.error('❌ Error getting tag statistics:', error);
                return { success: false, error: error.message };
            }
        },
        // Convenience shortcuts
        addRandomTagsQuick: () => self.testXSaved.addRandomTags(1, 3, true, true),
        addRandomTagsExtensive: () => self.testXSaved.addRandomTags(3, 5, true, true),
        // ===============================
        // DATE DEBUG FUNCTIONS
        // ===============================
        /**
         * Debug bookmark dates - shows raw data and parsed dates
         */
        async debugBookmarkDates() {
            try {
                console.log('🔍 DEBUG: Analyzing bookmark dates...\n');
                const result = await db.db.searchBookmarks({ limit: limits/* Limits */.xu.defaultQueryLimit, sortBy: 'created_at', sortOrder: 'asc' });
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
                        }
                        catch (error) {
                            console.log(`❌ SortIndex parse error: ${error.message}`);
                        }
                    }
                    console.log(`Author: ${bookmark.author}`);
                    console.log(`Text preview: "${bookmark.text.substring(0, 50)}..."`);
                    console.log(''); // Empty line for readability
                });
            }
            catch (error) {
                console.error('❌ Debug function failed:', error);
            }
        },
        /**
         * Validate date consistency across all bookmarks
         */
        async validateDateConsistency() {
            try {
                console.log('🔍 VALIDATION: Checking date consistency...\n');
                const result = await db.db.searchBookmarks({ limit: limits/* Limits */.xu.maxQueryLimit, sortBy: 'created_at', sortOrder: 'asc' });
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
                }
                else {
                    console.log(`\n⚠️ Found ${totalIssues} potential issues`);
                }
            }
            catch (error) {
                console.error('❌ Validation failed:', error);
            }
        },
        /**
         * Get 20 oldest tweets by bookmarked_at date
         */
        async getOldestBookmarkedAt() {
            try {
                console.log('🔍 OLDEST BY CREATED_AT: Fetching 20 oldest tweets...\n');
                const result = await db.db.searchBookmarks({ limit: limits/* Limits */.xu.popularTagsLimit, sortBy: 'created_at', sortOrder: 'asc' });
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
            }
            catch (error) {
                console.error('❌ Function failed:', error);
            }
        },
        /**
         * Get 20 newest tweets by bookmarked_at date
         */
        async getNewestBookmarkedAt() {
            try {
                console.log('🔍 NEWEST BY CREATED_AT: Fetching 20 newest tweets...\n');
                const result = await db.db.searchBookmarks({ limit: limits/* Limits */.xu.popularTagsLimit, sortBy: 'created_at', sortOrder: 'desc' });
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
            }
            catch (error) {
                console.error('❌ Function failed:', error);
            }
        },
        /**
         * Get 20 oldest tweets by created_at date
         */
        async getOldestCreatedAt() {
            try {
                console.log('🔍 OLDEST BY CREATED_AT: Fetching 20 oldest created tweets...\n');
                const result = await db.db.searchBookmarks({ limit: limits/* Limits */.xu.popularTagsLimit, sortBy: 'created_at', sortOrder: 'asc' });
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
            }
            catch (error) {
                console.error('❌ Function failed:', error);
            }
        },
        /**
         * Get 20 newest tweets by created_at date
         */
        async getNewestCreatedAt() {
            try {
                console.log('🔍 NEWEST BY CREATED_AT: Fetching 20 newest created tweets...\n');
                const result = await db.db.searchBookmarks({ limit: limits/* Limits */.xu.popularTagsLimit, sortBy: 'created_at', sortOrder: 'desc' });
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
            }
            catch (error) {
                console.error('❌ Function failed:', error);
            }
        }
    };
    // Also expose functions globally for direct access
    self.addRandomTags = self.testXSaved.addRandomTags;
    self.getTagStats = self.testXSaved.getTagStats;
    self.debugBookmarkDates = self.testXSaved.debugBookmarkDates;
    self.validateDateConsistency = self.testXSaved.validateDateConsistency;
    self.getOldestBookmarkedAt = self.testXSaved.getOldestBookmarkedAt;
    self.getNewestBookmarkedAt = self.testXSaved.getNewestBookmarkedAt;
    self.getOldestCreatedAt = self.testXSaved.getOldestCreatedAt;
    self.getNewestCreatedAt = self.testXSaved.getNewestCreatedAt;
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

})();

/******/ })()
;
//# sourceMappingURL=service-worker.js.map