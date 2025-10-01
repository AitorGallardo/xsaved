/**
 * XSaved Extension v2 - Notification System
 * Toast notifications and progress feedback for user actions
 * Consistent with existing UI patterns
 */

/**
 * Toast notification types
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  PROGRESS: 'progress'
};

/**
 * Global notification container management
 */
let notificationContainer = null;

/**
 * Initialize notification system
 * Creates the notification container if it doesn't exist
 */
export const initializeNotificationSystem = () => {
  if (notificationContainer) return;

  notificationContainer = document.createElement('div');
  notificationContainer.id = 'xsaved-notifications';
  notificationContainer.className = 'xsaved-notification-container';
  
  // Add styles
  const styles = `
    .xsaved-notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      pointer-events: none;
      max-width: 400px;
    }
    
    .xsaved-toast {
      background: var(--bg-primary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: auto;
      transform: translateX(100%);
      transition: all 0.3s ease;
      color: var(--text-primary, #fff);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      max-width: 100%;
      word-wrap: break-word;
    }
    
    .xsaved-toast.show {
      transform: translateX(0);
    }
    
    .xsaved-toast.success {
      border-left: 4px solid #10b981;
    }
    
    .xsaved-toast.error {
      border-left: 4px solid #ef4444;
    }
    
    .xsaved-toast.warning {
      border-left: 4px solid #f59e0b;
    }
    
    .xsaved-toast.info {
      border-left: 4px solid #3b82f6;
    }
    
    .xsaved-toast.progress {
      border-left: 4px solid #8b5cf6;
    }
    
    .xsaved-toast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .xsaved-toast-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .xsaved-toast-close {
      background: none;
      border: none;
      color: var(--text-secondary, #999);
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .xsaved-toast-close:hover {
      background-color: var(--bg-secondary, #2a2a2a);
    }
    
    .xsaved-toast-message {
      color: var(--text-secondary, #ccc);
      margin-bottom: 8px;
    }
    
    .xsaved-toast-progress {
      width: 100%;
      height: 6px;
      background-color: var(--bg-secondary, #2a2a2a);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 8px;
      position: relative;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
    }
    
    .xsaved-toast-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, 
        currentColor 0%, 
        color-mix(in srgb, currentColor 80%, white 20%) 50%, 
        currentColor 100%);
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 3px;
      position: relative;
      overflow: hidden;
    }
    
    .xsaved-toast-progress-bar::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(255, 255, 255, 0.2) 50%, 
        transparent 100%);
      animation: toastProgressShimmer 1.8s infinite;
    }
    
    @keyframes toastProgressShimmer {
      0% {
        left: -100%;
      }
      100% {
        left: 100%;
      }
    }
    
    .xsaved-toast-details {
      font-size: 12px;
      color: var(--text-tertiary, #888);
      margin-top: 4px;
    }
  `;
  
  // Add styles to document
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  // Add container to document
  document.body.appendChild(notificationContainer);
  
  console.log('✅ XSaved notification system initialized');
};

/**
 * Show a toast notification
 * @param {Object} options - Notification options
 * @param {string} options.type - Toast type (success, error, warning, info, progress)
 * @param {string} options.title - Toast title
 * @param {string} options.message - Toast message
 * @param {number} options.duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @param {boolean} options.closable - Whether to show close button
 * @param {Function} options.onClose - Callback when toast is closed
 * @returns {Object} Toast instance with update/close methods
 */
export const showToast = (options) => {
  const {
    type = TOAST_TYPES.INFO,
    title = '',
    message = '',
    duration = 5000,
    closable = true,
    onClose = () => {}
  } = options;

  // Initialize system if needed
  if (!notificationContainer) {
    initializeNotificationSystem();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `xsaved-toast ${type}`;
  
  // Get icon for type
  const getIcon = (toastType) => {
    switch (toastType) {
      case TOAST_TYPES.SUCCESS: return '✅';
      case TOAST_TYPES.ERROR: return '❌';
      case TOAST_TYPES.WARNING: return '⚠️';
      case TOAST_TYPES.INFO: return 'ℹ️';
      case TOAST_TYPES.PROGRESS: return '🔄';
      default: return '';
    }
  };

  // Build toast HTML
  toast.innerHTML = `
    <div class="xsaved-toast-header">
      <div class="xsaved-toast-title">
        <span>${getIcon(type)}</span>
        <span>${title}</span>
      </div>
      ${closable ? '<button class="xsaved-toast-close" type="button">×</button>' : ''}
    </div>
    ${message ? `<div class="xsaved-toast-message">${message}</div>` : ''}
    <div class="xsaved-toast-progress" style="display: none;">
      <div class="xsaved-toast-progress-bar" style="width: 0%;"></div>
    </div>
    <div class="xsaved-toast-details" style="display: none;"></div>
  `;

  // Add to container
  notificationContainer.appendChild(toast);

  // Show animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Close functionality
  const closeToast = () => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      onClose();
    }, 300);
  };

  // Add close button listener
  const closeButton = toast.querySelector('.xsaved-toast-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeToast);
  }

  // Auto-dismiss
  let autoCloseTimer = null;
  if (duration > 0) {
    autoCloseTimer = setTimeout(closeToast, duration);
  }

  // Return toast instance with control methods
  return {
    element: toast,
    close: closeToast,
    
    // Update progress (for progress type toasts)
    updateProgress: (current, total, details = '') => {
      const progressContainer = toast.querySelector('.xsaved-toast-progress');
      const progressBar = toast.querySelector('.xsaved-toast-progress-bar');
      const detailsElement = toast.querySelector('.xsaved-toast-details');
      
      if (progressContainer && progressBar) {
        progressContainer.style.display = 'block';
        const percentage = Math.min(100, Math.max(0, (current / total) * 100));
        progressBar.style.width = `${percentage}%`;
        
        if (detailsElement && details) {
          detailsElement.style.display = 'block';
          detailsElement.textContent = details;
        }
      }
    },
    
    // Update message
    updateMessage: (newMessage) => {
      const messageElement = toast.querySelector('.xsaved-toast-message');
      if (messageElement) {
        messageElement.textContent = newMessage;
      }
    },
    
    // Update type and title
    updateType: (newType, newTitle) => {
      toast.className = `xsaved-toast ${newType} show`;
      const titleElement = toast.querySelector('.xsaved-toast-title span:last-child');
      const iconElement = toast.querySelector('.xsaved-toast-title span:first-child');
      
      if (titleElement) titleElement.textContent = newTitle;
      if (iconElement) iconElement.textContent = getIcon(newType);
    },
    
    // Cancel auto-close
    cancelAutoClose: () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
      }
    }
  };
};

/**
 * Show success notification
 * @param {string} title - Success title
 * @param {string} message - Success message
 * @param {number} duration - Auto-dismiss duration
 * @returns {Object} Toast instance
 */
export const showSuccess = (title, message = '', duration = 4000) => {
  return showToast({
    type: TOAST_TYPES.SUCCESS,
    title,
    message,
    duration
  });
};

/**
 * Show error notification
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {number} duration - Auto-dismiss duration (0 = no auto-dismiss)
 * @returns {Object} Toast instance
 */
export const showError = (title, message = '', duration = 0) => {
  return showToast({
    type: TOAST_TYPES.ERROR,
    title,
    message,
    duration,
    closable: true
  });
};

/**
 * Show warning notification
 * @param {string} title - Warning title
 * @param {string} message - Warning message
 * @param {number} duration - Auto-dismiss duration
 * @returns {Object} Toast instance
 */
export const showWarning = (title, message = '', duration = 6000) => {
  return showToast({
    type: TOAST_TYPES.WARNING,
    title,
    message,
    duration
  });
};

/**
 * Show info notification
 * @param {string} title - Info title
 * @param {string} message - Info message
 * @param {number} duration - Auto-dismiss duration
 * @returns {Object} Toast instance
 */
export const showInfo = (title, message = '', duration = 5000) => {
  return showToast({
    type: TOAST_TYPES.INFO,
    title,
    message,
    duration
  });
};

/**
 * Show progress notification
 * @param {string} title - Progress title
 * @param {string} message - Initial message
 * @returns {Object} Toast instance with progress methods
 */
export const showProgress = (title, message = '') => {
  return showToast({
    type: TOAST_TYPES.PROGRESS,
    title,
    message,
    duration: 0, // Don't auto-dismiss progress toasts
    closable: false
  });
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = () => {
  if (notificationContainer) {
    const toasts = notificationContainer.querySelectorAll('.xsaved-toast');
    toasts.forEach(toast => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    });
  }
};

console.log('📢 XSaved notification system loaded');
