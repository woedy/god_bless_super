/**
 * Textarea Component
 * Reusable textarea input component
 */

import React from 'react'

export interface TextareaProps {
  label?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  helperText?: string
  rows?: number
  cols?: number
  resize?: 'none' | 'both' | 'horizontal' | 'vertical'
  className?: string
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error,
  helperText,
  rows = 4,
  cols,
  resize = 'vertical',
  className = ''
}) => {
  const resizeClasses = {
    none: 'resize-none',
    both: 'resize',
    horizontal: 'resize-x',
    vertical: 'resize-y'
  }

  const baseClasses = `
    block w-full rounded-md border-gray-300 shadow-sm
    focus:border-blue-500 focus:ring-blue-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    px-3 py-2
    ${resizeClasses[resize]}
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
      
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        cols={cols}
        className={baseClasses}
      />
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}