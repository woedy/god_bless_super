/**
 * Password Reset Tests
 * Tests for password reset functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../auth'
import { apiClient } from '../api'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuth: vi.fn(),
    isAuthenticated: vi.fn(() => false)
  }
}))

describe('Password Reset', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService()
    vi.clearAllMocks()
  })

  describe('forgotPassword', () => {
    it('should call the forgot password API endpoint', async () => {
      const mockPost = vi.mocked(apiClient.post)
      mockPost.mockResolvedValue({ success: true, data: null })

      const requestData = { email: 'test@example.com' }
      
      await authService.forgotPassword(requestData)

      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password/', requestData)
    })

    it('should throw error if API call fails', async () => {
      const mockPost = vi.mocked(apiClient.post)
      mockPost.mockResolvedValue({ success: false, message: 'Email not found', data: null })

      const requestData = { email: 'nonexistent@example.com' }
      
      await expect(authService.forgotPassword(requestData)).rejects.toThrow('Email not found')
    })
  })

  describe('resetPassword', () => {
    it('should call the reset password API endpoint', async () => {
      const mockPost = vi.mocked(apiClient.post)
      mockPost.mockResolvedValue({ success: true, data: null })

      const resetData = {
        token: 'reset-token-123',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }
      
      await authService.resetPassword(resetData)

      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password/', {
        token: 'reset-token-123',
        password: 'NewPassword123!'
      })
    })

    it('should throw error if passwords do not match', async () => {
      const resetData = {
        token: 'reset-token-123',
        password: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!'
      }
      
      await expect(authService.resetPassword(resetData)).rejects.toThrow('Passwords do not match')
    })

    it('should throw error if API call fails', async () => {
      const mockPost = vi.mocked(apiClient.post)
      mockPost.mockResolvedValue({ success: false, message: 'Invalid or expired token', data: null })

      const resetData = {
        token: 'invalid-token',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }
      
      await expect(authService.resetPassword(resetData)).rejects.toThrow('Invalid or expired token')
    })
  })
})