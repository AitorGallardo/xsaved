# Extension Infrastructure Design - Component 3

## 🎯 **Component 3 Goals**

- **Chrome Extension Architecture**: Service worker, content scripts, popup interface
- **Twitter/X Integration**: Seamless bookmark extraction and saving
- **Communication Layer**: Robust messaging between extension components
- **Storage Bridge**: Connect extension to IndexedDB and search engine
- **User Interface**: Popup for quick access and management

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension Architecture                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Service Worker│  │  Content Script │  │   Popup Window  │ │
│  │   (Background)  │  │   (Twitter/X)   │  │   (Interface)   │ │
│  │                 │  │                 │  │                 │ │
│  │ • Storage mgmt  │  │ • DOM injection │  │ • Quick search  │ │
│  │ • IndexedDB     │  │ • Tweet extract │  │ • Settings      │ │
│  │ • Search engine │  │ • Save buttons  │  │ • Export tools  │ │
│  │ • Message hub   │  │ • User actions  │  │ • Statistics    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Message Communication Layer                  │ │
│  │                                                             │ │
│  │ • chrome.runtime.sendMessage()                             │ │
│  │ • chrome.runtime.onMessage.addListener()                   │ │
│  │ • Event-driven architecture                                │ │
│  │ • Type-safe message contracts                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                 │                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Data & Search Integration                      │ │
│  │                                                             │ │
│  │ • IndexedDB (Component 1)   • Search Engine (Component 2)  │ │
│  │ • Storage management        • Query processing             │ │
│  │ • Data persistence          • Performance optimization     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 **Core Components**

### **1. Service Worker (Background Script)**
**Purpose**: Central coordinator for all extension operations

```typescript
// Service Worker Responsibilities
interface ServiceWorkerFeatures {
  // Storage Management
  storageManager: {
    initializeDatabase(): Promise<void>;
    syncBookmarks(): Promise<void>;
    cleanupOldData(): Promise<void>;
    exportData(format: 'json' | 'csv' | 'pdf'): Promise<Blob>;
  };
  
  // Search Engine Integration
  searchEngine: {
    executeQuery(query: SearchQuery): Promise<SearchResult>;
    indexNewBookmark(bookmark: BookmarkEntity): Promise<void>;
    updateSearchIndex(): Promise<void>;
    getCacheStats(): Promise<CacheStats>;
  };
  
  // Message Handling
  messageHandler: {
    handleContentScriptMessage(message: ContentMessage): Promise<void>;
    handlePopupMessage(message: PopupMessage): Promise<void>;
    broadcastUpdate(update: ExtensionUpdate): Promise<void>;
  };
  
  // Background Tasks
  backgroundTasks: {
    periodicSync(): Promise<void>;
    performanceMonitoring(): Promise<void>;
    dataCompaction(): Promise<void>;
  };
}
```

### **2. Content Script (Twitter/X Integration)**
**Purpose**: Inject functionality into Twitter/X web pages

```typescript
// Content Script Features
interface ContentScriptFeatures {
  // DOM Injection
  domInjection: {
    injectSaveButtons(): void;
    createQuickAccessPanel(): void;
    addKeyboardShortcuts(): void;
    setupMutationObserver(): void;
  };
  
  // Tweet Extraction
  tweetExtraction: {
    extractTweetData(tweetElement: HTMLElement): TweetData;
    detectTweetType(element: HTMLElement): 'single' | 'thread' | 'retweet';
    parseMediaContent(tweet: HTMLElement): MediaUrl[];
    extractAuthorInfo(tweet: HTMLElement): AuthorInfo;
  };
  
  // User Interaction
  userInteraction: {
    handleSaveClick(tweetId: string): Promise<void>;
    showSaveConfirmation(success: boolean): void;
    handleTagInput(tags: string[]): void;
    setupContextMenu(): void;
  };
  
  // Real-time Updates
  realTimeUpdates: {
    watchForNewTweets(): void;
    updateSavedIndicators(): void;
    syncScrollPosition(): void;
  };
}
```

### **3. Popup Interface**
**Purpose**: Quick access window for search and management

