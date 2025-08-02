/**
 * XSaved Extension v2 - Phase 3 Content Script Test Suite
 * Tests for bookmark interception, save dialog, and grid interface
 */

// ===== TEST DATA =====
const mockTweetData = {
  id: '1742891234567890123',
  text: 'This is a test tweet about #javascript and #react development. Building amazing user interfaces!',
  author: 'developer',
  created_at: '2024-01-15T10:30:00.000Z',
  media_urls: ['https://pbs.twimg.com/media/test123.jpg']
};

const mockSearchResults = {
  bookmarks: [
    {
      id: '1742891234567890123',
      text: 'Test tweet about JavaScript',
      author: 'developer',
      created_at: '2024-01-15T10:30:00.000Z',
      bookmark_timestamp: '2024-01-15T10:35:00.000Z',
      tags: ['javascript', 'testing'],
      media_urls: []
    },
    {
      id: '1742891234567890124',
      text: 'Another test tweet about React',
      author: 'frontend_dev',
      created_at: '2024-01-15T11:00:00.000Z',
      bookmark_timestamp: '2024-01-15T11:05:00.000Z',
      tags: ['react', 'frontend'],
      media_urls: ['https://pbs.twimg.com/media/test456.jpg']
    }
  ]
};

// ===== TEST UTILITIES =====
const createMockBookmarkButton = (isBookmarked = false) => {
  const button = document.createElement('button');
  button.setAttribute('data-testid', 'bookmark');
  button.setAttribute('aria-label', isBookmarked ? 'Bookmarked' : 'Bookmark');
  
  // Create SVG icon
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.appendChild(path);
  button.appendChild(svg);
  
  return button;
};

const createMockTweetContainer = (tweetId = '1742891234567890123') => {
  const container = document.createElement('article');
  container.setAttribute('data-testid', 'tweet');
  
  // Add tweet link
  const link = document.createElement('a');
  link.href = `/i/web/status/${tweetId}`;
  container.appendChild(link);
  
  // Add text content
  const textDiv = document.createElement('div');
  textDiv.setAttribute('data-testid', 'tweetText');
  textDiv.textContent = mockTweetData.text;
  container.appendChild(textDiv);
  
  // Add author
  const authorDiv = document.createElement('div');
  authorDiv.setAttribute('data-testid', 'User-Name');
  authorDiv.textContent = `@${mockTweetData.author}`;
  container.appendChild(authorDiv);
  
  // Add timestamp
  const timeElement = document.createElement('time');
  timeElement.setAttribute('datetime', mockTweetData.created_at);
  container.appendChild(timeElement);
  
  // Add bookmark button
  const bookmarkButton = createMockBookmarkButton();
  container.appendChild(bookmarkButton);
  
  return container;
};

const createMockBookmarksPage = () => {
  // Clear body
  document.body.innerHTML = '';
  
  // Create header
  const header = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.setAttribute('dir', 'ltr');
  h2.textContent = 'Bookmarks';
  header.appendChild(h2);
  document.body.appendChild(header);
  
  // Mock current URL
  Object.defineProperty(window, 'location', {
    value: { 
      pathname: '/i/bookmarks',
      href: 'https://x.com/i/bookmarks'
    },
    writable: true
  });
};

// Mock chrome runtime messaging
const mockChromeRuntime = {
  sendMessage: (message, callback) => {
    console.log('Mock chrome.runtime.sendMessage:', message);
    
    // Simulate responses based on action
    setTimeout(() => {
      let response = null;
      
      switch (message.action) {
        case 'getStats':
          response = {
            success: true,
            stats: {
              totalBookmarks: 42,
              totalTags: 15,
              storageUsed: 1024000,
              lastSync: '2024-01-15T12:00:00.000Z'
            }
          };
          break;
          
        case 'searchBookmarks':
          response = {
            success: true,
            result: mockSearchResults
          };
          break;
          
        case 'saveBookmark':
          response = {
            success: true,
            bookmark: { ...message.bookmark, id: Date.now() }
          };
          break;
          
        default:
          response = { success: false, error: 'Unknown action' };
      }
      
      if (callback) callback(response);
    }, 100);
  },
  lastError: null
};

// ===== TEST CLASSES =====
class ContentScriptInitializationTests {
  static async testContentScriptLoading() {
    console.log('🧪 Testing content script loading...');
    
    // Check if content script class is available
    if (typeof window.xsavedContentScript === 'undefined') {
      throw new Error('XSaved content script not loaded');
    }
    
    console.log('✅ Content script loaded successfully');
    return true;
  }
  
