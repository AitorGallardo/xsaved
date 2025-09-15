/**
 * XSaved Extension v2 - Theme Integration Module
 * Integrates theme synchronization with content script
 */

console.log('🎨 XSaved Theme Integration loaded');

// ===== THEME STATE =====
let currentTheme = null;
let themeStyleElement = null;
let cookieCheckInterval = null;

// ===== X.com THEME DETECTION =====
class XThemeDetector {
  constructor() {
    this.observers = [];
    this.setupThemeDetection();
  }

  /**
   * Detects current X.com theme from cookies and DOM
   */
  detectTheme() {
    const nightMode = this.getCookieValue('night_mode') || '0';
    const mode = this.parseNightMode(nightMode);
    const accentColor = this.getAccentColorFromDOM();
    
    const theme = {
      mode,
      accentColor,
      ...this.getThemeColors(mode)
    };

    if (!this.themesEqual(currentTheme, theme)) {
      currentTheme = theme;
      this.applyTheme(theme);
      this.notifyObservers(theme);
      console.log('🎨 Theme changed:', theme);
    }

    return theme;
  }

  /**
   * Gets cookie value by name from document.cookie
   */
  getCookieValue(name) {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Parses night_mode cookie value to theme mode
   */
  parseNightMode(value) {
    switch (value) {
      case '1': return 'dim';
      case '2': return 'dark';
      default: return 'light';
    }
  }

  /**
   * Gets theme colors based on mode - matching X.com's exact colors
   */
  getThemeColors(mode) {
    switch (mode) {
      case 'light':
        return {
          primaryColor: '#1d9bf0', // X.com blue
          backgroundColor: '#ffffff', // Pure white background
          surfaceColor: '#f7f9fa', // Light gray surface
          textColor: '#0f1419', // Almost black text
          secondaryTextColor: '#536471', // Gray secondary text
          borderColor: '#cfd9de', // Light border (from screenshots)
          hoverColor: 'rgba(15, 20, 25, 0.1)', // Light hover
          inputBackground: '#eff3f4', // Search input background
          placeholderColor: '#536471' // Placeholder text color
        };
      
      case 'dim':
        return {
          primaryColor: '#1d9bf0', // X.com blue
          backgroundColor: '#15202b', // Dim background
          surfaceColor: '#1e2732', // Darker surface
          textColor: '#f7f9fa', // Light text on dark
          secondaryTextColor: '#8b98a5', // Muted light gray
          borderColor: '#38444d', // Dim border
          hoverColor: 'rgba(247, 249, 250, 0.1)', // Subtle hover
          inputBackground: '#273340', // Darker input background
          placeholderColor: '#8b98a5' // Muted placeholder
        };
      
      case 'dark':
        return {
          primaryColor: '#1d9bf0', // X.com blue
          backgroundColor: '#000000', // Pure black background
          surfaceColor: '#16181c', // Very dark surface
          textColor: '#e7e9ea', // Light gray text
          secondaryTextColor: '#71767b', // Darker gray secondary
          borderColor: '#2f3336', // Dark border
          hoverColor: 'rgba(231, 233, 234, 0.1)', // Subtle light hover
          inputBackground: '#202327', // Dark input background
          placeholderColor: '#71767b' // Dark placeholder
        };
    }
  }

  /**
   * Attempts to detect custom accent color from X.com DOM
   */
  getAccentColorFromDOM() {
    // Try to find the primary color from X.com's styling
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    // Check for CSS custom properties that X might use
    const possibleProperties = [
      '--color-primary',
      '--color-brand',
      '--color-accent',
      '--twitter-color'
    ];

    for (const prop of possibleProperties) {
      const value = computedStyle.getPropertyValue(prop);
      if (value) {
        return value.trim();
      }
    }

    // Look for primary color in common UI elements
    const primaryElements = document.querySelectorAll([
      '[data-testid="like"]',
      '[data-testid="retweet"]', 
      '[data-testid="reply"]',
      'a[href*="twitter.com"]',
      '[role="button"]'
    ].join(', '));

    for (const element of Array.from(primaryElements).slice(0, 10)) {
      const style = getComputedStyle(element);
      const color = style.color;
      
      // Check if it's a blue-ish color (Twitter's usual accent)
      if (color && color.includes('rgb')) {
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch.map(Number);
          // Detect if it's a blue-ish color
          if (b > r && b > g && b > 100) {
            return color;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Sets up theme detection and monitoring
   */
  setupThemeDetection() {
    // Initial detection
    this.detectTheme();

    // Poll for cookie changes every 2 seconds
    cookieCheckInterval = setInterval(() => {
      this.detectTheme();
    }, 2000);

    // Watch for DOM changes that might indicate theme changes
    const observer = new MutationObserver(() => {
      // Debounce the theme detection
      clearTimeout(this.detectThemeTimeout);
      this.detectThemeTimeout = setTimeout(() => {
        this.detectTheme();
      }, 500);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
      subtree: false
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Applies theme to the extension UI
   */
  applyTheme(theme) {
    // Set data attribute for theme-specific CSS
    document.documentElement.setAttribute('data-xsaved-theme', theme.mode);

    // Generate CSS variables
    const cssVariables = this.generateCSSVariables(theme);
    
    // Create or update theme style element
    if (!themeStyleElement) {
      themeStyleElement = document.createElement('style');
      themeStyleElement.id = 'xsaved-theme-vars';
      document.head.appendChild(themeStyleElement);
    }

    themeStyleElement.textContent = `
      :root {
        ${cssVariables}
      }
    `;

    console.log('🎨 Applied theme CSS variables:', theme.mode);
    console.log('🎨 Text color set to:', theme.textColor);
    console.log('🎨 CSS Variables injected:', cssVariables);
  }

  /**
   * Generates CSS custom properties for the theme
   */
  generateCSSVariables(theme) {
    return `
      --xsaved-primary-color: ${theme.primaryColor};
      --xsaved-bg-color: ${theme.backgroundColor};
      --xsaved-surface-color: ${theme.surfaceColor};
      --xsaved-text-color: ${theme.textColor};
      --xsaved-text-secondary: ${theme.secondaryTextColor};
      --xsaved-border-color: ${theme.borderColor};
      --xsaved-hover-color: ${theme.hoverColor};
      --xsaved-accent-color: ${theme.accentColor || theme.primaryColor};
      --xsaved-input-bg: ${theme.inputBackground};
      --xsaved-placeholder-color: ${theme.placeholderColor};
    `;
  }

  /**
   * Compares two themes for equality
   */
  themesEqual(theme1, theme2) {
    if (!theme1 || !theme2) return false;
    return (
      theme1.mode === theme2.mode &&
      theme1.accentColor === theme2.accentColor &&
      theme1.primaryColor === theme2.primaryColor
    );
  }

  /**
   * Subscribe to theme changes
   */
  onThemeChange(callback) {
    this.observers.push(callback);
    
    // Call immediately with current theme if available
    if (currentTheme) {
      callback(currentTheme);
    }

    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all observers of theme change
   */
  notifyObservers(theme) {
    this.observers.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error('Theme observer error:', error);
      }
    });
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return currentTheme;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (cookieCheckInterval) {
      clearInterval(cookieCheckInterval);
    }
    this.observers = [];
    if (themeStyleElement) {
      themeStyleElement.remove();
    }
  }
}

// ===== THEME INTEGRATION FUNCTIONS =====

/**
 * Initialize theme synchronization
 */
function initializeThemeSync() {
  console.log('🎨 Initializing XSaved theme synchronization...');
  
  // Load theme CSS file
  loadThemeCSS();
  
  // Create theme detector
  const themeDetector = new XThemeDetector();
  
  // Store globally for access from content script
  window.xsavedThemeDetector = themeDetector;
  
  console.log('✅ XSaved theme synchronization initialized');
  
  return themeDetector;
}

/**
 * Load theme CSS file
 */
function loadThemeCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/ui/theme-sync.css');
  link.id = 'xsaved-theme-css';
  document.head.appendChild(link);
  
  console.log('🎨 Loaded theme CSS file');
}

/**
 * Get current theme (utility function)
 */
function getCurrentXTheme() {
  return window.xsavedThemeDetector?.getCurrentTheme() || null;
}

/**
 * Subscribe to theme changes (utility function)
 */
function onXThemeChange(callback) {
  return window.xsavedThemeDetector?.onThemeChange(callback) || (() => {});
}

// ===== EXPORTS =====
window.XSavedTheme = {
  initialize: initializeThemeSync,
  getCurrentTheme: getCurrentXTheme,
  onThemeChange: onXThemeChange,
  detector: () => window.xsavedThemeDetector
};

// Auto-initialize if content script is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeThemeSync);
} else {
  initializeThemeSync();
}
