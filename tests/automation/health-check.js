/**
 * XSaved Extension v2 - Automated Health Check
 * 
 * Quick validation script for CI/CD pipelines and pre-commit hooks.
 * Tests only the most critical components to ensure basic functionality.
 * 
 * Usage:
 *   - Pre-commit hooks
 *   - CI/CD pipelines  
 *   - Automated monitoring
 *   - Quick development validation
 */

// ===============================
// HEALTH CHECK CONFIGURATION
// ===============================

const HEALTH_CHECK_CONFIG = {
  TIMEOUT: 10000,           // 10s max for health check
  CRITICAL_TESTS: [
    'serviceWorkerResponsive',
    'stateManagement',
    'localStorageBasic'
  ],
  MAX_RETRIES: 2,           // Retry failed tests
  RETRY_DELAY: 1000         // 1s between retries
};

// ===============================
// CRITICAL TEST IMPLEMENTATIONS
// ===============================

class HealthCheckTests {
  
  /**
   * Test 1: Service Worker Responsive
   * Minimal test to ensure service worker is running
   */
  static async serviceWorkerResponsive() {
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Service worker timeout'));
        }, 3000);
        
        chrome.runtime.sendMessage({ action: "testMessage" }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (!response || !response.success) {
        throw new Error('Service worker not responding correctly');
      }
      
      return { status: 'PASS', responseTime: Date.now() - response.timestamp };
      
    } catch (error) {
      return { status: 'FAIL', error: error.message };
    }
  }

  /**
   * Test 2: State Management
   * Verify basic state retrieval works
   */
  static async stateManagement() {
    try {
      const state = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('State retrieval timeout'));
        }, 2000);
        
        chrome.runtime.sendMessage({ action: "getProgress" }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      // Check required fields
      const requiredFields = ['isExtracting', 'extractionState'];
      for (const field of requiredFields) {
        if (!(field in state)) {
          throw new Error(`Missing required state field: ${field}`);
        }
      }
      
      return { status: 'PASS', fields: Object.keys(state).length };
      
    } catch (error) {
      return { status: 'FAIL', error: error.message };
    }
  }

  /**
   * Test 3: Local Storage Basic
   * Minimal storage test to verify data layer works
   */
  static async localStorageBasic() {
    try {
      const testKey = `health_check_${Date.now()}`;
      const testData = { id: 'test', timestamp: Date.now() };
      
      // Test write
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [testKey]: testData }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      
      // Test read
      const retrieved = await new Promise((resolve, reject) => {
        chrome.storage.local.get([testKey], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
      
      // Verify data integrity
      if (!retrieved[testKey] || retrieved[testKey].id !== testData.id) {
        throw new Error('Data integrity check failed');
      }
      
      // Cleanup
      await new Promise((resolve) => {
        chrome.storage.local.remove([testKey], resolve);
      });
      
      return { status: 'PASS', dataIntegrity: true };
      
    } catch (error) {
      return { status: 'FAIL', error: error.message };
    }
  }
}

// ===============================
// HEALTH CHECK RUNNER
// ===============================

class HealthChecker {
  
  static async runHealthCheck() {
    console.log('🏥 Starting XSaved Extension Health Check...');
    const startTime = Date.now();
    
    const results = {
      summary: {
        status: 'UNKNOWN',
        timestamp: new Date().toISOString(),
        duration: 0,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0
      },
      tests: [],
      healthy: false
    };
    
    // Run critical tests
    for (const testName of HEALTH_CHECK_CONFIG.CRITICAL_TESTS) {
      const testMethod = HealthCheckTests[testName];
      
      if (!testMethod) {
        console.error(`❌ Test method not found: ${testName}`);
        continue;
      }
      
      console.log(`🧪 Running: ${testName}`);
      let testResult = null;
      let attempts = 0;
      
      // Retry logic for failed tests
      while (attempts <= HEALTH_CHECK_CONFIG.MAX_RETRIES) {
        try {
          testResult = await Promise.race([
            testMethod(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Test timeout')), HEALTH_CHECK_CONFIG.TIMEOUT)
            )
          ]);
          
          if (testResult.status === 'PASS') {
            break; // Success, no retry needed
          }
          
        } catch (error) {
          testResult = { status: 'FAIL', error: error.message };
        }
        
        attempts++;
        if (attempts <= HEALTH_CHECK_CONFIG.MAX_RETRIES) {
          console.log(`🔄 Retrying ${testName} (attempt ${attempts + 1})`);
          await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_CONFIG.RETRY_DELAY));
        }
      }
      
      // Record result
      results.tests.push({
        name: testName,
        status: testResult.status,
        attempts,
        ...testResult
      });
      
      results.summary.testsRun++;
      if (testResult.status === 'PASS') {
        results.summary.testsPassed++;
        console.log(`✅ ${testName}: PASSED`);
      } else {
        results.summary.testsFailed++;
        console.log(`❌ ${testName}: FAILED - ${testResult.error}`);
      }
    }
    
    // Calculate final status
    results.summary.duration = Date.now() - startTime;
    results.healthy = results.summary.testsFailed === 0;
    results.summary.status = results.healthy ? 'HEALTHY' : 'UNHEALTHY';
    
    // Display summary
    console.log('');
    console.log('📋 HEALTH CHECK SUMMARY');
    console.log('======================');
    console.log(`Status: ${results.summary.status}`);
    console.log(`Tests: ${results.summary.testsPassed}/${results.summary.testsRun} passed`);
    console.log(`Duration: ${results.summary.duration}ms`);
    
    if (!results.healthy) {
      console.log('');
      console.log('❌ FAILED TESTS:');
      results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => console.log(`   - ${test.name}: ${test.error}`));
    }
    
    return results;
  }
  
  /**
   * Exit code compatible health check for CI/CD
   */
  static async runWithExitCode() {
    try {
      const results = await this.runHealthCheck();
      
      if (results.healthy) {
        console.log('✅ Health check PASSED');
        if (typeof process !== 'undefined' && process.exit) {
          process.exit(0);
        }
        return 0;
      } else {
        console.log('❌ Health check FAILED');
        if (typeof process !== 'undefined' && process.exit) {
          process.exit(1);
        }
        return 1;
      }
      
    } catch (error) {
      console.error('💥 Health check ERROR:', error.message);
      if (typeof process !== 'undefined' && process.exit) {
        process.exit(2);
      }
      return 2;
    }
  }
}

// ===============================
// EXPORT & CONSOLE ACCESS
// ===============================

// Make available in browser console
if (typeof window !== 'undefined') {
  window.HealthChecker = HealthChecker;
  console.log('🏥 Health Checker loaded! Run: HealthChecker.runHealthCheck()');
}

// Node.js/automation export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HealthChecker, HealthCheckTests };
}

// Direct execution in Node.js
if (typeof require !== 'undefined' && require.main === module) {
  console.log('🤖 Running automated health check...');
  HealthChecker.runWithExitCode();
}

export { HealthChecker, HealthCheckTests }; 