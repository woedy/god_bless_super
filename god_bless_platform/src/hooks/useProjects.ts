/**
 * useProjects Hook
 * Custom hook for managing project data and operations
 */

import { useState, useEffect, useCallback } from 'react'
import { projectService } from '../services'
import type { Project, ProjectFilters } from '../types'

interface UseProjectsOptions {
  autoLoad?: boolean
  filters?: ProjectFilters
}

interface UseProjectsReturn {
  projects: Project[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  
  // Actions
  loadProjects: (filters?: ProjectFilters) => Promise<void>
  refreshProjects: () => Promise<void>
  createProject: (data: any) => Promise<Project>
  updateProject: (id: string, data: any) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for project management
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { autoLoad = true, filters: initialFilters } = options
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [currentFilters, setCurrentFilters] = useState<ProjectFilters | undefined>(initialFilters)

  /**
   * Load projects with optional filters
   */
  const loadProjects = useCallback(async (filters?: ProjectFilters) => {
    try {
      setLoading(true)
      setError(null)
      
      const filtersToUse = filters || currentFilters
      if (filters) {
        setCurrentFilters(filtersToUse)
      }
      
      const response = await projectService.getProjects(filtersToUse)
      
      setProjects(response.data.results)
      setTotalCount(response.data.count)
      setCurrentPage(response.data.page)
      setTotalPages(response.data.totalPages)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects'
      setError(errorMessage)
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refresh projects with current filters
   */
  const refreshProjects = useCallback(async () => {
    await loadProjects(currentFilters)
  }, [loadProjects, currentFilters])

  /**
   * Create a new project
   */
  const createProject = useCallback(async (data: any): Promise<Project> => {
    try {
      setError(null)
      const response = await projectService.createProject(data)
      
      // Refresh the project list
      await refreshProjects()
      
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project'
      setError(errorMessage)
      throw err
    }
  }, [refreshProjects])

  /**
   * Update an existing project
   */
  const updateProject = useCallback(async (id: string, data: any): Promise<Project> => {
    try {
      setError(null)
      const response = await projectService.updateProject(id, data)
      
      // Update the project in the local state
      setProjects(prev => prev.map(project => 
        project.id === id ? response.data : project
      ))
      
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Delete a project
   */
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await projectService.deleteProject(id)
      
      // Remove the project from local state
      setProjects(prev => prev.filter(project => project.id !== id))
      setTotalCount(prev => prev - 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-load projects on mount
  useEffect(() => {
    if (autoLoad) {
      loadProjects(initialFilters)
    }
  }, [autoLoad]) // Remove loadProjects from dependencies

  return {
    projects,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    
    // Actions
    loadProjects,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject,
    clearError
  }
}

export default useProjects