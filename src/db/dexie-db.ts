/**
 * XSaved Extension v2 - Dexie Database Layer
 * Clean, powerful IndexedDB wrapper replacing raw IndexedDB implementation
 */

import Dexie, { Table } from 'dexie';
import { 
  BookmarkEntity, 
  TagEntity, 
  CollectionEntity, 
  SettingsEntity,
  SearchIndexEntry 
} from './types';

// ========================
// DATABASE SCHEMA DESIGN
// ========================

export class XSavedDexieDB extends Dexie {
  // Tables with strong typing
  bookmarks!: Table<BookmarkEntity, string>;
  tags!: Table<TagEntity, string>;
  collections!: Table<CollectionEntity, string>;
  settings!: Table<SettingsEntity, string>;
  searchIndex!: Table<SearchIndexEntry, string>; // bookmarkId as primary key

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

    // Add hooks for automatic data processing
    this.bookmarks.hook('creating', (primKey, obj, trans) => {
      // Auto-generate textTokens if not provided
      if (!obj.textTokens) {
        obj.textTokens = this.tokenizeText(obj.text || '');
      }
      
      // Ensure required timestamps
      if (!obj.bookmarked_at) {
        obj.bookmarked_at = new Date().toISOString();
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
  // BOOKMARK OPERATIONS
  // ========================

  /**
   * Add a bookmark with automatic tag analytics
   */
  async addBookmark(bookmark: BookmarkEntity): Promise<BookmarkEntity> {
    try {
      await this.bookmarks.add(bookmark);
      console.log(`✅ Bookmark added successfully: ${bookmark.id}`);
      return bookmark;
    } catch (error) {
      console.error(`❌ Failed to add bookmark ${bookmark.id}:`, error);
      throw new Error(`Bookmark save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get bookmark by ID
   */
  async getBookmark(id: string): Promise<BookmarkEntity | null> {
    try {
      const bookmark = await this.bookmarks.get(id);
      return bookmark || null;
    } catch (error) {
      console.error(`❌ Failed to get bookmark ${id}:`, error);
      return null;
    }
  }

  /**
   * Update existing bookmark
   */
  async updateBookmark(id: string, updates: Partial<BookmarkEntity>): Promise<boolean> {
    try {
      const updated = await this.bookmarks.update(id, updates);
      if (updated) {
        console.log(`✅ Bookmark updated: ${id}`);
        return true;
      } else {
        console.warn(`⚠️ Bookmark not found for update: ${id}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to update bookmark ${id}:`, error);
      return false;
    }
  }

  /**
   * Delete bookmark by ID
   */
  async deleteBookmark(id: string): Promise<boolean> {
    try {
      await this.bookmarks.delete(id);
      console.log(`✅ Bookmark deleted: ${id}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete bookmark ${id}:`, error);
      return false;
    }
  }

  /**
   * Get all bookmarks with optional sorting
   */
  async getAllBookmarks(options: {
    sortBy?: 'created_at' | 'bookmarked_at' | 'author';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  } = {}): Promise<BookmarkEntity[]> {
    try {
      let query = this.bookmarks.orderBy(options.sortBy || 'bookmarked_at');
      
      if (options.sortOrder === 'asc') {
        // Keep ascending order
      } else {
        query = query.reverse(); // Default to descending (newest first)
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const bookmarks = await query.toArray();
      console.log(`📚 Retrieved ${bookmarks.length} bookmarks`);
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
   * Search bookmarks by text content
   */
  async searchBookmarks(query: string, options: {
    limit?: number;
    sortBy?: 'created_at' | 'bookmarked_at';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<BookmarkEntity[]> {
    if (!query.trim()) {
      return this.getAllBookmarks(options);
    }

    try {
      const tokens = this.tokenizeText(query);
      const startTime = performance.now();
      
      // Search using multi-entry textTokens index
      const results = await this.bookmarks
        .where('textTokens')
        .anyOfIgnoreCase(tokens)
        .reverse() // Newest first by default
        .limit(options.limit || 50)
        .toArray();
      
      const duration = performance.now() - startTime;
      console.log(`🔍 Search completed in ${duration.toFixed(2)}ms: ${results.length} results for "${query}"`);
      
      return results;
    } catch (error) {
      console.error('❌ Search failed:', error);
      return [];
    }
  }

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
   * Get database statistics
   */
  async getStats(): Promise<{
    bookmarks: number;
    tags: number;
    collections: number;
    dbSize?: number;
  }> {
    try {
      const [bookmarkCount, tagCount, collectionCount] = await Promise.all([
        this.bookmarks.count(),
        this.tags.count(),
        this.collections.count()
      ]);

      return {
        bookmarks: bookmarkCount,
        tags: tagCount,
        collections: collectionCount
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return { bookmarks: 0, tags: 0, collections: 0 };
    }
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await this.transaction('rw', [this.bookmarks, this.tags, this.collections, this.settings], async () => {
        await this.bookmarks.clear();
        await this.tags.clear();
        await this.collections.clear();
        await this.settings.clear();
      });
      console.log('🧹 All data cleared');
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      throw error;
    }
  }
}

// Create and export database instance
export const dexieDB = new XSavedDexieDB();

// Export types for convenience
export type { BookmarkEntity, TagEntity, CollectionEntity, SettingsEntity };