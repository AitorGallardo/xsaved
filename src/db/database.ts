/**
 * XSaved Extension v2 - Consolidated Database Layer
 * Single Dexie implementation with consistent API
 * Replaces: database.ts (877 lines) + database-dexie.ts (534 lines) 
 */

import Dexie, { Table } from 'dexie';
import { 
  BookmarkEntity, 
  TagEntity, 
  CollectionEntity, 
  SettingsEntity,
  SearchIndexEntry,
  DatabaseResult,
  PerformanceMetrics,
  QueryOptions
} from './types';
import { normalizeDateToISO } from '../utils/sortIndex-utils';

// ========================
// DATABASE SCHEMA DESIGN
// ========================

export class XSavedDatabase extends Dexie {
  // Tables with strong typing
  bookmarks!: Table<BookmarkEntity, string>;
  tags!: Table<TagEntity, string>;
  collections!: Table<CollectionEntity, string>;
  settings!: Table<SettingsEntity, string>;
  searchIndex!: Table<SearchIndexEntry, string>; // bookmarkId as primary key
  
  private isInitialized = false;

  constructor() {
    super('XSavedDB');
    
    // Define schema with indexes
    this.version(1).stores({
      // Bookmarks: Primary storage with multi-entry indexes for fast queries
      bookmarks: `
        id,
        author,
        created_at,
        bookmarked_at,
        *tags,
        *textTokens
      `,
      
      // Tags: Separate analytics table for tag management
      tags: `
        name,
        usageCount,
        createdAt,
        category
      `,
      
      // Collections: User-defined bookmark groupings
      collections: `
        id,
        name,
        createdAt,
        *bookmarkIds
      `,
      
      // Settings: App configuration
      settings: `
        key,
        value,
        updatedAt
      `,
      
      // Search Index: Full-text search optimization
      searchIndex: `
        bookmarkId,
        *tokens,
        relevanceScore,
        lastUpdated
      `
    });

    // Version 2: Add avatar_url field to bookmarks
    // Note: Dexie automatically handles schema changes by preserving existing data
    this.version(2).stores({
      // Bookmarks: Updated schema with avatar_url field
      bookmarks: `
        id,
        author,
        avatar_url,
        created_at,
        bookmarked_at,
        *tags,
        *textTokens
      `,
      
      // Keep other stores unchanged
      tags: `
        name,
        usageCount,
        createdAt,
        category
      `,
      
      collections: `
        id,
        name,
        createdAt,
        *bookmarkIds
      `,
      
      settings: `
        key,
        value,
        updatedAt
      `,
      
      searchIndex: `
        bookmarkId,
        *tokens,
        relevanceScore,
        lastUpdated
      `
    });

    // Add hooks for automatic data processing
    this.bookmarks.hook('creating', (primKey, obj, trans) => {
      // Auto-generate textTokens if not provided
      if (!obj.textTokens) {
        obj.textTokens = this.tokenizeText(obj.text || '');
      }
      
      // Ensure both timestamps are valid ISO strings
      const now = new Date().toISOString();
      
      if (!obj.created_at || !this.isValidDate(obj.created_at)) {
        obj.created_at = now;
        console.warn(`⚠️ Invalid created_at for ${obj.id}, using current time`);
      } else if (!obj.created_at.includes('T')) {
        // Convert Twitter format to ISO format
        obj.created_at = new Date(obj.created_at).toISOString();
      }
      
      if (!obj.bookmarked_at || !this.isValidDate(obj.bookmarked_at)) {
        obj.bookmarked_at = obj.created_at || now;
        console.warn(`⚠️ Invalid bookmarked_at for ${obj.id}, using created_at`);
      } else if (!obj.bookmarked_at.includes('T')) {
        // Convert Twitter format to ISO format
        obj.bookmarked_at = new Date(obj.bookmarked_at).toISOString();
      }
      
      console.log(`🔄 Creating bookmark: ${obj.id}`);
    });

    this.bookmarks.hook('updating', (modifications, primKey, obj, trans) => {
      console.log(`🔄 Updating bookmark: ${primKey}`, modifications);
    });

    this.bookmarks.hook('deleting', (primKey, obj, trans) => {
      console.log(`🗑️ Deleting bookmark: ${primKey}`);
    });
  }

  // ========================
  // INITIALIZATION & UTILITIES
  // ========================

