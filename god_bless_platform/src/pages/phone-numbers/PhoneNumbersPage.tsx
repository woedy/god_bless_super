/**
 * Phone Numbers Page
 * Phone number management and operations landing page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { Button, Card, Select, Badge } from '../../components/common'
import { projectService, phoneNumberService } from '../../services'
import { useProject } from '../../contexts'
import type { BreadcrumbItem } from '../../types/ui'
import type { Project, PhoneNumber } from '../../types'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    label: 'Phone Numbers',
    href: '/phone-numbers',
    isActive: true
  }
]

/**
 * Helper function to format phone numbers
 */
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Check if it's a US number (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.slice(1, 4)
    const exchange = cleaned.slice(4, 7)
    const number = cleaned.slice(7)
    return `+1 (${areaCode}) ${exchange}-${number}`
  }
  
  // Check if it's a 10-digit US number
  if (cleaned.length === 10) {
    const areaCode = cleaned.slice(0, 3)
    const exchange = cleaned.slice(3, 6)
    const number = cleaned.slice(6)
    return `+1 (${areaCode}) ${exchange}-${number}`
  }
  
  // Return original if not a standard US format
  return phoneNumber
}

/**
 * Helper function to format relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} min ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString()
  }
}

/**
 * Phone Numbers Page Component
 */
