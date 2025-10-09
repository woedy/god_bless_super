/**
 * Task Status Indicator Component
 * Displays task state with appropriate visual indicators
 */

import React from 'react'
import type { TaskStatus, TaskType } from '../../types/models'

interface TaskStatusIndicatorProps {
  status: TaskStatus
  type?: TaskType
  progress?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showProgress?: boolean
  className?: string
}

const statusConfig: Record<TaskStatus, {
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
  label: string
  pulseColor?: string
}> = {
  pending: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    label: 'Pending',
    icon: (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    )
  },
  running: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    pulseColor: 'bg-blue-400',
    label: 'Running',
    icon: (
      <svg className="w-full h-full animate-spin" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    label: 'Completed',
    icon: (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  },
  failed: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    label: 'Failed',
    icon: (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  },
  cancelled: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    label: 'Cancelled',
    icon: (
      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )
  },
  retrying: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    pulseColor: 'bg-amber-400',
    label: 'Retrying',
    icon: (
      <svg className="w-full h-full animate-spin" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
      </svg>
    )
  }
}

const sizeConfig = {
  sm: {
    container: 'w-4 h-4',
    icon: 'w-3 h-3',
    text: 'text-xs',
    progressHeight: 'h-1'
  },
  md: {
    container: 'w-6 h-6',
    icon: 'w-4 h-4',
    text: 'text-sm',
    progressHeight: 'h-2'
  },
  lg: {
    container: 'w-8 h-8',
    icon: 'w-6 h-6',
    text: 'text-base',
    progressHeight: 'h-3'
  }
}

/**
 * Task Status Indicator Component
 */
export function TaskStatusIndicator({
  status,
  type,
  progress = 0,
  size = 'md',
  showLabel = true,
  showProgress = false,
  className = ''
}: TaskStatusIndicatorProps) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]

  const shouldShowProgress = showProgress && (status === 'running' || status === 'retrying') && progress > 0

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Icon */}
      <div className="relative">
        <div 
          className={`
            ${sizeStyles.container} 
            ${config.bgColor} 
            ${config.color} 
            ${config.borderColor}
            border rounded-full flex items-center justify-center
            ${config.pulseColor ? 'animate-pulse' : ''}
          `}
        >
          <div className={sizeStyles.icon}>
            {config.icon}
          </div>
        </div>
        
        {/* Pulse ring for active states */}
        {config.pulseColor && (
          <div 
            className={`
              absolute inset-0 rounded-full ${config.pulseColor} 
              animate-ping opacity-75
            `}
          />
        )}
      </div>

      {/* Status Label and Progress */}
      <div className="flex-1 min-w-0">
        {showLabel && (
          <div className={`font-medium ${config.color} ${sizeStyles.text}`}>
            {config.label}
            {shouldShowProgress && (
              <span className="ml-1 text-gray-500">
                ({Math.round(progress)}%)
              </span>
            )}
          </div>
        )}
        
        {/* Progress Bar */}
        {shouldShowProgress && (
          <div className={`w-full bg-gray-200 rounded-full ${sizeStyles.progressHeight} mt-1`}>
            <div 
              className={`
                ${sizeStyles.progressHeight} 
                rounded-full transition-all duration-300 ease-out
                ${status === 'running' ? 'bg-blue-500' : 'bg-amber-500'}
              `}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact Task Status Badge
 */
export function TaskStatusBadge({
  status,
  size = 'sm',
  className = ''
}: Pick<TaskStatusIndicatorProps, 'status' | 'size' | 'className'>) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]

  return (
    <span 
      className={`
        inline-flex items-center px-2 py-1 rounded-full
        ${config.bgColor} ${config.color} ${sizeStyles.text}
        font-medium ${className}
      `}
    >
      <div className={`${sizeStyles.icon} mr-1`}>
        {config.icon}
      </div>
      {config.label}
    </span>
  )
}

export default TaskStatusIndicator