/**
 * Hooks Index
 * Central export point for all custom hooks
 */

export { useProjects } from './useProjects'
export type { default as UseProjectsReturn } from './useProjects'

// WebSocket hooks
export { 
  useWebSocket, 
  useWebSocketSubscription, 
  useWebSocketSubscriptions 
} from './useWebSocket'

// Task monitoring hooks
export { 
  useTaskMonitoring, 
  useTaskProgress 
} from './useTaskMonitoring'

// Task notification hooks
export { 
  useTaskNotifications, 
  useNotificationPreferences 
} from './useTaskNotifications'

// Task monitoring context hooks
export { 
  useTaskMonitoringContext, 
  useOptionalTaskMonitoringContext 
} from './useTaskMonitoringContext'

// Notification and feedback hooks
export { useNotifications } from './useNotifications'
export { useLoadingState, useSimpleLoading } from './useLoadingState'

// Responsive design hooks
export { useResponsive, useMediaQuery, responsiveUtils } from './useResponsive'