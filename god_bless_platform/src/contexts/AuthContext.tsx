/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 */

import { createContext, useContext, useReducer, useEffect } from 'react'
import type { ReactNode } from 'react'
import { authService } from '../services'
import type { User, LoginCredentials, RegisterData } from '../types'

// Authentication State
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Authentication Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }

// Authentication Context Type
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }
    
    default:
      return state
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Authentication Provider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  /**
   * Initialize authentication state on app startup
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })
        
        const user = await authService.initialize()
        if (user) {
          dispatch({ type: 'AUTH_SUCCESS', payload: user })
        } else {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  /**
   * Login user
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const authResponse = await authService.login(credentials)
      dispatch({ type: 'AUTH_SUCCESS', payload: authResponse.user })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage })
      throw error
    }
  }

  /**
   * Register new user
   */
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const authResponse = await authService.register(userData)
      dispatch({ type: 'AUTH_SUCCESS', payload: authResponse.user })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage })
      throw error
    }
  }

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }

  /**
   * Refresh user data
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const user = await authService.refreshUserData()
      dispatch({ type: 'AUTH_SUCCESS', payload: user })
    } catch (error) {
      console.error('Refresh user error:', error)
      // If refresh fails, user might be logged out
      dispatch({ type: 'AUTH_LOGOUT' })
      throw error
    }
  }

  /**
   * Clear authentication error
   */
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  // Context value
  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Export context for testing
export { AuthContext }

// Ensure this file only exports components for fast refresh
export default AuthProvider