  /**
   * Initialize database connection
   */
  async initialize(): Promise<DatabaseResult<void>> {
    try {
      await this.open();
      this.isInitialized = true;
      console.log('✅ Consolidated Dexie database initialized');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database initialization failed'
      };
    }
  }

  /**
   * Get database instance (for compatibility)
   */
  get database(): IDBDatabase | null {
    try {
      return this.backendDB();
    } catch (error) {
      return null;
    }
  }

  /**
   * Performance tracking wrapper
   */
  private async withPerformanceTracking<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      const metrics: PerformanceMetrics = {
        operation,
        duration,
        recordCount: Array.isArray(result) ? result.length : 1,
        timestamp: new Date().toISOString()
      };

      if (duration > 50) { // Log slow operations
        console.warn(`⚠️ Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
      }

      return { result, metrics };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Operation failed: ${operation} (${duration.toFixed(2)}ms)`, error);
      throw error;
    }
  }

  // ========================
  // BOOKMARK OPERATIONS
  // ========================

  /**
   * Add a bookmark with consistent API
   */
  async addBookmark(bookmark: BookmarkEntity): Promise<DatabaseResult<BookmarkEntity>> {
    try {
      const { result, metrics } = await this.withPerformanceTracking(
        'addBookmark',
        () => this._addBookmarkInternal(bookmark)
      );
      
      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add bookmark'
      };
    }
  }

  /**
   * Internal bookmark addition
   */
  private async _addBookmarkInternal(bookmark: BookmarkEntity): Promise<BookmarkEntity> {
    await this.bookmarks.add(bookmark);
    console.log(`✅ Bookmark added successfully: ${bookmark.id}`);
    return bookmark;
  }

  /**
   * Get bookmark by ID
   */
  async getBookmark(id: string): Promise<DatabaseResult<BookmarkEntity | null>> {
    try {
      const { result, metrics } = await this.withPerformanceTracking(
        'getBookmark',
        () => this.bookmarks.get(id)
      );
      
      return { 
        success: true, 
        data: result || null,
        metrics 
      };
    } catch (error) {
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
      const { result, metrics } = await this.withPerformanceTracking(
        'updateBookmark',
        async () => {
          const updated = await this.bookmarks.update(id, updates);
          if (updated) {
            const updatedBookmark = await this.bookmarks.get(id);
            console.log(`✅ Bookmark updated: ${id}`);
            return updatedBookmark || null;
          } else {
            console.warn(`⚠️ Bookmark not found for update: ${id}`);
            return null;
          }
        }
      );
      
      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
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
      const { result, metrics } = await this.withPerformanceTracking(
        'deleteBookmark',
        async () => {
          await this.bookmarks.delete(id);
          console.log(`✅ Bookmark deleted: ${id}`);
          return true;
        }
      );
      
      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete bookmark'
      };
    }
  }

  /**
   * Get all bookmarks with optional sorting and pagination
   * ENHANCED: Now supports offset for pagination
   */
  async getAllBookmarks(options: {
    sortBy?: 'created_at' | 'author';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;  // NEW: Pagination support
  } = {}): Promise<BookmarkEntity[]> {
    try {
      // OPTION A: Ultra-simple Dexie pagination (works because dates are normalized when saving)
      let query = this.bookmarks.orderBy(options.sortBy || 'created_at');
      
      // Apply sort order
      if (options.sortOrder === 'asc') {
        // Keep ascending order
      } else {
        query = query.reverse(); // Default to descending (newest first)
      }
      
      // Apply pagination (Dexie handles this efficiently)
      if (options.offset) {
        query = query.offset(options.offset);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const bookmarks = await query.toArray();
      
      // Clean: No console logging
      
      return bookmarks;
    } catch (error) {
      console.error('❌ Failed to get all bookmarks:', error);
      return [];
    }
  }

  // ========================
  // SEARCH OPERATIONS
  // ========================

  /**
   * Search bookmarks by tags
   */
  async searchByTags(tags: string[], options: {
    limit?: number;
    matchAll?: boolean; // true = AND, false = OR
  } = {}): Promise<BookmarkEntity[]> {
    try {
      let query;
      
      if (options.matchAll) {
        // AND operation: bookmark must have ALL tags
        query = this.bookmarks.where('tags').anyOf(tags);
        const results = await query.toArray();
        
        // Filter to only bookmarks that have ALL required tags
        return results.filter(bookmark => 
          tags.every(tag => bookmark.tags?.includes(tag))
        ).slice(0, options.limit || 50);
      } else {
        // OR operation: bookmark must have ANY of the tags
        query = this.bookmarks
          .where('tags')
          .anyOf(tags)
          .reverse()
          .limit(options.limit || 50);
        
        return await query.toArray();
      }
    } catch (error) {
      console.error('❌ Tag search failed:', error);
      return [];
    }
  }

  /**
   * Search bookmarks by author
   */
  async searchByAuthor(author: string, options: {
    limit?: number;
  } = {}): Promise<BookmarkEntity[]> {
    try {
      const results = await this.bookmarks
        .where('author')
        .equalsIgnoreCase(author)
        .reverse()
        .limit(options.limit || 50)
        .toArray();
      
      console.log(`👤 Found ${results.length} bookmarks by @${author}`);
      return results;
    } catch (error) {
      console.error(`❌ Author search failed for @${author}:`, error);
      return [];
    }
  }

  // ========================
  // TAG OPERATIONS
  // ========================

  /**
   * Get all tags with usage analytics
   */
  async getAllTags(): Promise<TagEntity[]> {
    try {
      return await this.tags.orderBy('usageCount').reverse().toArray();
    } catch (error) {
      console.error('❌ Failed to get tags:', error);
      return [];
    }
  }

  /**
   * Get popular tags (by usage count)
   */
  async getPopularTags(limit: number = 20): Promise<TagEntity[]> {
    try {
      return await this.tags
        .orderBy('usageCount')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Failed to get popular tags:', error);
      return [];
    }
  }

  /**
   * Search tags by name
   */
  async searchTags(query: string, limit: number = 10): Promise<TagEntity[]> {
    try {
      if (!query.trim()) return [];
      
      return await this.tags
        .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Failed to search tags:', error);
      return [];
    }
  }

  /**
   * Update tag analytics when bookmarks change
   */
  private async updateTagAnalytics(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;

    try {
      const timestamp = new Date().toISOString();
      
      await this.transaction('rw', this.tags, async () => {
        for (const tagName of tags) {
          if (!tagName.trim()) continue;
          
          const existingTag = await this.tags.get(tagName);
          
          if (existingTag) {
            await this.tags.update(tagName, {
              usageCount: (existingTag.usageCount || 0) + 1
            });
          } else {
            await this.tags.add({
              name: tagName,
              usageCount: 1,
              createdAt: timestamp
            });
          }
        }
      });
      
      console.log(`📊 Updated analytics for ${tags.length} tags`);
    } catch (error) {
      console.error('❌ Failed to update tag analytics:', error);
    }
  }

  // ========================
  // UTILITY METHODS
  // ========================

  /**
   * Tokenize text for search indexing
   */
  private tokenizeText(text: string): string[] {
    if (!text) return [];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s#@]/g, ' ') // Keep hashtags and mentions
      .split(/\s+/)
      .filter(token => token.length > 2) // Only tokens longer than 2 chars
      .slice(0, 50); // Limit tokens per bookmark
  }

  /**
   * Get recent bookmarks (compatibility method for search engine)
   */
  async getRecentBookmarks(options: {
    limit?: number;
    sortBy?: 'created_at';
    offset?: number;  // CRITICAL FIX: Add offset support for pagination
  } = {}): Promise<DatabaseResult<BookmarkEntity[]>> {
    try {
      const { result, metrics } = await this.withPerformanceTracking(
        'getRecentBookmarks',
        () => this.getAllBookmarks({
          sortBy: options.sortBy || 'created_at',
          sortOrder: 'desc',
          limit: options.limit || 50,
          offset: options.offset  // CRITICAL FIX: Pass offset to getAllBookmarks
        })
      );
      
      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
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
      const { result, metrics } = await this.withPerformanceTracking(
        'getBookmarksByTag',
        () => this.searchByTags([tag], { limit: 1000, matchAll: false })
      );
      
      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get bookmarks by tag'
      };
    }
  }

  /**
   * Search bookmarks with various criteria (compatible with service worker)
   * ENHANCED: Now supports pagination with offset
   */
  async searchBookmarks(options: {
    text?: string;
    tags?: string[];
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;  // NEW: Pagination support
    sortBy?: 'created_at' | 'relevance';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<DatabaseResult<BookmarkEntity[]>> {
    try {
      const { result, metrics } = await this.withPerformanceTracking(
        'searchBookmarks',
        async () => {
          let results: BookmarkEntity[] = [];

          // Handle different search types
          if (options.text) {
            results = await this._searchBookmarksByText(options.text, {
              limit: options.limit,
              offset: options.offset,  // NEW: Pass offset for pagination
              sortBy: options.sortBy as any,
              sortOrder: options.sortOrder
            });
          } else if (options.tags && options.tags.length > 0) {
            results = await this.searchByTags(options.tags, {
              limit: options.limit,
              matchAll: false
            });
          } else if (options.author) {
            results = await this.searchByAuthor(options.author, {
              limit: options.limit
            });
          } else {
            results = await this.getAllBookmarks({
              sortBy: options.sortBy === 'relevance' ? 'created_at' : options.sortBy,
              sortOrder: options.sortOrder,
              limit: options.limit,
              offset: options.offset  // NEW: Pass offset for pagination
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

          return results;
        }
      );
      
      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Internal text search method
   * ENHANCED: Now supports offset for pagination
   */
  private async _searchBookmarksByText(query: string, options: {
    limit?: number;
    offset?: number;  // NEW: Pagination support
    sortBy?: 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<BookmarkEntity[]> {
    if (!query.trim()) {
      return this.getAllBookmarks(options);
    }

    const tokens = this.tokenizeText(query);
    
    // Search using multi-entry textTokens index with pagination
    let query_builder = this.bookmarks
      .where('textTokens')
      .anyOfIgnoreCase(tokens);
    
    // Apply sorting
    if (options.sortOrder === 'asc') {
      // Keep natural order
    } else {
      query_builder = query_builder.reverse(); // Default to newest first
    }
    
    // Apply pagination
    if (options.offset) {
      query_builder = query_builder.offset(options.offset);
    }
    
    if (options.limit) {
      query_builder = query_builder.limit(options.limit);
    }
    
    const results = await query_builder.toArray();
    
    // Apply pagination to search results
    const result = results.slice(options.offset || 0, (options.offset || 0) + (options.limit || 10000));
    
    console.log(`🔍 Text search "${query}" returned ${result.length} bookmarks`);
    return result;
  }

  // REMOVED: Unnecessary date normalization - dates are already consistent

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
      const { result, metrics } = await this.withPerformanceTracking(
        'getStats',
        async () => {
          const [bookmarkCount, tagCount, collectionCount] = await Promise.all([
            this.bookmarks.count(),
            this.tags.count(),
            this.collections.count()
          ]);

          return {
            totalBookmarks: bookmarkCount,
            totalTags: tagCount,
            totalCollections: collectionCount
          };
        }
      );
      
      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get database stats'
      };
    }
  }

  /**
   * Validate date string (accepts both ISO and Twitter formats)
   */
  private isValidDate(dateString: string): boolean {
    if (!dateString || typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getTime() > 0;
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAllData(): Promise<DatabaseResult<void>> {
    try {
      const { metrics } = await this.withPerformanceTracking(
        'clearAllData',
        async () => {
          await this.transaction('rw', [this.bookmarks, this.tags, this.collections, this.settings], async () => {
            await this.bookmarks.clear();
            await this.tags.clear();
            await this.collections.clear();
            await this.settings.clear();
          });
          console.log('🧹 All data cleared');
        }
      );
      
      return { 
        success: true,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear data'
      };
    }
  }

  /**
   * Clear all bookmarks only (keep other data)
   */
  async clearAllBookmarks(): Promise<DatabaseResult<void>> {
    try {
      const { metrics } = await this.withPerformanceTracking(
        'clearAllBookmarks',
        async () => {
          await this.bookmarks.clear();
          console.log('🧹 All bookmarks cleared');
        }
      );
      
      return { 
        success: true,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear bookmarks'
      };
    }
  }

  /**
   * Verify database functionality (for debugging)
   */
  async verifyDatabase(): Promise<void> {
    console.log('🧪 Testing database functionality...');
    
    // Test bookmark creation
    const testBookmark = {
      id: 'test_' + Date.now(),
      text: 'Test bookmark for verification',
      author: 'test_user',
      created_at: new Date().toISOString(),
      bookmarked_at: new Date().toISOString(),
      tags: ['test'],
      media_urls: [],
      textTokens: ['test', 'bookmark', 'verification']
    };

    try {
      // Add test bookmark
      const addResult = await this.addBookmark(testBookmark);
      if (addResult.success) {
        console.log('✅ Test bookmark added successfully');
      } else {
        console.error('❌ Failed to add test bookmark:', addResult.error);
        return;
      }

      // Retrieve test bookmark
      const getResult = await this.getBookmark(testBookmark.id);
      if (getResult.success && getResult.data) {
        console.log('✅ Test bookmark retrieved successfully');
        
        // Clean up test bookmark
        await this.bookmarks.delete(testBookmark.id);
        console.log('✅ Test bookmark cleaned up');
        console.log('🎉 Database verification completed successfully!');
      } else {
        console.error('❌ Failed to retrieve test bookmark');
      }
    } catch (error) {
      console.error('❌ Database verification failed:', error);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      await super.close();
      this.isInitialized = false;
      console.log('✅ Database closed successfully');
    } catch (error) {
      console.error('❌ Failed to close database:', error);
    }
  }
}

// Create and export database instance
export const db = new XSavedDatabase();

// Export types for convenience
export type { BookmarkEntity, TagEntity, CollectionEntity, SettingsEntity };