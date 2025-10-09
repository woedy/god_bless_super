/**
 * Button Component
 * Reusable button with multiple variants and states
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

// Button Props
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  responsive?: boolean
  children: ReactNode
}

/**
 * Button Component
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  responsive = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  // Base button classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500 active:bg-blue-800',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 focus:ring-gray-500 active:bg-gray-800',
    outline: 'border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-blue-500 active:bg-blue-100 dark:active:bg-blue-900/30',
    ghost: 'text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-blue-500 active:bg-blue-100 dark:active:bg-blue-900/30',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 active:bg-red-800'
  }

  // Size classes
  const sizeClasses = {
    sm: responsive ? 'px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm' : 'px-3 py-2 text-sm',
    md: responsive ? 'px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base' : 'px-4 py-2.5 text-base',
    lg: responsive ? 'px-4 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg' : 'px-6 py-3 text-lg',
    xl: responsive ? 'px-6 py-3 text-lg sm:px-8 sm:py-4 sm:text-xl' : 'px-8 py-4 text-xl'
  }

  // Loading spinner
  const LoadingSpinner = () => (
    <svg 
      className="animate-spin -ml-1 mr-2 h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  // Button classes
  const buttonClasses = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className
  )

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {/* Loading state */}
      {loading && <LoadingSpinner />}
      
      {/* Left icon */}
      {!loading && leftIcon && (
        <span className="mr-2 flex-shrink-0">
          {leftIcon}
        </span>
      )}
      
      {/* Button content */}
      <span className={clsx(loading && 'opacity-75')}>
        {children}
      </span>
      
      {/* Right icon */}
      {!loading && rightIcon && (
        <span className="ml-2 flex-shrink-0">
          {rightIcon}
        </span>
      )}
    </button>
  )
}