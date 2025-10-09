/**
 * Checkbox Component
 * Reusable checkbox input component
 */

import React from 'react'

export interface CheckboxProps {
  label?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  indeterminate?: boolean
  required?: boolean
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  required = false,
  error,
  helperText,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const baseClasses = `
    rounded border-gray-300 text-blue-600 shadow-sm
    focus:border-blue-500 focus:ring-blue-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
  `.trim()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            ref={(input) => {
              if (input) {
                input.indeterminate = indeterminate
              }
            }}
            className={baseClasses}
          />
        </div>
        
        {label && (
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 ml-7">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500 ml-7">{helperText}</p>
      )}
    </div>
  )
}