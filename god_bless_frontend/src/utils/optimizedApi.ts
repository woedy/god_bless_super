/**
 * Optimized API client with caching and performance monitoring
 */
import apiCache from './apiCache';
import performanceMonitor from './performance';
import { API_BASE_URL } from '../constants';

interface RequestOptions extends RequestInit {
  cache?: boolean;
  cacheTTL?: number;
  skipAuth?: boolean;
}

class OptimizedAPIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Build full URL with query params
   */
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Make an optimized request
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      cache = false,
      cacheTTL,
      skipAuth = false,
      ...fetchOptions
    } = options;

    const url = this.buildURL(endpoint, undefined);
    const method = fetchOptions.method || 'GET';

    // Check cache for GET requests
    if (method === 'GET' && cache) {
      const cached = apiCache.get<T>(url);
      if (cached !== null) {
        return cached;
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(!skipAuth && this.getAuthHeader()),
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Start performance monitoring
    const metricName = `API: ${method} ${endpoint}`;
    performanceMonitor.startTimer(metricName);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // End performance monitoring
      const duration = performanceMonitor.endTimer(metricName);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache successful GET requests
      if (method === 'GET' && cache) {
        apiCache.set(url, data, undefined, cacheTTL);
      }

      // Log slow requests
      if (duration && duration > 2000) {
        console.warn(
          `⚠️ Slow API request: ${endpoint} took ${duration.toFixed(2)}ms`
        );
      }

      return data;
    } catch (error) {
      performanceMonitor.endTimer(metricName);
      throw error;
    }
  }

  /**
   * GET request with caching
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<T> {
    const url = params ? this.buildURL(endpoint, params) : endpoint;
    return this.request<T>(url, {
      ...options,
      method: 'GET',
      cache: options.cache !== false, // Cache by default for GET
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Invalidate cache for an endpoint
   */
  invalidateCache(endpoint: string): void {
    const url = this.buildURL(endpoint, undefined);
    apiCache.invalidate(url);
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateCachePattern(pattern: string): void {
    apiCache.invalidatePattern(pattern);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    apiCache.clear();
  }
}

// Create singleton instance
const api = new OptimizedAPIClient(API_BASE_URL || 'http://localhost:6161');

export default api;

// Export for use in components
export { OptimizedAPIClient };
