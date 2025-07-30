/**
 * XSaved Extension v2 - Search Engine Tests
 * Comprehensive testing of search functionality and performance
 */
import { searchEngine } from './index';
import { db } from '../db';
// Test data for search functionality
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
/**
 * Setup test data in database
 */
async function setupTestData() {
    console.log('🛠️ Setting up search test data...');
    try {
        await db.initialize();
        // Add test bookmarks
        for (const bookmark of testBookmarks) {
            const result = await db.addBookmark(bookmark);
            if (!result.success) {
                console.error('Failed to add test bookmark:', bookmark.id);
            }
        }
        console.log(`✅ Added ${testBookmarks.length} test bookmarks`);
    }
    catch (error) {
        console.error('❌ Failed to setup test data:', error);
        throw error;
    }
}
/**
 * Test basic search functionality
 */
async function testBasicSearch() {
    console.log('\n🔍 Testing basic search functionality...');
    try {
        // Test 1: Simple text search
        console.log('\n1️⃣ Testing text search...');
        const textResult = await searchEngine.search({ text: 'React tutorial' });
        console.log(`✅ Text search found ${textResult.totalCount} results in ${textResult.queryTime.toFixed(2)}ms`);
        if (textResult.bookmarks.length > 0) {
            console.log(`   First result: "${textResult.bookmarks[0].bookmark.text.substring(0, 50)}..."`);
        }
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
    catch (error) {
        console.error('❌ Basic search tests failed:', error);
    }
}
/**
 * Test advanced search features
 */
async function testAdvancedSearch() {
    console.log('\n🚀 Testing advanced search features...');
    try {
        // Test 1: Multiple tags (intersection)
        console.log('\n1️⃣ Testing multiple tag search...');
        const multiTagResult = await searchEngine.search({ tags: ['react', 'tutorial'] });
        console.log(`✅ Multi-tag search found ${multiTagResult.totalCount} results in ${multiTagResult.queryTime.toFixed(2)}ms`);
        // Test 2: Excluded tags
        console.log('\n2️⃣ Testing tag exclusion...');
        const excludeResult = await searchEngine.search({
            tags: ['frontend'],
            excludeTags: ['vue']
        });
        console.log(`✅ Tag exclusion found ${excludeResult.totalCount} results in ${excludeResult.queryTime.toFixed(2)}ms`);
        // Test 3: Media filter
        console.log('\n3️⃣ Testing media filter...');
        const mediaResult = await searchEngine.search({ hasMedia: true });
        console.log(`✅ Media filter found ${mediaResult.totalCount} results in ${mediaResult.queryTime.toFixed(2)}ms`);
        // Test 4: Date range (last 7 days)
        console.log('\n4️⃣ Testing date range...');
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();
        const dateResult = await searchEngine.search({
            dateRange: { start: oneWeekAgo, end: now }
        });
        console.log(`✅ Date range search found ${dateResult.totalCount} results in ${dateResult.queryTime.toFixed(2)}ms`);
    }
    catch (error) {
        console.error('❌ Advanced search tests failed:', error);
    }
}
/**
 * Test search performance with various query types
 */
async function testSearchPerformance() {
    console.log('\n⚡ Testing search performance...');
    const performanceTests = [
        { name: 'Single tag', query: { tags: ['react'] }, target: 5 },
        { name: 'Text search', query: { text: 'tutorial' }, target: 30 },
        { name: 'Author search', query: { author: 'wesbos' }, target: 20 },
        { name: 'Multi-criteria', query: { text: 'React', tags: ['frontend'], author: 'wesbos' }, target: 50 }
    ];
    for (const test of performanceTests) {
        console.log(`\n🎯 Testing ${test.name}...`);
        // Run test multiple times for average
        const times = [];
        for (let i = 0; i < 5; i++) {
            const result = await searchEngine.search(test.query);
            times.push(result.queryTime);
        }
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const status = avgTime <= test.target ? '✅' : '⚠️';
        console.log(`${status} ${test.name}: ${avgTime.toFixed(2)}ms avg (target: ${test.target}ms)`);
        if (avgTime > test.target) {
            console.log(`   Times: [${times.map(t => t.toFixed(1)).join(', ')}]ms`);
        }
    }
}
/**
 * Test query parsing and optimization
 */
async function testQueryParsing() {
    console.log('\n📝 Testing query parsing...');
    const testQueries = [
        // Text with hashtags
        { text: 'React tutorial #frontend #javascript' },
        // Text with phrases
        { text: '"machine learning" algorithms' },
        // Text with mentions
        { text: 'Great tutorial by @wesbos about React' },
        // Complex query
        { text: 'Vue.js tutorial', tags: ['frontend'], author: 'traversymedia' }
    ];
    for (let i = 0; i < testQueries.length; i++) {
        console.log(`\n${i + 1}️⃣ Testing query: ${JSON.stringify(testQueries[i])}`);
        try {
            const result = await searchEngine.search(testQueries[i]);
            console.log(`✅ Parsed and executed successfully`);
            console.log(`   Results: ${result.totalCount}, Time: ${result.queryTime.toFixed(2)}ms`);
            if (result.suggestedQueries && result.suggestedQueries.length > 0) {
                console.log(`   Suggestions: ${result.suggestedQueries.join(', ')}`);
            }
        }
        catch (error) {
            console.error(`❌ Query parsing failed:`, error);
        }
    }
}
/**
 * Test caching functionality
 */
async function testCaching() {
    console.log('\n🎯 Testing search caching...');
    const testQuery = { text: 'React tutorial', tags: ['frontend'] };
    // First search (cache miss)
    console.log('\n1️⃣ First search (cache miss)...');
    const firstResult = await searchEngine.search(testQuery);
    console.log(`✅ First search: ${firstResult.queryTime.toFixed(2)}ms`);
    // Second search (cache hit)
    console.log('\n2️⃣ Second search (cache hit)...');
    const secondResult = await searchEngine.search(testQuery);
    console.log(`✅ Second search: ${secondResult.queryTime.toFixed(2)}ms`);
    // Cache should be faster
    if (secondResult.queryTime < firstResult.queryTime) {
        console.log(`🚀 Cache improved performance by ${(firstResult.queryTime - secondResult.queryTime).toFixed(2)}ms`);
    }
    // Check cache stats
    const cacheStats = searchEngine.getCacheStats();
    console.log(`📊 Cache stats: ${cacheStats.size} entries`);
}
/**
 * Test quick search methods
 */
async function testQuickSearch() {
    console.log('\n⚡ Testing quick search methods...');
    try {
        // Quick tag search
        console.log('\n1️⃣ Testing quick tag search...');
        const tagResult = await searchEngine.quickTagSearch('react');
        console.log(`✅ Quick tag search: ${tagResult.totalCount} results in ${tagResult.queryTime.toFixed(2)}ms`);
        // Quick text search
        console.log('\n2️⃣ Testing quick text search...');
        const textResult = await searchEngine.quickTextSearch('tutorial');
        console.log(`✅ Quick text search: ${textResult.totalCount} results in ${textResult.queryTime.toFixed(2)}ms`);
        // Author search
        console.log('\n3️⃣ Testing author search...');
        const authorResult = await searchEngine.searchByAuthor('wesbos');
        console.log(`✅ Author search: ${authorResult.totalCount} results in ${authorResult.queryTime.toFixed(2)}ms`);
        // Recent bookmarks
        console.log('\n4️⃣ Testing recent bookmarks...');
        const recentResult = await searchEngine.getRecent({ limit: 10 });
        console.log(`✅ Recent search: ${recentResult.totalCount} results in ${recentResult.queryTime.toFixed(2)}ms`);
    }
    catch (error) {
        console.error('❌ Quick search tests failed:', error);
    }
}
/**
 * Run all search engine tests
 */
export async function runSearchEngineTests() {
    console.log('🧪 Starting XSaved Search Engine Tests...');
    console.log('='.repeat(50));
    try {
        // Setup test data
        await setupTestData();
        // Run test suites
        await testBasicSearch();
        await testAdvancedSearch();
        await testQueryParsing();
        await testQuickSearch();
        await testCaching();
        await testSearchPerformance();
        console.log('\n' + '='.repeat(50));
        console.log('🎉 All search engine tests completed!');
        console.log('\n📊 Final cache stats:', searchEngine.getCacheStats());
    }
    catch (error) {
        console.error('💥 Search engine tests failed:', error);
    }
}
/**
 * Clear test data
 */
export async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    try {
        for (const bookmark of testBookmarks) {
            await db.deleteBookmark(bookmark.id);
        }
        // Clear search cache
        searchEngine.clearCache();
        console.log('✅ Test data cleaned up');
    }
    catch (error) {
        console.error('❌ Failed to cleanup test data:', error);
    }
}
// For browser console testing
if (typeof window !== 'undefined') {
    window.testSearchEngine = {
        runSearchEngineTests,
        cleanupTestData,
        searchEngine,
        setupTestData,
        testBasicSearch,
        testAdvancedSearch,
        testSearchPerformance
    };
    console.log('🔧 Search engine tests available via: window.testSearchEngine.runSearchEngineTests()');
}
//# sourceMappingURL=test.js.map