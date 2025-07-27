# Search & Filtering Engine Design

## 🎯 **Component 2 Goals**

- **Lightning-fast search**: <50ms queries across 50K+ bookmarks
- **Multi-criteria filtering**: Tags, authors, dates, text
- **Relevance scoring**: Best results first
- **Real-time suggestions**: As-you-type autocomplete
- **Advanced queries**: Complex boolean operations

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                     Search Engine Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Query Parser  │  │ Search Executor │  │ Result Ranker   │ │
│  │                 │  │                 │  │                 │ │
│  │ • Text parsing  │  │ • Index queries │  │ • Relevance     │ │
│  │ • Tag extraction│  │ • Multi-criteria│  │ • Score calc    │ │
│  │ • Filter logic  │  │ • Performance   │  │ • Pagination    │ │
│  │ • Query plan    │  │ • Result merge  │  │ • Deduplication │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │         │
│           ▼                     ▼                     ▼         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              IndexedDB Optimization Layer                  │ │
│  │                                                             │ │
│  │ • Multi-entry indexes   • Query optimization               │ │
│  │ • Cursor management     • Cache strategies                 │ │
│  │ • Batch operations      • Performance monitoring           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 **Core Components**

### **1. Query Parser**
**Purpose**: Transform user input into optimized search queries

```typescript
interface SearchQuery {
  text?: string;                    // "machine learning tutorial"
  tags: string[];                   // ["ai", "python"] 
  author?: string;                  // "levelsio"
  dateRange?: {
    start: string;
    end: string;
  };
  excludeTags?: string[];           // NOT these tags
  sortBy: 'relevance' | 'date' | 'author';
  limit: number;
}

interface ParsedQuery {
  textTokens: string[];             // ["machine", "learning", "tutorial"]
  exactPhrases: string[];           // ["machine learning"]
  requiredTags: string[];           // Must have these tags
  optionalTags: string[];           // Bonus if has these tags
  filters: QueryFilter[];           // Author, date, etc.
  queryPlan: QueryExecutionPlan;    // Optimized execution order
}
```

### **2. Search Executor**
**Purpose**: Execute optimized queries against IndexedDB indexes

```typescript
class SearchExecutor {
  // Primary search methods
  async searchByText(tokens: string[]): Promise<BookmarkEntity[]>;
  async searchByTags(tags: string[]): Promise<BookmarkEntity[]>; 
  async searchByAuthor(author: string): Promise<BookmarkEntity[]>;
  async searchByDateRange(start: string, end: string): Promise<BookmarkEntity[]>;
  
  // Advanced search combinations
  async multiCriteriaSearch(query: ParsedQuery): Promise<SearchResult>;
  async intersectResults(results: BookmarkEntity[][]): Promise<BookmarkEntity[]>;
  async unionResults(results: BookmarkEntity[][]): Promise<BookmarkEntity[]>;
}
```

### **3. Result Ranker**
**Purpose**: Score and sort results by relevance

```typescript
interface ScoringFactors {
  textRelevance: number;        // How well text matches query
  tagRelevance: number;         // Tag match score
  recency: number;              // Newer = higher score
  authorPopularity: number;     // Author engagement
  userInteraction: number;      // User's past interaction with bookmark
}

interface ScoredResult {
  bookmark: BookmarkEntity;
  score: number;
  matchingFactors: ScoringFactors;
  highlightedText?: string;     // Text with search terms highlighted
}
```

## 🚀 **Performance Optimizations**

### **Multi-Entry Index Strategy**

```javascript
// Leverage the indexes we built in Component 1
const searchStrategies = {
  // Strategy 1: Single tag (fastest - direct index lookup)
  singleTag: async (tag) => {
    // Uses tags index (multi-entry) - O(log n)
    return bookmarksStore.index('tags').getAll(tag);
  },
  
  // Strategy 2: Multiple tags (intersection)
  multipleTags: async (tags) => {
    // Get results for each tag, then intersect
    const results = await Promise.all(
      tags.map(tag => bookmarksStore.index('tags').getAll(tag))
    );
    return intersectArrays(results);
  },
  
  // Strategy 3: Full-text search (tokenized)
  textSearch: async (tokens) => {
    // Uses textTokens index (multi-entry) - O(log n)
    const results = await Promise.all(
      tokens.map(token => searchIndexStore.index('tokens').getAll(token))
    );
    return mergeByRelevance(results);
  },
  
  // Strategy 4: Combined search (smart execution order)
  combinedSearch: async (query) => {
    // Execute most selective filter first
    const executionPlan = optimizeQueryPlan(query);
    return executeQueryPlan(executionPlan);
  }
};
```

### **Query Optimization Patterns**

