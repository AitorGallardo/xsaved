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
      // Check IndexedDB support (compatible with both browser and service worker)
      if (!self.indexedDB && !globalThis.indexedDB) {
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
        
        console.log('✅ IndexedDB opened successfully');
        console.log('📊 Database info:', {
          name: this.db.name,
          version: this.db.version,
          objectStoreNames: Array.from(this.db.objectStoreNames)
        });
        
        // Detailed store verification
        console.log('🔍 Verifying object stores:');
        Array.from(this.db.objectStoreNames).forEach(storeName => {
          console.log(`   ✅ Store "${storeName}" exists`);
        });
        
        // Check if stores exist
        if (!this.db.objectStoreNames.contains(STORES.BOOKMARKS)) {
          console.warn('⚠️ Bookmarks store missing! Database may need to be recreated.');
        }
        
        // Setup error handling
        this.db.onerror = (error) => {
          console.error('Database error:', error);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('📦 Setting up database schema...');
        const db = (event.target as IDBOpenDBRequest).result;
        this._createSchema(db);
        console.log('✅ Database schema created successfully');
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
      console.error('❌ Transaction error:', event);
      console.error('❌ Transaction details:', {
        mode,
        storeNames,
        error: transaction.error,
        db: this.db?.name,
        dbVersion: this.db?.version,
        objectStoreNames: this.db ? Array.from(this.db.objectStoreNames) : 'N/A'
      });
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

      request.onerror = (event) => {
        console.error('❌ IndexedDB add request error:', event);
        console.error('❌ Request error details:', {
          error: request.error,
          transaction: transaction.error,
          objectStore: store.name,
          bookmark: bookmarkToAdd
        });
        reject(new Error(`Failed to add bookmark to store: ${request.error?.message || 'Unknown error'}`));
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
   * Get all bookmarks with optional filtering and sorting
   */
  async getAllBookmarks(options: {
    limit?: number;
    sortBy?: 'created_at' | 'bookmark_timestamp';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<DatabaseResult<BookmarkEntity[]>> {
    await this._ensureInitialized();

    try {
      const { result, metrics } = await this._withPerformanceTracking(
        'getAllBookmarks',
        () => this._getAllBookmarksInternal(options)
      );

      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get all bookmarks'
      };
    }
  }

  private async _getAllBookmarksInternal(options: {
    limit?: number;
    sortBy?: 'created_at' | 'bookmark_timestamp';
    sortOrder?: 'asc' | 'desc';
  }): Promise<BookmarkEntity[]> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(STORES.BOOKMARKS, 'readonly');
      const store = transaction.objectStore(STORES.BOOKMARKS);
      
      const sortBy = options.sortBy || 'created_at';
      const direction = options.sortOrder === 'asc' ? 'next' : 'prev';
      
      let request: IDBRequest;
      if (store.indexNames.contains(sortBy)) {
        const index = store.index(sortBy);
        request = index.openCursor(null, direction);
      } else {
        request = store.openCursor(null, direction);
      }

      const results: BookmarkEntity[] = [];
      const limit = options.limit || 1000;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get all bookmarks'));
      };
    });
  }

  /**
   * Clear all bookmarks from database
   */
  async clearAllBookmarks(): Promise<DatabaseResult<void>> {
    await this._ensureInitialized();

    try {
      const { result, metrics } = await this._withPerformanceTracking(
        'clearAllBookmarks',
        () => this._clearAllBookmarksInternal()
      );

      return { 
        success: true, 
        data: result,
        metrics 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear all bookmarks'
      };
    }
  }

  private async _clearAllBookmarksInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this._createTransaction(STORES.BOOKMARKS, 'readwrite');
      const store = transaction.objectStore(STORES.BOOKMARKS);

      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear bookmarks store'));
      };
    });
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
   * Verify database is working by testing basic operations
   */
  async verifyDatabase(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🧪 Testing database functionality...');
    
    // Test bookmark creation
    const testBookmark = {
      id: 'test_' + Date.now(),
      text: 'Test bookmark for verification',
      author: 'test_user',
      created_at: new Date().toISOString(),
      bookmark_timestamp: new Date().toISOString(),
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
        await this.deleteBookmark(testBookmark.id);
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