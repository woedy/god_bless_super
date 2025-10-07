/**
 * Active Tasks List Component
 * Displays a list of currently active tasks with real-time updates
 */

import React from 'react'
import { useTaskMonitoringContext } from '../../hooks'
import TaskProgressMonitor from './TaskProgressMonitor'

interface ActiveTasksListProps {
  className?: string
  maxTasks?: number
  showEmptyState?: boolean
  onTaskComplete?: (taskId: string) => void
  onTaskError?: (taskId: string, error: string) => void
}

/**
 * Active Tasks List Component
 */
export function ActiveTasksList({
  className = '',
  maxTasks = 10,
  showEmptyState = true,
  onTaskComplete,
  onTaskError
}: ActiveTasksListProps) {
  const { activeTasks, isLoading, error, refreshTasks, retryTask, cancelTask } = useTaskMonitoringContext()

  const displayTasks = activeTasks.slice(0, maxTasks)

  const handleRetryTask = async (taskId: string) => {
    try {
      await retryTask(taskId)
    } catch (error) {
      console.error('Failed to retry task:', error)
    }
  }

  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelTask(taskId)
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Failed to load active tasks</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button
            onClick={refreshTasks}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isLoading && displayTasks.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (displayTasks.length === 0) {
    if (!showEmptyState) return null

    return (
      <div className={`${className}`}>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Tasks</h3>
          <p className="text-gray-500">All tasks have been completed or there are no tasks running.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-4">
        {displayTasks.map((task) => (
          <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <TaskProgressMonitor
              taskId={task.id}
              showDetails={true}
              onComplete={onTaskComplete}
              onError={onTaskError}
            />
            
            {/* Task Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {task.createdAt && (
                  <span>Started {new Date(task.createdAt).toLocaleTimeString()}</span>
                )}
                {task.estimatedDuration && (
                  <span>~{Math.round(task.estimatedDuration / 1000)}s remaining</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {task.status === 'running' && (
                  <button
                    onClick={() => handleCancelTask(task.id)}
                    className="text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}
                
                {task.status === 'failed' && task.canRetry && (
                  <button
                    onClick={() => handleRetryTask(task.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {activeTasks.length > maxTasks && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              Showing {maxTasks} of {activeTasks.length} active tasks
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActiveTasksList