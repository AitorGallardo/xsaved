/**
 * CSV Generator - Component 5 Phase 1
 * Generates CSV exports for bookmark data analysis
 */

import { BookmarkEntity } from '../../db/types';
import { ExportOptions, ExportResult } from '../export-manager';

export class CSVGenerator {
  /**
   * Generate CSV export from bookmarks
   */
  async generate(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`📊 Generating CSV export for ${bookmarks.length} bookmarks`);

      // Define CSV headers
      const headers = [
        'id',
        'text',
        'author',
        'author_id',
        'created_at',
        'bookmark_timestamp',
        'tags',
        'likes',
        'retweets',
        'replies',
        'url',
        'media_urls',
        'is_quote',
        'is_reply'
      ];

      // Convert bookmarks to CSV rows
      const rows = bookmarks.map(bookmark => [
        this.escapeCsvField(bookmark.id),
        this.escapeCsvField(bookmark.text),
        this.escapeCsvField(bookmark.author),
        this.escapeCsvField(bookmark.author_id),
        this.escapeCsvField(bookmark.created_at),
        this.escapeCsvField(bookmark.bookmark_timestamp),
        this.escapeCsvField(bookmark.tags?.join('; ') || ''),
        bookmark.likes?.toString() || '0',
        bookmark.retweets?.toString() || '0',
        bookmark.replies?.toString() || '0',
        this.escapeCsvField(bookmark.url),
        this.escapeCsvField(bookmark.media_urls?.join('; ') || ''),
        bookmark.is_quote ? 'true' : 'false',
        bookmark.is_reply ? 'true' : 'false'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Add BOM for Excel compatibility
      const csvWithBOM = '\uFEFF' + csvContent;

      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const size = blob.size;

      console.log(`✅ CSV generated: ${size} bytes`);

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.csv`,
        size
      };

    } catch (error) {
      console.error('❌ CSV generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.csv`
      };
    }
  }

  /**
   * Escape CSV field to handle commas, quotes, and newlines
   */
  private escapeCsvField(field: string): string {
    if (!field) return '';
    
    // Remove newlines and replace with spaces
    const cleanField = field.replace(/[\r\n]/g, ' ');
    
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (cleanField.includes(',') || cleanField.includes('"') || cleanField.includes('\n')) {
      return `"${cleanField.replace(/"/g, '""')}"`;
    }
    
    return cleanField;
  }

  /**
   * Generate CSV with custom columns
   */
  async generateCustom(
    bookmarks: BookmarkEntity[],
    columns: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log(`📊 Generating custom CSV export with columns: ${columns.join(', ')}`);

      const validColumns = [
        'id', 'text', 'author', 'author_id', 'created_at', 'bookmark_timestamp',
        'tags', 'likes', 'retweets', 'replies', 'url', 'media_urls',
        'is_quote', 'is_reply', 'quoted_tweet', 'reply_to'
      ];

      const selectedColumns = columns.filter(col => validColumns.includes(col));
      
      if (selectedColumns.length === 0) {
        throw new Error('No valid columns selected for CSV export');
      }

      // Convert bookmarks to CSV rows with selected columns
      const rows = bookmarks.map(bookmark => 
        selectedColumns.map(col => {
          const value = this.getBookmarkValue(bookmark, col);
          return this.escapeCsvField(value);
        })
      );

      const csvContent = [
        selectedColumns.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const csvWithBOM = '\uFEFF' + csvContent;
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-custom-${Date.now()}.csv`,
        size: blob.size
      };

    } catch (error) {
      console.error('❌ Custom CSV generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Custom CSV generation failed',
        filename: options.filename || `bookmarks-custom-${Date.now()}.csv`
      };
    }
  }

  /**
   * Get bookmark value for a specific column
   */
  private getBookmarkValue(bookmark: BookmarkEntity, column: string): string {
    switch (column) {
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
        return bookmark.tags?.join('; ') || '';
      case 'likes':
        return bookmark.likes?.toString() || '0';
      case 'retweets':
        return bookmark.retweets?.toString() || '0';
      case 'replies':
        return bookmark.replies?.toString() || '0';
      case 'url':
        return bookmark.url;
      case 'media_urls':
        return bookmark.media_urls?.join('; ') || '';
      case 'is_quote':
        return bookmark.is_quote ? 'true' : 'false';
      case 'is_reply':
        return bookmark.is_reply ? 'true' : 'false';
      case 'quoted_tweet':
        return bookmark.quoted_tweet ? JSON.stringify(bookmark.quoted_tweet) : '';
      case 'reply_to':
        return bookmark.reply_to ? JSON.stringify(bookmark.reply_to) : '';
      default:
        return '';
    }
  }
} 