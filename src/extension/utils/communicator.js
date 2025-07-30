/**
 * Communication utilities for message passing between extension components
 * Adapted from the proven chrome_extension implementation
 */

export const notifyContentScript = (tabId, message) => new Promise((resolve, reject) => {
  if (!tabId) {
    resolve(); // Don't reject, just resolve silently
    return;
  }
  
  // Check if tab exists first
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      // Tab doesn't exist, resolve silently
      resolve();
      return;
    }
    
    // Check if tab is still valid (not chrome:// or extension pages)
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      resolve();
      return;
    }
    
    // Tab exists and is valid, send message
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not available, resolve silently (common during navigation)
        resolve();
      } else {
        resolve(response);
      }
    });
  });
});

// Safe popup message sender
export const notifyPopup = (message) => {
  try {
    chrome.runtime.sendMessage(message);
  } catch (error) {
    // Popup might not be open, fail silently
  }
};

export const updateProgress = async (current, total, tabId) => {
    if (!tabId) return;
    try {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
      await notifyContentScript(tabId, { 
        action: "updateProgress", 
        bookmarkCount: current,
        totalBookmarks: total,
        percentage: percentage
      });
    } catch (error) {
      // Silently handle tab/content script errors
      console.log("Tab unavailable for progress update (normal during long operations)");
    }
  }; 