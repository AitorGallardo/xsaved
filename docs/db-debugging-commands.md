# XSaved Extension v2 - Database Debugging Commands

## 🔧 Extension API Commands (if available)
```javascript
// Shows: Database info, connection status, object stores, current stats
await self.testXSaved.inspectDB()

// Shows: All object stores, indexes, key paths, multiEntry settings
await self.testXSaved.checkIndexes()

// Shows: Last 10 bookmarks in a nice table format
await self.testXSaved.listBookmarks(10)

// Tests: CREATE → READ → UPDATE → DELETE operations
await self.testXSaved.testBookmarkCRUD()

// Shows: Bookmark count, tags, performance metrics, storage usage
await self.testXSaved.getStats()

// Reinitializes the entire database connection
await self.testXSaved.forceReinit()

// Clears all bookmarks (asks for confirmation)
await self.testXSaved.clearDB()
```

## 🚀 Raw IndexedDB Queries (Browser Console)

### 📊 Basic Database Inspection
```javascript
// Check if IndexedDB is supported and open database
(() => {
  if (!window.indexedDB) {
    console.error('❌ IndexedDB not supported');
    return;
  }
  
  const request = indexedDB.open('XSavedDB', 2);
  request.onsuccess = () => {
    const db = request.result;
    console.log('✅ Database opened successfully');
    console.log('📊 Database name:', db.name);
    console.log('🔢 Version:', db.version);
    console.log('🏪 Object stores:', Array.from(db.objectStoreNames));
    db.close();
  };
  request.onerror = () => console.error('❌ Failed to open database:', request.error);
})();
```

### 📋 List All Bookmarks (with console.table)
```javascript
// Get all bookmarks and display in a nice table
indexedDB.open('XSavedDB', 2).onsuccess = (event) => {
  const db = event.target.result;
  const store = db.transaction(['bookmarks']).objectStore('bookmarks');
  
  store.getAll().onsuccess = (event) => {
    const bookmarks = event.target.result;
    console.log(`📚 Total bookmarks: ${bookmarks.length}`);
    
    // Format for console.table
    const tableData = bookmarks.map(b => ({
      ID: b.id,
      Author: b.author,
      Text: b.text.substring(0, 80) + (b.text.length > 80 ? '...' : ''),
      Created: b.created_at,
      Bookmarked: b.bookmark_timestamp,
      Tags: b.tags?.join(', ') || 'None',
      Media: b.media_urls?.length || 0
    }));
    
    console.table(tableData);
    db.close();
  };
};
```

### 📅 Get Bookmarks from 2025 (Sorted Ascending)
```javascript
// Get all bookmarks from 2025 sorted by created_at ascending
indexedDB.open('XSavedDB', 2).onsuccess = (event) => {
  const db = event.target.result;
  const store = db.transaction(['bookmarks']).objectStore('bookmarks');
  const index = store.index('created_at');
  
  // Range for 2025 using Twitter date format
  const range = IDBKeyRange.bound(
    'Fri Jan 01 00:00:00 +0000 2025', 
    'Wed Dec 31 23:59:59 +0000 2025'
  );
  
  index.getAll(range).onsuccess = (event) => {
    const bookmarks = event.target.result.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    console.log(`🎯 Found ${bookmarks.length} bookmarks from 2025`);
    
    if (bookmarks.length > 0) {
      const tableData = bookmarks.map(b => ({
        Date: b.created_at,
        Author: b.author,
        Text: b.text.substring(0, 100) + (b.text.length > 100 ? '...' : ''),
        Tags: b.tags?.join(', ') || 'None'
      }));
      
      console.table(tableData);
    }
    
    db.close();
  };
};
```

### 🏷️ Get Bookmarks by Tag
```javascript
// Get all bookmarks with a specific tag
const getBookmarksByTag = (tagName) => {
  indexedDB.open('XSavedDB', 2).onsuccess = (event) => {
    const db = event.target.result;
    const store = db.transaction(['bookmarks']).objectStore('bookmarks');
    const index = store.index('tags');
    
    const request = index.getAll(tagName);
    request.onsuccess = () => {
      const bookmarks = request.result;
      console.log(`🏷️ Found ${bookmarks.length} bookmarks with tag: "${tagName}"`);
      
      if (bookmarks.length > 0) {
        const tableData = bookmarks.map(b => ({
          ID: b.id,
          Author: b.author,
          Text: b.text.substring(0, 80) + (b.text.length > 80 ? '...' : ''),
          Created: b.created_at,
          AllTags: b.tags?.join(', ') || 'None'
        }));
        
        console.table(tableData);
      }
      
      db.close();
    };
  };
};

// Usage examples:
getBookmarksByTag('important');  // Replace with actual tag name
getBookmarksByTag('tech');
```

