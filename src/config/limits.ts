/**
 * XSaved Extension v2 - Centralized Limits Configuration
 * Prevents hardcoded limits and ensures consistent behavior across the application
 */

export interface LimitsConfig {
  // === PAGINATION LIMITS ===
  pagination: {
    initialLoad: number;        // First page load
    pageSize: number;          // Subsequent page loads
    maxPages: number;          // Maximum pages to load
    scrollThreshold: number;   // When to trigger next page load
  };

  // === SEARCH LIMITS ===
  search: {
    defaultLimit: number;      // Default search results
    maxSearchLimit: number;    // Maximum search results
    quickSearchLimit: number;  // Fast search (autocomplete)
    textSearchLimit: number;   // Text search results
    tagSearchLimit: number;    // Tag search results
    authorSearchLimit: number; // Author search results
  };

  // === DATABASE LIMITS ===
  database: {
    defaultQueryLimit: number;    // Default database queries
    maxQueryLimit: number;        // Maximum database queries
    substringSearchLimit: number; // Substring search results
    indexSearchLimit: number;     // Index-based search results
    popularTagsLimit: number;     // Popular tags query
    searchTagsLimit: number;      // Tag search query
  };

  // === PERFORMANCE LIMITS ===
  performance: {
    batchSize: number;           // Bulk operations
    cacheSize: number;           // Cache entries
    maxBookmarksForExport: number; // Export operations
    maxTokensPerBookmark: number;  // Tokenization
    maxTagsPerBookmark: number;    // Tag assignment
  };

  // === UI LIMITS ===
  ui: {
    gridColumns: number;         // Grid layout
    maxVisibleBookmarks: number; // UI rendering
    debounceMs: number;          // Search input debounce
    loadingTimeoutMs: number;    // Loading indicators
  };
}

/**
 * Default limits configuration
 * These values are carefully chosen based on performance testing and user experience
 */
export const DEFAULT_LIMITS: LimitsConfig = {
  pagination: {
    initialLoad: 200,        // First load: 200 bookmarks for good UX
    pageSize: 200,          // Each subsequent load: 200 more bookmarks
    maxPages: 50,           // Maximum 50 pages (10,000 bookmarks total)
    scrollThreshold: 0.9    // Trigger next load when 90% scrolled
  },

  search: {
    defaultLimit: 5000,      // Default search: 3000 results (matches content script)
    maxSearchLimit: 20000,   // Maximum search: 10,000 results
    quickSearchLimit: 20,    // Fast search: 20 results
    textSearchLimit: 3000,   // Text search: 3000 results
    tagSearchLimit: 50,      // Tag search: 50 results
    authorSearchLimit: 50    // Author search: 50 results
  },

  database: {
    defaultQueryLimit: 50,      // Default database: 50 results
    maxQueryLimit: 10000,       // Maximum database: 10,000 results
    substringSearchLimit: 5000, // Substring search: 5000 results
    indexSearchLimit: 2000,     // Index search: 2000 results
    popularTagsLimit: 20,       // Popular tags: 20 results
    searchTagsLimit: 10         // Tag search: 10 results
  },

  performance: {
    batchSize: 1000,           // Bulk operations: 1000 items
    cacheSize: 100,            // Cache: 100 entries
    maxBookmarksForExport: 500, // Export: 500 bookmarks max
    maxTokensPerBookmark: 100,  // Tokenization: 100 tokens max
    maxTagsPerBookmark: 50      // Tags: 50 tags max per bookmark
  },

  ui: {
    gridColumns: 3,             // Grid: 3 columns
    maxVisibleBookmarks: 3000,  // UI: 3000 visible bookmarks
    debounceMs: 300,            // Search: 300ms debounce
    loadingTimeoutMs: 5000      // Loading: 5s timeout
  }
};

/**
 * Production limits configuration
 * More conservative limits for production environments
 */
export const PRODUCTION_LIMITS: LimitsConfig = {
  ...DEFAULT_LIMITS,
  pagination: {
    ...DEFAULT_LIMITS.pagination,
    initialLoad: 100,        // Production: 100 bookmarks first load
    pageSize: 100,          // Production: 100 bookmarks per page
    maxPages: 100           // Production: 100 pages max
  },
  search: {
    ...DEFAULT_LIMITS.search,
    defaultLimit: 2000,      // Production: 2000 default results
    maxSearchLimit: 5000     // Production: 5000 max results
  }
};

/**
 * Development limits configuration
 * More generous limits for development and testing
 */
export const DEVELOPMENT_LIMITS: LimitsConfig = {
  ...DEFAULT_LIMITS,
  search: {
    ...DEFAULT_LIMITS.search,
    defaultLimit: 5000,      // Dev: 5000 default results
    maxSearchLimit: 20000    // Dev: 20,000 max results
  },
  database: {
    ...DEFAULT_LIMITS.database,
    defaultQueryLimit: 100,     // Dev: 100 default results
    maxQueryLimit: 20000        // Dev: 20,000 max results
  }
};

/**
 * Get limits configuration - simplified version
 */
export function getLimitsConfig(): LimitsConfig {
  return DEFAULT_LIMITS;
}

/**
 * Validate limit value against configuration
 */
export function validateLimit(
  limit: number, 
  category: keyof LimitsConfig, 
  key: string
): number {
  const config = getLimitsConfig();
  const maxLimit = config[category][key as keyof typeof config[typeof category]];
  
  if (limit > maxLimit) {
    console.warn(`⚠️ Limit ${limit} exceeds maximum ${maxLimit} for ${category}.${key}`);
    return maxLimit;
  }
  
  return limit;
}

/**
 * Get limit with fallback
 */
export function getLimit(
  requestedLimit: number | undefined, 
  category: keyof LimitsConfig, 
  key: string
): number {
  const config = getLimitsConfig();
  const defaultLimit = config[category][key as keyof typeof config[typeof category]];
  
  if (requestedLimit === undefined || requestedLimit === null) {
    return defaultLimit;
  }
  
  return validateLimit(requestedLimit, category, key);
}

// Export commonly used limit getters for convenience
export const Limits = {
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

// Export the configuration getter
export { getLimitsConfig };
