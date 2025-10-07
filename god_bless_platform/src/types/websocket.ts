/**
 * WebSocket Types
 * TypeScript interfaces for WebSocket messages and real-time communication
 */

import type { Task, Campaign, SystemHealth, ActivityItem } from './models'

// Base WebSocket Types
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType
  channel: string
  data: T
  timestamp: string
  messageId: string
  userId?: string
  projectId?: string
}

export type WebSocketMessageType = 
  | 'task_progress'
  | 'task_complete'
  | 'task_error'
  | 'task_cancelled'
  | 'campaign_update'
  | 'campaign_complete'
  | 'system_notification'
  | 'dashboard_update'
  | 'user_notification'
  | 'project_update'
  | 'health_update'
  | 'connection_status'
  | 'error'
  | 'ping'
  | 'pong'

// WebSocket Connection Types
export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  timeout?: number
}

export interface WebSocketConnectionState {
  status: WebSocketStatus
  isConnected: boolean
  reconnectAttempts: number
  lastConnected?: string
  lastDisconnected?: string
  error?: WebSocketError
}

export type WebSocketStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'reconnecting'
  | 'error'

export interface WebSocketError {
  code: number
  reason: string
  wasClean: boolean
  timestamp: string
}

// Channel Subscription Types
export interface ChannelSubscription {
  channel: string
  callback: (message: WebSocketMessage) => void
  filters?: ChannelFilters
}

export interface ChannelFilters {
  userId?: string
  projectId?: string
  taskType?: string
  messageTypes?: WebSocketMessageType[]
}

// Task Progress Messages
export interface TaskProgressMessage {
  taskId: string
  type: Task['type']
  status: Task['status']
  progress: number
  progressMessage?: string
  estimatedTimeRemaining?: number
  currentStep?: string
  totalSteps?: number
  statistics?: TaskProgressStatistics
}

export interface TaskProgressStatistics {
  itemsProcessed: number
  itemsTotal: number
  itemsPerSecond: number
  successCount: number
  errorCount: number
  warningCount: number
}

export interface TaskCompleteMessage {
  taskId: string
  type: Task['type']
  status: 'completed' | 'failed' | 'cancelled'
  result?: Task['result']
  error?: Task['error']
  duration: number
  finalStatistics: TaskProgressStatistics
}

// Campaign Messages
export interface CampaignUpdateMessage {
  campaignId: string
  status: Campaign['status']
  sentCount: number
  deliveredCount: number
  failedCount: number
  pendingCount: number
  currentRate: number
  estimatedCompletion?: string
  lastActivity: string
}

export interface CampaignCompleteMessage {
  campaignId: string
  status: 'completed' | 'failed' | 'cancelled'
  finalStats: {
    totalSent: number
    totalDelivered: number
    totalFailed: number
    deliveryRate: number
    duration: number
    cost?: number
  }
  deliveryReport?: Campaign['deliveryReport']
}

// System Notifications
export interface SystemNotificationMessage {
  id: string
  type: SystemNotificationType
  severity: NotificationSeverity
  title: string
  message: string
  timestamp: string
  userId?: string
  projectId?: string
  actionUrl?: string
  actionText?: string
  autoHide?: boolean
  duration?: number
}

export type SystemNotificationType = 
  | 'task_complete'
  | 'task_error'
  | 'campaign_complete'
  | 'system_alert'
  | 'maintenance'
  | 'quota_warning'
  | 'quota_exceeded'
  | 'security_alert'
  | 'feature_announcement'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

// Dashboard Updates
export interface DashboardUpdateMessage {
  type: DashboardUpdateType
  data: DashboardUpdateData
  affectedProjects?: string[]
}

export type DashboardUpdateType = 
  | 'metrics_update'
  | 'health_update'
  | 'activity_update'
  | 'task_summary_update'
  | 'project_summary_update'

export type DashboardUpdateData = 
  | MetricsUpdateData
  | HealthUpdateData
  | ActivityUpdateData
  | TaskSummaryUpdateData
  | ProjectSummaryUpdateData

export interface MetricsUpdateData {
  totalProjects?: number
  activeProjects?: number
  totalPhoneNumbers?: number
  validPhoneNumbers?: number
  totalCampaigns?: number
  activeTasks?: number
  completedTasks24h?: number
}

export interface HealthUpdateData {
  component: string
  status: SystemHealth['overall']
  message: string
  metrics?: Record<string, number>
}

export interface ActivityUpdateData {
  activities: ActivityItem[]
  totalCount: number
}

export interface TaskSummaryUpdateData {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  successRate: number
}

export interface ProjectSummaryUpdateData {
  projectId: string
  phoneNumberCount: number
  validNumberCount: number
  campaignCount: number
  activeCampaignCount: number
}

// User Notifications
export interface UserNotificationMessage {
  id: string
  userId: string
  type: UserNotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionText?: string
  metadata?: Record<string, any>
}

export type UserNotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'campaign_completed'
  | 'project_shared'
  | 'quota_warning'
  | 'account_update'
  | 'security_alert'

// Project Updates
export interface ProjectUpdateMessage {
  projectId: string
  type: ProjectUpdateType
  data: ProjectUpdateData
  userId: string
}

export type ProjectUpdateType = 
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'project_shared'
  | 'numbers_added'
  | 'numbers_validated'
  | 'campaign_created'

export interface ProjectUpdateData {
  name?: string
  status?: string
  phoneNumberCount?: number
  validNumberCount?: number
  campaignCount?: number
  lastActivity?: string
}

// Connection Status
export interface ConnectionStatusMessage {
  status: WebSocketStatus
  connectedUsers: number
  serverTime: string
  version: string
  maintenance?: {
    scheduled: boolean
    startTime?: string
    duration?: number
    message?: string
  }
}

// WebSocket Event Handlers
export interface WebSocketEventHandlers {
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  onMessage?: (message: WebSocketMessage) => void
  onReconnect?: (attempt: number) => void
  onReconnectFailed?: () => void
}

// WebSocket Manager Interface
export interface WebSocketManager {
  connect(): Promise<void>
  disconnect(): void
  subscribe(channel: string, callback: (message: WebSocketMessage) => void, filters?: ChannelFilters): () => void
  unsubscribe(channel: string): void
  send(message: Partial<WebSocketMessage>): void
  getConnectionState(): WebSocketConnectionState
  isConnected(): boolean
}

// Channel Names
export const WS_CHANNELS = {
  TASK_PROGRESS: 'task_progress',
  TASK_COMPLETE: 'task_complete',
  CAMPAIGN_UPDATES: 'campaign_updates',
  SYSTEM_NOTIFICATIONS: 'system_notifications',
  DASHBOARD_UPDATES: 'dashboard_updates',
  USER_NOTIFICATIONS: 'user_notifications',
  PROJECT_UPDATES: 'project_updates',
  HEALTH_UPDATES: 'health_updates'
} as const

export type ChannelName = typeof WS_CHANNELS[keyof typeof WS_CHANNELS]