```typescript
// Popup Interface Features
interface PopupFeatures {
  // Quick Search
  quickSearch: {
    searchAsYouType(query: string): Promise<SearchResult>;
    displayResults(results: ScoredBookmark[]): void;
    handleResultClick(bookmarkId: string): void;
  };
  
  // Bookmark Management
  bookmarkManagement: {
    showRecentBookmarks(limit: number): Promise<BookmarkEntity[]>;
    editBookmarkTags(id: string, tags: string[]): Promise<void>;
    deleteBookmark(id: string): Promise<void>;
    bulkOperations(ids: string[], action: string): Promise<void>;
  };
  
  // Settings & Configuration
  settings: {
    configureAutoSave(): void;
    setDefaultTags(): void;
    configureExportSettings(): void;
    manageStorageUsage(): void;
  };
  
  // Statistics & Insights
  analytics: {
    showStorageStats(): Promise<StorageStats>;
    displaySearchAnalytics(): Promise<SearchAnalytics>;
    showTopTags(): Promise<TagUsage[]>;
  };
}
```

## 📡 **Communication Architecture**

### **Message Types and Contracts**

```typescript
// Base message interface
interface ExtensionMessage {
  type: string;
  source: 'content' | 'popup' | 'background';
  timestamp: number;
  requestId?: string;
}

// Content Script → Background
interface ContentMessage extends ExtensionMessage {
  type: 'SAVE_BOOKMARK' | 'GET_BOOKMARK_STATUS' | 'BULK_SAVE' | 'PAGE_LOADED';
  data: {
    tweet?: TweetData;
    tweetIds?: string[];
    url?: string;
    pageInfo?: PageInfo;
  };
}

// Popup → Background
interface PopupMessage extends ExtensionMessage {
  type: 'SEARCH_QUERY' | 'GET_RECENT' | 'DELETE_BOOKMARK' | 'EXPORT_DATA';
  data: {
    query?: SearchQuery;
    bookmarkId?: string;
    exportFormat?: 'json' | 'csv' | 'pdf';
    limit?: number;
  };
}

// Background → All
interface BackgroundResponse extends ExtensionMessage {
  type: 'SEARCH_RESULT' | 'BOOKMARK_SAVED' | 'ERROR' | 'STATUS_UPDATE';
  success: boolean;
  data?: any;
  error?: string;
}

// Broadcasting Updates
interface ExtensionUpdate extends ExtensionMessage {
  type: 'BOOKMARK_ADDED' | 'BOOKMARK_DELETED' | 'SETTINGS_CHANGED' | 'SYNC_COMPLETE';
  data: {
    bookmarkId?: string;
    changeCount?: number;
    settings?: ExtensionSettings;
  };
}
```

### **Communication Patterns**

```typescript
class ExtensionMessenger {
  // Request-Response Pattern
  async sendRequest<T>(
    message: ExtensionMessage, 
    timeout: number = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
      
      chrome.runtime.sendMessage(
        { ...message, requestId },
        (response) => {
          clearTimeout(timeoutId);
          if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        }
      );
    });
  }
  
  // Event Broadcasting
  async broadcast(update: ExtensionUpdate): Promise<void> {
    // Notify all tabs and popup
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id!, update).catch(() => {
        // Tab might not have content script - ignore
      });
    }
  }
  
  // Error Handling
  handleMessageError(error: Error, message: ExtensionMessage): void {
    console.error('Message handling error:', error, message);
    // Send error response back to sender
    // Log for debugging
    // Update error statistics
  }
}
```

## 🌐 **Twitter/X Integration**

### **Tweet Detection and Extraction**

