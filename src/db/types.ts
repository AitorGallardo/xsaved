/**
 * XSaved Extension v2 - Data Types
 * Lean schema optimized for IndexedDB performance
 */

// Core bookmark entity - lean and fast
export interface BookmarkEntity {
  // Core identifiers
  id: string;                           // Tweet ID (primary key)
  
  // Essential content
  text: string;                         // Tweet text content
  author: string;                       // Username only (no extra metadata)
  
  // Timestamps  
  created_at: string;                   // When tweet was posted (ISO string)
  bookmark_timestamp: string;           // When user bookmarked (ISO string)
  
  // User organization
  tags: string[];                       // User-defined tags
  
  // Optional media (simple URLs only)
  media_urls?: string[];                // Direct media URLs, no variants
  
  // Search optimization (auto-generated)
  textTokens?: string[];                // For full-text search index
}

// Search index entry for performance optimization
export interface SearchIndexEntry {
  bookmarkId: string;                   // Reference to bookmark
  tokens: string[];                     // Searchable text tokens
  relevanceScore: number;               // Search relevance weight
  lastUpdated: string;                  // Index update timestamp
}

// Tag management and analytics
export interface TagEntity {
  name: string;                         // Tag name (primary key)
  usageCount: number;                   // How many bookmarks use this tag
  createdAt: string;                    // When tag was first used
  color?: string;                       // Optional: UI color
  category?: string;                    // Optional: tag grouping
}

// User collections/folders
export interface CollectionEntity {
  id: string;                           // Collection ID
  name: string;                         // Collection name
  description?: string;                 // Optional description
  bookmarkIds: string[];                // Bookmarks in this collection
  createdAt: string;                    // Creation timestamp
  updatedAt: string;                    // Last modification
}

// Extension settings
export interface SettingsEntity {
  key: string;                          // Setting key (primary key)
  value: any;                           // Setting value
  updatedAt: string;                    // Last update
}

// Database configuration
export interface DatabaseConfig {
  name: string;
  version: number;
  stores: {
    [key: string]: {
      keyPath: string;
      autoIncrement?: boolean;
      indexes: IndexConfig[];
    };
  };
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

// Query helpers
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  direction?: 'asc' | 'desc';
}

export interface SearchQuery {
  text?: string;                        // Full-text search
  tags?: string[];                      // Tag filtering
  author?: string;                      // Author filtering
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export interface SearchResult {
  bookmarks: BookmarkEntity[];
  totalCount: number;
  queryTime: number;                    // Performance monitoring
}

// Performance monitoring
export interface PerformanceMetrics {
  operation: string;
  duration: number;                     // milliseconds
  recordCount: number;
  timestamp: string;
}

// Database operation results
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metrics?: PerformanceMetrics;
}

// Bulk operations
export interface BulkOperation<T> {
  type: 'insert' | 'update' | 'delete';
  items: T[];
}

export interface BulkResult {
  success: boolean;
  processed: number;
  errors: string[];
  duration: number;
} 