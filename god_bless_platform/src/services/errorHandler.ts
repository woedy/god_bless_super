/**
 * Global Error Handler Service
 * Centralized error handling, logging, and reporting
 */

import { ApiClientError, NetworkError } from './api'

// Error Types
export interface ErrorReport {
  id: string
  type: ErrorType
  message: string
  stack?: string
  timestamp: string
  url: string
  userAgent: string
  userId?: string
  context?: Record<string, any>
  severity: ErrorSeverity
}

export type ErrorType = 
  | 'api_error'
  | 'network_error'
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'runtime_error'
  | 'unknown_error'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
  'TIMEOUT_ERROR': 'The request took too long to complete. Please try again.',
  'CONNECTION_REFUSED': 'Unable to connect to the server. Please try again later.',
  
  // Authentication errors
  'INVALID_CREDENTIALS': 'Invalid email or password. Please check your credentials.',
  'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
  'UNAUTHORIZED': 'You are not authorized to perform this action.',
  'FORBIDDEN': 'Access denied. You do not have permission to access this resource.',
  
  // Validation errors
  'VALIDATION_ERROR': 'Please check the form for errors and try again.',
  'REQUIRED_FIELD': 'This field is required.',
  'INVALID_FORMAT': 'Please enter a valid value.',
  'DUPLICATE_ENTRY': 'This entry already exists.',
  
  // API errors
  'SERVER_ERROR': 'A server error occurred. Please try again later.',
  'NOT_FOUND': 'The requested resource was not found.',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
  
  // Task errors
  'TASK_FAILED': 'The operation failed. Please try again.',
  'TASK_TIMEOUT': 'The operation took too long to complete.',
  'INSUFFICIENT_RESOURCES': 'Insufficient resources to complete the operation.',
  
  // File errors
  'FILE_TOO_LARGE': 'The file is too large. Please select a smaller file.',
  'INVALID_FILE_TYPE': 'Invalid file type. Please select a supported file format.',
  'FILE_UPLOAD_FAILED': 'File upload failed. Please try again.',
  
  // Default
  'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
}

/**
 * Global Error Handler Class
 */
class GlobalErrorHandler {
  private errorQueue: ErrorReport[] = []
  private isOnline = navigator.onLine
  private errorListeners: ((error: ErrorReport) => void)[] = []

