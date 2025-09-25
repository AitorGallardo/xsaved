/**
 * XSaved Extension v2 - Search Engine
 * Main search engine that orchestrates query parsing, execution, and ranking
 */

import { QueryParser } from './query-parser';
import { SearchExecutor } from './search-executor';
import { 
  SearchQuery, 
  SearchResult, 
  SearchEngineConfig,
  TagSuggestion,
  TextSearchConfig 
} from './types';
import { Limits } from '../config/limits';

export class SearchEngine {
  private queryParser: QueryParser;
  private searchExecutor: SearchExecutor;
  private config: SearchEngineConfig;
  private queryCache: Map<string, { result: SearchResult; timestamp: number }>;

  constructor(config?: Partial<SearchEngineConfig>) {
    this.config = this.createDefaultConfig(config);
    this.queryParser = new QueryParser(this.config.textSearch);
    this.searchExecutor = new SearchExecutor(this.config);
    this.queryCache = new Map();
  }

  /**
   * Main search method - the public API
   */
  async search(query: SearchQuery): Promise<SearchResult> {
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

    } catch (error) {
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
  async quickTagSearch(tag: string): Promise<SearchResult> {
    return this.search({ tags: [tag], limit: Limits.quickSearchLimit });
  }

  /**
   * Text-only search (for search-as-you-type)
   */
  async quickTextSearch(text: string): Promise<SearchResult> {
    return this.search({ text, limit: Limits.quickSearchLimit });
  }

  /**
   * Author search (search bookmarks by author)
   */
  async searchByAuthor(author: string): Promise<SearchResult> {
    return this.search({ author, limit: Limits.authorSearchLimit });
  }

  /**
   * Search authors for autocomplete dropdown
   */
  async searchAuthors(query: string = '', limit: number = 10): Promise<{ author: string; count: number; avatar_url?: string }[]> {
    try {
      // Import db from the db module like search executor does
      const { db } = await import('../db');
      
      // Ensure database is initialized
      await db.initialize();
      
      // Use the database method we already created
      const authors = await db.searchAuthors(query, limit);
      console.log(`🔍 SearchEngine found ${authors.length} authors for query: "${query}"`);
      
      return authors;
    } catch (error) {
      console.error('❌ SearchEngine author search failed:', error);
      return [];
    }
  }

  /**
   * Recent bookmarks with optional filters
   */
  async getRecent(filters?: Partial<SearchQuery>): Promise<SearchResult> {
    return this.search({ 
      ...filters, 
      sortBy: 'date', 
      limit: filters?.limit || Limits.defaultQueryLimit 
    });
  }

  /**
   * Get tag suggestions for autocomplete
   */
  async suggestTags(partial: string): Promise<TagSuggestion[]> {
    // This would use the tags store from our database
    // For now, return empty array - will implement when we add tag management
    return [];
  }

  /**
   * Get search suggestions based on current query
   */
  async getSearchSuggestions(query: SearchQuery): Promise<string[]> {
    return this.queryParser.extractSuggestions(query);
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.queryCache.clear();
    console.log('🧹 Search cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // Simple implementation - in production would track hit rate
    return {
      size: this.queryCache.size,
      hitRate: 0.85 // Placeholder
    };
  }

  /**
   * Update search engine configuration
   */
  updateConfig(newConfig: Partial<SearchEngineConfig>): void {
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
  private createDefaultConfig(userConfig?: Partial<SearchEngineConfig>): SearchEngineConfig {
    const defaultConfig: SearchEngineConfig = {
      performanceTargets: {
        singleTagSearch: 5,      // 5ms
        multiTagSearch: 20,      // 20ms  
        textSearch: 30,          // 30ms
        combinedSearch: 50,      // 50ms
        autocomplete: 10         // 10ms
      },
      caching: {
        enabled: false,
        maxCacheSize: Limits.cacheSize,       // Cache entries from centralized config
        cacheTimeout: 5 * 60 * 1000  // 5 minutes
      },
      textSearch: {
        enableFuzzyMatching: false,  // Start simple
        enableStemming: false,
        enableSynonyms: false,
        minTokenLength: 2,  // FIXED: Allow 2+ character tokens to match database
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
  private getCachedResult(cacheKey: string): SearchResult | null {
    const cached = this.queryCache.get(cacheKey);
    
    if (!cached) return null;
    
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
  private cacheResult(cacheKey: string, result: SearchResult): void {
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
export const searchEngine = new SearchEngine(); 