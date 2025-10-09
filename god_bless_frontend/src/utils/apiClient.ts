import toast from 'react-hot-toast';

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  status?: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:6161';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      ...this.defaultHeaders,
      ...(token ? { Authorization: `Token ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      return this.handleError(response, data);
    }

    return {
      data,
      success: true,
    };
  }

  private handleError<T>(response: Response, data: any): ApiResponse<T> {
    const error: ApiError = {
      message: 'An unexpected error occurred',
      status: response.status,
    };

    // Handle different error status codes
    switch (response.status) {
      case 400:
        error.message = data?.message || data?.error || 'Invalid request. Please check your input.';
        error.code = 'BAD_REQUEST';
        error.details = data;
        break;

      case 401:
        error.message = 'Your session has expired. Please log in again.';
        error.code = 'UNAUTHORIZED';
        // Redirect to login
        this.handleUnauthorized();
        break;

      case 403:
        error.message = 'You do not have permission to perform this action.';
        error.code = 'FORBIDDEN';
        break;

      case 404:
        error.message = data?.message || 'The requested resource was not found.';
        error.code = 'NOT_FOUND';
        break;

      case 422:
        error.message = 'Validation failed. Please check your input.';
        error.code = 'VALIDATION_ERROR';
        error.details = data?.errors || data;
        break;

      case 429:
        error.message = 'Too many requests. Please slow down and try again later.';
        error.code = 'RATE_LIMIT';
        break;

      case 500:
        error.message = 'A server error occurred. Our team has been notified.';
        error.code = 'SERVER_ERROR';
        break;

      case 502:
      case 503:
      case 504:
        error.message = 'The service is temporarily unavailable. Please try again later.';
        error.code = 'SERVICE_UNAVAILABLE';
        break;

      default:
        error.message = data?.message || data?.error || error.message;
        error.code = 'UNKNOWN_ERROR';
    }

    // Show toast notification for errors (except 401 which redirects)
    if (response.status !== 401) {
      toast.error(error.message);
    }

    // Log error for debugging
    console.error('API Error:', {
      status: response.status,
      url: response.url,
      error,
      data,
    });

    return {
      error,
      success: false,
    };
  }

  private handleUnauthorized() {
    // Store intended destination before redirecting to login
    try {
      const currentPath = window.location.pathname;
      // Only store if not already on signin page
      if (currentPath !== '/signin') {
        sessionStorage.setItem('intendedDestination', currentPath);
      }
    } catch (error) {
      console.warn('Failed to store intended destination:', error);
    }

    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('userID');
    localStorage.removeItem('username');

    // Show notification
    toast.error('Your session has expired. Please log in again.');

    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = '/signin';
    }, 1500);
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleNetworkError<T>(error);
    }
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: body instanceof FormData ? body : JSON.stringify(body),
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleNetworkError<T>(error);
    }
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleNetworkError<T>(error);
    }
  }

  async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleNetworkError<T>(error);
    }
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleNetworkError<T>(error);
    }
  }

  private handleNetworkError<T>(error: any): ApiResponse<T> {
    const apiError: ApiError = {
      message: 'Network error. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
      details: { originalError: error.message },
    };

    toast.error(apiError.message);

    console.error('Network Error:', error);

    return {
      error: apiError,
      success: false,
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => apiClient.get<T>(endpoint, options),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiClient.post<T>(endpoint, body, options),
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiClient.put<T>(endpoint, body, options),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiClient.patch<T>(endpoint, body, options),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiClient.delete<T>(endpoint, options),
};
