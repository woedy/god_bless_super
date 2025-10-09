/**
 * Task History Page
 * Comprehensive task history with filtering and search
 */

import { useState } from 'react'
import { AppLayout } from '../../components/layout'
import { TaskHistory } from '../../components/common'
import { Button } from '../../components/common'
import { useTaskMonitoringContext } from '../../hooks'
import type { Task } from '../../types/models'
import type { BreadcrumbItem } from '../../types/ui'

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
    label: 'History',
    href: '/tasks/history',
    isActive: true
  }
]

/**
 * Task History Page Component
 */
export function TaskHistoryPage() {
  const { 
    isLoading, 
    error, 
    refreshTasks,
    totalTasks,
    completedTaskCount,
    failedTaskCount,
    successRate
  } = useTaskMonitoringContext()

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
  }

  const handleCloseTaskDetails = () => {
    setSelectedTask(null)
  }

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task History</h1>
            <p className="text-gray-600 mt-1">
              View and manage completed and failed tasks with detailed filtering options.
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={refreshTasks}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <a
              href="/tasks"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Overview
            </a>
            <a
              href="/tasks/active"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Active Tasks
            </a>
            <a
              href="/tasks/history"
              className="border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Task History
            </a>
          </nav>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{totalTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{completedTaskCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">{failedTaskCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{Math.round(successRate)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Failed to load task history</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTasks}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Task History Component */}
        <TaskHistory
          showFilters={true}
          showPagination={true}
          onTaskSelect={handleTaskSelect}
          className="shadow-sm"
        />

        {/* Task Details Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
                  <button
                    onClick={handleCloseTaskDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Task Information */}
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Task ID</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedTask.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Type</label>
                        <p className="text-sm text-gray-900">
                          {selectedTask.type.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <p className="text-sm text-gray-900 capitalize">{selectedTask.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Progress</label>
                        <p className="text-sm text-gray-900">{selectedTask.progress}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Timing */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Timing</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedTask.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {selectedTask.startedAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Started</label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedTask.startedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {selectedTask.completedAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Completed</label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedTask.completedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {selectedTask.actualDuration && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Duration</label>
                          <p className="text-sm text-gray-900">
                            {formatDuration(selectedTask.actualDuration)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parameters */}
                  {selectedTask.parameters && Object.keys(selectedTask.parameters).length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Parameters</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(selectedTask.parameters, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {selectedTask.result && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Result</h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800 font-medium mb-2">
                          {selectedTask.result.message}
                        </p>
                        {selectedTask.result.statistics && (
                          <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                            <div>Total Items: {selectedTask.result.statistics.totalItems}</div>
                            <div>Processed: {selectedTask.result.statistics.processedItems}</div>
                            <div>Successful: {selectedTask.result.statistics.successfulItems}</div>
                            <div>Failed: {selectedTask.result.statistics.failedItems}</div>
                          </div>
                        )}
                        {selectedTask.result.data && (
                          <div className="mt-3">
                            <details>
                              <summary className="cursor-pointer text-sm font-medium text-green-800">
                                View Raw Data
                              </summary>
                              <pre className="mt-2 text-xs text-green-700 whitespace-pre-wrap bg-green-100 p-2 rounded">
                                {JSON.stringify(selectedTask.result.data, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {selectedTask.error && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Error</h3>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 font-medium mb-2">
                          {selectedTask.error.message}
                        </p>
                        {selectedTask.error.details && (
                          <div className="mt-3">
                            <details>
                              <summary className="cursor-pointer text-sm font-medium text-red-800">
                                View Error Details
                              </summary>
                              <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap bg-red-100 p-2 rounded">
                                {JSON.stringify(selectedTask.error.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Retry Information */}
                  {selectedTask.retryCount > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Retry Information</h3>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm text-yellow-800">
                          <div>Retry Count: {selectedTask.retryCount}</div>
                          <div>Max Retries: {selectedTask.maxRetries}</div>
                          <div>Can Retry: {selectedTask.canRetry ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={handleCloseTaskDetails}
                  >
                    Close
                  </Button>
                  {selectedTask.status === 'failed' && selectedTask.canRetry && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        // Handle retry logic here
                        console.log('Retry task:', selectedTask.id)
                        handleCloseTaskDetails()
                      }}
                    >
                      Retry Task
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}