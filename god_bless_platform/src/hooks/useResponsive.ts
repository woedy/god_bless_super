/**
 * Responsive Hook
 * Provides responsive utilities and breakpoint detection
 */

import { useState, useEffect } from 'react'

export interface ResponsiveState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  screenWidth: number
  screenHeight: number
}

export interface ResponsiveBreakpoints {
  mobile: number
  tablet: number
  desktop: number
  largeDesktop: number
}

const defaultBreakpoints: ResponsiveBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  largeDesktop: 1600,
}

/**
 * Hook for responsive design utilities
 */
export function useResponsive(breakpoints: ResponsiveBreakpoints = defaultBreakpoints) {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        screenWidth: 1024,
        screenHeight: 768,
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight

    return {
      isMobile: width < breakpoints.mobile,
      isTablet: width >= breakpoints.mobile && width < breakpoints.tablet,
      isDesktop: width >= breakpoints.tablet && width < breakpoints.largeDesktop,
      isLargeDesktop: width >= breakpoints.largeDesktop,
      screenWidth: width,
      screenHeight: height,
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setState({
        isMobile: width < breakpoints.mobile,
        isTablet: width >= breakpoints.mobile && width < breakpoints.tablet,
        isDesktop: width >= breakpoints.tablet && width < breakpoints.largeDesktop,
        isLargeDesktop: width >= breakpoints.largeDesktop,
        screenWidth: width,
        screenHeight: height,
      })
    }

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Call handler right away so state gets updated with initial window size
    handleResize()

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoints])

  return state
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handler)
      }
    }
  }, [query])

  return matches
}

/**
 * Common responsive utilities
 */
export const responsiveUtils = {
  // Responsive grid classes
  gridCols: {
    mobile: 'grid-cols-1',
    tablet: 'sm:grid-cols-2 md:grid-cols-3',
    desktop: 'lg:grid-cols-4 xl:grid-cols-5',
    largeDesktop: '2xl:grid-cols-6 3xl:grid-cols-8',
  },

  // Responsive padding classes
  padding: {
    mobile: 'px-4 py-3',
    tablet: 'sm:px-6 sm:py-4',
    desktop: 'lg:px-8 lg:py-6',
  },

  // Responsive text sizes
  textSize: {
    heading: 'text-xl sm:text-2xl lg:text-3xl',
    subheading: 'text-lg sm:text-xl lg:text-2xl',
    body: 'text-sm sm:text-base',
    caption: 'text-xs sm:text-sm',
  },

  // Responsive spacing
  spacing: {
    section: 'space-y-4 sm:space-y-6 lg:space-y-8',
    items: 'space-y-2 sm:space-y-3 lg:space-y-4',
  },

  // Responsive flex layouts
  flex: {
    stack: 'flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4',
    center: 'flex flex-col items-center sm:flex-row sm:justify-between',
  },
}