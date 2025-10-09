# Theme System Documentation

## Overview

The God Bless Platform includes a comprehensive light/dark mode theme system built with React Context, Tailwind CSS, and TypeScript. The system provides automatic theme detection, manual theme switching, and persistent theme preferences.

## Features

- ✅ **Light/Dark/System Themes**: Support for light, dark, and system preference themes
- ✅ **Persistent Storage**: Theme preferences saved to localStorage
- ✅ **System Integration**: Automatic detection of system theme preferences
- ✅ **Real-time Updates**: Instant theme switching without page reload
- ✅ **Component Integration**: Theme-aware components and utilities
- ✅ **Responsive Design**: Theme system works seamlessly with responsive layouts
- ✅ **TypeScript Support**: Full type safety for theme-related code
- ✅ **Accessibility**: Proper ARIA labels and keyboard navigation

## Architecture

### Core Components

1. **ThemeProvider** - React context provider for theme state management
2. **ThemeToggle** - UI component for theme switching
3. **useTheme** - Hook for accessing theme state and controls
4. **useThemeClasses** - Hook for theme-aware CSS classes

### File Structure

```
src/
├── contexts/
│   └── ThemeContext.tsx          # Theme context and provider
├── components/
│   └── common/
│       └── ThemeToggle.tsx       # Theme toggle component
├── styles/
│   └── responsive.css            # Theme-aware CSS utilities
└── test/
    └── theme.test.tsx            # Comprehensive theme tests
```

## Usage

### Basic Setup

The theme system is automatically initialized in the main App component:

```tsx
import { ThemeProvider } from './contexts'

function App() {
  return (
    <ThemeProvider>
      {/* Your app content */}
    </ThemeProvider>
  )
}
```

### Using the Theme Hook

```tsx
import { useTheme } from '../contexts/ThemeContext'

function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
    </div>
  )
}
```

### Using Theme-Aware Classes

```tsx
import { useThemeClasses } from '../contexts/ThemeContext'

function ThemedComponent() {
  const classes = useThemeClasses()
  
  return (
    <div className={classes.bg.primary}>
      <h1 className={classes.text.primary}>Hello World</h1>
      <p className={classes.text.secondary}>This text adapts to the theme</p>
    </div>
  )
}
```

### Theme Toggle Component

The `ThemeToggle` component provides multiple variants for theme switching:

```tsx
import { ThemeToggle } from '../components/common'

// Icon toggle (default)
<ThemeToggle />

// Button with label
<ThemeToggle variant="button" />

// Dropdown with all options
<ThemeToggle variant="dropdown" showLabel />
```

## Theme Configuration

### Default Themes

- **Light Theme**: Clean, bright interface with light backgrounds
- **Dark Theme**: Dark interface optimized for low-light environments
- **System Theme**: Automatically follows the user's system preference

### Customization

You can customize the theme system by:

1. **Custom Storage Key**: Change where theme preference is stored
```tsx
<ThemeProvider storageKey="my-app-theme">
```

2. **Default Theme**: Set a different default theme
```tsx
<ThemeProvider defaultTheme="dark">
```

3. **Custom Breakpoints**: Modify responsive behavior in `useResponsive.ts`

## CSS Classes and Utilities

### Tailwind Dark Mode Classes

The system uses Tailwind's `dark:` prefix for dark mode styles:

```css
/* Light mode */
.bg-white

/* Dark mode */
.dark:bg-gray-800

/* Combined */
.bg-white.dark:bg-gray-800
```

### Theme-Aware Utility Classes

Custom utility classes are available in `responsive.css`:

```css
.theme-bg-primary      /* Primary background */
.theme-bg-secondary    /* Secondary background */
.theme-text-primary    /* Primary text */
.theme-text-secondary  /* Secondary text */
.theme-border          /* Border colors */
.theme-hover           /* Hover states */
.theme-input           /* Form inputs */
.theme-card            /* Card components */
```

