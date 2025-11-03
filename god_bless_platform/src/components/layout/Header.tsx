/**
 * Header Component
 * Top navigation header with user menu and controls
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts'
import { Button } from '../common/Button'
import { ThemeToggle } from '../common/ThemeToggle'
import { projectService } from '../../services'
import type { Project } from '../../types'
import { ROUTES } from '../../config/routes'

interface HeaderProps {
  onSidebarToggle: () => void
  sidebarCollapsed: boolean
  isMobile?: boolean
  className?: string
}

/**
 * Header Component
 * Main application header with responsive design
 */
export function Header({ onSidebarToggle, sidebarCollapsed, isMobile = false, className = '' }: HeaderProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const {
    currentProject,
    currentProjectId,
    isLoading: isProjectLoading,
    isReady: isProjectReady,
    error: projectContextError,
    selectProject
  } = useProject()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [projectList, setProjectList] = useState<Project[]>([])
  const [isProjectListLoading, setIsProjectListLoading] = useState(false)
  const [projectListError, setProjectListError] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const projectMenuRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  const fetchProjectList = useCallback(async () => {
    setIsProjectListLoading(true)
    setProjectListError(null)

    try {
      const response = await projectService.getProjects({ pageSize: 50 })

      if (!isMountedRef.current) {
        return
      }

      if (response.success) {
        const data = response.data as Record<string, unknown>
        const results = Array.isArray((data as any)?.results)
          ? ((data as any).results as Project[])
          : Array.isArray((data as any)?.projects)
            ? ((data as any).projects as Project[])
            : Array.isArray(data)
              ? (data as unknown as Project[])
              : []

        setProjectList(results)
      } else {
        setProjectList([])
        setProjectListError(response.message || 'Failed to load projects')
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return
      }
      console.error('Project switcher failed to load projects:', error)
      setProjectListError(error instanceof Error ? error.message : 'Failed to load projects')
    } finally {
      if (isMountedRef.current) {
        setIsProjectListLoading(false)
      }
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setProjectMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  useEffect(() => {
    fetchProjectList()
  }, [fetchProjectList])

  useEffect(() => {
    if (!currentProject) {
      return
    }

    setProjectList(prev => {
      const exists = prev.some(project => project.id === currentProject.id)

      if (exists) {
        return prev.map(project => (project.id === currentProject.id ? currentProject : project))
      }

      return [currentProject, ...prev]
    })
  }, [currentProject])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleProjectSelect = async (projectId: string) => {
    try {
      const project = projectList.find(item => item.id === projectId)
      await selectProject(project ?? projectId)
      setProjectMenuOpen(false)
    } catch (error) {
      console.error('Failed to switch project:', error)
      setProjectListError(error instanceof Error ? error.message : 'Failed to switch project')
    }
  }

  const handleProjectSwitcherToggle = () => {
    setProjectMenuOpen(prev => !prev)
    if (!projectMenuOpen && !isProjectListLoading && projectList.length === 0) {
      fetchProjectList()
    }
  }

  const handleManageProjects = () => {
    setProjectMenuOpen(false)
    navigate('/projects')
  }

  const projectErrorMessage = projectListError || projectContextError || null
  const baseProjectName = currentProject?.project_name || currentProject?.name
  const projectDisplayName =
    baseProjectName || (!isProjectReady && isProjectLoading ? 'Loading project…' : 'Select Project')
  const truncatedProjectName =
    projectDisplayName.length > 26 ? `${projectDisplayName.slice(0, 23)}…` : projectDisplayName
  const hasActiveProject = Boolean(currentProjectId)

  return (
    <header
      className={`
        theme-surface border-b theme-border shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 transition-colors duration-200
        ${className}
      `}
    >
      {/* Left Section */}
      <div className="flex items-center flex-1">
        {/* Sidebar/Menu Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSidebarToggle}
          className="mr-3 sm:mr-4 p-2"
          aria-label={isMobile ? 'Open menu' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>

        {/* Mobile Logo */}
        {isMobile && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GB</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100 hidden xs:block">
              God Bless
            </span>
          </div>
        )}

        {/* Search Bar - Desktop and Tablet */}
        <div className="hidden md:block flex-1 max-w-md ml-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search projects, phone numbers..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto md:ml-4">
          <div className="relative" ref={projectMenuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleProjectSwitcherToggle}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
              aria-haspopup="listbox"
              aria-expanded={projectMenuOpen}
              aria-label={hasActiveProject ? `Active project ${projectDisplayName}` : 'Select project'}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  hasActiveProject
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" />
                </svg>
              </span>
              <span className="hidden sm:inline-block max-w-[160px] truncate">
                {truncatedProjectName}
              </span>
              <span className="sm:hidden inline-block max-w-[120px] truncate">
                {truncatedProjectName}
              </span>
              {isProjectLoading || isProjectListLoading ? (
                <span className="ml-1 flex h-4 w-4 items-center justify-center">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
                </span>
              ) : (
                <svg
                  className={`h-4 w-4 transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </Button>

            {projectMenuOpen && (
              <div className="absolute left-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Current project</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {hasActiveProject ? baseProjectName ?? 'Unnamed project' : 'No project selected'}
                  </p>
                  {projectErrorMessage && (
                    <p className="mt-2 text-xs text-red-500 dark:text-red-400">{projectErrorMessage}</p>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {isProjectListLoading && projectList.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
                      Loading projects…
                    </div>
                  ) : projectList.length > 0 ? (
                    projectList.map(project => {
                      const name = project.project_name || (project as { name?: string }).name || 'Untitled project'
                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => handleProjectSelect(project.id)}
                          className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                            project.id === currentProjectId
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{name}</span>
                            {project.id === currentProjectId && (
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">Active</span>
                            )}
                          </div>
                          {project.description && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </button>
                      )
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {projectErrorMessage ?? 'No projects available. Create one to get started.'}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchProjectList}
                    disabled={isProjectListLoading}
                  >
                    Refresh
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleManageProjects}>
                    Manage Projects
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Theme Toggle */}
        <ThemeToggle variant="icon" size="sm" />
        
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 relative"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Notification Badge */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Sample notifications */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">Phone number generation completed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generated 10,000 numbers for Project Alpha</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">2 minutes ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">SMS campaign sent successfully</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Campaign "Summer Sale" delivered to 5,000 recipients</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">1 hour ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">Validation task completed with warnings</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1,250 numbers validated, 50 invalid numbers found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">3 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="ghost" size="sm" fullWidth>
                  View all notifications
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 p-2"
            aria-label="User menu"
          >
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.firstName?.[0] || user?.email[0].toUpperCase()}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-32 truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}
            </span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <div className="py-2">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate(ROUTES.SMS_DELIVERY_SETTINGS)
                  }}
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Help & Support
                </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}