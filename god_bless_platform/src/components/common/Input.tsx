/**
 * Input Component
 * Reusable input field with validation and styling
 */

import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

// Input Props
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'outlined'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

/**
 * Input Component
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'default',
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  required,
  ...props
}, ref) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-4 py-3 text-lg'
  }

  // Variant classes
  const variantClasses = {
    default: 'border border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500',
    filled: 'border-0 bg-gray-100 focus:bg-white focus:ring-blue-500',
    outlined: 'border-2 border-gray-300 bg-transparent focus:border-blue-500'
  }

  // Input classes
  const inputClasses = clsx(
    // Base styles
    'block rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50',
    
    // Size
    sizeClasses[size],
    
    // Variant
    variantClasses[variant],
    
    // Width
    fullWidth ? 'w-full' : 'w-auto',
    
    // Icon padding
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    
    // Error state
    error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
    
    // Disabled state
    disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed',
    
    // Custom classes
    className
  )

  return (
    <div className={clsx('relative', fullWidth && 'w-full')}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className={clsx(
            'block text-sm font-medium mb-2',
            error ? 'text-red-700' : 'text-gray-700',
            disabled && 'text-gray-500'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className={clsx(
              'text-gray-400',
              error && 'text-red-500'
            )}>
              {leftIcon}
            </div>
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : 
            undefined
          }
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className={clsx(
              'text-gray-400',
              error && 'text-red-500'
            )}>
              {rightIcon}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p 
          id={`${inputId}-error`}
          className="mt-2 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p 
          id={`${inputId}-helper`}
          className="mt-2 text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'