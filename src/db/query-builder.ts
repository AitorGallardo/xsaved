/**
 * XSaved Extension v2 - Native Dexie Query Builder
 * Uses proper Dexie native methods for optimal performance
 * 
 * Based on Dexie.js API Reference: https://dexie.org/docs/API-Reference
 */

import { Table, Collection } from 'dexie';
import { BookmarkEntity } from './types';
import { Limits } from '../config/limits';

// ========================
// NATIVE DEXIE QUERY BUILDER
// ========================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'author' | 'bookmarked_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Native Dexie Query Builder
 * Uses proper Dexie methods: .where(), .filter(), .and(), .or()
 */
export class NativeDexieQueryBuilder {
  private table: Table<BookmarkEntity, string>;
  private query: Collection<BookmarkEntity, string> | null = null;
  private queryOptions: QueryOptions = {};

  constructor(table: Table<BookmarkEntity, string>) {
    this.table = table;
  }

  /**
   * Text search using multi-entry textTokens index
   * Uses Dexie's native .where().anyOfIgnoreCase()
   */
  text(searchText: string): this {
    if (!searchText?.trim()) return this;
    
    const tokens = this.tokenizeText(searchText);
    if (tokens.length === 0) return this;
    
    // Native Dexie: Use multi-entry index
    if (this.query) {
      this.query = this.query.and(bookmark => 
        tokens.some(token => bookmark.textTokens?.includes(token))
      );
    } else {
      this.query = this.table.where('textTokens').anyOfIgnoreCase(tokens);
    }
    return this;
  }

  /**
   * Author filter using native Dexie .equalsIgnoreCase()
   */
  author(authorName: string): this {
    if (!authorName?.trim()) return this;
    
    if (this.query) {
      this.query = this.query.and(bookmark => 
        bookmark.author.toLowerCase() === authorName.toLowerCase()
      );
    } else {
      this.query = this.table.where('author').equalsIgnoreCase(authorName);
    }
    return this;
  }

  /**
   * Combined text and author search using native Dexie capabilities
   * Searches through both tweet text content AND author name
   * Uses both textTokens (for performance) and full text field (for comprehensive matching)
   */
  searchTextAndAuthor(searchTerm: string): this {
    if (!searchTerm?.trim()) return this;
    
    const tokens = this.tokenizeText(searchTerm);
    const searchTermLower = searchTerm.toLowerCase();
    
    if (this.query) {
      // Collection: Use .and() with enhanced combined filter
      this.query = this.query.and(bookmark => {
        // Check if search term matches text content OR author
        const authorMatch = bookmark.author.toLowerCase().includes(searchTermLower);
        
        // Enhanced text matching: try both textTokens and full text field
        let textMatch = false;
        // >>IMPORTANT: This is disabled because it's not working as expected
        // >>IMPORTANT: WE CHECKED AND IT LOOKS LIKE LOOKING DIRECTLY TO TEXT WORKS JUST FINE. SO EXT TOKEN MATCHING IS NOT NEEDED RIGHT NOW.
        // It's causing the query to return no results
        // if (bookmark.textTokens?.length > 0) {
        //   // Fast path: check textTokens for exact matches
        //   textMatch = tokens.some(token => bookmark.textTokens?.includes(token));
        // }
        
        if (!textMatch && bookmark.text) {
          // Fallback: check full text field for substring matches
          textMatch = bookmark.text.toLowerCase().includes(searchTermLower);
        }
        
        return textMatch || authorMatch;
      });
    } else {
      // Table: Use .filter() for enhanced combined search
      this.query = this.table.filter(bookmark => {
        // Check if search term matches text content OR author
        const authorMatch = bookmark.author.toLowerCase().includes(searchTermLower);
        
        // Enhanced text matching: try both textTokens and full text field
        let textMatch = false;
        if (bookmark.textTokens?.length > 0) {
          // Fast path: check textTokens for exact matches
          textMatch = tokens.some(token => bookmark.textTokens?.includes(token));
        }
        
        if (!textMatch && bookmark.text) {
          // Fallback: check full text field for substring matches
          textMatch = bookmark.text.toLowerCase().includes(searchTermLower);
        }
        
        return textMatch || authorMatch;
      });
    }
    return this;
  }

