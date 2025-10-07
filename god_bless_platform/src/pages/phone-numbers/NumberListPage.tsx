/**
 * Number List Page
 * Phone number list with filtering and export functionality
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { NumberList, FilterPanel, ExportDialog } from '../../components/phone-numbers'
import { Card, Button } from '../../components/common'
import { projectService } from '../../services'
import type { BreadcrumbItem } from '../../types/ui'
import type { Project, NumberFilters } from '../../types'

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
    label: 'Number List',
    href: '/phone-numbers/list',
    isActive: true
  }
]

/**
 * Number List Page Component
 */
export function NumberListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('project')

  // State
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Filter and export state
  const [filters, setFilters] = useState<NumberFilters>({
    projectId: projectId || undefined
  })
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false)

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
          setFilters(prev => ({ ...prev, projectId }))
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

  // Update URL when filters change
  useEffect(() => {
    if (filters.projectId) {
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('project', filters.projectId)
      
      // Add other filter params to URL if needed
      if (filters.search) newSearchParams.set('search', filters.search)
      if (filters.isValid !== undefined) newSearchParams.set('valid', filters.isValid.toString())
      if (filters.carrier) newSearchParams.set('carrier', filters.carrier)
      
      setSearchParams(newSearchParams)
    }
  }, [filters, searchParams, setSearchParams])

  const handleFiltersChange = (newFilters: NumberFilters) => {
    setFilters(newFilters)
  }

  const handleApplyFilters = () => {
    // Filters are applied automatically through the NumberList component
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setFilters({
      projectId: projectId || undefined
    })
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setSuccessMessage(null)
  }

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setError(null)
  }

  const clearMessages = () => {
    setError(null)
    setSuccessMessage(null)
  }

  const handleExportSuccess = (message: string) => {
    setSuccessMessage(message)
    setShowExportDialog(false)
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
            <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
            <p className="text-gray-600 mt-1">
              Manage phone numbers for project "{project.project_name}"
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔍 Export button clicked - Current filters:', filters)
                setShowExportDialog(true)
              }}
            >
              Export Numbers
              {Object.keys(filters).filter(key => 
                key !== 'projectId' && 
                filters[key as keyof NumberFilters] !== undefined && 
                filters[key as keyof NumberFilters] !== ''
              ).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                  Filtered
                </span>
              )}
            </Button>
            <Button
              onClick={() => navigate(`/phone-numbers/generate?project=${projectId}`)}
            >
              Generate Numbers
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔍 TEST - Current filters:', filters)
                console.log('🔍 TEST - Project ID:', projectId)
                // Test with specific filters
                const testFilters = {
                  ...filters,
                  isValid: true,
                  carrier: 'AT&T'
                }
                console.log('🔍 TEST - Testing with filters:', testFilters)
                setFilters(testFilters)
              }}
            >
              Test Filters
            </Button>
          </div>
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

        {/* Project Stats */}
        {project.phone_stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Numbers</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {project.phone_stats.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Valid Numbers</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {project.phone_stats.valid.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Invalid Numbers</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {project.phone_stats.invalid.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Validation Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {project.phone_stats.total > 0 
                      ? Math.round((project.phone_stats.valid / project.phone_stats.total) * 100)
                      : 0
                    }%
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        )}

        {/* Quick Actions */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-medium text-gray-900">Quick Actions</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/phone-numbers/validate?project=${projectId}`)}
                >
                  Validate Numbers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/phone-numbers/import?project=${projectId}`)}
                >
                  Import Numbers
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Project: {project.project_name}
            </div>
          </div>
        </Card>

        {/* Number List */}
        <NumberList
          project={project}
          filters={filters}
          onError={handleError}
          onSuccess={handleSuccess}
        />

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          project={project}
          filters={filters}
          onSuccess={handleExportSuccess}
          onError={handleError}
        />
      </div>
    </AppLayout>
  )
}