export function PhoneNumbersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirected = searchParams.get('redirected')
  const requestedProjectId = searchParams.get('project')

  const {
    currentProjectId,
    currentProject,
    selectProject,
    isReady: isProjectReady,
    isLoading: isProjectLoading
  } = useProject()

  // State
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showRedirectMessage, setShowRedirectMessage] = useState<boolean>(false)
  const [recentNumbers, setRecentNumbers] = useState<PhoneNumber[]>([])
  const [isLoadingNumbers, setIsLoadingNumbers] = useState<boolean>(false)

  // Check if redirected from sub-page
  useEffect(() => {
    if (redirected) {
      setShowRedirectMessage(true)
      setError('Please select a project first to access phone number features.')
      // Clear the redirect parameter from URL
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('redirected')
      navigate(`/phone-numbers?${newSearchParams.toString()}`, { replace: true })
    }
  }, [redirected, searchParams, navigate])

  useEffect(() => {
    if (!isProjectReady) {
      return
    }

    if (requestedProjectId) {
      if (requestedProjectId !== currentProjectId) {
        void selectProject(requestedProjectId)
      }
      return
    }

    if (!currentProjectId && projects.length > 0) {
      void selectProject(projects[0])
    }
  }, [isProjectReady, requestedProjectId, currentProjectId, projects, selectProject])

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true)
        const response = await projectService.getProjects()

        if (response.success) {
          setProjects(response.data.results)
        } else {
          setError('Failed to load projects')
        }
      } catch (err) {
        console.error('Failed to load projects:', err)
        setError('Failed to load projects')
      } finally {
        setIsLoadingProjects(false)
      }
    }

    loadProjects()
  }, [])

  // Load recent numbers for selected project
  const loadRecentNumbers = async (projectId: string) => {
    try {
      setIsLoadingNumbers(true)
      const response = await phoneNumberService.getNumbers({
        projectId,
        page: 1,
        pageSize: 20, // Get 20 recent numbers (backend orders by -id by default)
        sortBy: 'created_at',
        sortOrder: 'desc'
      })
      
      if (response.success) {
        console.log('Recent numbers response:', response.data)
        console.log('First number data:', response.data.results?.[0])
        setRecentNumbers(response.data.results || [])
      } else {
        console.error('Failed to load recent numbers:', response)
        setRecentNumbers([])
      }
    } catch (err) {
      console.error('Failed to load recent numbers:', err)
      setRecentNumbers([])
    } finally {
      setIsLoadingNumbers(false)
    }
  }

  // Load recent numbers when project changes
  useEffect(() => {
    if (currentProjectId) {
      loadRecentNumbers(currentProjectId)
    } else {
      setRecentNumbers([])
    }
  }, [currentProjectId])

  const handleActionClick = (action: string) => {
    if (!currentProjectId) {
      setError('Please select a project first')
      return
    }

    // Clear any previous error messages
    setError(null)
    setShowRedirectMessage(false)

    switch (action) {
      case 'generate':
        navigate('/phone-numbers/generate')
        break
      case 'validate':
        navigate('/phone-numbers/validate')
        break
      case 'list':
        navigate('/phone-numbers/list')
        break
      default:
        break
    }
  }

  const handleProjectChange = (projectId: string) => {
    void selectProject(projectId)
  }

  const projectOptions = projects.map(project => ({
    value: project.id,
    label: project.project_name
  }))

  const selectedProjectData = currentProject ?? projects.find(p => p.id === currentProjectId) ?? null

  // Clear error when project is selected and save to localStorage
  useEffect(() => {
    if (currentProjectId && (error || showRedirectMessage)) {
      setError(null)
      setShowRedirectMessage(false)
    }
  }, [currentProjectId, error, showRedirectMessage])

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
            <p className="text-gray-600 mt-1">
              Generate, validate, and manage phone numbers for your projects.
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => handleActionClick('list')}
              disabled={!currentProjectId}
            >
              View Numbers
            </Button>
            <Button
              onClick={() => handleActionClick('generate')}
              disabled={!currentProjectId}
            >
              Generate Numbers
            </Button>
          </div>
        </div>

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
                  onClick={() => setError(null)}
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

        {/* Project Selection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Project</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/projects')}
            >
              Manage Projects
            </Button>
          </div>
          
          {isLoadingProjects ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No projects found. Create a project first.</p>
              <Button onClick={() => navigate('/projects')}>
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Select
                  label="Choose Project"
                  value={currentProjectId ?? ''}
                  onChange={handleProjectChange}
                  options={projectOptions}
                  placeholder="Select a project"
                  required
                />
              </div>
              
              {selectedProjectData && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Project Statistics</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Total Numbers: {selectedProjectData.phone_stats?.total.toLocaleString() || 0}</div>
                    <div>Valid Numbers: {selectedProjectData.phone_stats?.valid.toLocaleString() || 0}</div>
                    <div>SMS Campaigns: {selectedProjectData.sms_stats?.total.toLocaleString() || 0}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleActionClick('generate')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Generate Numbers</h3>
                <p className="text-gray-600 text-sm">Create new phone numbers</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleActionClick('validate')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Validate Numbers</h3>
                <p className="text-gray-600 text-sm">Check number validity</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleActionClick('list')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Manage Numbers</h3>
                <p className="text-gray-600 text-sm">View and organize numbers</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Numbers */}
        <div className="theme-card rounded-2xl">
          <div className="p-6 theme-card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold theme-text-primary">Recent Numbers (Last 20)</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleActionClick('list')}
              disabled={!currentProjectId}
            >
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            {isLoadingNumbers ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                <span className="ml-2 text-sm theme-text-muted">Loading recent numbers...</span>
              </div>
            ) : !currentProjectId ? (
              <div className="text-center py-8">
                <p className="theme-text-muted">Select a project to view recent numbers</p>
              </div>
            ) : recentNumbers.length === 0 ? (
              <div className="text-center py-8">
                <p className="theme-text-muted mb-4">No phone numbers found for this project</p>
                <Button
                  onClick={() => handleActionClick('generate')}
                  size="sm"
                >
                  Generate Numbers
                </Button>
              </div>
            ) : (
              <table className="theme-table">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold theme-table-header-cell tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold theme-table-header-cell tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold theme-table-header-cell tracking-wider">
                      Carrier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold theme-table-header-cell tracking-wider">
                      Line Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold theme-table-header-cell tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold theme-table-header-cell tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentNumbers.map((number: any) => (
                    <tr key={number.id} className="theme-table-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium theme-text-primary">
                            {formatPhoneNumber(number.number || number.formattedNumber || '')}
                          </div>
                          {(number.metadata?.areaCode || number.areaCode) && (
                            <div className="text-xs theme-text-muted">
                              Area: {number.metadata?.areaCode || number.areaCode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            number.isValid === true
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : number.isValid === false
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {number.isValid === true
                              ? 'Valid'
                              : number.isValid === false
                              ? 'Invalid'
                              : 'Pending'}
                          </span>
                          {number.validatedAt && (
                            <div className="text-xs theme-text-muted mt-1">
                              Validated: {new Date(number.validatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                        {number.carrier || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {number.lineType ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium theme-chip">
                            {number.lineType.charAt(0).toUpperCase() + number.lineType.slice(1)}
                          </span>
                        ) : (
                          <span className="text-sm theme-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm theme-text-primary">
                            {number.country || 'Unknown'}
                          </div>
                          {number.countryCode && (
                            <div className="text-xs theme-text-muted">{number.countryCode}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-muted">
                        {number.createdAt
                          ? formatRelativeTime(number.createdAt)
                          : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}