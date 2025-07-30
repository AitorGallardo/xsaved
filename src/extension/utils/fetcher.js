/**
 * X.com API integration utilities
 * Adapted from the proven chrome_extension implementation
 * Keeps all proven X.com GraphQL API logic
 */

import { NetworkError, RateLimitError } from "./helpers.js";

// Constants
const TWITTER_URL = 'https://x.com';

// Cache for threads to avoid duplicate requests
const threadCache = new Map();

export const fetchBookmarksV2 = async (cursor = null, csrfTokenOverride = null, isDeltaSync = false) => {
  const baseUrl = `${TWITTER_URL}/i/api/graphql/QUjXply7fA7fk05FRyajEg/Bookmarks`;
  // Adjust count for delta sync - fetch smaller batches to find new content faster
  const batchSize = isDeltaSync ? 50 : 100;
  const variables = { count: batchSize, includePromotedContent: true, ...(cursor && { cursor }) };
  
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
  
  let csrfToken = csrfTokenOverride;
  if (!csrfToken) {
    try {
      csrfToken = await getCsrfToken();
      if (!csrfToken) {
        console.warn('CSRF token not found in cookies');
      }
    } catch (error) {
      console.error('Error getting CSRF token:', error.message);
    }
  }

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
    "x-client-uuid": crypto.randomUUID()
  };
  
  const url = `${baseUrl}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
  
  try {
    console.log(`🔗 Fetching X.com bookmarks: ${isDeltaSync ? 'Delta' : 'Full'} sync, batch size: ${batchSize}`);
    
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
    
    // Enhance bookmarks with additional data
    bookmarks = enhanceBookmarksWithMetadata(bookmarks);
    
    nextCursor = checkNextCursor(cursor, nextCursor);
    console.log(`✅ Fetched ${bookmarks.length} bookmarks from X.com API`);
    
    return { bookmarks, nextCursor };
  } catch (error) {
    if (error instanceof RateLimitError || error instanceof NetworkError) {
      throw error;
    }
    
    if (error.message.includes('HTTP error! status:')) {
      // Handle potential blocking
      console.warn("Possible rate limit hit. Consider backing off.");
      throw new NetworkError(error.message);
    }
    throw error;
  }
};

export const processBookmarksResponse = (data) => {
  try {
    const entries = data?.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries || [];
    const bookmarks = entries
      .filter(entry => entry?.entryId?.startsWith('tweet-'))
      .map(entry => {
        const result = entry?.content?.itemContent?.tweet_results?.result;
        const legacy = result?.legacy;
        const user = result?.core?.user_results?.result?.legacy;

        // Extract media URLs if available
        const media_urls = extractMediaUrls(legacy);

        return {
          id: result?.rest_id,
          text: legacy?.full_text || '',
          author: user?.screen_name || 'unknown',
          author_display_name: user?.name || '',
          created_at: legacy?.created_at || new Date().toISOString(),
          media_urls,
          // Keep essential metrics for potential future use
          engagement: {
            retweet_count: legacy?.retweet_count || 0,
            favorite_count: legacy?.favorite_count || 0,
            reply_count: legacy?.reply_count || 0
          },
          // Keep full data for debugging if needed
          FULL_DATA: result,
        };
      })
      .filter(bookmark => bookmark.id && bookmark.text); // Remove entries with missing essential data

    const nextCursor = entries.find(entry => entry?.entryId?.startsWith('cursor-bottom-'))?.content?.value;
    return { bookmarks, nextCursor };
  } catch (error) {
    console.error("Error processing bookmarks response:", error);
    // Return empty results on error rather than breaking
    return { bookmarks: [], nextCursor: null };
  }
};

/**
 * Extract media URLs from tweet legacy data
 */
const extractMediaUrls = (legacy) => {
  if (!legacy?.entities?.media) return [];
  
  return legacy.entities.media.map(media => {
    let url = media.media_url_https || media.media_url;
    
    // For images, try to get the best quality
    if (media.type === 'photo' && media.sizes) {
      // Use large size if available
      if (media.sizes.large) {
        url = `${url}?format=${media.format || 'jpg'}&name=large`;
      }
    }
    
    return {
      url,
      type: media.type || 'photo',
      thumbnail: media.media_url_https || media.media_url
    };
  });
};

/**
 * Enhance bookmarks with additional metadata for local storage
 */
const enhanceBookmarksWithMetadata = (bookmarks) => {
  return bookmarks.map(bookmark => ({
    ...bookmark,
    // Add URL construction
    url: `https://twitter.com/${bookmark.author}/status/${bookmark.id}`,
    // Add bookmark timestamp
    bookmark_timestamp: new Date().toISOString(),
    // Initialize tags array for user tagging
    tags: [],
    // Clean up text for search indexing
    text: cleanTweetText(bookmark.text)
  }));
};

