/**
 * XSaved Extension v2 - Database Configuration
 * IndexedDB schema with performance-optimized indexes
 */

import { DatabaseConfig } from './types';

export const DATABASE_NAME = 'XSavedDB';
export const DATABASE_VERSION = 4;

// Store names
export const STORES = {
  BOOKMARKS: 'bookmarks',
  SEARCH_INDEX: 'search_index',
  TAGS: 'tags', 
  COLLECTIONS: 'collections',
  SETTINGS: 'settings'
} as const;

// Database schema configuration
export const DB_CONFIG: DatabaseConfig = {
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
          multiEntry: true    // ← KEY: Each tag creates separate index entry
        },
        {
          name: 'bookmarked_at',
          keyPath: 'bookmarked_at',
          unique: false
        },
        {
          name: 'text_search',
          keyPath: 'textTokens',
          multiEntry: true    // ← KEY: Each token creates separate index entry
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
export const PERFORMANCE_CONFIG = {
  // Search performance targets
  SEARCH_TARGET_MS: 50,           // Target search time
  BATCH_SIZE: 1000,               // Bulk operation batch size
  INDEX_REBUILD_THRESHOLD: 10000, // When to rebuild search index
  
  // Memory management
  HOT_CACHE_SIZE: 100,            // Recent bookmarks in memory
  CACHE_TTL_MS: 5 * 60 * 1000,    // 5 minutes cache TTL
  
  // Database maintenance
  CLEANUP_INTERVAL_HOURS: 24,     // Cleanup old data
  VACUUM_THRESHOLD_MB: 100        // Compact database threshold
};

// Default settings
export const DEFAULT_SETTINGS = {
  // Search preferences
  search_mode: 'smart',           // 'simple' | 'smart' | 'advanced'
  results_per_page: 50,
  enable_fuzzy_search: true,
  
  // UI preferences  
  theme: 'auto',                  // 'light' | 'dark' | 'auto'
  grid_columns: 3,                // Grid layout columns
  show_media_previews: true,
  
  // Performance
  enable_background_sync: true,
  max_cache_size_mb: 50,
  enable_performance_monitoring: false
};

// Error messages
export const DB_ERRORS = {
  NOT_SUPPORTED: 'IndexedDB is not supported in this browser',
  OPEN_FAILED: 'Failed to open database',
  TRANSACTION_FAILED: 'Database transaction failed',
  STORE_NOT_FOUND: 'Object store not found',
  INDEX_NOT_FOUND: 'Index not found',
  QUOTA_EXCEEDED: 'Storage quota exceeded',
  DATA_CORRUPTION: 'Database corruption detected'
} as const;

// Migration helpers (for future schema updates)
export const MIGRATION_HELPERS = {
  // Version 1 → 2 migration (example for future use)
  v1_to_v2: async (db: IDBDatabase) => {
    // Migration logic would go here
    console.log('Migrating database from v1 to v2...');
  }
}; 