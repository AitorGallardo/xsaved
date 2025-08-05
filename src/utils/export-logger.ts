/**
 * Export Logger - Robust error tracking and user feedback
 * Provides detailed logging and error categorization for export operations
 */

export interface ExportLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  context: 'content-script' | 'service-worker' | 'export-manager';
  action: string;
  message: string;
  details?: any;
  error?: Error;
  duration?: number;
}

export interface ExportError {
  code: string;
  message: string;
  context: string;
  recoverable: boolean;
  userMessage: string;
  suggestions: string[];
}

export class ExportLogger {
  private logs: ExportLogEntry[] = [];
  private maxLogs = 100;

  /**
   * Log an information message
   */
  info(context: string, action: string, message: string, details?: any) {
    this.addLog('info', context, action, message, details);
  }

  /**
   * Log a warning message
   */
  warn(context: string, action: string, message: string, details?: any) {
    this.addLog('warn', context, action, message, details);
  }

  /**
   * Log an error message
   */
  error(context: string, action: string, message: string, error?: Error, details?: any) {
    this.addLog('error', context, action, message, details, error);
  }

  /**
   * Log a success message
   */
  success(context: string, action: string, message: string, details?: any) {
    this.addLog('success', context, action, message, details);
  }

  /**
   * Add a log entry
   */
  private addLog(level: ExportLogEntry['level'], context: string, action: string, message: string, details?: any, error?: Error) {
    const entry: ExportLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context as ExportLogEntry['context'],
      action,
      message,
      details,
      error
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with emoji and context
    const emoji = this.getLevelEmoji(level);
    const prefix = `[${context.toUpperCase()}]`;
    const logMessage = `${emoji} ${prefix} ${action}: ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage, error || '');
        break;
      case 'success':
        console.log(logMessage);
        break;
    }

    if (details) {
      console.log('📋 Details:', details);
    }
  }

  /**
   * Get emoji for log level
   */
  private getLevelEmoji(level: ExportLogEntry['level']): string {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📝';
    }
  }

  /**
   * Get all logs
   */
  getLogs(): ExportLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: ExportLogEntry['level']): ExportLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by context
   */
  getLogsByContext(context: string): ExportLogEntry[] {
    return this.logs.filter(log => log.context === context);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get error summary
   */
  getErrorSummary(): { total: number; byContext: Record<string, number>; recent: ExportLogEntry[] } {
    const errors = this.getLogsByLevel('error');
    const byContext: Record<string, number> = {};
    
    errors.forEach(error => {
      byContext[error.context] = (byContext[error.context] || 0) + 1;
    });

    return {
      total: errors.length,
      byContext,
      recent: errors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * Export Error Categories
 */
export const EXPORT_ERRORS = {
  // Service Worker Errors
  SW_INIT_FAILED: {
    code: 'SW_INIT_FAILED',
    message: 'Service worker initialization failed',
    context: 'service-worker',
    recoverable: false,
    userMessage: 'Extension service worker failed to start',
    suggestions: ['Reload the extension', 'Check browser console for errors']
  },

  SW_IMPORT_FAILED: {
    code: 'SW_IMPORT_FAILED',
    message: 'Failed to import export modules',
    context: 'service-worker',
    recoverable: false,
    userMessage: 'Export system failed to load',
    suggestions: ['Reload the extension', 'Check if all files are present']
  },

  SW_EXPORT_FAILED: {
    code: 'SW_EXPORT_FAILED',
    message: 'Export processing failed',
    context: 'service-worker',
    recoverable: true,
    userMessage: 'Failed to process export request',
    suggestions: ['Try again with fewer bookmarks', 'Check export options']
  },

  // Content Script Errors
  CS_DIALOG_FAILED: {
    code: 'CS_DIALOG_FAILED',
    message: 'Failed to create export dialog',
    context: 'content-script',
    recoverable: true,
    userMessage: 'Export dialog failed to open',
    suggestions: ['Refresh the page', 'Try again']
  },

  CS_DOWNLOAD_FAILED: {
    code: 'CS_DOWNLOAD_FAILED',
    message: 'File download failed',
    context: 'content-script',
    recoverable: true,
    userMessage: 'Failed to download export file',
    suggestions: ['Check download permissions', 'Try manual download']
  },

  CS_MESSAGE_FAILED: {
    code: 'CS_MESSAGE_FAILED',
    message: 'Failed to communicate with service worker',
    context: 'content-script',
    recoverable: true,
    userMessage: 'Communication with extension failed',
    suggestions: ['Reload the page', 'Check extension status']
  },

  // Export Manager Errors
  EM_VALIDATION_FAILED: {
    code: 'EM_VALIDATION_FAILED',
    message: 'Export options validation failed',
    context: 'export-manager',
    recoverable: true,
    userMessage: 'Export options are invalid',
    suggestions: ['Check export format', 'Verify filter options']
  },

  EM_GENERATION_FAILED: {
    code: 'EM_GENERATION_FAILED',
    message: 'File generation failed',
    context: 'export-manager',
    recoverable: true,
    userMessage: 'Failed to generate export file',
    suggestions: ['Try different format', 'Reduce bookmark count']
  },

  EM_MEMORY_ERROR: {
    code: 'EM_MEMORY_ERROR',
    message: 'Insufficient memory for export',
    context: 'export-manager',
    recoverable: true,
    userMessage: 'Too many bookmarks for export',
    suggestions: ['Export fewer bookmarks', 'Use filters to reduce data']
  }
};

/**
 * Create export error from error code
 */
export function createExportError(code: string, originalError?: Error, details?: any): ExportError {
  const errorTemplate = EXPORT_ERRORS[code as keyof typeof EXPORT_ERRORS];
  
  if (!errorTemplate) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown export error',
      context: 'unknown',
      recoverable: false,
      userMessage: 'An unexpected error occurred',
      suggestions: ['Try again', 'Contact support']
    };
  }

  return {
    ...errorTemplate,
    message: originalError ? `${errorTemplate.message}: ${originalError.message}` : errorTemplate.message,
    details
  };
}

/**
 * Global export logger instance
 */
export const exportLogger = new ExportLogger(); 