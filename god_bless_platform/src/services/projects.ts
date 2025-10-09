/**
 * Project API Service
 * Handles all project-related API operations including CRUD operations,
 * filtering, search, and validation
 */

import { apiClient } from './api'
import { API_ENDPOINTS } from '../config/constants'
import type {
  ApiResponse,
  PaginatedResponse,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilters,
  ValidationError
} from '../types/api'
import type { Project, ProjectStatus, ProjectPriority } from '../types/models'

// Backend-specific response format
interface BackendPagination {
  page_number: number
  total_pages: number
  total_count: number
  next: number | null
  previous: number | null
}

interface BackendProjectListData {
  projects?: Project[]
  pagination?: BackendPagination
}

interface BackendProjectResponse {
  message: string
  data: BackendProjectListData | Project | Record<string, unknown>
  errors?: Record<string, string[]>
}

interface BackendResponseWrapper {
  message: string
  data: BackendProjectListData
  // Also support already transformed responses
  results?: Project[]
  page?: number
  totalPages?: number
  count?: number
  next?: string
  previous?: string
}

/**
 * Project validation helpers
 */
export class ProjectValidation {
  /**
   * Validate project name
   */
  static validateName(name: string): ValidationError[] {
    const errors: ValidationError[] = []
    
    if (!name || name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Project name is required',
        code: 'REQUIRED'
      })
    } else if (name.trim().length < 2) {
      errors.push({
        field: 'name',
        message: 'Project name must be at least 2 characters long',
        code: 'MIN_LENGTH'
      })
    } else if (name.trim().length > 100) {
      errors.push({
        field: 'name',
        message: 'Project name cannot exceed 100 characters',
        code: 'MAX_LENGTH'
      })
    }
    
    return errors
  }

  /**
   * Validate project description
   */
  static validateDescription(description: string): ValidationError[] {
    const errors: ValidationError[] = []
    
    if (description && description.length > 500) {
      errors.push({
        field: 'description',
        message: 'Project description cannot exceed 500 characters',
        code: 'MAX_LENGTH'
      })
    }
    
    return errors
  }

  /**
   * Validate project priority
   */
  static validatePriority(priority: ProjectPriority): ValidationError[] {
    const errors: ValidationError[] = []
    const validPriorities: ProjectPriority[] = ['low', 'medium', 'high']
    
    if (!validPriorities.includes(priority)) {
      errors.push({
        field: 'priority',
        message: 'Invalid project priority. Must be low, medium, or high',
        code: 'INVALID_VALUE'
      })
    }
    
    return errors
  }

  /**
   * Validate project status
   */
  static validateStatus(status: ProjectStatus): ValidationError[] {
    const errors: ValidationError[] = []
    const validStatuses: ProjectStatus[] = ['active', 'inactive', 'archived']
    
    if (!validStatuses.includes(status)) {
      errors.push({
        field: 'status',
        message: 'Invalid project status. Must be active, inactive, or archived',
        code: 'INVALID_VALUE'
      })
    }
    
    return errors
  }

  /**
   * Validate create project data
   */
  static validateCreateData(data: CreateProjectData): ValidationError[] {
    const errors: ValidationError[] = []
    
    errors.push(...this.validateName(data.name))
    errors.push(...this.validateDescription(data.description))
    errors.push(...this.validatePriority(data.priority))
    
    return errors
  }

  /**
   * Validate update project data
   */
  static validateUpdateData(data: UpdateProjectData): ValidationError[] {
    const errors: ValidationError[] = []
    
    if (data.name !== undefined) {
      errors.push(...this.validateName(data.name))
    }
    
    if (data.description !== undefined) {
      errors.push(...this.validateDescription(data.description))
    }
    
    if (data.priority !== undefined) {
      errors.push(...this.validatePriority(data.priority))
    }
    
    if (data.status !== undefined) {
      errors.push(...this.validateStatus(data.status))
    }
    
    return errors
  }
}

/**
 * Project API Service Class
 */
