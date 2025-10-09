/**
 * Responsive Form Components
 * Form layouts that adapt to different screen sizes
 */

import React from 'react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { ResponsiveFlex, ResponsiveContainer } from '../common/ResponsiveGrid'

export interface ResponsiveFormProps {
  children: React.ReactNode
  title?: string
  description?: string
  onSubmit?: (e: React.FormEvent) => void
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  card?: boolean
}

export const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  children,
  title,
  description,
  onSubmit,
  className = '',
  maxWidth = 'lg',
  card = true
}) => {
  const content = (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm sm:text-base text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </form>
  )

  if (card) {
    return (
      <ResponsiveContainer maxWidth={maxWidth}>
        <Card padding="lg" className="w-full">
          {content}
        </Card>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer maxWidth={maxWidth}>
      {content}
    </ResponsiveContainer>
  )
}

export interface FormSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  description,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

export interface FormRowProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  responsive?: boolean
}

export const FormRow: React.FC<FormRowProps> = ({
  children,
  className = '',
  columns = 1,
  gap = 'md',
  responsive = true
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }

  if (!responsive) {
    return (
      <div className={`grid grid-cols-${columns} ${gapClasses[gap]} ${className}`}>
        {children}
      </div>
    )
  }

  // Responsive grid based on column count
  const getResponsiveClasses = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-1 sm:grid-cols-2'
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      default:
        return 'grid-cols-1'
    }
  }

  return (
    <div className={`grid ${getResponsiveClasses()} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

export interface FormActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
  stack?: boolean
  responsive?: boolean
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className = '',
  align = 'right',
  stack = false,
  responsive = true
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }

  if (stack) {
    return (
      <div className={`flex flex-col space-y-3 ${responsive ? 'sm:flex-row sm:space-y-0 sm:space-x-3' : ''} ${alignClasses[align]} ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <ResponsiveFlex
      className={className}
      gap="md"
      responsive={responsive ? {
        mobile: { direction: 'col', align: 'stretch' },
        tablet: { direction: 'row', justify: align === 'between' ? 'between' : align === 'center' ? 'center' : align === 'left' ? 'start' : 'end' }
      } : undefined}
    >
      {children}
    </ResponsiveFlex>
  )
}

export interface MobileFormStepperProps {
  steps: Array<{
    id: string
    title: string
    description?: string
    completed?: boolean
    current?: boolean
  }>
  className?: string
}

export const MobileFormStepper: React.FC<MobileFormStepperProps> = ({
  steps,
  className = ''
}) => {
  const currentStep = steps.find(step => step.current)
  const currentIndex = steps.findIndex(step => step.current)
  const totalSteps = steps.length

  return (
    <div className={`bg-white border-b border-gray-200 px-4 py-3 sm:hidden ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {currentStep?.title}
          </p>
          <p className="text-xs text-gray-500">
            Step {currentIndex + 1} of {totalSteps}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {Math.round(((currentIndex + 1) / totalSteps) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}