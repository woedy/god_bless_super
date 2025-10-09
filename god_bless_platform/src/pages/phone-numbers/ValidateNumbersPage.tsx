/**
 * Validate Numbers Page
 * Phone number validation with bulk operations
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { NumberValidator } from '../../components/phone-numbers'
import { Card } from '../../components/common'
import { projectService } from '../../services'
import type { BreadcrumbItem } from '../../types/ui'
import type { Project } from '../../types'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    label: 'Phone Numbers',
    href: '/phone-numbers'
  },
  {
    label: 'Validate Numbers',
    href: '/phone-numbers/validate',
    isActive: true
  }
]

/**
 * Validate Numbers Page Component
 */
export function ValidateNumbersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project')

  // State
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        // Redirect to main phone numbers page for project selection
        navigate('/phone-numbers?redirected=true')
        return
      }

      try {
        setIsLoading(true)
        const response = await projectService.getProject(projectId)
        
        if (response.success) {
          setProject(response.data)
        } else {
          setError('Failed to load project details')
        }
      } catch (err) {
        console.error('Failed to load project:', err)
        setError('Failed to load project details')
      } finally {
        setIsLoading(false)
      }
    }

    loadProject()
  }, [projectId, navigate])

  const handleValidationComplete = (_taskId: string) => {
    setSuccessMessage('Phone number validation completed successfully!')
    
    // Navigate to the numbers list after a short delay
    setTimeout(() => {
      navigate(`/phone-numbers/list?project=${projectId}`)
    }, 2000)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setSuccessMessage(null)
  }

  const clearMessages = () => {
    setError(null)
    setSuccessMessage(null)
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Card className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'The selected project could not be found or you do not have access to it.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Select Project
            </button>
            <button
              onClick={() => navigate('/phone-numbers')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to Phone Numbers
            </button>
          </div>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Validate Phone Numbers</h1>
            <p className="text-gray-600 mt-1">
              Validate phone numbers for project "{project.project_name}"
            </p>
          </div>
          <button
            onClick={() => navigate('/phone-numbers')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Back to Phone Numbers
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={clearMessages}
                  className="inline-flex text-green-400 hover:text-green-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={clearMessages}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Project Info */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Current Project:</span> {project.project_name}
                {project.phone_stats && (
                  <span className="ml-4">
                    Total Numbers: {project.phone_stats.total.toLocaleString()} 
                    ({project.phone_stats.valid.toLocaleString()} valid, {project.phone_stats.invalid.toLocaleString()} invalid)
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Number Validator Component */}
        <NumberValidator
          project={project}
          onValidationComplete={handleValidationComplete}
          onError={handleError}
        />

        {/* Validation Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Validation Types</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Project Numbers:</strong> Validate all numbers in the current project</li>
                <li>• <strong>Manual List:</strong> Validate a custom list of phone numbers</li>
                <li>• <strong>Single Number:</strong> Validate one phone number instantly</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Validation Providers</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Default:</strong> Built-in validation using libphonenumber</li>
                <li>• <strong>Twilio:</strong> Real-time carrier lookup (premium)</li>
                <li>• <strong>NumVerify:</strong> Global phone number validation</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Important Notes</h4>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Validation may take time for large batches - progress is shown in real-time</li>
                    <li>Premium providers (Twilio) may incur additional costs</li>
                    <li>Results are automatically saved to your project</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}