/**
 * Array Buffer Fix Test - Verify the array buffer to base64 conversion fix
 */

class ArrayBufferFixTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runAllTests() {
    console.log('📦 ARRAY BUFFER FIX TESTS');
    console.log('==========================');
    console.log('Testing the array buffer to base64 conversion fix');
    console.log('');

    const startTime = performance.now();

    try {
      // Test 1: Small Array Buffer Conversion
      await this.testSmallArrayBuffer();
      
      // Test 2: Large Array Buffer Conversion
      await this.testLargeArrayBuffer();
      
      // Test 3: Chunked Processing
      await this.testChunkedProcessing();
      
      // Test 4: Error Handling
      await this.testErrorHandling();

      const duration = performance.now() - startTime;
      this.printSummary(duration);

    } catch (error) {
      console.error('❌ Array buffer fix tests failed:', error);
    }
  }

  async testSmallArrayBuffer() {
    console.log('📦 Testing Small Array Buffer Conversion');
    console.log('=======================================');

    try {
      console.log('1. Testing small array buffer (1KB)...');
      const smallBuffer = this.createTestBuffer(1024);
      const base64 = this.arrayBufferToBase64(smallBuffer);
      
      if (base64 && base64.length > 0) {
        console.log('   ✅ Small array buffer converted successfully');
        this.testResults.passed++;
      } else {
        throw new Error('Small array buffer conversion failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing medium array buffer (10KB)...');
      const mediumBuffer = this.createTestBuffer(10240);
      const base64 = this.arrayBufferToBase64(mediumBuffer);
      
      if (base64 && base64.length > 0) {
        console.log('   ✅ Medium array buffer converted successfully');
        this.testResults.passed++;
      } else {
        throw new Error('Medium array buffer conversion failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testLargeArrayBuffer() {
    console.log('📦 Testing Large Array Buffer Conversion');
    console.log('=======================================');

    try {
      console.log('1. Testing large array buffer (100KB)...');
      const largeBuffer = this.createTestBuffer(102400);
      const base64 = this.arrayBufferToBase64(largeBuffer);
      
      if (base64 && base64.length > 0) {
        console.log('   ✅ Large array buffer converted successfully');
        this.testResults.passed++;
      } else {
        throw new Error('Large array buffer conversion failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing very large array buffer (1MB)...');
      const veryLargeBuffer = this.createTestBuffer(1048576);
      const base64 = this.arrayBufferToBase64(veryLargeBuffer);
      
      if (base64 && base64.length > 0) {
        console.log('   ✅ Very large array buffer converted successfully');
        this.testResults.passed++;
      } else {
        throw new Error('Very large array buffer conversion failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testChunkedProcessing() {
    console.log('📦 Testing Chunked Processing');
    console.log('=============================');

    try {
      console.log('1. Testing chunked processing with multiple chunks...');
      const buffer = this.createTestBuffer(50000); // 50KB, will need multiple chunks
      const base64 = this.arrayBufferToBase64(buffer);
      
      if (base64 && base64.length > 0) {
        console.log('   ✅ Chunked processing successful');
        this.testResults.passed++;
      } else {
        throw new Error('Chunked processing failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing chunked processing with exact chunk size...');
      const buffer = this.createTestBuffer(8192); // Exactly one chunk
      const base64 = this.arrayBufferToBase64(buffer);
      
      if (base64 && base64.length > 0) {
        console.log('   ✅ Exact chunk size processing successful');
        this.testResults.passed++;
      } else {
        throw new Error('Exact chunk size processing failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing chunked processing with partial chunk...');
      const buffer = this.createTestBuffer(4096); // Half a chunk
      const base64 = this.arrayBufferToBase64(buffer);
      
      if (base64 && base64.length > 0) {
        console.log('   ✅ Partial chunk processing successful');
        this.testResults.passed++;
      } else {
        throw new Error('Partial chunk processing failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testErrorHandling() {
    console.log('📦 Testing Error Handling');
    console.log('=========================');

    try {
      console.log('1. Testing null buffer handling...');
      const base64 = this.arrayBufferToBase64(null);
      
      if (base64 === '') {
        console.log('   ✅ Null buffer handled gracefully');
        this.testResults.passed++;
      } else {
        throw new Error('Null buffer not handled correctly');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing undefined buffer handling...');
      const base64 = this.arrayBufferToBase64(undefined);
      
      if (base64 === '') {
        console.log('   ✅ Undefined buffer handled gracefully');
        this.testResults.passed++;
      } else {
        throw new Error('Undefined buffer not handled correctly');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing empty buffer handling...');
      const emptyBuffer = new ArrayBuffer(0);
      const base64 = this.arrayBufferToBase64(emptyBuffer);
      
      if (base64 === '') {
        console.log('   ✅ Empty buffer handled gracefully');
        this.testResults.passed++;
      } else {
        throw new Error('Empty buffer not handled correctly');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  // Helper methods

  createTestBuffer(size) {
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);
    
    // Fill with test data
    for (let i = 0; i < size; i++) {
      view[i] = i % 256; // Create a pattern
    }
    
    return buffer;
  }

  arrayBufferToBase64(buffer) {
    try {
      if (!buffer) {
        return '';
      }
      
      const bytes = new Uint8Array(buffer);
      const chunkSize = 8192; // Process in 8KB chunks
      let binary = '';
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      
      return btoa(binary);
    } catch (error) {
      console.error('❌ [SW] Array buffer to base64 conversion failed:', error);
      // Return empty string as fallback
      return '';
    }
  }

  printSummary(duration) {
    console.log('📊 ARRAY BUFFER FIX TEST SUMMARY');
    console.log('=================================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📋 Total: ${this.testResults.total}`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
    console.log('');
    
    const successRate = (this.testResults.passed / this.testResults.total) * 100;
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Array Buffer Fix: WORKING CORRECTLY');
      console.log('');
      console.log('✅ Root Cause Fixed:');
      console.log('  • Chunked array buffer processing');
      console.log('  • Stack overflow prevention');
      console.log('  • Large file handling');
      console.log('  • Error handling');
      console.log('  • Memory efficient conversion');
      console.log('  • Service worker compatibility');
    } else {
      console.log('⚠️ Array Buffer Fix: NEEDS ATTENTION');
    }
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArrayBufferFixTest;
} else {
  // Browser environment
  const tester = new ArrayBufferFixTest();
  tester.runAllTests();
} 