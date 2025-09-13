/**
 * XSaved Extension v2 - Database Module
 * Main exports for the data layer
 */

// Main database class (using Dexie.js wrapper)
export { XSavedDatabase, db } from './database-dexie';

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