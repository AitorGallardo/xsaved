/**
 * Export Manager - Service Worker Compatible Version
 * Orchestrates export operations for bookmarks without DOM dependencies
 */

import { BookmarkEntity } from '../db/types';

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json';
  filters?: {
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    author?: string;
    search?: string;
  };
  includeMetadata?: boolean;
  filename?: string;
}

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename: string;
  size?: number;
  error?: string;
  metadata?: {
    totalBookmarks: number;
    exportDate: string;
    filters: any;
  };
}

export class ExportManagerSW {
  constructor() {
    // No DOM dependencies
  }

  /**
   * Export bookmarks based on options (Service Worker compatible)
   */
  async exportBookmarks(
    bookmarks: BookmarkEntity[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log(`📤 [SW] Starting export: ${options.format} format for ${bookmarks.length} bookmarks`);
      
      const metadata = {
        totalBookmarks: bookmarks.length,
        exportDate: new Date().toISOString(),
        filters: options.filters || {}
      };

      let result: ExportResult;

      switch (options.format) {
        case 'csv':
          result = await this.generateCSV(bookmarks, options);
          break;
        case 'json':
          result = await this.generateJSON(bookmarks, options);
          break;
        case 'pdf':
          result = await this.generatePDF(bookmarks, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      result.metadata = metadata;
      result.filename = options.filename || this.generateFilename(options.format, metadata);
      
      console.log(`✅ [SW] Export completed: ${result.filename} (${bookmarks.length} bookmarks)`);
      return result;

    } catch (error) {
      console.error('❌ [SW] Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
        filename: options.filename || `export-${Date.now()}.${options.format}`
      };
    }
  }

  /**
   * Generate CSV format (Service Worker compatible)
   */
  private async generateCSV(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`📊 [SW] Generating CSV for ${bookmarks.length} bookmarks`);

      const headers = [
        'id', 'text', 'author', 'author_id', 'created_at', 'bookmark_timestamp',
        'tags', 'likes', 'retweets', 'replies', 'url', 'media_urls',
        'is_quote', 'is_reply'
      ];

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

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const csvWithBOM = '\uFEFF' + csvContent;
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const size = blob.size;

      console.log(`✅ [SW] CSV generated: ${size} bytes`);

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.csv`,
        size
      };

    } catch (error) {
      console.error('❌ [SW] CSV generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.csv`
      };
    }
  }

  /**
   * Generate JSON format (Service Worker compatible)
   */
  private async generateJSON(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`🔧 [SW] Generating JSON for ${bookmarks.length} bookmarks`);

      const jsonData = this.buildJSONData(bookmarks, options);
      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const size = blob.size;

      console.log(`✅ [SW] JSON generated: ${size} bytes`);

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.json`,
        size
      };

    } catch (error) {
      console.error('❌ [SW] JSON generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.json`
      };
    }
  }

  /**
   * Generate PDF format (Service Worker compatible - simplified)
   */
  private async generatePDF(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`📄 [SW] Generating PDF for ${bookmarks.length} bookmarks`);

      // Limit bookmarks for PDF to prevent hanging
      const maxBookmarksForPDF = 500;
      const limitedBookmarks = bookmarks.slice(0, maxBookmarksForPDF);
      
      if (bookmarks.length > maxBookmarksForPDF) {
        console.warn(`⚠️ [SW] PDF export limited to ${maxBookmarksForPDF} bookmarks (requested: ${bookmarks.length})`);
      }

      // Create a simplified HTML content for PDF
      const htmlContent = this.generatePDFHTML(limitedBookmarks, options);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const size = blob.size;

      console.log(`✅ [SW] PDF HTML generated: ${size} bytes (${limitedBookmarks.length} bookmarks)`);

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.html`, // Save as HTML for now
        size,
        metadata: {
          originalCount: bookmarks.length,
          exportedCount: limitedBookmarks.length,
          limited: bookmarks.length > maxBookmarksForPDF
        }
      };

    } catch (error) {
      console.error('❌ [SW] PDF generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.html`
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
   * Generate PDF HTML content (simplified)
   */
  private generatePDFHTML(bookmarks: BookmarkEntity[], options: ExportOptions): string {
    const title = this.generateTitle(options);
    const metadata = this.generatePDFMetadata(bookmarks, options);
    const bookmarksHTML = this.generateBookmarksHTML(bookmarks);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1da1f2; padding-bottom: 20px; }
        .metadata { background: #f8f9fa; padding: 15px; margin-bottom: 30px; border-radius: 5px; }
        .bookmark { margin-bottom: 25px; padding: 15px; border: 1px solid #e1e8ed; border-radius: 8px; page-break-inside: avoid; }
        .bookmark-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .author { font-weight: bold; color: #1da1f2; }
        .date { color: #657786; font-size: 0.9em; }
        .text { margin: 10px 0; line-height: 1.5; }
        .tags { margin-top: 10px; }
        .tag { display: inline-block; background: #e1f5fe; color: #0277bd; padding: 2px 8px; margin: 2px; border-radius: 12px; font-size: 0.8em; }
        .engagement { color: #657786; font-size: 0.8em; margin-top: 5px; }
        .url { color: #1da1f2; text-decoration: none; word-break: break-all; }
        .footer { margin-top: 30px; text-align: center; color: #657786; font-size: 0.8em; border-top: 1px solid #e1e8ed; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Generated by XSaved Extension</p>
    </div>
    
    <div class="metadata">
        ${metadata}
    </div>
    
    <div class="bookmarks">
        ${bookmarksHTML}
    </div>
    
    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>Total bookmarks: ${bookmarks.length}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate PDF title
   */
  private generateTitle(options: ExportOptions): string {
    if (options.filters?.tags?.length) {
      return `Bookmarks - ${options.filters.tags.join(', ')}`;
    }
    if (options.filters?.author) {
      return `Bookmarks by ${options.filters.author}`;
    }
    if (options.filters?.dateFrom && options.filters?.dateTo) {
      return `Bookmarks from ${options.filters.dateFrom} to ${options.filters.dateTo}`;
    }
    return 'My X.com Bookmarks';
  }

  /**
   * Generate PDF metadata
   */
  private generatePDFMetadata(bookmarks: BookmarkEntity[], options: ExportOptions): string {
    const totalBookmarks = bookmarks.length;
    const totalLikes = bookmarks.reduce((sum, b) => sum + (b.likes || 0), 0);
    const totalRetweets = bookmarks.reduce((sum, b) => sum + (b.retweets || 0), 0);
    const totalReplies = bookmarks.reduce((sum, b) => sum + (b.replies || 0), 0);
    const uniqueAuthors = new Set(bookmarks.map(b => b.author)).size;
    const allTags = bookmarks.flatMap(b => b.tags || []);
    const uniqueTags = new Set(allTags).size;
    
    let filters = '';
    if (options.filters) {
      const filterParts = [];
      if (options.filters.tags?.length) {
        filterParts.push(`Tags: ${options.filters.tags.join(', ')}`);
      }
      if (options.filters.author) {
        filterParts.push(`Author: ${options.filters.author}`);
      }
      if (options.filters.dateFrom && options.filters.dateTo) {
        filterParts.push(`Date range: ${options.filters.dateFrom} to ${options.filters.dateTo}`);
      }
      if (filterParts.length > 0) {
        filters = `<p><strong>Filters:</strong> ${filterParts.join(' | ')}</p>`;
      }
    }
    
    return `
        <h3>Export Summary</h3>
        <p><strong>Total bookmarks:</strong> ${totalBookmarks}</p>
        <p><strong>Unique authors:</strong> ${uniqueAuthors}</p>
        <p><strong>Unique tags:</strong> ${uniqueTags}</p>
        <p><strong>Total engagement:</strong> ${totalLikes} likes, ${totalRetweets} retweets, ${totalReplies} replies</p>
        ${filters}
    `;
  }

  /**
   * Generate bookmarks HTML for PDF
   */
  private generateBookmarksHTML(bookmarks: BookmarkEntity[]): string {
    return bookmarks.map(bookmark => `
        <div class="bookmark">
            <div class="bookmark-header">
                <span class="author">@${bookmark.author}</span>
                <span class="date">${new Date(bookmark.created_at).toLocaleDateString()}</span>
            </div>
            <div class="text">${this.escapeHTML(bookmark.text)}</div>
            ${bookmark.tags?.length ? `
                <div class="tags">
                    ${bookmark.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="engagement">
                ${bookmark.likes || 0} likes • ${bookmark.retweets || 0} retweets • ${bookmark.replies || 0} replies
            </div>
            <div class="url">
                <a href="${bookmark.url}" target="_blank">${bookmark.url}</a>
            </div>
        </div>
    `).join('');
  }

  /**
   * Escape CSV field
   */
  private escapeCsvField(field: string): string {
    if (!field) return '';
    const cleanField = field.replace(/[\r\n]/g, ' ');
    if (cleanField.includes(',') || cleanField.includes('"') || cleanField.includes('\n')) {
      return `"${cleanField.replace(/"/g, '""')}"`;
    }
    return cleanField;
  }

  /**
   * Escape HTML
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate filename based on format and metadata
   */
  private generateFilename(format: string, metadata: any): string {
    const date = new Date().toISOString().split('T')[0];
    const count = metadata.totalBookmarks;
    
    let baseName = `xsaved-bookmarks-${date}-${count}`;
    
    if (metadata.filters.tags?.length) {
      baseName += `-${metadata.filters.tags.join('-')}`;
    }
    if (metadata.filters.author) {
      baseName += `-${metadata.filters.author}`;
    }
    
    return `${baseName}.${format}`;
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): Array<{ format: string; name: string; description: string }> {
    return [
      {
        format: 'csv',
        name: 'CSV Export',
        description: 'Spreadsheet format for data analysis'
      },
      {
        format: 'json',
        name: 'JSON API',
        description: 'Programmatic access to bookmark data'
      },
      {
        format: 'pdf',
        name: 'PDF Report',
        description: 'Printable reading list with metadata (HTML format)'
      }
    ];
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.format) {
      errors.push('Export format is required');
    }

    if (!['csv', 'pdf', 'json'].includes(options.format)) {
      errors.push(`Unsupported format: ${options.format}`);
    }

    if (options.filters?.dateFrom && options.filters?.dateTo) {
      const fromDate = new Date(options.filters.dateFrom);
      const toDate = new Date(options.filters.dateTo);
      
      if (fromDate > toDate) {
        errors.push('Date range is invalid: from date must be before to date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
} 