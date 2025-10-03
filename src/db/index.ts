/**
 * XSaved Extension v2 - Database Module
 * Consolidated single database implementation
 */

// Main database class (consolidated Dexie implementation)
export { XSavedDatabase, db, createUserDatabase } from './database';

// Type definitions
export type {
  BookmarkEntity,
  SearchIndexEntry,
  TagEntity,
  CollectionEntity,
  SettingsEntity,
  DatabaseConfig,
  IndexConfig,
  QueryOptions,
  SearchQuery,
  SearchResult,
  PerformanceMetrics,
  DatabaseResult,
  BulkOperation,
  BulkResult
} from './types';

// Configuration
export {
  DATABASE_NAME,
  DATABASE_VERSION,
  STORES,
  DB_CONFIG,
  PERFORMANCE_CONFIG,
  DEFAULT_SETTINGS,
  DB_ERRORS
} from './config'; 