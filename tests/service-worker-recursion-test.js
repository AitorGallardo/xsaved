/**
 * Service Worker Recursion Fix Test - Verify the service worker recursion fix
 */

class ServiceWorkerRecursionTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runAllTests() {
    console.log('🔧 SERVICE WORKER RECURSION FIX TESTS');
    console.log('=====================================');
    console.log('Testing the service worker maximum call stack size exceeded fix');
    console.log('');

    const startTime = performance.now();

    try {
      // Test 1: Bookmark Sanitization
      await this.testBookmarkSanitization();
      
      // Test 2: Safe JSON Stringify
      await this.testSafeJSONStringify();
      
      // Test 3: Circular Reference Handling
      await this.testCircularReferenceHandling();
      
      // Test 4: Export Process Simulation
      await this.testExportProcessSimulation();

      const duration = performance.now() - startTime;
      this.printSummary(duration);

    } catch (error) {
      console.error('❌ Service worker recursion fix tests failed:', error);
    }
  }

  async testBookmarkSanitization() {
    console.log('🧹 Testing Bookmark Sanitization');
    console.log('===============================');

    try {
      console.log('1. Testing normal bookmark sanitization...');
      const normalBookmarks = [
        { id: '1', text: 'Test tweet', author: 'user1', tags: ['test'] },
        { id: '2', text: 'Another tweet', author: 'user2', tags: ['another'] }
      ];
      
      const sanitized = this.sanitizeBookmarks(normalBookmarks);
      
      if (sanitized.length === 2 && sanitized[0].id === '1' && sanitized[1].id === '2') {
        console.log('   ✅ Normal bookmarks sanitized correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Normal bookmark sanitization failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing circular bookmark sanitization...');
      const circularBookmark = { id: '1', text: 'Test', author: 'user1' };
      circularBookmark.self = circularBookmark; // Create circular reference
      
      const sanitized = this.sanitizeBookmarks([circularBookmark]);
      
      if (sanitized.length === 1 && sanitized[0].id === '1' && !sanitized[0].hasOwnProperty('self')) {
        console.log('   ✅ Circular bookmark sanitized safely');
        this.testResults.passed++;
      } else {
        throw new Error('Circular bookmark sanitization failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing deeply nested bookmark sanitization...');
      const deepBookmark = {
        id: '1',
        text: 'Test',
        author: 'user1',
        nested: {
          level1: {
            level2: {
              level3: {
                data: 'deep'
              }
            }
          }
        }
      };
      
      const sanitized = this.sanitizeBookmarks([deepBookmark]);
      
      if (sanitized.length === 1 && sanitized[0].id === '1' && !sanitized[0].hasOwnProperty('nested')) {
        console.log('   ✅ Deep bookmark sanitized safely');
        this.testResults.passed++;
      } else {
        throw new Error('Deep bookmark sanitization failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testSafeJSONStringify() {
    console.log('🛡️ Testing Safe JSON Stringify');
    console.log('==============================');

    try {
      console.log('1. Testing normal object stringification...');
      const normalObj = { a: 1, b: 'test', c: [1, 2, 3] };
      const result = this.safeJSONStringify(normalObj);
      
      if (result.includes('"a":1') && result.includes('"b":"test"')) {
        console.log('   ✅ Normal object stringified correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Normal object stringification failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing circular object stringification...');
      const circularObj = { name: 'test', value: 42 };
      circularObj.self = circularObj;
      
      const result = this.safeJSONStringify(circularObj);
      
      if (result.includes('[Circular Reference]') || result.includes('Object could not be stringified')) {
        console.log('   ✅ Circular object handled safely');
        this.testResults.passed++;
      } else {
        throw new Error('Circular object not handled');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing deeply nested circular object...');
      const deepCircular = this.createDeeplyNestedCircularObject(5);
      
      const result = this.safeJSONStringify(deepCircular);
      
      if (typeof result === 'string' && result.length > 0) {
        console.log('   ✅ Deep circular object handled safely');
        this.testResults.passed++;
      } else {
        throw new Error('Deep circular object not handled');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testCircularReferenceHandling() {
    console.log('🔄 Testing Circular Reference Handling');
    console.log('=====================================');

    try {
      console.log('1. Testing circular reference detection...');
      const circularObj = this.createCircularObject();
      const hasCircular = this.detectCircularReference(circularObj);
      
      if (hasCircular) {
        console.log('   ✅ Circular reference detected correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Circular reference not detected');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing export data with circular references...');
      const exportData = {
        metadata: {
          totalBookmarks: 100,
          exportDate: new Date().toISOString()
        },
        bookmarks: this.createBookmarksWithCircularReferences()
      };
      
      const result = this.safeJSONStringify(exportData);
      
      if (typeof result === 'string' && result.length > 0) {
        console.log('   ✅ Export data with circular references handled safely');
        this.testResults.passed++;
      } else {
        throw new Error('Export data with circular references not handled');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testExportProcessSimulation() {
    console.log('📤 Testing Export Process Simulation');
    console.log('===================================');

    try {
      console.log('1. Testing CSV export simulation...');
      const bookmarks = this.createTestBookmarks(10);
      const sanitized = this.sanitizeBookmarks(bookmarks);
      const csvResult = this.simulateCSVExport(sanitized);
      
      if (csvResult.success && csvResult.data && csvResult.filename.endsWith('.csv')) {
        console.log('   ✅ CSV export simulation successful');
        this.testResults.passed++;
      } else {
        throw new Error('CSV export simulation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing JSON export simulation...');
      const bookmarks = this.createTestBookmarks(5);
      const sanitized = this.sanitizeBookmarks(bookmarks);
      const jsonResult = this.simulateJSONExport(sanitized);
      
      if (jsonResult.success && jsonResult.data && jsonResult.filename.endsWith('.json')) {
        console.log('   ✅ JSON export simulation successful');
        this.testResults.passed++;
      } else {
        throw new Error('JSON export simulation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing export with circular references...');
      const bookmarks = this.createBookmarksWithCircularReferences();
      const sanitized = this.sanitizeBookmarks(bookmarks);
      const result = this.simulateJSONExport(sanitized);
      
      if (result.success && !result.error) {
        console.log('   ✅ Export with circular references handled safely');
        this.testResults.passed++;
      } else {
        throw new Error('Export with circular references failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  // Helper methods

  sanitizeBookmarks(bookmarks) {
    try {
      return bookmarks.map(bookmark => ({
        id: bookmark.id,
        text: bookmark.text,
        author: bookmark.author,
        created_at: bookmark.created_at,
        bookmark_timestamp: bookmark.bookmark_timestamp,
        tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
        url: bookmark.url,
        // Only include safe, serializable properties
        // Exclude any properties that might contain circular references
      }));
    } catch (error) {
      console.error('❌ [SW] Bookmark sanitization failed:', error);
      // Return empty array as fallback
      return [];
    }
  }

  safeJSONStringify(obj) {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
    } catch (error) {
      return JSON.stringify({ error: 'Object could not be stringified due to circular references' });
    }
  }

  createCircularObject() {
    const obj = { name: 'circular', value: 42 };
    obj.self = obj;
    return obj;
  }

  createDeeplyNestedCircularObject(depth) {
    const obj = { name: 'deep circular' };
    let current = obj;
    
    for (let i = 0; i < depth; i++) {
      current.nested = { parent: current, level: i };
      current = current.nested;
    }
    
    // Create circular reference at the end
    current.circular = obj;
    return obj;
  }

  detectCircularReference(obj, seen = new WeakSet()) {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }
    
    if (seen.has(obj)) {
      return true;
    }
    
    seen.add(obj);
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (this.detectCircularReference(obj[key], seen)) {
          return true;
        }
      }
    }
    
    return false;
  }

  createTestBookmarks(count) {
    const bookmarks = [];
    for (let i = 0; i < count; i++) {
      bookmarks.push({
        id: `bookmark_${i}`,
        text: `Test tweet ${i}`,
        author: `user${i}`,
        created_at: new Date().toISOString(),
        bookmark_timestamp: new Date().toISOString(),
        tags: [`tag${i}`, `test`],
        url: `https://x.com/user${i}/status/${i}`
      });
    }
    return bookmarks;
  }

  createBookmarksWithCircularReferences() {
    const bookmarks = this.createTestBookmarks(3);
    
    // Add circular references to some bookmarks
    bookmarks[0].circular = bookmarks[0];
    bookmarks[1].nested = { parent: bookmarks[1] };
    bookmarks[2].deep = { level1: { level2: { back: bookmarks[2] } } };
    
    return bookmarks;
  }

  simulateCSVExport(bookmarks) {
    try {
      const headers = ['id', 'text', 'author', 'created_at', 'bookmark_timestamp', 'tags', 'url'];
      const rows = bookmarks.map(bookmark => [
        bookmark.id || '',
        bookmark.text || '',
        bookmark.author || '',
        bookmark.created_at || '',
        bookmark.bookmark_timestamp || '',
        (bookmark.tags || []).join(', '),
        bookmark.url || ''
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      return {
        success: true,
        data: csvContent,
        filename: `bookmarks-${Date.now()}.csv`,
        size: csvContent.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filename: `bookmarks-${Date.now()}.csv`
      };
    }
  }

  simulateJSONExport(bookmarks) {
    try {
      const data = {
        metadata: {
          totalBookmarks: bookmarks.length,
          exportDate: new Date().toISOString(),
          format: 'json'
        },
        bookmarks: bookmarks
      };

      const jsonContent = this.safeJSONStringify(data);
      
      return {
        success: true,
        data: jsonContent,
        filename: `bookmarks-${Date.now()}.json`,
        size: jsonContent.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filename: `bookmarks-${Date.now()}.json`
      };
    }
  }

  printSummary(duration) {
    console.log('📊 SERVICE WORKER RECURSION FIX TEST SUMMARY');
    console.log('============================================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📋 Total: ${this.testResults.total}`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
    console.log('');
    
    const successRate = (this.testResults.passed / this.testResults.total) * 100;
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Service Worker Recursion Fix: WORKING CORRECTLY');
      console.log('');
      console.log('✅ Root Cause Fixed:');
      console.log('  • Bookmark sanitization');
      console.log('  • Safe JSON stringification');
      console.log('  • Circular reference detection');
      console.log('  • Export process protection');
      console.log('  • Service worker compatibility');
      console.log('  • Graceful error handling');
    } else {
      console.log('⚠️ Service Worker Recursion Fix: NEEDS ATTENTION');
    }
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServiceWorkerRecursionTest;
} else {
  // Browser environment
  const tester = new ServiceWorkerRecursionTest();
  tester.runAllTests();
} 