/**
 * Export Manager - Component 5 Phase 1
 * Orchestrates export operations for bookmarks
 */

import { BookmarkEntity, QueryOptions } from '../db/types';
import { CSVGenerator } from './formats/csv-generator';
import { PDFGenerator } from './formats/pdf-generator';
import { JSONGenerator } from './formats/json-generator';

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

export class ExportManager {
  private csvGenerator: CSVGenerator;
  private pdfGenerator: PDFGenerator;
  private jsonGenerator: JSONGenerator;

  constructor() {
    this.csvGenerator = new CSVGenerator();
    this.pdfGenerator = new PDFGenerator();
    this.jsonGenerator = new JSONGenerator();
  }

  /**
   * Export bookmarks based on options
   */
  async exportBookmarks(
    bookmarks: BookmarkEntity[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log(`📤 Starting export: ${options.format} format`);
      
      const metadata = {
        totalBookmarks: bookmarks.length,
        exportDate: new Date().toISOString(),
        filters: options.filters || {}
      };

      let result: ExportResult;

      switch (options.format) {
        case 'csv':
          result = await this.csvGenerator.generate(bookmarks, options);
          break;
        case 'pdf':
          result = await this.pdfGenerator.generate(bookmarks, options);
          break;
        case 'json':
          result = await this.jsonGenerator.generate(bookmarks, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      result.metadata = metadata;
      result.filename = options.filename || this.generateFilename(options.format, metadata);
      
      console.log(`✅ Export completed: ${result.filename} (${bookmarks.length} bookmarks)`);
      return result;

    } catch (error) {
      console.error('❌ Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
        filename: options.filename || `export-${Date.now()}.${options.format}`
      };
    }
  }

  /**
   * Generate filename based on format and metadata
   */
  private generateFilename(format: string, metadata: any): string {
    const date = new Date().toISOString().split('T')[0];
    const count = metadata.totalBookmarks;
    
    let baseName = `xsaved-bookmarks-${date}-${count}`;
    
    // Add filter info if present
    if (metadata.filters.tags?.length) {
      baseName += `-${metadata.filters.tags.join('-')}`;
    }
    if (metadata.filters.author) {
      baseName += `-${metadata.filters.author}`;
    }
    
    return `${baseName}.${format}`;
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): Array<{ format: string; name: string; description: string }> {
    return [
      {
        format: 'csv',
        name: 'CSV Export',
        description: 'Spreadsheet format for data analysis'
      },
      {
        format: 'pdf',
        name: 'PDF Report',
        description: 'Printable reading list with metadata'
      },
      {
        format: 'json',
        name: 'JSON API',
        description: 'Programmatic access to bookmark data'
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