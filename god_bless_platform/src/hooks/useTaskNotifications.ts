/**
 * Task Notifications Hook
 * Custom hook for handling task-related notifications and user feedback
 */

import { useCallback, useEffect, useRef } from 'react'
import { useWebSocketSubscription } from './useWebSocket'
import { WS_CHANNELS } from '../types/websocket'
import type {
  TaskCompleteMessage,
  SystemNotificationMessage,
  WebSocketMessage
} from '../types/websocket'
import type { TaskType } from '../types/models'

interface NotificationOptions {
  enableTaskComplete?: boolean
  enableTaskError?: boolean
  enableSystemNotifications?: boolean
  playSound?: boolean
  showBrowserNotifications?: boolean
  autoHideDelay?: number
}

interface TaskNotification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  taskId?: string
  taskType?: TaskType
  timestamp: string
  autoHide?: boolean
  duration?: number
  actionUrl?: string
  actionText?: string
}

type NotificationHandler = (notification: TaskNotification) => void

/**
 * Hook for managing task-related notifications
 */
export function useTaskNotifications(
  onNotification: NotificationHandler,
  options: NotificationOptions = {}
) {
  const {
    enableTaskComplete = true,
    enableTaskError = true,
    enableSystemNotifications = true,
    playSound = false,
    showBrowserNotifications = false,
    autoHideDelay = 5000
  } = options

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const notificationPermissionRef = useRef<NotificationPermission>('default')

  // Initialize browser notifications
  useEffect(() => {
    if (showBrowserNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          notificationPermissionRef.current = permission
        })
      } else {
        notificationPermissionRef.current = Notification.permission
      }
    }

    // Initialize audio for sound notifications
    if (playSound) {
      audioRef.current = new Audio('/notification-sound.mp3') // You'll need to add this file
      audioRef.current.volume = 0.5
    }
  }, [showBrowserNotifications, playSound])

  // Helper function to show browser notification
  const showBrowserNotification = useCallback((notification: TaskNotification) => {
    if (!showBrowserNotifications || !('Notification' in window) || 
        notificationPermissionRef.current !== 'granted') {
      return
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico', // You can customize this
      tag: notification.id,
      requireInteraction: notification.type === 'error'
    })

    // Auto-close after delay
    if (notification.autoHide) {
      setTimeout(() => {
        browserNotification.close()
      }, notification.duration || autoHideDelay)
    }

    // Handle click to focus window
    browserNotification.onclick = () => {
      window.focus()
      browserNotification.close()
      
      // Navigate to action URL if provided
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl
      }
    }
  }, [showBrowserNotifications, autoHideDelay])

  // Helper function to play notification sound
  const playNotificationSound = useCallback(() => {
    if (playSound && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.warn('Failed to play notification sound:', error)
      })
    }
  }, [playSound])

  // Helper function to get task type display name
  const getTaskTypeDisplayName = useCallback((taskType: TaskType): string => {
    const taskTypeNames: Record<TaskType, string> = {
      phone_generation: 'Phone Generation',
      phone_validation: 'Phone Validation',
      sms_campaign: 'SMS Campaign',
      export: 'Data Export',
      import: 'Data Import',
      bulk_validation: 'Bulk Validation',
      data_cleanup: 'Data Cleanup'
    }
    return taskTypeNames[taskType] || taskType
  }, [])

  // WebSocket subscription for task completion notifications
  useWebSocketSubscription<TaskCompleteMessage>(
    WS_CHANNELS.TASK_COMPLETE,
    useCallback((message: WebSocketMessage<TaskCompleteMessage>) => {
      if (!enableTaskComplete && message.data.status === 'completed') return
      if (!enableTaskError && message.data.status === 'failed') return

      const taskData = message.data
      const isSuccess = taskData.status === 'completed'
      const taskTypeName = getTaskTypeDisplayName(taskData.type)

      const notification: TaskNotification = {
        id: `task-${taskData.taskId}-${Date.now()}`,
        type: isSuccess ? 'success' : 'error',
        title: isSuccess 
          ? `${taskTypeName} Completed` 
          : `${taskTypeName} Failed`,
        message: isSuccess
          ? `Your ${taskTypeName.toLowerCase()} task has completed successfully.`
          : `Your ${taskTypeName.toLowerCase()} task failed: ${taskData.error || 'Unknown error'}`,
        taskId: taskData.taskId,
        taskType: taskData.type,
        timestamp: new Date().toISOString(),
        autoHide: isSuccess,
        duration: isSuccess ? autoHideDelay : undefined,
        actionUrl: `/tasks/${taskData.taskId}`,
        actionText: 'View Details'
      }

      // Show notification
      onNotification(notification)
      
      // Show browser notification
      showBrowserNotification(notification)
      
      // Play sound
      if (isSuccess || taskData.status === 'failed') {
        playNotificationSound()
      }
    }, [
      enableTaskComplete, 
      enableTaskError, 
      getTaskTypeDisplayName, 
      onNotification, 
      showBrowserNotification, 
      playNotificationSound, 
      autoHideDelay
    ]),
    {
      messageTypes: ['task_complete', 'task_error', 'task_cancelled']
    },
    [enableTaskComplete, enableTaskError]
  )

  // WebSocket subscription for system notifications
  useWebSocketSubscription<SystemNotificationMessage>(
    WS_CHANNELS.SYSTEM_NOTIFICATIONS,
    useCallback((message: WebSocketMessage<SystemNotificationMessage>) => {
      if (!enableSystemNotifications) return

      const systemData = message.data
      
      const notification: TaskNotification = {
        id: systemData.id,
        type: systemData.severity,
        title: systemData.title,
        message: systemData.message,
        timestamp: systemData.timestamp,
        autoHide: systemData.autoHide ?? systemData.severity !== 'error',
        duration: systemData.duration || autoHideDelay,
        actionUrl: systemData.actionUrl,
        actionText: systemData.actionText
      }

      // Show notification
      onNotification(notification)
      
      // Show browser notification for important system notifications
      if (systemData.severity === 'error' || systemData.severity === 'warning') {
        showBrowserNotification(notification)
        playNotificationSound()
      }
    }, [
      enableSystemNotifications, 
      onNotification, 
      showBrowserNotification, 
      playNotificationSound, 
      autoHideDelay
    ]),
    {
      messageTypes: ['system_notification']
    },
    [enableSystemNotifications]
  )

  // Helper function to create custom notification
  const createNotification = useCallback((
    type: TaskNotification['type'],
    title: string,
    message: string,
    options?: Partial<TaskNotification>
  ) => {
    const notification: TaskNotification = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      autoHide: type !== 'error',
      duration: autoHideDelay,
      ...options
    }

    onNotification(notification)
    
    if (type === 'error' || type === 'warning') {
      showBrowserNotification(notification)
      playNotificationSound()
    }
  }, [onNotification, showBrowserNotification, playNotificationSound, autoHideDelay])

  return {
    createNotification,
    // Convenience methods
    showSuccess: (title: string, message: string, options?: Partial<TaskNotification>) =>
      createNotification('success', title, message, options),
    showError: (title: string, message: string, options?: Partial<TaskNotification>) =>
      createNotification('error', title, message, options),
    showWarning: (title: string, message: string, options?: Partial<TaskNotification>) =>
      createNotification('warning', title, message, options),
    showInfo: (title: string, message: string, options?: Partial<TaskNotification>) =>
      createNotification('info', title, message, options)
  }
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences() {
  const getPreferences = useCallback((): NotificationOptions => {
    try {
      const stored = localStorage.getItem('notification-preferences')
      return stored ? JSON.parse(stored) : {
        enableTaskComplete: true,
        enableTaskError: true,
        enableSystemNotifications: true,
        playSound: false,
        showBrowserNotifications: false,
        autoHideDelay: 5000
      }
    } catch {
      return {
        enableTaskComplete: true,
        enableTaskError: true,
        enableSystemNotifications: true,
        playSound: false,
        showBrowserNotifications: false,
        autoHideDelay: 5000
      }
    }
  }, [])

  const setPreferences = useCallback((preferences: NotificationOptions) => {
    try {
      localStorage.setItem('notification-preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
    }
  }, [])

  const updatePreference = useCallback(<K extends keyof NotificationOptions>(
    key: K,
    value: NotificationOptions[K]
  ) => {
    const current = getPreferences()
    setPreferences({ ...current, [key]: value })
  }, [getPreferences, setPreferences])

  return {
    getPreferences,
    setPreferences,
    updatePreference
  }
}