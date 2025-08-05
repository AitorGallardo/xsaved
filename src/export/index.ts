/**
 * Export System - Component 5 Phase 1
 * Main entry point for the export functionality
 */

export { ExportManager, ExportOptions, ExportResult } from './export-manager';
export { CSVGenerator } from './formats/csv-generator';
export { PDFGenerator } from './formats/pdf-generator';
export { JSONGenerator } from './formats/json-generator';

// Export types for external use
export interface ExportFormat {
  format: 'csv' | 'pdf' | 'json';
  name: string;
  description: string;
  icon?: string;
}

export interface ExportFilter {
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  author?: string;
  search?: string;
}

// Default export formats
export const DEFAULT_EXPORT_FORMATS: ExportFormat[] = [
  {
    format: 'csv',
    name: 'CSV Export',
    description: 'Spreadsheet format for data analysis',
    icon: '📊'
  },
  {
    format: 'pdf',
    name: 'PDF Report',
    description: 'Printable reading list with metadata',
    icon: '📄'
  },
  {
    format: 'json',
    name: 'JSON API',
    description: 'Programmatic access to bookmark data',
    icon: '🔧'
  }
]; 