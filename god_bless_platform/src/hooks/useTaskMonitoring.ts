/**
 * Task Monitoring Hook
 * Custom hook for real-time task monitoring with WebSocket and polling fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '../services/api'
import { useWebSocketSubscription } from './useWebSocket'
import { WS_CHANNELS } from '../types/websocket'
import type {
  Task,
  TaskStatus,
  TaskType,
  ID
} from '../types/models'
import type {
  TaskProgressMessage,
  TaskCompleteMessage,
  WebSocketMessage
} from '../types/websocket'

interface TaskMonitoringState {
  tasks: Map<ID, Task>
  activeTasks: Task[]
  completedTasks: Task[]
  failedTasks: Task[]
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
}

interface TaskMonitoringOptions {
  projectId?: ID
  userId?: ID
  taskTypes?: TaskType[]
  enablePolling?: boolean
  pollingInterval?: number
  maxCompletedTasks?: number
}

/**
 * Hook for monitoring tasks in real-time
 */
export function useTaskMonitoring(options: TaskMonitoringOptions = {}) {
  const {
    projectId,
    userId,
    taskTypes,
    enablePolling = true,
    pollingInterval = 30000, // 30 seconds
    maxCompletedTasks = 50
  } = options

  const [state, setState] = useState<TaskMonitoringState>({
    tasks: new Map(),
    activeTasks: [],
    completedTasks: [],
    failedTasks: [],
    isLoading: false,
    error: null,
    lastUpdated: null
  })

  const pollingIntervalRef = useRef<number | null>(null)
  const isPollingRef = useRef(false)

  // WebSocket subscription for task progress updates
  useWebSocketSubscription<TaskProgressMessage>(
    WS_CHANNELS.TASK_PROGRESS,
    useCallback((message: WebSocketMessage<TaskProgressMessage>) => {
      const taskData = message.data
      
      setState(prevState => {
        const newTasks = new Map(prevState.tasks)
        const existingTask = newTasks.get(taskData.taskId)
        
        const updatedTask: Task = {
          ...existingTask,
          id: taskData.taskId,
          type: taskData.type,
          status: taskData.status,
          progress: taskData.progress,
          progressMessage: taskData.progressMessage,
          estimatedDuration: taskData.estimatedTimeRemaining,
          // Preserve existing task data
          createdAt: existingTask?.createdAt || new Date().toISOString(),
          userId: existingTask?.userId || userId || '',
          parameters: existingTask?.parameters || {},
          retryCount: existingTask?.retryCount || 0,
          maxRetries: existingTask?.maxRetries || 3,
          canRetry: existingTask?.canRetry || true
        }

        newTasks.set(taskData.taskId, updatedTask)
        
        return {
          ...prevState,
          tasks: newTasks,
          activeTasks: Array.from(newTasks.values()).filter(task => 
            task.status === 'running' || task.status === 'pending'
          ),
          lastUpdated: new Date().toISOString()
        }
      })
    }, [userId]),
    {
      projectId,
      userId,
      messageTypes: ['task_progress']
    },
    [projectId, userId]
  )

  // WebSocket subscription for task completion
  useWebSocketSubscription<TaskCompleteMessage>(
    WS_CHANNELS.TASK_COMPLETE,
    useCallback((message: WebSocketMessage<TaskCompleteMessage>) => {
      const taskData = message.data
      
      setState(prevState => {
        const newTasks = new Map(prevState.tasks)
        const existingTask = newTasks.get(taskData.taskId)
        
        const completedTask: Task = {
          ...existingTask,
          id: taskData.taskId,
          type: taskData.type,
          status: taskData.status,
          progress: 100,
          result: taskData.result ? {
            success: taskData.status === 'completed',
            message: taskData.status === 'completed' ? 'Task completed successfully' : 'Task failed',
            data: taskData.result,
            statistics: taskData.finalStatistics ? {
              totalItems: taskData.finalStatistics.itemsTotal,
              processedItems: taskData.finalStatistics.itemsProcessed,
              successfulItems: taskData.finalStatistics.successCount,
              failedItems: taskData.finalStatistics.errorCount,
              skippedItems: taskData.finalStatistics.warningCount,
              duration: taskData.duration
            } : undefined
          } : undefined,
          error: taskData.error ? {
            code: 'TASK_ERROR',
            message: String(taskData.error),
            retryable: taskData.status !== 'cancelled'
          } : undefined,
          completedAt: new Date().toISOString(),
          actualDuration: taskData.duration,
          // Preserve existing task data
          createdAt: existingTask?.createdAt || new Date().toISOString(),
          userId: existingTask?.userId || userId || '',
          parameters: existingTask?.parameters || {},
          retryCount: existingTask?.retryCount || 0,
          maxRetries: existingTask?.maxRetries || 3,
          canRetry: (existingTask?.canRetry ?? true) && taskData.status === 'failed'
        }

        newTasks.set(taskData.taskId, completedTask)
        
        const allTasks = Array.from(newTasks.values())
        const activeTasks = allTasks.filter(task => 
          task.status === 'running' || task.status === 'pending'
        )
        const completedTasks = allTasks
          .filter(task => task.status === 'completed')
          .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
          .slice(0, maxCompletedTasks)
        const failedTasks = allTasks
          .filter(task => task.status === 'failed')
          .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
          .slice(0, maxCompletedTasks)
        
        return {
          ...prevState,
          tasks: newTasks,
          activeTasks,
          completedTasks,
          failedTasks,
          lastUpdated: new Date().toISOString()
        }
      })
    }, [userId, maxCompletedTasks]),
    {
      projectId,
      userId,
      messageTypes: ['task_complete', 'task_error', 'task_cancelled']
    },
    [projectId, userId, maxCompletedTasks]
  )

  // Polling fallback for when WebSocket is not available
  const pollTasks = useCallback(async () => {
    if (isPollingRef.current) return
    
    isPollingRef.current = true
    
    try {
      const params: Record<string, unknown> = {}
      if (projectId) params.project_id = projectId
      if (userId) params.user_id = userId
      if (taskTypes?.length) params.task_types = taskTypes.join(',')
      
      const response = await apiClient.get<Task[]>('/api/tasks/', params)
      
      if (response.success) {
        setState(prevState => {
          const newTasks = new Map<ID, Task>()
          
          response.data.forEach(task => {
            newTasks.set(task.id, task)
          })
          
          const allTasks = Array.from(newTasks.values())
          const activeTasks = allTasks.filter(task => 
            task.status === 'running' || task.status === 'pending'
          )
          const completedTasks = allTasks
            .filter(task => task.status === 'completed')
            .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
            .slice(0, maxCompletedTasks)
          const failedTasks = allTasks
            .filter(task => task.status === 'failed')
            .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
            .slice(0, maxCompletedTasks)
          
          return {
            ...prevState,
            tasks: newTasks,
            activeTasks,
            completedTasks,
            failedTasks,
            isLoading: false,
            error: null,
            lastUpdated: new Date().toISOString()
          }
        })
      }
    } catch (error) {
      console.error('Failed to poll tasks:', error)
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tasks'
      }))
    } finally {
      isPollingRef.current = false
    }
  }, [projectId, userId, taskTypes, maxCompletedTasks])

  // Initial load and polling setup
  useEffect(() => {
    setState(prevState => ({ ...prevState, isLoading: true }))
    pollTasks()

    if (enablePolling) {
      pollingIntervalRef.current = window.setInterval(pollTasks, pollingInterval)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [pollTasks, enablePolling, pollingInterval])

  // Get task by ID
  const getTask = useCallback((taskId: ID): Task | undefined => {
    return state.tasks.get(taskId)
  }, [state.tasks])

  // Get tasks by status
  const getTasksByStatus = useCallback((status: TaskStatus): Task[] => {
    return Array.from(state.tasks.values()).filter(task => task.status === status)
  }, [state.tasks])

  // Get tasks by type
  const getTasksByType = useCallback((type: TaskType): Task[] => {
    return Array.from(state.tasks.values()).filter(task => task.type === type)
  }, [state.tasks])

  // Retry a failed task
  const retryTask = useCallback(async (taskId: ID): Promise<void> => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/retry/`)
      if (response.success) {
        // Task will be updated via WebSocket
        console.log(`Task ${taskId} retry initiated`)
      }
    } catch (error) {
      console.error(`Failed to retry task ${taskId}:`, error)
      throw error
    }
  }, [])

  // Cancel a running task
  const cancelTask = useCallback(async (taskId: ID): Promise<void> => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/cancel/`)
      if (response.success) {
        // Task will be updated via WebSocket
        console.log(`Task ${taskId} cancellation initiated`)
      }
    } catch (error) {
      console.error(`Failed to cancel task ${taskId}:`, error)
      throw error
    }
  }, [])

  // Refresh tasks manually
  const refreshTasks = useCallback(() => {
    setState(prevState => ({ ...prevState, isLoading: true }))
    pollTasks()
  }, [pollTasks])

  return {
    // State
    tasks: Array.from(state.tasks.values()),
    activeTasks: state.activeTasks,
    completedTasks: state.completedTasks,
    failedTasks: state.failedTasks,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Getters
    getTask,
    getTasksByStatus,
    getTasksByType,
    
    // Actions
    retryTask,
    cancelTask,
    refreshTasks,
    
    // Statistics
    totalTasks: state.tasks.size,
    activeTaskCount: state.activeTasks.length,
    completedTaskCount: state.completedTasks.length,
    failedTaskCount: state.failedTasks.length,
    successRate: state.tasks.size > 0 
      ? (state.completedTasks.length / (state.completedTasks.length + state.failedTasks.length)) * 100 
      : 0
  }
}

