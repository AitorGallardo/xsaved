# Component 1: Database Schema Design (Dexie.js)

## 🎯 Component 1 Goals (Database Layer)
- **Dexie.js Migration**: Raw IndexedDB → Dexie.js (65% code reduction)
- **Eliminate PostgreSQL bloat**: 4.5KB → ~300 bytes per bookmark
- **Fast search**: Multi-entry indexes for tags and text with automatic optimization
- **Local-first**: No server dependency for core operations
- **Scalable**: Handle 50K+ bookmarks with <50ms queries
- **Developer Experience**: Promise-based API, automatic transaction management

## 📊 Size Comparison: Old vs New

### ❌ Old PostgreSQL Schema (4.5KB per tweet)
```
tweets              1,400 kB  (31%)  - Core tweet data
media_variants        728 kB  (16%)  - Multiple video qualities ← BLOAT
tweet_authors         504 kB  (11%)  - Duplicate author data ← BLOAT  
thread_metadata       472 kB  (10%)  - Heavy thread processing ← BLOAT
user_tweets          440 kB  (10%)  - User-tweet relationships
```

### ✅ New IndexedDB Schema (~300 bytes per bookmark)
```typescript
interface BookmarkEntity {
  // Core identifiers (32 bytes)
  id: string;                    // Tweet ID: "1742891234567890123"
  
  // Essential content (150 bytes average)
  text: string;                  // Tweet content
  author: string;                // Username only
  
  // Timestamps (50 bytes)
  created_at: string;            // ISO string
  bookmark_timestamp: string;    // When user saved
  
  // User organization (50 bytes average)
  tags: string[];                // User-defined tags
  
  // Optional media (20 bytes average)
  media_urls?: string[];         // Simple URLs, no variants
  
  // Removed bloat:
  // ❌ authorRestId, authorDisplayName
  // ❌ favoriteCount, retweetCount, viewCount  
  // ❌ media_variants table
  // ❌ thread_metadata complexity
}
```

## 🗄️ IndexedDB Database Design

### Database Structure
```javascript
const DATABASE_NAME = 'XSavedDB';
const DATABASE_VERSION = 1;

const STORES = {
  BOOKMARKS: 'bookmarks',
  SEARCH_INDEX: 'search_index', 
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  SETTINGS: 'settings'
};
```

### Store Schemas

#### 1. Bookmarks Store (Primary)
```javascript
// Object Store: bookmarks
{
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
      multiEntry: true  // ← KEY for fast tag filtering
    },
    {
      name: 'bookmark_timestamp',
      keyPath: 'bookmark_timestamp',
      unique: false
    },
    {
      name: 'text_search',
      keyPath: 'textTokens',
      multiEntry: true  // ← KEY for full-text search
    }
  ]
}
```

#### 2. Search Index Store (Performance)
```javascript
// Object Store: search_index  
{
  keyPath: 'bookmarkId',
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
    }
  ]
}

// Search index entry:
{
  bookmarkId: 'tweet_123',
  tokens: ['javascript', 'js', 'coding', 'react'],
  relevanceScore: 0.95,
  lastUpdated: '2024-01-20T10:00:00.000Z'
}
```

#### 3. Tags Store (Organization)
```javascript
// Object Store: tags
{
  keyPath: 'name',
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
    }
  ]
}

// Tag entry:
{
  name: 'javascript',
  usageCount: 1547,
  createdAt: '2024-01-15T10:00:00.000Z',
  color: '#f7df1e',        // Optional: tag color
  category: 'programming'   // Optional: tag grouping
}
```

## 🚀 Performance Optimizations

### Multi-Entry Index Strategy
```javascript
// Example: Bookmark with tags ['javascript', 'react', 'coding']
// Creates 3 separate index entries automatically:
'javascript' → [bookmark_123]
'react' → [bookmark_123] 
'coding' → [bookmark_123]

// Query: "Show me all JavaScript bookmarks"
// Result: O(log n) lookup vs O(n) array scan
```

### Text Search Tokenization
```javascript
// Tweet: "Amazing JavaScript tutorial for React beginners!"
// Tokenization strategy:
{
  textTokens: [
    'amazing', 'javascript', 'tutorial', 'react', 'beginners',
    'js',      // Synonym expansion
    'tutorial', 'guide'  // Related terms
  ]
}
```

## 💾 Storage Capacity Planning

### Capacity Analysis
```javascript
const storageMetrics = {
  // Per bookmark storage
  averageBookmarkSize: 300,        // bytes (vs 4.5KB in PostgreSQL)
  
  // Capacity projections  
  at10MB: 35000,                   // bookmarks (chrome.storage limit)
  atIndexedDB: 'unlimited',        // Limited by disk space
  
  // Performance targets
  searchTime50K: '< 50ms',         // Target query time
  indexingTime10K: '< 500ms',      // Bulk index building
  memoryUsage50K: '< 100MB'        // Memory footprint
};
```

### Storage Distribution
```
┌─────────────────────────────────────────┐
│ 50,000 Bookmarks = ~15MB Total         │
├─────────────────────────────────────────┤
│ Bookmarks:     12MB (80%)               │
│ Search Index:   2MB (13%)               │  
│ Tags:          0.5MB (3%)               │
│ Collections:   0.3MB (2%)               │
│ Settings:      0.2MB (2%)               │
└─────────────────────────────────────────┘
```

## 🔍 Query Patterns

### Common Operations
```javascript
// 1. Recent bookmarks (most frequent)
bookmarksStore.index('bookmark_timestamp')
  .openCursor(null, 'prev')
  .limit(50);

// 2. Tag filtering  
bookmarksStore.index('tags')
  .getAll('javascript');

// 3. Author search
bookmarksStore.index('author')
  .getAll('levelsio');

// 4. Full-text search
searchStore.index('tokens')
  .getAll(IDBKeyRange.bound('react', 'react\uffff'));

// 5. Date range
bookmarksStore.index('created_at')
  .getAll(IDBKeyRange.bound(startDate, endDate));
```

This schema eliminates the 90% storage bloat while enabling the fast search performance you need! 