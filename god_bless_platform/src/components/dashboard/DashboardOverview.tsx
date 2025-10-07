/**
 * Dashboard Overview Component
 * Main dashboard component that displays key metrics and system overview
 */

import React, { useEffect, useState } from 'react'
import { dashboardService } from '../../services'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { DashboardMetrics } from '../../types/models'
import type { DashboardFilters } from '../../types/api'
import MetricsCard from './MetricsCard'
import ActivityFeed from './ActivityFeed'
import SystemHealthChart from './SystemHealthChart'
import TaskProgressMonitor from './TaskProgressMonitor'

interface DashboardOverviewProps {
  projectId?: string
  className?: string
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  projectId,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  const { isConnected } = useWebSocket()

  // Load dashboard metrics
  const loadDashboardMetrics = async (filters?: DashboardFilters) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await dashboardService.getDashboardMetrics({
        projectId,
        timeRange: '24h',
        ...filters
      })
      
      if (response.success) {
        console.log('Dashboard data received:', response.data)
        setMetrics(response.data)
        setLastUpdated(new Date())
      } else {
        setError('Failed to load dashboard metrics')
      }
    } catch (err) {
      console.error('Error loading dashboard metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  // Refresh dashboard data
  const handleRefresh = async () => {
    await loadDashboardMetrics()
  }

  // Initial load
  useEffect(() => {
    loadDashboardMetrics()
  }, [projectId])

  // Auto-refresh every 30 seconds when WebSocket is not connected
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        loadDashboardMetrics()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [isConnected])

  if (loading && !metrics) {
    return (
      <div className={`dashboard-overview ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <div className={`dashboard-overview ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={handleRefresh}
                className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className={`dashboard-overview space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
            {!isConnected && (
              <span className="ml-2 text-amber-600">
                (Auto-refreshing - WebSocket disconnected)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Real-time' : 'Offline'}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Projects"
          value={metrics.overview?.totalProjects || 0}
          subtitle={`${metrics.overview?.activeProjects || 0} active`}
          icon="folder"
          trend={{ value: 0, direction: 'neutral' }}
        />
        <MetricsCard
          title="Phone Numbers"
          value={metrics.overview?.totalPhoneNumbers || 0}
          subtitle={`${metrics.overview?.validPhoneNumbers || 0} valid`}
          icon="phone"
          trend={{ 
            value: (metrics.overview?.totalPhoneNumbers || 0) > 0 
              ? Math.round(((metrics.overview?.validPhoneNumbers || 0) / (metrics.overview?.totalPhoneNumbers || 1)) * 100)
              : 0, 
            direction: 'neutral',
            suffix: '% valid'
          }}
        />
        <MetricsCard
          title="SMS Campaigns"
          value={metrics.overview?.totalCampaigns || 0}
          subtitle="Total campaigns"
          icon="mail"
          trend={{ value: 0, direction: 'neutral' }}
        />
        <MetricsCard
          title="Active Tasks"
          value={metrics.overview?.activeTasks || 0}
          subtitle={`${metrics.overview?.completedTasks24h || 0} completed today`}
          icon="clock"
          trend={{ value: 0, direction: 'neutral' }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Chart */}
        <div className="lg:col-span-2">
          {metrics.systemHealth && (
            <SystemHealthChart 
              systemHealth={metrics.systemHealth}
              className="h-80"
            />
          )}
        </div>

        {/* Task Progress Monitor */}
        <div>
          {metrics.taskSummary && (
            <TaskProgressMonitor 
              taskSummary={metrics.taskSummary}
              className="h-80"
            />
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          {metrics.recentActivity && (
            <ActivityFeed 
              activities={metrics.recentActivity}
              className="h-96"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardOverview