/**
 * XSaved Extension v2 - Search Engine Types
 * Type definitions for the search and filtering system
 */

import { BookmarkEntity } from '../db/types';

// Core search query interface
export interface SearchQuery {
  text?: string;                    // Free-text search: "machine learning tutorial"
  tags?: string[];                  // Tag filtering: ["ai", "python"]
  author?: string;                  // Author filtering: "levelsio"
  dateRange?: {
    start: string;                  // ISO date string
    end: string;                    // ISO date string
  };
  excludeTags?: string[];           // Tags to exclude
  hasMedia?: boolean;               // Only bookmarks with media
  sortBy?: 'relevance' | 'date' | 'author';
  limit?: number;                   // Max results (default: 50)
  offset?: number;                  // Pagination offset
}

// Parsed and optimized query
export interface ParsedQuery {
  textTokens: string[];             // Tokenized text: ["machine", "learning", "tutorial"]
  exactPhrases: string[];           // Exact phrases: ["machine learning"]
  requiredTags: string[];           // Must have these tags
  optionalTags: string[];           // Bonus points for these tags
  excludedTags: string[];           // Must NOT have these tags
  filters: QueryFilter[];           // Additional filters
  queryPlan: QueryExecutionPlan;    // Optimized execution order
  originalQuery: SearchQuery;       // Original query for reference
}

// Individual filter definition
export interface QueryFilter {
  type: 'author' | 'dateRange' | 'hasMedia' | 'textToken' | 'tag';
  value: any;
  selectivity: number;              // 0-1, how selective this filter is
  estimatedCost: number;            // Estimated execution time
}

// Query execution plan
export interface QueryExecutionPlan {
  primaryFilter: QueryFilter;       // Most selective filter to run first
  secondaryFilters: QueryFilter[];  // Additional filters in order
  intersectionStrategy: 'all' | 'any' | 'custom';
  estimatedResultCount: number;
  estimatedExecutionTime: number;
}

// Search result with scoring
export interface SearchResult {
  bookmarks: ScoredBookmark[];
  totalCount: number;
  queryTime: number;                // Actual execution time
  pagination: {
    hasMore: boolean;
    nextOffset?: number;
    totalPages: number;
  };
  facets?: SearchFacets;            // Aggregated result info
  suggestedQueries?: string[];      // Query suggestions
}

// Bookmark with relevance score
export interface ScoredBookmark {
  bookmark: BookmarkEntity;
  score: number;                    // 0-1 relevance score
  matchingFactors: ScoringFactors;
  highlightedText?: string;         // Text with search terms highlighted
  matchedTags?: string[];           // Which tags matched the query
}

// Scoring breakdown
export interface ScoringFactors {
  textRelevance: number;            // How well text matches (0-1)
  tagRelevance: number;             // Tag match score (0-1)
  recency: number;                  // Recency boost (0-1)
  authorPopularity: number;         // Author engagement score (0-1)
  userInteraction: number;          // User's interaction history (0-1)
  exactMatch: boolean;              // Contains exact phrase match
}

// Search result aggregations
export interface SearchFacets {
  topTags: Array<{ tag: string; count: number }>;
  topAuthors: Array<{ author: string; count: number }>;
  dateDistribution: Array<{ 
    period: string; 
    count: number;
    startDate: string;
    endDate: string;
  }>;
  mediaTypes: {
    withImages: number;
    withVideos: number;
    textOnly: number;
  };
}

// Tag suggestions and autocomplete
export interface TagSuggestion {
  tag: string;
  usageCount: number;
  relevanceScore: number;           // How relevant to current query
  category?: string;                // Optional tag categorization
}

// Text search configuration
export interface TextSearchConfig {
  enableFuzzyMatching: boolean;     // Allow typos
  enableStemming: boolean;          // "coding" matches "code"
  enableSynonyms: boolean;          // "JS" matches "JavaScript"
  minTokenLength: number;           // Ignore tokens shorter than this
  maxTokens: number;                // Limit tokens per query
  proximityBoost: boolean;          // Boost results with terms close together
}

// Search analytics for optimization
export interface SearchAnalytics {
  queryTime: number;
  indexHits: number;
  resultsReturned: number;
  cacheHit: boolean;
  slowOperations: string[];         // Operations that exceeded targets
  indexesUsed: string[];            // Which indexes were utilized
}

// Search engine configuration
export interface SearchEngineConfig {
  performanceTargets: {
    singleTagSearch: number;        // Target: 5ms
    multiTagSearch: number;         // Target: 20ms
    textSearch: number;             // Target: 30ms
    combinedSearch: number;         // Target: 50ms
    autocomplete: number;           // Target: 10ms
  };
  caching: {
    enabled: boolean;
    maxCacheSize: number;           // Max cached queries
    cacheTimeout: number;           // Cache TTL in ms
  };
  textSearch: TextSearchConfig;
  relevanceWeights: {
    textMatch: number;              // Default: 0.4
    tagMatch: number;               // Default: 0.3
    recency: number;                // Default: 0.15
    interaction: number;            // Default: 0.1
    author: number;                 // Default: 0.05
  };
}

// Search engine performance metrics
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  recordsScanned: number;
  recordsReturned: number;
  indexesUsed: string[];
  cacheHit: boolean;
  timestamp: string;
}

// Query cache entry
export interface CachedQuery {
  queryHash: string;
  query: SearchQuery;
  result: SearchResult;
  timestamp: number;
  hitCount: number;
  averageResponseTime: number;
}

// Search session for analytics
export interface SearchSession {
  sessionId: string;
  startTime: number;
  queries: Array<{
    query: SearchQuery;
    timestamp: number;
    resultCount: number;
    clickedResults: string[];       // Bookmark IDs that were clicked
  }>;
  totalQueries: number;
  averageResponseTime: number;
} 