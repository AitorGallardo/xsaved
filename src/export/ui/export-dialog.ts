/**
 * Export Dialog UI - Component 5 Phase 1
 * User interface for export functionality
 */

import { ExportManager, ExportOptions, ExportResult } from '../export-manager';
import { DEFAULT_EXPORT_FORMATS, ExportFormat } from '../index';

export class ExportDialog {
  private dialog: HTMLDivElement | null = null;
  private exportManager: ExportManager;
  private onExportComplete?: (result: ExportResult) => void;

  constructor(exportManager: ExportManager) {
    this.exportManager = exportManager;
  }

  /**
   * Show export dialog
   */
  show(bookmarks: any[], onComplete?: (result: ExportResult) => void): void {
    this.onExportComplete = onComplete;
    this.createDialog(bookmarks);
    this.showDialog();
  }

  /**
   * Create export dialog HTML
   */
  private createDialog(bookmarks: any[]): void {
    const dialog = document.createElement('div');
    dialog.className = 'xsaved-export-dialog';
    dialog.innerHTML = this.generateDialogHTML(bookmarks);
    
    this.setupEventListeners(dialog, bookmarks);
    this.dialog = dialog;
  }

  /**
   * Generate dialog HTML content
   */
  private generateDialogHTML(bookmarks: any[]): string {
    const formatsHTML = DEFAULT_EXPORT_FORMATS.map(format => `
      <div class="export-format-option" data-format="${format.format}">
        <div class="format-icon">${format.icon}</div>
        <div class="format-info">
          <div class="format-name">${format.name}</div>
          <div class="format-description">${format.description}</div>
        </div>
        <div class="format-radio">
          <input type="radio" name="export-format" value="${format.format}" ${format.format === 'csv' ? 'checked' : ''}>
        </div>
      </div>
    `).join('');

    return `
      <div class="export-dialog-overlay">
        <div class="export-dialog-content">
          <div class="export-dialog-header">
            <h2>📤 Export Bookmarks</h2>
            <button class="export-dialog-close" aria-label="Close">×</button>
          </div>
          
          <div class="export-dialog-body">
            <div class="export-summary">
              <p>Exporting <strong>${bookmarks.length}</strong> bookmarks</p>
            </div>
            
            <div class="export-section">
              <h3>📋 Export Format</h3>
              <div class="export-formats">
                ${formatsHTML}
              </div>
            </div>
            
            <div class="export-section">
              <h3>🔍 Filters (Optional)</h3>
              <div class="export-filters">
                <div class="filter-group">
                  <label for="export-tags">Tags:</label>
                  <input type="text" id="export-tags" placeholder="javascript, react, typescript">
                </div>
                <div class="filter-group">
                  <label for="export-author">Author:</label>
                  <input type="text" id="export-author" placeholder="@username">
                </div>
                <div class="filter-group">
                  <label for="export-date-from">Date From:</label>
                  <input type="date" id="export-date-from">
                </div>
                <div class="filter-group">
                  <label for="export-date-to">Date To:</label>
                  <input type="date" id="export-date-to">
                </div>
              </div>
            </div>
            
            <div class="export-section">
              <h3>📝 Options</h3>
              <div class="export-options">
                <label class="option-checkbox">
                  <input type="checkbox" id="export-include-metadata" checked>
                  <span>Include metadata and analytics</span>
                </label>
                <label class="option-checkbox">
                  <input type="checkbox" id="export-custom-filename">
                  <span>Custom filename</span>
                </label>
                <div class="custom-filename-input" style="display: none;">
                  <input type="text" id="export-filename" placeholder="my-bookmarks">
                </div>
              </div>
            </div>
          </div>
          
          <div class="export-dialog-footer">
            <button class="export-btn-cancel">Cancel</button>
            <button class="export-btn-export">📤 Export</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(dialog: HTMLDivElement, bookmarks: any[]): void {
    // Close button
    dialog.querySelector('.export-dialog-close')?.addEventListener('click', () => {
      this.hide();
    });

    // Cancel button
    dialog.querySelector('.export-btn-cancel')?.addEventListener('click', () => {
      this.hide();
    });

    // Export button
    dialog.querySelector('.export-btn-export')?.addEventListener('click', () => {
      this.handleExport(bookmarks);
    });

    // Format selection
    dialog.querySelectorAll('.export-format-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const radio = option.querySelector('input[type="radio"]') as HTMLInputElement;
        radio.checked = true;
        
        // Update visual selection
        dialog.querySelectorAll('.export-format-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        option.classList.add('selected');
      });
    });

    // Custom filename toggle
    const customFilenameCheckbox = dialog.querySelector('#export-custom-filename') as HTMLInputElement;
    const customFilenameInput = dialog.querySelector('.custom-filename-input') as HTMLDivElement;
    
    customFilenameCheckbox?.addEventListener('change', () => {
      if (customFilenameCheckbox.checked) {
        customFilenameInput.style.display = 'block';
      } else {
        customFilenameInput.style.display = 'none';
      }
    });

    // Outside click to close
    dialog.querySelector('.export-dialog-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hide();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  /**
   * Handle export button click
   */
  private async handleExport(bookmarks: any[]): Promise<void> {
    const exportButton = this.dialog?.querySelector('.export-btn-export') as HTMLButtonElement;
    const originalText = exportButton.textContent;
    
    try {
      // Disable button and show loading
      exportButton.disabled = true;
      exportButton.textContent = '⏳ Exporting...';
      
      // Get export options
      const options = this.getExportOptions();
      
      // Validate options
      const validation = this.exportManager.validateOptions(options);
      if (!validation.valid) {
        throw new Error(`Export options invalid: ${validation.errors.join(', ')}`);
      }
      
      // Apply filters if specified
      let filteredBookmarks = bookmarks;
      if (options.filters) {
        filteredBookmarks = this.applyFilters(bookmarks, options.filters);
      }
      
      // Perform export
      const result = await this.exportManager.exportBookmarks(filteredBookmarks, options);
      
      if (result.success) {
        // Download the file
        this.downloadFile(result);
        
        // Show success message
        this.showSuccessMessage(result);
        
        // Call completion callback
        this.onExportComplete?.(result);
        
        // Close dialog
        this.hide();
      } else {
        throw new Error(result.error || 'Export failed');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      this.showErrorMessage(error instanceof Error ? error.message : 'Export failed');
    } finally {
      // Restore button
      exportButton.disabled = false;
      exportButton.textContent = originalText;
    }
  }

  /**
   * Get export options from form
   */
  private getExportOptions(): ExportOptions {
    const format = (this.dialog?.querySelector('input[name="export-format"]:checked') as HTMLInputElement)?.value as 'csv' | 'pdf' | 'json';
    const includeMetadata = (this.dialog?.querySelector('#export-include-metadata') as HTMLInputElement)?.checked || false;
    const customFilename = (this.dialog?.querySelector('#export-custom-filename') as HTMLInputElement)?.checked || false;
    const filename = customFilename ? (this.dialog?.querySelector('#export-filename') as HTMLInputElement)?.value : undefined;
    
    const filters: any = {};
    
    // Get filter values
    const tagsInput = this.dialog?.querySelector('#export-tags') as HTMLInputElement;
    if (tagsInput?.value) {
      filters.tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    const authorInput = this.dialog?.querySelector('#export-author') as HTMLInputElement;
    if (authorInput?.value) {
      filters.author = authorInput.value.trim();
    }
    
    const dateFromInput = this.dialog?.querySelector('#export-date-from') as HTMLInputElement;
    if (dateFromInput?.value) {
      filters.dateFrom = dateFromInput.value;
    }
    
    const dateToInput = this.dialog?.querySelector('#export-date-to') as HTMLInputElement;
    if (dateToInput?.value) {
      filters.dateTo = dateToInput.value;
    }
    
    return {
      format,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      includeMetadata,
      filename: filename ? `${filename}.${format}` : undefined
    };
  }

  /**
   * Apply filters to bookmarks
   */
  private applyFilters(bookmarks: any[], filters: any): any[] {
    return bookmarks.filter(bookmark => {
      // Tag filter
      if (filters.tags?.length) {
        const bookmarkTags = bookmark.tags || [];
        const hasMatchingTag = filters.tags.some((tag: string) => 
          bookmarkTags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      
      // Author filter
      if (filters.author) {
        if (!bookmark.author.toLowerCase().includes(filters.author.toLowerCase())) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const bookmarkDate = new Date(bookmark.created_at);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (bookmarkDate < fromDate) return false;
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          if (bookmarkDate > toDate) return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Download exported file
   */
  private downloadFile(result: ExportResult): void {
    if (!result.data) return;
    
    const url = URL.createObjectURL(result.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Show success message
   */
  private showSuccessMessage(result: ExportResult): void {
    const message = `✅ Export completed successfully!\n\nFile: ${result.filename}\nSize: ${this.formatFileSize(result.size || 0)}\nBookmarks: ${result.metadata?.totalBookmarks || 0}`;
    alert(message);
  }

  /**
   * Show error message
   */
  private showErrorMessage(error: string): void {
    alert(`❌ Export failed: ${error}`);
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Show dialog
   */
  private showDialog(): void {
    if (this.dialog) {
      document.body.appendChild(this.dialog);
      this.dialog.style.display = 'block';
      
      // Focus first input
      setTimeout(() => {
        const firstInput = this.dialog?.querySelector('input') as HTMLInputElement;
        firstInput?.focus();
      }, 100);
    }
  }

  /**
   * Hide dialog
   */
  private hide(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
  }
} 