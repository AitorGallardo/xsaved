/**
 * XSaved Extension v2 - Dexie Database Compatibility Layer
 * Maintains same API as original database.ts but uses Dexie.js underneath
 * This ensures zero breaking changes during migration
 */

import { dexieDB } from './dexie-db';
import { 
  BookmarkEntity, 
  TagEntity, 
  CollectionEntity, 
  SettingsEntity,
  DatabaseResult,
  PerformanceMetrics,
  QueryOptions
} from './types';

export class XSavedDatabase {
  private isInitialized = false;

  /**
   * Initialize database connection (Dexie handles this automatically)
   */
  async initialize(): Promise<DatabaseResult<void>> {
    try {
      // Dexie auto-initializes, but we can test the connection
      await dexieDB.open();
      this.isInitialized = true;
      console.log('✅ Dexie database initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to initialize Dexie database:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database initialization failed'
      };
    }
  }

  /**
   * Get database instance (for advanced operations)
   * Returns the native IDBDatabase for direct IndexedDB operations
   */
  get database(): IDBDatabase | null {
    try {
      // Return the native IDBDatabase from Dexie
      return dexieDB.backendDB();
    } catch (error) {
      console.warn('⚠️ Could not access native IDBDatabase, database may not be open:', error);
      return null;
    }
  }

  // ========================
  // BOOKMARK OPERATIONS
  // ========================

  /**
   * Add a new bookmark
   */
  async addBookmark(bookmark: BookmarkEntity): Promise<DatabaseResult<BookmarkEntity>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.addBookmark(bookmark);
      const duration = performance.now() - startTime;

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'addBookmark',
          duration: duration,
          recordCount: 1,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Add bookmark failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add bookmark'
      };
    }
  }

  /**
   * Get bookmark by ID
   */
  async getBookmark(id: string): Promise<DatabaseResult<BookmarkEntity | null>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.getBookmark(id);
      const duration = performance.now() - startTime;

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'read',
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ Get bookmark failed for ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get bookmark'
      };
    }
  }

  /**
   * Update existing bookmark
   */
  async updateBookmark(id: string, updates: Partial<BookmarkEntity>): Promise<DatabaseResult<BookmarkEntity | null>> {
    try {
      const startTime = performance.now();
      const success = await dexieDB.updateBookmark(id, updates);
      
      if (success) {
        const updatedBookmark = await dexieDB.getBookmark(id);
        const duration = performance.now() - startTime;

        return { 
          success: true, 
          data: updatedBookmark,
          metrics: {
            operation: 'write',
            duration: duration,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return { 
          success: false, 
          error: `Bookmark with ID ${id} not found`
        };
      }
    } catch (error) {
      console.error(`❌ Update bookmark failed for ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update bookmark'
      };
    }
  }

  /**
   * Delete bookmark by ID
   */
  async deleteBookmark(id: string): Promise<DatabaseResult<boolean>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.deleteBookmark(id);
      const duration = performance.now() - startTime;

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'delete',
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ Delete bookmark failed for ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete bookmark'
      };
    }
  }

  /**
   * Get recent bookmarks (compatibility method for search engine)
   */
  async getRecentBookmarks(options: {
    limit?: number;
    sortBy?: 'created_at' | 'bookmark_timestamp';
  } = {}): Promise<DatabaseResult<BookmarkEntity[]>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.getAllBookmarks({
        sortBy: options.sortBy || 'bookmark_timestamp',
        sortOrder: 'desc',
        limit: options.limit || 50
      });
      const duration = performance.now() - startTime;

      console.log(`📅 Retrieved ${result.length} recent bookmarks in ${duration.toFixed(2)}ms`);

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'read',
          duration: duration,
          timestamp: new Date().toISOString(),
          recordCount: result.length
        }
      };
    } catch (error) {
      console.error('❌ Get recent bookmarks failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get recent bookmarks'
      };
    }
  }

  /**
   * Get bookmarks by tag (compatibility method for search engine)
   */
  async getBookmarksByTag(tag: string): Promise<DatabaseResult<BookmarkEntity[]>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.searchByTags([tag], {
        limit: 1000, // Large limit for comprehensive results
        matchAll: false
      });
      const duration = performance.now() - startTime;

      console.log(`🏷️ Retrieved ${result.length} bookmarks for tag "${tag}" in ${duration.toFixed(2)}ms`);

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'read',
          duration: duration,
          timestamp: new Date().toISOString(),
          recordCount: result.length
        }
      };
    } catch (error) {
      console.error(`❌ Get bookmarks by tag failed for "${tag}":`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get bookmarks by tag'
      };
    }
  }

  /**
   * Get all bookmarks with options
   */
  async getAllBookmarks(options: QueryOptions = {}): Promise<DatabaseResult<BookmarkEntity[]>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.getAllBookmarks({
        sortBy: options.sortBy as 'created_at' | 'bookmark_timestamp' | 'author',
        sortOrder: options.sortOrder,
        limit: options.limit
      });
      const duration = performance.now() - startTime;

      console.log(`📚 Retrieved ${result.length} bookmarks in ${duration.toFixed(2)}ms`);

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'read',
          duration: duration,
          timestamp: new Date().toISOString(),
          recordCount: result.length
        }
      };
    } catch (error) {
      console.error('❌ Get all bookmarks failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get bookmarks'
      };
    }
  }

  // ========================
  // SEARCH OPERATIONS
  // ========================

  /**
   * Search bookmarks with various criteria
   */
  async searchBookmarks(options: {
    text?: string;
    tags?: string[];
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    sortBy?: 'created_at' | 'bookmark_timestamp' | 'relevance';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<DatabaseResult<BookmarkEntity[]>> {
    try {
      const startTime = performance.now();
      let results: BookmarkEntity[] = [];

      // Handle different search types
      if (options.text) {
        results = await dexieDB.searchBookmarks(options.text, {
          limit: options.limit,
          sortBy: options.sortBy as any,
          sortOrder: options.sortOrder
        });
      } else if (options.tags && options.tags.length > 0) {
        results = await dexieDB.searchByTags(options.tags, {
          limit: options.limit,
          matchAll: false // OR operation by default
        });
      } else if (options.author) {
        results = await dexieDB.searchByAuthor(options.author, {
          limit: options.limit
        });
      } else {
        // No specific search criteria, get all bookmarks
        results = await dexieDB.getAllBookmarks({
          sortBy: options.sortBy === 'relevance' ? 'created_at' : options.sortBy,
          sortOrder: options.sortOrder,
          limit: options.limit
        });
      }

      // Apply date filtering if specified
      if (options.dateFrom || options.dateTo) {
        results = results.filter(bookmark => {
          const bookmarkDate = new Date(bookmark.created_at);
          const fromDate = options.dateFrom ? new Date(options.dateFrom) : null;
          const toDate = options.dateTo ? new Date(options.dateTo) : null;

          if (fromDate && bookmarkDate < fromDate) return false;
          if (toDate && bookmarkDate > toDate) return false;
          return true;
        });
      }

      const duration = performance.now() - startTime;
      console.log(`🔍 Search completed in ${duration.toFixed(2)}ms: ${results.length} results`);

      return { 
        success: true, 
        data: results,
        metrics: {
          operation: 'search',
          duration: duration,
          timestamp: new Date().toISOString(),
          recordCount: results.length
        }
      };
    } catch (error) {
      console.error('❌ Search bookmarks failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  // ========================
  // TAG OPERATIONS
  // ========================

  /**
   * Get all tags
   */
  async getAllTags(): Promise<DatabaseResult<TagEntity[]>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.getAllTags();
      const duration = performance.now() - startTime;

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'read',
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Get all tags failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get tags'
      };
    }
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<DatabaseResult<TagEntity[]>> {
    try {
      const startTime = performance.now();
      const result = await dexieDB.getPopularTags(limit);
      const duration = performance.now() - startTime;

      return { 
        success: true, 
        data: result,
        metrics: {
          operation: 'read',
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Get popular tags failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get popular tags'
      };
    }
  }

  /**
   * Search tags by name
   */
  async searchTags(query: string): Promise<DatabaseResult<TagEntity[]>> {
    try {
      const startTime = performance.now();
      const allTags = await dexieDB.getAllTags();
      
      // Simple text search on tag names
      const filteredTags = allTags.filter(tag => 
        tag.name.toLowerCase().includes(query.toLowerCase())
      );
      
      const duration = performance.now() - startTime;

      return { 
        success: true, 
        data: filteredTags,
        metrics: {
          operation: 'search',
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Search tags failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search tags'
      };
    }
  }

  // ========================
  // UTILITY OPERATIONS
  // ========================

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseResult<{
    totalBookmarks: number;
    totalTags: number;
    totalCollections: number;
    dbSize?: number;
  }>> {
    try {
      const startTime = performance.now();
      const stats = await dexieDB.getStats();
      const duration = performance.now() - startTime;

      return { 
        success: true, 
        data: {
          totalBookmarks: stats.bookmarks,
          totalTags: stats.tags,
          totalCollections: stats.collections,
          dbSize: stats.dbSize
        },
        metrics: {
          operation: 'read',
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Get database stats failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get database stats'
      };
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clearAllData(): Promise<DatabaseResult<void>> {
    try {
      const startTime = performance.now();
      await dexieDB.clearAllData();
      const duration = performance.now() - startTime;

      return { 
        success: true,
        metrics: {
          operation: 'delete',
          duration: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Clear all data failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear data'
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      await dexieDB.close();
      this.isInitialized = false;
      console.log('✅ Database closed successfully');
    } catch (error) {
      console.error('❌ Failed to close database:', error);
    }
  }
}

// Create singleton instance
export const db = new XSavedDatabase();