/**
 * JSON Generator - Component 5 Phase 1
 * Generates JSON exports for programmatic access to bookmark data
 */

import { BookmarkEntity } from '../../db/types';
import { ExportOptions, ExportResult } from '../export-manager';

export class JSONGenerator {
  /**
   * Generate JSON export from bookmarks
   */
  async generate(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`🔧 Generating JSON export for ${bookmarks.length} bookmarks`);

      const jsonData = this.buildJSONData(bookmarks, options);
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const size = blob.size;

      console.log(`✅ JSON generated: ${size} bytes`);

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.json`,
        size
      };

    } catch (error) {
      console.error('❌ JSON generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.json`
      };
    }
  }

  /**
   * Build JSON data structure
   */
  private buildJSONData(bookmarks: BookmarkEntity[], options: ExportOptions): any {
    const metadata = this.generateMetadata(bookmarks, options);
    const data = this.processBookmarks(bookmarks, options);

    return {
      metadata,
      data,
      export_info: {
        format: 'json',
        version: '1.0',
        generated_at: new Date().toISOString(),
        total_bookmarks: bookmarks.length,
        filters_applied: options.filters || null
      }
    };
  }

  /**
   * Generate metadata for JSON export
   */
  private generateMetadata(bookmarks: BookmarkEntity[], options: ExportOptions): any {
    const totalBookmarks = bookmarks.length;
    const totalLikes = bookmarks.reduce((sum, b) => sum + (b.likes || 0), 0);
    const totalRetweets = bookmarks.reduce((sum, b) => sum + (b.retweets || 0), 0);
    const totalReplies = bookmarks.reduce((sum, b) => sum + (b.replies || 0), 0);
    
    const uniqueAuthors = new Set(bookmarks.map(b => b.author));
    const allTags = bookmarks.flatMap(b => b.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const authorCounts = bookmarks.reduce((acc, bookmark) => {
      acc[bookmark.author] = (acc[bookmark.author] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        total_bookmarks: totalBookmarks,
        unique_authors: uniqueAuthors.size,
        unique_tags: Object.keys(tagCounts).length,
        total_engagement: {
          likes: totalLikes,
          retweets: totalRetweets,
          replies: totalReplies
        }
      },
      analytics: {
        top_tags: Object.entries(tagCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count })),
        top_authors: Object.entries(authorCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([author, count]) => ({ author, count })),
        date_range: {
          earliest: bookmarks.length > 0 ? 
            bookmarks.reduce((earliest, b) => 
              b.created_at < earliest ? b.created_at : earliest, bookmarks[0].created_at) : null,
          latest: bookmarks.length > 0 ? 
            bookmarks.reduce((latest, b) => 
              b.created_at > latest ? b.created_at : latest, bookmarks[0].created_at) : null
        }
      },
      filters: options.filters || null
    };
  }

  /**
   * Process bookmarks for JSON export
   */
  private processBookmarks(bookmarks: BookmarkEntity[], options: ExportOptions): any[] {
    return bookmarks.map(bookmark => ({
      id: bookmark.id,
      text: bookmark.text,
      author: {
        username: bookmark.author,
        id: bookmark.author_id
      },
      timestamps: {
        created_at: bookmark.created_at,
        bookmarked_at: bookmark.bookmark_timestamp
      },
      engagement: {
        likes: bookmark.likes || 0,
        retweets: bookmark.retweets || 0,
        replies: bookmark.replies || 0
      },
      content: {
        url: bookmark.url,
        media_urls: bookmark.media_urls || [],
        is_quote: bookmark.is_quote || false,
        is_reply: bookmark.is_reply || false,
        quoted_tweet: bookmark.quoted_tweet || null,
        reply_to: bookmark.reply_to || null
      },
      tags: bookmark.tags || [],
      raw_data: options.includeMetadata ? bookmark : undefined
    }));
  }

  /**
   * Generate minimal JSON (just bookmarks array)
   */
  async generateMinimal(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`🔧 Generating minimal JSON export for ${bookmarks.length} bookmarks`);

      const minimalData = bookmarks.map(bookmark => ({
        id: bookmark.id,
        text: bookmark.text,
        author: bookmark.author,
        created_at: bookmark.created_at,
        bookmarked_at: bookmark.bookmark_timestamp,
        url: bookmark.url,
        tags: bookmark.tags || []
      }));

      const jsonString = JSON.stringify(minimalData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-minimal-${Date.now()}.json`,
        size: blob.size
      };

    } catch (error) {
      console.error('❌ Minimal JSON generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Minimal JSON generation failed',
        filename: options.filename || `bookmarks-minimal-${Date.now()}.json`
      };
    }
  }

  /**
   * Generate JSON with custom fields
   */
  async generateCustom(
    bookmarks: BookmarkEntity[],
    fields: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log(`🔧 Generating custom JSON export with fields: ${fields.join(', ')}`);

      const validFields = [
        'id', 'text', 'author', 'author_id', 'created_at', 'bookmark_timestamp',
        'tags', 'likes', 'retweets', 'replies', 'url', 'media_urls',
        'is_quote', 'is_reply', 'quoted_tweet', 'reply_to'
      ];

      const selectedFields = fields.filter(field => validFields.includes(field));
      
      if (selectedFields.length === 0) {
        throw new Error('No valid fields selected for JSON export');
      }

      const customData = bookmarks.map(bookmark => {
        const customBookmark: any = {};
        selectedFields.forEach(field => {
          customBookmark[field] = this.getBookmarkValue(bookmark, field);
        });
        return customBookmark;
      });

      const jsonString = JSON.stringify(customData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-custom-${Date.now()}.json`,
        size: blob.size
      };

    } catch (error) {
      console.error('❌ Custom JSON generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Custom JSON generation failed',
        filename: options.filename || `bookmarks-custom-${Date.now()}.json`
      };
    }
  }

  /**
   * Get bookmark value for a specific field
   */
  private getBookmarkValue(bookmark: BookmarkEntity, field: string): any {
    switch (field) {
      case 'id':
        return bookmark.id;
      case 'text':
        return bookmark.text;
      case 'author':
        return bookmark.author;
      case 'author_id':
        return bookmark.author_id;
      case 'created_at':
        return bookmark.created_at;
      case 'bookmark_timestamp':
        return bookmark.bookmark_timestamp;
      case 'tags':
        return bookmark.tags || [];
      case 'likes':
        return bookmark.likes || 0;
      case 'retweets':
        return bookmark.retweets || 0;
      case 'replies':
        return bookmark.replies || 0;
      case 'url':
        return bookmark.url;
      case 'media_urls':
        return bookmark.media_urls || [];
      case 'is_quote':
        return bookmark.is_quote || false;
      case 'is_reply':
        return bookmark.is_reply || false;
      case 'quoted_tweet':
        return bookmark.quoted_tweet || null;
      case 'reply_to':
        return bookmark.reply_to || null;
      default:
        return null;
    }
  }

  /**
   * Generate API-ready JSON format
   */
  async generateAPIFormat(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`🔧 Generating API format JSON for ${bookmarks.length} bookmarks`);

      const apiData = {
        success: true,
        data: bookmarks,
        pagination: {
          total: bookmarks.length,
          page: 1,
          per_page: bookmarks.length,
          has_more: false
        },
        meta: {
          generated_at: new Date().toISOString(),
          format: 'api',
          version: '1.0'
        }
      };

      const jsonString = JSON.stringify(apiData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-api-${Date.now()}.json`,
        size: blob.size
      };

    } catch (error) {
      console.error('❌ API format JSON generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API format JSON generation failed',
        filename: options.filename || `bookmarks-api-${Date.now()}.json`
      };
    }
  }
} 