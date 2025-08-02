/**
 * XSaved Extension v2 - Helper Utilities
 * Common helper functions and error classes
 * Adapted from proven v1 extension with enhancements
 */

/**
 * Delay execution for specified milliseconds
 * @param {Number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a retry function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @param {Number} options.maxRetries - Maximum number of retries
 * @param {Number} options.baseDelay - Base delay in milliseconds
 * @param {Boolean} options.jitter - Whether to add randomness to delay
 * @returns {Function} A wrapped function with retry logic
 */
export const withRetry = (fn, options = {}) => {
  const { 
    maxRetries = 3, 
    baseDelay = 1000, 
    jitter = true 
  } = options;
  
  return async (...args) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        // Don't retry if we've hit the max retries
        if (attempt >= maxRetries) break;
        
        // Special handling for rate limit errors
        const isRateLimit = error instanceof RateLimitError;
        if (isRateLimit) {
          console.warn(`⏱️ Rate limit hit. Attempt ${attempt + 1}/${maxRetries + 1}`);
        } else {
          console.warn(`🔄 Operation failed. Retrying (${attempt + 1}/${maxRetries + 1})`, error.message);
        }
        
        // Calculate delay with exponential backoff
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        
        // Add jitter if enabled (±10% variation)
        const finalDelay = jitter 
          ? exponentialDelay * (0.9 + Math.random() * 0.2) 
          : exponentialDelay;
        
        // Wait before retrying
        await delay(finalDelay);
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  };
};

/**
 * Error class for network-related errors
 */
export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Error class for rate limiting
 */
export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = null; // Can be set if server returns Retry-After header
  }
  
  /**
   * Set retry time from headers
   * @param {Headers} headers - Response headers
   */
  setRetryAfterFromHeaders(headers) {
    const retryAfter = headers.get('Retry-After');
    if (retryAfter) {
      // Convert to milliseconds (either seconds or date string)
      if (/^\d+$/.test(retryAfter)) {
        // It's seconds
        this.retryAfter = parseInt(retryAfter, 10) * 1000;
      } else {
        // It's a date string
        const retryDate = new Date(retryAfter);
        this.retryAfter = retryDate.getTime() - Date.now();
      }
    }
  }
}

/**
 * Safe JSON parsing with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('🔍 JSON parse failed, using fallback:', error.message);
    return fallback;
  }
};

/**
 * Get nested object property safely
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-separated path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value at path or default
 */
export const getIn = (obj, path, defaultValue = undefined) => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
};

/**
 * Log error to chrome storage for debugging
 * @param {string} context - Context where error occurred
 * @param {Error|string} error - Error object or message
 * @param {Object} metadata - Additional metadata
 */
export const logError = async (context, error, metadata = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context,
    message: error?.message || error,
    stack: error?.stack,
    metadata,
    userAgent: navigator.userAgent
  };
  
  try {
    // Get existing error logs
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['errorLogs'], resolve);
    });
    
    const existingLogs = result.errorLogs || [];
    
    // Keep only last 100 error logs to prevent storage bloat
    const updatedLogs = [...existingLogs, errorLog].slice(-100);
    
    // Save back to storage
    await new Promise(resolve => {
      chrome.storage.local.set({ errorLogs: updatedLogs }, resolve);
    });
    
    console.error(`📝 Error logged [${context}]:`, error);
    
  } catch (storageError) {
    console.error('❌ Failed to log error to storage:', storageError);
  }
};

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return (...args) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format timestamp to relative time
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < month) return `${Math.floor(diff / week)}w ago`;
  return `${Math.floor(diff / month)}mo ago`;
};

/**
 * Generate a simple hash from string
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
export const simpleHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * Check if URL is valid
 * @param {string} urlString - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize text for safe storage/display
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 10000); // Limit length
};

/**
 * Performance monitoring wrapper
 * @param {string} label - Performance label
 * @param {Function} fn - Function to monitor
 * @returns {Function} Wrapped function with performance monitoring
 */
export const withPerformanceMonitoring = (label, fn) => {
  return async (...args) => {
    const startTime = performance.now();
    
    try {
      const result = await fn(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 100) { // Log slow operations (>100ms)
        console.warn(`⏱️ Slow operation [${label}]: ${duration.toFixed(2)}ms`);
      }
      
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`❌ Operation failed [${label}] after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
};

console.log('🛠️ XSaved v2 Helpers utility loaded - ready for error handling and utilities'); 