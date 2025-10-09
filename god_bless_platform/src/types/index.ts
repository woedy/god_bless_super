/**
 * Types Index
 * Central export point for all TypeScript type definitions
 */

// Core Models
export type {
  // User Types
  User,
  UserProfile,
  UserPreferences,
  
  // Project Types
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectSettings,
  
  // Phone Number Types
  PhoneNumber,
  PhoneLineType,
  PhoneNumberMetadata,
  
  // Task Types
  Task,
  TaskType,
  TaskStatus,
  TaskResult,
  TaskError,
  TaskParameters,
  TaskStatistics,
  
  // Campaign Types
  Campaign,
  CampaignStatus,
  CampaignSettings,
  CampaignDeliveryReport,
  CampaignProviderStats,
  
  // Dashboard Types
  DashboardMetrics,
  DashboardOverview,
  SystemHealth,
  HealthStatus,
  ComponentHealth,
  ResourceHealth,
  ActivityItem,
  ActivityType,
  TaskSummary,
  ProjectSummary,
  
  // Base Types
  ID,
  Timestamp,
  Email,
  PhoneNumberString
} from './models'

// API Types
export type {
  // Base API Types
  ApiResponse,
  ApiError,
  ResponseMeta,
  PaginatedResponse,
  PaginationParams,
  
  // Authentication Types
  LoginCredentials,
  RegisterData,
  AuthResponse,
  RefreshTokenRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  
  // Project API Types
  CreateProjectData,
  UpdateProjectData,
  ProjectFilters,
  
  // Phone Number API Types
  GenerateNumbersParams,
  ValidateNumbersParams,
  NumberFilters,
  ExportParams,
  ExportResponse,
  ImportNumbersParams,
  FieldMapping,
  
  // SMS Campaign API Types
  CreateCampaignData,
  CampaignRecipients,
  SendSMSParams,
  CampaignFilters,
  CampaignReportParams,
  
  // Task API Types
  TaskFilters,
  TaskActionRequest,
  
  // Dashboard API Types
  DashboardFilters,
  SystemHealthParams,
  
  // File Upload Types
  FileUploadResponse,
  FileValidationError,
  
  // Bulk Operations Types
  BulkOperationRequest,
  BulkOperationOptions,
  BulkOperationResponse,
  
  // Search Types
  SearchParams,
  SearchResult,
  SearchResponse,
  
  // Validation Types
  ValidationRule,
  ValidationError,
  FormValidationState
} from './api'

// WebSocket Types
export type {
  // Base WebSocket Types
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketConfig,
  WebSocketConnectionState,
  WebSocketStatus,
  WebSocketError,
  
  // Channel Types
  ChannelSubscription,
  ChannelFilters,
  ChannelName,
  
  // Message Types
  TaskProgressMessage,
  TaskProgressStatistics,
  TaskCompleteMessage,
  CampaignUpdateMessage,
  CampaignCompleteMessage,
  SystemNotificationMessage,
  SystemNotificationType,
  NotificationSeverity,
  DashboardUpdateMessage,
  DashboardUpdateType,
  DashboardUpdateData,
  MetricsUpdateData,
  HealthUpdateData,
  ActivityUpdateData,
  TaskSummaryUpdateData,
  ProjectSummaryUpdateData,
  UserNotificationMessage,
  UserNotificationType,
  ProjectUpdateMessage,
  ProjectUpdateType,
  ProjectUpdateData,
  ConnectionStatusMessage,
  
  // WebSocket Manager
  WebSocketEventHandlers,
  WebSocketManager
} from './websocket'

// UI Types
export type {
  // Base UI Types
  BaseComponentProps,
  
  // Layout Types
  LayoutProps,
  BreadcrumbItem,
  SidebarProps,
  NavigationItem,
  
  // Form Types
  FormFieldProps,
  InputProps,
  SelectProps,
  SelectOption,
  CheckboxProps,
  RadioProps,
  TextareaProps,
  
  // Button Types
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  
  // Modal Types
  ModalProps,
  ModalSize,
  
  // Table Types
  TableProps,
  TableColumn,
  PaginationConfig,
  SortingConfig,
  SelectionConfig,
  TableAction,
  
  // Card Types
  CardProps,
  
  // Notification Types
  NotificationProps,
  NotificationType,
  NotificationAction,
  
  // Loading Types
  LoadingProps,
  LoadingSize,
  
  // Chart Types
  ChartProps,
  ChartType,
  ChartData,
  ChartDataset,
  ChartOptions,
  ChartScale,
  
  // Filter Types
  FilterProps,
  FilterConfig,
  FilterType,
  
  // Search Types
  SearchProps,
  
  // Progress Types
  ProgressProps,
  ProgressSize,
  ProgressVariant,
  
  // Badge Types
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  
  // Theme Types
  ThemeConfig,
  
  // Responsive Types
  ResponsiveConfig,
  
  // Animation Types
  AnimationConfig,
  
  // Accessibility Types
  A11yProps
} from './ui'

// Rotation and Delivery Types
export type {
  RotationStrategy,
  RotationSettings,
  ServerHealth,
  CampaignTemplate,
  CampaignDeliverySettings,
  ServerUsageStats,
  CarrierPerformance,
  OptimizationRecommendation,
  PredictiveAnalytics,
  CampaignProgress
} from './rotation'

// Re-export constants from config for convenience
export { WS_CHANNELS } from './websocket'