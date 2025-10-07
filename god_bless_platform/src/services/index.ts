/**
 * Services Index
 * Central export point for all service modules
 */

// API Client
export { apiClient, ApiClientError, NetworkError } from './api'
export type { RequestConfig } from './api'

// Authentication Service
export { authService, AuthService } from './auth'

// Project Service
export { projectService, ProjectService, ProjectValidation } from './projects'

// Dashboard Service
export { dashboardService, DashboardService } from './dashboard'

// Phone Number Service
export { phoneNumberService, PhoneNumberService } from './phoneNumbers'

// WebSocket Service
export { websocketManager, WebSocketManager } from './websocket'

// Re-export for convenience
import { apiClient } from './api'
import { authService } from './auth'
import { projectService } from './projects'
import { dashboardService } from './dashboard'
import { phoneNumberService } from './phoneNumbers'
import { websocketManager } from './websocket'

export const api = {
  client: apiClient,
  auth: authService,
  projects: projectService,
  dashboard: dashboardService,
  phoneNumbers: phoneNumberService,
  websocket: websocketManager
}