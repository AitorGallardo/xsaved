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
    return this.search({ tags: [tag], limit: 20 });
  }

  /**
   * Text-only search (for search-as-you-type)
   */
  async quickTextSearch(text: string): Promise<SearchResult> {
    return this.search({ text, limit: 20 });
  }

  /**
   * Author search
   */
  async searchByAuthor(author: string): Promise<SearchResult> {
    return this.search({ author, limit: 50 });
  }

  /**
   * Recent bookmarks with optional filters
   */
  async getRecent(filters?: Partial<SearchQuery>): Promise<SearchResult> {
    return this.search({ 
      ...filters, 
      sortBy: 'date', 
      limit: filters?.limit || 50 
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
        enabled: true,
        maxCacheSize: 100,       // Cache 100 recent queries
        cacheTimeout: 5 * 60 * 1000  // 5 minutes
      },
      textSearch: {
        enableFuzzyMatching: false,  // Start simple
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
      console.log('🚫 Not caching empty result to prevent stale cache');
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