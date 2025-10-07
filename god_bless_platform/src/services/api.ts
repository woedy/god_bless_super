/**
 * HTTP API Client
 * Centralized API client with authentication, error handling, and request/response interceptors
 */

import { config } from '../config'
import { STORAGE_KEYS, API_ENDPOINTS, TIMEOUTS } from '../config/constants'
import type { 
  ApiResponse, 
  AuthResponse,
  RefreshTokenRequest
} from '../types'

// API Client Configuration
interface ApiClientConfig {
  baseURL: string
  timeout: number
  headers: Record<string, string>
}

// Request Configuration
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  requiresAuth?: boolean
}

// API Client Error
class ApiClientError extends Error {
  public status: number
  public code: string
  public details?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// Network Error
class NetworkError extends Error {
  public originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'NetworkError'
    this.originalError = originalError
  }
}

/**
 * HTTP API Client Class
 */
class HttpApiClient {
  private config: ApiClientConfig
  private authToken: string | null = null
  private refreshToken: string | null = null
  private isRefreshing = false
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.config = {
      baseURL: config.apiUrl,
      timeout: TIMEOUTS.API_REQUEST,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }

    // Load stored tokens
    this.loadStoredTokens()
  }

  /**
   * Load authentication tokens from storage
   */
  private loadStoredTokens(): void {
    try {
      this.authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
      // Note: Refresh token would be stored in httpOnly cookie in production
      // For now, we'll handle it through the auth response
    } catch (error) {
      console.warn('Failed to load stored tokens:', error)
    }
  }

  /**
   * Save authentication tokens to storage
   */
  private saveTokens(authToken: string, refreshToken?: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken)
      this.authToken = authToken
      if (refreshToken) {
        this.refreshToken = refreshToken
      }
    } catch (error) {
      console.error('Failed to save tokens:', error)
    }
  }

  /**
   * Clear authentication tokens
   */
  private clearTokens(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER_DATA)
      this.authToken = null
      this.refreshToken = null
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
  }

  /**
   * Get current authentication token
   */
  public getAuthToken(): string | null {
    return this.authToken
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.authToken
  }

  /**
   * Build request URL
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseURL.replace(/\/$/, '')
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${baseUrl}${cleanEndpoint}`
  }

  /**
   * Build request headers
   */
  private buildHeaders(config: RequestConfig): Record<string, string> {
    const headers = { ...this.config.headers, ...config.headers }

    // Add authentication header if required and available
    // Django TokenAuthentication expects "Token <token>" format
    if (config.requiresAuth !== false && this.authToken) {
      headers['Authorization'] = `Token ${this.authToken}`
      console.log('API Client - Adding auth header:', `Token ${this.authToken.substring(0, 10)}...`)
    } else {
      console.log('API Client - No auth token available, requiresAuth:', config.requiresAuth)
    }

    return headers
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    let data: unknown
    try {
      data = isJson ? await response.json() : await response.text()
    } catch (error) {
      throw new ApiClientError(
        response.status,
        'PARSE_ERROR',
        'Failed to parse response',
        { originalError: error }
      )
    }

    if (!response.ok) {
      const errorData = data as any
      
      // Handle backend error format: { message: "Errors", errors: {...} }
      if (errorData?.message === 'Errors' && errorData?.errors) {
        const errors = errorData.errors
        const errorMessages = Object.values(errors).flat().join(', ')
        throw new ApiClientError(
          response.status,
          'VALIDATION_ERROR',
          errorMessages,
          data
        )
      }
      
      // Handle other error formats
      const apiError = isJson && errorData?.errors ? errorData.errors[0] : null
      throw new ApiClientError(
        response.status,
        apiError?.code || 'HTTP_ERROR',
        apiError?.message || errorData?.message || `HTTP ${response.status}`,
        data
      )
    }

    // Return the response in a consistent format
    return {
      success: true,
      data: data as T
    }
  }

  /**
   * Refresh authentication token
   * Note: Backend doesn't support refresh tokens, so this will always fail
   */
  private async refreshAuthToken(): Promise<string> {
    // Backend doesn't support refresh tokens
    throw new ApiClientError(401, 'NO_REFRESH_TOKEN', 'Backend does not support token refresh')
  }

  /**
   * Make HTTP request with automatic token refresh
   */
  private async makeRequest<T>(
    endpoint: string, 
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint)
    const headers = this.buildHeaders(config)
    const timeout = config.timeout || this.config.timeout

    // Prepare request body
    let body: string | FormData | undefined
    if (config.body) {
      if (config.body instanceof FormData) {
        body = config.body
        // Remove Content-Type header for FormData (browser will set it with boundary)
        delete headers['Content-Type']
      } else {
        body = JSON.stringify(config.body)
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return await this.handleResponse<T>(response)
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ApiClientError) {
        // Handle 401 Unauthorized - clear tokens since backend doesn't support refresh
        if (error.status === 401 && config.requiresAuth !== false) {
          this.clearTokens()
        }
        throw error
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NetworkError('Request timeout')
      }

      throw new NetworkError('Network request failed', error as Error)
    }
  }

  /**
   * GET request
   */
  public async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    return this.makeRequest<T>(url, { method: 'GET' })
  }

  /**
   * POST request
   */
  public async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data
    })
  }

  /**
   * PUT request
   */
  public async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data
    })
  }

  /**
   * PATCH request
   */
  public async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data
    })
  }

  /**
   * DELETE request
   */
  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * Upload file
   */
  public async upload<T>(endpoint: string, file: File, additionalData?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: formData
    })
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string, refreshToken?: string): void {
    this.saveTokens(token, refreshToken)
  }

  /**
   * Clear authentication
   */
  public clearAuth(): void {
    this.clearTokens()
  }
}

// Create and export singleton instance
export const apiClient = new HttpApiClient()

// Export types and errors
export { ApiClientError, NetworkError }
export type { RequestConfig }