/**
 * Authentication Service Tests
 * Basic tests for the authentication service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../auth'

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

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService()
    // Clear localStorage
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('isAuthenticated', () => {
    it('should return false when no token is stored', () => {
      const result = authService.isAuthenticated()
      expect(result).toBe(false)
    })
  })

  describe('getStoredUser', () => {
    it('should return null when no user data is stored', () => {
      const result = authService.getStoredUser()
      expect(result).toBeNull()
    })

    it('should return user data when stored', () => {
      const userData = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isStaff: false,
        isSuperuser: false,
        dateJoined: '2024-01-01T00:00:00Z'
      }

      localStorage.setItem('god_bless_user_data', JSON.stringify(userData))
      
      const result = authService.getStoredUser()
      expect(result).toEqual(userData)
    })
  })
})