```typescript
class TwitterExtractor {
  // Tweet DOM Selectors (updated for current Twitter)
  private selectors = {
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    author: '[data-testid="User-Name"]',
    timestamp: 'time',
    media: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"]',
    actions: '[role="group"]'
  };
  
  // Extract complete tweet data
  extractTweetData(tweetElement: HTMLElement): TweetData {
    try {
      const tweetId = this.extractTweetId(tweetElement);
      const text = this.extractTweetText(tweetElement);
      const author = this.extractAuthorInfo(tweetElement);
      const timestamp = this.extractTimestamp(tweetElement);
      const media = this.extractMediaUrls(tweetElement);
      const metrics = this.extractEngagementMetrics(tweetElement);
      
      return {
        id: tweetId,
        text,
        author: author.username,
        author_display_name: author.displayName,
        created_at: timestamp,
        bookmark_timestamp: new Date().toISOString(),
        media_urls: media,
        engagement: metrics,
        url: `https://twitter.com/${author.username}/status/${tweetId}`,
        tags: [], // User will add these
        textTokens: this.tokenizeText(text)
      };
    } catch (error) {
      console.error('Tweet extraction failed:', error);
      throw new Error('Failed to extract tweet data');
    }
  }
  
  // Smart tweet ID extraction
  private extractTweetId(element: HTMLElement): string {
    // Try multiple methods for robust extraction
    const link = element.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    
    // Fallback to data attributes
    const tweetId = element.dataset.tweetId || 
                   element.getAttribute('data-tweet-id');
    if (tweetId) return tweetId;
    
    throw new Error('Could not extract tweet ID');
  }
  
  // Media URL extraction with type detection
  private extractMediaUrls(element: HTMLElement): MediaUrl[] {
    const mediaElements = element.querySelectorAll(this.selectors.media);
    const mediaUrls: MediaUrl[] = [];
    
    mediaElements.forEach(media => {
      if (media.tagName === 'IMG') {
        const img = media as HTMLImageElement;
        mediaUrls.push({
          url: img.src.replace(/\?.*$/, ''), // Remove query params
          type: 'image',
          thumbnail: img.src
        });
      } else if (media.querySelector('video')) {
        const video = media.querySelector('video') as HTMLVideoElement;
        mediaUrls.push({
          url: video.poster || video.src,
          type: 'video',
          thumbnail: video.poster
        });
      }
    });
    
    return mediaUrls;
  }
}
```

### **DOM Injection Strategy**

```typescript
class DOMInjector {
  private observer: MutationObserver;
  private injectedTweets = new Set<string>();
  
  // Initialize extension UI elements
  initialize(): void {
    this.injectGlobalStyles();
    this.setupMutationObserver();
    this.injectExistingTweets();
    this.setupKeyboardShortcuts();
  }
  
  // Inject save buttons on tweets
  injectSaveButton(tweetElement: HTMLElement): void {
    const tweetId = this.extractTweetId(tweetElement);
    if (this.injectedTweets.has(tweetId)) return;
    
    const actionsBar = tweetElement.querySelector('[role="group"]');
    if (!actionsBar) return;
    
    const saveButton = this.createSaveButton(tweetId);
    actionsBar.appendChild(saveButton);
    this.injectedTweets.add(tweetId);
  }
  
  // Create save button with proper styling
  private createSaveButton(tweetId: string): HTMLElement {
    const button = document.createElement('div');
    button.className = 'xsaved-save-btn';
    button.innerHTML = `
      <div class="xsaved-btn-icon">
        <svg viewBox="0 0 24 24" class="xsaved-icon">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <span class="xsaved-btn-text">Save</span>
    `;
    
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await this.handleSaveClick(tweetId);
    });
    
    return button;
  }
  
  // Handle save button clicks
  private async handleSaveClick(tweetId: string): Promise<void> {
    try {
      const tweetElement = document.querySelector(`[data-tweet-id="${tweetId}"]`) as HTMLElement;
      const tweetData = new TwitterExtractor().extractTweetData(tweetElement);
      
      const response = await messenger.sendRequest<BookmarkEntity>({
        type: 'SAVE_BOOKMARK',
        source: 'content',
        timestamp: Date.now(),
        data: { tweet: tweetData }
      });
      
      this.showSaveConfirmation(true, response);
      this.updateButtonState(tweetId, 'saved');
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showSaveConfirmation(false, error.message);
    }
  }
}
```

## 🔒 **Security & Permissions**

### **Manifest v3 Configuration**

```json
{
  "manifest_version": 3,
  "name": "XSaved v2",
  "version": "2.0.0",
  "description": "Local-first Twitter bookmark management with lightning-fast search",
  
  "permissions": [
    "storage",
    "unlimitedStorage",
    "scripting",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://twitter.com/*",
    "https://x.com/*"
  ],
  
  "background": {
    "service_worker": "src/extension/background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://twitter.com/*", "https://x.com/*"],
      "js": ["src/extension/content.js"],
      "css": ["src/extension/styles.css"],
      "run_at": "document_end"
    }
  ],
  
  "action": {
    "default_popup": "src/extension/popup.html",
    "default_title": "XSaved - Quick Search"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["src/extension/injected.js"],
      "matches": ["https://twitter.com/*", "https://x.com/*"]
    }
  ]
}
```

### **Security Measures**

```typescript
// Content Security Policy
interface SecurityMeasures {
  // Input Sanitization
  sanitizeInput(input: string): string;
  validateTweetData(data: TweetData): boolean;
  
