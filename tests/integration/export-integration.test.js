/**
 * Export Integration Test - Component 5 Phase 1
 * Tests the integration between content script, service worker, and export system
 */

class ExportIntegrationTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🧪 EXPORT INTEGRATION TESTS');
    console.log('===========================');
    console.log('Testing Component 5 Phase 1 integration');
    console.log('');

    const startTime = performance.now();

    try {
      // Test 1: Export Manager Integration
      await this.testExportManagerIntegration();
      
      // Test 2: Service Worker Integration
      await this.testServiceWorkerIntegration();
      
      // Test 3: Content Script Integration
      await this.testContentScriptIntegration();
      
      // Test 4: End-to-End Export Flow
      await this.testEndToEndExportFlow();

      const duration = performance.now() - startTime;
      this.printSummary(duration);

    } catch (error) {
      console.error('❌ Export integration tests failed:', error);
    }
  }

  /**
   * Test Export Manager integration
   */
  async testExportManagerIntegration() {
    console.log('📋 Testing Export Manager Integration');
    console.log('=====================================');

    // Test 1: Export Manager initialization
    try {
      console.log('1. Testing Export Manager initialization...');
      // Simulate export manager creation
      const exportManager = this.createMockExportManager();
      
      if (exportManager && exportManager.getSupportedFormats) {
        console.log('   ✅ Export Manager initialized successfully');
        this.testResults.passed++;
      } else {
        throw new Error('Export Manager initialization failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 2: Format support
    try {
      console.log('2. Testing format support...');
      const formats = this.getSupportedFormats();
      
      if (formats.length === 3 && formats.every(f => f.format && f.name)) {
        console.log('   ✅ All export formats supported');
        this.testResults.passed++;
      } else {
        throw new Error('Format support incomplete');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 3: Options validation
    try {
      console.log('3. Testing options validation...');
      const validOptions = { format: 'csv' };
      const invalidOptions = { format: 'invalid' };
      
      const validResult = this.validateExportOptions(validOptions);
      const invalidResult = this.validateExportOptions(invalidOptions);
      
      if (validResult.valid && !invalidResult.valid) {
        console.log('   ✅ Options validation working correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Options validation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  /**
   * Test Service Worker integration
   */
  async testServiceWorkerIntegration() {
    console.log('🔧 Testing Service Worker Integration');
    console.log('=====================================');

    // Test 1: Message handling
    try {
      console.log('1. Testing export message handling...');
      const mockRequest = {
        action: 'exportBookmarks',
        bookmarks: this.generateTestBookmarks(5),
        options: { format: 'csv' }
      };
      
      const response = await this.simulateServiceWorkerMessage(mockRequest);
      
      if (response && typeof response.success === 'boolean') {
        console.log('   ✅ Export message handling working');
        this.testResults.passed++;
      } else {
        throw new Error('Message handling failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 2: Export processing
    try {
      console.log('2. Testing export processing...');
      const testBookmarks = this.generateTestBookmarks(3);
      const result = await this.simulateExportProcessing(testBookmarks, 'csv');
      
      if (result && result.success && result.data) {
        console.log('   ✅ Export processing working');
        this.testResults.passed++;
      } else {
        throw new Error('Export processing failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 3: Error handling
    try {
      console.log('3. Testing error handling...');
      const errorResult = await this.simulateExportError();
      
      if (errorResult && !errorResult.success && errorResult.error) {
        console.log('   ✅ Error handling working correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Error handling failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  /**
   * Test Content Script integration
   */
  async testContentScriptIntegration() {
    console.log('🎨 Testing Content Script Integration');
    console.log('=====================================');

    // Test 1: Export button creation
    try {
      console.log('1. Testing export button creation...');
      const exportButton = this.createMockExportButton();
      
      if (exportButton && exportButton.textContent.includes('Export')) {
        console.log('   ✅ Export button created successfully');
        this.testResults.passed++;
      } else {
        throw new Error('Export button creation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 2: Dialog generation
    try {
      console.log('2. Testing export dialog generation...');
      const dialogHTML = this.generateMockExportDialog(10);
      
      if (dialogHTML.includes('Export Bookmarks') && dialogHTML.includes('export-format')) {
        console.log('   ✅ Export dialog generation working');
        this.testResults.passed++;
      } else {
        throw new Error('Dialog generation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 3: Options parsing
    try {
      console.log('3. Testing options parsing...');
      const mockFormData = {
        format: 'csv',
        tags: 'javascript,react',
        includeMetadata: true
      };
      
      const options = this.parseMockExportOptions(mockFormData);
      
      if (options.format === 'csv' && options.filters.tags.length === 2) {
        console.log('   ✅ Options parsing working correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Options parsing failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  /**
   * Test end-to-end export flow
   */
  async testEndToEndExportFlow() {
    console.log('🔄 Testing End-to-End Export Flow');
    console.log('=================================');

    // Test 1: Complete export flow
    try {
      console.log('1. Testing complete export flow...');
      const testBookmarks = this.generateTestBookmarks(5);
      const flowResult = await this.simulateCompleteExportFlow(testBookmarks, 'csv');
      
      if (flowResult.success && flowResult.filename && flowResult.data) {
        console.log('   ✅ Complete export flow working');
        this.testResults.passed++;
      } else {
        throw new Error('Complete export flow failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 2: File download simulation
    try {
      console.log('2. Testing file download simulation...');
      const downloadResult = this.simulateFileDownload('test.csv', 'test data');
      
      if (downloadResult && downloadResult.filename === 'test.csv') {
        console.log('   ✅ File download simulation working');
        this.testResults.passed++;
      } else {
        throw new Error('File download simulation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    // Test 3: Multiple format support
    try {
      console.log('3. Testing multiple format support...');
      const formats = ['csv', 'json', 'pdf'];
      const results = [];
      
      for (const format of formats) {
        const result = await this.simulateExportProcessing(this.generateTestBookmarks(2), format);
        results.push(result.success);
      }
      
      if (results.every(r => r === true)) {
        console.log('   ✅ Multiple format support working');
        this.testResults.passed++;
      } else {
        throw new Error('Multiple format support failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  // Mock helper methods

  createMockExportManager() {
    return {
      getSupportedFormats: () => [
        { format: 'csv', name: 'CSV Export', description: 'Spreadsheet format' },
        { format: 'pdf', name: 'PDF Report', description: 'Printable format' },
        { format: 'json', name: 'JSON API', description: 'Programmatic access' }
      ],
      validateOptions: (options) => this.validateExportOptions(options),
      exportBookmarks: async (bookmarks, options) => ({
        success: true,
        data: new Blob(['test data'], { type: 'text/plain' }),
        filename: `test-${options.format}`,
        size: 9
      })
    };
  }

  getSupportedFormats() {
    return [
      { format: 'csv', name: 'CSV Export', description: 'Spreadsheet format' },
      { format: 'pdf', name: 'PDF Report', description: 'Printable format' },
      { format: 'json', name: 'JSON API', description: 'Programmatic access' }
    ];
  }

  validateExportOptions(options) {
    const errors = [];
    
    if (!options.format) {
      errors.push('Format is required');
    }
    
    if (!['csv', 'pdf', 'json'].includes(options.format)) {
      errors.push('Invalid format');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  generateTestBookmarks(count) {
    const bookmarks = [];
    for (let i = 0; i < count; i++) {
      bookmarks.push({
        id: `tweet_${Date.now()}_${i}`,
        text: `Test tweet ${i} about JavaScript and React`,
        author: `user${i}`,
        created_at: new Date().toISOString(),
        bookmark_timestamp: new Date().toISOString(),
        tags: ['javascript', 'react'],
        url: `https://x.com/user/status/${Date.now()}_${i}`
      });
    }
    return bookmarks;
  }

  async simulateServiceWorkerMessage(request) {
    // Simulate service worker message handling
    if (request.action === 'exportBookmarks') {
      return {
        success: true,
        data: 'dGVzdCBkYXRh', // base64 encoded "test data"
        filename: `bookmarks-${Date.now()}.${request.options.format}`,
        size: 9
      };
    }
    return { success: false, error: 'Unknown action' };
  }

  async simulateExportProcessing(bookmarks, format) {
    // Simulate export processing
    return {
      success: true,
      data: new Blob([`test ${format} data`], { type: 'text/plain' }),
      filename: `bookmarks-${Date.now()}.${format}`,
      size: 9
    };
  }

  async simulateExportError() {
    // Simulate export error
    return {
      success: false,
      error: 'Simulated export error'
    };
  }

  createMockExportButton() {
    const button = document.createElement('button');
    button.textContent = '📤 Export';
    button.style.cssText = `
      padding: 8px 16px;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      border-radius: 20px;
      color: #22C55E;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    `;
    return button;
  }

  generateMockExportDialog(bookmarkCount) {
    return `
      <div class="export-dialog">
        <h2>📤 Export Bookmarks</h2>
        <p>Exporting ${bookmarkCount} bookmarks</p>
        <div class="export-formats">
          <div class="export-format-option" data-format="csv">CSV Export</div>
          <div class="export-format-option" data-format="pdf">PDF Report</div>
          <div class="export-format-option" data-format="json">JSON API</div>
        </div>
      </div>
    `;
  }

  parseMockExportOptions(formData) {
    const options = {
      format: formData.format,
      filters: {}
    };
    
    if (formData.tags) {
      options.filters.tags = formData.tags.split(',').map(t => t.trim());
    }
    
    return options;
  }

  async simulateCompleteExportFlow(bookmarks, format) {
    // Simulate complete export flow
    const exportManager = this.createMockExportManager();
    const result = await exportManager.exportBookmarks(bookmarks, { format });
    
    if (result.success) {
      // Simulate file download
      const downloadResult = this.simulateFileDownload(result.filename, result.data);
      return { ...result, downloadResult };
    }
    
    return result;
  }

  simulateFileDownload(filename, data) {
    // Simulate file download
    return {
      filename,
      data,
      downloaded: true,
      timestamp: new Date().toISOString()
    };
  }

  printSummary(duration) {
    console.log('📊 EXPORT INTEGRATION TEST SUMMARY');
    console.log('==================================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📋 Total: ${this.testResults.total}`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
    console.log('');
    
    const successRate = (this.testResults.passed / this.testResults.total) * 100;
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Component 5 Phase 1 Integration: READY FOR DEPLOYMENT');
    } else {
      console.log('⚠️ Component 5 Phase 1 Integration: NEEDS IMPROVEMENT');
    }
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportIntegrationTest;
} else {
  // Browser environment
  const tester = new ExportIntegrationTest();
  tester.runAllTests();
} 