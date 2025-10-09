/**
 * Notifications Hook
 * Provides unified notification system for user feedback
 */

import { useCallback, useEffect } from 'react'
import { useToast } from '../components/common'
import { useError } from '../contexts/ErrorContext'
import type { ErrorReport, ErrorSeverity } from '../services/errorHandler'

/**
 * Hook for managing notifications and user feedback
 */
export function useNotifications() {
  const { 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo, 
    showLoading,
    removeToast,
    clearToasts 
  } = useToast()
  
  const { state: errorState, removeError } = useError()

  // Convert error severity to toast duration
  const getToastDuration = (severity: ErrorSeverity): number => {
    switch (severity) {
      case 'low':
        return 3000
      case 'medium':
        return 5000
      case 'high':
        return 8000
      case 'critical':
        return 0 // Persistent
      default:
        return 5000
    }
  }

  // Show error notification
  const notifyError = useCallback((
    title: string,
    message?: string,
    options?: {
      persistent?: boolean
      actions?: Array<{ label: string; onClick: () => void }>
    }
  ) => {
    return showError(title, message, {
      persistent: options?.persistent,
      actions: options?.actions,
      duration: options?.persistent ? 0 : 6000
    })
  }, [showError])

  // Show success notification
  const notifySuccess = useCallback((
    title: string,
    message?: string,
    options?: {
      duration?: number
      actions?: Array<{ label: string; onClick: () => void }>
    }
  ) => {
    return showSuccess(title, message, {
      duration: options?.duration || 4000,
      actions: options?.actions
    })
  }, [showSuccess])

  // Show warning notification
  const notifyWarning = useCallback((
    title: string,
    message?: string,
    options?: {
      duration?: number
      actions?: Array<{ label: string; onClick: () => void }>
    }
  ) => {
    return showWarning(title, message, {
      duration: options?.duration || 5000,
      actions: options?.actions
    })
  }, [showWarning])

  // Show info notification
  const notifyInfo = useCallback((
    title: string,
    message?: string,
    options?: {
      duration?: number
      actions?: Array<{ label: string; onClick: () => void }>
    }
  ) => {
    return showInfo(title, message, {
      duration: options?.duration || 4000,
      actions: options?.actions
    })
  }, [showInfo])

  // Show loading notification
  const notifyLoading = useCallback((
    title: string,
    message?: string
  ) => {
    return showLoading(title, message, {
      persistent: true
    })
  }, [showLoading])

  // Operation feedback helpers
  const notifyOperationStart = useCallback((operation: string) => {
    return notifyLoading(`${operation}...`, 'Please wait while we process your request')
  }, [notifyLoading])

  const notifyOperationSuccess = useCallback((
    operation: string,
    details?: string,
    toastId?: string
  ) => {
    if (toastId) {
      removeToast(toastId)
    }
    return notifySuccess(`${operation} completed`, details)
  }, [notifySuccess, removeToast])

  const notifyOperationError = useCallback((
    operation: string,
    error: string,
    toastId?: string,
    retryAction?: () => void
  ) => {
    if (toastId) {
      removeToast(toastId)
    }
    return notifyError(
      `${operation} failed`,
      error,
      {
        persistent: true,
        actions: retryAction ? [{ label: 'Retry', onClick: retryAction }] : undefined
      }
    )
  }, [notifyError, removeToast])

  // API operation helpers
  const notifyApiSuccess = useCallback((
    operation: string,
    resourceName?: string
  ) => {
    const message = resourceName 
      ? `${resourceName} ${operation} successfully`
      : `${operation} completed successfully`
    return notifySuccess('Success', message)
  }, [notifySuccess])

  const notifyApiError = useCallback((
    operation: string,
    error: any,
    retryAction?: () => void
  ) => {
    const errorMessage = error?.message || 'An unexpected error occurred'
    return notifyError(
      `${operation} failed`,
      errorMessage,
      {
        persistent: error?.severity === 'critical',
        actions: retryAction ? [{ label: 'Retry', onClick: retryAction }] : undefined
      }
    )
  }, [notifyError])

  // Form validation helpers
  const notifyValidationError = useCallback((
    fieldErrors: Record<string, string[]> | string
  ) => {
    if (typeof fieldErrors === 'string') {
      return notifyError('Validation Error', fieldErrors)
    }

    const errorMessages = Object.entries(fieldErrors)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('\n')

    return notifyError(
      'Please fix the following errors:',
      errorMessages,
      { persistent: true }
    )
  }, [notifyError])

  // File operation helpers
  const notifyFileUploadStart = useCallback((fileName: string) => {
    return notifyLoading('Uploading file', `Uploading ${fileName}...`)
  }, [notifyLoading])

  const notifyFileUploadSuccess = useCallback((
    fileName: string,
    toastId?: string
  ) => {
    if (toastId) {
      removeToast(toastId)
    }
    return notifySuccess('Upload complete', `${fileName} uploaded successfully`)
  }, [notifySuccess, removeToast])

  const notifyFileUploadError = useCallback((
    fileName: string,
    error: string,
    toastId?: string,
    retryAction?: () => void
  ) => {
    if (toastId) {
      removeToast(toastId)
    }
    return notifyError(
      'Upload failed',
      `Failed to upload ${fileName}: ${error}`,
      {
        persistent: true,
        actions: retryAction ? [{ label: 'Retry', onClick: retryAction }] : undefined
      }
    )
  }, [notifyError, removeToast])

  // Task operation helpers
  const notifyTaskStart = useCallback((taskType: string) => {
    return notifyInfo('Task started', `${taskType} task has been queued`)
  }, [notifyInfo])

  const notifyTaskProgress = useCallback((
    taskType: string,
    progress: number,
    toastId?: string
  ) => {
    if (toastId) {
      removeToast(toastId)
    }
    return notifyLoading(
      `${taskType} in progress`,
      `${Math.round(progress)}% complete`
    )
  }, [notifyLoading, removeToast])

  const notifyTaskComplete = useCallback((
    taskType: string,
    result?: string,
    toastId?: string
  ) => {
    if (toastId) {
      removeToast(toastId)
    }
    return notifySuccess(
      `${taskType} completed`,
      result || 'Task completed successfully'
    )
  }, [notifySuccess, removeToast])

  const notifyTaskError = useCallback((
    taskType: string,
    error: string,
    toastId?: string,
    retryAction?: () => void
  ) => {
    if (toastId) {
      removeToast(toastId)
    }
    return notifyError(
      `${taskType} failed`,
      error,
      {
        persistent: true,
        actions: retryAction ? [{ label: 'Retry', onClick: retryAction }] : undefined
      }
    )
  }, [notifyError, removeToast])

  // Auto-convert errors to notifications
  useEffect(() => {
    const latestError = errorState.lastError
    if (latestError && !latestError.context?.notified) {
      const duration = getToastDuration(latestError.severity)
      
      showError(
        getErrorTitle(latestError),
        latestError.message,
        {
          duration,
          persistent: latestError.severity === 'critical',
          actions: latestError.severity === 'critical' ? [
            { label: 'Dismiss', onClick: () => removeError(latestError.id) }
          ] : undefined
        }
      )

      // Mark as notified to prevent duplicate notifications
      latestError.context = { ...latestError.context, notified: true }
    }
  }, [errorState.lastError, showError, removeError])

  // Helper to get error title based on type
  const getErrorTitle = (error: ErrorReport): string => {
    switch (error.type) {
      case 'network_error':
        return 'Connection Error'
      case 'authentication_error':
        return 'Authentication Error'
      case 'authorization_error':
        return 'Access Denied'
      case 'validation_error':
        return 'Validation Error'
      case 'api_error':
        return 'Server Error'
      case 'runtime_error':
        return 'Application Error'
      default:
        return 'Error'
    }
  }

  return {
    // Basic notifications
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyLoading,
    
    // Operation feedback
    notifyOperationStart,
    notifyOperationSuccess,
    notifyOperationError,
    
    // API operations
    notifyApiSuccess,
    notifyApiError,
    
    // Form validation
    notifyValidationError,
    
    // File operations
    notifyFileUploadStart,
    notifyFileUploadSuccess,
    notifyFileUploadError,
    
    // Task operations
    notifyTaskStart,
    notifyTaskProgress,
    notifyTaskComplete,
    notifyTaskError,
    
    // Utility
    removeToast,
    clearToasts
  }
}

export default useNotifications