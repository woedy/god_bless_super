/**
 * Add Project Page
 * Page for creating new projects
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { ProjectForm } from '../../components/projects'
import { useProjects } from '../../hooks'
import type { BreadcrumbItem } from '../../types/ui'
import type { CreateProjectData } from '../../types/api'

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
    label: 'Add Project',
    href: '/projects/add',
    isActive: true
  }
]

/**
 * Add Project Page Component
 */
export function AddProjectPage() {
  const navigate = useNavigate()
  const { createProject } = useProjects({ autoLoad: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: CreateProjectData) => {
    setLoading(true)
    setError(null)

    try {
      await createProject(data)
      // Navigate back to projects list on success
      navigate('/projects', { 
        replace: true,
        state: { message: 'Project created successfully!' }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project'
      setError(errorMessage)
      console.error('Failed to create project:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/projects')
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600 mt-1">
            Set up a new project to manage phone numbers and SMS campaigns.
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
                <h3 className="text-sm font-medium text-red-800">Error creating project</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Project Form */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <ProjectForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Project Setup Tips</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Choose a descriptive name that clearly identifies the project purpose</li>
                  <li>Set realistic target numbers based on your campaign goals</li>
                  <li>Use priority levels to organize your projects effectively</li>
                  <li>Add start and due dates to track project timelines</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}