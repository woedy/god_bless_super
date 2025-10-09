/**
 * Task Monitoring Context Hooks
 * Hooks for accessing the task monitoring context
 */

import { useContext } from 'react'
import { TaskMonitoringContext } from '../contexts/TaskMonitoringContext'

/**
 * Hook to use task monitoring context
 */
export function useTaskMonitoringContext() {
  const context = useContext(TaskMonitoringContext)
  
  if (!context) {
    throw new Error('useTaskMonitoringContext must be used within a TaskMonitoringProvider')
  }
  
  return context
}

/**
 * Hook to use task monitoring context with optional fallback
 */
export function useOptionalTaskMonitoringContext() {
  return useContext(TaskMonitoringContext)
}