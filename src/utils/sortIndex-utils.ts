/**
 * XSaved Extension v2 - SortIndex Utilities
 * Twitter Snowflake ID parsing and date extraction
 */

/**
 * Extract date from Twitter/X sortIndex (Snowflake ID)
 * @param {string|number|BigInt} sortIndex - The Twitter sortIndex/Snowflake ID
 * @returns {Date} The extracted date
 */
export function getSortIndexDate(sortIndex: string | number | bigint): Date {
    // Twitter epoch: January 1, 2010 00:00:00 UTC (in milliseconds) -> 1262304000000
    // Twitter epoch told by Grok and ChatGpt (November 4, 2010, 01:42:54 UTC) -> 1288834974657
    // Custom epoch (2011-09-27 01:13:00 UTC) -> 1317959580952
    const TWITTER_EPOCH = 1288834974657;
    
    try {
        // Convert to BigInt for precise calculation
        const id = BigInt(sortIndex);
        
        // Extract timestamp (first 41 bits, shifted right by 22 bits)
        const timestampMs = Number(id >> 22n) + TWITTER_EPOCH;
        
        // Return as Date object
        return new Date(timestampMs);
    } catch (error) {
        throw new Error(`Invalid sortIndex: ${sortIndex}. Must be a valid number or string representing a Snowflake ID.`);
    }
}

/**
 * Get ISO string from sortIndex
 * @param {string|number|BigInt} sortIndex - The Twitter sortIndex/Snowflake ID
 * @returns {string} ISO date string
 */
export function getSortIndexDateISO(sortIndex: string | number | bigint): string {
    return getSortIndexDate(sortIndex).toISOString();
}

/**
 * Get relative time string from sortIndex (e.g., "2 hours ago")
 * @param {string|number|BigInt} sortIndex - The Twitter sortIndex/Snowflake ID
 * @returns {string} Relative time string
 */
export function getSortIndexRelativeTime(sortIndex: string | number | bigint): string {
    const date = getSortIndexDate(sortIndex);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    
    return 'just now';
}

/**
 * Validate if a string/number is a valid Twitter Snowflake ID
 * @param {string|number|bigint} sortIndex - The value to validate
 * @returns {boolean} True if valid Snowflake ID
 */
export function isValidSortIndex(sortIndex: string | number | bigint): boolean {
    try {
        const id = BigInt(sortIndex);
        // Twitter Snowflake IDs are 64-bit integers
        // They should be positive and within reasonable bounds
        return id > 0n && id < 2n ** 64n;
    } catch {
        return false;
    }
}

/**
 * Normalize any date format to ISO string for consistent sorting
 * Handles Twitter's old format: "Thu May 31 08:23:54 +0000 2018"
 * and ISO format: "2025-09-20T19:10:11.000Z"
 * @param {string} dateString - The date string to normalize
 * @returns {string} ISO date string
 */
export function normalizeDateToISO(dateString: string): string {
    if (!dateString) return new Date().toISOString();
    
    try {
        // If it's already ISO format, return as-is
        if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+'))) {
            return new Date(dateString).toISOString();
        }
        
        // Handle Twitter's old format: "Thu May 31 08:23:54 +0000 2018"
        // Convert to ISO format
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            console.warn(`⚠️ Invalid date format: ${dateString}, using current date`);
            return new Date().toISOString();
        }
        
        return date.toISOString();
    } catch (error) {
        console.warn(`⚠️ Date normalization failed for: ${dateString}, using current date`);
        return new Date().toISOString();
    }
}
