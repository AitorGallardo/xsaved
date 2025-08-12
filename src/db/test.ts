/**
 * XSaved Extension v2 - Database Tests
 * Basic validation of IndexedDB functionality
 */

import { db, BookmarkEntity } from './index';

// Test data
const sampleBookmark: BookmarkEntity = {
  id: '1742891234567890123',
  text: 'Amazing thread about AI developments and machine learning breakthroughs in 2024! #AI #MachineLearning #Tech',
  author: 'levelsio',
  created_at: '2024-01-15T10:30:00.000Z',
  bookmarked_at: new Date().toISOString(),
  tags: ['ai', 'machinelearning', 'tech'],
  media_urls: ['https://pbs.twimg.com/media/example.jpg']
};

const sampleBookmark2: BookmarkEntity = {
  id: '1742891234567890124',
  text: 'React vs Vue vs Angular comparison 2024 - which framework should you choose? #React #Vue #Angular #JavaScript',
  author: 'wesbos',
  created_at: '2024-01-16T14:20:00.000Z',
  bookmarked_at: new Date().toISOString(),
  tags: ['react', 'vue', 'angular', 'javascript'],
  media_urls: []
};

/**
 * Run basic database tests
 */
export async function runDatabaseTests(): Promise<void> {
  console.log('🧪 Starting XSaved Database Tests...');

  try {
    // Test 1: Initialize database
    console.log('\n1️⃣ Testing database initialization...');
    const initResult = await db.initialize();
    if (initResult.success) {
      console.log('✅ Database initialized successfully');
    } else {
      throw new Error(`Initialization failed: ${initResult.error}`);
    }

    // Test 2: Add bookmarks
    console.log('\n2️⃣ Testing bookmark creation...');
    const addResult1 = await db.addBookmark(sampleBookmark);
    const addResult2 = await db.addBookmark(sampleBookmark2);
    
    if (addResult1.success && addResult2.success) {
      console.log(`✅ Bookmarks added successfully`);
      console.log(`   Bookmark 1 duration: ${addResult1.metrics?.duration.toFixed(2)}ms`);
      console.log(`   Bookmark 2 duration: ${addResult2.metrics?.duration.toFixed(2)}ms`);
    } else {
      throw new Error('Failed to add bookmarks');
    }

    // Test 3: Retrieve bookmark by ID
    console.log('\n3️⃣ Testing bookmark retrieval...');
    const getResult = await db.getBookmark(sampleBookmark.id);
    
    if (getResult.success && getResult.data) {
      console.log(`✅ Bookmark retrieved successfully`);
      console.log(`   Query duration: ${getResult.metrics?.duration.toFixed(2)}ms`);
      console.log(`   Text: "${getResult.data.text.substring(0, 50)}..."`);
      console.log(`   Tags: [${getResult.data.tags.join(', ')}]`);
    } else {
      throw new Error('Failed to retrieve bookmark');
    }

    // Test 4: Recent bookmarks query
    console.log('\n4️⃣ Testing recent bookmarks query...');
    const recentResult = await db.getRecentBookmarks({ limit: 10 });
    
    if (recentResult.success) {
      console.log(`✅ Recent bookmarks retrieved: ${recentResult.data?.length} items`);
      console.log(`   Query duration: ${recentResult.metrics?.duration.toFixed(2)}ms`);
    } else {
      throw new Error('Failed to get recent bookmarks');
    }

    // Test 5: Tag-based search (multi-entry index test)
    console.log('\n5️⃣ Testing tag-based search...');
    const tagResult = await db.getBookmarksByTag('ai');
    
    if (tagResult.success) {
      console.log(`✅ Tag search completed: ${tagResult.data?.length} results for 'ai'`);
      console.log(`   Query duration: ${tagResult.metrics?.duration.toFixed(2)}ms`);
      
      if (tagResult.data && tagResult.data.length > 0) {
        console.log(`   Found bookmark: "${tagResult.data[0].text.substring(0, 40)}..."`);
      }
    } else {
      throw new Error('Failed to search by tag');
    }

    // Test 6: Database statistics
    console.log('\n6️⃣ Testing database statistics...');
    const statsResult = await db.getStats();
    
    if (statsResult.success) {
      console.log(`✅ Database stats retrieved:`);
      console.log(`   Bookmarks: ${statsResult.data.bookmarks}`);
      console.log(`   Tags: ${statsResult.data.tags}`);
      console.log(`   Version: ${statsResult.data.version}`);
    } else {
      throw new Error('Failed to get database stats');
    }

    console.log('\n🎉 All tests passed! Database layer is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Performance test with multiple bookmarks
 */
export async function runPerformanceTests(): Promise<void> {
  console.log('\n⚡ Running performance tests...');

  const startTime = performance.now();
  const testBookmarks: BookmarkEntity[] = [];

  // Generate test data
  for (let i = 0; i < 100; i++) {
    testBookmarks.push({
      id: `test_bookmark_${i}`,
      text: `Test bookmark ${i} with some content about technology and programming #test #perf`,
      author: `user${i % 10}`,
      created_at: new Date(Date.now() - i * 60000).toISOString(),
      bookmarked_at: new Date().toISOString(),
      tags: [`tag${i % 5}`, 'test', 'performance'],
      media_urls: i % 3 === 0 ? ['https://example.com/image.jpg'] : undefined
    });
  }

  // Bulk insert test
  console.log('📊 Testing bulk insert performance...');
  let successCount = 0;
  
  for (const bookmark of testBookmarks) {
    const result = await db.addBookmark(bookmark);
    if (result.success) successCount++;
  }

  const insertDuration = performance.now() - startTime;
  console.log(`✅ Inserted ${successCount}/100 bookmarks in ${insertDuration.toFixed(2)}ms`);
  console.log(`   Average: ${(insertDuration / successCount).toFixed(2)}ms per bookmark`);

  // Search performance test
  console.log('🔍 Testing search performance...');
  const searchStart = performance.now();
  
  const searchResult = await db.getBookmarksByTag('test');
  const searchDuration = performance.now() - searchStart;
  
  if (searchResult.success) {
    console.log(`✅ Tag search found ${searchResult.data?.length} results in ${searchDuration.toFixed(2)}ms`);
  }
}

/**
 * Run all tests (use in browser console)
 */
export async function runAllTests(): Promise<void> {
  try {
    await runDatabaseTests();
    await runPerformanceTests();
    console.log('\n🚀 All tests completed successfully!');
  } catch (error) {
    console.error('💥 Tests failed:', error);
  }
}

// For browser console testing
if (typeof window !== 'undefined') {
  (window as any).testXSavedDB = {
    runDatabaseTests,
    runPerformanceTests,
    runAllTests,
    db
  };
  
  console.log('🔧 Database tests available via: window.testXSavedDB.runAllTests()');
} 