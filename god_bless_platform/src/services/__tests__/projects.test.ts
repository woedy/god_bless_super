/**
 * Project Service Tests
 * Unit tests for project API service methods and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { projectService, ProjectValidation } from '../projects'
import { apiClient } from '../api'
import type { CreateProjectData, UpdateProjectData, ProjectFilters } from '../../types/api'
import type { Project } from '../../types/models'

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

const mockApiClient = vi.mocked(apiClient)

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('ProjectValidation', () => {
  describe('validateName', () => {
    it('should return error for empty name', () => {
      const errors = ProjectValidation.validateName('')
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('REQUIRED')
    })

    it('should return error for name too short', () => {
      const errors = ProjectValidation.validateName('a')
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('MIN_LENGTH')
    })

    it('should return error for name too long', () => {
      const longName = 'a'.repeat(101)
      const errors = ProjectValidation.validateName(longName)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('MAX_LENGTH')
    })

    it('should return no errors for valid name', () => {
      const errors = ProjectValidation.validateName('Valid Project Name')
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateDescription', () => {
    it('should return no errors for empty description', () => {
      const errors = ProjectValidation.validateDescription('')
      expect(errors).toHaveLength(0)
    })

    it('should return error for description too long', () => {
      const longDescription = 'a'.repeat(501)
      const errors = ProjectValidation.validateDescription(longDescription)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('MAX_LENGTH')
    })

    it('should return no errors for valid description', () => {
      const errors = ProjectValidation.validateDescription('Valid description')
      expect(errors).toHaveLength(0)
    })
  })

  describe('validatePriority', () => {
    it('should return error for invalid priority', () => {
      const errors = ProjectValidation.validatePriority('invalid' as any)
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('INVALID_VALUE')
    })

    it('should return no errors for valid priority', () => {
      const errors = ProjectValidation.validatePriority('high')
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateCreateData', () => {
    it('should validate all fields for create data', () => {
      const invalidData: CreateProjectData = {
        name: '',
        description: 'a'.repeat(501),
        priority: 'invalid' as any
      }
      
      const errors = ProjectValidation.validateCreateData(invalidData)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.field === 'name')).toBe(true)
      expect(errors.some(e => e.field === 'description')).toBe(true)
      expect(errors.some(e => e.field === 'priority')).toBe(true)
    })
  })
})

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock user data in localStorage
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
      user_id: 'test-user-id',
      id: 'test-user-id'
    }))
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getProjects', () => {
    it('should call API with correct parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          message: 'Successful',
          data: {
            projects: [],
            pagination: {
              page_number: 1,
              total_pages: 0,
              total_count: 0,
              next: null,
              previous: null
            }
          }
        }
      }
      
      mockApiClient.get.mockResolvedValue(mockResponse)
      
      const filters: ProjectFilters = {
        page: 1,
        pageSize: 25,
        status: 'active',
        search: 'test'
      }
      
      await projectService.getProjects(filters)
      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/projects/get-all-projects/',
        {
          user_id: 'test-user-id',
          page: 1,
          page_size: 25,
          status: 'active',
          search: 'test'
        }
      )
    })

    it('should handle empty filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          message: 'Successful',
          data: {
            projects: [],
            pagination: {
              page_number: 1,
              total_pages: 0,
              total_count: 0,
              next: null,
              previous: null
            }
          }
        }
      }
      
      mockApiClient.get.mockResolvedValue(mockResponse)
      
      await projectService.getProjects()
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/projects/get-all-projects/', {
        user_id: 'test-user-id'
      })
    })
  })

  describe('getProject', () => {
    it('should call API with project ID', async () => {
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        status: 'active',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user1',
        phoneNumberCount: 0,
        validNumberCount: 0,
        invalidNumberCount: 0,
        campaignCount: 0,
        activeCampaignCount: 0,
        settings: {
          autoValidation: false,
          validationProvider: 'default',
          smsProvider: 'default',
          defaultCountry: 'US',
          allowDuplicates: false,
          maxPhoneNumbers: 1000000
        }
      }
      
      const mockResponse = { 
        success: true, 
        data: {
          message: 'Successful',
          data: mockProject
        }
      }
      mockApiClient.get.mockResolvedValue(mockResponse)
      
      await projectService.getProject('1')
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/projects/project/1/')
    })

    it('should throw error for empty ID', async () => {
      await expect(projectService.getProject('')).rejects.toThrow('Project ID is required')
    })
  })

  describe('createProject', () => {
    it('should validate data before creating', async () => {
      const invalidData: CreateProjectData = {
        name: '',
        description: 'Valid description',
        priority: 'medium'
      }
      
      await expect(projectService.createProject(invalidData)).rejects.toThrow('Validation failed')
    })

    it('should call API with valid data', async () => {
      const validData: CreateProjectData = {
        name: 'Test Project',
        description: 'Test Description',
        priority: 'medium'
      }
      
      const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        description: 'Test Description',
        status: 'active',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user1',
        phoneNumberCount: 0,
        validNumberCount: 0,
        invalidNumberCount: 0,
        campaignCount: 0,
        activeCampaignCount: 0,
        settings: {
          autoValidation: false,
          validationProvider: 'default',
          smsProvider: 'default',
          defaultCountry: 'US',
          allowDuplicates: false,
          maxPhoneNumbers: 1000000
        }
      }
      
      const mockResponse = { 
        success: true, 
        data: {
          message: 'Project added successfully',
          data: mockProject
        }
      }
      mockApiClient.post.mockResolvedValue(mockResponse)
      
      await projectService.createProject(validData)
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/projects/add-new-project/', {
        project_name: 'Test Project',
        description: 'Test Description',
        priority: 'medium',
        user_id: 'test-user-id',
        status: 'planning',
        target_phone_count: 0,
        target_sms_count: 0,
        budget: null
      })
    })
  })

  describe('updateProject', () => {
    it('should throw error for empty ID', async () => {
      await expect(projectService.updateProject('', {})).rejects.toThrow('Project ID is required')
    })

    it('should validate data before updating', async () => {
      const invalidData: UpdateProjectData = {
        name: ''
      }
      
      await expect(projectService.updateProject('1', invalidData)).rejects.toThrow('Validation failed')
    })

    it('should call API with valid data', async () => {
      const validData: UpdateProjectData = {
        name: 'Updated Project',
        status: 'inactive'
      }
      
      const mockProject: Project = {
        id: '1',
        name: 'Updated Project',
        description: 'Test Description',
        status: 'inactive',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user1',
        phoneNumberCount: 0,
        validNumberCount: 0,
        invalidNumberCount: 0,
        campaignCount: 0,
        activeCampaignCount: 0,
        settings: {
          autoValidation: false,
          validationProvider: 'default',
          smsProvider: 'default',
          defaultCountry: 'US',
          allowDuplicates: false,
          maxPhoneNumbers: 1000000
        }
      }
      
      const mockResponse = { 
        success: true, 
        data: {
          message: 'Successful',
          data: mockProject
        }
      }
      mockApiClient.post.mockResolvedValue(mockResponse)
      
      await projectService.updateProject('1', validData)
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/projects/edit-project/', {
        project_id: '1',
        project_name: 'Updated Project',
        status: 'inactive'
      })
    })
  })

  describe('deleteProject', () => {
    it('should throw error for empty ID', async () => {
      await expect(projectService.deleteProject('')).rejects.toThrow('Project ID is required')
    })

    it('should call API with project ID', async () => {
      const mockResponse = { 
        success: true, 
        data: {
          message: 'Successful',
          data: {}
        }
      }
      mockApiClient.post.mockResolvedValue(mockResponse)
      
      await projectService.deleteProject('1')
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/projects/delete-project/', {
        project_id: '1'
      })
    })
  })

  describe('searchProjects', () => {
    it('should throw error for empty query', async () => {
      await expect(projectService.searchProjects('')).rejects.toThrow('Search query is required')
    })

    it('should call getProjects with search parameter', async () => {
      const mockResponse = {
        success: true,
        data: {
          message: 'Successful',
          data: {
            projects: [],
            pagination: {
              page_number: 1,
              total_pages: 0,
              total_count: 0,
              next: null,
              previous: null
            }
          }
        }
      }
      
      mockApiClient.get.mockResolvedValue(mockResponse)
      
      await projectService.searchProjects('test query')
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/projects/get-all-projects/', {
        user_id: 'test-user-id',
        search: 'test query'
      })
    })
  })

  describe('getProjectsForSelect', () => {
    it('should return simplified project data for select components', async () => {
      const mockProjects: Project[] = [
        {
          id: '1',
          user: 'user1',
          project_name: 'Project 1',
          description: 'Description 1',
          status: 'active',
          priority: 'medium',
          target_phone_count: 0,
          target_sms_count: 0,
          is_archived: false,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      const mockResponse = {
        success: true,
        data: {
          message: 'Successful',
          data: {
            projects: mockProjects,
            pagination: {
              page_number: 1,
              total_pages: 1,
              total_count: 1,
              next: null,
              previous: null
            }
          }
        }
      }
      
      mockApiClient.get.mockResolvedValue(mockResponse)
      
      const result = await projectService.getProjectsForSelect()
      
      expect(result.data).toEqual([
        {
          id: '1',
          name: 'Project 1',
          status: 'active'
        }
      ])
      
      expect(mockApiClient.get).toHaveBeenCalledWith('/projects/get-all-projects/', {
        user_id: 'test-user-id',
        page_size: 1000,
        status: 'active'
      })
    })
  })
})