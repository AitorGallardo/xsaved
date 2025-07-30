/**
 * Common helper functions and error classes
 * Adapted from the proven chrome_extension implementation
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
          console.warn(`Rate limit hit. Attempt ${attempt + 1}/${maxRetries + 1}`);
        } else {
          console.warn(`Operation failed. Retrying (${attempt + 1}/${maxRetries + 1})`, error.message);
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
        if (this.retryAfter < 0) this.retryAfter = 5000; // Fallback if date is in the past
      }
    }
  }
}

/**
 * Error class for thread extraction failures
 */
export class ThreadExtractionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ThreadExtractionError";
    this.details = details;
  }
}

/**
 * Error class for API response parsing issues
 */
export class ParseError extends Error {
  constructor(message, response = null) {
    super(message);
    this.name = "ParseError";
    this.response = response;
  }
}

/**
 * Safely parse JSON with error handling
 * @param {String} text - JSON text to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed JSON or default value
 */
export const safeJsonParse = (text, defaultValue = null) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
};

/**
 * Safely access objects with deep property paths
 * @param {Object} obj - Object to access
 * @param {String|Array} path - Property path (e.g. "a.b.c" or ["a", "b", "c"])
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value at path or default value
 */
export const getIn = (obj, path, defaultValue = null) => {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
};

/**
 * Log an error with context information
 * @param {Error} error - The error object
 * @param {String} context - Context description
 * @param {Object} extraData - Additional data to log
 */
export const logError = (error, context, extraData = {}) => {
  console.error(`[${context}] Error:`, error.message, {
    name: error.name,
    stack: error.stack,
    ...extraData
  });
  
  // Attempt to store in chrome.storage for debugging
  try {
    chrome.storage.local.get(['errorLog'], (result) => {
      const errorLog = result.errorLog || [];
      errorLog.push({
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        name: error.name,
        ...extraData
      });
      
      // Keep only last 50 errors
      if (errorLog.length > 50) {
        errorLog.splice(0, errorLog.length - 50);
      }
      
      chrome.storage.local.set({ errorLog });
    });
  } catch (e) {
    console.warn('Could not log error to chrome.storage:', e);
  }
}; 