/**
 * Theme System Tests
 * Tests for theme context, toggle, and dark mode functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ThemeProvider, useTheme, useThemeClasses } from '../contexts/ThemeContext'
import { ThemeToggle } from '../components/common/ThemeToggle'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock matchMedia
const mockMatchMedia = vi.fn()

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  })
  
  // Reset mocks
  mockLocalStorage.getItem.mockReturnValue(null)
  mockMatchMedia.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })
})

afterEach(() => {
  vi.clearAllMocks()
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
})

// Test component for useTheme hook
function TestThemeComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-system" onClick={() => setTheme('system')}>
        Set System
      </button>
    </div>
  )
}

// Test component for useThemeClasses hook
function TestThemeClassesComponent() {
  const classes = useThemeClasses()
  
  return (
    <div>
      <div data-testid="is-dark">{classes.isDark.toString()}</div>
      <div data-testid="is-light">{classes.isLight.toString()}</div>
      <div data-testid="bg-primary" className={classes.bg.primary}>
        Primary Background
      </div>
      <div data-testid="text-primary" className={classes.text.primary}>
        Primary Text
      </div>
    </div>
  )
}

describe('ThemeProvider', () => {
  it('should provide default light theme', () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
  })

  it('should load theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('dark')
    
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
  })

  it('should apply dark class to document when dark theme is active', async () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByTestId('set-dark'))
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.documentElement.style.colorScheme).toBe('dark')
    })
  })

  it('should remove dark class when light theme is active', async () => {
    // Start with dark theme
    document.documentElement.classList.add('dark')
    
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByTestId('set-light'))
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(document.documentElement.style.colorScheme).toBe('light')
    })
  })

  it('should save theme to localStorage when changed', () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByTestId('set-dark'))
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('god-bless-theme', 'dark')
  })

  it('should toggle between light and dark themes', () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    // Start with system (resolves to light)
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
    
    // Toggle should switch to dark
    fireEvent.click(screen.getByTestId('toggle-theme'))
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    
    // Toggle again should switch to light
    fireEvent.click(screen.getByTestId('toggle-theme'))
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })

  it('should respect system preference when theme is system', () => {
    // Mock system preference for dark mode
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })
    
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByTestId('set-system'))
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
  })

  it('should use custom storage key', () => {
    render(
      <ThemeProvider storageKey="custom-theme">
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByTestId('set-dark'))
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('custom-theme', 'dark')
  })
})

describe('useThemeClasses Hook', () => {
  it('should provide correct classes for light theme', () => {
    render(
      <ThemeProvider>
        <TestThemeClassesComponent />
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false')
    expect(screen.getByTestId('is-light')).toHaveTextContent('true')
    
    const bgElement = screen.getByTestId('bg-primary')
    expect(bgElement).toHaveClass('bg-white')
    
    const textElement = screen.getByTestId('text-primary')
    expect(textElement).toHaveClass('text-gray-900')
  })

  it('should provide correct classes for dark theme', async () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
        <TestThemeClassesComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByTestId('set-dark'))
    
    await waitFor(() => {
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true')
      expect(screen.getByTestId('is-light')).toHaveTextContent('false')
    })
  })
})

describe('ThemeToggle Component', () => {
  it('should render icon toggle by default', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label')
  })

  it('should render button variant with label', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="button" />
      </ThemeProvider>
    )
    
    expect(screen.getByText(/Mode/)).toBeInTheDocument()
  })

  it('should render dropdown variant', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="dropdown" />
      </ThemeProvider>
    )
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('should toggle theme when clicked', async () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
        <ThemeToggle />
      </ThemeProvider>
    )
    
    const toggleButton = screen.getByLabelText(/Switch to/)
    fireEvent.click(toggleButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    })
  })

  it('should set specific theme in dropdown', async () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
        <ThemeToggle variant="dropdown" />
      </ThemeProvider>
    )
    
    // Open dropdown - get the last button which should be the dropdown
    const buttons = screen.getAllByRole('button')
    const dropdownButton = buttons[buttons.length - 1]
    fireEvent.click(dropdownButton)
    
    // Click dark theme option
    const darkOption = screen.getByText('Dark')
    fireEvent.click(darkOption)
    
    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    })
  })

  it('should close dropdown when backdrop is clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="dropdown" />
      </ThemeProvider>
    )
    
    // Open dropdown
    const dropdownButton = screen.getByRole('button')
    fireEvent.click(dropdownButton)
    
    expect(screen.getByText('Light')).toBeInTheDocument()
    
    // Click backdrop
    const backdrop = document.querySelector('.fixed.inset-0')
    if (backdrop) {
      fireEvent.click(backdrop)
    }
    
    expect(screen.queryByText('Light')).not.toBeInTheDocument()
  })

  it('should show label when showLabel is true', () => {
    render(
      <ThemeProvider>
        <ThemeToggle showLabel />
      </ThemeProvider>
    )
    
    expect(screen.getByText(/Light|Dark|System/)).toBeInTheDocument()
  })
})

describe('Theme Integration', () => {
  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load theme from localStorage:',
      expect.any(Error)
    )
    
    consoleSpy.mockRestore()
  })

  it('should handle invalid stored theme values', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-theme')
    
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    // Should fall back to default theme
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
  })

  it('should listen for system theme changes', () => {
    const mockAddEventListener = vi.fn()
    const mockRemoveEventListener = vi.fn()
    
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })
    
    const { unmount } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByTestId('set-system'))
    
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    
    unmount()
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})