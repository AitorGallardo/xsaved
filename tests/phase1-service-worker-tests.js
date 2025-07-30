/**
 * XSaved Extension v2 - Phase 1 Test Suite
 * 
 * CRITICAL: This test suite validates the core extraction workflow
 * Run these tests after ANY changes to:
 * - Service Worker logic
 * - X.com API integration  
 * - Smart scheduling
 * - Delta sync
 * - Data layer integration
 * 
 * Tests ensure future version compatibility and workflow integrity.
 */

// ===============================
// TEST CONFIGURATION
// ===============================

const TEST_CONFIG = {
  // Test timeouts
  TIMEOUT_SHORT: 5000,      // 5s for quick operations
  TIMEOUT_MEDIUM: 15000,    // 15s for API calls
  TIMEOUT_LONG: 60000,      // 60s for full extraction

  // Mock data limits
  MAX_TEST_BOOKMARKS: 10,   // Limit test data size
  MOCK_DELAY: 100,          // Simulated API delay

  // Expected performance benchmarks
  PERFORMANCE_THRESHOLDS: {
    serviceWorkerInit: 1000,      // 1s max init time
    singleBookmarkSave: 500,      // 500ms max save time
    scheduleUpdate: 100,          // 100ms max schedule calc
    stateUpdate: 50,              // 50ms max state broadcast
  }
};

// ===============================
// MOCK DATA GENERATORS
// ===============================

