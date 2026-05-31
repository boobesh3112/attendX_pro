/**
 * Centralized Theme System Manager
 * Handles three mutually exclusive themes: Light, Dark (Purple), AMOLED (Animated)
 */

export type ThemeMode = "light" | "dark" | "amoled";

const THEME_STORAGE_KEY = "app-theme-mode";
const DEFAULT_THEME: ThemeMode = "dark";

class ThemeSystemManager {
  private currentTheme: ThemeMode = DEFAULT_THEME;
  private listeners: Set<(theme: ThemeMode) => void> = new Set();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize theme system before app renders
   */
  private initialize(): void {
    // Load saved theme or use default
    const saved = this.loadTheme();
    this.currentTheme = saved || DEFAULT_THEME;

    // Apply immediately to prevent flash
    this.applyThemeToDOM(this.currentTheme);
  }

  /**
   * Load theme from localStorage
   */
  private loadTheme(): ThemeMode | null {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "amoled") {
        return stored;
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
    return null;
  }

  /**
   * Save theme to localStorage
   */
  private saveTheme(theme: ThemeMode): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }

  /**
   * Apply theme classes to DOM
   */
  private applyThemeToDOM(theme: ThemeMode): void {
    const html = document.documentElement;

    // Remove all theme classes first
    html.classList.remove("light", "dark", "amoled");

    // Add the active theme class
    html.classList.add(theme);

    // Set data attribute for CSS selectors
    html.setAttribute("data-theme", theme);
  }

  /**
   * Get current theme
   */
  getTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Check if specific theme is active
   */
  isLight(): boolean {
    return this.currentTheme === "light";
  }

  isDark(): boolean {
    return this.currentTheme === "dark";
  }

  isAmoled(): boolean {
    return this.currentTheme === "amoled";
  }

  /**
   * Set theme (mutually exclusive)
   */
  setTheme(theme: ThemeMode): void {
    if (this.currentTheme === theme) return;

    // Update current theme
    this.currentTheme = theme;

    // Apply to DOM
    this.applyThemeToDOM(theme);

    // Persist
    this.saveTheme(theme);

    // Notify listeners
    this.notifyListeners(theme);
  }

  /**
   * Toggle between Light and Dark (not AMOLED)
   */
  toggleLightDark(): void {
    if (this.currentTheme === "light") {
      this.setTheme("dark");
    } else if (this.currentTheme === "dark") {
      this.setTheme("light");
    } else {
      // If AMOLED, switch to dark
      this.setTheme("dark");
    }
  }

  /**
   * Enable AMOLED mode (disables Light/Dark)
   */
  enableAmoled(): void {
    this.setTheme("amoled");
  }

  /**
   * Disable AMOLED mode (returns to Dark)
   */
  disableAmoled(): void {
    this.setTheme("dark");
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: (theme: ThemeMode) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(theme: ThemeMode): void {
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error("Theme listener error:", error);
      }
    });
  }

  /**
   * Force re-apply current theme (useful for recovery)
   */
  reapplyTheme(): void {
    this.applyThemeToDOM(this.currentTheme);
  }
}

// Singleton instance
export const themeSystem = new ThemeSystemManager();

// Initialize theme IMMEDIATELY (before React renders)
if (typeof window !== "undefined") {
  themeSystem.reapplyTheme();
}
