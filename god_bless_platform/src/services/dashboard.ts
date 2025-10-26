/**
 * Dashboard API Service
 * Handles dashboard metrics, system health, and analytics API calls
 */

import { apiClient } from './api'
import type {
  ApiError,
  ApiResponse,
  DashboardFilters,
  ResponseMeta,
  SystemHealthParams
} from '../types/api'
import type {
  DashboardMetrics,
  SystemHealth,
  Task,
  ActivityItem
} from '../types/models'

/**
 * Dashboard Service Class
 */
class DashboardService {
  /**
   * Normalize API responses that wrap data inside an additional object
   *
   * Many of our Django endpoints return `{ success: boolean, data: T }` while
   * the `apiClient` already wraps the payload inside an `ApiResponse`. This
   * helper extracts the nested `data` field (and preserves any meta information)
   * so downstream consumers always receive the expected structure.
   */
  private normalizeApiResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    const rawData = response.data as any

    if (rawData && typeof rawData === 'object') {
      const hasNestedData = Object.prototype.hasOwnProperty.call(rawData, 'data')

      if (hasNestedData) {
        const nestedData = rawData.data as T
        const nestedSuccess = typeof rawData.success === 'boolean' ? rawData.success : response.success
        const nestedMessage = typeof rawData.message === 'string' ? rawData.message : response.message
        const nestedErrors = (rawData.errors ?? response.errors) as ApiError[] | undefined
        const nestedMeta = (rawData.meta ?? response.meta) as ResponseMeta | undefined

        return {
          success: nestedSuccess,
          data: nestedData,
          message: nestedMessage,
          errors: nestedErrors,
          meta: nestedMeta
        }
      }

      // Some endpoints use a `{ message, data }` shape without the success flag
      if (Object.prototype.hasOwnProperty.call(rawData, 'message')) {
        return {
          success: response.success,
          data: (rawData.data ?? rawData) as T,
          message: rawData.message,
          errors: response.errors,
          meta: response.meta
        }
      }

      if (Object.prototype.hasOwnProperty.call(rawData, 'results')) {
        return {
          success: response.success,
          data: rawData.results as T,
          message: response.message,
          errors: response.errors,
          meta: rawData.meta ?? response.meta
        }
      }
    }

    return response
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(filters?: DashboardFilters): Promise<ApiResponse<DashboardMetrics>> {
    try {
      console.log('Dashboard Service - Getting dashboard metrics with filters:', filters)
      
      const params: Record<string, unknown> = {}
      
      if (filters) {
        if (filters.projectId) params.project_id = filters.projectId
        if (filters.timeRange) params.time_range = filters.timeRange
        if (filters.startDate) params.start_date = filters.startDate
        if (filters.endDate) params.end_date = filters.endDate
      }
      
      const response = await apiClient.get<DashboardMetrics>('/dashboard/metrics/', params)
      const normalized = this.normalizeApiResponse<DashboardMetrics>(response)

      console.log('Dashboard Service - Dashboard metrics response:', normalized)
      return normalized
    } catch (error) {
      console.error('Dashboard Service - Error getting dashboard metrics:', error)
      throw error
    }
  }

  /**
   * Get system health information
   */
  async getSystemHealth(params?: SystemHealthParams): Promise<ApiResponse<SystemHealth>> {
    try {
      console.log('Dashboard Service - Getting system health with params:', params)
      
      const queryParams: Record<string, unknown> = {}
      
      if (params) {
        if (params.includeHistory) queryParams.include_history = params.includeHistory
        if (params.historyDuration) queryParams.history_duration = params.historyDuration
      }
      
      const response = await apiClient.get<SystemHealth>('/dashboard/health/', queryParams)
      const normalized = this.normalizeApiResponse<SystemHealth>(response)

      console.log('Dashboard Service - System health response:', normalized)
      return normalized
    } catch (error) {
      console.error('Dashboard Service - Error getting system health:', error)
      throw error
    }
  }

