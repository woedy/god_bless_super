/**
 * App Layout Component
 * Main application layout with sidebar and header
 */

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'
import type { BreadcrumbItem } from '../../types/ui'

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

/**
 * AppLayout Component
 * Provides the main application layout structure
 */
export function AppLayout({ children, breadcrumbs, className = '' }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
      />

      {/* Main Content Area */}
      <div 
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Header */}
        <Header 
          onSidebarToggle={handleSidebarToggle}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Breadcrumb Navigation */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}