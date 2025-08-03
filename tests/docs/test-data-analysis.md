# Test Data Analysis - Component 2 Search Engine

## 🗂️ **Complete Test Dataset**

Our search engine uses **5 carefully crafted bookmarks** that test different scenarios:

### **Bookmark 1: React/TypeScript Tutorial**
```javascript
{
  id: 'search_test_1',
  text: 'Amazing React tutorial with TypeScript and modern best practices #react #typescript #tutorial',
  author: 'wesbos',
  tags: ['react', 'typescript', 'tutorial', 'frontend'],
  media_urls: ['https://example.com/react-tutorial.jpg']  // HAS MEDIA
}
```
**Tests:**
- ✅ Hashtag extraction (`#react #typescript #tutorial`)
- ✅ Multi-tag matching
- ✅ Media filtering (has image)
- ✅ Popular author searches
- ✅ Frontend development queries

### **Bookmark 2: Machine Learning Tutorial**
```javascript
{
  id: 'search_test_2', 
  text: 'Machine Learning fundamentals with Python - complete guide for beginners #ai #python #ml',
  author: 'sentdex',
  tags: ['ai', 'python', 'machinelearning', 'tutorial'],
  media_urls: []  // NO MEDIA
}
```
**Tests:**
- ✅ Text tokenization (`machine`, `learning`, `python`)
- ✅ Tag abbreviations (`#ml` vs `machinelearning`)
- ✅ Media filtering (no media)
- ✅ Educational content searches
- ✅ AI/ML domain queries

### **Bookmark 3: Framework Comparison**
```javascript
{
  id: 'search_test_3',
  text: 'Vue.js vs React comparison 2024 - which framework should you choose? Performance analysis',
  author: 'traversymedia', 
  tags: ['vue', 'react', 'comparison', 'frontend'],
  media_urls: ['https://example.com/vue-vs-react.mp4']  // HAS VIDEO
}
```
**Tests:**
- ✅ Multi-framework searches
- ✅ Year-specific queries (`2024`)
- ✅ Question-based text
- ✅ Tag intersection (`vue` AND `react`)
- ✅ Video media detection

### **Bookmark 4: Advanced JavaScript**
```javascript
{
  id: 'search_test_4',
  text: 'Advanced JavaScript patterns and techniques for senior developers. ES2024 features included.',
  author: 'javascript_mastery',
  tags: ['javascript', 'advanced', 'patterns'],
  media_urls: []  // NO MEDIA
}
```
**Tests:**
- ✅ Skill-level filtering (`advanced`)
- ✅ Developer role targeting (`senior`)
- ✅ Version-specific content (`ES2024`)
- ✅ Technical pattern searches
- ✅ JavaScript ecosystem queries

### **Bookmark 5: Backend API Development**
```javascript
{
  id: 'search_test_5',
  text: 'Building scalable APIs with Node.js and Express. Database optimization tips included.',
  author: 'nodejs_guru',
  tags: ['nodejs', 'api', 'backend', 'express'],
  media_urls: []  // NO MEDIA
}
```
**Tests:**
- ✅ Backend vs frontend filtering
- ✅ Technology stack searches (`nodejs` + `express`)
- ✅ Scalability-focused queries
- ✅ Database-related searches
- ✅ API development content

## 📈 **Data Design Rationale**

### **Diversity Coverage:**
- **3 Frontend, 2 Backend** bookmarks
- **2 with media, 3 without** media
- **5 different authors** (no duplicates)
- **Mixed complexity levels** (beginner to advanced)
- **Various content types** (tutorials, comparisons, patterns)

### **Search Scenario Matrix:**

| Test Type | Bookmark 1 | Bookmark 2 | Bookmark 3 | Bookmark 4 | Bookmark 5 |
|-----------|------------|------------|------------|------------|------------|
| **Text Search** | "React tutorial" | "Python ML" | "Vue React" | "JavaScript" | "Node.js API" |
| **Tag Search** | #react, #frontend | #ai, #tutorial | #vue, #comparison | #advanced | #backend |
| **Author Search** | wesbos | sentdex | traversymedia | javascript_mastery | nodejs_guru |
| **Media Filter** | ✅ Image | ❌ None | ✅ Video | ❌ None | ❌ None |
| **Multi-Tag** | react+tutorial | ai+python | vue+react | javascript+advanced | nodejs+api |

### **Edge Cases Covered:**
1. **Hashtag Extraction**: `#react #typescript` in text
2. **Tag Synonyms**: `#ml` vs `machinelearning` tag
3. **Multi-word Searches**: "Machine Learning", "Node.js"
4. **Framework Overlap**: Bookmarks with both `vue` and `react`
5. **Media Variations**: JPG images vs MP4 videos vs no media
6. **Author Uniqueness**: No duplicate authors for clean filtering

This dataset ensures our search engine handles **real-world complexity** while being small enough for fast testing. 