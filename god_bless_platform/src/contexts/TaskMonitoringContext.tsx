/**
 * Task Monitoring Context
 * Provides real-time task monitoring capabilities throughout the application
 */

import React, { createContext, useState, useCallback, useEffect } from 'react'
import { useTaskMonitoring, useTaskNotifications, useNotificationPreferences } from '../hooks'
import type { Task, TaskType, ID } from '../types/models'
// TaskNotification type definition (inline since it's not exported from the hook)
interface TaskNotification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  taskId?: string
  taskType?: import('../types/models').TaskType
  timestamp: string
  autoHide?: boolean
  duration?: number
  actionUrl?: string
  actionText?: string
}

interface TaskMonitoringContextValue {
  // Task data
  tasks: Task[]
  activeTasks: Task[]
  completedTasks: Task[]
  failedTasks: Task[]
  
  // Loading states
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
  
  // Statistics
  totalTasks: number
  activeTaskCount: number
  completedTaskCount: number
  failedTaskCount: number
  successRate: number
  
  // Task operations
  getTask: (taskId: ID) => Task | undefined
  getTasksByType: (type: TaskType) => Task[]
  retryTask: (taskId: ID) => Promise<void>
  cancelTask: (taskId: ID) => Promise<void>
  refreshTasks: () => void
  
  // Notifications
  notifications: TaskNotification[]
  addNotification: (notification: TaskNotification) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Notification preferences
  notificationPreferences: ReturnType<typeof useNotificationPreferences>['getPreferences']
  updateNotificationPreference: ReturnType<typeof useNotificationPreferences>['updatePreference']
}

const TaskMonitoringContext = createContext<TaskMonitoringContextValue | null>(null)

interface TaskMonitoringProviderProps {
  children: React.ReactNode
  projectId?: ID
  userId?: ID
  taskTypes?: TaskType[]
  maxNotifications?: number
}

/**
 * Task Monitoring Provider Component
 */
export function TaskMonitoringProvider({
  children,
  projectId,
  userId,
  taskTypes,
  maxNotifications = 50
}: TaskMonitoringProviderProps) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([])
  
  // Task monitoring hook
  const taskMonitoring = useTaskMonitoring({
    projectId,
    userId,
    taskTypes,
    enablePolling: true,
    pollingInterval: 30000
  })

  // Notification preferences
  const notificationPrefs = useNotificationPreferences()
  const preferences = notificationPrefs.getPreferences()

  // Notification handler
  const handleNotification = useCallback((notification: TaskNotification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, maxNotifications)
      return newNotifications
    })
  }, [maxNotifications])

  // Task notifications hook
  useTaskNotifications(handleNotification, preferences)

  // Notification management functions
  const addNotification = useCallback((notification: TaskNotification) => {
    handleNotification(notification)
  }, [handleNotification])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Auto-remove notifications after their duration
  useEffect(() => {
    const timeouts: number[] = []

    notifications.forEach(notification => {
      if (notification.autoHide && notification.duration) {
        const timeout = window.setTimeout(() => {
          removeNotification(notification.id)
        }, notification.duration)
        timeouts.push(timeout)
      }
    })

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [notifications, removeNotification])

  const contextValue: TaskMonitoringContextValue = {
    // Task data
    tasks: taskMonitoring.tasks,
    activeTasks: taskMonitoring.activeTasks,
    completedTasks: taskMonitoring.completedTasks,
    failedTasks: taskMonitoring.failedTasks,
    
    // Loading states
    isLoading: taskMonitoring.isLoading,
    error: taskMonitoring.error,
    lastUpdated: taskMonitoring.lastUpdated,
    
    // Statistics
    totalTasks: taskMonitoring.totalTasks,
    activeTaskCount: taskMonitoring.activeTaskCount,
    completedTaskCount: taskMonitoring.completedTaskCount,
    failedTaskCount: taskMonitoring.failedTaskCount,
    successRate: taskMonitoring.successRate,
    
    // Task operations
    getTask: taskMonitoring.getTask,
    getTasksByType: taskMonitoring.getTasksByType,
    retryTask: taskMonitoring.retryTask,
    cancelTask: taskMonitoring.cancelTask,
    refreshTasks: taskMonitoring.refreshTasks,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    
    // Notification preferences
    notificationPreferences: () => preferences,
    updateNotificationPreference: notificationPrefs.updatePreference
  }

  return (
    <TaskMonitoringContext.Provider value={contextValue}>
      {children}
    </TaskMonitoringContext.Provider>
  )
}

// Export context for use in hooks
export { TaskMonitoringContext }