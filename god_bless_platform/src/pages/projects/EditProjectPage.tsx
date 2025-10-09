/**
 * Edit Project Page
 * Page for editing existing projects
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { ProjectForm } from '../../components/projects'
import { projectService } from '../../services'
import type { BreadcrumbItem } from '../../types/ui'
import type { Project } from '../../types/models'
import type { UpdateProjectData } from '../../types/api'

/**
 * Edit Project Page Component
 */
export function EditProjectPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    },
    {
      label: 'Edit',
      href: `/projects/${id}/edit`,
      isActive: true
    }
  ]

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

  const handleSubmit = async (data: UpdateProjectData) => {
    if (!id) return

    setSaving(true)
    setError(null)

    try {
      const response = await projectService.updateProject(id, data)
      setProject(response.data)
      
      // Navigate back to project detail or projects list on success
      navigate(`/projects/${id}`, { 
        replace: true,
        state: { message: 'Project updated successfully!' }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project'
      setError(errorMessage)
      console.error('Failed to update project:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (id) {
      navigate(`/projects/${id}`)
    } else {
      navigate('/projects')
    }
  }

  if (loading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>

            {/* Form skeleton */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <div className="space-y-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <div className="h-10 bg-gray-200 rounded w-20"></div>
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
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
        <div className="max-w-2xl mx-auto">
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
                  <button
                    onClick={() => navigate('/projects')}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Back to Projects
                  </button>
                </div>
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
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
            <p className="mt-1 text-sm text-gray-500">The project you're looking for doesn't exist.</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/projects')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Back to Projects
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Project: {project.project_name || project.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Update project settings and information.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error updating project</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Project Form */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <ProjectForm
            mode="edit"
            project={project}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={saving}
          />
        </div>

        {/* Project Info */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Project Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Created: {new Date(project.created_at).toLocaleDateString()}</div>
            <div>Last Updated: {new Date(project.updated_at).toLocaleDateString()}</div>
            <div>Project ID: {project.id}</div>
            {project.phone_stats && (
              <div>Phone Numbers: {project.phone_stats.total} ({project.phone_stats.valid} valid)</div>
            )}
            {project.task_stats && (
              <div>Tasks: {project.task_stats.completed}/{project.task_stats.total} completed</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}