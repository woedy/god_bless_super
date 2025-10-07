/**
 * ProgressBar Component
 * Reusable progress bar component
 */

import React from 'react'

export interface ProgressBarProps {
  progress: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  animated?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  animated = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const variantClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  }

  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={`space-y-1 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-gray-500">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`
            ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out
            ${variantClasses[variant]}
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}