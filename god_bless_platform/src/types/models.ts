/**
 * Core Data Models
 * TypeScript interfaces for all data models used in the application
 */

// Base types
export type ID = string
export type Timestamp = string
export type Email = string
export type PhoneNumberString = string

// User and Authentication Types
export interface User {
  id: ID
  email: Email
  firstName: string
  lastName: string
  isActive: boolean
  isStaff: boolean
  isSuperuser: boolean
  dateJoined: Timestamp
  lastLogin?: Timestamp
  profile?: UserProfile
}

export interface UserProfile {
  id: ID
  userId: ID
  avatar?: string
  timezone: string
  language: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    taskComplete: boolean
    taskError: boolean
    systemAlerts: boolean
  }
  dashboard: {
    defaultView: 'grid' | 'list'
    autoRefresh: boolean
    refreshInterval: number
  }
}

// Project Types
export interface Project {
  id: ID
  user: ID
  project_name: string
  name?: string // For compatibility
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  
  // Project settings
  target_phone_count: number
  target_sms_count: number
  budget?: number
  
  // Collaboration
  collaborators?: User[]
  collaborators_count?: number
  
  // Dates
  start_date?: string
  due_date?: string
  completed_date?: string
  
  is_archived: boolean
  active: boolean
  
  created_at: Timestamp
  updated_at: Timestamp
  
  // Statistics (computed properties from backend)
  task_stats?: {
    total: number
    completed: number
    in_progress: number
    pending: number
    completion_rate: number
  }
  phone_stats?: {
    total: number
    valid: number
    invalid: number
  }
  sms_stats?: {
    total: number
    sent: number
    pending: number
    failed: number
  }
  
  // Additional data
  user_details?: User
  tasks?: ProjectTask[]
  recent_activities?: ProjectActivity[]
  
  // Legacy compatibility
  phoneNumberCount?: number
  validNumberCount?: number
  invalidNumberCount?: number
  campaignCount?: number
  activeCampaignCount?: number
  settings?: ProjectSettings
  createdBy?: ID
  createdAt?: Timestamp
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'inactive' | 'archived'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ProjectSettings {
  autoValidation: boolean
  validationProvider: string
  smsProvider: string
  defaultCountry: string
  allowDuplicates: boolean
  maxPhoneNumbers: number
}

// Project Task Types
export interface ProjectTask {
  id: ID
  project: ID
  title: string
  description?: string
  status: ProjectTaskStatus
  priority: ProjectPriority
  assigned_to?: ID
  created_by: ID
  due_date?: string
  completed_date?: Timestamp
  created_at: Timestamp
  updated_at: Timestamp
  
  // Additional details from serializer
  assigned_to_details?: User
  created_by_details?: User
}

export type ProjectTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

// Project Note Types
export interface ProjectNote {
  id: ID
  project: ID
  user: ID
  content: string
  created_at: Timestamp
  updated_at: Timestamp
  
  // Additional details from serializer
  user_details?: User
}

// Project Activity Types
export interface ProjectActivity {
  id: ID
  project: ID
  user: ID
  activity_type: ProjectActivityType
  description: string
  metadata?: Record<string, any>
  created_at: Timestamp
  
  // Additional details from serializer
  user_details?: User
}

export type ProjectActivityType = 
  | 'created'
  | 'updated'
  | 'task_added'
  | 'task_completed'
  | 'note_added'
  | 'status_changed'
  | 'collaborator_added'

// Phone Number Types
export interface PhoneNumber {
  id: ID
  number: PhoneNumberString
  formattedNumber: string
  carrier?: string
  lineType?: PhoneLineType
  isValid: boolean
  validatedAt?: Timestamp
  validationError?: string
  country: string
  countryCode: string
  region?: string
  timezone?: string
  projectId: ID
  createdAt: Timestamp
  updatedAt: Timestamp
  
  // Additional metadata
  metadata: PhoneNumberMetadata
}

export type PhoneLineType = 'mobile' | 'landline' | 'voip' | 'toll_free' | 'premium' | 'unknown'

export interface PhoneNumberMetadata {
  source: 'generated' | 'imported' | 'manual'
  generationBatch?: string
  importBatch?: string
  tags: string[]
  notes?: string
  lastUsed?: Timestamp
  usageCount: number
}

// Task Types
export interface Task {
  id: ID
  type: TaskType
  status: TaskStatus
  progress: number
  progressMessage?: string
  result?: TaskResult
  error?: TaskError
  createdAt: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
  estimatedDuration?: number
  actualDuration?: number
  
