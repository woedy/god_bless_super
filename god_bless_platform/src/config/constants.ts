/**
 * Application Constants
 * Static values used throughout the application
 */

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/accounts/login-user/',
    REGISTER: '/accounts/register-user/',
    LOGOUT: '/accounts/logout/', // This endpoint doesn't exist in backend
    REFRESH: '/accounts/refresh/', // This endpoint doesn't exist in backend
    USER: '/accounts/get-user-details/',
    FORGOT_PASSWORD: '/accounts/forgot-user-password/',
    RESET_PASSWORD: '/accounts/new-password-reset/',
    EDIT_PROFILE: '/accounts/edit-profile/'
  },
  
  // Projects
  PROJECTS: {
    LIST: '/projects/get-all-projects/',
    CREATE: '/projects/add-new-project/',
    DETAIL: '/projects/project',
    UPDATE: '/projects/edit-project/',
    DELETE: '/projects/delete-project/',
    ARCHIVE: '/projects/archive-project/',
    UNARCHIVE: '/projects/unarchive-project/',
    ARCHIVED_LIST: '/projects/get-all-archived-project/',
    ANALYTICS: '/projects/project',
    TASKS: '/projects/project',
    NOTES: '/projects/project',
    ADD_TASK: '/projects/add-task/',
    UPDATE_TASK: '/projects/update-task/',
    DELETE_TASK: '/projects/delete-task/',
    ADD_NOTE: '/projects/add-note/',
    ADD_COLLABORATOR: '/projects/add-collaborator/',
    REMOVE_COLLABORATOR: '/projects/remove-collaborator/'
  },
  
  // Phone Numbers
  PHONE_NUMBERS: {
    LIST: '/phone-generator/list-numbers/',
    GENERATE: '/phone-generator/generate-numbers-enhanced/',
    VALIDATE: '/phone-validator/start-validation-free/',
    EXPORT: '/phone-generator/export/',
    IMPORT: '/phone-generator/import/',
    DELETE_ALL: '/phone-generator/delete-all/',
    DELETE_FILTERED: '/phone-generator/delete-filtered/',
    STATISTICS: '/phone-generator/statistics/',
    COUNTRIES: '/phone-generator/countries/', // Mock endpoint
    CARRIERS: '/phone-generator/carriers/', // Mock endpoint
    SINGLE_VALIDATE: '/phone-validator/validate-number-id-free/'
  },
  
  // SMS Campaigns
  SMS: {
    CAMPAIGNS: '/sms/campaigns/',
    CREATE_CAMPAIGN: '/sms/campaigns/',
    SEND_SMS: '/sms/send/',
    CAMPAIGN_REPORT: (id: string) => `/sms/campaigns/${id}/report/`,
    UPLOAD_NUMBERS: '/sms/upload-numbers/'
  },
  
  // Dashboard
  DASHBOARD: {
    METRICS: '/dashboard/metrics/',
    SYSTEM_HEALTH: '/dashboard/system-health/',
    TASK_HISTORY: '/dashboard/task-history/'
  },
  
  // Tasks
  TASKS: {
    LIST: '/tasks/',
    DETAIL: (id: string) => `/tasks/${id}/`,
    CANCEL: (id: string) => `/tasks/${id}/cancel/`,
    RETRY: (id: string) => `/tasks/${id}/retry/`
  }
} as const

// WebSocket Channels
export const WS_CHANNELS = {
  TASK_PROGRESS: 'task_progress',
  TASK_COMPLETE: 'task_complete',
  TASK_ERROR: 'task_error',
  SYSTEM_NOTIFICATIONS: 'system_notifications',
  DASHBOARD_UPDATES: 'dashboard_updates'
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'god_bless_auth_token',
  USER_DATA: 'god_bless_user_data',
  THEME: 'god_bless_theme',
  SIDEBAR_COLLAPSED: 'god_bless_sidebar_collapsed',
  SELECTED_PROJECT: 'god_bless_selected_project'
} as const

// Application Limits
export const LIMITS = {
  MAX_PHONE_NUMBERS_PER_REQUEST: 1000000,
  MAX_FILE_SIZE_MB: 50,
  MAX_SMS_MESSAGE_LENGTH: 160,
  MAX_CAMPAIGN_RECIPIENTS: 100000,
  PAGINATION_DEFAULT_SIZE: 25,
  PAGINATION_MAX_SIZE: 100
} as const

// File Types
export const SUPPORTED_FILE_TYPES = {
  PHONE_NUMBERS: ['.csv', '.txt', '.json'],
  EXPORT_FORMATS: ['csv', 'txt', 'json', 'doc']
} as const

// Task Types
export const TASK_TYPES = {
  PHONE_GENERATION: 'phone_generation',
  PHONE_VALIDATION: 'phone_validation',
  SMS_CAMPAIGN: 'sms_campaign',
  EXPORT: 'export',
  IMPORT: 'import'
} as const

// Task Status
export const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const

// Project Status
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
} as const

// Project Priority
export const PROJECT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const

// Campaign Status
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SENDING: 'sending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const

// System Health Status
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical'
} as const

// UI Constants
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 80,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  DESKTOP_BREAKPOINT: 1280
} as const

// Timeouts and Intervals
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  WEBSOCKET_RECONNECT: 5000, // 5 seconds
  TOAST_DURATION: 5000, // 5 seconds
  DEBOUNCE_SEARCH: 300, // 300ms
  POLLING_INTERVAL: 10000 // 10 seconds
} as const