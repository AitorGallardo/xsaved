/**
 * XSaved Extension v2 - Search Module
 * Main exports for the search and filtering system
 */

// Main search engine
export { SearchEngine, searchEngine } from './search-engine';

// Core components  
export { QueryParser } from './query-parser';
export { SearchExecutor } from './search-executor';

// Type definitions
export type {
  SearchQuery,
  ParsedQuery,
  SearchResult,
  ScoredBookmark,
  ScoringFactors,
  QueryFilter,
  QueryExecutionPlan,
  SearchFacets,
  TagSuggestion,
  TextSearchConfig,
  SearchEngineConfig,
  SearchAnalytics,
  PerformanceMetrics,
  CachedQuery,
  SearchSession
} from './types'; 