  // Task context
  projectId?: ID
  userId: ID
  parameters: TaskParameters
  
  // Retry information
  retryCount: number
  maxRetries: number
  canRetry: boolean
}

export type TaskType = 
  | 'phone_generation' 
  | 'phone_validation' 
  | 'sms_campaign' 
  | 'export' 
  | 'import'
  | 'bulk_validation'
  | 'data_cleanup'

export type TaskStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled'
  | 'retrying'

export interface TaskResult {
  success: boolean
  message: string
  data?: any
  statistics?: TaskStatistics
  downloadUrl?: string
  warnings?: string[]
}

export interface TaskError {
  code: string
  message: string
  details?: Record<string, any>
  stackTrace?: string
  retryable: boolean
}

export interface TaskParameters {
  [key: string]: any
}

export interface TaskStatistics {
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  skippedItems: number
  duration: number
}

// SMS Campaign Types
export interface Campaign {
  id: ID
  name: string
  message: string
  status: CampaignStatus
  
  // Recipients
  recipientCount: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  pendingCount: number
  
  // Timing
  createdAt: Timestamp
  scheduledAt?: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
  
  // Configuration
  projectId: ID
  createdBy: ID
  settings: CampaignSettings
  
  // Results
  deliveryReport?: CampaignDeliveryReport
}

export type CampaignStatus = 
  | 'draft' 
  | 'scheduled'
  | 'sending' 
  | 'completed' 
  | 'failed'
  | 'cancelled'
  | 'paused'

export interface CampaignSettings {
  sendRate: number // messages per minute
  retryFailedMessages: boolean
  maxRetries: number
  useProxyRotation: boolean
  useSmtpRotation: boolean
  scheduleDelivery: boolean
  deliveryTime?: Timestamp
  timezone: string
}

export interface CampaignDeliveryReport {
  totalSent: number
  totalDelivered: number
  totalFailed: number
  deliveryRate: number
  averageDeliveryTime: number
  failureReasons: Record<string, number>
  deliveryByHour: Record<string, number>
  providerStats: Record<string, CampaignProviderStats>
}

export interface CampaignProviderStats {
  sent: number
  delivered: number
  failed: number
  cost: number
  averageDeliveryTime: number
}

// Dashboard and Analytics Types
export interface DashboardMetrics {
  overview: DashboardOverview
  systemHealth: SystemHealth
  recentActivity: ActivityItem[]
  taskSummary: TaskSummary
  projectSummary: ProjectSummary
}

export interface DashboardOverview {
  totalProjects: number
  activeProjects: number
  totalPhoneNumbers: number
  validPhoneNumbers: number
  totalCampaigns: number
  activeTasks: number
  completedTasks24h: number
  systemUptime: number
}

export interface SystemHealth {
  overall: HealthStatus
  components: {
    database: ComponentHealth
    redis: ComponentHealth
    celery: ComponentHealth
    websocket: ComponentHealth
    api: ComponentHealth
  }
  resources: {
    cpu: ResourceHealth
    memory: ResourceHealth
    disk: ResourceHealth
    network: ResourceHealth
  }
}

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface ComponentHealth {
  status: HealthStatus
  message: string
  lastCheck: Timestamp
  responseTime?: number
}

export interface ResourceHealth {
  status: HealthStatus
  usage: number
  available: number
  threshold: {
    warning: number
    critical: number
  }
}

export interface ActivityItem {
  id: ID
  type: ActivityType
  message: string
  timestamp: Timestamp
  userId?: ID
  projectId?: ID
  taskId?: ID
  metadata?: Record<string, any>
}

export type ActivityType = 
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'phone_numbers_generated'
  | 'phone_numbers_validated'
  | 'campaign_created'
  | 'campaign_sent'
  | 'task_completed'
  | 'task_failed'
  | 'user_login'
  | 'system_alert'

export interface TaskSummary {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  byType: Record<TaskType, number>
  averageDuration: number
  successRate: number
}

export interface ProjectSummary {
  total: number
  active: number
  inactive: number
  archived: number
  totalPhoneNumbers: number
  totalCampaigns: number
  mostActiveProject?: Project
}