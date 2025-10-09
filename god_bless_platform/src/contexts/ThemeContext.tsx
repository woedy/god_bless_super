/**
 * Theme Context
 * Manages light/dark mode theme state and persistence
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({ 
  children, 
  defaultTheme = 'system',
  storageKey = 'god-bless-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  // Get system theme preference
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Resolve theme based on current setting
  const resolveTheme = (currentTheme: Theme): ResolvedTheme => {
    if (currentTheme === 'system') {
      return getSystemTheme()
    }
    return currentTheme
  }

  // Apply theme to document
  const applyTheme = (resolvedTheme: ResolvedTheme) => {
    const root = document.documentElement
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }

  // Initialize theme from localStorage or default
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored as Theme)
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }
  }, [storageKey])

  // Update resolved theme when theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      const resolved = resolveTheme(theme)
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }

    // Set initial value
    handleChange()

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [theme])

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(storageKey, newTheme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
    setThemeState(newTheme)
  }

  // Toggle between light and dark (ignores system)
  const toggleTheme = () => {
    if (theme === 'system') {
      // If currently system, toggle to opposite of current resolved theme
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else {
      // Toggle between light and dark
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to use theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

/**
 * Hook to get theme-aware classes
 */
export function useThemeClasses() {
  const { resolvedTheme } = useTheme()
  
  return {
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    
    // Background classes
    bg: {
      primary: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
      secondary: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
      tertiary: resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100',
      card: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
      overlay: resolvedTheme === 'dark' ? 'bg-gray-900/80' : 'bg-gray-500/75',
    },
    
    // Text classes
    text: {
      primary: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900',
      secondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
      tertiary: resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500',
      muted: resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400',
      inverse: resolvedTheme === 'dark' ? 'text-gray-900' : 'text-gray-100',
    },
    
    // Border classes
    border: {
      primary: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
      secondary: resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-300',
      light: resolvedTheme === 'dark' ? 'border-gray-800' : 'border-gray-100',
    },
    
    // Interactive states
    hover: {
      bg: resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
      text: resolvedTheme === 'dark' ? 'hover:text-gray-200' : 'hover:text-gray-700',
    },
    
    // Focus states
    focus: {
      ring: 'focus:ring-blue-500 focus:ring-opacity-50',
      border: 'focus:border-blue-500',
    }
  }
}