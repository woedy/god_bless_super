/**
 * Task History Component
 * Displays completed tasks with filtering and search functionality
 */

import React, { useState, useMemo } from 'react'
import { useTaskMonitoringContext } from '../../hooks'
import { TaskStatusIndicator, TaskStatusBadge } from './TaskStatusIndicator'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { Pagination } from './Pagination'
import type { Task, TaskType, TaskStatus } from '../../types/models'

interface TaskHistoryProps {
  className?: string
  maxItems?: number
  showFilters?: boolean
  showPagination?: boolean
  onTaskSelect?: (task: Task) => void
}

interface TaskFilters {
  search: string
  type: TaskType | 'all'
  status: TaskStatus | 'all'
  dateRange: 'today' | 'week' | 'month' | 'all'
}

const taskTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'phone_generation', label: 'Phone Generation' },
  { value: 'phone_validation', label: 'Phone Validation' },
  { value: 'sms_campaign', label: 'SMS Campaign' },
  { value: 'export', label: 'Export' },
  { value: 'import', label: 'Import' },
  { value: 'bulk_validation', label: 'Bulk Validation' },
  { value: 'data_cleanup', label: 'Data Cleanup' }
]

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' }
]

/**
 * Task History Component
 */
export function TaskHistory({
  className = '',
  maxItems = 50,
  showFilters = true,
  showPagination = true,
  onTaskSelect
}: TaskHistoryProps) {
  const { tasks, completedTasks, failedTasks, isLoading, error, retryTask } = useTaskMonitoringContext()
  
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    type: 'all',
    status: 'all',
    dateRange: 'all'
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // Get all completed/failed tasks
  const allHistoryTasks = useMemo(() => {
    return [...completedTasks, ...failedTasks].sort((a, b) => {
      const aDate = new Date(a.completedAt || a.createdAt).getTime()
      const bDate = new Date(b.completedAt || b.createdAt).getTime()
      return bDate - aDate // Most recent first
    })
  }, [completedTasks, failedTasks])

  // Apply filters
  const filteredTasks = useMemo(() => {
    let filtered = allHistoryTasks

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(task => 
        task.type.toLowerCase().includes(searchLower) ||
        task.id.toLowerCase().includes(searchLower) ||
        (task.result?.message && task.result.message.toLowerCase().includes(searchLower)) ||
        (task.error?.message && task.error.message.toLowerCase().includes(searchLower))
      )
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(task => task.type === filters.type)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status)
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000))
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      let cutoffDate: Date
      switch (filters.dateRange) {
        case 'today':
          cutoffDate = startOfDay
          break
        case 'week':
          cutoffDate = startOfWeek
          break
        case 'month':
          cutoffDate = startOfMonth
          break
        default:
          cutoffDate = new Date(0)
      }

      filtered = filtered.filter(task => {
        const taskDate = new Date(task.completedAt || task.createdAt)
        return taskDate >= cutoffDate
      })
    }

    return filtered.slice(0, maxItems)
  }, [allHistoryTasks, filters, maxItems])

  // Pagination
  const paginatedTasks = useMemo(() => {
    if (!showPagination) return filteredTasks
    
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredTasks.slice(startIndex, endIndex)
  }, [filteredTasks, currentPage, itemsPerPage, showPagination])

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)

  // Format task type for display
  const formatTaskType = (type: TaskType): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Format duration
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  // Handle retry task
  const handleRetryTask = async (taskId: string) => {
    try {
      await retryTask(taskId)
    } catch (error) {
      console.error('Failed to retry task:', error)
    }
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-800">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Failed to load task history</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Task History</h3>
          <div className="text-sm text-gray-500">
            {filteredTasks.length} tasks
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full"
            />
            
            <Select
              value={filters.type}
              onChange={(value) => setFilters(prev => ({ ...prev, type: value as TaskType | 'all' }))}
              options={taskTypeOptions}
            />
            
            <Select
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value as TaskStatus | 'all' }))}
              options={statusOptions}
            />
            
            <Select
              value={filters.dateRange}
              onChange={(value) => setFilters(prev => ({ ...prev, dateRange: value as TaskFilters['dateRange'] }))}
              options={dateRangeOptions}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && paginatedTasks.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-3/4 ml-9"></div>
              </div>
            ))}
          </div>
        ) : paginatedTasks.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Task History</h3>
            <p className="text-gray-500">
              {filters.search || filters.type !== 'all' || filters.status !== 'all' || filters.dateRange !== 'all'
                ? 'No tasks match your current filters.'
                : 'No completed tasks found.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedTasks.map((task) => (
              <div 
                key={task.id} 
                className={`
                  p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors
                  ${onTaskSelect ? 'cursor-pointer' : ''}
                `}
                onClick={() => onTaskSelect?.(task)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <TaskStatusIndicator
                      status={task.status}
                      size="sm"
                      showLabel={false}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {formatTaskType(task.type)}
                        </h4>
                        <TaskStatusBadge status={task.status} size="sm" />
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Task ID: {task.id}
                      </div>
                      
                      {/* Task Result/Error */}
                      {task.result && (
                        <div className="text-sm text-green-700 mb-2">
                          {task.result.message}
                          {task.result.statistics && (
                            <div className="text-xs text-gray-500 mt-1">
                              Processed: {task.result.statistics.processedItems}/{task.result.statistics.totalItems} items
                            </div>
                          )}
                        </div>
                      )}
                      
                      {task.error && (
                        <div className="text-sm text-red-700 mb-2">
                          Error: {task.error.message}
                        </div>
                      )}
                      
                      {/* Task Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {task.completedAt && (
                          <span>
                            Completed: {new Date(task.completedAt).toLocaleString()}
                          </span>
                        )}
                        {task.actualDuration && (
                          <span>
                            Duration: {formatDuration(task.actualDuration)}
                          </span>
                        )}
                        {task.retryCount > 0 && (
                          <span>
                            Retries: {task.retryCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {task.status === 'failed' && task.canRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRetryTask(task.id)
                        }}
                      >
                        Retry
                      </Button>
                    )}
                    
                    {onTaskSelect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onTaskSelect(task)
                        }}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskHistory