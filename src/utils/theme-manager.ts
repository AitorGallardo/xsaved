/**
 * XSaved Extension v2 - Theme Manager
 * Synchronizes extension theme with X.com user preferences
 */

export interface XTheme {
  mode: 'light' | 'dim' | 'dark';
  accentColor?: string;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  hoverColor: string;
  inputBackground: string;
  placeholderColor: string;
}

export class XThemeManager {
  private currentTheme: XTheme | null = null;
  private observers: ((theme: XTheme) => void)[] = [];
  private cookieObserver: MutationObserver | null = null;

  constructor() {
    this.detectTheme();
    this.setupThemeWatcher();
  }

  /**
   * Detects current X.com theme from cookies and DOM
   */
  async detectTheme(): Promise<XTheme> {
    const theme = await this.getThemeFromCookies();
    const accentColor = this.getAccentColorFromDOM();
    
    const fullTheme: XTheme = {
      ...theme,
      accentColor
    };

    if (!this.themesEqual(this.currentTheme, fullTheme)) {
      this.currentTheme = fullTheme;
      this.notifyObservers(fullTheme);
    }

    return fullTheme;
  }

  /**
   * Gets theme mode from X.com cookies
   */
  private async getThemeFromCookies(): Promise<Omit<XTheme, 'accentColor'>> {
    try {
      // Read night_mode cookie directly from document.cookie
      const nightMode = this.getCookieValue('night_mode') || '0';
      const mode = this.parseNightMode(nightMode);
      
      return this.getThemeColors(mode);
    } catch (error) {
      console.warn('Failed to read theme from cookies, using default:', error);
      return this.getThemeColors('light');
    }
  }

  /**
   * Gets cookie value by name from document.cookie
   */
  private getCookieValue(name: string): string | null {
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
  private parseNightMode(value: string): XTheme['mode'] {
    switch (value) {
      case '1': return 'dim';
      case '2': return 'dark';
      default: return 'light';
    }
  }

  /**
   * Gets theme colors based on mode - matching X.com's exact colors
   */
  private getThemeColors(mode: XTheme['mode']): Omit<XTheme, 'accentColor'> {
    const baseTheme = { mode };

    switch (mode) {
      case 'light':
        return {
          ...baseTheme,
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
          ...baseTheme,
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
          ...baseTheme,
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
  private getAccentColorFromDOM(): string | undefined {
    // X.com often sets CSS custom properties or inline styles for accent colors
    const root = document.documentElement;
    
    // Try to find accent color in various ways
    const possibleSelectors = [
      'rgb(29, 155, 240)', // Default Twitter blue
      // Add more color detection logic here based on X.com's implementation
    ];

    // Check for CSS custom properties
    const computedStyle = getComputedStyle(root);
    const accentProperty = computedStyle.getPropertyValue('--color-primary');
    
    if (accentProperty) {
      return accentProperty.trim();
    }

    // Check for primary color in links or buttons
    const primaryElements = document.querySelectorAll('[data-testid="tweet"] a, [role="button"]');
    for (const element of Array.from(primaryElements).slice(0, 5)) {
      const style = getComputedStyle(element);
      const color = style.color;
      if (color && color !== 'rgb(0, 0, 0)' && color !== 'rgb(255, 255, 255)') {
        // This might be the accent color
        return color;
      }
    }

    return undefined;
  }

  /**
   * Sets up watchers for theme changes
   */
  private setupThemeWatcher(): void {
    // Watch for cookie changes by observing document changes
    // (Cookies changes don't have direct observers, so we poll periodically)
    setInterval(() => {
      this.detectTheme();
    }, 2000); // Check every 2 seconds

    // Also watch for DOM changes that might indicate theme switches
    this.cookieObserver = new MutationObserver(() => {
      this.detectTheme();
    });

    this.cookieObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
      subtree: false
    });
  }

  /**
   * Compares two themes for equality
   */
  private themesEqual(theme1: XTheme | null, theme2: XTheme): boolean {
    if (!theme1) return false;
    return (
      theme1.mode === theme2.mode &&
      theme1.accentColor === theme2.accentColor &&
      theme1.primaryColor === theme2.primaryColor
    );
  }

  /**
   * Subscribes to theme changes
   */
  onThemeChange(callback: (theme: XTheme) => void): () => void {
    this.observers.push(callback);
    
    // Call immediately with current theme if available
    if (this.currentTheme) {
      callback(this.currentTheme);
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
   * Notifies all observers of theme change
   */
  private notifyObservers(theme: XTheme): void {
    this.observers.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error('Theme observer error:', error);
      }
    });
  }

  /**
   * Gets current theme (synchronous)
   */
  getCurrentTheme(): XTheme | null {
    return this.currentTheme;
  }

  /**
   * Generates CSS custom properties for the current theme
   */
  generateCSSVariables(theme: XTheme): string {
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
   * Cleanup
   */
  destroy(): void {
    if (this.cookieObserver) {
      this.cookieObserver.disconnect();
    }
    this.observers = [];
  }
}

// Export singleton instance
export const themeManager = new XThemeManager();
