/**
 * Loading State Component
 * Displays loading indicators with different sizes and overlay options
 */

import React from 'react'

export interface LoadingStateProps {
  size?: LoadingSize
  text?: string
  overlay?: boolean
  className?: string
  fullScreen?: boolean
  color?: 'primary' | 'secondary' | 'white'
}

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Loading State Component
 */
export function LoadingState({
  size = 'md',
  text,
  overlay = false,
  className = '',
  fullScreen = false,
  color = 'primary'
}: LoadingStateProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-4 h-4'
      case 'sm':
        return 'w-6 h-6'
      case 'md':
        return 'w-8 h-8'
      case 'lg':
        return 'w-12 h-12'
      case 'xl':
        return 'w-16 h-16'
      default:
        return 'w-8 h-8'
    }
  }

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'text-blue-600'
      case 'secondary':
        return 'text-gray-600'
      case 'white':
        return 'text-white'
      default:
        return 'text-blue-600'
    }
  }

  const getTextSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'text-xs'
      case 'sm':
        return 'text-sm'
      case 'md':
        return 'text-base'
      case 'lg':
        return 'text-lg'
      case 'xl':
        return 'text-xl'
      default:
        return 'text-base'
    }
  }

  const spinner = (
    <svg
      className={`animate-spin ${getSizeClasses()} ${getColorClasses()}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {spinner}
      {text && (
        <p className={`mt-2 ${getTextSizeClasses()} ${getColorClasses()} font-medium`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90">
        {content}
      </div>
    )
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
        {content}
      </div>
    )
  }

  return content
}

/**
 * Inline Loading Spinner
 */
export function LoadingSpinner({ 
  size = 'sm', 
  color = 'primary',
  className = '' 
}: Pick<LoadingStateProps, 'size' | 'color' | 'className'>) {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-3 h-3'
      case 'sm':
        return 'w-4 h-4'
      case 'md':
        return 'w-5 h-5'
      case 'lg':
        return 'w-6 h-6'
      case 'xl':
        return 'w-8 h-8'
      default:
        return 'w-4 h-4'
    }
  }

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'text-blue-600'
      case 'secondary':
        return 'text-gray-600'
      case 'white':
        return 'text-white'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <svg
      className={`animate-spin ${getSizeClasses()} ${getColorClasses()} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Skeleton Loading Component
 */
export function SkeletonLoader({
  lines = 3,
  className = ''
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded h-4 mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * Card Skeleton Loader
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  )
}

/**
 * Table Skeleton Loader
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className = '' 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {/* Header */}
      <div className="flex space-x-4 mb-4 pb-2 border-b border-gray-200">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex-1 h-4 bg-gray-200 rounded" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 mb-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={`flex-1 h-4 bg-gray-200 rounded ${
                colIndex === 0 ? 'w-1/4' : colIndex === columns - 1 ? 'w-1/6' : ''
              }`} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default LoadingState