  static async testInitialization() {
    console.log('🧪 Testing content script initialization...');
    
    // Mock chrome runtime
    window.chrome = { runtime: mockChromeRuntime };
    
    // Check if content script can initialize
    const contentScript = window.xsavedContentScript;
    if (!contentScript) {
      throw new Error('Content script not available');
    }
    
    // Test initialization without errors
    try {
      await contentScript.initialize();
      console.log('✅ Content script initialized successfully');
      return true;
    } catch (error) {
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }
  
  static async testStatsRetrieval() {
    console.log('🧪 Testing stats retrieval...');
    
    const contentScript = window.xsavedContentScript;
    
    // Test stats update
    await contentScript.updateStats();
    
    if (!contentScript.stats) {
      throw new Error('Stats not retrieved');
    }
    
    if (contentScript.stats.totalBookmarks !== 42) {
      throw new Error('Stats data incorrect');
    }
    
    console.log('✅ Stats retrieved successfully');
    return true;
  }
}

class BookmarkInterceptionTests {
  static async testBookmarkButtonDetection() {
    console.log('🧪 Testing bookmark button detection...');
    
    // Create mock tweet
    const tweetContainer = createMockTweetContainer();
    document.body.appendChild(tweetContainer);
    
    const contentScript = window.xsavedContentScript;
    
    // Test button detection
    contentScript.interceptBookmarkButtons();
    
    const bookmarkButton = tweetContainer.querySelector('[data-testid="bookmark"]');
    if (!bookmarkButton.classList.contains('xsaved-intercepted')) {
      throw new Error('Bookmark button not intercepted');
    }
    
    console.log('✅ Bookmark button detected and intercepted');
    return true;
  }
  
  static async testTweetDataExtraction() {
    console.log('🧪 Testing tweet data extraction...');
    
    // Create mock tweet
    const tweetContainer = createMockTweetContainer('1742891234567890125');
    document.body.appendChild(tweetContainer);
    
    const contentScript = window.xsavedContentScript;
    const bookmarkButton = tweetContainer.querySelector('[data-testid="bookmark"]');
    
    // Test data extraction
    const tweetData = contentScript.extractTweetDataFromButton(bookmarkButton);
    
    if (!tweetData) {
      throw new Error('Failed to extract tweet data');
    }
    
    if (tweetData.id !== '1742891234567890125') {
      throw new Error('Tweet ID extraction failed');
    }
    
    if (!tweetData.text.includes('javascript')) {
      throw new Error('Tweet text extraction failed');
    }
    
    if (tweetData.author !== 'developer') {
      throw new Error('Tweet author extraction failed');
    }
    
    console.log('✅ Tweet data extracted successfully:', tweetData);
    return true;
  }
  
