/**
 * Toast Container Component
 * Manages and displays multiple toast notifications
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Toast } from './Toast'
import type { ToastProps, ToastType, ToastAction } from './Toast'

// Toast State
interface ToastState {
  toasts: ToastProps[]
}

// Toast Reducer Actions
type ToastReducerAction =
  | { type: 'ADD_TOAST'; payload: ToastProps }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_TOASTS' }

// Toast Context Type
interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => string
  showSuccess: (title: string, message?: string, options?: Partial<ToastProps>) => string
  showError: (title: string, message?: string, options?: Partial<ToastProps>) => string
  showWarning: (title: string, message?: string, options?: Partial<ToastProps>) => string
  showInfo: (title: string, message?: string, options?: Partial<ToastProps>) => string
  showLoading: (title: string, message?: string, options?: Partial<ToastProps>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

// Initial state
const initialState: ToastState = {
  toasts: []
}

// Toast reducer
function toastReducer(state: ToastState, action: ToastReducerAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload]
      }
    
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      }
    
    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: []
      }
    
    default:
      return state
  }
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Toast Provider Props
interface ToastProviderProps {
  children: ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxToasts?: number
}

/**
 * Toast Provider Component
 */
export function ToastProvider({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, initialState)

  // Generate unique ID for toast
  const generateId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add toast
  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>): string => {
    const id = generateId()
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: () => dispatch({ type: 'REMOVE_TOAST', payload: id })
    }

    dispatch({ type: 'ADD_TOAST', payload: newToast })

    // Remove oldest toast if we exceed max limit
    if (state.toasts.length >= maxToasts) {
      const oldestToast = state.toasts[0]
      if (oldestToast) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', payload: oldestToast.id })
        }, 100)
      }
    }

    return id
  }, [generateId, maxToasts, state.toasts.length])

  // Remove toast
  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }, [])

  // Clear all toasts
  const clearToasts = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' })
  }, [])

  // Convenience methods for different toast types
  const showSuccess = useCallback((
    title: string, 
    message?: string, 
    options: Partial<ToastProps> = {}
  ): string => {
    return showToast({
      type: 'success',
      title,
      message,
      duration: 4000,
      ...options
    })
  }, [showToast])

  const showError = useCallback((
    title: string, 
    message?: string, 
    options: Partial<ToastProps> = {}
  ): string => {
    return showToast({
      type: 'error',
      title,
      message,
      duration: 6000,
      ...options
    })
  }, [showToast])

  const showWarning = useCallback((
    title: string, 
    message?: string, 
    options: Partial<ToastProps> = {}
  ): string => {
    return showToast({
      type: 'warning',
      title,
      message,
      duration: 5000,
      ...options
    })
  }, [showToast])

  const showInfo = useCallback((
    title: string, 
    message?: string, 
    options: Partial<ToastProps> = {}
  ): string => {
    return showToast({
      type: 'info',
      title,
      message,
      duration: 4000,
      ...options
    })
  }, [showToast])

  const showLoading = useCallback((
    title: string, 
    message?: string, 
    options: Partial<ToastProps> = {}
  ): string => {
    return showToast({
      type: 'loading',
      title,
      message,
      persistent: true,
      ...options
    })
  }, [showToast])

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    removeToast,
    clearToasts
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      {state.toasts.length > 0 && (
        <div className={`fixed ${getPositionClasses()} z-50 pointer-events-none`}>
          <div className="flex flex-col space-y-2 pointer-events-auto">
            {state.toasts.map((toast) => (
              <Toast key={toast.id} {...toast} />
            ))}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast context
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider