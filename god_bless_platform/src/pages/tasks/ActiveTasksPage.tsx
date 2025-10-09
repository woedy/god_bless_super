/**
 * Active Tasks Page
 * Real-time monitoring of currently running tasks
 */

import { useState, useEffect } from 'react'
import { AppLayout } from '../../components/layout'
import { 
  Button, 
  TaskProgressMonitor, 
  TaskStatusIndicator
} from '../../components/common'
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
    label: 'Active Tasks',
    href: '/tasks/active',
    isActive: true
  }
]

/**
 * Active Tasks Page Component
 */
export function ActiveTasksPage() {
  const { 
    activeTasks, 
    isLoading, 
    error, 
    refreshTasks,
    cancelTask,
    retryTask
  } = useTaskMonitoringContext()

  // Derive running and pending tasks from activeTasks
  const runningTasks = activeTasks.filter(task => task.status === 'running')
  const pendingTasks = activeTasks.filter(task => task.status === 'pending')

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 5 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshTasks()
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshTasks])

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
  }

  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelTask(taskId)
    } catch (error) {
      console.error('Failed to cancel task:', error)
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

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Tasks</h1>
            <p className="text-gray-600 mt-1">
              Monitor currently running and pending background tasks in real-time.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="auto-refresh" className="text-sm text-gray-700">
                Auto-refresh
              </label>
            </div>
            <Button 
              variant="outline"
              onClick={refreshTasks}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
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
              className="border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Active Tasks
            </a>
            <a
              href="/tasks/history"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
            >
              Task History
            </a>
          </nav>
        </div>

        {/* Task Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Running Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{runningTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Active</p>
                <p className="text-2xl font-semibold text-gray-900">{activeTasks.length}</p>
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
              <span className="font-medium">Failed to load active tasks</span>
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

        {/* Running Tasks */}
        {runningTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Running Tasks</h2>
              <p className="text-sm text-gray-600 mt-1">
                Tasks currently being processed
              </p>
            </div>
            <div className="p-6 space-y-4">
              {runningTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {task.type.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </h3>
                        <TaskStatusIndicator status={task.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {task.progressMessage || `Task ID: ${task.id}`}
                      </p>
                      {task.startedAt && (
                        <p className="text-xs text-gray-500">
                          Running for {getElapsedTime(task.startedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTaskSelect(task)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelTask(task.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  
                  <TaskProgressMonitor
                    taskId={task.id}
                    status={task.status}
                    showDetails={false}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Tasks</h2>
              <p className="text-sm text-gray-600 mt-1">
                Tasks waiting to be processed
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {task.type.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {task.id.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TaskStatusIndicator status={task.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(task.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTaskSelect(task)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelTask(task.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && activeTasks.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Tasks</h3>
            <p className="text-gray-600 mb-4">
              There are currently no running or pending tasks.
            </p>
            <Button
              variant="outline"
              onClick={refreshTasks}
            >
              Refresh Tasks
            </Button>
          </div>
        )}

        {/* Task Details Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
                  <button
                    onClick={() => setSelectedTask(null)}
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
                        <div className="flex items-center space-x-2">
                          <TaskStatusIndicator status={selectedTask.status} />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Progress</label>
                        <p className="text-sm text-gray-900">{selectedTask.progress}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Monitor */}
                  {selectedTask.status === 'running' && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Progress</h3>
                      <TaskProgressMonitor
                        taskId={selectedTask.id}
                        status={selectedTask.status}
                        showDetails={true}
                      />
                    </div>
                  )}

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
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTask(null)}
                  >
                    Close
                  </Button>
                  {selectedTask.status === 'running' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleCancelTask(selectedTask.id)
                        setSelectedTask(null)
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel Task
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