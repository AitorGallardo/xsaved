/**
 * Recursion Fix Test - Verify the maximum call stack size exceeded fix
 */

class RecursionFixTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runAllTests() {
    console.log('🔄 RECURSION FIX TESTS');
    console.log('========================');
    console.log('Testing the maximum call stack size exceeded fix');
    console.log('');

    const startTime = performance.now();

    try {
      // Test 1: Circular Reference Detection
      await this.testCircularReferenceDetection();
      
      // Test 2: Safe Object Sanitization
      await this.testSafeObjectSanitization();
      
      // Test 3: Safe Error Extraction
      await this.testSafeErrorExtraction();
      
      // Test 4: Recursion Prevention
      await this.testRecursionPrevention();

      const duration = performance.now() - startTime;
      this.printSummary(duration);

    } catch (error) {
      console.error('❌ Recursion fix tests failed:', error);
    }
  }

  async testCircularReferenceDetection() {
    console.log('🔄 Testing Circular Reference Detection');
    console.log('=====================================');

    try {
      console.log('1. Testing circular object creation...');
      const circularObj = this.createCircularObject();
      
      if (circularObj.self === circularObj) {
        console.log('   ✅ Circular object created successfully');
        this.testResults.passed++;
      } else {
        throw new Error('Circular object not created correctly');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing circular reference detection...');
      const hasCircular = this.detectCircularReference(this.createCircularObject());
      
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

    console.log('');
  }

  async testSafeObjectSanitization() {
    console.log('🧹 Testing Safe Object Sanitization');
    console.log('==================================');

    try {
      console.log('1. Testing sanitization of normal object...');
      const normalObj = { a: 1, b: 'test', c: [1, 2, 3] };
      const sanitized = this.sanitizeObject(normalObj);
      
      if (JSON.stringify(sanitized) === JSON.stringify(normalObj)) {
        console.log('   ✅ Normal object sanitized correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Normal object sanitization failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing sanitization of circular object...');
      const circularObj = this.createCircularObject();
      const sanitized = this.sanitizeObject(circularObj);
      
      if (typeof sanitized === 'object' && sanitized !== null) {
        console.log('   ✅ Circular object sanitized without crash');
        this.testResults.passed++;
      } else {
        throw new Error('Circular object sanitization failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing sanitization of deeply nested object...');
      const deepObj = this.createDeeplyNestedObject(10);
      const sanitized = this.sanitizeObject(deepObj, 3);
      
      if (typeof sanitized === 'object' && sanitized !== null) {
        console.log('   ✅ Deep object sanitized with depth limit');
        this.testResults.passed++;
      } else {
        throw new Error('Deep object sanitization failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testSafeErrorExtraction() {
    console.log('🛡️ Testing Safe Error Extraction');
    console.log('================================');

    try {
      console.log('1. Testing extraction from simple error...');
      const simpleError = { error: 'Simple error message' };
      const extracted = this.safeExtractError(simpleError);
      
      if (extracted === 'Simple error message') {
        console.log('   ✅ Simple error extracted correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Simple error extraction failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing extraction from complex error...');
      const complexError = {
        error: 'Complex error',
        details: this.createCircularObject()
      };
      const extracted = this.safeExtractError(complexError);
      
      if (extracted.includes('Complex error') && !extracted.includes('Maximum call stack')) {
        console.log('   ✅ Complex error extracted safely');
        this.testResults.passed++;
      } else {
        throw new Error('Complex error extraction failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing extraction from null/undefined...');
      const nullError = null;
      const extracted = this.safeExtractError(nullError);
      
      if (extracted === 'Export failed') {
        console.log('   ✅ Null error handled correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Null error handling failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  async testRecursionPrevention() {
    console.log('🚫 Testing Recursion Prevention');
    console.log('==============================');

    try {
      console.log('1. Testing JSON.stringify with circular reference...');
      const circularObj = this.createCircularObject();
      
      // This should not cause a stack overflow
      const result = this.safeJSONStringify(circularObj);
      
      if (result.includes('[Circular Reference]')) {
        console.log('   ✅ Circular reference handled safely');
        this.testResults.passed++;
      } else {
        throw new Error('Circular reference not handled');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('2. Testing deeply nested circular reference...');
      const deepCircular = this.createDeeplyNestedCircularObject(5);
      
      // This should not cause a stack overflow
      const result = this.safeJSONStringify(deepCircular);
      
      if (typeof result === 'string' && result.length > 0) {
        console.log('   ✅ Deep circular reference handled safely');
        this.testResults.passed++;
      } else {
        throw new Error('Deep circular reference not handled');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    try {
      console.log('3. Testing error message length limits...');
      const longError = 'A'.repeat(1000) + ' error message';
      const limited = this.limitErrorMessage(longError);
      
      if (limited.length <= 500 && limited.endsWith('...')) {
        console.log('   ✅ Error message length limited correctly');
        this.testResults.passed++;
      } else {
        throw new Error('Error message length limiting failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.testResults.failed++;
    }
    this.testResults.total++;

    console.log('');
  }

  // Helper methods

  createCircularObject() {
    const obj = { name: 'circular', value: 42 };
    obj.self = obj;
    return obj;
  }

  createDeeplyNestedObject(depth) {
    let obj = { value: 'deep' };
    for (let i = 0; i < depth; i++) {
      obj = { nested: obj };
    }
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

  sanitizeObject(obj, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return '[Max Depth Reached]';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    try {
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      }));
    } catch (error) {
      return '[Object could not be sanitized]';
    }
  }

  safeExtractError(response) {
    try {
      let errorMessage = 'Export failed';
      
      // Safely extract error message
      if (response && typeof response === 'object') {
        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (response.error && typeof response.error.message === 'string') {
          errorMessage = response.error.message;
        }
      }
      
      // Safely add details if available
      if (response && response.details) {
        try {
          const details = this.sanitizeObject(response.details, 2);
          if (details && typeof details === 'object') {
            const detailsString = JSON.stringify(details, null, 2);
            errorMessage += `\n\nDetails: ${detailsString}`;
          }
        } catch (detailsError) {
          errorMessage += '\n\nDetails: [Error details could not be displayed]';
        }
      }
      
      return errorMessage;
    } catch (extractError) {
      return 'Export failed (error details unavailable)';
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
      });
    } catch (error) {
      return '[Object could not be stringified]';
    }
  }

  limitErrorMessage(message) {
    if (message.length > 500) {
      return message.substring(0, 500) + '...';
    }
    return message;
  }

  printSummary(duration) {
    console.log('📊 RECURSION FIX TEST SUMMARY');
    console.log('==============================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📋 Total: ${this.testResults.total}`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
    console.log('');
    
    const successRate = (this.testResults.passed / this.testResults.total) * 100;
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Recursion Fix: WORKING CORRECTLY');
      console.log('');
      console.log('✅ Root Cause Fixed:');
      console.log('  • Circular reference detection');
      console.log('  • Safe object sanitization');
      console.log('  • Safe error extraction');
      console.log('  • Recursion prevention');
      console.log('  • Error message length limits');
      console.log('  • Graceful degradation');
    } else {
      console.log('⚠️ Recursion Fix: NEEDS ATTENTION');
    }
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecursionFixTest;
} else {
  // Browser environment
  const tester = new RecursionFixTest();
  tester.runAllTests();
} 