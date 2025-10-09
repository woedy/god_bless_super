/**
 * Task Details Page
 * Detailed view of individual task with logs and results
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { 
  Button, 
  TaskProgressMonitor, 
  TaskStatusIndicator,
  Badge 
} from '../../components/common'
import { useTaskMonitoringContext } from '../../hooks'
import type { Task } from '../../types/models'
import type { BreadcrumbItem } from '../../types/ui'

/**
 * Task Details Page Component
 */
export function TaskDetailsPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { 
    getTask, 
    cancelTask, 
    retryTask, 
    isLoading, 
    error 
  } = useTaskMonitoringContext()

  const [task, setTask] = useState<Task | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard'
    },
    {
      label: 'Tasks',
      href: '/tasks'
    },
    {
      label: task ? `Task ${task.id.substring(0, 8)}...` : 'Task Details',
      href: `/tasks/${taskId}`,
      isActive: true
    }
  ]

  useEffect(() => {
    if (taskId) {
      loadTask()
    }
  }, [taskId])

  const loadTask = useCallback(() => {
    if (!taskId) return

    try {
      const taskData = getTask(taskId)
      if (taskData) {
        setTask(taskData)
        setTaskError(null)
      } else {
        setTaskError('Task not found')
      }
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to load task')
    }
  }, [taskId, getTask])

  const handleCancelTask = async () => {
    if (!task) return

    try {
      await cancelTask(task.id)
      loadTask() // Refresh task data
    } catch (err) {
      console.error('Failed to cancel task:', err)
    }
  }

  const handleRetryTask = async () => {
    if (!task) return

    try {
      await retryTask(task.id)
      loadTask() // Refresh task data
    } catch (err) {
      console.error('Failed to retry task:', err)
    }
  }

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const getElapsedTime = (startedAt: string): string => {
    const elapsed = Date.now() - new Date(startedAt).getTime()
    return formatDuration(elapsed)
  }

  const getTaskTypeLabel = (type: string): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading task details...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (taskError || !task) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Failed to load task</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{taskError || error}</p>
          <div className="mt-4 space-x-3">
            <Button
              variant="outline"
              onClick={loadTask}
            >
              Try Again
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/tasks')}
            >
              Back to Tasks
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getTaskTypeLabel(task.type)} Task
            </h1>
            <p className="text-gray-600 mt-1">
              Task ID: {task.id}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={loadTask}
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/tasks')}
            >
              Back to Tasks
            </Button>
          </div>
        </div>

        {/* Task Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Task Overview</h2>
            <div className="flex items-center space-x-3">
              <TaskStatusIndicator status={task.status} />
              {task.status === 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelTask}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel Task
                </Button>
              )}
              {task.status === 'failed' && task.canRetry && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRetryTask}
                >
                  Retry Task
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-sm text-gray-900 mt-1">{getTaskTypeLabel(task.type)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Progress</label>
              <p className="text-sm text-gray-900 mt-1">{task.progress}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-sm text-gray-900 mt-1">
                {new Date(task.createdAt).toLocaleString()}
              </p>
            </div>
            {task.startedAt && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {task.status === 'running' ? 'Running Time' : 'Started'}
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {task.status === 'running' 
                    ? getElapsedTime(task.startedAt)
                    : new Date(task.startedAt).toLocaleString()
                  }
                </p>
              </div>
            )}
            {task.completedAt && (
              <div>
                <label className="text-sm font-medium text-gray-500">Completed</label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(task.completedAt).toLocaleString()}
                </p>
              </div>
            )}
            {task.actualDuration && (
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <p className="text-sm text-gray-900 mt-1">
                  {formatDuration(task.actualDuration)}
                </p>
              </div>
            )}
            {task.estimatedDuration && (
              <div>
                <label className="text-sm font-medium text-gray-500">Estimated Duration</label>
                <p className="text-sm text-gray-900 mt-1">
                  {formatDuration(task.estimatedDuration)}
                </p>
              </div>
            )}
            {task.retryCount > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Retry Count</label>
                <p className="text-sm text-gray-900 mt-1">
                  {task.retryCount} / {task.maxRetries}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Monitor */}
        {task.status === 'running' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Real-time Progress</h2>
            <TaskProgressMonitor
              taskId={task.id}
              status={task.status}
              showDetails={true}
            />
          </div>
        )}

        {/* Task Parameters */}
        {task.parameters && Object.keys(task.parameters).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parameters</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(task.parameters, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Task Result */}
        {task.result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Result</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-green-800">
                  {task.result.message}
                </span>
              </div>

              {/* Statistics */}
              {task.result.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-700">
                      {task.result.statistics.totalItems}
                    </p>
                    <p className="text-sm text-green-600">Total Items</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-700">
                      {task.result.statistics.processedItems}
                    </p>
                    <p className="text-sm text-green-600">Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-700">
                      {task.result.statistics.successfulItems}
                    </p>
                    <p className="text-sm text-green-600">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-700">
                      {task.result.statistics.failedItems}
                    </p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-700">
                      {task.result.statistics.skippedItems}
                    </p>
                    <p className="text-sm text-yellow-600">Skipped</p>
                  </div>
                </div>
              )}

              {/* Download Link */}
              {task.result.downloadUrl && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(task.result!.downloadUrl, '_blank')}
                  >
                    Download Results
                  </Button>
                </div>
              )}

              {/* Warnings */}
              {task.result.warnings && task.result.warnings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {task.result.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-700">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Data */}
              {task.result.data && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-green-800 hover:text-green-900">
                    View Raw Result Data
                  </summary>
                  <div className="mt-2 bg-green-100 rounded p-3">
                    <pre className="text-xs text-green-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(task.result.data, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Task Error */}
        {task.error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Details</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-red-800">
                  {task.error.message}
                </span>
                {task.error.retryable && (
                  <Badge variant="warning" size="sm">
                    Retryable
                  </Badge>
                )}
              </div>

              {task.error.code && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-red-700">Error Code: </span>
                  <code className="text-sm text-red-800 bg-red-100 px-2 py-1 rounded">
                    {task.error.code}
                  </code>
                </div>
              )}

              {task.error.details && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-900">
                    View Error Details
                  </summary>
                  <div className="mt-2 bg-red-100 rounded p-3">
                    <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(task.error.details, null, 2)}
                    </pre>
                  </div>
                </details>
              )}

              {task.error.stackTrace && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-900">
                    View Stack Trace
                  </summary>
                  <div className="mt-2 bg-red-100 rounded p-3">
                    <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-x-auto">
                      {task.error.stackTrace}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}