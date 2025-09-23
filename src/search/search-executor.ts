/**
 * XSaved Extension v2 - Search Executor
 * Executes optimized queries using pure Dexie API
 * OPTIMIZED: Removed raw IndexedDB transactions, now uses native Dexie queries
 */

import { db, BookmarkEntity } from '../db';
import { 
  ParsedQuery, 
  SearchResult, 
  ScoredBookmark, 
  QueryFilter,
  SearchAnalytics,
  SearchEngineConfig 
} from './types';
import { Limits } from '../config/limits';

export class SearchExecutor {
  private config: SearchEngineConfig;
  
  constructor(config: SearchEngineConfig) {
    this.config = config;
  }

  /**
   * Execute multi-criteria search query
   */
  async executeSearch(parsedQuery: ParsedQuery): Promise<SearchResult> {
    const startTime = performance.now();
    let analytics: SearchAnalytics = {
      queryTime: 0,
      indexHits: 0,
      resultsReturned: 0,
      cacheHit: false,
      slowOperations: [],
      indexesUsed: []
    };

    try {
      console.log(`🔍 SearchExecutor.executeSearch called with:`, parsedQuery);
      
      // Ensure database is ready
      await db.initialize();

      // Execute primary filter first (most selective)
      let candidateBookmarks: BookmarkEntity[] = [];
      
      if (parsedQuery.queryPlan.primaryFilter) {
        candidateBookmarks = await this.executeSingleFilter(
          parsedQuery.queryPlan.primaryFilter, 
          analytics
        );
      } else {
        // No filters - get recent bookmarks as starting point
        const sortBy = 'created_at'; // Always use created_at
        const recentResult = await db.getRecentBookmarks({ 
          limit: parsedQuery.limit || Limits.defaultSearchLimit,
          sortBy: sortBy,
          offset: parsedQuery.offset  // CRITICAL FIX: Pass the offset for pagination!
        });
        candidateBookmarks = recentResult.data || [];
        console.log(`🔍 Retrieved ${candidateBookmarks.length} candidate bookmarks from database`);
        analytics.indexesUsed.push(sortBy);
      }

      // Apply secondary filters
      for (const filter of parsedQuery.queryPlan.secondaryFilters) {
        candidateBookmarks = await this.applyFilter(
          candidateBookmarks, 
          filter, 
          analytics
        );
        
        // Early termination if too few results
        if (candidateBookmarks.length === 0) {
          break;
        }
      }

      // Apply text search if present
      if (parsedQuery.textTokens.length > 0) {
        console.log(`🔍 Applying substring text search with tokens:`, parsedQuery.textTokens);
        
        if (candidateBookmarks.length === 0) {
          // No candidates from primary filter, do substring search directly
          candidateBookmarks = await this.searchBySubstring(parsedQuery.textTokens, analytics);
        } else {
          // Apply substring filtering to existing candidates
          candidateBookmarks = await this.applySubstringFilter(candidateBookmarks, parsedQuery.textTokens, analytics);
        }
        console.log(`🔍 After substring text search: ${candidateBookmarks.length} bookmarks remaining`);
      }

      // Filter out excluded tags
      if (parsedQuery.excludedTags.length > 0) {
        candidateBookmarks = candidateBookmarks.filter(bookmark =>
          !parsedQuery.excludedTags.some(excludedTag =>
            bookmark.tags.includes(excludedTag)
          )
        );
      }

      const queryTime = performance.now() - startTime;
      analytics.queryTime = queryTime;
      analytics.resultsReturned = candidateBookmarks.length;

      // Apply final sorting
      if (parsedQuery.sortBy && parsedQuery.sortBy !== 'relevance') {
        candidateBookmarks = this.applySorting(candidateBookmarks, parsedQuery.sortBy, parsedQuery.sortOrder);
      }

      // Apply limit after sorting
      if (parsedQuery.limit && candidateBookmarks.length > parsedQuery.limit) {
        candidateBookmarks = candidateBookmarks.slice(0, parsedQuery.limit);
      }

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

    } catch (error) {
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
  private async executeSingleFilter(
    filter: QueryFilter, 
    analytics: SearchAnalytics
  ): Promise<BookmarkEntity[]> {
    const startTime = performance.now();

    try {
      let result: BookmarkEntity[] = [];

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

    } catch (error) {
      console.error(`Filter execution error for ${filter.type}:`, error);
      return [];
    }
  }

  /**
   * Apply filter to existing result set
   */
  private async applyFilter(
    bookmarks: BookmarkEntity[], 
    filter: QueryFilter,
    analytics: SearchAnalytics
  ): Promise<BookmarkEntity[]> {
    const startTime = performance.now();

    let filtered: BookmarkEntity[] = [];

    switch (filter.type) {
      case 'tag':
        filtered = bookmarks.filter(bookmark => 
          bookmark.tags.includes(filter.value)
        );
        break;

      case 'author':
        filtered = bookmarks.filter(bookmark => 
          bookmark.author.toLowerCase() === filter.value.toLowerCase()
        );
        break;

      case 'hasMedia':
        filtered = bookmarks.filter(bookmark => 
          filter.value ? 
            (bookmark.media_urls && bookmark.media_urls.length > 0) :
            (!bookmark.media_urls || bookmark.media_urls.length === 0)
        );
        break;

      case 'dateRange':
        const { start, end } = filter.value;
        filtered = bookmarks.filter(bookmark => {
          const bookmarkDate = new Date(bookmark.created_at);
          return bookmarkDate >= new Date(start) && bookmarkDate <= new Date(end);
        });
        break;

      case 'textToken':
        filtered = bookmarks.filter(bookmark =>
          bookmark.textTokens.includes(filter.value) ||
          bookmark.text.toLowerCase().includes(filter.value)
        );
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
  private async searchByTag(tag: string): Promise<BookmarkEntity[]> {
    const result = await db.getBookmarksByTag(tag);
    return result.success ? result.data || [] : [];
  }

  /**
   * Search by author using Dexie query (OPTIMIZED)
   */
  private async searchByAuthor(author: string): Promise<BookmarkEntity[]> {
    try {
      // Use native Dexie query - much cleaner!
      const results = await db.bookmarks
        .where('author')
        .equalsIgnoreCase(author)
        .reverse()
        .limit(Limits.indexSearchLimit)
        .toArray();
      
      console.log(`👤 Found ${results.length} bookmarks by @${author}`);
      return results;
    } catch (error) {
      console.error(`❌ Author search failed for @${author}:`, error);
      return [];
    }
  }

  /**
   * Search by date range using Dexie query (OPTIMIZED)
   */
  private async searchByDateRange(dateRange: { start: string; end: string }): Promise<BookmarkEntity[]> {
    try {
      // Use native Dexie range query - cleaner and more optimized!
      const results = await db.bookmarks
        .where('bookmarked_at')
        .between(dateRange.start, dateRange.end)
        .reverse()
        .limit(Limits.substringSearchLimit)
        .toArray();
      
      console.log(`📅 Found ${results.length} bookmarks in date range ${dateRange.start} to ${dateRange.end}`);
      return results;
    } catch (error) {
      console.error('❌ Date range search failed:', error);
      return [];
    }
  }

  /**
   * Search by text token using Dexie multi-entry index (OPTIMIZED)
   */
  private async searchByTextToken(token: string): Promise<BookmarkEntity[]> {
    try {
      // FIXED: Use proper multi-entry index query for fast exact token matching
      const results = await db.bookmarks
        .where('textTokens')
        .anyOfIgnoreCase([token])
        .reverse()
        .limit(Limits.indexSearchLimit)
        .toArray();
      
      console.log(`🔍 Found ${results.length} bookmarks with exact token "${token}"`);
      return results;
    } catch (error) {
      console.error(`❌ Text token search failed for "${token}":`, error);
      return [];
    }
  }

  /**
   * Search by substring matching (replicates client-side filter logic)
   */
  private async searchBySubstring(tokens: string[], analytics: SearchAnalytics): Promise<BookmarkEntity[]> {
    try {
      // Get all bookmarks for substring search
      const allBookmarks = await db.bookmarks
        .orderBy('created_at')
        .reverse()
        .limit(Limits.substringSearchLimit) // Reasonable limit for substring search
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
    } catch (error) {
      console.error(`❌ Substring search failed:`, error);
      return [];
    }
  }

  /**
   * Apply substring filtering to existing candidate bookmarks
   */
  private async applySubstringFilter(
    bookmarks: BookmarkEntity[],
    tokens: string[],
    analytics: SearchAnalytics
  ): Promise<BookmarkEntity[]> {
    if (tokens.length === 0) return bookmarks;

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
  private async searchByMultiColumn(tokens: string[], analytics: SearchAnalytics): Promise<BookmarkEntity[]> {
    try {
      console.log(`🔍 Dexie multi-column search with tokens:`, tokens);
      
      // Use Dexie's filter method to search across multiple columns
      // This is similar to SQL: WHERE text LIKE '%token%' OR author LIKE '%token%' OR tags CONTAINS 'token'
      const results = await db.bookmarks
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
              if (bookmark.tags.some(tag => 
                typeof tag === 'string' && tag.toLowerCase().includes(lowerToken)
              )) {
                return true;
              }
            }
            
            return false;
          });
        })
        .limit(Limits.substringSearchLimit) // Reasonable limit
        .toArray();
      
      console.log(`🔍 Dexie multi-column search found ${results.length} matches`);
      return results;
    } catch (error) {
      console.error(`❌ Dexie multi-column search failed:`, error);
      return [];
    }
  }

  /**
   * Filter by media presence using optimized Dexie query (OPTIMIZED)
   */
  private async searchByMediaPresence(hasMedia: boolean): Promise<BookmarkEntity[]> {
    try {
      // Use Dexie's collection filtering - more efficient than manual scanning
      const results = await db.bookmarks
        .filter(bookmark => 
          hasMedia ? 
            (bookmark.media_urls && bookmark.media_urls.length > 0) :
            (!bookmark.media_urls || bookmark.media_urls.length === 0)
        )
        .reverse()
        .limit(Limits.substringSearchLimit)
        .toArray();
      
      console.log(`📷 Found ${results.length} bookmarks ${hasMedia ? 'with' : 'without'} media`);
      return results;
    } catch (error) {
      console.error('❌ Media presence search failed:', error);
      return [];
    }
  }

  /**
   * Apply text search with token matching
   */
  private async applyTextSearch(
    bookmarks: BookmarkEntity[],
    tokens: string[],
    analytics: SearchAnalytics
  ): Promise<BookmarkEntity[]> {
    if (tokens.length === 0) return bookmarks;

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
      return tokens.every(token => 
        bookmarkTokens.includes(token) || bookmarkText.includes(token)
      );
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
  private intersectResults(resultSets: BookmarkEntity[][]): BookmarkEntity[] {
    if (resultSets.length === 0) return [];
    if (resultSets.length === 1) return resultSets[0];

    // Sort by length (smallest first) for efficient intersection
    resultSets.sort((a, b) => a.length - b.length);

    let intersection = resultSets[0];
    
    for (let i = 1; i < resultSets.length; i++) {
      const currentSet = new Set(resultSets[i].map(bookmark => bookmark.id));
      intersection = intersection.filter(bookmark => currentSet.has(bookmark.id));
      
      // Early termination if intersection becomes empty
      if (intersection.length === 0) break;
    }

    return intersection;
  }

  /**
   * Union multiple result sets with deduplication
   */
  private unionResults(resultSets: BookmarkEntity[][]): BookmarkEntity[] {
    const seen = new Set<string>();
    const union: BookmarkEntity[] = [];

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
  private applySorting(bookmarks: BookmarkEntity[], sortBy: string, sortOrder?: 'asc' | 'desc'): BookmarkEntity[] {
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
  private getPerformanceTarget(filterType: string): number {
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