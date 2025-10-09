/**
 * Server Monitoring Dashboard Component
 * Real-time monitoring of proxy and SMTP server health and performance
 */

import React, { useState, useEffect } from 'react'
import type { ServerHealth, ServerUsageStats, PredictiveAnalytics } from '../../types/rotation'

interface ServerMonitoringProps {
  userId?: string
  campaignId?: string
  refreshInterval?: number
  onMaintenanceToggle?: (serverId: number, serverType: 'proxy' | 'smtp', enabled: boolean) => void
}

interface ServerMonitoringData {
  proxy_servers: ServerHealth[]
  smtp_servers: ServerHealth[]
  usage_stats: ServerUsageStats[]
  predictive_analytics: PredictiveAnalytics
  last_updated: string
}

const ServerMonitoring: React.FC<ServerMonitoringProps> = ({
  userId,
  campaignId,
  refreshInterval = 30000, // 30 seconds
  onMaintenanceToggle
}) => {
  const [data, setData] = useState<ServerMonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedServerType, setSelectedServerType] = useState<'all' | 'proxy' | 'smtp'>('all')
  const [maintenanceMode, setMaintenanceMode] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadServerData()
    const interval = setInterval(loadServerData, refreshInterval)
    return () => clearInterval(interval)
  }, [userId, campaignId, refreshInterval])

  const loadServerData = async () => {
    try {
      // TODO: Implement API call to load server monitoring data
      // const response = await serverMonitoringService.getServerHealth(userId, campaignId)
      // setData(response.data)
      
      // Mock data for now
      const mockData: ServerMonitoringData = {
        proxy_servers: [
          {
            id: 1,
            type: 'proxy',
            host: '192.168.1.100',
            port: 8080,
            is_healthy: true,
            success_rate: 98.5,
            predicted_failure_risk: 0.12,
            last_used: new Date(Date.now() - 5000).toISOString(),
            performance_score: 95.2,
            response_time: 120,
            error_count: 2,
            total_requests: 1250
          },
          {
            id: 2,
            type: 'proxy',
            host: '192.168.1.101',
            port: 8080,
            is_healthy: false,
            success_rate: 45.2,
            predicted_failure_risk: 0.89,
            last_used: new Date(Date.now() - 300000).toISOString(),
            performance_score: 32.1,
            response_time: 2500,
            error_count: 45,
            total_requests: 890
          },
          {
            id: 3,
            type: 'proxy',
            host: '192.168.1.102',
            port: 8080,
            is_healthy: true,
            success_rate: 92.1,
            predicted_failure_risk: 0.25,
            last_used: new Date(Date.now() - 2000).toISOString(),
            performance_score: 88.7,
            response_time: 180,
            error_count: 8,
            total_requests: 1100
          }
        ],
        smtp_servers: [
          {
            id: 1,
            type: 'smtp',
            host: 'smtp.gmail.com',
            port: 587,
            is_healthy: true,
            success_rate: 96.8,
            predicted_failure_risk: 0.08,
            last_used: new Date(Date.now() - 1000).toISOString(),
            performance_score: 94.5,
            response_time: 850,
            error_count: 3,
            total_requests: 2100
          },
          {
            id: 2,
            type: 'smtp',
            host: 'smtp.outlook.com',
            port: 587,
            is_healthy: true,
            success_rate: 94.2,
            predicted_failure_risk: 0.15,
            last_used: new Date(Date.now() - 8000).toISOString(),
            performance_score: 91.3,
            response_time: 1200,
            error_count: 12,
            total_requests: 1850
          }
        ],
        usage_stats: [],
        predictive_analytics: {
          completion_forecast: {
            estimated_completion_time: new Date(Date.now() + 3600000).toISOString(),
            confidence_interval: 0.85,
            factors: ['Server performance', 'Current load', 'Historical patterns']
          },
          server_predictions: [
            {
              server_id: 2,
              server_type: 'proxy',
              failure_risk: 0.89,
              recommended_action: 'Take server offline for maintenance'
            }
          ],
          optimization_suggestions: [
            {
              type: 'server_selection',
              title: 'Redistribute Load',
              description: 'Server #2 is showing high failure risk. Consider redistributing its load.',
              impact: 'high',
              confidence: 0.89,
              action: 'Enable maintenance mode for server #2',
              estimated_improvement: '+12% overall success rate'
            }
          ]
        },
        last_updated: new Date().toISOString()
      }
      
      setData(mockData)
      setError(null)
    } catch (err) {
      setError('Failed to load server monitoring data')
      console.error('Server monitoring error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMaintenanceToggle = async (serverId: number, serverType: 'proxy' | 'smtp') => {
    const key = `${serverType}-${serverId}`
    const newState = !maintenanceMode[key]
    
    try {
      // TODO: Implement API call to toggle maintenance mode
      // await serverMonitoringService.toggleMaintenanceMode(serverId, serverType, newState)
      
      setMaintenanceMode(prev => ({ ...prev, [key]: newState }))
      onMaintenanceToggle?.(serverId, serverType, newState)
      
      // Refresh data after maintenance mode change
      await loadServerData()
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err)
    }
  }

  const getHealthStatusColor = (isHealthy: boolean, successRate: number) => {
    if (!isHealthy || successRate < 50) return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
    if (successRate < 80) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
    return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
  }

  const getFailureRiskColor = (risk: number) => {
    if (risk > 0.7) return 'text-red-600'
    if (risk > 0.4) return 'text-yellow-600'
    return 'text-green-600'
  }

  const formatLastUsed = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading server data
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const allServers = [...data.proxy_servers, ...data.smtp_servers]
  const filteredServers = selectedServerType === 'all' 
    ? allServers 
    : allServers.filter(server => server.type === selectedServerType)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Server Monitoring Dashboard
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time health and performance monitoring • Last updated: {formatLastUsed(data.last_updated)}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedServerType}
            onChange={(e) => setSelectedServerType(e.target.value as 'all' | 'proxy' | 'smtp')}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Servers</option>
            <option value="proxy">Proxy Servers</option>
            <option value="smtp">SMTP Servers</option>
          </select>
          
          <button
            onClick={loadServerData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Predictive Alerts */}
      {data.predictive_analytics.server_predictions.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Server Failure Predictions
              </h3>
              <div className="mt-2 space-y-1">
                {data.predictive_analytics.server_predictions.map((prediction, index) => (
                  <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                    {prediction.server_type.toUpperCase()} Server #{prediction.server_id}: {prediction.recommended_action} 
                    (Risk: {Math.round(prediction.failure_risk * 100)}%)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => {
          const maintenanceKey = `${server.type}-${server.id}`
          const isInMaintenance = maintenanceMode[maintenanceKey]
          
          return (
            <div
              key={`${server.type}-${server.id}`}
              className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-l-4 ${
                isInMaintenance 
                  ? 'border-l-gray-400' 
                  : server.is_healthy 
                    ? 'border-l-green-400' 
                    : 'border-l-red-400'
              }`}
            >
              {/* Server Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {server.type.toUpperCase()} Server #{server.id}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {server.host}:{server.port}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Health Status */}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isInMaintenance 
                      ? 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                      : getHealthStatusColor(server.is_healthy, server.success_rate)
                  }`}>
                    {isInMaintenance ? 'Maintenance' : server.is_healthy ? 'Healthy' : 'Unhealthy'}
                  </span>
                  
                  {/* Maintenance Toggle */}
                  <button
                    onClick={() => handleMaintenanceToggle(server.id, server.type)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title={isInMaintenance ? 'Exit maintenance mode' : 'Enter maintenance mode'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Success Rate</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {server.success_rate.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Performance Score</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {server.performance_score.toFixed(1)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Response Time</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {server.response_time}ms
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Failure Risk</span>
                  <span className={`text-sm font-medium ${getFailureRiskColor(server.predicted_failure_risk)}`}>
                    {Math.round(server.predicted_failure_risk * 100)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Last Used</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatLastUsed(server.last_used)}
                  </span>
                </div>
                
                {server.total_requests && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Requests</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {server.total_requests} ({server.error_count} errors)
                    </span>
                  </div>
                )}
              </div>

              {/* Success Rate Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Success Rate</span>
                  <span>{server.success_rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      server.success_rate >= 90 ? 'bg-green-500' :
                      server.success_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(server.success_rate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Optimization Recommendations */}
      {data.predictive_analytics.optimization_suggestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h4 className="text-md font-medium text-blue-800 dark:text-blue-200 mb-4">
            Optimization Recommendations
          </h4>
          <div className="space-y-4">
            {data.predictive_analytics.optimization_suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {suggestion.title}
                    </h5>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      suggestion.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {suggestion.impact} impact
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {suggestion.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-blue-500 dark:text-blue-300">
                      Confidence: {Math.round(suggestion.confidence * 100)}%
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      {suggestion.estimated_improvement}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ServerMonitoring