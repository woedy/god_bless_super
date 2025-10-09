/**
 * Error Context
 * Provides global error state management and error handling utilities
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { globalErrorHandler } from '../services/errorHandler'
import type { ErrorReport, ErrorType, ErrorSeverity } from '../services/errorHandler'

// Error State
interface ErrorState {
  errors: ErrorReport[]
  isLoading: boolean
  lastError: ErrorReport | null
}

// Error Actions
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: ErrorReport }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_LOADING'; payload: boolean }

// Error Context Type
interface ErrorContextType {
  state: ErrorState
  addError: (error: Error | string, options?: {
    type?: ErrorType
    severity?: ErrorSeverity
    context?: Record<string, any>
    silent?: boolean
  }) => ErrorReport
  removeError: (errorId: string) => void
  clearErrors: () => void
  hasErrors: boolean
  getErrorsByType: (type: ErrorType) => ErrorReport[]
  getErrorsBySeverity: (severity: ErrorSeverity) => ErrorReport[]
}

// Initial state
const initialState: ErrorState = {
  errors: [],
  isLoading: false,
  lastError: null
}

// Error reducer
function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [action.payload, ...state.errors].slice(0, 50), // Keep only last 50 errors
        lastError: action.payload
      }
    
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload),
        lastError: state.errors.length > 1 ? state.errors[1] : null
      }
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        lastError: null
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
const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

// Error Provider Props
interface ErrorProviderProps {
  children: ReactNode
}

/**
 * Error Provider Component
 */
export function ErrorProvider({ children }: ErrorProviderProps) {
  const [state, dispatch] = useReducer(errorReducer, initialState)

  // Add error handler
  const addError = useCallback((
    error: Error | string,
    options: {
      type?: ErrorType
      severity?: ErrorSeverity
      context?: Record<string, any>
      silent?: boolean
    } = {}
  ): ErrorReport => {
    const errorReport = globalErrorHandler.handleError(error, {
      ...options,
      silent: true // We'll handle the UI notification here
    })

    dispatch({ type: 'ADD_ERROR', payload: errorReport })
    return errorReport
  }, [])

  // Remove error handler
  const removeError = useCallback((errorId: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: errorId })
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' })
  }, [])

  // Get errors by type
  const getErrorsByType = useCallback((type: ErrorType): ErrorReport[] => {
    return state.errors.filter(error => error.type === type)
  }, [state.errors])

  // Get errors by severity
  const getErrorsBySeverity = useCallback((severity: ErrorSeverity): ErrorReport[] => {
    return state.errors.filter(error => error.severity === severity)
  }, [state.errors])

  // Setup global error listener
  useEffect(() => {
    const handleGlobalError = (errorReport: ErrorReport) => {
      dispatch({ type: 'ADD_ERROR', payload: errorReport })
    }

    globalErrorHandler.addErrorListener(handleGlobalError)

    return () => {
      globalErrorHandler.removeErrorListener(handleGlobalError)
    }
  }, [])

  // Auto-remove errors after timeout based on severity
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = []

    state.errors.forEach(error => {
      let timeout: number
      
      switch (error.severity) {
        case 'low':
          timeout = 3000 // 3 seconds
          break
        case 'medium':
          timeout = 5000 // 5 seconds
          break
        case 'high':
          timeout = 8000 // 8 seconds
          break
        case 'critical':
          timeout = 0 // Don't auto-remove critical errors
          break
        default:
          timeout = 5000
      }

      if (timeout > 0) {
        const timeoutId = setTimeout(() => {
          removeError(error.id)
        }, timeout)
        
        timeouts.push(timeoutId)
      }
    })

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [state.errors, removeError])

  const contextValue: ErrorContextType = {
    state,
    addError,
    removeError,
    clearErrors,
    hasErrors: state.errors.length > 0,
    getErrorsByType,
    getErrorsBySeverity
  }

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  )
}

/**
 * Hook to use error context
 */
export function useError(): ErrorContextType {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

/**
 * Hook for handling API errors
 */
export function useApiError() {
  const { addError } = useError()

  const handleApiError = useCallback((error: any, context?: Record<string, any>) => {
    return globalErrorHandler.handleApiError(error, context)
  }, [])

  return { handleApiError, addError }
}

export default ErrorContext