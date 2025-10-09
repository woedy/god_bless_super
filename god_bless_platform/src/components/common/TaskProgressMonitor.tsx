/**
 * Task Progress Monitor Component
 * Displays real-time task progress with WebSocket updates
 */

import React from 'react'
import { useTaskProgress } from '../../hooks'
import type { ID } from '../../types/models'

interface TaskProgressMonitorProps {
  taskId: ID
  className?: string
  showDetails?: boolean
  onComplete?: (taskId: ID) => void
  onError?: (taskId: ID, error: string) => void
}

/**
 * Task Progress Monitor Component
 */
export function TaskProgressMonitor({
  taskId,
  className = '',
  showDetails = true,
  onComplete,
  onError
}: TaskProgressMonitorProps) {
  const { task, isLoading, error, isActive, isCompleted, isFailed, progress, progressMessage } = useTaskProgress(taskId)

  // Handle completion callback
  React.useEffect(() => {
    if (isCompleted && onComplete) {
      onComplete(taskId)
    }
  }, [isCompleted, onComplete, taskId])

  // Handle error callback
  React.useEffect(() => {
    if (isFailed && onError && task?.error) {
      onError(taskId, task.error.message)
    }
  }, [isFailed, onError, taskId, task?.error])

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 ${className}`}>
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Failed to load task</span>
        </div>
        {showDetails && <p className="text-sm mt-1">{error}</p>}
      </div>
    )
  }

  if (!task) {
    return (
      <div className={`text-gray-500 ${className}`}>
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Task not found</span>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'running':
        return 'text-blue-600'
      case 'pending':
        return 'text-yellow-600'
      case 'cancelled':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'running':
        return (
          <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      case 'pending':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const formatTaskType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <span className="font-medium">
            {formatTaskType(task.type)}
          </span>
          <span className={`text-sm capitalize ${getStatusColor()}`}>
            {task.status}
          </span>
        </div>
        {showDetails && (
          <span className="text-sm text-gray-500">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress Message */}
      {showDetails && progressMessage && (
        <p className="text-sm text-gray-600 mb-2">
          {progressMessage}
        </p>
      )}

      {/* Task Details */}
      {showDetails && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Task ID: {task.id}</div>
          {task.createdAt && (
            <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
          )}
          {task.completedAt && (
            <div>Completed: {new Date(task.completedAt).toLocaleString()}</div>
          )}
          {task.actualDuration && (
            <div>Duration: {Math.round(task.actualDuration / 1000)}s</div>
          )}
        </div>
      )}

      {/* Error Details */}
      {isFailed && task.error && showDetails && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800 font-medium">Error:</p>
          <p className="text-sm text-red-700">{task.error.message}</p>
          {task.canRetry && (
            <button 
              className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
              onClick={() => {
                // This would trigger a retry - you'd implement this in the parent component
                console.log('Retry task:', taskId)
              }}
            >
              Retry Task
            </button>
          )}
        </div>
      )}

      {/* Success Details */}
      {isCompleted && task.result && showDetails && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800 font-medium">
            {task.result.message}
          </p>
          {task.result.statistics && (
            <div className="text-xs text-green-700 mt-1">
              Processed: {task.result.statistics.processedItems}/{task.result.statistics.totalItems} items
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskProgressMonitor