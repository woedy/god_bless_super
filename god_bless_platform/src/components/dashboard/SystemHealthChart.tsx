/**
 * System Health Chart Component
 * Displays system performance visualization with health metrics
 */

import React, { useState } from 'react'
import type { SystemHealth, HealthStatus } from '../../types/models'

interface SystemHealthChartProps {
  systemHealth: SystemHealth
  className?: string
}

const healthStatusConfig: Record<HealthStatus, {
  color: string
  bgColor: string
  label: string
  icon: React.ReactNode
}> = {
  healthy: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Healthy',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  warning: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Warning',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    )
  },
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Critical',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  unknown: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Unknown',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
}

export const SystemHealthChart: React.FC<SystemHealthChartProps> = ({
  systemHealth,
  className = ''
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'components' | 'resources'>('overview')

  const getUsageColor = (usage: number, thresholds?: { warning: number; critical: number }): string => {
    if (!thresholds) return 'bg-blue-500'
    
    if (usage >= thresholds.critical) return 'bg-red-500'
    if (usage >= thresholds.warning) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Utility function for formatting uptime (currently unused but may be needed for future features)
  // const formatUptime = (seconds: number): string => {
  //   const days = Math.floor(seconds / 86400)
  //   const hours = Math.floor((seconds % 86400) / 3600)
  //   const minutes = Math.floor((seconds % 3600) / 60)
  //   
  //   if (days > 0) return `${days}d ${hours}h ${minutes}m`
  //   if (hours > 0) return `${hours}h ${minutes}m`
  //   return `${minutes}m`
  // }

  const overallConfig = healthStatusConfig[systemHealth.overall]

  return (
    <div className={`system-health-chart bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${overallConfig.bgColor} ${overallConfig.color}`}>
            {overallConfig.icon}
            <span>{overallConfig.label}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'components', label: 'Components' },
            { key: 'resources', label: 'Resources' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as 'overview' | 'components' | 'resources')}
              className={`
                flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${selectedTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Object.values(systemHealth.components).filter(c => c.status === 'healthy').length}
                </div>
                <div className="text-sm text-gray-600">Healthy Components</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round((systemHealth.resources.cpu.usage + systemHealth.resources.memory.usage) / 2)}%
                </div>
                <div className="text-sm text-gray-600">Avg Resource Usage</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU Usage</span>
                  <span>{systemHealth.resources.cpu.usage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(systemHealth.resources.cpu.usage, systemHealth.resources.cpu.threshold)}`}
                    style={{ width: `${systemHealth.resources.cpu.usage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory Usage</span>
                  <span>{systemHealth.resources.memory.usage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(systemHealth.resources.memory.usage, systemHealth.resources.memory.threshold)}`}
                    style={{ width: `${systemHealth.resources.memory.usage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Disk Usage</span>
                  <span>{systemHealth.resources.disk.usage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(systemHealth.resources.disk.usage, systemHealth.resources.disk.threshold)}`}
                    style={{ width: `${systemHealth.resources.disk.usage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'components' && (
          <div className="space-y-3">
            {Object.entries(systemHealth.components).map(([name, component]) => {
              const config = healthStatusConfig[component.status]
              
              return (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-1 rounded-full ${config.bgColor} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {name.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {component.message}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${config.color}`}>
                      {config.label}
                    </div>
                    {component.responseTime && (
                      <div className="text-xs text-gray-500">
                        {component.responseTime}ms
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedTab === 'resources' && (
          <div className="space-y-4">
            {Object.entries(systemHealth.resources).map(([name, resource]) => {
              const config = healthStatusConfig[resource.status]
              
              return (
                <div key={name} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded-full ${config.bgColor} ${config.color}`}>
                        {config.icon}
                      </div>
                      <span className="font-medium text-gray-900 capitalize">
                        {name}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Usage</span>
                      <span>{resource.usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(resource.usage, resource.threshold)}`}
                        style={{ width: `${resource.usage}%` }}
                      ></div>
                    </div>
                    
                    {name === 'memory' && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Available: {formatBytes(resource.available)}</span>
                        <span>Warning: {resource.threshold.warning}%</span>
                      </div>
                    )}
                    
                    {name === 'disk' && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Available: {formatBytes(resource.available)}</span>
                        <span>Critical: {resource.threshold.critical}%</span>
                      </div>
                    )}
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

export default SystemHealthChart