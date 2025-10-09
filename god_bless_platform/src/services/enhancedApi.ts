/**
 * Enhanced API Client
 * Wrapper around the base API client with integrated error handling and notifications
 */

import { apiClient, ApiClientError, NetworkError } from './api'
import { globalErrorHandler } from './errorHandler'
import type { ApiResponse } from '../types/api'

interface EnhancedRequestOptions {
  showErrorNotification?: boolean
  showSuccessNotification?: boolean
  successMessage?: string
  errorContext?: Record<string, any>
  retryable?: boolean
  silent?: boolean
}

/**
 * Enhanced API Client Class
 */
class EnhancedApiClient {
  /**
   * Enhanced GET request with error handling
   */
  async get<T>(
    endpoint: string, 
    params?: Record<string, unknown>,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest(
      () => apiClient.get<T>(endpoint, params),
      'GET',
      endpoint,
      options
    )
  }

  /**
   * Enhanced POST request with error handling
   */
  async post<T>(
    endpoint: string, 
    data?: unknown,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest(
      () => apiClient.post<T>(endpoint, data),
      'POST',
      endpoint,
      options
    )
  }

  /**
   * Enhanced PUT request with error handling
   */
  async put<T>(
    endpoint: string, 
    data?: unknown,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest(
      () => apiClient.put<T>(endpoint, data),
      'PUT',
      endpoint,
      options
    )
  }

  /**
   * Enhanced PATCH request with error handling
   */
  async patch<T>(
    endpoint: string, 
    data?: unknown,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest(
      () => apiClient.patch<T>(endpoint, data),
      'PATCH',
      endpoint,
      options
    )
  }

  /**
   * Enhanced DELETE request with error handling
   */
  async delete<T>(
    endpoint: string,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest(
      () => apiClient.delete<T>(endpoint),
      'DELETE',
      endpoint,
      options
    )
  }

  /**
   * Enhanced file upload with error handling
   */
  async upload<T>(
    endpoint: string, 
    file: File, 
    additionalData?: Record<string, unknown>,
    options: EnhancedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.executeRequest(
      () => apiClient.upload<T>(endpoint, file, additionalData),
      'UPLOAD',
      endpoint,
      options
    )
  }

  /**
   * Execute request with enhanced error handling
   */
  private async executeRequest<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    method: string,
    endpoint: string,
    options: EnhancedRequestOptions
  ): Promise<ApiResponse<T>> {
    const {
      showErrorNotification = true,
      showSuccessNotification = false,
      successMessage,
      errorContext = {},
      retryable = false,
      silent = false
    } = options

    try {
      const response = await requestFn()

      // Handle success notification if requested
      if (showSuccessNotification && !silent) {
        // This would be handled by the notification system
        // For now, we'll just log it
        console.log('API Success:', successMessage || `${method} ${endpoint} successful`)
      }

      return response
    } catch (error) {
      // Enhanced error handling
      const enhancedError = this.enhanceError(error, {
        method,
        endpoint,
        context: errorContext,
        retryable
      })

      // Report error to global handler
      if (!silent) {
        globalErrorHandler.handleApiError(enhancedError, {
          method,
          endpoint,
          ...errorContext
        })
      }

      // Re-throw the enhanced error
      throw enhancedError
    }
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(
    error: any,
    context: {
      method: string
      endpoint: string
      context: Record<string, any>
      retryable: boolean
    }
  ): ApiClientError | NetworkError {
    if (error instanceof ApiClientError || error instanceof NetworkError) {
      // Add additional context to existing error
      if (error instanceof ApiClientError) {
        error.details = {
          ...error.details,
          ...context
        }
      }
      return error
    }

    // Convert unknown errors to ApiClientError
    return new ApiClientError(
      500,
      'UNKNOWN_ERROR',
      error?.message || 'An unexpected error occurred',
      {
        originalError: error,
        ...context
      }
    )
  }

  /**
   * Batch requests with error handling
   */
  async batch<T>(
    requests: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      endpoint: string
      data?: unknown
      params?: Record<string, unknown>
    }>,
    options: EnhancedRequestOptions & {
      continueOnError?: boolean
      maxConcurrent?: number
    } = {}
  ): Promise<Array<{ success: boolean; data?: T; error?: any }>> {
    const {
      continueOnError = true,
      maxConcurrent = 5,
      ...requestOptions
    } = options

    const results: Array<{ success: boolean; data?: T; error?: any }> = []
    
    // Process requests in batches
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent)
      
      const batchPromises = batch.map(async (request) => {
        try {
          let response: ApiResponse<T>
          
          switch (request.method) {
            case 'GET':
              response = await this.get<T>(request.endpoint, request.params, requestOptions)
              break
            case 'POST':
              response = await this.post<T>(request.endpoint, request.data, requestOptions)
              break
            case 'PUT':
              response = await this.put<T>(request.endpoint, request.data, requestOptions)
              break
            case 'PATCH':
              response = await this.patch<T>(request.endpoint, request.data, requestOptions)
              break
            case 'DELETE':
              response = await this.delete<T>(request.endpoint, requestOptions)
              break
            default:
              throw new Error(`Unsupported method: ${request.method}`)
          }
          
          return { success: true, data: response.data }
        } catch (error) {
          if (!continueOnError) {
            throw error
          }
          return { success: false, error }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Retry request with exponential backoff
   */
  async withRetry<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    options: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      retryCondition?: (error: any) => boolean
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = (error) => {
        // Retry on network errors and 5xx server errors
        return error instanceof NetworkError || 
               (error instanceof ApiClientError && error.status >= 500)
      }
    } = options

    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error
        
        // Don't retry on last attempt or if retry condition fails
        if (attempt === maxRetries || !retryCondition(error)) {
          throw error
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }

  /**
   * Get authentication status
   */
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated()
  }

  /**
   * Get auth token
   */
  getAuthToken(): string | null {
    return apiClient.getAuthToken()
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string, refreshToken?: string): void {
    apiClient.setAuthToken(token, refreshToken)
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    apiClient.clearAuth()
  }
}

// Create and export singleton instance
export const enhancedApiClient = new EnhancedApiClient()

// Export for convenience
export { ApiClientError, NetworkError }
export type { EnhancedRequestOptions }