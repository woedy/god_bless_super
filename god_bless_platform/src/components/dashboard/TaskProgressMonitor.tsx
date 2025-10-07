/**
 * Task Progress Monitor Component
 * Displays active task display and progress monitoring
 */

import React, { useState } from 'react'
import { useTaskMonitoring } from '../../hooks/useTaskMonitoring'
import type { TaskSummary, TaskType, TaskStatus } from '../../types/models'

interface TaskProgressMonitorProps {
  taskSummary: TaskSummary
  className?: string
  showActiveOnly?: boolean
}

const taskTypeConfig: Record<TaskType, {
  icon: React.ReactNode
  color: string
  bgColor: string
  label: string
}> = {
  phone_generation: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Phone Generation'
  },
  phone_validation: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Phone Validation'
  },
  sms_campaign: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'SMS Campaign'
  },
  export: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Export'
  },
  import: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    ),
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    label: 'Import'
  },
  bulk_validation: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    label: 'Bulk Validation'
  },
  data_cleanup: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Data Cleanup'
  }
}

const taskStatusConfig: Record<TaskStatus, {
  color: string
  bgColor: string
  label: string
}> = {
  pending: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Pending'
  },
  running: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Running'
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Completed'
  },
  failed: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Failed'
  },
  cancelled: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Cancelled'
  },
  retrying: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Retrying'
  }
}

export const TaskProgressMonitor: React.FC<TaskProgressMonitorProps> = ({
  taskSummary,
  className = '',
  showActiveOnly = false
}) => {
  const [selectedView, setSelectedView] = useState<'summary' | 'active' | 'history'>('summary')
  const { activeTasks, taskHistory } = useTaskMonitoring()

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    if (progress >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className={`task-progress-monitor bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Task Monitor</h3>
          <div className="text-sm text-gray-500">
            {taskSummary.running} running • {taskSummary.pending} pending
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'summary', label: 'Summary' },
            { key: 'active', label: `Active (${activeTasks.length})` },
            { key: 'history', label: 'History' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key as any)}
              className={`
                flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${selectedView === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedView === 'summary' && (
          <div className="space-y-4">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{taskSummary.total}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{Math.round(taskSummary.successRate)}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Status Breakdown</h4>
              {Object.entries({
                running: taskSummary.running,
                pending: taskSummary.pending,
                completed: taskSummary.completed,
                failed: taskSummary.failed
              }).map(([status, count]) => {
                const config = taskStatusConfig[status as TaskStatus]
                const percentage = taskSummary.total > 0 ? (count / taskSummary.total) * 100 : 0
                
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${config.bgColor.replace('bg-', 'bg-')}`}></div>
                      <span className="text-sm text-gray-700 capitalize">{status}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                      <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Task Types */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">By Type</h4>
              {Object.entries(taskSummary.byType).map(([type, count]) => {
                const config = taskTypeConfig[type as TaskType]
                
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded ${config.bgColor} ${config.color}`}>
                        {config.icon}
                      </div>
                      <span className="text-sm text-gray-700">{config.label}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Average Duration */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                Average Duration: <span className="font-medium">{formatDuration(taskSummary.averageDuration)}</span>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'active' && (
          <div className="space-y-3">
            {activeTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">No active tasks</p>
              </div>
            ) : (
              activeTasks.map((task) => {
                const typeConfig = taskTypeConfig[task.type]
                const statusConfig = taskStatusConfig[task.status]
                
                return (
                  <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                          {typeConfig.icon}
                        </div>
                        <span className="font-medium text-gray-900">{typeConfig.label}</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </div>
                    </div>
                    
                    {task.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(task.progress)}`}
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        {task.progressMessage && (
                          <div className="text-xs text-gray-600">{task.progressMessage}</div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Started: {new Date(task.startedAt || task.createdAt).toLocaleTimeString()}</span>
                      {task.estimatedDuration && (
                        <span>ETA: {formatDuration(task.estimatedDuration)}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {selectedView === 'history' && (
          <div className="space-y-3">
            {taskHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500">No task history</p>
              </div>
            ) : (
              taskHistory.slice(0, 10).map((task) => {
                const typeConfig = taskTypeConfig[task.type]
                const statusConfig = taskStatusConfig[task.status]
                
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                        {typeConfig.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{typeConfig.label}</div>
                        <div className="text-sm text-gray-600">
                          {task.completedAt ? new Date(task.completedAt).toLocaleString() : 'In progress'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </div>
                      {task.actualDuration && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDuration(task.actualDuration)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskProgressMonitor