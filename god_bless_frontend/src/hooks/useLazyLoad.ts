/**
 * Custom hook for lazy loading components with loading states
 */
import { useState, useEffect, ComponentType, lazy } from 'react';

interface LazyLoadOptions {
  delay?: number;
  fallback?: ComponentType;
}

/**
 * Hook to lazy load a component with optional delay
 * Useful for testing and demonstrating lazy loading behavior
 */
export function useLazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): {
  Component: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);

        // Optional delay for demonstration
        if (options.delay) {
          await new Promise((resolve) => setTimeout(resolve, options.delay));
        }

        const module = await importFunc();

        if (mounted) {
          setComponent(() => module.default);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, []);

  return { Component, loading, error };
}

/**
 * Preload a lazy component
 * Useful for preloading components before they're needed
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return importFunc();
}

/**
 * Hook to track component load time
 */
export function useComponentLoadTime(componentName: string) {
  const [loadTime, setLoadTime] = useState<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setLoadTime(duration);

      if (duration > 100) {
        console.warn(
          `⚠️ Slow component load: ${componentName} took ${duration.toFixed(2)}ms`
        );
      }
    };
  }, [componentName]);

  return loadTime;
}

/**
 * Intersection Observer hook for lazy loading on scroll
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };

    img.onerror = () => {
      setLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { imageSrc, loading };
}

export default useLazyLoad;
