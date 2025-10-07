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

// Re-export for convenience
import { apiClient } from './api'
import { authService } from './auth'
import { projectService } from './projects'

export const api = {
  client: apiClient,
  auth: authService,
  projects: projectService
}