/**
 * XSaved Extension v2 - Query Parser
 * Transforms user input into optimized search queries
 */
export class QueryParser {
    textConfig;
    constructor(textConfig) {
        this.textConfig = textConfig;
    }
    /**
     * Parse user search query into optimized execution plan
     */
    parseQuery(query) {
        const parsed = {
            textTokens: [],
            exactPhrases: [],
            requiredTags: query.tags || [],
            optionalTags: [],
            excludedTags: query.excludeTags || [],
            filters: [],
            queryPlan: {
                primaryFilter: null,
                secondaryFilters: [],
                intersectionStrategy: 'all',
                estimatedResultCount: 0,
                estimatedExecutionTime: 0
            },
            originalQuery: query
        };
        // Parse text input
        if (query.text) {
            this.parseTextQuery(query.text, parsed);
        }
        // Build filters
        this.buildFilters(query, parsed);
        // Optimize execution plan
        parsed.queryPlan = this.optimizeQueryPlan(parsed);
        return parsed;
    }
    /**
     * Parse text query for tokens, phrases, and special syntax
     */
    parseTextQuery(text, parsed) {
        // Extract exact phrases in quotes
        const phraseMatches = text.match(/"([^"]*)"/g);
        if (phraseMatches) {
            parsed.exactPhrases = phraseMatches.map(phrase => phrase.replace(/"/g, '').toLowerCase().trim());
            // Remove phrases from text for token extraction
            text = text.replace(/"[^"]*"/g, '');
        }
        // Extract hashtags as required tags
        const hashtagMatches = text.match(/#(\w+)/g);
        if (hashtagMatches) {
            const hashtags = hashtagMatches.map(tag => tag.replace('#', '').toLowerCase());
            parsed.requiredTags.push(...hashtags);
            // Remove hashtags from text
            text = text.replace(/#\w+/g, '');
        }
        // Extract @mentions (could be author filters)
        const mentionMatches = text.match(/@(\w+)/g);
        if (mentionMatches) {
            // For now, treat mentions as optional tokens
            // In future, could auto-add author filter
            const mentions = mentionMatches.map(mention => mention.replace('@', '').toLowerCase());
            parsed.optionalTags.push(...mentions);
            // Keep mentions in text for now
        }
        // Tokenize remaining text
        const tokens = this.tokenizeText(text);
        parsed.textTokens = tokens;
    }
    /**
     * Tokenize text into searchable terms
     */
    tokenizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation except underscores
            .split(/\s+/)
            .filter(token => token.length >= this.textConfig.minTokenLength)
            .slice(0, this.textConfig.maxTokens) // Limit token count
            .filter(token => !this.isStopWord(token));
    }
    /**
     * Check if token is a stop word (common words to ignore)
     */
    isStopWord(token) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);
        return stopWords.has(token);
    }
    /**
     * Build query filters from search parameters
     */
    buildFilters(query, parsed) {
        const filters = [];
        // Text token filters
        parsed.textTokens.forEach(token => {
            filters.push({
                type: 'textToken',
                value: token,
                selectivity: this.estimateTokenSelectivity(token),
                estimatedCost: 10 // ms
            });
        });
        // Tag filters (most selective)
        parsed.requiredTags.forEach(tag => {
            filters.push({
                type: 'tag',
                value: tag,
                selectivity: this.estimateTagSelectivity(tag),
                estimatedCost: 5 // ms - direct index lookup
            });
        });
        // Author filter
        if (query.author) {
            filters.push({
                type: 'author',
                value: query.author,
                selectivity: 0.05, // Usually quite selective
                estimatedCost: 8 // ms
            });
        }
        // Date range filter
        if (query.dateRange) {
            filters.push({
                type: 'dateRange',
                value: query.dateRange,
                selectivity: this.estimateDateSelectivity(query.dateRange),
                estimatedCost: 15 // ms - range query
            });
        }
        // Media filter
        if (query.hasMedia !== undefined) {
            filters.push({
                type: 'hasMedia',
                value: query.hasMedia,
                selectivity: query.hasMedia ? 0.3 : 0.7, // ~30% have media
                estimatedCost: 5 // ms
            });
        }
        parsed.filters = filters;
    }
    /**
     * Optimize query execution plan based on filter selectivity
     */
    optimizeQueryPlan(parsed) {
        const filters = [...parsed.filters];
        // Sort by selectivity (most selective first)
        filters.sort((a, b) => a.selectivity - b.selectivity);
        const primaryFilter = filters[0];
        const secondaryFilters = filters.slice(1);
        // Estimate result count based on most selective filter
        const estimatedResultCount = primaryFilter
            ? Math.max(1, Math.floor(10000 * primaryFilter.selectivity)) // Assume 10K total bookmarks
            : 1000;
        // Estimate execution time
        const estimatedExecutionTime = filters.reduce((total, filter) => total + filter.estimatedCost, 0);
        // Choose intersection strategy
        let intersectionStrategy = 'all';
        if (parsed.textTokens.length > 0 && parsed.requiredTags.length > 0) {
            intersectionStrategy = 'all'; // Text AND tags
        }
        else if (parsed.optionalTags.length > 0) {
            intersectionStrategy = 'any'; // Any optional tags
        }
        return {
            primaryFilter,
            secondaryFilters,
            intersectionStrategy,
            estimatedResultCount,
            estimatedExecutionTime
        };
    }
    /**
     * Estimate selectivity of a text token
     */
    estimateTokenSelectivity(token) {
        // Common words are less selective
        const commonWords = new Set(['react', 'javascript', 'web', 'app', 'code']);
        if (commonWords.has(token)) {
            return 0.2; // 20% of bookmarks might contain this
        }
        // Technical terms are more selective
        if (token.length > 8) {
            return 0.05; // Long words are usually more specific
        }
        return 0.1; // Default selectivity
    }
    /**
     * Estimate selectivity of a tag
     */
    estimateTagSelectivity(tag) {
        // Popular tags are less selective
        const popularTags = new Set(['javascript', 'python', 'ai', 'web', 'tutorial']);
        if (popularTags.has(tag)) {
            return 0.15;
        }
        return 0.05; // Most tags are quite selective
    }
    /**
     * Estimate selectivity of date range
     */
    estimateDateSelectivity(dateRange) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        // Recent date ranges are more selective
        if (daysDiff <= 1)
            return 0.02; // Last day
        if (daysDiff <= 7)
            return 0.1; // Last week  
        if (daysDiff <= 30)
            return 0.3; // Last month
        return 0.8; // Longer ranges are less selective
    }
    /**
     * Extract search suggestions from query
     */
    extractSuggestions(query) {
        const suggestions = [];
        // Suggest related searches based on current query
        if (query.text) {
            const tokens = this.tokenizeText(query.text);
            // Suggest adding common tags
            tokens.forEach(token => {
                if (this.couldBeTag(token)) {
                    suggestions.push(`${query.text} #${token}`);
                }
            });
        }
        // Suggest adding author filter if text contains @mention
        if (query.text?.includes('@')) {
            const mentions = query.text.match(/@(\w+)/g);
            mentions?.forEach(mention => {
                const author = mention.replace('@', '');
                suggestions.push(`author:${author} ${query.text?.replace(mention, '').trim()}`);
            });
        }
        return suggestions.slice(0, 3); // Limit suggestions
    }
    /**
     * Check if token could be a tag
     */
    couldBeTag(token) {
        // Technical terms, frameworks, languages likely to be tags
        const techTerms = /^(react|vue|angular|python|javascript|js|ai|ml|css|html|node|npm)$/i;
        return techTerms.test(token) || token.length > 6;
    }
    /**
     * Generate query hash for caching
     */
    generateQueryHash(query) {
        const normalized = {
            text: query.text?.toLowerCase().trim(),
            tags: query.tags?.sort(),
            author: query.author?.toLowerCase(),
            dateRange: query.dateRange,
            excludeTags: query.excludeTags?.sort(),
            hasMedia: query.hasMedia,
            sortBy: query.sortBy || 'relevance',
            limit: query.limit || 50
        };
        return btoa(JSON.stringify(normalized)).replace(/[+/=]/g, '');
    }
}
//# sourceMappingURL=query-parser.js.map