  /**
   * Get task history for dashboard
   */
  async getTaskHistory(filters?: {
    limit?: number
    projectId?: string
    timeRange?: string
    status?: string[]
  }): Promise<ApiResponse<Task[]>> {
    try {
      console.log('Dashboard Service - Getting task history with filters:', filters)
      
      const params: Record<string, unknown> = {}
      
      if (filters) {
        if (filters.limit) params.limit = filters.limit
        if (filters.projectId) params.project_id = filters.projectId
        if (filters.timeRange) params.time_range = filters.timeRange
        if (filters.status) params.status = filters.status.join(',')
      }
      
      const response = await apiClient.get<Task[]>('/dashboard/tasks/', params)
      const normalized = this.normalizeApiResponse<Task[]>(response)

      console.log('Dashboard Service - Task history response:', normalized)
      return normalized
    } catch (error) {
      console.error('Dashboard Service - Error getting task history:', error)
      throw error
    }
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(filters?: {
    limit?: number
    projectId?: string
    timeRange?: string
    types?: string[]
  }): Promise<ApiResponse<ActivityItem[]>> {
    try {
      console.log('Dashboard Service - Getting recent activity with filters:', filters)
      
      const params: Record<string, unknown> = {}
      
      if (filters) {
        if (filters.limit) params.limit = filters.limit
        if (filters.projectId) params.project_id = filters.projectId
        if (filters.timeRange) params.time_range = filters.timeRange
        if (filters.types) params.types = filters.types.join(',')
      }
      
      const response = await apiClient.get<ActivityItem[]>('/dashboard/activity/', params)
      const normalized = this.normalizeApiResponse<ActivityItem[]>(response)

      console.log('Dashboard Service - Recent activity response:', normalized)
      return normalized
    } catch (error) {
      console.error('Dashboard Service - Error getting recent activity:', error)
      throw error
    }
  }

  /**
   * Get dashboard overview statistics
   */
  async getDashboardOverview(projectId?: string): Promise<ApiResponse<{
    totalProjects: number
    activeProjects: number
    totalPhoneNumbers: number
    validPhoneNumbers: number
    totalCampaigns: number
    activeTasks: number
    completedTasks24h: number
    systemUptime: number
  }>> {
    try {
      console.log('Dashboard Service - Getting dashboard overview for project:', projectId)
      
      const params: Record<string, unknown> = {}
      if (projectId) params.project_id = projectId
      
      const response = await apiClient.get<{
        totalProjects: number
        activeProjects: number
        totalPhoneNumbers: number
        validPhoneNumbers: number
        totalCampaigns: number
        activeTasks: number
        completedTasks24h: number
        systemUptime: number
      }>('/dashboard/overview/', params)

      const normalized = this.normalizeApiResponse<{
        totalProjects: number
        activeProjects: number
        totalPhoneNumbers: number
        validPhoneNumbers: number
        totalCampaigns: number
        activeTasks: number
        completedTasks24h: number
        systemUptime: number
      }>(response)

      console.log('Dashboard Service - Dashboard overview response:', normalized)
      return normalized
    } catch (error) {
      console.error('Dashboard Service - Error getting dashboard overview:', error)
      throw error
    }
  }

  /**
   * Get real-time metrics (for WebSocket fallback)
   */
  async getRealTimeMetrics(projectId?: string): Promise<ApiResponse<{
    activeTasks: number
    completedTasksToday: number
    systemLoad: number
    memoryUsage: number
    lastUpdated: string
  }>> {
    try {
      console.log('Dashboard Service - Getting real-time metrics for project:', projectId)
      
      const params: Record<string, unknown> = {}
      if (projectId) params.project_id = projectId
      
      const response = await apiClient.get<{
        activeTasks: number
        completedTasksToday: number
        systemLoad: number
        memoryUsage: number
        lastUpdated: string
      }>('/dashboard/realtime/', params)

      const normalized = this.normalizeApiResponse<{
        activeTasks: number
        completedTasksToday: number
        systemLoad: number
        memoryUsage: number
        lastUpdated: string
      }>(response)

      console.log('Dashboard Service - Real-time metrics response:', normalized)
      return normalized
    } catch (error) {
      console.error('Dashboard Service - Error getting real-time metrics:', error)
      throw error
    }
  }

  /**
   * Refresh dashboard data (trigger backend cache refresh)
   */
  async refreshDashboard(projectId?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('Dashboard Service - Refreshing dashboard for project:', projectId)
      
      const data: Record<string, unknown> = {}
      if (projectId) data.project_id = projectId
      
      const response = await apiClient.post<{ message: string }>('/dashboard/refresh/', data)
      const normalized = this.normalizeApiResponse<{ message: string }>(response)

      console.log('Dashboard Service - Dashboard refresh response:', normalized)
      return normalized
    } catch (error) {
      console.error('Dashboard Service - Error refreshing dashboard:', error)
      throw error
    }
  }
}

// Create and export singleton instance
export const dashboardService = new DashboardService()

// Export the class for testing
export { DashboardService }