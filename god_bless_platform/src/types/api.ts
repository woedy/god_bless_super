/**
 * API Types
 * TypeScript interfaces for API requests, responses, and related types
 */

import type { 
  User, 
  Project, 
  Task, 
  Campaign, 
  TaskType,
  ProjectStatus,
  ProjectPriority,
  CampaignStatus
} from './models'

// Base API Types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  errors?: ApiError[]
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  field?: string
  details?: Record<string, any>
}

export interface ResponseMeta {
  timestamp: string
  requestId: string
  version: string
}

export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next?: string
  previous?: string
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  ordering?: string
  search?: string
}

// Authentication Types
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  acceptTerms: boolean
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: User
  expiresAt: string
  permissions: string[]
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
  confirmPassword: string
}

// Project API Types
export interface CreateProjectData {
  name: string
  description: string
  priority: ProjectPriority
  settings?: Partial<Project['settings']>
  target_phone_count?: number
  target_sms_count?: number
  budget?: number
  start_date?: string
  due_date?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  settings?: Partial<Project['settings']>
  target_phone_count?: number
  target_sms_count?: number
  budget?: number
  start_date?: string
  due_date?: string
}

export interface ProjectFilters extends PaginationParams {
  status?: ProjectStatus
  priority?: ProjectPriority
  createdBy?: string
  createdAfter?: string
  createdBefore?: string
}

// Phone Number API Types
export interface GenerateNumbersParams {
  projectId: string
  quantity: number
  country: string
  carrier?: string
  lineType?: string
  autoValidate?: boolean
  prefix?: string
  excludePatterns?: string[]
}

export interface ValidateNumbersParams {
  projectId?: string
  numbers?: string[]
  phoneNumberIds?: string[]
  provider?: string
  batchSize?: number
}

export interface NumberFilters extends PaginationParams {
  projectId?: string
  isValid?: boolean
  carrier?: string
  country?: string
  lineType?: string
  validatedAfter?: string
  validatedBefore?: string
  source?: string
}

export interface ExportParams {
  projectId?: string
  format: 'csv' | 'txt' | 'json' | 'doc'
  filters?: Omit<NumberFilters, keyof PaginationParams>
  includeInvalid?: boolean
  includeMetadata?: boolean
  customFields?: string[]
}

export interface ExportResponse {
  taskId: string
  downloadUrl?: string
  estimatedSize: number
  estimatedDuration: number
}

export interface ImportNumbersParams {
  projectId: string
  file: File
  format: 'csv' | 'txt' | 'json'
  validateOnImport?: boolean
  skipDuplicates?: boolean
  mapping?: FieldMapping
}

export interface FieldMapping {
  phoneNumber: string
  carrier?: string
  country?: string
  notes?: string
}

// SMS Campaign API Types
export interface CreateCampaignData {
  name: string
  message: string
  projectId: string
  recipientSource: 'project_numbers' | 'uploaded_file' | 'manual_list'
  recipients?: CampaignRecipients
  settings?: Partial<Campaign['settings']>
  scheduleDelivery?: boolean
  deliveryTime?: string
}

export interface CampaignRecipients {
  phoneNumberIds?: string[]
  uploadedFile?: File
  manualNumbers?: string[]
  filters?: NumberFilters
}

export interface SendSMSParams {
  campaignId?: string
  recipients: string[]
  message: string
  projectId: string
  settings?: {
    sendRate?: number
    useProxyRotation?: boolean
    useSmtpRotation?: boolean
  }
}

export interface CampaignFilters extends PaginationParams {
  projectId?: string
  status?: CampaignStatus
  createdBy?: string
  createdAfter?: string
  createdBefore?: string
}

export interface CampaignReportParams {
  campaignId: string
  includeDetails?: boolean
  groupBy?: 'hour' | 'day' | 'provider' | 'status'
}

// Task API Types
export interface TaskFilters extends PaginationParams {
  type?: TaskType
  status?: Task['status']
  projectId?: string
  userId?: string
  createdAfter?: string
  createdBefore?: string
}

export interface TaskActionRequest {
  taskId: string
  action: 'cancel' | 'retry' | 'pause' | 'resume'
  reason?: string
}

// Dashboard API Types
export interface DashboardFilters {
  projectId?: string
  timeRange?: '1h' | '24h' | '7d' | '30d' | 'custom'
  startDate?: string
  endDate?: string
}

export interface SystemHealthParams {
  includeHistory?: boolean
  historyDuration?: '1h' | '24h' | '7d'
}

// File Upload Types
export interface FileUploadResponse {
  fileId: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: string
  processedRows?: number
  validRows?: number
  invalidRows?: number
  errors?: FileValidationError[]
}

export interface FileValidationError {
  row: number
  column?: string
  message: string
  value?: string
}

// Bulk Operations Types
export interface BulkOperationRequest<T = any> {
  operation: 'create' | 'update' | 'delete' | 'validate'
  items: T[]
  options?: BulkOperationOptions
}

export interface BulkOperationOptions {
  batchSize?: number
  continueOnError?: boolean
  validateFirst?: boolean
  dryRun?: boolean
}

export interface BulkOperationResponse {
  taskId: string
  totalItems: number
  estimatedDuration: number
  batchCount: number
}

// Search and Filter Types
export interface SearchParams {
  query: string
  type?: 'projects' | 'phone_numbers' | 'campaigns' | 'tasks' | 'all'
  projectId?: string
  limit?: number
}

export interface SearchResult {
  type: string
  id: string
  title: string
  description?: string
  url: string
  metadata?: Record<string, any>
}

export interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  searchTime: number
  suggestions?: string[]
}

// Validation Types
export interface ValidationRule {
  field: string
  rules: string[]
  message?: string
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface FormValidationState {
  isValid: boolean
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
}