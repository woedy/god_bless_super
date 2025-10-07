/**
 * Select Component
 * Reusable select dropdown component
 */

import React from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  required?: boolean
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  required = false,
  error,
  helperText,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg'
  }

  const baseClasses = `
    block w-full rounded-md border-gray-300 shadow-sm
    focus:border-blue-500 focus:ring-blue-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
    ${className}
  `.trim()

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        required={required}
        className={baseClasses}
      >
        {placeholder && (
          <option value="" disabled>
            {loading ? 'Loading...' : placeholder}
          </option>
        )}
        
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}