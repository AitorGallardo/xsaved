/**
 * Standalone Export Module for Service Worker
 * No external dependencies, no DOM APIs
 */

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

export interface BookmarkEntity {
  id: string;
  text: string;
  author: string;
  created_at: string;
  bookmarked_at: string;
  tags?: string[];
  url?: string;
}

export class ServiceWorkerExportManager {
  constructor() {
    // No dependencies, no DOM APIs
  }

  /**
   * Export bookmarks based on options
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
   * Generate CSV format
   */
  private async generateCSV(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`📊 [SW] Generating CSV for ${bookmarks.length} bookmarks`);

      const headers = [
        'id', 'text', 'author', 'created_at', 'bookmarked_at',
        'tags', 'url'
      ];

      const rows = bookmarks.map(bookmark => [
        bookmark.id || '',
        this.escapeCsvField(bookmark.text || ''),
        bookmark.author || '',
        bookmark.created_at || '',
        bookmark.bookmarked_at || '',
        (bookmark.tags || []).join(', '),
        bookmark.url || ''
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.csv`,
        size: blob.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.csv`
      };
    }
  }

  /**
   * Generate JSON format
   */
  private async generateJSON(bookmarks: BookmarkEntity[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log(`📄 [SW] Generating JSON for ${bookmarks.length} bookmarks`);

      const data = {
        metadata: {
          totalBookmarks: bookmarks.length,
          exportDate: new Date().toISOString(),
          format: 'json',
          filters: options.filters || {}
        },
        bookmarks: bookmarks.map(bookmark => ({
          id: bookmark.id,
          text: bookmark.text,
          author: bookmark.author,
          created_at: bookmark.created_at,
          bookmarked_at: bookmark.bookmarked_at,
          tags: bookmark.tags || [],
          url: bookmark.url
        }))
      };

      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.json`,
        size: blob.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.json`
      };
    }
  }

  /**
   * Generate PDF format (returns HTML for now)
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
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>XSaved Bookmarks Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .bookmark { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
        .author { color: #666; font-size: 14px; }
        .tags { color: #888; font-size: 12px; }
        .date { color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <h1>XSaved Bookmarks Export</h1>
    <p>Exported on: ${new Date().toLocaleString()}</p>
    <p>Total bookmarks: ${limitedBookmarks.length}${bookmarks.length > maxBookmarksForPDF ? ` (limited from ${bookmarks.length})` : ''}</p>
    <hr>
    ${limitedBookmarks.map(bookmark => `
        <div class="bookmark">
            <div class="text">${this.escapeHTML(bookmark.text || '')}</div>
            <div class="author">By: ${bookmark.author || 'Unknown'}</div>
            <div class="date">Created: ${bookmark.created_at || 'Unknown'}</div>
            <div class="tags">Tags: ${(bookmark.tags || []).join(', ') || 'None'}</div>
        </div>
    `).join('')}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });

      return {
        success: true,
        data: blob,
        filename: options.filename || `bookmarks-${Date.now()}.html`,
        size: blob.size,
        metadata: {
          originalCount: bookmarks.length,
          exportedCount: limitedBookmarks.length,
          limited: bookmarks.length > maxBookmarksForPDF
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed',
        filename: options.filename || `bookmarks-${Date.now()}.html`
      };
    }
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