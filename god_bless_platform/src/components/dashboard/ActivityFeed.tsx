/**
 * Activity Feed Component
 * Displays real-time activity updates and system events
 */

import React, { useState, useEffect } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { ActivityItem, ActivityType } from '../../types/models'

interface ActivityFeedProps {
  activities: ActivityItem[]
  className?: string
  maxItems?: number
  showFilters?: boolean
}

const activityTypeConfig: Record<ActivityType, {
  icon: React.ReactNode
  color: string
  bgColor: string
  label: string
}> = {
  project_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Project Created'
  },
  project_updated: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Project Updated'
  },
  project_deleted: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Project Deleted'
  },
  phone_numbers_generated: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Numbers Generated'
  },
  phone_numbers_validated: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Numbers Validated'
  },
  campaign_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'Campaign Created'
  },
  campaign_sent: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Campaign Sent'
  },
  task_completed: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Task Completed'
  },
  task_failed: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Task Failed'
  },
  user_login: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'User Login'
  },
  system_alert: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'System Alert'
  }
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities: initialActivities,
  className = '',
  maxItems = 50,
  showFilters = true
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>(initialActivities)
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  
  const { isConnected } = useWebSocket()

  // Update activities when props change
  useEffect(() => {
    setActivities(initialActivities)
  }, [initialActivities])

  // Apply filters
  useEffect(() => {
    let filtered = activities

    // Filter by type
    if (selectedTypes.size > 0) {
      filtered = filtered.filter(activity => selectedTypes.has(activity.type))
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(activity => 
        activity.message.toLowerCase().includes(term) ||
        activityTypeConfig[activity.type]?.label.toLowerCase().includes(term)
      )
    }

    // Limit items
    filtered = filtered.slice(0, maxItems)

    setFilteredActivities(filtered)
  }, [activities, selectedTypes, searchTerm, maxItems])

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  const toggleTypeFilter = (type: ActivityType) => {
    const newSelectedTypes = new Set(selectedTypes)
    if (newSelectedTypes.has(type)) {
      newSelectedTypes.delete(type)
    } else {
      newSelectedTypes.add(type)
    }
    setSelectedTypes(newSelectedTypes)
  }

  const clearFilters = () => {
    setSelectedTypes(new Set())
    setSearchTerm('')
  }

  const uniqueTypes = Array.from(new Set(activities.map(a => a.type)))

  return (
    <div className={`activity-feed bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <div className={`flex items-center space-x-2 text-sm ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {filteredActivities.length} of {activities.length} activities
          </div>
        </div>

        {showFilters && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-2">
              {uniqueTypes.map(type => {
                const config = activityTypeConfig[type]
                const isSelected = selectedTypes.has(type)
                
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`
                      inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors
                      ${isSelected 
                        ? `${config.color} ${config.bgColor} ring-2 ring-offset-1 ring-current` 
                        : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                      }
                    `}
                  >
                    {config.icon}
                    <span>{config.label}</span>
                  </button>
                )
              })}
              
              {(selectedTypes.size > 0 || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500">
              {activities.length === 0 ? 'No activities yet' : 'No activities match your filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity) => {
              const config = activityTypeConfig[activity.type]
              
              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 p-2 rounded-full ${config.bgColor} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {config.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.message}
                      </p>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityFeed