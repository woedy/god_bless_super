/**
 * Theme Toggle Component
 * Button to toggle between light and dark themes
 */

import React, { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from './Button'

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

/**
 * Theme Toggle Component
 */
export function ThemeToggle({ 
  variant = 'icon', 
  size = 'md', 
  className = '',
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Icons
  const SunIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )

  const MoonIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )

  const SystemIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )

  const ChevronDownIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )

  // Get current theme icon and label
  const getCurrentThemeIcon = () => {
    if (theme === 'system') return <SystemIcon />
    return resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />
  }

  const getCurrentThemeLabel = () => {
    if (theme === 'system') return 'System'
    return resolvedTheme === 'dark' ? 'Dark' : 'Light'
  }

  // Simple icon toggle
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={toggleTheme}
        className={`p-2 ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {getCurrentThemeIcon()}
        {showLabel && (
          <span className="ml-2 text-sm">
            {getCurrentThemeLabel()}
          </span>
        )}
      </Button>
    )
  }

  // Button with label
  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={toggleTheme}
        className={className}
        leftIcon={getCurrentThemeIcon()}
      >
        {getCurrentThemeLabel()} Mode
      </Button>
    )
  }

  // Dropdown with all options
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <Button
          variant="ghost"
          size={size}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2"
          rightIcon={<ChevronDownIcon />}
        >
          {getCurrentThemeIcon()}
          {showLabel && (
            <span className="text-sm">
              {getCurrentThemeLabel()}
            </span>
          )}
        </Button>

        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setDropdownOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <div className="py-2">
                <button
                  onClick={() => {
                    setTheme('light')
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                    theme === 'light' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <SunIcon />
                  <span>Light</span>
                  {theme === 'light' && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setTheme('dark')
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                    theme === 'dark' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <MoonIcon />
                  <span>Dark</span>
                  {theme === 'dark' && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setTheme('system')
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                    theme === 'system' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <SystemIcon />
                  <span>System</span>
                  {theme === 'system' && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}

/**
 * Simple Theme Toggle Hook
 * For use in custom components
 */
export function useThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  
  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system'
  }
}