```typescript
class QueryOptimizer {
  // Determine most selective filter to run first
  optimizeExecutionOrder(query: ParsedQuery): QueryExecutionPlan {
    const selectivity = {
      specificTag: 0.01,        // Very selective
      author: 0.05,             // Moderately selective  
      dateRange: 0.10,          // Less selective
      commonTag: 0.30,          // Not very selective
      textSearch: 0.20          // Depends on term frequency
    };
    
    return sortBySelectivity(query.filters, selectivity);
  }
  
  // Smart result intersection
  async intersectWithEarlyTermination(
    resultSets: Promise<BookmarkEntity[]>[]
  ): Promise<BookmarkEntity[]> {
    // Process most selective results first
    // Stop early if intersection becomes too small
  }
}
```

## 🔍 **Search Features**

### **1. Smart Text Search**

```typescript
interface TextSearchFeatures {
  // Basic text matching
  exactMatch: string[];         // "machine learning"
  fuzzyMatch: string[];         // "machne lerning" → matches "machine learning"
  stemming: string[];           // "coding" matches "code", "codes", "coded"
  synonyms: string[];           // "JS" matches "JavaScript"
  
  // Advanced features
  phraseSearch: string[];       // "exact phrase"
  proximitySearch: {            // Words near each other
    terms: string[];
    distance: number;
  };
  wildcards: string[];          // "react*" matches "react", "reactjs"
}
```

### **2. Tag Intelligence**

```typescript
class TagIntelligence {
  // Real-time tag suggestions
  async suggestTags(partial: string): Promise<TagSuggestion[]> {
    // Use tags index for autocomplete
    const range = IDBKeyRange.bound(partial, partial + '\uffff');
    return tagsStore.index('name').getAll(range);
  }
  
  // Related tag recommendations
  async getRelatedTags(selectedTags: string[]): Promise<string[]> {
    // Find bookmarks with selected tags
    // Suggest other common tags from those bookmarks
  }
  
  // Tag popularity and trends
  async getTagStats(tag: string): Promise<TagAnalytics> {
    return {
      usageCount: number,
      trendingScore: number,
      relatedTags: string[],
      topAuthors: string[]
    };
  }
}
```

### **3. Advanced Filtering**

```typescript
interface AdvancedFilters {
  // Date filtering
  dateRanges: {
    last24Hours: boolean;
    lastWeek: boolean;
    lastMonth: boolean;
    custom: { start: string; end: string };
  };
  
  // Author filtering
  authors: {
    include: string[];
    exclude: string[];
    verified: boolean;          // Future: verified authors only
  };
  
  // Content filtering
  hasMedia: boolean;            // Only bookmarks with images/videos
  threadOnly: boolean;          // Only thread bookmarks
  minLength: number;            // Minimum text length
  
  // User interaction
  isManualBookmark: boolean;    // Manually tagged vs bulk imported
  lastViewed: string;           // Recently accessed
}
```

## 📊 **Relevance Scoring Algorithm**

```typescript
class RelevanceScorer {
  calculateScore(bookmark: BookmarkEntity, query: ParsedQuery): number {
    const scores = {
      // Text relevance (40% weight)
      textScore: this.calculateTextScore(bookmark.text, query.textTokens) * 0.4,
      
      // Tag relevance (30% weight)  
      tagScore: this.calculateTagScore(bookmark.tags, query.requiredTags) * 0.3,
      
      // Recency (15% weight)
      recencyScore: this.calculateRecencyScore(bookmark.bookmark_timestamp) * 0.15,
      
      // User interaction (10% weight)
      interactionScore: this.calculateInteractionScore(bookmark.id) * 0.1,
      
      // Author popularity (5% weight)
      authorScore: this.calculateAuthorScore(bookmark.author) * 0.05
    };
    
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  }
  
  private calculateTextScore(text: string, queryTokens: string[]): number {
    // TF-IDF style scoring
    // Consider term frequency, position, exact matches
  }
  
  private calculateTagScore(bookmarkTags: string[], queryTags: string[]): number {
    // Exact tag matches get highest score
    // Related tags get partial score
  }
}
```

## ⚡ **Performance Targets**

| Operation | Target Time | Implementation Strategy |
|-----------|-------------|------------------------|
| **Single tag search** | <5ms | Direct index lookup |
| **Multi-tag search** | <20ms | Parallel queries + intersection |
| **Text search** | <30ms | Tokenized index + ranking |
| **Combined search** | <50ms | Optimized execution plan |
| **Autocomplete** | <10ms | Prefix matching on indexes |
| **Result ranking** | <10ms | In-memory scoring |

## 🔄 **Implementation Strategy**

### **Phase 1: Core Search (Week 1)**
- Basic text and tag search
- Multi-criteria filtering  
- Result intersection/union
- Performance monitoring

### **Phase 2: Advanced Features (Week 2)**  
- Relevance scoring
- Search suggestions
- Query optimization
- Result highlighting

### **Phase 3: Intelligence (Week 3)**
- Fuzzy matching
- Tag recommendations
- Search analytics
- User behavior learning

This search engine will make your extension feel instant, even with massive bookmark collections! 