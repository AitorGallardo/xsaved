/**
 * XSaved Extension v2 - Search Engine Test Modules
 * Simplified version for browser testing
 */

// Simplified Database Mock for Testing
class MockDatabase {
  constructor() {
    this.bookmarks = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    console.log('🔧 Mock database initialized');
    this.initialized = true;
  }

  async addBookmark(bookmark) {
    await this.initialize();
    this.bookmarks.set(bookmark.id, {
      ...bookmark,
      textTokens: this.tokenizeText(bookmark.text),
      bookmark_timestamp: bookmark.bookmark_timestamp || new Date().toISOString()
    });
    return { success: true, data: bookmark };
  }

  async getBookmarksByTag(tag) {
    await this.initialize();
    const results = Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.tags.includes(tag));
    return { success: true, data: results };
  }

  async getRecentBookmarks(options = {}) {
    await this.initialize();
    const limit = options.limit || 50;
    const results = Array.from(this.bookmarks.values())
      .sort((a, b) => new Date(b.bookmark_timestamp) - new Date(a.bookmark_timestamp))
      .slice(0, limit);
    return { success: true, data: results };
  }

  async deleteBookmark(id) {
    await this.initialize();
    const deleted = this.bookmarks.delete(id);
    return { success: deleted };
  }

  tokenizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 3)
      .slice(0, 10);
  }
}

// Simplified Search Engine Implementation
class SimplifiedSearchEngine {
  constructor() {
    this.db = new MockDatabase();
    this.queryCache = new Map();
    this.stats = {
      totalQueries: 0,
      searchTimes: [],
      cacheHits: 0
    };
  }

  async search(query) {
    const startTime = performance.now();
    this.stats.totalQueries++;

    try {
      await this.db.initialize();

      // Simple query parsing
      const parsedQuery = this.parseQuery(query);
      
      // Execute search
      let results = [];
      
      if (query.tags && query.tags.length > 0) {
        // Tag search
        for (const tag of query.tags) {
          const tagResults = await this.db.getBookmarksByTag(tag);
          if (tagResults.success) {
            results = results.concat(tagResults.data);
          }
        }
        // Remove duplicates
        const seen = new Set();
        results = results.filter(bookmark => {
          if (seen.has(bookmark.id)) return false;
          seen.add(bookmark.id);
          return true;
        });
      } else {
        // Get recent bookmarks
        const recentResults = await this.db.getRecentBookmarks({ limit: 100 });
        results = recentResults.success ? recentResults.data : [];
      }

      // Apply text filter
      if (query.text) {
        const searchTokens = this.tokenizeText(query.text);
        results = results.filter(bookmark => {
          const bookmarkText = bookmark.text.toLowerCase();
          return searchTokens.some(token => 
            bookmarkText.includes(token) || 
            (bookmark.textTokens && bookmark.textTokens.includes(token))
          );
        });
      }

      // Apply author filter
      if (query.author) {
        results = results.filter(bookmark => 
          bookmark.author.toLowerCase() === query.author.toLowerCase()
        );
      }

      // Apply media filter
      if (query.hasMedia !== undefined) {
        results = results.filter(bookmark => 
          query.hasMedia ? 
            (bookmark.media_urls && bookmark.media_urls.length > 0) :
            (!bookmark.media_urls || bookmark.media_urls.length === 0)
        );
      }

      // Apply exclude tags
      if (query.excludeTags && query.excludeTags.length > 0) {
        results = results.filter(bookmark =>
          !query.excludeTags.some(excludedTag =>
            bookmark.tags.includes(excludedTag)
          )
        );
      }

      // Sort results
      if (query.sortBy === 'date') {
        results.sort((a, b) => new Date(b.bookmark_timestamp) - new Date(a.bookmark_timestamp));
      } else if (query.sortBy === 'author') {
        results.sort((a, b) => a.author.localeCompare(b.author));
      }

      // Apply limit
      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      const queryTime = performance.now() - startTime;
      this.stats.searchTimes.push(queryTime);

      // Convert to scored bookmarks
      const scoredBookmarks = results.map(bookmark => ({
        bookmark,
        score: this.calculateRelevanceScore(bookmark, query),
        matchingFactors: {
          textRelevance: 0.8,
          tagRelevance: 0.9,
          recency: 0.7,
          authorPopularity: 0.6,
          userInteraction: 0.5,
          exactMatch: false
        }
      }));

      console.log(`🔍 Search completed: "${query.text || 'filtered search'}" → ${results.length} results in ${queryTime.toFixed(2)}ms`);

      return {
        bookmarks: scoredBookmarks,
        totalCount: results.length,
        queryTime,
        pagination: {
          hasMore: false,
          totalPages: 1
        },
        suggestedQueries: this.generateSuggestions(query)
      };

    } catch (error) {
      console.error('❌ Search error:', error);
      return {
        bookmarks: [],
        totalCount: 0,
        queryTime: performance.now() - startTime,
        pagination: { hasMore: false, totalPages: 0 }
      };
    }
  }

