/**
 * Sidebar Component
 * Responsive navigation sidebar with menu items
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { NavigationItem } from '../../types/ui'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  className?: string
}

/**
 * Sidebar Component
 * Main navigation sidebar
 */
export function Sidebar({ isCollapsed, onToggle: _onToggle, className = '' }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Navigation items configuration
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      )
    },
    {
      id: 'projects',
      label: 'Projects',
      href: '/projects',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'phone-numbers',
      label: 'Phone Numbers',
      href: '/phone-numbers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      children: [
        {
          id: 'generate',
          label: 'Generate',
          href: '/phone-numbers/generate',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          )
        },
        {
          id: 'validate',
          label: 'Validate',
          href: '/phone-numbers/validate',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
          )
        },
        {
          id: 'list',
          label: 'List & Manage',
          href: '/phone-numbers/list',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'sms',
      label: 'SMS',
      href: '/sms',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      children: [
        {
          id: 'sms-overview',
          label: 'Overview',
          href: '/sms',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h12M3 17h8" />
            </svg>
          )
        },
        {
          id: 'sms-single',
          label: 'Send Single SMS',
          href: '/sms/single',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8h4.586a1 1 0 01.707 1.707l-9 9a1 1 0 01-1.414 0l-4.586-4.586a1 1 0 010-1.414L9 7.293m6 0L17.707 4.586a1 1 0 011.414 0L21 6.465a1 1 0 010 1.414L17.707 11.172" />
            </svg>
          )
        },
        {
          id: 'bulk-sms',
          label: 'Send Bulk SMS',
          href: '/sms/bulk',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h2M7 5h14M5 5v14m4-14v14m4-14v14m4-14v14" />
            </svg>
          )
        },
        {
          id: 'sms-delivery',
          label: 'Delivery Settings',
          href: '/settings/sms/delivery',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 16v-2m8-6h2M4 12H2m15.364-5.364l1.414-1.414M5.222 18.778l-1.414 1.414m0-15.192L5.222 5.22M18.778 18.778l1.414 1.414M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )
        }
        ,
        {
          id: 'proxy-health-checker',
          label: 'Proxy Health Checker',
          href: '/settings/proxy/health',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'tasks',
      label: 'Tasks',
      href: '/tasks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings/sms/delivery',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ]

  // Check if a navigation item is active
  const isActive = (item: NavigationItem): boolean => {
    if (item.href === location.pathname) return true
    if (item.children) {
      return item.children.some(child => child.href === location.pathname)
    }
    return false
  }

  // Render navigation item
  const renderNavItem = (item: NavigationItem, level = 0) => {
    const active = isActive(item)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = active || (hasChildren && item.children?.some(child => child.href === location.pathname))

    return (
      <div key={item.id} className="relative">
        <Link
          to={item.href}
          className={`
            flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
            ${level === 0 ? 'mx-2' : 'mx-4 ml-6'}
            ${active 
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-400' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            }
            ${isCollapsed && level === 0 ? 'justify-center' : ''}
          `}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {/* Icon */}
          <span className={`flex-shrink-0 ${isCollapsed && level === 0 ? '' : 'mr-3'}`}>
            {item.icon}
          </span>

          {/* Label */}
          {(!isCollapsed || level > 0) && (
            <>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <svg 
                  className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </>
          )}
        </Link>

        {/* Tooltip for collapsed sidebar */}
        {isCollapsed && level === 0 && hoveredItem === item.id && (
          <div className="absolute left-16 top-0 z-50 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-sm rounded shadow-lg whitespace-nowrap">
            {item.label}
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (!isCollapsed || level > 0) && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`
        fixed left-0 top-0 h-full theme-surface border-r theme-border shadow-sm z-40 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${className}
      `}
    >
      {/* Logo/Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b theme-border">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GB</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              God Bless Platform
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">GB</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navigationItems.map(item => renderNavItem(item))}
        </div>
      </nav>

      {/* User Info */}
      {user && (
        <div className="border-t theme-border p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user.firstName?.[0] || user.email[0].toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
