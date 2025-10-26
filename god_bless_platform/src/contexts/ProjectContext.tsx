/**
 * Project Context
 * Provides global access to the currently selected project
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import type { ReactNode } from 'react'
import { projectService } from '../services'
import type { Project } from '../types'

const STORAGE_KEY_ID = 'god_bless_active_project_id'
const STORAGE_KEY_DATA = 'god_bless_active_project_data'

interface ProjectContextValue {
  currentProjectId: string | null
  currentProject: Project | null
  isLoading: boolean
  isReady: boolean
  error: string | null
  selectProject: (project: Project | string | null) => Promise<Project | null>
  clearProject: () => void
  refreshCurrentProject: () => Promise<Project | null>
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

interface ProjectProviderProps {
  children: ReactNode
}

/**
 * Helper: Safely access localStorage only in browser environments
 */
const isBrowser = () => typeof window !== 'undefined'

const readStoredProject = () => {
  if (!isBrowser()) {
    return { id: null as string | null, project: null as Project | null }
  }

  const storedId = window.localStorage.getItem(STORAGE_KEY_ID)
  const storedProjectRaw = window.localStorage.getItem(STORAGE_KEY_DATA)

  let storedProject: Project | null = null
  if (storedProjectRaw) {
    try {
      storedProject = JSON.parse(storedProjectRaw) as Project
    } catch (error) {
      console.warn('Failed to parse stored project data:', error)
      window.localStorage.removeItem(STORAGE_KEY_DATA)
    }
  }

  return {
    id: storedId,
    project: storedProject
  }
}

const persistProject = (project: Project | null) => {
  if (!isBrowser()) return

  if (!project) {
    window.localStorage.removeItem(STORAGE_KEY_DATA)
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(project))
  } catch (error) {
    console.warn('Failed to persist project data:', error)
  }
}

const persistProjectId = (projectId: string | null) => {
  if (!isBrowser()) return

  if (!projectId) {
    window.localStorage.removeItem(STORAGE_KEY_ID)
    return
  }

  window.localStorage.setItem(STORAGE_KEY_ID, projectId)
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [{ id: storedId, project: storedProject }, setStoredProject] = useState(() => readStoredProject())
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(storedId)
  const [currentProject, setCurrentProject] = useState<Project | null>(storedProject)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestRequestId = useRef<string | null>(null)

  const loadProjectById = useCallback(async (projectId: string): Promise<Project | null> => {
    if (!projectId) {
      setCurrentProject(null)
      setCurrentProjectId(null)
      persistProjectId(null)
      persistProject(null)
      return null
    }

    setIsLoading(true)
    setError(null)
    latestRequestId.current = projectId

    try {
      const response = await projectService.getProject(projectId)

      if (!response.success) {
        throw new Error(response.message || 'Failed to load project')
      }

      if (latestRequestId.current !== projectId) {
        // A newer request has been issued; ignore this response
        return null
      }

      setCurrentProject(response.data)
      setCurrentProjectId(projectId)
      persistProjectId(projectId)
      persistProject(response.data)
      setStoredProject({ id: projectId, project: response.data })
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project'
      setError(message)
      console.error('ProjectContext: failed to load project', err)
      if (latestRequestId.current === projectId) {
        setCurrentProject(null)
      }
      return null
    } finally {
      if (latestRequestId.current === projectId) {
        setIsLoading(false)
      }
    }
  }, [])

  const selectProject = useCallback(
    async (projectOrId: Project | string | null): Promise<Project | null> => {
      if (!projectOrId) {
        latestRequestId.current = null
        setCurrentProjectId(null)
        setCurrentProject(null)
        setError(null)
        persistProjectId(null)
        persistProject(null)
        setStoredProject({ id: null, project: null })
        return null
      }

      const projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId.id

      // Optimistically set project information if provided
      if (typeof projectOrId !== 'string') {
        setCurrentProject(projectOrId)
        setStoredProject({ id: projectId, project: projectOrId })
        persistProject(projectOrId)
      }

      setCurrentProjectId(projectId)
      persistProjectId(projectId)

      return loadProjectById(projectId)
    },
    [loadProjectById]
  )

  const clearProject = useCallback(() => {
    selectProject(null)
  }, [selectProject])

  const refreshCurrentProject = useCallback(async () => {
    if (!currentProjectId) {
      return null
    }
    return loadProjectById(currentProjectId)
  }, [currentProjectId, loadProjectById])

  // Initialise from storage on mount
  useEffect(() => {
    let cancelled = false

    const initialise = async () => {
      if (storedId) {
        const project = await loadProjectById(storedId)
        if (!cancelled && project) {
          setStoredProject({ id: storedId, project })
        }
      } else {
        setCurrentProject(null)
        setCurrentProjectId(null)
      }
      if (!cancelled) {
        setIsReady(true)
      }
    }

    initialise()

    return () => {
      cancelled = true
    }
  }, [loadProjectById, storedId])

  const contextValue = useMemo<ProjectContextValue>(
    () => ({
      currentProjectId,
      currentProject,
      isLoading,
      isReady,
      error,
      selectProject,
      clearProject,
      refreshCurrentProject
    }),
    [currentProjectId, currentProject, isLoading, isReady, error, selectProject, clearProject, refreshCurrentProject]
  )

  return <ProjectContext.Provider value={contextValue}>{children}</ProjectContext.Provider>
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

export { ProjectContext }
