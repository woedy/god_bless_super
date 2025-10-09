/**
 * Progress Indicator Component
 * Shows progress for long-running operations with detailed feedback
 */

import React from 'react'
import { ProgressBar } from './ProgressBar'
import { LoadingSpinner } from './LoadingState'

export interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
  progress?: number
  message?: string
  error?: string
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[]
  currentStep?: string
  overallProgress?: number
  title?: string
  description?: string
  showSteps?: boolean
  showOverallProgress?: boolean
  className?: string
  onCancel?: () => void
  onRetry?: () => void
}

/**
 * Progress Indicator Component
 */
export function ProgressIndicator({
  steps,
  currentStep,
  overallProgress,
  title,
  description,
  showSteps = true,
  showOverallProgress = true,
  className = '',
  onCancel,
  onRetry
}: ProgressIndicatorProps) {
  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'active':
        return <LoadingSpinner size="sm" />
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
        )
    }
  }

  const getStepStatusColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      case 'active':
        return 'text-blue-600'
      default:
        return 'text-gray-500'
    }
  }

  const getStepBackgroundColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'active':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const hasError = steps.some(step => step.status === 'error')
  const isCompleted = steps.every(step => step.status === 'completed')
  const activeStep = steps.find(step => step.status === 'active')

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Overall Progress */}
      {showOverallProgress && overallProgress !== undefined && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <ProgressBar
            value={overallProgress}
            variant={hasError ? 'error' : isCompleted ? 'success' : 'default'}
            size="md"
            animated={!isCompleted && !hasError}
          />
        </div>
      )}

      {/* Steps */}
      {showSteps && (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`border rounded-lg p-4 transition-colors ${getStepBackgroundColor(step)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${getStepStatusColor(step)}`}>
                      {step.label}
                    </h4>
                    {step.progress !== undefined && (
                      <span className="text-xs text-gray-500">
                        {Math.round(step.progress)}%
                      </span>
                    )}
                  </div>
                  
                  {step.message && (
                    <p className="mt-1 text-sm text-gray-600">
                      {step.message}
                    </p>
                  )}
                  
                  {step.error && (
                    <p className="mt-1 text-sm text-red-600">
                      {step.error}
                    </p>
                  )}
                  
                  {step.progress !== undefined && step.status === 'active' && (
                    <div className="mt-2">
                      <ProgressBar
                        value={step.progress}
                        size="sm"
                        animated
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Step Info */}
      {activeStep && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <LoadingSpinner size="sm" className="mr-2" />
            <span className="text-sm text-blue-800">
              {activeStep.message || `Processing ${activeStep.label}...`}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {(onCancel || onRetry) && (
        <div className="mt-6 flex justify-end space-x-3">
          {onRetry && hasError && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry
            </button>
          )}
          
          {onCancel && !isCompleted && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Simple Progress Indicator for basic operations
 */
export function SimpleProgressIndicator({
  progress,
  message,
  title,
  className = ''
}: {
  progress: number
  message?: string
  title?: string
  className?: string
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {title && (
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          {title}
        </h4>
      )}
      
      <div className="flex items-center space-x-3">
        <LoadingSpinner size="sm" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">
              {message || 'Processing...'}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
          <ProgressBar
            value={progress}
            size="sm"
            animated
          />
        </div>
      </div>
    </div>
  )
}

export default ProgressIndicator