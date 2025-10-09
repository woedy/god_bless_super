/**
 * Responsive Grid Component
 * Flexible grid layout that adapts to different screen sizes
 */

import React from 'react'
import { responsiveUtils } from '../../hooks/useResponsive'

export interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  minItemWidth?: string
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
    largeDesktop?: number
  }
  autoFit?: boolean
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps & React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  gap = 'md',
  minItemWidth = '280px',
  columns,
  autoFit = false,
  ...props
}) => {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
    xl: 'gap-8 sm:gap-10'
  }

  // Auto-fit grid using CSS Grid
  if (autoFit) {
    return (
      <div 
        className={`grid ${gapClasses[gap]} ${className}`}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`
        }}
        {...props}
      >
        {children}
      </div>
    )
  }

  // Responsive columns using Tailwind classes
  if (columns) {
    const gridClasses = [
      columns.mobile ? `grid-cols-${columns.mobile}` : 'grid-cols-1',
      columns.tablet ? `sm:grid-cols-${columns.tablet}` : 'sm:grid-cols-2',
      columns.desktop ? `lg:grid-cols-${columns.desktop}` : 'lg:grid-cols-3',
      columns.largeDesktop ? `xl:grid-cols-${columns.largeDesktop}` : 'xl:grid-cols-4'
    ].join(' ')

    return (
      <div className={`grid ${gridClasses} ${gapClasses[gap]} ${className}`} {...props}>
        {children}
      </div>
    )
  }

  // Default responsive grid
  return (
    <div className={`grid ${responsiveUtils.gridCols.mobile} ${responsiveUtils.gridCols.tablet} ${responsiveUtils.gridCols.desktop} ${gapClasses[gap]} ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Responsive Flex Container
 */
export interface ResponsiveFlexProps {
  children: React.ReactNode
  className?: string
  direction?: 'row' | 'col'
  wrap?: boolean
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  responsive?: {
    mobile?: {
      direction?: 'row' | 'col'
      align?: 'start' | 'center' | 'end' | 'stretch'
      justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
    }
    tablet?: {
      direction?: 'row' | 'col'
      align?: 'start' | 'center' | 'end' | 'stretch'
      justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
    }
    desktop?: {
      direction?: 'row' | 'col'
      align?: 'start' | 'center' | 'end' | 'stretch'
      justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
    }
  }
}

export const ResponsiveFlex: React.FC<ResponsiveFlexProps & React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  direction = 'row',
  wrap = false,
  gap = 'md',
  align = 'start',
  justify = 'start',
  responsive,
  ...props
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }

  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  }

  let classes = [
    'flex',
    directionClasses[direction],
    alignClasses[align],
    justifyClasses[justify],
    gapClasses[gap],
    wrap ? 'flex-wrap' : ''
  ]

  // Add responsive classes
  if (responsive?.mobile) {
    if (responsive.mobile.direction) {
      classes.push(`${directionClasses[responsive.mobile.direction]}`)
    }
    if (responsive.mobile.align) {
      classes.push(`${alignClasses[responsive.mobile.align]}`)
    }
    if (responsive.mobile.justify) {
      classes.push(`${justifyClasses[responsive.mobile.justify]}`)
    }
  }

  if (responsive?.tablet) {
    if (responsive.tablet.direction) {
      classes.push(`sm:${directionClasses[responsive.tablet.direction]}`)
    }
    if (responsive.tablet.align) {
      classes.push(`sm:${alignClasses[responsive.tablet.align]}`)
    }
    if (responsive.tablet.justify) {
      classes.push(`sm:${justifyClasses[responsive.tablet.justify]}`)
    }
  }

  if (responsive?.desktop) {
    if (responsive.desktop.direction) {
      classes.push(`lg:${directionClasses[responsive.desktop.direction]}`)
    }
    if (responsive.desktop.align) {
      classes.push(`lg:${alignClasses[responsive.desktop.align]}`)
    }
    if (responsive.desktop.justify) {
      classes.push(`lg:${justifyClasses[responsive.desktop.justify]}`)
    }
  }

  return (
    <div className={`${classes.join(' ')} ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Responsive Container
 */
export interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  padding?: boolean
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps & React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  maxWidth = 'full',
  padding = true,
  ...props
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full'
  }

  const paddingClasses = padding ? 'px-4 sm:px-6 lg:px-8' : ''

  return (
    <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${paddingClasses} ${className}`} {...props}>
      {children}
    </div>
  )
}