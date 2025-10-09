/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

import { apiClient } from './api'
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/constants'
import type { 
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User
} from '../types'

/**
 * Authentication Service Class
 */
class AuthService {
  /**
   * Login user with email and password
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Prepare request data for backend format
      const requestData = {
        email: credentials.email,
        password: credentials.password,
        fcm_token: 'web-client' // Default for web clients
      }

      const response = await apiClient.post<any>(
        API_ENDPOINTS.AUTH.LOGIN,
        requestData
      )

      // Backend returns { message: "Successful", data: { token, user_id, email, username, photo } }
      if (response.data && response.data.message === 'Successful' && response.data.data) {
        const backendData = response.data.data
        const authData: AuthResponse = {
          token: backendData.token,
          refreshToken: backendData.token, // Backend doesn't use refresh tokens yet
          user: {
            id: backendData.user_id,
            email: backendData.email,
            firstName: backendData.username || '',
            lastName: '',
            isActive: true,
            isStaff: false,
            isSuperuser: false,
            dateJoined: new Date().toISOString(),
            profile: {
              id: backendData.user_id,
              userId: backendData.user_id,
              avatar: backendData.photo,
              timezone: 'UTC',
              language: 'en',
              preferences: {
                theme: 'light',
                notifications: {
                  email: true,
                  push: false,
                  taskComplete: true,
                  taskError: true,
                  systemAlerts: true
                },
                dashboard: {
                  defaultView: 'grid',
                  autoRefresh: true,
                  refreshInterval: 30
                }
              }
            }
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          permissions: []
        }

        // Store authentication data
        apiClient.setAuthToken(authData.token, authData.refreshToken)
        this.storeUserData(authData.user)
        
        return authData
      }

      // Handle error response
      if (response.data && response.data.message === 'Errors') {
        const errors = response.data.errors
        const errorMessages = Object.values(errors).flat().join(', ')
        throw new Error(errorMessages)
      }

      throw new Error('Login failed')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * Register new user account
   */
  public async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      // Validate password confirmation
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      // Prepare request data for backend format
      const requestData = {
        email: userData.email,
        username: userData.firstName + (userData.lastName ? ` ${userData.lastName}` : ''),
        password: userData.password,
        password2: userData.confirmPassword
      }

      const response = await apiClient.post<any>(
        API_ENDPOINTS.AUTH.REGISTER,
        requestData
      )

      // Backend returns { message: "Successful", data: { token, user_id, email, username } }
      if (response.data && response.data.message === 'Successful' && response.data.data) {
        const backendData = response.data.data
        const authData: AuthResponse = {
          token: backendData.token,
          refreshToken: backendData.token, // Backend doesn't use refresh tokens yet
          user: {
            id: backendData.user_id,
            email: backendData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isActive: true,
            isStaff: false,
            isSuperuser: false,
            dateJoined: new Date().toISOString(),
            profile: {
              id: backendData.user_id,
              userId: backendData.user_id,
              timezone: 'UTC',
              language: 'en',
              preferences: {
                theme: 'light',
                notifications: {
                  email: true,
                  push: false,
                  taskComplete: true,
                  taskError: true,
                  systemAlerts: true
                },
                dashboard: {
                  defaultView: 'grid',
                  autoRefresh: true,
                  refreshInterval: 30
                }
              }
            }
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          permissions: []
        }

        // Store authentication data
        apiClient.setAuthToken(authData.token, authData.refreshToken)
        this.storeUserData(authData.user)
        
        return authData
      }

      // Handle error response
      if (response.data && response.data.message === 'Errors') {
        const errors = response.data.errors
        const errorMessages = Object.values(errors).flat().join(', ')
        throw new Error(errorMessages)
      }

      throw new Error('Registration failed')
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Logout user and clear session
   */
  public async logout(): Promise<void> {
    try {
      // Backend doesn't have a logout endpoint, so just clear local data
      // In a production app, you might want to invalidate the token on the server
      console.log('Logging out user...')
    } catch (error) {
      console.warn('Logout request failed:', error)
    } finally {
      // Always clear local authentication data
      this.clearAuthData()
    }
  }

  /**
   * Get current user information
   */
  public async getCurrentUser(): Promise<User> {
    try {
      // Get stored user data first
      const storedUser = this.getStoredUser()
      if (!storedUser) {
        throw new Error('No user data found')
      }

      // For now, return stored user data since the backend's get-user-details 
      // endpoint requires complex department-specific handling
      // In a production app, you might want to fetch fresh data from the server
      return storedUser
    } catch (error) {
      console.error('Get current user error:', error)
      throw error
    }
  }

  /**
   * Change user password
   */
  public async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      // Validate password confirmation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match')
      }

      const response = await apiClient.post<void>(
        `${API_ENDPOINTS.AUTH.USER}change-password/`,
        {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        }
      )

      if (!response.success) {
        throw new Error(response.message || 'Password change failed')
      }
    } catch (error) {
      console.error('Change password error:', error)
      throw error
    }
  }

  /**
   * Request password reset email
   */
  public async forgotPassword(requestData: ForgotPasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post<void>(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        requestData
      )

      if (!response.success) {
        throw new Error(response.message || 'Failed to send password reset email')
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      throw error
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    try {
      // Validate password confirmation
      if (resetData.password !== resetData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const response = await apiClient.post<void>(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        {
          token: resetData.token,
          password: resetData.password
        }
      )

      if (!response.success) {
        throw new Error(response.message || 'Password reset failed')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  /**
   * Check if user is currently authenticated
   */
  public isAuthenticated(): boolean {
    return apiClient.isAuthenticated() && this.getStoredUser() !== null
  }

  /**
   * Get stored user data
   */
  public getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error('Failed to get stored user data:', error)
      return null
    }
  }

  /**
   * Get current authentication token
   */
  public getAuthToken(): string | null {
    return apiClient.getAuthToken()
  }

  /**
   * Refresh user data from server
   */
  public async refreshUserData(): Promise<User> {
    return this.getCurrentUser()
  }

  /**
   * Validate authentication status
   * Checks if token is valid by making a request to the server
   */
  public async validateAuth(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false
    }

    try {
      await this.getCurrentUser()
      return true
    } catch (error) {
      // Token is invalid, clear auth data
      this.clearAuthData()
      return false
    }
  }

  /**
   * Store user data in local storage
   */
  private storeUserData(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
    } catch (error) {
      console.error('Failed to store user data:', error)
    }
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    try {
      apiClient.clearAuth()
      localStorage.removeItem(STORAGE_KEYS.USER_DATA)
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT)
    } catch (error) {
      console.error('Failed to clear auth data:', error)
    }
  }

  /**
   * Handle authentication errors
   * Centralized error handling for auth-related errors
   */
  public handleAuthError(error: unknown): void {
    // If it's an authentication error, clear local data
    const authError = error as { status?: number; code?: string }
    if (authError?.status === 401 || authError?.code === 'UNAUTHORIZED') {
      this.clearAuthData()
    }
  }

  /**
   * Initialize authentication state
   * Called on app startup to validate stored authentication
   */
  public async initialize(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null
    }

    try {
      // Validate stored authentication by fetching current user
      const user = await this.getCurrentUser()
      return user
    } catch {
      // Authentication is invalid, clear stored data
      console.warn('Stored authentication is invalid')
      this.clearAuthData()
      return null
    }
  }
}

// Create and export singleton instance
export const authService = new AuthService()

// Export the class for testing
export { AuthService }