  // Permission Checks
  checkOriginPermission(origin: string): boolean;
  validateMessageSource(source: string): boolean;
  
  // Data Protection
  encryptSensitiveData(data: any): string;
  anonymizeUserData(data: UserData): AnonymizedData;
  
  // Rate Limiting
  rateLimitRequests(endpoint: string): boolean;
  throttleOperations(operation: string): boolean;
}
```

## ⚡ **Performance Optimizations**

### **Lazy Loading and Code Splitting**

```typescript
// Module loading strategy
class ExtensionLoader {
  // Lazy load heavy components
  async loadSearchEngine(): Promise<SearchEngine> {
    const { SearchEngine } = await import('../search/search-engine.js');
    return new SearchEngine();
  }
  
  async loadExportModule(): Promise<ExportManager> {
    const { ExportManager } = await import('../export/export-manager.js');
    return new ExportManager();
  }
  
  // Progressive enhancement
  initializeCore(): void {
    // Load essential components immediately
    this.loadMessaging();
    this.loadBasicStorage();
  }
  
  initializeAdvanced(): void {
    // Load advanced features on demand
    this.loadSearchEngine();
    this.loadAnalytics();
    this.loadExportFeatures();
  }
}
```

### **Memory Management**

```typescript
class MemoryManager {
  private caches = new Map<string, any>();
  private cleanupIntervals = new Map<string, number>();
  
  // Efficient caching with automatic cleanup
  setCache(key: string, value: any, ttl: number = 300000): void {
    this.caches.set(key, {
      value,
      expires: Date.now() + ttl
    });
    
    // Setup cleanup
    const cleanupId = setTimeout(() => {
      this.caches.delete(key);
      this.cleanupIntervals.delete(key);
    }, ttl);
    
    this.cleanupIntervals.set(key, cleanupId);
  }
  
  // Memory-efficient DOM operations
  throttleDOM(operation: () => void, delay: number = 100): void {
    if (!this.domThrottle) {
      this.domThrottle = setTimeout(() => {
        operation();
        this.domThrottle = null;
      }, delay);
    }
  }
}
```

## 🧪 **Testing Strategy**

### **Component Testing**

```typescript
// Service Worker Tests
describe('ServiceWorker', () => {
  test('handles bookmark save requests', async () => {
    const mockTweet = createMockTweetData();
    const result = await serviceWorker.handleSaveBookmark(mockTweet);
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(mockTweet.id);
  });
});

// Content Script Tests  
describe('ContentScript', () => {
  test('extracts tweet data correctly', () => {
    const mockTweetElement = createMockTweetElement();
    const extracted = contentScript.extractTweetData(mockTweetElement);
    expect(extracted.text).toBeDefined();
    expect(extracted.author).toBeDefined();
  });
});

// Message Communication Tests
describe('ExtensionMessenger', () => {
  test('handles request-response pattern', async () => {
    const response = await messenger.sendRequest({
      type: 'SEARCH_QUERY',
      source: 'popup',
      timestamp: Date.now(),
      data: { query: { text: 'test' } }
    });
    expect(response).toBeDefined();
  });
});
```

## 📊 **Implementation Phases**

### **Phase 1: Core Infrastructure (Week 1)**
- Service worker setup and message handling
- Basic content script injection
- IndexedDB integration
- Simple popup interface

### **Phase 2: Twitter Integration (Week 2)**
- Tweet extraction and parsing
- DOM injection and save buttons
- Real-time tweet detection
- Error handling and validation

### **Phase 3: Advanced Features (Week 3)**
- Search integration in popup
- Bulk operations and management
- Performance optimizations
- Comprehensive testing

### **Phase 4: Polish & Security (Week 4)**
- Security hardening
- Performance tuning
- User experience refinements
- Documentation and deployment

This extension infrastructure will provide a solid foundation for our local-first bookmark management system! 