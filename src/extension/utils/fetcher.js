/**
 * XSaved Extension v2 - X.com API Fetcher
 * Real implementation for fetching bookmarks from X.com GraphQL API
 * Adapted from proven v1 extension with enhancements for IndexedDB integration
 */

import { NetworkError, RateLimitError } from './helpers.js';

// Constants
const TWITTER_URL = 'https://x.com';
const BOOKMARK_ENDPOINT = `${TWITTER_URL}/i/api/graphql/QUjXply7fA7fk05FRyajEg/Bookmarks`;
const DELETE_BOOKMARK_ENDPOINT = `${TWITTER_URL}/i/api/graphql/Wlmlj2-xzyS1GN3a6cj-mQ/DeleteBookmark`;

/**
 * Main function to fetch bookmarks from X.com API
 * @param {string|null} cursor - Pagination cursor for next batch
 * @param {string|null} csrfTokenOverride - Optional CSRF token override
 * @param {boolean} isDeltaSync - Whether this is a delta sync (smaller batches)
 * @returns {Promise<{bookmarks: Array, nextCursor: string|null}>}
 */
export const fetchBookmarksV2 = async (cursor = null, csrfTokenOverride = null, isDeltaSync = false) => {
  console.log(`📥 Fetching bookmarks batch (delta: ${isDeltaSync}, cursor: ${cursor ? 'yes' : 'none'})`);
  
  // Adjust count for delta sync - fetch smaller batches to find new content faster
  const batchSize = isDeltaSync ? 50 : 100;
  const variables = { 
    count: batchSize, 
    includePromotedContent: true, 
    ...(cursor && { cursor }) 
  };
  
  // X.com GraphQL features - these are required for the API to work properly
  const features = {
    graphql_timeline_v2_bookmark_timeline: true,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };

  // Get CSRF token
  let csrfToken = csrfTokenOverride;
  if (!csrfToken) {
    try {
      csrfToken = await getCsrfToken();
      if (!csrfToken) {
        console.warn('⚠️ CSRF token not found in cookies');
      }
    } catch (error) {
      console.error('❌ Error getting CSRF token:', error.message);
    }
  }

  // Construct headers required by X.com API
  const headers = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "content-type": "application/json",
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "x-csrf-token": csrfToken || '',
    "x-client-transaction-id": `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    "x-client-uuid": generateClientUUID()
  };
  
  // Construct the URL with query parameters
  const url = `${BOOKMARK_ENDPOINT}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
  
  try {
    console.log(`🌐 Making request to X.com API...`);
    
    const response = await fetch(url, {
      headers,
      referrer: `${TWITTER_URL}/i/bookmarks`,
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
      mode: "cors",
      credentials: "include",
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError(`Rate limit reached: ${response.status}`);
      }
      throw new NetworkError(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    let { bookmarks, nextCursor } = processBookmarksResponse(data);
    
    // Enhance bookmarks with media URLs for IndexedDB
    bookmarks = enhanceBookmarksWithMetadata(bookmarks);
    
    // Check if cursor is valid (not same as current one)
    nextCursor = checkNextCursor(cursor, nextCursor);
    
    console.log(`✅ Fetched ${bookmarks.length} bookmarks (next cursor: ${nextCursor ? 'yes' : 'none'})`);
    
    return { bookmarks, nextCursor };
    
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }
    
    if (error.message.includes('HTTP error! status:')) {
      console.warn("⚠️ Possible rate limit hit. Consider backing off.");
      throw new NetworkError(error.message);
    }
    
    console.error('❌ Unexpected error in fetchBookmarksV2:', error);
    throw error;
  }
};

/**
 * Process the raw response from X.com bookmarks API
 * @param {Object} data - Raw API response
 * @returns {Object} Processed bookmarks and pagination cursor
 */
export const processBookmarksResponse = (data) => {
  try {
    const entries = data?.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries || [];
    
    const bookmarks = entries
      .filter(entry => entry?.entryId?.startsWith('tweet-'))
      .map(entry => {
        const result = entry?.content?.itemContent?.tweet_results?.result;
        const legacy = result?.legacy;
        const user = result?.core?.user_results?.result?.legacy;
        const avatar = result?.core?.user_results?.result?.avatar;

        const avatarUrl = avatar?.image_url || user?.profile_image_url_https;

        return {
          id: result?.rest_id,
          text: legacy?.full_text,
          author: user?.screen_name,
          avatar_url: avatarUrl,
          created_at: legacy?.created_at,
          sortIndex: entry?.sortIndex, 
          // Store full data for media extraction
          FULL_DATA: result,
        };
      })
      .filter(bookmark => bookmark.id && bookmark.text); // Remove entries with missing essential data

    const nextCursor = entries.find(entry => entry?.entryId?.startsWith('cursor-bottom-'))?.content?.value;
    
    console.log(`📋 Processed ${bookmarks.length} bookmarks from API response`);
    
    return { bookmarks, nextCursor };
    
  } catch (error) {
    console.error("❌ Error processing bookmarks response:", error);
    // Return empty results on error rather than breaking
    return { bookmarks: [], nextCursor: null };
  }
};

/**
 * Enhance bookmarks with metadata for IndexedDB storage
 * @param {Array} bookmarks - Raw bookmarks from API
 * @returns {Array} Enhanced bookmarks with media URLs and clean data
 */
export const enhanceBookmarksWithMetadata = (bookmarks) => {
  return bookmarks.map(bookmark => {
    const enhanced = {
      id: bookmark.id,
      text: bookmark.text,
      author: bookmark.author,
      avatar_url: bookmark.avatar_url,
      created_at: bookmark.created_at,
      sortIndex: bookmark.sortIndex, // Pass through the sortIndex
      media_urls: extractMediaUrls(bookmark.FULL_DATA)
    };
    
    // Remove FULL_DATA to keep storage lean
    return enhanced;
  });
};

/**
 * Extract media URLs from tweet data
 * @param {Object} tweetData - Full tweet data from API
 * @returns {Array} Array of media URLs
 */
export const extractMediaUrls = (tweetData) => {
  const media_urls = [];
  
  try {
    // Extract photos
    const media = tweetData?.legacy?.entities?.media || [];
    media.forEach(item => {
      if (item.type === 'photo' && item.media_url_https) {
        media_urls.push(item.media_url_https);
      }
    });
    
    // Extract video thumbnails
    const extendedEntities = tweetData?.legacy?.extended_entities?.media || [];
    extendedEntities.forEach(item => {
      if (item.type === 'video' && item.media_url_https) {
        media_urls.push(item.media_url_https);
      }
    });
    
  } catch (error) {
    console.warn('⚠️ Error extracting media URLs:', error);
  }
  
  return [...new Set(media_urls)]; // Remove duplicates
};

/**
 * Get CSRF token from browser cookies
 * @returns {Promise<string|null>} CSRF token or null if not found
 */
export const getCsrfToken = () => {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: TWITTER_URL, name: 'ct0' }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error getting CSRF token:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      
      if (cookie) {
        console.log('🔑 CSRF token retrieved successfully');
        resolve(cookie.value);
      } else {
        console.log('⚠️ No CSRF token found in cookies');
        resolve(null);
      }
    });
  });
};

