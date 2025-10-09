# Theme System Documentation

## Overview

The enhanced theme system provides a robust dark/light mode implementation with smooth transitions, persistence, and system preference detection.

## Features

- **Dark and Light Modes**: Full support for both themes
- **Persistence**: Theme preference saved to localStorage
- **System Preference Detection**: Automatically detects user's OS theme preference
- **Smooth Transitions**: 300ms transitions between theme changes
- **CSS Variables**: Theme-aware color system using CSS custom properties
- **TypeScript Support**: Fully typed with TypeScript

## Usage

### Using the Theme Context

```tsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
}
```

### Using the Theme Toggle Component

```tsx
import ThemeToggle from '../components/ThemeToggle';

function Header() {
  return (
    <header>
      <ThemeToggle />
    </header>
  );
}
```

## CSS Variables

The theme system uses CSS custom properties for colors:

### Light Theme
- `--color-background`: Main background color
- `--color-foreground`: Main text color
- `--color-card`: Card background
- `--color-border`: Border color
- And more...

### Dark Theme
All variables are redefined for dark mode with appropriate dark colors.

### Using Theme Variables in Tailwind

```tsx
<div className="bg-background text-foreground border-border">
  Content with theme-aware colors
</div>
```

## Implementation Details

### ThemeProvider

Wraps the entire application and provides theme context:

```tsx
<ThemeProvider defaultTheme="light">
  <App />
</ThemeProvider>
```

### Theme Persistence

- Saves to `localStorage` with key `theme`
- Reads from localStorage on mount
- Falls back to system preference if no saved theme
- Falls back to default theme if no system preference

### Smooth Transitions

All theme changes include smooth 300ms transitions for:
- Background colors
- Border colors
- Text colors
- Fill and stroke colors

## Browser Support

- Modern browsers with CSS custom properties support
- localStorage support required for persistence
- Graceful degradation for older browsers
