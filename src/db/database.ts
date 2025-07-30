/**
 * XSaved Extension v2 - Database Manager
 * High-performance IndexedDB wrapper with transaction management
 */

import { 
  BookmarkEntity, 
  SearchIndexEntry, 
  TagEntity, 
  CollectionEntity, 
  SettingsEntity,
  DatabaseResult,
  PerformanceMetrics,
  QueryOptions
} from './types';

import { 
  DB_CONFIG, 
  STORES, 
  PERFORMANCE_CONFIG, 
  DEFAULT_SETTINGS,
  DB_ERRORS 
} from './config';

export class XSavedDatabase {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Get database instance (for advanced operations)
   */
  get database(): IDBDatabase | null {
    return this.db;
  }

  /**
   * Initialize database connection with schema setup
   */
  async initialize(): Promise<DatabaseResult<void>> {
    if (this.isInitialized) {
      return { success: true };
    }

    if (this.initPromise) {
      await this.initPromise;
      return { success: true };
    }

    this.initPromise = this._performInitialization();
    
    try {
      await this.initPromise;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown initialization error'
      };
    }
  }

  private async _performInitialization(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check IndexedDB support
      if (!window.indexedDB) {
        reject(new Error(DB_ERRORS.NOT_SUPPORTED));
        return;
      }

      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => {
        reject(new Error(DB_ERRORS.OPEN_FAILED));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitialized = true;
        
        // Setup error handling
        this.db.onerror = (error) => {
          console.error('Database error:', error);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this._createSchema(db);
      };
    });
  }

  /**
   * Create database schema with optimized indexes
   */
  private _createSchema(db: IDBDatabase): void {
    Object.entries(DB_CONFIG.stores).forEach(([storeName, storeConfig]) => {
      // Create object store
      const store = db.createObjectStore(storeName, {
        keyPath: storeConfig.keyPath,
        autoIncrement: storeConfig.autoIncrement || false
      });

      // Create indexes
      storeConfig.indexes.forEach((indexConfig) => {
        store.createIndex(indexConfig.name, indexConfig.keyPath, {
          unique: indexConfig.unique || false,
          multiEntry: indexConfig.multiEntry || false
        });
      });
    });

    console.log('✅ Database schema created with optimized indexes');
  }

  /**
   * Ensure database is initialized before operations
   */
  private async _ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      const result = await this.initialize();
      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize database');
      }
    }
  }

  /**
   * Create a database transaction with error handling
   */
  private _createTransaction(
    storeNames: string | string[], 
    mode: IDBTransactionMode = 'readonly'
  ): IDBTransaction {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(storeNames, mode);
    
    transaction.onerror = (event) => {
      console.error('Transaction error:', event);
    };

    return transaction;
  }

  /**
   * Performance monitoring wrapper
   */
  private async _withPerformanceTracking<T>(
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

      // Log slow operations
      if (duration > PERFORMANCE_CONFIG.SEARCH_TARGET_MS) {
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
   * Add a new bookmark
   */
  async addBookmark(bookmark: BookmarkEntity): Promise<DatabaseResult<BookmarkEntity>> {
    await this._ensureInitialized();

    try {
      const { result, metrics } = await this._withPerformanceTracking(
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

  private async _addBookmarkInternal(bookmark: BookmarkEntity): Promise<BookmarkEntity> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(STORES.BOOKMARKS, 'readwrite');
      const store = transaction.objectStore(STORES.BOOKMARKS);

      // Ensure required fields
      const bookmarkToAdd: BookmarkEntity = {
        ...bookmark,
        bookmark_timestamp: bookmark.bookmark_timestamp || new Date().toISOString(),
        tags: bookmark.tags || [],
        textTokens: this._tokenizeText(bookmark.text)
      };

      const request = store.add(bookmarkToAdd);

      request.onsuccess = () => {
        resolve(bookmarkToAdd);
      };

      request.onerror = () => {
        reject(new Error('Failed to add bookmark to store'));
      };
    });
  }

  /**
   * Get bookmark by ID
   */
  async getBookmark(id: string): Promise<DatabaseResult<BookmarkEntity | null>> {
    await this._ensureInitialized();

    try {
      const { result, metrics } = await this._withPerformanceTracking(
        'getBookmark',
        () => this._getBookmarkInternal(id)
      );

      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get bookmark'
      };
    }
  }

  private async _getBookmarkInternal(id: string): Promise<BookmarkEntity | null> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get bookmark'));
      };
    });
  }

  /**
   * Get recent bookmarks (most common query)
   */
  async getRecentBookmarks(options: QueryOptions = {}): Promise<DatabaseResult<BookmarkEntity[]>> {
    await this._ensureInitialized();

    try {
      const { result, metrics } = await this._withPerformanceTracking(
        'getRecentBookmarks',
        () => this._getRecentBookmarksInternal(options)
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

  private async _getRecentBookmarksInternal(options: QueryOptions): Promise<BookmarkEntity[]> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const index = store.index('bookmark_timestamp');
      
      const results: BookmarkEntity[] = [];
      const limit = options.limit || 50;
      let count = 0;

      // Use cursor for efficient pagination
      const request = index.openCursor(null, 'prev'); // Most recent first

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && count < limit) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get recent bookmarks'));
      };
    });
  }

  /**
   * Search bookmarks by tags (optimized with multi-entry index)
   */
  async getBookmarksByTag(tag: string): Promise<DatabaseResult<BookmarkEntity[]>> {
    await this._ensureInitialized();

    try {
      const { result, metrics } = await this._withPerformanceTracking(
        'getBookmarksByTag',
        () => this._getBookmarksByTagInternal(tag)
      );

      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search by tag'
      };
    }
  }

  private async _getBookmarksByTagInternal(tag: string): Promise<BookmarkEntity[]> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const index = store.index('tags');
      
      const request = index.getAll(tag); // Multi-entry index magic!

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to search by tag'));
      };
    });
  }

  /**
   * Delete bookmark by ID
   */
  async deleteBookmark(id: string): Promise<DatabaseResult<void>> {
    await this._ensureInitialized();

    try {
      const { metrics } = await this._withPerformanceTracking(
        'deleteBookmark',
        () => this._deleteBookmarkInternal(id)
      );

      return { 
        success: true,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete bookmark'
      };
    }
  }

  private async _deleteBookmarkInternal(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(STORES.BOOKMARKS, 'readwrite');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete bookmark'));
      };
    });
  }

  // ========================
  // UTILITY METHODS
  // ========================

  /**
   * Tokenize text for search indexing
   */
  private _tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s#@]/g, ' ')  // Keep hashtags and mentions
      .split(/\s+/)
      .filter(token => token.length > 2)  // Filter short tokens
      .slice(0, 50);  // Limit tokens to prevent bloat
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseResult<any>> {
    await this._ensureInitialized();

    try {
      const bookmarkCount = await this._getStoreCount(STORES.BOOKMARKS);
      const tagCount = await this._getStoreCount(STORES.TAGS);
      
      return {
        success: true,
        data: {
          bookmarks: bookmarkCount,
          tags: tagCount,
          version: DB_CONFIG.version,
          initialized: this.isInitialized
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats'
      };
    }
  }

  private async _getStoreCount(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to count ${storeName}`));
      };
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const db = new XSavedDatabase(); 