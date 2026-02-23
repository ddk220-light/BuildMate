import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { detectTheme, type ThemeId } from '../lib/themeDetector';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  detectAndApply: (prompt: string) => ThemeId;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'buildmate_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored && ['neutral', 'gaming', 'creative', 'budget'].includes(stored)) {
        return stored as ThemeId;
      }
    } catch {}
    return 'neutral';
  });

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      sessionStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
  }, []);

  const detectAndApply = useCallback((prompt: string): ThemeId => {
    const detected = detectTheme(prompt);
    setTheme(detected);
    return detected;
  }, [setTheme]);

  // Sync data-theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, detectAndApply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