  /**
   * Tags filter using native Dexie .anyOf()
   */
  tags(tagList: string[]): this {
    if (!tagList || tagList.length === 0) return this;
    
    if (this.query) {
      this.query = this.query.and(bookmark => 
        tagList.some(tag => bookmark.tags?.includes(tag))
      );
    } else {
      this.query = this.table.where('tags').anyOf(tagList);
    }
    return this;
  }

  /**
   * Date range using native Dexie .between()
   */
  dateRange(start: string, end: string): this {
    if (!start || !end) return this;
    
    if (this.query) {
      this.query = this.query.and(bookmark => {
        const date = new Date(bookmark.bookmarked_at);
        return date >= new Date(start) && date <= new Date(end);
      });
    } else {
      this.query = this.table.where('bookmarked_at').between(start, end, true, true);
    }
    return this;
  }

  /**
   * Media presence filter using native Dexie .filter()
   */
  hasMedia(hasMedia: boolean): this {
    if (this.query) {
      this.query = this.query.and(bookmark => 
        hasMedia ? 
          (bookmark.media_urls && bookmark.media_urls.length > 0) :
          (!bookmark.media_urls || bookmark.media_urls.length === 0)
      );
    } else {
      this.query = this.table.filter(bookmark => 
        hasMedia ? 
          (bookmark.media_urls && bookmark.media_urls.length > 0) :
          (!bookmark.media_urls || bookmark.media_urls.length === 0)
      );
    }
    return this;
  }

  /**
   * Exclude tags using native Dexie .filter()
   */
  excludeTags(excludeList: string[]): this {
    if (!excludeList || excludeList.length === 0) return this;
    
    if (this.query) {
      this.query = this.query.and(bookmark => 
        !excludeList.some(excludeTag => bookmark.tags?.includes(excludeTag))
      );
    } else {
      this.query = this.table.filter(bookmark => 
        !excludeList.some(excludeTag => bookmark.tags?.includes(excludeTag))
      );
    }
    return this;
  }

  /**
   * Set query options
   */
  setOptions(opts: QueryOptions): this {
    this.queryOptions = { ...this.queryOptions, ...opts };
    return this;
  }

  /**
   * Set limit using native Dexie .limit()
   */
  limit(count: number): this {
    this.queryOptions.limit = count;
    return this;
  }

  /**
   * Set offset using native Dexie .offset()
   */
  offset(count: number): this {
    this.queryOptions.offset = count;
    return this;
  }

  /**
   * Set sorting using native Dexie .orderBy() and .reverse()
   */
  sortBy(field: 'created_at' | 'author' | 'bookmarked_at', order: 'asc' | 'desc' = 'desc'): this {
    this.queryOptions.sortBy = field;
    this.queryOptions.sortOrder = order;
    return this;
  }

  /**
   * Execute the query using native Dexie methods
   */
  async execute(): Promise<BookmarkEntity[]> {
    try {
      let query = this.query || this.table;

      // Apply sorting using native Dexie methods
      if (this.queryOptions.sortBy) {
        if (this.query) {
          console.log('🐈 SORTING~SORTING~SORTING for Collection');
          // For Collections: reverse() BEFORE sortBy() as per Dexie docs
          // sortBy() returns a Promise, so we need to handle it differently
          if (this.queryOptions.sortOrder === 'desc') {
            query = (query as any).reverse();
          }
          // sortBy() returns Promise<BookmarkEntity[]>, not a Collection
          const results = await (query as any).sortBy(this.queryOptions.sortBy);
          return this.applyPagination(results);
        } else {
          console.log('🐕 ORDER~ORDER~ORDER for Table');
          // For Tables: orderBy() then reverse() after
          query = (query as any).orderBy(this.queryOptions.sortBy);
          if (this.queryOptions.sortOrder === 'desc') {
            query = (query as any).reverse();
          }
        }
      } else {
        // Default: newest first
        if (this.query) {
          // Collection - reverse() BEFORE sortBy()
          // sortBy() returns Promise<BookmarkEntity[]>, not a Collection
          const results = await (query as any).reverse().sortBy('created_at');
          return this.applyPagination(results);
        } else {
          // Table - orderBy() then reverse()
          query = (query as any).orderBy('created_at').reverse();
        }
      }

      // Apply pagination using native Dexie .offset() and .limit() (for Tables only)
      if (this.queryOptions.offset) {
        query = query.offset(this.queryOptions.offset);
      }

      if (this.queryOptions.limit) {
        query = query.limit(this.queryOptions.limit);
      }

      // Execute using native Dexie .toArray()
      const results = await query.toArray();
      
      console.log(`🔍 Native Dexie query executed: ${results.length} results`);
      return results;

    } catch (error) {
      console.error('❌ Native Dexie query failed:', error);
      return [];
    }
  }

  /**
   * Apply pagination to results (for Collections that use sortBy)
   */
  private applyPagination(results: BookmarkEntity[]): BookmarkEntity[] {
    let paginatedResults = results;

    // Apply offset
    if (this.queryOptions.offset) {
      paginatedResults = paginatedResults.slice(this.queryOptions.offset);
    }

    // Apply limit
    if (this.queryOptions.limit) {
      paginatedResults = paginatedResults.slice(0, this.queryOptions.limit);
    }

    return paginatedResults;
  }

  /**
   * Enhanced tokenize text for search
   * More inclusive tokenization to capture more matches
   */
  private tokenizeText(text: string): string[] {
    if (!text) return [];
    
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s#@-]/g, ' ') // Keep hyphens and @ symbols
      .split(/\s+/)
      .filter(token => token.length > 1) // Reduced from 2 to 1 for more matches
      .slice(0, 20); // Increased from 10 to 20 tokens
    
    // Add partial matches for longer terms (e.g., "javascript" -> "java", "script")
    const partialTokens = new Set<string>();
    tokens.forEach(token => {
      if (token.length > 4) {
        // Add 3+ character prefixes
        for (let i = 3; i < token.length; i++) {
          partialTokens.add(token.substring(0, i));
        }
      }
    });
    
    // Combine original tokens with partial matches
    return [...new Set([...tokens, ...Array.from(partialTokens)])].slice(0, 30);
  }
}

// ========================
// CONVENIENCE FACTORY
// ========================

/**
 * Create a native Dexie query builder
 */
export function createBookmarkQuery(table: Table<BookmarkEntity, string>): NativeDexieQueryBuilder {
  return new NativeDexieQueryBuilder(table);
}

// ========================
// COMMON QUERY PATTERNS
// ========================

/**
 * Recent bookmarks using native Dexie
 */
export async function getRecentBookmarks(
  table: Table<BookmarkEntity, string>,
  limit: number = Limits.defaultQueryLimit,
  offset: number = 0
): Promise<BookmarkEntity[]> {
  return createBookmarkQuery(table)
    .sortBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();
}

/**
 * Search by text and tags using native Dexie
 */
export async function searchBookmarksByTextAndTags(
  table: Table<BookmarkEntity, string>,
  searchText: string,
  tags: string[],
  options: QueryOptions = {}
): Promise<BookmarkEntity[]> {
  return createBookmarkQuery(table)
    .text(searchText)
    .tags(tags)
    .setOptions(options)
    .execute();
}

/**
 * Author's bookmarks with date range using native Dexie
 */
export async function getAuthorBookmarksInDateRange(
  table: Table<BookmarkEntity, string>,
  author: string,
  startDate: string,
  endDate: string,
  options: QueryOptions = {}
): Promise<BookmarkEntity[]> {
  return createBookmarkQuery(table)
    .author(author)
    .dateRange(startDate, endDate)
    .setOptions(options)
    .execute();
}