/**
 * Check if user is logged into X.com by verifying CSRF token
 * @returns {Promise<boolean>} True if logged in, false otherwise
 */
export const checkXLoginStatus = async () => {
  try {
    const token = await getCsrfToken();
    if (!token) {
      console.log('❌ User not logged into X.com (no CSRF token)');
      return false;
    }
    
    console.log('✅ User is logged into X.com');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking X login status:', error);
    return false;
  }
};

/**
 * Generate a client UUID for request headers
 * @returns {string} UUID string
 */
const generateClientUUID = () => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

/**
 * Generate transaction ID matching Twitter's format
 * Based on successful request pattern: fC4wC8hk2+Dtk0qhFn6G3eNetLNK25vi/zD3ahuFcHjf7GMgEbmTSl2yTbwW9r7jIhhC8Xj7Aq2N0yCrdT+M+te4GIHzfw
 */
const generateTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < 86; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if cursor is different from previous one (indicates more data available)
 * @param {string|null} currentCursor - Current cursor
 * @param {string|null} nextCursor - Next cursor from API
 * @returns {string|null} Next cursor or null if no more data
 */
const checkNextCursor = (currentCursor, nextCursor) => {
  return nextCursor === currentCursor ? null : nextCursor;
};

/**
 * Delete a single bookmark from X.com API
 * @param {string} tweetId - Tweet ID to remove from bookmarks
 * @param {string|null} csrfTokenOverride - Optional CSRF token override
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteBookmarkV2 = async (tweetId, csrfTokenOverride = null) => {
  console.log(`🗑️ Deleting bookmark: ${tweetId}`);
  
  // Get CSRF token
  let csrfToken = csrfTokenOverride;
  if (!csrfToken) {
    try {
      csrfToken = await getCsrfToken();
      if (!csrfToken) {
        console.warn('⚠️ CSRF token not found for delete operation');
        return { success: false, error: 'Authentication required' };
      }
    } catch (error) {
      console.error('❌ Error getting CSRF token for delete:', error.message);
      return { success: false, error: 'Authentication failed' };
    }
  }

  // Construct headers required by X.com API (matching successful web app requests)
  const headers = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "content-type": "application/json",
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "x-csrf-token": csrfToken,
    // Use simpler transaction ID format like successful requests
    "x-client-transaction-id": generateTransactionId()
    // Removed x-client-uuid as it's not present in successful requests
  };

  // Request body for delete operation
  const requestBody = {
    variables: {
      tweet_id: tweetId
    },
    queryId: "Wlmlj2-xzyS1GN3a6cj-mQ"
  };

  try {
    console.log(`🌐 Making delete request to X.com API for tweet: ${tweetId}`);
    
    const response = await fetch(DELETE_BOOKMARK_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      // Remove referrer and referrerPolicy - let browser handle it naturally
      mode: "cors",
      credentials: "include",
    });
    
    // Always try to parse the response body first
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error(`❌ Failed to parse response JSON for ${tweetId}:`, parseError);
      data = null;
    }
    
    // Handle different response scenarios
    if (response.ok) {
      // Standard success case (200 OK)
      if (data?.data?.tweet_bookmark_delete === "Done") {
        console.log(`✅ Successfully deleted bookmark: ${tweetId}`);
        return { success: true };
      } else {
        console.warn(`⚠️ Unexpected success response for ${tweetId}:`, data);
        return { success: false, error: 'Unexpected API response format' };
      }
    } else {
      // Handle error responses
      if (response.status === 429) {
        throw new RateLimitError(`Rate limit reached during delete: ${response.status}`);
      }
      
      if (response.status === 404) {
        // Bookmark might already be deleted - this is not necessarily an error
        console.log(`⚠️ Bookmark ${tweetId} not found (may already be deleted)`);
        return { success: true, alreadyDeleted: true };
      }
      
      if (response.status === 400) {
        // Twitter API quirk: Sometimes returns 400 but bookmark is actually deleted
        // Check if this is the "InternalServerError" case where deletion succeeded
        if (data?.errors?.[0]?.name === "InternalServerError" && 
            data?.errors?.[0]?.message === "Something went wrong") {
          console.log(`⚠️ Got 400 InternalServerError for ${tweetId}, but bookmark likely deleted successfully`);
          return { success: true, apiQuirk: true };
        }
        
        // Other 400 errors are genuine failures
        const errorMsg = data?.errors?.[0]?.message || 'Bad request';
        console.error(`❌ 400 error deleting ${tweetId}: ${errorMsg}`);
        throw new NetworkError(`Bad request during delete: ${errorMsg}`);
      }
      
      // Other HTTP errors
      const errorMsg = data?.errors?.[0]?.message || `HTTP ${response.status}`;
      throw new NetworkError(`HTTP error during delete! status: ${response.status}, message: ${errorMsg}`);
    }
    
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.warn(`⚠️ Rate limit hit during delete of ${tweetId}`);
      throw error;
    }
    
    if (error instanceof NetworkError) {
      console.error(`❌ Network error deleting ${tweetId}:`, error.message);
      throw error;
    }
    
    console.error(`❌ Unexpected error deleting bookmark ${tweetId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete multiple bookmarks in batches with rate limiting
 * @param {string[]} tweetIds - Array of tweet IDs to delete
 * @param {Object} options - Configuration options
 * @param {number} options.batchSize - Number of deletes per batch (default: 5)
 * @param {number} options.delayBetweenBatches - Delay between batches in ms (default: 2000)
 * @param {Function} options.onProgress - Progress callback (current, total, failed)
 * @param {string|null} csrfTokenOverride - Optional CSRF token override
 * @returns {Promise<{success: boolean, results: Array, summary: Object}>}
 */