  constructor() {
    this.setupGlobalErrorHandlers()
    this.setupNetworkStatusHandlers()
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers() {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: 'runtime_error',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'runtime_error',
        context: {
          promise: true
        }
      })
    })
  }

  /**
   * Setup network status handlers
   */
  private setupNetworkStatusHandlers() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushErrorQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  /**
   * Handle error with context
   */
  public handleError(
    error: Error | string, 
    options: {
      type?: ErrorType
      severity?: ErrorSeverity
      context?: Record<string, any>
      userId?: string
      silent?: boolean
    } = {}
  ): ErrorReport {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      type: this.determineErrorType(errorObj, options.type),
      message: this.getUserFriendlyMessage(errorObj),
      stack: errorObj.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: options.userId,
      context: options.context,
      severity: options.severity || this.determineSeverity(errorObj)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global Error Handler:', errorReport)
    }

    // Add to queue for reporting
    this.errorQueue.push(errorReport)

    // Notify listeners
    if (!options.silent) {
      this.notifyListeners(errorReport)
    }

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue()
    }

    return errorReport
  }

  /**
   * Handle API errors specifically
   */
  public handleApiError(error: ApiClientError | NetworkError, context?: Record<string, any>): ErrorReport {
    let type: ErrorType = 'api_error'
    let severity: ErrorSeverity = 'medium'

    if (error instanceof NetworkError) {
      type = 'network_error'
      severity = 'high'
    } else if (error instanceof ApiClientError) {
      if (error.status === 401) {
        type = 'authentication_error'
        severity = 'high'
      } else if (error.status === 403) {
        type = 'authorization_error'
        severity = 'medium'
      } else if (error.status >= 500) {
        type = 'api_error'
        severity = 'high'
      }
    }

    return this.handleError(error, {
      type,
      severity,
      context: {
        ...context,
        status: error instanceof ApiClientError ? error.status : undefined,
        code: error instanceof ApiClientError ? error.code : undefined,
        details: error instanceof ApiClientError ? error.details : undefined
      }
    })
  }

  /**
   * Add error listener
   */
  public addErrorListener(listener: (error: ErrorReport) => void) {
    this.errorListeners.push(listener)
  }

  /**
   * Remove error listener
   */
  public removeErrorListener(listener: (error: ErrorReport) => void) {
    const index = this.errorListeners.indexOf(listener)
    if (index > -1) {
      this.errorListeners.splice(index, 1)
    }
  }

  /**
   * Get user-friendly error message
   */
  public getUserFriendlyMessage(error: Error | string): string {
    const errorMessage = typeof error === 'string' ? error : error.message

    // Check for specific error codes/messages
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      if (errorMessage.includes(code) || errorMessage.toLowerCase().includes(code.toLowerCase())) {
        return message
      }
    }

    // Handle API error formats
    if (error instanceof ApiClientError) {
      if (error.status === 400) {
        return ERROR_MESSAGES.VALIDATION_ERROR
      } else if (error.status === 401) {
        return ERROR_MESSAGES.INVALID_CREDENTIALS
      } else if (error.status === 403) {
        return ERROR_MESSAGES.UNAUTHORIZED
      } else if (error.status === 404) {
        return ERROR_MESSAGES.NOT_FOUND
      } else if (error.status === 429) {
        return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
      } else if (error.status >= 500) {
        return ERROR_MESSAGES.SERVER_ERROR
      }
    }

    if (error instanceof NetworkError) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }

    // Return original message if it's user-friendly, otherwise use generic message
    if (typeof error === 'string' && error.length < 100 && !error.includes('Error:')) {
      return error
    }

    return ERROR_MESSAGES.UNKNOWN_ERROR
  }

  /**
   * Determine error type
   */
  private determineErrorType(error: Error, providedType?: ErrorType): ErrorType {
    if (providedType) {
      return providedType
    }

    if (error instanceof ApiClientError) {
      if (error.status === 401) return 'authentication_error'
      if (error.status === 403) return 'authorization_error'
      if (error.code === 'VALIDATION_ERROR') return 'validation_error'
      return 'api_error'
    }

    if (error instanceof NetworkError) {
      return 'network_error'
    }

    return 'runtime_error'
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error): ErrorSeverity {
    if (error instanceof ApiClientError) {
      if (error.status >= 500) return 'critical'
      if (error.status === 401 || error.status === 403) return 'high'
      if (error.status >= 400) return 'medium'
    }

    if (error instanceof NetworkError) {
      return 'high'
    }

    // Check error message for severity indicators
    const message = error.message.toLowerCase()
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical'
    }
    if (message.includes('warning') || message.includes('validation')) {
      return 'medium'
    }

    return 'medium'
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Notify error listeners
   */
  private notifyListeners(error: ErrorReport) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error)
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError)
      }
    })
  }

  /**
   * Flush error queue to reporting service
   */
  private async flushErrorQueue() {
    if (this.errorQueue.length === 0 || !this.isOnline) {
      return
    }

    const errorsToSend = [...this.errorQueue]
    this.errorQueue = []

    try {
      // In a real application, send to error reporting service
      // await errorReportingService.sendErrors(errorsToSend)
      
      // For now, just log that we would send them
      console.log('Would send error reports:', errorsToSend)
    } catch (error) {
      // If sending fails, add back to queue
      this.errorQueue.unshift(...errorsToSend)
      console.error('Failed to send error reports:', error)
    }
  }

  /**
   * Clear error queue
   */
  public clearErrorQueue() {
    this.errorQueue = []
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    total: number
    byType: Record<ErrorType, number>
    bySeverity: Record<ErrorSeverity, number>
  } {
    const stats = {
      total: this.errorQueue.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>
    }

    this.errorQueue.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1
    })

    return stats
  }
}

// Create and export singleton instance
export const globalErrorHandler = new GlobalErrorHandler()