### 👤 Get Bookmarks by Author
```javascript
// Get all bookmarks from a specific author
const getBookmarksByAuthor = (username) => {
  indexedDB.open('XSavedDB', 2).onsuccess = (event) => {
    const db = event.target.result;
    const store = db.transaction(['bookmarks']).objectStore('bookmarks');
    const index = store.index('author');
    
    const request = index.getAll(username);
    request.onsuccess = () => {
      const bookmarks = request.result;
      console.log(`👤 Found ${bookmarks.length} bookmarks from @${username}`);
      
      if (bookmarks.length > 0) {
        const tableData = bookmarks.map(b => ({
          ID: b.id,
          Text: b.text.substring(0, 100) + (b.text.length > 100 ? '...' : ''),
          Created: b.created_at,
          Bookmarked: b.bookmark_timestamp,
          Tags: b.tags?.join(', ') || 'None'
        }));
        
        console.table(tableData);
      }
      
      db.close();
    };
  };
};

// Usage example:
getBookmarksByAuthor('elonmusk');  // Replace with actual username
```

### 📈 Database Statistics
```javascript
// Get comprehensive database statistics
(() => {
  indexedDB.open('XSavedDB', 2).onsuccess = (event) => {
    const db = event.target.result;
    
    // Get bookmark count
    const bookmarkStore = db.transaction(['bookmarks']).objectStore('bookmarks');
    const bookmarkCount = bookmarkStore.count();
    
    bookmarkCount.onsuccess = () => {
      // Get tag count
      const tagStore = db.transaction(['tags']).objectStore('tags');
      const tagCount = tagStore.count();
      
      tagCount.onsuccess = () => {
        // Get collection count
        const collectionStore = db.transaction(['collections']).objectStore('collections');
        const collectionCount = collectionStore.count();
        
        collectionCount.onsuccess = () => {
          const stats = {
            'Total Bookmarks': bookmarkCount.result,
            'Total Tags': tagCount.result,
            'Total Collections': collectionCount.result,
            'Database Name': db.name,
            'Database Version': db.version,
            'Object Stores': Array.from(db.objectStoreNames).join(', '),
            'Timestamp': new Date().toISOString()
          };
          
          console.log('📊 Database Statistics:');
          console.table(stats);
          db.close();
        };
      };
    };
  };
})();
```

### 🔍 Search Bookmarks by Text
```javascript
// Search bookmarks containing specific text
const searchBookmarks = (searchText, limit = 50) => {
  indexedDB.open('XSavedDB', 2).onsuccess = (event) => {
    const db = event.target.result;
    const store = db.transaction(['bookmarks']).objectStore('bookmarks');
    
    // Get all bookmarks and filter by text
    store.getAll().onsuccess = (event) => {
      const allBookmarks = event.target.result;
      const searchLower = searchText.toLowerCase();
      
      const results = allBookmarks
        .filter(b => 
          b.text.toLowerCase().includes(searchLower) ||
          b.author.toLowerCase().includes(searchLower) ||
          (b.tags && b.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        )
        .slice(0, limit);
      
      console.log(`🔍 Found ${results.length} bookmarks matching "${searchText}"`);
      
      if (results.length > 0) {
        const tableData = results.map(b => ({
          ID: b.id,
          Author: b.author,
          Text: b.text.substring(0, 120) + (b.text.length > 120 ? '...' : ''),
          Created: b.created_at,
          Tags: b.tags?.join(', ') || 'None',
          Relevance: b.text.toLowerCase().includes(searchLower) ? 'Text Match' : 'Tag/Author Match'
        }));
        
        console.table(tableData);
      }
      
      db.close();
    };
  };
};

// Usage examples:
searchBookmarks('AI');           // Search for "AI"
searchBookmarks('javascript');   // Search for "javascript"
searchBookmarks('elon', 20);     // Search for "elon" with 20 results limit
```

### 🗑️ Emergency Database Reset
```javascript
// ⚠️ WARNING: This will delete ALL data!
const resetDatabase = () => {
  if (confirm('⚠️ This will delete ALL bookmarks, tags, and collections. Are you sure?')) {
    if (confirm('🚨 Final warning: This action cannot be undone. Continue?')) {
      indexedDB.deleteDatabase('XSavedDB').onsuccess = () => {
        console.log('🗑️ Database deleted successfully');
        console.log('🔄 Refresh the page to reinitialize the database');
      };
    }
  }
};

// Usage (be very careful!):
// resetDatabase();
```

## 💡 Usage Tips

1. **Copy & Paste**: Copy any query block and paste it directly into the browser console
2. **Console Table**: Use `console.table()` for better data visualization
3. **Error Handling**: All queries include basic error handling
4. **Database Closure**: Queries automatically close database connections
5. **Customization**: Modify the queries to match your specific needs

## 🔧 Troubleshooting

- **Database not found**: Make sure the extension is active and has created the database
- **Permission errors**: Check if the extension has proper permissions
- **Empty results**: Verify that bookmarks exist in the database
- **Console errors**: Look for specific error messages in the console