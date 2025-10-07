/**
 * Dashboard Page
 * Main dashboard with overview and metrics using real-time data
 */

import React, { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layout'
import { DashboardOverview } from '../../components/dashboard'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { BreadcrumbItem } from '../../types/ui'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    isActive: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    )
  }
]

/**
 * Dashboard Page Component
 */
export function DashboardPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
  const { isConnected, connectionStatus } = useWebSocket()

  // Handle project context switching
  const handleProjectChange = (projectId?: string) => {
    setSelectedProjectId(projectId)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Real-time connection unavailable
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  Dashboard will auto-refresh every 30 seconds. Status: {connectionStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Project Filter */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitor your projects, tasks, and system performance in real-time.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Project Selector - TODO: Implement when project context is available */}
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleProjectChange(e.target.value || undefined)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {/* TODO: Populate with actual projects */}
            </select>
            
            {/* Real-time Status Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-600">
                {isConnected ? 'Live Updates' : 'Auto-refresh'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <DashboardOverview 
          projectId={selectedProjectId}
          className="min-h-screen"
        />
      </div>
    </AppLayout>
  )
}