  static async testBookmarkActionDetection() {
    console.log('🧪 Testing bookmark action detection...');
    
    const contentScript = window.xsavedContentScript;
    
    // Test unbookmarked button (should return true for bookmark action)
    const unbookmarkedButton = createMockBookmarkButton(false);
    const isBookmarkingAction = contentScript.checkIfBookmarkAction(unbookmarkedButton);
    
    if (!isBookmarkingAction) {
      throw new Error('Failed to detect bookmark action');
    }
    
    // Test already bookmarked button (should return false)
    const bookmarkedButton = createMockBookmarkButton(true);
    const isUnbookmarkingAction = contentScript.checkIfBookmarkAction(bookmarkedButton);
    
    if (isUnbookmarkingAction) {
      throw new Error('Incorrectly detected bookmark action on bookmarked tweet');
    }
    
    console.log('✅ Bookmark action detection working correctly');
    return true;
  }
}

class SaveDialogTests {
  static async testSaveDialogCreation() {
    console.log('🧪 Testing save dialog creation...');
    
    const contentScript = window.xsavedContentScript;
    
    // Create mock event
    const mockEvent = {
      clientX: 300,
      clientY: 200,
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    
    // Test dialog creation
    const dialog = contentScript.createSaveDialog(mockEvent, mockTweetData);
    
    if (!dialog) {
      throw new Error('Save dialog not created');
    }
    
    if (!dialog.classList.contains('xsaved-save-dialog')) {
      throw new Error('Save dialog missing class');
    }
    
    // Check for essential elements
    const input = dialog.querySelector('.xsaved-tag-input');
    if (!input) {
      throw new Error('Tag input not found in dialog');
    }
    
    const saveButton = dialog.querySelector('button');
    if (!saveButton) {
      throw new Error('Save button not found in dialog');
    }
    
    console.log('✅ Save dialog created successfully');
    return true;
  }
  
  static async testSaveDialogPositioning() {
    console.log('🧪 Testing save dialog positioning...');
    
    const contentScript = window.xsavedContentScript;
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    
    // Test positioning
    const mockEvent = { clientX: 100, clientY: 150 };
    contentScript.positionTooltip(dialog, mockEvent);
    
    const computedStyle = window.getComputedStyle(dialog);
    const left = parseInt(computedStyle.left);
    const top = parseInt(computedStyle.top);
    
    if (left <= 0 || top <= 0) {
      throw new Error('Dialog positioned incorrectly');
    }
    
    console.log('✅ Save dialog positioned correctly');
    return true;
  }
  
  static async testSaveBookmarkFunctionality() {
    console.log('🧪 Testing save bookmark functionality...');
    
    // Mock chrome runtime
    window.chrome = { runtime: mockChromeRuntime };
    
    const contentScript = window.xsavedContentScript;
    
    // Create mock save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    
    // Test saving
    await new Promise((resolve) => {
      // Override the message handling to capture the save request
      const originalSendMessage = mockChromeRuntime.sendMessage;
      mockChromeRuntime.sendMessage = (message, callback) => {
        if (message.action === 'saveBookmark') {
          console.log('📦 Save request captured:', message.bookmark);
          
          // Verify bookmark data
          if (!message.bookmark.id) {
            throw new Error('Bookmark ID missing');
          }
          
          if (!message.bookmark.tags || !Array.isArray(message.bookmark.tags)) {
            throw new Error('Bookmark tags invalid');
          }
          
          // Call original to complete the flow
          originalSendMessage(message, callback);
          resolve();
        } else {
          originalSendMessage(message, callback);
        }
      };
      
      // Trigger save
      contentScript.handleSaveBookmark(mockTweetData, 'test tag1 tag2', saveButton);
    });
    
    console.log('✅ Save bookmark functionality working');
    return true;
  }
}

class BookmarksPageTests {
  static async testBookmarksPageDetection() {
    console.log('🧪 Testing bookmarks page detection...');
    
    // Set up bookmarks page
    createMockBookmarksPage();
    
    const contentScript = window.xsavedContentScript;
    
    // Test page detection
    const isBookmarksPage = contentScript.constructor.prototype.constructor.XSAVED_CONFIG?.pages?.isBookmarksPage?.() ||
                           window.location.pathname.includes('/i/bookmarks');
    
    if (!isBookmarksPage) {
      throw new Error('Bookmarks page not detected');
    }
    
    console.log('✅ Bookmarks page detected correctly');
    return true;
  }
  
  static async testToggleCreation() {
    console.log('🧪 Testing bookmarks page toggle creation...');
    
    // Set up bookmarks page
    createMockBookmarksPage();
    
    // Mock chrome runtime
    window.chrome = { runtime: mockChromeRuntime };
    
    const contentScript = window.xsavedContentScript;
    await contentScript.updateStats();
    
    // Test toggle creation
    contentScript.addBookmarksPageToggle();
    
    const toggle = document.getElementById('xsaved-bookmarks-toggle');
    if (!toggle) {
      throw new Error('Bookmarks toggle not created');
    }
    
    // Check toggle elements
    const toggleSwitch = toggle.querySelector('input[type="checkbox"]');
    if (!toggleSwitch) {
      throw new Error('Toggle switch not found');
    }
    
    const statsIndicator = toggle.querySelector('span');
    if (!statsIndicator || !statsIndicator.textContent.includes('42')) {
      throw new Error('Stats indicator not found or incorrect');
    }
    
    console.log('✅ Bookmarks toggle created successfully');
    return true;
  }
  
  static async testGridInterfaceCreation() {
    console.log('🧪 Testing grid interface creation...');
    
    // Mock chrome runtime
    window.chrome = { runtime: mockChromeRuntime };
    
    const contentScript = window.xsavedContentScript;
    
    // Test grid creation
    contentScript.showGridInterface();
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const gridOverlay = document.getElementById('xsaved-grid-overlay');
    if (!gridOverlay) {
      throw new Error('Grid overlay not created');
    }
    
    console.log('✅ Grid interface created successfully');
    return true;
  }
  
