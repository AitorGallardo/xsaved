/**
 * XSaved Extension v2 - Search Executor
 * Executes optimized queries against IndexedDB indexes
 */
import { db, STORES } from '../db';
export class SearchExecutor {
    config;
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
//# sourceMappingURL=search-executor.js.map