export const deleteBulkBookmarksV2 = async (tweetIds, options = {}, csrfTokenOverride = null) => {
  const {
    batchSize = 5,
    delayBetweenBatches = 2000,
    onProgress = () => {}
  } = options;

  console.log(`🗑️ Starting bulk delete of ${tweetIds.length} bookmarks (batch size: ${batchSize})`);
  
  const results = [];
  const summary = {
    total: tweetIds.length,
    successful: 0,
    failed: 0,
    alreadyDeleted: 0,
    errors: []
  };

  // Process in batches to avoid rate limits
  for (let i = 0; i < tweetIds.length; i += batchSize) {
    const batch = tweetIds.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tweetIds.length / batchSize)}`);
    
    // Process batch items in parallel (but limited by batch size)
    const batchPromises = batch.map(async (tweetId) => {
      try {
        const result = await deleteBookmarkV2(tweetId, csrfTokenOverride);
        
        if (result.success) {
          if (result.alreadyDeleted) {
            summary.alreadyDeleted++;
          } else {
            summary.successful++;
          }
        } else {
          summary.failed++;
          summary.errors.push({ tweetId, error: result.error });
        }
        
        return { tweetId, ...result };
        
      } catch (error) {
        summary.failed++;
        const errorMsg = error.message || 'Unknown error';
        summary.errors.push({ tweetId, error: errorMsg });
        
        return { 
          tweetId, 
          success: false, 
          error: errorMsg,
          isRateLimit: error instanceof RateLimitError
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Update progress
    const completed = Math.min(i + batchSize, tweetIds.length);
    onProgress(completed, tweetIds.length, summary.failed);
    
    // Check for rate limits in this batch
    const rateLimitErrors = batchResults.filter(r => r.isRateLimit);
    if (rateLimitErrors.length > 0) {
      console.warn(`⚠️ Rate limit detected, extending delay for next batch`);
      await delay(delayBetweenBatches * 2); // Double the delay
    } else if (i + batchSize < tweetIds.length) {
      // Normal delay between batches
      await delay(delayBetweenBatches);
    }
  }

  console.log(`✅ Bulk delete completed: ${summary.successful} successful, ${summary.failed} failed, ${summary.alreadyDeleted} already deleted`);
  
  return {
    success: summary.failed === 0,
    results,
    summary
  };
};

/**
 * Check if a bookmark exists on X.com (useful before attempting delete)
 * @param {string} tweetId - Tweet ID to check
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
export const checkBookmarkExists = async (tweetId) => {
  try {
    // We can use a lightweight API call to check if bookmark exists
    // This is a simplified check - in practice, you might want to implement
    // a more specific endpoint if available
    console.log(`🔍 Checking if bookmark exists: ${tweetId}`);
    
    // For now, we'll assume it exists unless we get a 404 during delete
    // A more sophisticated implementation could use the bookmarks fetch
    // with a specific cursor or search
    
    return { exists: true };
    
  } catch (error) {
    console.warn(`⚠️ Error checking bookmark existence for ${tweetId}:`, error);
    return { exists: false, error: error.message };
  }
};

console.log('📡 XSaved v2 Fetcher utility loaded - ready for X.com API integration (with delete support)'); 