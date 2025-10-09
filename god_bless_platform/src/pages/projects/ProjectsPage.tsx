/**
 * Projects Page
 * Project management and listing
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { Button } from '../../components/common'
import { ProjectList } from '../../components/projects'
import { useProjects } from '../../hooks'
import type { BreadcrumbItem } from '../../types/ui'
import type { Project, ProjectStatus, ProjectPriority } from '../../types/models'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    label: 'Projects',
    href: '/projects',
    isActive: true
  }
]



/**
 * Projects Page Component
 */
export function ProjectsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>('')
  
  const {
    projects,
    loading,
    error,
    deleteProject,
    loadProjects
  } = useProjects({
    autoLoad: true,
    filters: { pageSize: 50 } // Load more projects for the grid
  })

  // Use ref to store the latest loadProjects function
  const loadProjectsRef = useRef(loadProjects)
  loadProjectsRef.current = loadProjects

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the message from history state
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Reload projects when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProjectsRef.current({
        pageSize: 50,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined
      })
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, priorityFilter]) // Remove loadProjects from dependencies

  const handleCreateProject = () => {
    navigate('/projects/add')
  }

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`)
  }

  const handleEditProject = (project: Project) => {
    navigate(`/projects/${project.id}/edit`)
  }

  const handleDeleteProject = async (project: Project) => {
    await deleteProject(project.id)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setPriorityFilter('')
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-green-400 hover:text-green-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Manage your phone number projects and campaigns.
            </p>
          </div>
          <Button 
            variant="primary" 
            onClick={handleCreateProject}
            responsive
            className="w-full sm:w-auto"
          >
            <span className="sm:hidden">Create New Project</span>
            <span className="hidden sm:inline">Create Project</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-4">
            {/* Search Input */}
            <div className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search projects by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
                  className="block w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as ProjectPriority | '')}
                  className="block w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchQuery || statusFilter || priorityFilter) && (
                <div className="sm:col-span-2 lg:col-span-1">
                  <Button
                    variant="ghost"
                    onClick={handleClearFilters}
                    fullWidth
                    responsive
                    className="sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter || priorityFilter) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchQuery && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  <button
                    onClick={() => setStatusFilter('')}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {priorityFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Priority: {priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                  <button
                    onClick={() => setPriorityFilter('')}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-orange-400 hover:bg-orange-200 hover:text-orange-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                {error.includes('not authenticated') && (
                  <p className="mt-1 text-sm text-red-600">
                    Please log in to view your projects.
                  </p>
                )}
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => loadProjectsRef.current()}>
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project List */}
        <ProjectList
          projects={projects}
          loading={loading}
          onView={handleViewProject}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          onCreate={handleCreateProject}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </AppLayout>
  )
}