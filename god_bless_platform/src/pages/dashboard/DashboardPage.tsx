/**
 * Dashboard Page
 * Main dashboard with overview and metrics
 */

import { AppLayout } from '../../components/layout'
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
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome to the God Bless Platform. Monitor your projects and activities.
            </p>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Total Projects</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">12</p>
            <p className="text-sm text-gray-500 mt-1">+2 from last month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Phone Numbers</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">1.2M</p>
            <p className="text-sm text-gray-500 mt-1">Generated this month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">SMS Campaigns</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">45</p>
            <p className="text-sm text-gray-500 mt-1">Active campaigns</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Tasks</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">8</p>
            <p className="text-sm text-gray-500 mt-1">Running in background</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-gray-900">Phone number generation completed for Project Alpha</p>
                <span className="text-xs text-gray-500">2 minutes ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm text-gray-900">SMS campaign "Summer Sale" sent to 5,000 recipients</p>
                <span className="text-xs text-gray-500">1 hour ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <p className="text-sm text-gray-900">Validation task completed with warnings</p>
                <span className="text-xs text-gray-500">3 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}