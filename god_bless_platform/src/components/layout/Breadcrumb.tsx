/**
 * Breadcrumb Component
 * Navigation breadcrumb trail
 */

import { Link } from 'react-router-dom'
import type { BreadcrumbItem } from '../../types/ui'

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
}

/**
 * Breadcrumb Component
 * Shows navigation path with clickable links
 */
export function Breadcrumb({ 
  items, 
  separator = (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  className = '' 
}: BreadcrumbProps) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isActive = item.isActive || isLast

          return (
            <li key={index} className="flex items-center">
              {/* Separator (except for first item) */}
              {index > 0 && (
                <span className="mx-2 flex-shrink-0" aria-hidden="true">
                  {separator}
                </span>
              )}

              {/* Breadcrumb Item */}
              <div className="flex items-center">
                {/* Icon */}
                {item.icon && (
                  <span className="mr-2 flex-shrink-0 text-gray-400">
                    {item.icon}
                  </span>
                )}

                {/* Link or Text */}
                {item.href && !isActive ? (
                  <Link
                    to={item.href}
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-200 font-medium"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span 
                    className={`font-medium ${
                      isActive 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Helper function to create breadcrumb items from route path
 */
export function createBreadcrumbsFromPath(pathname: string, customLabels?: Record<string, string>): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Add home/dashboard as first item
  breadcrumbs.push({
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    )
  })

  // Build breadcrumbs from path segments
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1

    // Get custom label or format segment
    const label = customLabels?.[segment] || formatSegmentLabel(segment)

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      isActive: isLast
    })
  })

  return breadcrumbs
}

/**
 * Format path segment into readable label
 */
function formatSegmentLabel(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}