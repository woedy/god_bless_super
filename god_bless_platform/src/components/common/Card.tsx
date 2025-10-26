/**
 * Card Component
 * Reusable card container component
 */

import React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'sm',
  border = true,
  hover = false,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  }

  const baseClasses = `
    theme-surface rounded-xl transition-colors duration-200
    ${paddingClasses[padding]}
    ${shadowClasses[shadow]}
    ${border ? 'border theme-border' : 'border border-transparent'}
    ${hover ? 'hover:shadow-md transition-shadow duration-200' : ''}
    ${className}
  `.trim()

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  )
}