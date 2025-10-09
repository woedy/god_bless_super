/**
 * Project Detail Page
 * Page for viewing detailed project information
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { Button } from '../../components/common'
import { DeleteConfirmationModal } from '../../components/projects'
import { projectService } from '../../services'
import type { BreadcrumbItem } from '../../types/ui'
import type { Project } from '../../types/models'

/**
 * Get status badge color based on project status
 */
function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'planning':
      return 'bg-blue-100 text-blue-800'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800'
    case 'completed':
      return 'bg-purple-100 text-purple-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'archived':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get priority badge color based on project priority
 */
function getPriorityBadgeColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800'
    case 'high':
      return 'bg-orange-100 text-orange-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'low':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Format status text for display
 */
function formatStatus(status: string) {
  switch (status) {
    case 'on_hold':
      return 'On Hold'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

/**
 * Project Detail Page Component
 */
export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: 'delete' | 'archive'
  }>({
    isOpen: false,
    type: 'delete'
  })

  // Dynamic breadcrumbs based on project
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard'
    },
    {
      label: 'Projects',
      href: '/projects'
    },
    {
      label: project?.project_name || project?.name || 'Loading...',
      href: `/projects/${id}`,
      isActive: true
    }
  ]

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the message from history state
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!id) {
        setError('Project ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await projectService.getProject(id)
        setProject(response.data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load project'
        setError(errorMessage)
        console.error('Failed to load project:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [id])

  const handleEdit = () => {
    navigate(`/projects/${id}/edit`)
  }

  const handleDelete = async () => {
    if (!project || !id) return

    setActionLoading(true)
    try {
      await projectService.deleteProject(id)
      navigate('/projects', {
        replace: true,
        state: { message: 'Project deleted successfully!' }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project'
      setError(errorMessage)
      console.error('Failed to delete project:', err)
    } finally {
      setActionLoading(false)
      setDeleteModal({ isOpen: false, type: 'delete' })
    }
  }

  const handleArchive = async () => {
    if (!project || !id) return

    setActionLoading(true)
    try {
      const response = await projectService.archiveProject(id)
      setProject(response.data)
      setSuccessMessage('Project archived successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive project'
      setError(errorMessage)
      console.error('Failed to archive project:', err)
    } finally {
      setActionLoading(false)
      setDeleteModal({ isOpen: false, type: 'archive' })
    }
  }

  const handleRestore = async () => {
    if (!project || !id) return

    setActionLoading(true)
    try {
      const response = await projectService.restoreProject(id)
      setProject(response.data)
      setSuccessMessage('Project restored successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore project'
      setError(errorMessage)
      console.error('Failed to restore project:', err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-200 rounded w-20"></div>
              <div className="h-10 bg-gray-200 rounded w-20"></div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error && !project) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading project</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate('/projects')}>
                  Back to Projects
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
          <p className="mt-1 text-sm text-gray-500">The project you're looking for doesn't exist.</p>
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate('/projects')}>
              Back to Projects
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const isArchived = project.status === 'archived' || project.is_archived

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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
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
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {project.project_name || project.name}
              </h1>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadgeColor(project.status)}`}>
                {formatStatus(project.status)}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${getPriorityBadgeColor(project.priority)}`}>
                {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {project.description || 'No description available'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isArchived ? (
              <Button
                variant="outline"
                onClick={handleRestore}
                disabled={actionLoading}
              >
                {actionLoading ? 'Restoring...' : 'Restore'}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  Edit Project
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteModal({ isOpen: true, type: 'archive' })}
                >
                  Archive
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setDeleteModal({ isOpen: true, type: 'delete' })}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Project Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Target Phone Numbers</dt>
                  <dd className="text-lg font-semibold text-gray-900">{project.target_phone_count?.toLocaleString() || 0}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Target SMS Count</dt>
                  <dd className="text-lg font-semibold text-gray-900">{project.target_sms_count?.toLocaleString() || 0}</dd>
                </div>
                {project.budget && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Budget</dt>
                    <dd className="text-lg font-semibold text-gray-900">${project.budget.toLocaleString()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-lg font-semibold text-gray-900">{new Date(project.created_at).toLocaleDateString()}</dd>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {(project.phone_stats || project.sms_stats || project.task_stats) && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {project.phone_stats && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Phone Numbers</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total:</span>
                          <span className="text-sm font-medium">{project.phone_stats.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Valid:</span>
                          <span className="text-sm font-medium text-green-600">{project.phone_stats.valid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Invalid:</span>
                          <span className="text-sm font-medium text-red-600">{project.phone_stats.invalid}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {project.sms_stats && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">SMS Campaigns</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total:</span>
                          <span className="text-sm font-medium">{project.sms_stats.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sent:</span>
                          <span className="text-sm font-medium text-green-600">{project.sms_stats.sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Failed:</span>
                          <span className="text-sm font-medium text-red-600">{project.sms_stats.failed}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {project.task_stats && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Tasks</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total:</span>
                          <span className="text-sm font-medium">{project.task_stats.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Completed:</span>
                          <span className="text-sm font-medium text-green-600">{project.task_stats.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Progress:</span>
                          <span className="text-sm font-medium">{Math.round(project.task_stats.completion_rate)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Details */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
              <div className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="text-sm text-gray-900">{formatStatus(project.status)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Priority</dt>
                  <dd className="text-sm text-gray-900">{project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}</dd>
                </div>
                {project.start_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                    <dd className="text-sm text-gray-900">{new Date(project.start_date).toLocaleDateString()}</dd>
                  </div>
                )}
                {project.due_date && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                    <dd className="text-sm text-gray-900">{new Date(project.due_date).toLocaleDateString()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="text-sm text-gray-900">{new Date(project.updated_at).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Project ID</dt>
                  <dd className="text-sm text-gray-900 font-mono">{project.id}</dd>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Generate Phone Numbers
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Create SMS Campaign
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete/Archive Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          project={project}
          type={deleteModal.type}
          onConfirm={deleteModal.type === 'delete' ? handleDelete : handleArchive}
          onCancel={() => setDeleteModal({ isOpen: false, type: 'delete' })}
          loading={actionLoading}
        />
      </div>
    </AppLayout>
  )
}