export class ProjectService {
  /**
   * Get current user ID from auth context
   * In a real implementation, this would come from the auth context
   */
  private getCurrentUserId(): string {
    // Get user data from localStorage (stored by auth service)
    const userData = localStorage.getItem('god_bless_user_data')
    const authToken = localStorage.getItem('god_bless_auth_token')
    
    console.log('Auth check - User data exists:', !!userData)
    console.log('Auth check - Token exists:', !!authToken)
    
    if (userData) {
      try {
        const user = JSON.parse(userData)
        const userId = user.id || user.user_id || user.userId
        console.log('Auth check - User ID:', userId)
        return userId
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }
    throw new Error('User not authenticated')
  }

  /**
   * Ensure API client has the current auth token
   */
  private ensureAuthentication(): void {
    const storedToken = localStorage.getItem('god_bless_auth_token')
    const currentToken = apiClient.getAuthToken()
    
    if (storedToken && storedToken !== currentToken) {
      console.log('🔄 Refreshing API client token')
      apiClient.setAuthToken(storedToken)
    }
  }

  /**
   * Get all projects with optional filtering and pagination
   */
  async getProjects(filters?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> {
    try {
      // Ensure API client has the latest token
      this.ensureAuthentication()
      
      const params: Record<string, unknown> = {
        user_id: this.getCurrentUserId()
      }
      
      if (filters) {
        // Pagination
        if (filters.page) params.page = filters.page
        if (filters.pageSize) params.page_size = filters.pageSize
        
        // Search
        if (filters.search) params.search = filters.search
        
        // Filters
        if (filters.status) params.status = filters.status
        if (filters.priority) params.priority = filters.priority
      }
      
      // Debug authentication before making request
      console.log('🔐 Project Service - Making authenticated request')
      console.log('- API Client has token:', !!apiClient.getAuthToken())
      console.log('- API Client is authenticated:', apiClient.isAuthenticated())
      console.log('- Request params:', params)
      console.log('- Endpoint:', API_ENDPOINTS.PROJECTS.LIST)
      
      const response = await apiClient.get<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.LIST, params)
      
      // Handle different response formats from backend
      let projects: Project[] = []
      let pagination: BackendPagination = {
        page_number: 1,
        total_pages: 0,
        total_count: 0,
        next: null,
        previous: null
      }

      // Check if response has the expected structure
      if (response.data && typeof response.data === 'object') {
        const backendData = response.data as BackendResponseWrapper
        
        // Handle direct backend response format
        if (backendData.message === 'Successful' && backendData.data) {
          const responseData = backendData.data as BackendProjectListData
          projects = responseData.projects || []
          pagination = responseData.pagination || pagination
        }
        // Handle already transformed response
        else if (Array.isArray(backendData.results)) {
          projects = backendData.results
          const currentPage = backendData.page || 1
          pagination = {
            page_number: currentPage,
            total_pages: backendData.totalPages || 0,
            total_count: backendData.count || 0,
            next: backendData.next ? currentPage + 1 : null,
            previous: backendData.previous ? Math.max(currentPage - 1, 1) : null
          }
        }
        // Handle direct array response
        else if (Array.isArray(backendData)) {
          projects = backendData as Project[]
        }
      }
      
      return {
        success: true,
        data: {
          results: projects,
          count: pagination.total_count || 0,
          page: pagination.page_number || 1,
          pageSize: filters?.pageSize || 10,
          totalPages: pagination.total_pages || 0,
          next: pagination.next ? `?page=${pagination.next}` : undefined,
          previous: pagination.previous ? `?page=${pagination.previous}` : undefined
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      throw error
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<ApiResponse<Project>> {
    if (!id) {
      throw new Error('Project ID is required')
    }
    
    this.ensureAuthentication()
    const response = await apiClient.get<BackendProjectResponse>(`${API_ENDPOINTS.PROJECTS.DETAIL}/${id}/`)
    
    // Transform backend response to expected format
    const backendData = response.data as BackendProjectResponse
    return {
      ...response,
      data: backendData.data as Project
    }
  }

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    // Validate data
    const validationErrors = ProjectValidation.validateCreateData(data)
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`)
    }
    
    this.ensureAuthentication()
    
    // Prepare request data for backend
    const requestData = {
      project_name: data.name.trim(),
      description: data.description.trim(),
      priority: data.priority,
      user_id: this.getCurrentUserId(),
      status: 'planning', // Default status
      target_phone_count: data.settings?.maxPhoneNumbers || 0,
      target_sms_count: 0,
      budget: null
    }
    
    const response = await apiClient.post<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.CREATE, requestData)
    
    // Transform backend response to expected format
    const backendData = response.data as BackendProjectResponse
    return {
      ...response,
      data: backendData.data as Project
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(id: string, data: UpdateProjectData): Promise<ApiResponse<Project>> {
    if (!id) {
      throw new Error('Project ID is required')
    }
    
    // Validate data
    const validationErrors = ProjectValidation.validateUpdateData(data)
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`)
    }
    
    this.ensureAuthentication()
    
    // Prepare request data for backend
    const requestData: Record<string, unknown> = {
      project_id: id
    }
    
    if (data.name !== undefined) requestData.project_name = data.name.trim()
    if (data.description !== undefined) requestData.description = data.description.trim()
    if (data.status !== undefined) requestData.status = data.status
    if (data.priority !== undefined) requestData.priority = data.priority
    if (data.settings?.maxPhoneNumbers !== undefined) requestData.target_phone_count = data.settings.maxPhoneNumbers
    
    const response = await apiClient.post<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.UPDATE, requestData)
    
    // Transform backend response to expected format
    const backendData = response.data as BackendProjectResponse
    return {
      ...response,
      data: backendData.data as Project
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      throw new Error('Project ID is required')
    }
    
    this.ensureAuthentication()
    
    const requestData = {
      project_id: id
    }
    
    const response = await apiClient.post<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.DELETE, requestData)
    
    return {
      ...response,
      data: undefined
    }
  }

