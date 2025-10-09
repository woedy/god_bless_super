/**
 * Route Configuration
 * Centralized route definitions and configuration
 */

export interface RouteConfig {
  path: string
  protected: boolean
  title?: string
  description?: string
  breadcrumbLabel?: string
  permissions?: string[]
}

/**
 * Route paths constants
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Protected routes
  DASHBOARD: '/dashboard',
  
  // Projects
  PROJECTS: '/projects',
  PROJECT_CREATE: '/projects/create',
  PROJECT_EDIT: '/projects/:id/edit',
  PROJECT_VIEW: '/projects/:id',
  
  // Phone Numbers
  PHONE_NUMBERS: '/phone-numbers',
  PHONE_GENERATE: '/phone-numbers/generate',
  PHONE_VALIDATE: '/phone-numbers/validate',
  PHONE_LIST: '/phone-numbers/list',
  PHONE_IMPORT: '/phone-numbers/import',
  PHONE_EXPORT: '/phone-numbers/export',
  
  // SMS Campaigns
  SMS: '/sms',
  SMS_CAMPAIGNS: '/sms/campaigns',
  SMS_CREATE: '/sms/create',
  SMS_BULK: '/sms/bulk',
  SMS_OPTIMIZATION: '/sms/optimization',
  SMS_TEMPLATES: '/sms/templates',
  SMS_CAMPAIGN_VIEW: '/sms/campaigns/:campaignId',
  SMS_CAMPAIGN_EDIT: '/sms/campaigns/:campaignId/edit',
  SMS_EDIT: '/sms/:id/edit',
  SMS_VIEW: '/sms/:id',
  SMS_REPORT: '/sms/:id/report',
  
  // Tasks
  TASKS: '/tasks',
  TASK_VIEW: '/tasks/:id',
  TASK_HISTORY: '/tasks/history',
  TASK_ACTIVE: '/tasks/active',
  
  // Settings
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const

/**
 * Route metadata for breadcrumbs and navigation
 */
export const ROUTE_METADATA: Record<string, { label: string }> = {
  [ROUTES.DASHBOARD]: { label: 'Dashboard' },
  [ROUTES.PROJECTS]: { label: 'Projects' },
  [ROUTES.PHONE_NUMBERS]: { label: 'Phone Numbers' },
  [ROUTES.SMS]: { label: 'SMS Campaigns' },
  [ROUTES.SMS_CAMPAIGNS]: { label: 'SMS Campaigns' },
  [ROUTES.SMS_CREATE]: { label: 'Create Campaign' },
  [ROUTES.SMS_BULK]: { label: 'Send Bulk SMS' },
  [ROUTES.SMS_OPTIMIZATION]: { label: 'SMS Optimization' },
  [ROUTES.SMS_TEMPLATES]: { label: 'Campaign Templates' },
  [ROUTES.TASKS]: { label: 'Tasks' },
  'generate': { label: 'Generate' },
  'validate': { label: 'Validate' },
  'manage': { label: 'Manage' },
  'import': { label: 'Import' },
  'export': { label: 'Export' },
  'campaigns': { label: 'Campaigns' },
  'create': { label: 'Create' },
  'edit': { label: 'Edit' },
  'view': { label: 'View' },
  'report': { label: 'Report' },
  'history': { label: 'History' },
  'active': { label: 'Active Tasks' },
  'settings': { label: 'Settings' },
  'profile': { label: 'Profile' },
}

/**
 * Check if a route requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  const publicRoutes = [
    ROUTES.HOME,
    ROUTES.LOGIN,
    ROUTES.REGISTER,
    ROUTES.FORGOT_PASSWORD,
    ROUTES.RESET_PASSWORD,
  ]
  
  return !publicRoutes.includes(path as any)
}

/**
 * Get route metadata for breadcrumb generation
 */
export function getRouteMetadata(path: string): { label: string } {
  return ROUTE_METADATA[path] || { label: path }
}