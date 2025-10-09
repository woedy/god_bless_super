/**
 * App Layout Component
 * Main application layout with responsive sidebar and header
 */

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'
import { MobileNavigation } from './MobileNavigation'
import { useResponsive } from '../../hooks/useResponsive'
import type { BreadcrumbItem } from '../../types/ui'

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

/**
 * AppLayout Component
 * Provides the main application layout structure with responsive design
 */
export function AppLayout({ children, breadcrumbs, className = '' }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { isMobile } = useResponsive()

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileNavOpen(!mobileNavOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const handleMobileNavClose = () => {
    setMobileNavOpen(false)
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${className}`}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation 
        isOpen={mobileNavOpen}
        onClose={handleMobileNavClose}
      />

      {/* Main Content Area */}
      <div 
        className={`transition-all duration-300 ${
          isMobile 
            ? 'ml-0' 
            : sidebarCollapsed 
              ? 'ml-16' 
              : 'ml-64'
        }`}
      >
        {/* Header */}
        <Header 
          onSidebarToggle={handleSidebarToggle}
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
        />

        {/* Breadcrumb Navigation */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 transition-colors duration-200">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}