### Status Color Classes

```css
.theme-success         /* Success states */
.theme-warning         /* Warning states */
.theme-error           /* Error states */
.theme-info            /* Info states */
```

## Component Integration

### Layout Components

All layout components support dark mode:

- **AppLayout**: Main application layout with theme transitions
- **Sidebar**: Navigation sidebar with dark mode styling
- **Header**: Top navigation with theme toggle integration
- **MobileNavigation**: Mobile drawer with dark mode support

### Common Components

Theme-aware common components:

- **Button**: All variants support dark mode
- **Input**: Form inputs with dark mode styling
- **Card**: Container component with theme transitions
- **Modal**: Overlay components with dark backgrounds

## Best Practices

### 1. Use Theme-Aware Classes

Always use theme-aware classes for consistent theming:

```tsx
// ✅ Good
<div className="bg-white dark:bg-gray-800">

// ❌ Avoid
<div className="bg-white">
```

### 2. Include Transitions

Add smooth transitions for better user experience:

```tsx
<div className="bg-white dark:bg-gray-800 transition-colors duration-200">
```

### 3. Test Both Themes

Always test components in both light and dark modes:

```tsx
// Use the theme toggle in development
<ThemeToggle variant="dropdown" />
```

### 4. Use Semantic Colors

Use semantic color names rather than specific colors:

```tsx
// ✅ Good
<div className="text-gray-900 dark:text-gray-100">

// ❌ Avoid hardcoded colors
<div className="text-black">
```

## Testing

The theme system includes comprehensive tests covering:

- Theme provider functionality
- Theme persistence
- System preference detection
- Component integration
- Error handling

Run theme tests:

```bash
npm test theme.test.tsx
```

## Browser Support

The theme system supports:

- ✅ Modern browsers with CSS custom properties
- ✅ System preference detection via `prefers-color-scheme`
- ✅ localStorage for theme persistence
- ✅ Graceful fallbacks for older browsers

## Performance Considerations

- **CSS-in-JS**: Minimal runtime overhead using Tailwind classes
- **Transitions**: Smooth 200ms transitions for theme changes
- **Storage**: Efficient localStorage usage with error handling
- **Re-renders**: Optimized context to minimize unnecessary re-renders

## Accessibility

The theme system includes:

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support for theme toggles
- **High Contrast**: Sufficient color contrast in both themes
- **Reduced Motion**: Respects user's motion preferences

## Migration Guide

### From No Theme System

1. Wrap your app with `ThemeProvider`
2. Replace hardcoded colors with theme-aware classes
3. Add theme toggle to your UI
4. Test all components in both themes

### Updating Existing Components

```tsx
// Before
<div className="bg-white text-black border-gray-200">

// After
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 transition-colors duration-200">
```

## Troubleshooting

### Common Issues

1. **Theme not persisting**: Check localStorage permissions
2. **Flashing on load**: Ensure ThemeProvider is at the root level
3. **System theme not detected**: Verify `prefers-color-scheme` support
4. **Styles not applying**: Check Tailwind configuration includes `darkMode: 'class'`

### Debug Mode

Enable debug logging:

```tsx
// Add to ThemeProvider for debugging
console.log('Theme state:', { theme, resolvedTheme })
```

## Future Enhancements

Potential improvements:

- [ ] **Custom Color Schemes**: Support for custom brand colors
- [ ] **High Contrast Mode**: Enhanced accessibility option
- [ ] **Theme Scheduling**: Automatic theme switching based on time
- [ ] **Per-Component Themes**: Individual component theme overrides
- [ ] **Theme Animations**: Enhanced transition animations

## Contributing

When contributing theme-related changes:

1. Update both light and dark mode styles
2. Add tests for new theme functionality
3. Update documentation
4. Test across different browsers and devices
5. Ensure accessibility compliance

## Resources

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [React Context API](https://reactjs.org/docs/context.html)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)