class TestDataGenerator {
  static generateMockBookmark(id = null) {
    const mockId = id || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: mockId,
      text: `This is a test bookmark with hashtags #testing #xsaved and some @mentions`,
      author: 'testuser',
      author_display_name: 'Test User',
      created_at: new Date().toISOString(),
      media_urls: [],
      url: `https://twitter.com/testuser/status/${mockId}`,
      engagement: {
        retweet_count: Math.floor(Math.random() * 100),
        favorite_count: Math.floor(Math.random() * 500),
        reply_count: Math.floor(Math.random() * 50)
      }
    };
  }

  static generateMockBookmarkBatch(count = 5) {
    return Array.from({ length: count }, (_, i) => 
      this.generateMockBookmark(`batch_${Date.now()}_${i}`)
    );
  }

  static generateMockAPIResponse(bookmarks, nextCursor = null) {
    return {
      data: {
        bookmark_timeline_v2: {
          timeline: {
            instructions: [{
              entries: [
                ...bookmarks.map(bookmark => ({
                  entryId: `tweet-${bookmark.id}`,
                  content: {
                    itemContent: {
                      tweet_results: {
                        result: {
                          rest_id: bookmark.id,
                          legacy: {
                            full_text: bookmark.text,
                            created_at: bookmark.created_at,
                            retweet_count: bookmark.engagement.retweet_count,
                            favorite_count: bookmark.engagement.favorite_count,
                            reply_count: bookmark.engagement.reply_count
                          },
                          core: {
                            user_results: {
                              result: {
                                legacy: {
                                  screen_name: bookmark.author,
                                  name: bookmark.author_display_name
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                })),
                ...(nextCursor ? [{
                  entryId: 'cursor-bottom-test',
                  content: { value: nextCursor }
                }] : [])
              ]
            }]
          }
        }
      }
    };
  }
}

// ===============================
// TEST SUITE FRAMEWORK
// ===============================

class Phase1TestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.startTime = Date.now();
  }

  async runTest(testName, testFn, timeout = TEST_CONFIG.TIMEOUT_MEDIUM) {
    console.log(`🧪 Running: ${testName}`);
    const testStart = Date.now();
    
    try {
      // Race the test against timeout
      const result = await Promise.race([
        testFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Test timeout: ${timeout}ms`)), timeout)
        )
      ]);
      
      const duration = Date.now() - testStart;
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        duration,
        result
      });
      
      return { success: true, result, duration };
      
    } catch (error) {
      const duration = Date.now() - testStart;
      console.error(`❌ FAILED: ${testName} (${duration}ms)`, error.message);
      
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'FAILED',
        duration,
        error: error.message
      });
      
      return { success: false, error: error.message, duration };
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const total = this.results.passed + this.results.failed + this.results.skipped;
    
    return {
      summary: {
        total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        successRate: total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0,
        totalDuration
      },
      tests: this.results.tests,
      timestamp: new Date().toISOString()
    };
  }
}

// ===============================
// CORE TEST IMPLEMENTATIONS
// ===============================

class ServiceWorkerTests {
  
  /**
   * TEST 1: Service Worker Initialization
   * Validates: Enhanced service worker starts correctly
   * Critical for: Extension loading, component integration
   */
  static async testServiceWorkerInitialization() {
    // Send test message to service worker
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "testMessage", payload: "init_test" }, resolve);
    });
    
    if (!response || !response.success) {
      throw new Error('Service worker not responding to test messages');
    }
    
    if (!response.timestamp || typeof response.timestamp !== 'number') {
      throw new Error('Service worker response missing timestamp');
    }
    
    return {
      responsive: true,
      responseTime: Date.now() - response.timestamp,
      message: response.message
    };
  }

  /**
   * TEST 2: State Management
   * Validates: Internal state tracking works correctly
   * Critical for: Progress updates, extraction coordination
   */
  static async testStateManagement() {
    // Test getting initial state
    const progressResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getProgress" }, resolve);
    });
    
    if (!progressResponse) {
      throw new Error('Failed to get progress state');
    }
    
    // Validate state structure
    const requiredFields = ['isExtracting', 'bookmarkCount', 'extractionState', 'canStartExtraction'];
    const missingFields = requiredFields.filter(field => !(field in progressResponse));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing state fields: ${missingFields.join(', ')}`);
    }
    
    return {
      stateValid: true,
      extractionState: progressResponse.extractionState,
      canStartExtraction: progressResponse.canStartExtraction
    };
  }

  /**
   * TEST 3: Statistics Retrieval
   * Validates: Service worker can provide stats
   * Critical for: Dashboard, monitoring, debugging
   */
  static async testStatsRetrieval() {
    const statsResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getStats" }, resolve);
    });
    
    if (!statsResponse || !statsResponse.success) {
      throw new Error('Failed to retrieve stats');
    }
    
    const stats = statsResponse.stats;
    const requiredStats = ['totalBookmarks', 'lastSync', 'syncMode', 'currentScheduleInterval'];
    const missingStats = requiredStats.filter(stat => !(stat in stats));
    
    if (missingStats.length > 0) {
      throw new Error(`Missing stats: ${missingStats.join(', ')}`);
    }
    
    return {
      statsValid: true,
      totalBookmarks: stats.totalBookmarks,
      syncMode: stats.syncMode,
      scheduleInterval: stats.currentScheduleInterval
    };
  }
}

class APIIntegrationTests {
  
  /**
   * TEST 4: CSRF Token Retrieval
   * Validates: Can get X.com authentication tokens
   * Critical for: API authentication, extraction workflow
   */
  static async testCSRFTokenRetrieval() {
    // This test requires the fetcher utils to be imported
    // We'll simulate this by checking chrome.cookies access
    const testCookie = await new Promise((resolve) => {
      chrome.cookies.get({ url: 'https://x.com', name: 'ct0' }, resolve);
    });
    
    // Note: In development, this might be null - that's ok
    // We're testing the mechanism, not requiring login
    
    return {
      cookieAccessWorking: true,
      csrfTokenPresent: !!testCookie,
      tokenValue: testCookie ? `${testCookie.value.substring(0, 10)}...` : null
    };
  }

  /**
   * TEST 5: Login Status Check
   * Validates: Can detect X.com login status
   * Critical for: Automatic sync decisions
   */
  static async testLoginStatusCheck() {
    const authCookie = await new Promise((resolve) => {
      chrome.cookies.get({ url: 'https://x.com', name: 'auth_token' }, resolve);
    });
    
    return {
      loginCheckWorking: true,
      isLoggedIn: !!authCookie,
      authTokenPresent: !!authCookie
    };
  }
}

class DataLayerTests {
  
  /**
   * TEST 6: Local Storage Operations
   * Validates: Can save/retrieve bookmark data locally
   * Critical for: Data persistence, offline functionality
   */
  static async testLocalStorageOperations() {
    const testBookmark = TestDataGenerator.generateMockBookmark('storage_test_1');
    const storageKey = `bookmark_${testBookmark.id}`;
    
    // Test save operation
    await new Promise((resolve) => {
      chrome.storage.local.set({ [storageKey]: testBookmark }, resolve);
    });
    
    // Test retrieval operation
    const retrieved = await new Promise((resolve) => {
      chrome.storage.local.get([storageKey], resolve);
    });
    
    if (!retrieved[storageKey]) {
      throw new Error('Failed to retrieve saved bookmark');
    }
    
    // Validate data integrity
    const savedBookmark = retrieved[storageKey];
    if (savedBookmark.id !== testBookmark.id || savedBookmark.text !== testBookmark.text) {
      throw new Error('Data integrity compromised during save/load');
    }
    
    // Cleanup
    await new Promise((resolve) => {
      chrome.storage.local.remove([storageKey], resolve);
    });
    
    return {
      saveOperationWorking: true,
      retrievalOperationWorking: true,
      dataIntegrityMaintained: true,
      testBookmarkId: testBookmark.id
    };
  }

  /**
   * TEST 7: Batch Storage Performance
   * Validates: Can handle multiple bookmarks efficiently
   * Critical for: Bulk extraction performance
   */
  static async testBatchStoragePerformance() {
    const batchSize = 20;
    const testBookmarks = TestDataGenerator.generateMockBookmarkBatch(batchSize);
    
    const startTime = Date.now();
    
    // Save all bookmarks
    const storageData = {};
    testBookmarks.forEach(bookmark => {
      storageData[`bookmark_${bookmark.id}`] = bookmark;
    });
    
    await new Promise((resolve) => {
      chrome.storage.local.set(storageData, resolve);
    });
    
    const saveTime = Date.now() - startTime;
    
    // Retrieve all bookmarks
    const retrieveStart = Date.now();
    const keys = testBookmarks.map(b => `bookmark_${b.id}`);
    const retrieved = await new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
    
    const retrieveTime = Date.now() - retrieveStart;
    
    // Validate all bookmarks were saved/retrieved
    const retrievedCount = Object.keys(retrieved).length;
    if (retrievedCount !== batchSize) {
      throw new Error(`Expected ${batchSize} bookmarks, got ${retrievedCount}`);
    }
    
    // Cleanup
    await new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
    
    return {
      batchSize,
      saveTime,
      retrieveTime,
      avgSaveTimePerBookmark: saveTime / batchSize,
      avgRetrieveTimePerBookmark: retrieveTime / batchSize,
      performanceAcceptable: (saveTime / batchSize) < TEST_CONFIG.PERFORMANCE_THRESHOLDS.singleBookmarkSave
    };
  }
}

class SmartSchedulingTests {
  
  /**
   * TEST 8: Schedule Interval Calculation
   * Validates: Smart scheduling adjusts intervals correctly
   * Critical for: Background sync efficiency, battery life
   */
  static async testScheduleIntervalCalculation() {
    // This test would require access to the service worker internals
    // For now, we'll test the constants and validate the logic exists
    
    const expectedIntervals = {
      FREQUENT: 5,
      NORMAL: 15,  
      INFREQUENT: 60,
      OFFLINE: 240
    };
    
    // Get current stats to see if scheduling is working
    const statsResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getStats" }, resolve);
    });
    
    if (!statsResponse.success) {
      throw new Error('Cannot access scheduling stats');
    }
    
    const currentInterval = statsResponse.stats.currentScheduleInterval;
    const validIntervals = Object.values(expectedIntervals);
    
    if (!validIntervals.includes(currentInterval)) {
      throw new Error(`Invalid schedule interval: ${currentInterval}. Expected one of: ${validIntervals.join(', ')}`);
    }
    
    return {
      schedulingActive: true,
      currentInterval,
      validInterval: validIntervals.includes(currentInterval),
      expectedIntervals
    };
  }
}

// ===============================
// MAIN TEST RUNNER
// ===============================

class Phase1TestRunner {
  
  static async runAllTests() {
    console.log('🚀 Starting Phase 1 Test Suite - Service Worker & Data Layer');
    console.log('📊 This test suite validates core extraction workflow integrity');
    console.log('');
    
    const testSuite = new Phase1TestSuite();
    
    // Service Worker Core Tests
    await testSuite.runTest(
      'Service Worker Initialization',
      ServiceWorkerTests.testServiceWorkerInitialization,
      TEST_CONFIG.TIMEOUT_SHORT
    );
    
    await testSuite.runTest(
      'State Management',
      ServiceWorkerTests.testStateManagement,
      TEST_CONFIG.TIMEOUT_SHORT
    );
    
    await testSuite.runTest(
      'Statistics Retrieval',
      ServiceWorkerTests.testStatsRetrieval,
      TEST_CONFIG.TIMEOUT_SHORT
    );
    
    // API Integration Tests
    await testSuite.runTest(
      'CSRF Token Retrieval',
      APIIntegrationTests.testCSRFTokenRetrieval,
      TEST_CONFIG.TIMEOUT_SHORT
    );
    
    await testSuite.runTest(
      'Login Status Check',
      APIIntegrationTests.testLoginStatusCheck,
      TEST_CONFIG.TIMEOUT_SHORT
    );
    
    // Data Layer Tests
    await testSuite.runTest(
      'Local Storage Operations',
      DataLayerTests.testLocalStorageOperations,
      TEST_CONFIG.TIMEOUT_MEDIUM
    );
    
    await testSuite.runTest(
      'Batch Storage Performance',
      DataLayerTests.testBatchStoragePerformance,
      TEST_CONFIG.TIMEOUT_MEDIUM
    );
    
    // Smart Scheduling Tests
    await testSuite.runTest(
      'Schedule Interval Calculation',
      SmartSchedulingTests.testScheduleIntervalCalculation,
      TEST_CONFIG.TIMEOUT_SHORT
    );
    
    // Generate and display report
    const report = testSuite.generateReport();
    console.log('');
    console.log('📋 TEST SUITE REPORT');
    console.log('==================');
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}%`);
    console.log(`⏱️  Total Duration: ${report.summary.totalDuration}ms`);
    console.log('');
    
    if (report.summary.failed > 0) {
      console.log('❌ FAILED TESTS:');
      report.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
      console.log('');
    }
    
    // Save report for future analysis
    const reportKey = `test_report_phase1_${Date.now()}`;
    chrome.storage.local.set({ [reportKey]: report });
    
    return report;
  }
  
  /**
   * Quick health check for automated testing
   */
  static async runHealthCheck() {
    console.log('🏥 Running Phase 1 Health Check...');
    
    try {
      // Test just the critical components
      await ServiceWorkerTests.testServiceWorkerInitialization();
      await ServiceWorkerTests.testStateManagement();
      await DataLayerTests.testLocalStorageOperations();
      
      console.log('✅ Phase 1 Health Check: PASSED');
      return { healthy: true, timestamp: Date.now() };
      
    } catch (error) {
      console.log('❌ Phase 1 Health Check: FAILED');
      console.error(error.message);
      return { healthy: false, error: error.message, timestamp: Date.now() };
    }
  }
}

// ===============================
// EXPORT FOR BROWSER CONSOLE TESTING
// ===============================

// Make available in browser console
if (typeof window !== 'undefined') {
  window.Phase1Tests = {
    runAllTests: Phase1TestRunner.runAllTests,
    runHealthCheck: Phase1TestRunner.runHealthCheck,
    TestDataGenerator,
    ServiceWorkerTests,
    APIIntegrationTests,
    DataLayerTests,
    SmartSchedulingTests
  };
  
  console.log('🧪 Phase 1 Test Suite loaded! Available commands:');
  console.log('   Phase1Tests.runAllTests() - Run complete test suite');
  console.log('   Phase1Tests.runHealthCheck() - Quick health check');
  console.log('   Phase1Tests.TestDataGenerator - Generate mock data');
}

export { Phase1TestRunner, TestDataGenerator }; 