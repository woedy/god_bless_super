/**
 * Smart Delivery Dashboard Component
 * Real-time analytics for carrier performance and delivery optimization
 */

import React, { useState, useEffect, useCallback } from 'react'
import type { 
  CarrierPerformance, 
  CampaignProgress, 
  OptimizationRecommendation,
  PredictiveAnalytics 
} from '../../types/rotation'

interface SmartDeliveryDashboardProps {
  campaignId?: string
  userId?: string
  refreshInterval?: number
  onOptimizationApply?: (recommendations: OptimizationRecommendation[]) => void
}

interface DeliveryAnalytics {
  carrier_performance: CarrierPerformance[]
  campaign_progress: CampaignProgress | null
  predictive_analytics: PredictiveAnalytics
  delivery_trends: {
    hourly_delivery_rates: Array<{ hour: string; rate: number; volume: number }>
    carrier_success_trends: Array<{ carrier: string; trend: number; change: string }>
    server_utilization: Array<{ server_id: number; server_type: 'proxy' | 'smtp'; utilization: number }>
  }
  optimization_opportunities: OptimizationRecommendation[]
  last_updated: string
}

const SmartDeliveryDashboard: React.FC<SmartDeliveryDashboardProps> = ({
  campaignId,
  userId,
  refreshInterval = 15000, // 15 seconds
  onOptimizationApply
}) => {
  const [data, setData] = useState<DeliveryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('6h')

  const loadDeliveryData = useCallback(async () => {
    try {
      // TODO: Implement API call to load delivery analytics
      // const response = await smartDeliveryService.getDeliveryAnalytics(campaignId, userId, timeRange)
      // setData(response.data)
      
      // Mock data for now
      const mockData: DeliveryAnalytics = {
        carrier_performance: [
          {
            carrier: 'Verizon',
            proxy_server_id: 1,
            smtp_server_id: 1,
            success_rate: 96.8,
            average_delivery_time: 2.3,
            messages_sent: 1250,
            last_updated: new Date().toISOString()
          },
          {
            carrier: 'AT&T',
            proxy_server_id: 2,
            smtp_server_id: 2,
            success_rate: 94.2,
            average_delivery_time: 3.1,
            messages_sent: 980,
            last_updated: new Date().toISOString()
          },
          {
            carrier: 'T-Mobile',
            proxy_server_id: 1,
            smtp_server_id: 1,
            success_rate: 92.5,
            average_delivery_time: 2.8,
            messages_sent: 750,
            last_updated: new Date().toISOString()
          },
          {
            carrier: 'Sprint',
            proxy_server_id: 3,
            smtp_server_id: 2,
            success_rate: 89.1,
            average_delivery_time: 4.2,
            messages_sent: 420,
            last_updated: new Date().toISOString()
          }
        ],
        campaign_progress: campaignId ? {
          campaign_id: campaignId,
          total_messages: 5000,
          sent_messages: 3400,
          delivered_messages: 3180,
          failed_messages: 220,
          pending_messages: 1600,
          current_server_usage: {
            proxy_servers: [
              {
                server_id: 1,
                server_type: 'proxy',
                messages_processed: 1800,
                successful_messages: 1740,
                failed_messages: 60,
                success_rate: 96.7,
                average_response_time: 120,
                last_used: new Date(Date.now() - 5000).toISOString()
              },
              {
                server_id: 2,
                server_type: 'proxy',
                messages_processed: 1200,
                successful_messages: 1110,
                failed_messages: 90,
                success_rate: 92.5,
                average_response_time: 180,
                last_used: new Date(Date.now() - 2000).toISOString()
              }
            ],
            smtp_servers: [
              {
                server_id: 1,
                server_type: 'smtp',
                messages_processed: 2100,
                successful_messages: 2020,
                failed_messages: 80,
                success_rate: 96.2,
                average_response_time: 850,
                last_used: new Date(Date.now() - 1000).toISOString()
              },
              {
                server_id: 2,
                server_type: 'smtp',
                messages_processed: 1300,
                successful_messages: 1160,
                failed_messages: 140,
                success_rate: 89.2,
                average_response_time: 1200,
                last_used: new Date(Date.now() - 8000).toISOString()
              }
            ]
          },
          real_time_metrics: {
            messages_per_minute: 45,
            success_rate: 93.5,
            average_delivery_time: 2.8,
            active_servers: 4
          },
          estimated_completion: new Date(Date.now() + 2100000).toISOString(), // 35 minutes
          progress_percentage: 68
        } : null,
        predictive_analytics: {
          completion_forecast: {
            estimated_completion_time: new Date(Date.now() + 2100000).toISOString(),
            confidence_interval: 0.87,
            factors: ['Current delivery rate', 'Server performance', 'Carrier patterns']
          },
          server_predictions: [],
          optimization_suggestions: [
            {
              type: 'server_selection',
              title: 'Optimize Carrier Routing',
              description: 'Switch Sprint traffic to Proxy #1 + SMTP #1 for 12% improvement',
              impact: 'medium',
              confidence: 0.78,
              action: 'Update carrier routing rules',
              estimated_improvement: '+12% Sprint success rate'
            }
          ]
        },
        delivery_trends: {
          hourly_delivery_rates: [
            { hour: '00:00', rate: 94.2, volume: 120 },
            { hour: '01:00', rate: 95.1, volume: 98 },
            { hour: '02:00', rate: 93.8, volume: 85 },
            { hour: '03:00', rate: 96.2, volume: 110 },
            { hour: '04:00', rate: 94.7, volume: 145 },
            { hour: '05:00', rate: 92.3, volume: 180 }
          ],
          carrier_success_trends: [
            { carrier: 'Verizon', trend: 2.3, change: 'up' },
            { carrier: 'AT&T', trend: -1.2, change: 'down' },
            { carrier: 'T-Mobile', trend: 0.8, change: 'up' },
            { carrier: 'Sprint', trend: -3.1, change: 'down' }
          ],
          server_utilization: [
            { server_id: 1, server_type: 'proxy', utilization: 75 },
            { server_id: 2, server_type: 'proxy', utilization: 60 },
            { server_id: 1, server_type: 'smtp', utilization: 85 },
            { server_id: 2, server_type: 'smtp', utilization: 45 }
          ]
        },
        optimization_opportunities: [
          {
            type: 'timing',
            title: 'Peak Hour Optimization',
            description: 'Delivery rates are 8% higher between 3-5 AM. Consider scheduling more messages during this window.',
            impact: 'medium',
            confidence: 0.82,
            action: 'Adjust delivery scheduling',
            estimated_improvement: '+8% overall success rate'
          },
          {
            type: 'configuration',
            title: 'Load Balancing Adjustment',
            description: 'SMTP Server #2 is underutilized while Server #1 is at capacity. Redistribute load for better performance.',
            impact: 'low',
            confidence: 0.65,
            action: 'Update load balancing weights',
            estimated_improvement: '+3% throughput'
          }
        ],
        last_updated: new Date().toISOString()
      }
      
      setData(mockData)
      setError(null)
    } catch (err) {
      setError('Failed to load delivery analytics')
      console.error('Delivery analytics error:', err)
    } finally {
      setLoading(false)
    }
  }, [campaignId]) // These dependencies are needed for API calls

  useEffect(() => {
    loadDeliveryData()
    const interval = setInterval(loadDeliveryData, refreshInterval)
    return () => clearInterval(interval)
  }, [loadDeliveryData, refreshInterval])

  const handleApplyOptimization = async (recommendation: OptimizationRecommendation) => {
    try {
      // TODO: Implement API call to apply optimization
      // await smartDeliveryService.applyOptimization(recommendation)
      
      onOptimizationApply?.([recommendation])
      
      // Refresh data after applying optimization
      await loadDeliveryData()
    } catch (err) {
      console.error('Failed to apply optimization:', err)
    }
  }

  // const formatDuration = (seconds: number) => {
  //   const hours = Math.floor(seconds / 3600)
  //   const minutes = Math.floor((seconds % 3600) / 60)
  //   if (hours > 0) return `${hours}h ${minutes}m`
  //   return `${minutes}m`
  // }

  const formatTimeUntil = (timestamp: string) => {
    const diff = new Date(timestamp).getTime() - Date.now()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
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
              Error loading delivery analytics
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const filteredCarriers = selectedCarrier === 'all' 
    ? data.carrier_performance 
    : data.carrier_performance.filter(c => c.carrier === selectedCarrier)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Smart Delivery Dashboard
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time carrier performance and delivery optimization analytics
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Carriers</option>
            {data.carrier_performance.map(carrier => (
              <option key={carrier.carrier} value={carrier.carrier}>
                {carrier.carrier}
              </option>
            ))}
          </select>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '6h' | '24h' | '7d')}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Campaign Progress (if campaign is active) */}
      {data.campaign_progress && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Campaign Progress
            </h4>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>ETA: {formatTimeUntil(data.campaign_progress.estimated_completion)}</span>
              <span>•</span>
              <span>{data.campaign_progress.real_time_metrics.messages_per_minute} msg/min</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{data.campaign_progress.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${data.campaign_progress.progress_percentage}%` }}
              />
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.campaign_progress.total_messages.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.campaign_progress.sent_messages.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {data.campaign_progress.delivered_messages.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {data.campaign_progress.failed_messages.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {data.campaign_progress.pending_messages.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
            </div>
          </div>
        </div>
      )}

      {/* Carrier Performance */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Carrier Performance Analytics
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCarriers.map((carrier) => {
            const trend = data.delivery_trends.carrier_success_trends.find(t => t.carrier === carrier.carrier)
            
            return (
              <div key={carrier.carrier} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    {carrier.carrier}
                  </h5>
                  {trend && (
                    <div className={`flex items-center text-xs ${
                      trend.change === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <svg className={`w-3 h-3 mr-1 ${trend.change === 'down' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      {Math.abs(trend.trend)}%
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Success Rate</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {carrier.success_rate.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Avg Delivery</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {carrier.average_delivery_time.toFixed(1)}s
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Messages</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {carrier.messages_sent.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Server Combo</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      P{carrier.proxy_server_id}/S{carrier.smtp_server_id}
                    </span>
                  </div>
                </div>
                
                {/* Success Rate Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        carrier.success_rate >= 95 ? 'bg-green-500' :
                        carrier.success_rate >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(carrier.success_rate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Server Usage Breakdown */}
      {data.campaign_progress && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proxy Servers */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Proxy Server Usage
            </h4>
            <div className="space-y-4">
              {data.campaign_progress.current_server_usage.proxy_servers.map((server) => (
                <div key={server.server_id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Proxy Server #{server.server_id}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {server.success_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${server.success_rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{server.messages_processed} messages</span>
                      <span>{server.average_response_time}ms avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SMTP Servers */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              SMTP Server Usage
            </h4>
            <div className="space-y-4">
              {data.campaign_progress.current_server_usage.smtp_servers.map((server) => (
                <div key={server.server_id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        SMTP Server #{server.server_id}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {server.success_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${server.success_rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{server.messages_processed} messages</span>
                      <span>{server.average_response_time}ms avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Optimization Opportunities */}
      {data.optimization_opportunities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Optimization Opportunities
          </h4>
          <div className="space-y-4">
            {data.optimization_opportunities.map((opportunity, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                        {opportunity.title}
                      </h5>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        opportunity.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        opportunity.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {opportunity.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {opportunity.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        Confidence: {Math.round(opportunity.confidence * 100)}%
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {opportunity.estimated_improvement}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyOptimization(opportunity)}
                    className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictive Completion Forecast */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
        <h4 className="text-md font-medium text-indigo-800 dark:text-indigo-200 mb-4">
          Completion Forecast
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatTimeUntil(data.predictive_analytics.completion_forecast.estimated_completion_time)}
            </div>
            <div className="text-sm text-indigo-500 dark:text-indigo-300">Estimated Completion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round(data.predictive_analytics.completion_forecast.confidence_interval * 100)}%
            </div>
            <div className="text-sm text-indigo-500 dark:text-indigo-300">Confidence Level</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              Based on:
            </div>
            <div className="text-xs text-indigo-500 dark:text-indigo-300">
              {data.predictive_analytics.completion_forecast.factors.join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SmartDeliveryDashboard