  parseQuery(query) {
    // Simple parsing - extract hashtags from text
    if (query.text) {
      const hashtagMatches = query.text.match(/#(\w+)/g);
      if (hashtagMatches) {
        const hashtags = hashtagMatches.map(tag => tag.replace('#', ''));
        query.tags = (query.tags || []).concat(hashtags);
        query.text = query.text.replace(/#\w+/g, '').trim();
      }
    }
    return query;
  }

  calculateRelevanceScore(bookmark, query) {
    let score = 0.5; // Base score

    // Text relevance
    if (query.text) {
      const queryTokens = this.tokenizeText(query.text);
      const bookmarkTokens = bookmark.textTokens || [];
      const matches = queryTokens.filter(token => bookmarkTokens.includes(token));
      score += (matches.length / queryTokens.length) * 0.4;
    }

    // Tag relevance
    if (query.tags && query.tags.length > 0) {
      const tagMatches = query.tags.filter(tag => bookmark.tags.includes(tag));
      score += (tagMatches.length / query.tags.length) * 0.3;
    }

    // Recency boost (newer = higher score)
    const age = Date.now() - new Date(bookmark.bookmark_timestamp).getTime();
    const daysSinceBookmarked = age / (1000 * 60 * 60 * 24);
    if (daysSinceBookmarked < 7) {
      score += 0.1; // Recent bookmarks get boost
    }

    return Math.min(1, score);
  }

  generateSuggestions(query) {
    const suggestions = [];
    if (query.text) {
      suggestions.push(`${query.text} #tutorial`);
      suggestions.push(`${query.text} #javascript`);
    }
    return suggestions.slice(0, 3);
  }

  tokenizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 3);
  }

  // Quick search methods
  async quickTagSearch(tag) {
    return this.search({ tags: [tag], limit: 20 });
  }

  async quickTextSearch(text) {
    return this.search({ text, limit: 20 });
  }

  async searchByAuthor(author) {
    return this.search({ author, limit: 50 });
  }

  async getRecent(filters = {}) {
    return this.search({ ...filters, sortBy: 'date', limit: filters.limit || 50 });
  }

  clearCache() {
    this.queryCache.clear();
    console.log('🧹 Search cache cleared');
  }

  getCacheStats() {
    const hitRate = this.stats.totalQueries > 0 ? 
      ((this.stats.cacheHits / this.stats.totalQueries) * 100) : 0;
    return {
      size: this.queryCache.size,
      hitRate: hitRate.toFixed(1)
    };
  }
}

// Test Data
const testBookmarks = [
  {
    id: 'search_test_1',
    text: 'Amazing React tutorial with TypeScript and modern best practices #react #typescript #tutorial',
    author: 'wesbos',
    created_at: '2024-01-15T10:30:00.000Z',
    bookmark_timestamp: new Date().toISOString(),
    tags: ['react', 'typescript', 'tutorial', 'frontend'],
    media_urls: ['https://example.com/react-tutorial.jpg']
  },
  {
    id: 'search_test_2',
    text: 'Machine Learning fundamentals with Python - complete guide for beginners #ai #python #ml',
    author: 'sentdex',
    created_at: '2024-01-16T14:20:00.000Z',
    bookmark_timestamp: new Date().toISOString(),
    tags: ['ai', 'python', 'machinelearning', 'tutorial'],
    media_urls: []
  },
  {
    id: 'search_test_3',
    text: 'Vue.js vs React comparison 2024 - which framework should you choose? Performance analysis',
    author: 'traversymedia',
    created_at: '2024-01-17T09:15:00.000Z',
    bookmark_timestamp: new Date().toISOString(),
    tags: ['vue', 'react', 'comparison', 'frontend'],
    media_urls: ['https://example.com/vue-vs-react.mp4']
  },
  {
    id: 'search_test_4',
    text: 'Advanced JavaScript patterns and techniques for senior developers. ES2024 features included.',
    author: 'javascript_mastery',
    created_at: '2024-01-18T16:45:00.000Z',
    bookmark_timestamp: new Date().toISOString(),
    tags: ['javascript', 'advanced', 'patterns'],
    media_urls: []
  },
  {
    id: 'search_test_5',
    text: 'Building scalable APIs with Node.js and Express. Database optimization tips included.',
    author: 'nodejs_guru',
    created_at: '2024-01-19T11:30:00.000Z',
    bookmark_timestamp: new Date().toISOString(),
    tags: ['nodejs', 'api', 'backend', 'express'],
    media_urls: []
  }
];

