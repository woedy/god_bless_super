/**
 * Loading State Hook
 * Manages loading states for operations with automatic error handling
 */

import { useState, useCallback, useRef } from 'react'
import { useNotifications } from './useNotifications'

interface LoadingOperation {
  id: string
  name: string
  startTime: number
  toastId?: string
}

interface UseLoadingStateOptions {
  showNotifications?: boolean
  autoNotify?: boolean
  notificationDelay?: number
}

/**
 * Hook for managing loading states with notifications
 */
export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const {
    showNotifications = true,
    autoNotify = true,
    notificationDelay = 1000
  } = options

  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingOperation>>({})
  const [globalLoading, setGlobalLoading] = useState(false)
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({})
  
  const {
    notifyOperationStart,
    notifyOperationSuccess,
    notifyOperationError,
    removeToast
  } = useNotifications()

  // Start loading for a specific operation
  const startLoading = useCallback((
    operationId: string,
    operationName?: string
  ) => {
    const operation: LoadingOperation = {
      id: operationId,
      name: operationName || operationId,
      startTime: Date.now()
    }

    setLoadingStates(prev => ({
      ...prev,
      [operationId]: operation
    }))

    // Show notification after delay if enabled
    if (showNotifications && autoNotify) {
      const timeoutId = setTimeout(() => {
        const toastId = notifyOperationStart(operation.name)
        setLoadingStates(prev => ({
          ...prev,
          [operationId]: { ...prev[operationId], toastId }
        }))
      }, notificationDelay)

      timeoutRefs.current[operationId] = timeoutId
    }
  }, [showNotifications, autoNotify, notificationDelay, notifyOperationStart])

  // Stop loading for a specific operation
  const stopLoading = useCallback((
    operationId: string,
    result?: { success: boolean; message?: string; error?: string }
  ) => {
    const operation = loadingStates[operationId]
    if (!operation) return

    // Clear timeout if it exists
    if (timeoutRefs.current[operationId]) {
      clearTimeout(timeoutRefs.current[operationId])
      delete timeoutRefs.current[operationId]
    }

    // Remove from loading states
    setLoadingStates(prev => {
      const { [operationId]: removed, ...rest } = prev
      return rest
    })

    // Show result notification if enabled
    if (showNotifications && autoNotify && result) {
      if (result.success) {
        notifyOperationSuccess(operation.name, result.message, operation.toastId)
      } else {
        notifyOperationError(operation.name, result.error || 'Operation failed', operation.toastId)
      }
    } else if (operation.toastId) {
      // Just remove the loading toast if no result notification
      removeToast(operation.toastId)
    }
  }, [loadingStates, showNotifications, autoNotify, notifyOperationSuccess, notifyOperationError, removeToast])

  // Check if specific operation is loading
  const isLoading = useCallback((operationId: string): boolean => {
    return operationId in loadingStates
  }, [loadingStates])

  // Get loading operation details
  const getLoadingOperation = useCallback((operationId: string): LoadingOperation | undefined => {
    return loadingStates[operationId]
  }, [loadingStates])

  // Get loading duration for an operation
  const getLoadingDuration = useCallback((operationId: string): number => {
    const operation = loadingStates[operationId]
    return operation ? Date.now() - operation.startTime : 0
  }, [loadingStates])

  // Start global loading
  const startGlobalLoading = useCallback(() => {
    setGlobalLoading(true)
  }, [])

  // Stop global loading
  const stopGlobalLoading = useCallback(() => {
    setGlobalLoading(false)
  }, [])

  // Wrap an async operation with loading state
  const withLoading = useCallback(async <T>(
    operationId: string,
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    startLoading(operationId, operationName)
    
    try {
      const result = await operation()
      stopLoading(operationId, { success: true })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      stopLoading(operationId, { success: false, error: errorMessage })
      throw error
    }
  }, [startLoading, stopLoading])

  // Wrap an async operation with global loading
  const withGlobalLoading = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    startGlobalLoading()
    
    try {
      const result = await operation()
      return result
    } finally {
      stopGlobalLoading()
    }
  }, [startGlobalLoading, stopGlobalLoading])

  // Clear all loading states
  const clearAllLoading = useCallback(() => {
    // Clear all timeouts
    Object.values(timeoutRefs.current).forEach(clearTimeout)
    timeoutRefs.current = {}
    
    // Clear loading states
    setLoadingStates({})
    setGlobalLoading(false)
  }, [])

  // Get all active loading operations
  const getActiveOperations = useCallback((): LoadingOperation[] => {
    return Object.values(loadingStates)
  }, [loadingStates])

  // Check if any operation is loading
  const hasActiveOperations = useCallback((): boolean => {
    return Object.keys(loadingStates).length > 0
  }, [loadingStates])

  return {
    // Loading state management
    startLoading,
    stopLoading,
    isLoading,
    getLoadingOperation,
    getLoadingDuration,
    
    // Global loading
    globalLoading,
    startGlobalLoading,
    stopGlobalLoading,
    
    // Wrapper functions
    withLoading,
    withGlobalLoading,
    
    // Utility
    clearAllLoading,
    getActiveOperations,
    hasActiveOperations,
    
    // State
    loadingStates: Object.values(loadingStates),
    isAnyLoading: hasActiveOperations() || globalLoading
  }
}

/**
 * Simple loading state hook for single operations
 */
export function useSimpleLoading(initialLoading = false) {
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const startLoading = useCallback(() => {
    setLoading(true)
    setError(null)
  }, [])

  const stopLoading = useCallback((errorMessage?: string) => {
    setLoading(false)
    if (errorMessage) {
      setError(errorMessage)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    startLoading()
    
    try {
      const result = await operation()
      stopLoading()
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      stopLoading(errorMessage)
      throw error
    }
  }, [startLoading, stopLoading])

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    clearError,
    withLoading
  }
}

export default useLoadingState