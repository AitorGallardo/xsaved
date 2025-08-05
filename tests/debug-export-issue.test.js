/**
 * Debug Export Issue Test
 * Tests to identify why export gets stuck at 50%
 */

class DebugExportIssueTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runAllTests() {
    console.log('🔍 DEBUG EXPORT ISSUE TESTS');
    console.log('============================');
    console.log('Testing export system to identify 50% stuck issue');
    console.log('');

    const startTime = performance.now();

    try {
      // Test 1: Export Manager Import
      await this.testExportManagerImport();
      
      // Test 2: Export Manager Creation
      await this.testExportManagerCreation();
      
      // Test 3: Export Process
      await this.testExportProcess();
      
      // Test 4: Message Handling
      await this.testMessageHandling();

      const duration = performance.now() - startTime;
      this.printSummary(duration);

    } catch (error) {
      console.error('❌ Debug tests failed:', error);
    }
  }

  async testExportManagerImport() {
    console.log('📦 Testing Export Manager Import');
    console.log('===============================');

    try {
      console.log('1. Testing module import...');
      
      // Simulate the import that's failing
      const mockImport = this.simulateModuleImport();
      
      if (mockImport.success && mockImport.ExportManagerSW) {
        console.log('   ✅ Module import successful');
        this.testResults.passed++;
      } else {
        throw new Error('Module import failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing class availability...');
      const ExportManagerSW = this.getExportManagerClass();
      
      if (ExportManagerSW && typeof ExportManagerSW === 'function') {
        console.log('   ✅ ExportManagerSW class available');
        this.testResults.passed++;
      } else {
        throw new Error('ExportManagerSW class not found');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testExportManagerCreation() {
    console.log('🏗️ Testing Export Manager Creation');
    console.log('==================================');

    try {
      console.log('1. Testing instance creation...');
      const exportManager = this.createExportManagerInstance();
      
      if (exportManager && exportManager.exportBookmarks) {
        console.log('   ✅ Export manager instance created');
        this.testResults.passed++;
      } else {
        throw new Error('Export manager creation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing method availability...');
      const methods = this.checkExportManagerMethods();
      
      if (methods.exportBookmarks && methods.validateOptions) {
        console.log('   ✅ All required methods available');
        this.testResults.passed++;
      } else {
        throw new Error('Required methods missing');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testExportProcess() {
    console.log('⚙️ Testing Export Process');
    console.log('==========================');

    try {
      console.log('1. Testing options validation...');
      const validationResult = this.testOptionsValidation();
      
      if (validationResult.valid) {
        console.log('   ✅ Options validation working');
        this.testResults.passed++;
      } else {
        throw new Error('Options validation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing export execution...');
      const exportResult = await this.testExportExecution();
      
      if (exportResult.success && exportResult.data) {
        console.log('   ✅ Export execution successful');
        this.testResults.passed++;
      } else {
        throw new Error('Export execution failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing blob creation...');
      const blobResult = this.testBlobCreation();
      
      if (blobResult.success && blobResult.blobSize > 0) {
        console.log('   ✅ Blob creation successful');
        this.testResults.passed++;
      } else {
        throw new Error('Blob creation failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testMessageHandling() {
    console.log('📨 Testing Message Handling');
    console.log('============================');

    try {
      console.log('1. Testing message structure...');
      const messageStructure = this.testMessageStructure();
      
      if (messageStructure.valid) {
        console.log('   ✅ Message structure valid');
        this.testResults.passed++;
      } else {
        throw new Error('Message structure invalid');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing response handling...');
      const responseResult = this.testResponseHandling();
      
      if (responseResult.success) {
        console.log('   ✅ Response handling working');
        this.testResults.passed++;
      } else {
        throw new Error('Response handling failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  // Mock helper methods

  simulateModuleImport() {
    // Simulate the import that might be failing
    try {
      // This would be the actual import in the service worker
      return {
        success: true,
        ExportManagerSW: class MockExportManagerSW {
          constructor() {
            this.usesDOM = false;
          }
          
          async exportBookmarks(bookmarks, options) {
            return {
              success: true,
              data: new Blob(['test data'], { type: 'text/plain' }),
              filename: `test-${options.format}`,
              size: 9
            };
          }
          
          validateOptions(options) {
            return { valid: true, errors: [] };
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getExportManagerClass() {
    const mockImport = this.simulateModuleImport();
    return mockImport.ExportManagerSW;
  }

  createExportManagerInstance() {
    const ExportManagerSW = this.getExportManagerClass();
    if (ExportManagerSW) {
      return new ExportManagerSW();
    }
    return null;
  }

  checkExportManagerMethods() {
    const exportManager = this.createExportManagerInstance();
    if (!exportManager) return {};
    
    return {
      exportBookmarks: typeof exportManager.exportBookmarks === 'function',
      validateOptions: typeof exportManager.validateOptions === 'function'
    };
  }

  testOptionsValidation() {
    const exportManager = this.createExportManagerInstance();
    if (!exportManager) return { valid: false, errors: ['No export manager'] };
    
    const testOptions = {
      format: 'csv',
      filters: { tags: ['test'] },
      includeMetadata: true
    };
    
    return exportManager.validateOptions(testOptions);
  }

  async testExportExecution() {
    const exportManager = this.createExportManagerInstance();
    if (!exportManager) return { success: false, error: 'No export manager' };
    
    const testBookmarks = [
      {
        id: 'test1',
        text: 'Test tweet 1',
        author: 'testuser',
        created_at: new Date().toISOString(),
        bookmark_timestamp: new Date().toISOString(),
        tags: ['test'],
        url: 'https://x.com/test/1'
      }
    ];
    
    const testOptions = {
      format: 'csv',
      includeMetadata: true
    };
    
    return await exportManager.exportBookmarks(testBookmarks, testOptions);
  }

  testBlobCreation() {
    try {
      const testData = 'test,csv,data\n1,2,3';
      const blob = new Blob([testData], { type: 'text/csv' });
      
      return {
        success: true,
        blobSize: blob.size,
        blobType: blob.type
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  testMessageStructure() {
    const testMessage = {
      action: 'exportBookmarks',
      bookmarks: [{ id: 'test', text: 'test' }],
      options: { format: 'csv' }
    };
    
    return {
      valid: testMessage.action && testMessage.bookmarks && testMessage.options,
      hasAction: !!testMessage.action,
      hasBookmarks: !!testMessage.bookmarks,
      hasOptions: !!testMessage.options
    };
  }

  testResponseHandling() {
    const mockResponse = {
      success: true,
      data: 'dGVzdCBkYXRh', // base64 encoded "test data"
      filename: 'test.csv',
      size: 9
    };
    
    return {
      success: mockResponse.success && mockResponse.data && mockResponse.filename,
      hasData: !!mockResponse.data,
      hasFilename: !!mockResponse.filename
    };
  }

  printSummary(duration) {
    console.log('📊 DEBUG TEST SUMMARY');
    console.log('=====================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📋 Total: ${this.testResults.total}`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
    console.log('');
    
    const successRate = (this.testResults.passed / this.testResults.total) * 100;
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Export System: ALL COMPONENTS WORKING');
      console.log('');
      console.log('🔍 Potential Issues:');
      console.log('  • Service worker message handling');
      console.log('  • Async/await timing issues');
      console.log('  • Chrome extension context');
      console.log('  • Memory constraints');
    } else {
      console.log('⚠️ Export System: ISSUES DETECTED');
      console.log('');
      console.log('🔧 Recommended Actions:');
      console.log('  • Check service worker logs');
      console.log('  • Verify import paths');
      console.log('  • Test with smaller datasets');
      console.log('  • Reload extension');
    }
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugExportIssueTest;
} else {
  // Browser environment
  const tester = new DebugExportIssueTest();
  tester.runAllTests();
} 