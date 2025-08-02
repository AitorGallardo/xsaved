🔍 Basic Inspection
await self.testXSaved.inspectDB()
// Shows: Database info, connection status, object stores, current stats

📊 Check Schema & Indexes
await self.testXSaved.checkIndexes()
// Shows: All object stores, indexes, key paths, multiEntry settings

📋 List Recent Bookmarks
await self.testXSaved.listBookmarks(10)
// Shows: Last 10 bookmarks in a nice table format

🧪 Test All Operations (Most Important!)
await self.testXSaved.testBookmarkCRUD()
// Tests: CREATE → READ → UPDATE → DELETE operations
// This will tell us exactly what's failing!

📈 Performance Stats
await self.testXSaved.getStats()
// Shows: Bookmark count, tags, performance metrics, storage usage

🔄 Force Reinitialization
await self.testXSaved.forceReinit()
// Reinitializes the entire database connection

🗑️ Clear All Data (Emergency)
await self.testXSaved.clearDB()
// Clears all bookmarks (asks for confirmation)