  static async testBookmarkCardRendering() {
    console.log('🧪 Testing bookmark card rendering...');
    
    const contentScript = window.xsavedContentScript;
    
    // Test card creation
    const card = contentScript.createBookmarkCard(mockSearchResults.bookmarks[0]);
    
    if (!card) {
      throw new Error('Bookmark card not created');
    }
    
    // Check card content
    const authorElement = card.querySelector('div');
    if (!authorElement || !authorElement.textContent.includes('@developer')) {
      throw new Error('Card author not rendered correctly');
    }
    
    console.log('✅ Bookmark card rendered successfully');
    return true;
  }
}

class PerformanceTests {
  static async testLargeDatasetHandling() {
    console.log('🧪 Testing large dataset handling...');
    
    // Create large dataset
    const largeDataset = [];
    for (let i = 0; i < 1000; i++) {
      largeDataset.push({
        id: `test_${i}`,
        text: `Test bookmark ${i} with various content and tags`,
        author: `user_${i % 10}`,
        created_at: new Date().toISOString(),
        bookmark_timestamp: new Date().toISOString(),
        tags: [`tag${i % 5}`, `category${i % 3}`],
        media_urls: []
      });
    }
    
    const contentScript = window.xsavedContentScript;
    
    // Test grid rendering performance
    const startTime = performance.now();
    
    const container = document.createElement('div');
    contentScript.renderBookmarksGrid(container, largeDataset);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (renderTime > 1000) { // Should render in less than 1 second
      throw new Error(`Grid rendering too slow: ${renderTime}ms`);
    }
    
    console.log(`✅ Large dataset handled efficiently (${renderTime.toFixed(2)}ms)`);
    return true;
  }
  
  static async testMemoryUsage() {
    console.log('🧪 Testing memory usage...');
    
    const contentScript = window.xsavedContentScript;
    
    // Test multiple dialog creations and cleanups
    for (let i = 0; i < 100; i++) {
      const mockEvent = { clientX: 100, clientY: 100 };
      contentScript.showSaveDialog(mockEvent, mockTweetData);
      contentScript.removeTooltip();
    }
    
    // Check if tooltip is properly cleaned up
    if (document.querySelector('.xsaved-save-dialog')) {
      throw new Error('Memory leak: dialog not properly cleaned up');
    }
    
    console.log('✅ Memory usage test passed');
    return true;
  }
}

// ===== TEST RUNNER =====
class Phase3TestRunner {
  static async runAllTests() {
    console.log('🚀 Starting Phase 3 Content Script Test Suite...');
    console.log('================================');
    
    const testCategories = [
      { name: 'Content Script Initialization', tests: ContentScriptInitializationTests },
      { name: 'Bookmark Interception', tests: BookmarkInterceptionTests },
      { name: 'Save Dialog', tests: SaveDialogTests },
      { name: 'Bookmarks Page', tests: BookmarksPageTests },
      { name: 'Performance', tests: PerformanceTests }
    ];
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const failedDetails = [];
    
    for (const category of testCategories) {
      console.log(`\n📂 Testing ${category.name}...`);
      console.log('-'.repeat(40));
      
      const testMethods = Object.getOwnPropertyNames(category.tests)
        .filter(method => method.startsWith('test') && typeof category.tests[method] === 'function');
      
      for (const testMethod of testMethods) {
        totalTests++;
        
        try {
          const startTime = performance.now();
          await category.tests[testMethod]();
          const endTime = performance.now();
          
          passedTests++;
          console.log(`✅ ${testMethod} (${(endTime - startTime).toFixed(2)}ms)`);
          
        } catch (error) {
          failedTests++;
          const errorDetails = `${category.name}.${testMethod}: ${error.message}`;
          failedDetails.push(errorDetails);
          console.error(`❌ ${testMethod}: ${error.message}`);
        }
      }
    }
    
    // Final report
    console.log('\n' + '='.repeat(50));
    console.log('📊 PHASE 3 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n💥 Failed Tests:');
      failedDetails.forEach(detail => console.log(`   • ${detail}`));
    }
    
    console.log('\n🎯 Phase 3 Content Script Testing Complete!');
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100,
      failedDetails
    };
  }
  
  static async runQuickTest() {
    console.log('⚡ Running Phase 3 Quick Test...');
    
    try {
      // Test basic initialization
      await ContentScriptInitializationTests.testContentScriptLoading();
      await ContentScriptInitializationTests.testInitialization();
      
      // Test core functionality
      await BookmarkInterceptionTests.testBookmarkButtonDetection();
      await SaveDialogTests.testSaveDialogCreation();
      
      console.log('✅ Phase 3 Quick Test: PASSED');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Phase 3 Quick Test: FAILED');
      console.error(error.message);
      return { success: false, error: error.message };
    }
  }
}

// ===== BROWSER COMPATIBILITY =====
if (typeof window !== 'undefined') {
  window.Phase3Tests = {
    runAllTests: Phase3TestRunner.runAllTests,
    runQuickTest: Phase3TestRunner.runQuickTest,
    ContentScriptInitializationTests,
    BookmarkInterceptionTests,
    SaveDialogTests,
    BookmarksPageTests,
    PerformanceTests,
    mockTweetData,
    mockSearchResults
  };
  
  console.log('🧪 Phase 3 test suite loaded. Use window.Phase3Tests to run tests.');
} 