/**
 * Clean tweet text for better search indexing
 */
const cleanTweetText = (text) => {
  if (!text) return '';
  
  return text
    // Remove t.co links
    .replace(/https?:\/\/t\.co\/\w+/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

//if the cursor is the same as the previous one, there is no more data
const checkNextCursor = (cursor, nextCursor) => {
  return nextCursor === cursor ? null : nextCursor;
}

export const getCsrfToken = () => {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: TWITTER_URL, name: 'ct0' }, (cookie) => {
      if (cookie) {
        resolve(cookie.value);
      } else {
        console.log('No CSRF token found');
        resolve(null);
      }
    });
  });
};

/**
 * Check if user is logged in to X.com
 */
export const checkXLoginStatus = () => {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: TWITTER_URL, name: 'auth_token' }, (cookie) => {
      resolve(!!cookie);
    });
  });
};

/**
 * Fetch a complete thread for a given tweet ID (optional feature)
 * Kept from original but disabled by default for performance
 */
export const fetchThreadData = async (tweetId, csrfToken, cursor = null) => {
  // Check cache first, but only if we're not paginating
  if (!cursor && threadCache.has(tweetId)) {
    console.log(`Using cached thread data for tweet ID: ${tweetId}`);
    return threadCache.get(tweetId);
  }
  
  const threadEndpoint = `${TWITTER_URL}/i/api/graphql/Ez6kRPyXbqNlhBwcNMpU-Q/TweetDetail`;
  const payload = constructThreadRequestPayload(tweetId, cursor);
  
  // Construct URL with query parameters
  const url = new URL(threadEndpoint);
  Object.entries(payload).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  const headers = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "content-type": "application/json",
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    "x-csrf-token": csrfToken,
    "x-client-transaction-id": `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    "x-client-uuid": crypto.randomUUID()
  };
  
  try {
    const response = await fetch(url.toString(), {
      headers,
      referrer: `${TWITTER_URL}/`,
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
      mode: "cors",
      credentials: "include",
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError(`Thread fetch rate limit: ${response.status}`);
      }
      throw new NetworkError(`Thread fetch HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    const threadData = extractThreadFromResponse(data);
    
    // Cache the result (only if we're not paginating)
    if (!cursor) {
      threadCache.set(tweetId, threadData);
    }
    
    return threadData;
  } catch (error) {
    console.error(`Error fetching thread data for tweet ${tweetId}:`, error);
    throw error;
  }
};

/**
 * Construct thread request payload (helper function)
 */
const constructThreadRequestPayload = (tweetId, cursor = null) => {
  const variables = {
    focalTweetId: tweetId,
    with_rux_injections: false,
    includePromotedContent: true,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true,
    withVoice: true,
    withV2Timeline: true,
    ...(cursor && { cursor })
  };
  
  const features = {
    rweb_lists_timeline_redesign_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };
  
  return {
    variables: JSON.stringify(variables),
    features: JSON.stringify(features)
  };
};

/**
 * Extract thread data from API response (helper function)
 */
const extractThreadFromResponse = (data) => {
  try {
    const instructions = data?.data?.threaded_conversation_with_injections_v2?.instructions || [];
    const entries = instructions.find(inst => inst.type === 'TimelineAddEntries')?.entries || [];
    
    const threadTweets = entries
      .filter(entry => entry.entryId.startsWith('tweet-'))
      .map(entry => {
        const result = entry.content.itemContent.tweet_results.result;
        const legacy = result.legacy;
        const user = result.core.user_results.result.legacy;
        
        return {
          id: result.rest_id,
          text: legacy.full_text,
          author: user.screen_name,
          created_at: legacy.created_at,
          in_reply_to_status_id_str: legacy.in_reply_to_status_id_str
        };
      });
    
    return {
      tweets: threadTweets,
      conversationId: threadTweets[0]?.id
    };
  } catch (error) {
    console.error('Error extracting thread data:', error);
    return { tweets: [], conversationId: null };
  }
}; 