// Test Functions
const searchEngine = new SimplifiedSearchEngine();

async function setupTestData() {
  console.log('🛠️ Setting up search test data...');
  
  for (const bookmark of testBookmarks) {
    const result = await searchEngine.db.addBookmark(bookmark);
    if (!result.success) {
      console.error('Failed to add test bookmark:', bookmark.id);
    }
  }
  
  console.log(`✅ Added ${testBookmarks.length} test bookmarks`);
}

async function testBasicSearch() {
  console.log('\n🔍 Testing basic search functionality...');
  
  // Test 1: Simple text search
  console.log('\n1️⃣ Testing text search...');
  const textResult = await searchEngine.search({ text: 'React tutorial' });
  console.log(`✅ Text search found ${textResult.totalCount} results in ${textResult.queryTime.toFixed(2)}ms`);
  
  // Test 2: Tag search
  console.log('\n2️⃣ Testing tag search...');
  const tagResult = await searchEngine.search({ tags: ['react'] });
  console.log(`✅ Tag search found ${tagResult.totalCount} results in ${tagResult.queryTime.toFixed(2)}ms`);
  
  // Test 3: Author search
  console.log('\n3️⃣ Testing author search...');
  const authorResult = await searchEngine.search({ author: 'wesbos' });
  console.log(`✅ Author search found ${authorResult.totalCount} results in ${authorResult.queryTime.toFixed(2)}ms`);
  
  // Test 4: Combined search
  console.log('\n4️⃣ Testing combined search...');
  const combinedResult = await searchEngine.search({ 
    text: 'tutorial',
    tags: ['frontend']
  });
  console.log(`✅ Combined search found ${combinedResult.totalCount} results in ${combinedResult.queryTime.toFixed(2)}ms`);
}

async function testAdvancedSearch() {
  console.log('\n🚀 Testing advanced search features...');
  
  // Test 1: Multiple tags
  const multiTagResult = await searchEngine.search({ tags: ['react', 'tutorial'] });
  console.log(`✅ Multi-tag search found ${multiTagResult.totalCount} results in ${multiTagResult.queryTime.toFixed(2)}ms`);
  
  // Test 2: Excluded tags
  const excludeResult = await searchEngine.search({ 
    tags: ['frontend'],
    excludeTags: ['vue']
  });
  console.log(`✅ Tag exclusion found ${excludeResult.totalCount} results in ${excludeResult.queryTime.toFixed(2)}ms`);
  
  // Test 3: Media filter
  const mediaResult = await searchEngine.search({ hasMedia: true });
  console.log(`✅ Media filter found ${mediaResult.totalCount} results in ${mediaResult.queryTime.toFixed(2)}ms`);
}

async function testSearchPerformance() {
  console.log('\n⚡ Testing search performance...');
  
  const performanceTests = [
    { name: 'Single tag', query: { tags: ['react'] }, target: 5 },
    { name: 'Text search', query: { text: 'tutorial' }, target: 30 },
    { name: 'Author search', query: { author: 'wesbos' }, target: 20 },
    { name: 'Multi-criteria', query: { text: 'React', tags: ['frontend'] }, target: 50 }
  ];
  
  for (const test of performanceTests) {
    console.log(`\n🎯 Testing ${test.name}...`);
    
    const times = [];
    for (let i = 0; i < 5; i++) {
      const result = await searchEngine.search(test.query);
      times.push(result.queryTime);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const status = avgTime <= test.target ? '✅' : '⚠️';
    
    console.log(`${status} ${test.name}: ${avgTime.toFixed(2)}ms avg (target: ${test.target}ms)`);
  }
}

async function runSearchEngineTests() {
  console.log('🧪 Starting XSaved Search Engine Tests...');
  console.log('='.repeat(50));
  
  await setupTestData();
  await testBasicSearch();
  await testAdvancedSearch();
  await testSearchPerformance();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 All search engine tests completed!');
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  for (const bookmark of testBookmarks) {
    await searchEngine.db.deleteBookmark(bookmark.id);
  }
  
  searchEngine.clearCache();
  console.log('✅ Test data cleaned up');
}

// Make functions available globally
window.testSearchEngine = {
  runSearchEngineTests,
  cleanupTestData,
  searchEngine,
  setupTestData,
  testBasicSearch,
  testAdvancedSearch,
  testSearchPerformance
};

console.log('🔧 XSaved Search Engine modules loaded successfully!');
console.log('📋 Available functions:');
console.log('- window.testSearchEngine.runSearchEngineTests()');
console.log('- window.testSearchEngine.setupTestData()');
console.log('- window.testSearchEngine.searchEngine.search(query)'); 