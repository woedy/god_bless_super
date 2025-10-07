import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Safe initialization to prevent SSR issues
    if (typeof window === 'undefined') {
      return defaultTheme;
    }
    
    try {
      // Check localStorage first
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (error) {
      console.warn('Error accessing localStorage or matchMedia:', error);
    }
    
    return defaultTheme;
  });

  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window === 'undefined') return;
    
    try {
      const root = window.document.documentElement;
      const body = window.document.body;
      
      // Remove both classes first
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');
      
      // Add the current theme class
      root.classList.add(theme);
      body.classList.add(theme);
      
      // Persist to localStorage
      localStorage.setItem('theme', theme);
      
      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#1A222C' : '#FFFFFF');
      }
    } catch (error) {
      console.warn('Error updating theme:', error);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