/**
 * Hook for monitoring a specific task
 */
export function useTaskProgress(taskId: ID) {
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // WebSocket subscription for this specific task
  useWebSocketSubscription<TaskProgressMessage>(
    WS_CHANNELS.TASK_PROGRESS,
    useCallback((message: WebSocketMessage<TaskProgressMessage>) => {
      if (message.data.taskId === taskId) {
        setTask(prevTask => ({
          ...prevTask,
          id: message.data.taskId,
          type: message.data.type,
          status: message.data.status,
          progress: message.data.progress,
          progressMessage: message.data.progressMessage,
          estimatedDuration: message.data.estimatedTimeRemaining,
          // Preserve existing data
          createdAt: prevTask?.createdAt || new Date().toISOString(),
          userId: prevTask?.userId || '',
          parameters: prevTask?.parameters || {},
          retryCount: prevTask?.retryCount || 0,
          maxRetries: prevTask?.maxRetries || 3,
          canRetry: prevTask?.canRetry || true
        }))
      }
    }, [taskId]),
    {
      messageTypes: ['task_progress']
    },
    [taskId]
  )

  // WebSocket subscription for task completion
  useWebSocketSubscription<TaskCompleteMessage>(
    WS_CHANNELS.TASK_COMPLETE,
    useCallback((message: WebSocketMessage<TaskCompleteMessage>) => {
      if (message.data.taskId === taskId) {
        setTask(prevTask => ({
          ...prevTask,
          id: message.data.taskId,
          type: message.data.type,
          status: message.data.status,
          progress: 100,
          result: message.data.result ? {
            success: message.data.status === 'completed',
            message: message.data.status === 'completed' ? 'Task completed successfully' : 'Task failed',
            data: message.data.result
          } : undefined,
          error: message.data.error ? {
            code: 'TASK_ERROR',
            message: String(message.data.error),
            retryable: message.data.status !== 'cancelled'
          } : undefined,
          completedAt: new Date().toISOString(),
          actualDuration: message.data.duration,
          // Preserve existing data
          createdAt: prevTask?.createdAt || new Date().toISOString(),
          userId: prevTask?.userId || '',
          parameters: prevTask?.parameters || {},
          retryCount: prevTask?.retryCount || 0,
          maxRetries: prevTask?.maxRetries || 3,
          canRetry: (prevTask?.canRetry ?? true) && message.data.status === 'failed'
        }))
      }
    }, [taskId]),
    {
      messageTypes: ['task_complete', 'task_error', 'task_cancelled']
    },
    [taskId]
  )

  // Load initial task data
  useEffect(() => {
    const loadTask = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.get<Task>(`/api/tasks/${taskId}/`)
        if (response.success) {
          setTask(response.data)
          setError(null)
        }
      } catch (error) {
        console.error(`Failed to load task ${taskId}:`, error)
        setError(error instanceof Error ? error.message : 'Failed to load task')
      } finally {
        setIsLoading(false)
      }
    }

    loadTask()
  }, [taskId])

  return {
    task,
    isLoading,
    error,
    isActive: task?.status === 'running' || task?.status === 'pending',
    isCompleted: task?.status === 'completed',
    isFailed: task?.status === 'failed',
    progress: task?.progress || 0,
    progressMessage: task?.progressMessage
  }
}