  /**
   * Archive a project (soft delete)
   */
  async archiveProject(id: string): Promise<ApiResponse<Project>> {
    if (!id) {
      throw new Error('Project ID is required')
    }
    
    this.ensureAuthentication()
    
    const requestData = {
      project_id: id
    }
    
    await apiClient.post<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.ARCHIVE, requestData)
    
    // For archive, we need to get the updated project
    return this.getProject(id)
  }

  /**
   * Restore an archived project
   */
  async restoreProject(id: string): Promise<ApiResponse<Project>> {
    if (!id) {
      throw new Error('Project ID is required')
    }
    
    this.ensureAuthentication()
    
    const requestData = {
      project_id: id
    }
    
    await apiClient.post<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.UNARCHIVE, requestData)
    
    // For unarchive, we need to get the updated project
    return this.getProject(id)
  }

  /**
   * Get project analytics/statistics
   */
  async getProjectAnalytics(id: string): Promise<ApiResponse<unknown>> {
    if (!id) {
      throw new Error('Project ID is required')
    }
    
    this.ensureAuthentication()
    
    const response = await apiClient.get<BackendProjectResponse>(`${API_ENDPOINTS.PROJECTS.ANALYTICS}/${id}/analytics/`)
    
    // Transform backend response to expected format
    const backendData = response.data as BackendProjectResponse
    return {
      ...response,
      data: backendData.data as Record<string, unknown>
    }
  }

  /**
   * Search projects
   */
  async searchProjects(query: string, filters?: Omit<ProjectFilters, 'search'>): Promise<ApiResponse<PaginatedResponse<Project>>> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required')
    }
    
    const searchFilters: ProjectFilters = {
      ...filters,
      search: query.trim()
    }
    
    return this.getProjects(searchFilters)
  }

  /**
   * Get archived projects
   */
  async getArchivedProjects(filters?: Omit<ProjectFilters, 'status'>): Promise<ApiResponse<PaginatedResponse<Project>>> {
    this.ensureAuthentication()
    
    const params: Record<string, unknown> = {
      user_id: this.getCurrentUserId()
    }
    
    if (filters) {
      if (filters.page) params.page = filters.page
      if (filters.pageSize) params.page_size = filters.pageSize
      if (filters.search) params.search = filters.search
    }
    
    const response = await apiClient.get<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.ARCHIVED_LIST, params)
    
    // Transform backend response to expected format
    const backendData = response.data as BackendResponseWrapper
    const responseData = backendData.data
    const projects = responseData?.projects || []
    const pagination = responseData?.pagination || {
      page_number: 1,
      total_pages: 0,
      total_count: 0,
      next: null,
      previous: null
    }
    
    return {
      ...response,
      data: {
        results: projects,
        count: pagination.total_count || 0,
        page: pagination.page_number || 1,
        pageSize: filters?.pageSize || 10,
        totalPages: pagination.total_pages || 0,
        next: pagination.next ? `?page=${pagination.next}` : undefined,
        previous: pagination.previous ? `?page=${pagination.previous}` : undefined
      }
    }
  }

  /**
   * Add a collaborator to a project
   */
  async addCollaborator(projectId: string, userId: string): Promise<ApiResponse<void>> {
    if (!projectId) {
      throw new Error('Project ID is required')
    }
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    this.ensureAuthentication()
    
    const requestData = {
      project_id: projectId,
      user_id: userId
    }
    
    const response = await apiClient.post<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.ADD_COLLABORATOR, requestData)
    
    return {
      ...response,
      data: undefined
    }
  }

  /**
   * Remove a collaborator from a project
   */
  async removeCollaborator(projectId: string, userId: string): Promise<ApiResponse<void>> {
    if (!projectId) {
      throw new Error('Project ID is required')
    }
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    this.ensureAuthentication()
    
    const requestData = {
      project_id: projectId,
      user_id: userId
    }
    
    const response = await apiClient.post<BackendProjectResponse>(API_ENDPOINTS.PROJECTS.REMOVE_COLLABORATOR, requestData)
    
    return {
      ...response,
      data: undefined
    }
  }

  /**
   * Get projects for dropdown/select components
   */
  async getProjectsForSelect(activeOnly: boolean = true): Promise<ApiResponse<Array<{ id: string; name: string; status: ProjectStatus }>>> {
    const filters: ProjectFilters = {
      pageSize: 1000 // Get all projects for select
    }
    
    if (activeOnly) {
      filters.status = 'active'
    }
    
    const response = await this.getProjects(filters)
    
    // Transform to simple select format
    const selectOptions = response.data.results.map(project => ({
      id: project.id,
      name: project.project_name || project.name || 'Unnamed Project',
      status: project.status
    }))
    
    return {
      ...response,
      data: selectOptions
    }
  }
}

// Create and export singleton instance
export const projectService = new ProjectService()