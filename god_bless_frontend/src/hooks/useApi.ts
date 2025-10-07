import { useState, useCallback } from 'react';
import { api, ApiResponse, ApiError } from '../utils/apiClient';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  showErrorToast?: boolean;
}

interface UseApiReturn<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  execute: (...args: any[]) => Promise<ApiResponse<T>>;
  reset: () => void;
}

/**
 * Custom hook for making API calls with built-in error handling and loading states.
 * 
 * @example
 * const { data, loading, error, execute } = useApi<User[]>({
 *   onSuccess: (users) => console.log('Users loaded:', users),
 *   onError: (error) => console.error('Failed to load users:', error)
 * });
 * 
 * // Later in your component
 * useEffect(() => {
 *   execute(() => api.get('/api/users/'));
 * }, []);
 */
export function useApi<T = any>(options: UseApiOptions = {}): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (apiCall: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiCall();

        if (response.success && response.data) {
          setData(response.data);
          options.onSuccess?.(response.data);
        } else if (response.error) {
          setError(response.error);
          options.onError?.(response.error);
        }

        return response;
      } catch (err: any) {
        const apiError: ApiError = {
          message: err.message || 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
        };
        setError(apiError);
        options.onError?.(apiError);
        return { success: false, error: apiError };
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}

/**
 * Hook for GET requests
 */
export function useGet<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const { data, error, loading, execute, reset } = useApi<T>(options);

  const get = useCallback(
    (queryParams?: Record<string, any>) => {
      const params = queryParams
        ? `?${new URLSearchParams(queryParams).toString()}`
        : '';
      return execute(() => api.get<T>(`${endpoint}${params}`));
    },
    [endpoint, execute]
  );

  return { data, error, loading, get, reset };
}

/**
 * Hook for POST requests
 */
export function usePost<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const { data, error, loading, execute, reset } = useApi<T>(options);

  const post = useCallback(
    (body?: any) => {
      return execute(() => api.post<T>(endpoint, body));
    },
    [endpoint, execute]
  );

  return { data, error, loading, post, reset };
}

/**
 * Hook for PUT requests
 */
export function usePut<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const { data, error, loading, execute, reset } = useApi<T>(options);

  const put = useCallback(
    (body?: any) => {
      return execute(() => api.put<T>(endpoint, body));
    },
    [endpoint, execute]
  );

  return { data, error, loading, put, reset };
}

/**
 * Hook for DELETE requests
 */
export function useDelete<T = any>(endpoint: string, options: UseApiOptions = {}) {
  const { data, error, loading, execute, reset } = useApi<T>(options);

  const del = useCallback(() => {
    return execute(() => api.delete<T>(endpoint));
  }, [endpoint, execute]);

  return { data, error, loading, delete: del, reset };
}
