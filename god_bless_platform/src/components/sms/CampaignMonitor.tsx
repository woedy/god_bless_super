/**
 * CampaignMonitor Component
 * Real-time monitoring of SMS campaign progress and status
 */

import React, { useState, useEffect } from 'react'
import { smsService, websocketManager } from '../../services'
import type { Campaign } from '../../types'

interface CampaignMonitorProps {
  campaign: Campaign
  onCampaignUpdate?: (campaign: Campaign) => void
  showControls?: boolean
}

interface CampaignStats {
  campaign_id: string
  campaign_name: string
  status: string
  progress: number
  total_messages: number
  messages_sent: number
  messages_failed: number
  pending_messages: number
  created_at: string
  started_at?: string
  completed_at?: string
  scheduled_time?: string
  status_breakdown: Record<string, number>
  carrier_breakdown: Record<string, number>
}

export const CampaignMonitor: React.FC<CampaignMonitorProps> = ({
  campaign,
  onCampaignUpdate,
  showControls = true
}) => {
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Load initial stats
  useEffect(() => {
    loadCampaignStats()
  }, [campaign.id])

  // Set up WebSocket subscription for real-time updates
  useEffect(() => {
    const handleCampaignUpdate = (data: any) => {
      if (data.campaign_id === campaign.id) {
        setStats(prev => prev ? { ...prev, ...data } : null)
        
        // Update parent component if callback provided
        if (onCampaignUpdate && data.campaign) {
          onCampaignUpdate(data.campaign)
        }
      }
    }

    // Subscribe to campaign updates
    websocketManager.subscribe(`campaign_${campaign.id}`, handleCampaignUpdate)

    return () => {
      websocketManager.unsubscribe(`campaign_${campaign.id}`)
    }
  }, [campaign.id, onCampaignUpdate])

  const loadCampaignStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await smsService.getCampaignReport(campaign.id)
      
      if (response.success) {
        setStats(response.data)
      } else {
        throw new Error('Failed to load campaign stats')
      }
    } catch (error) {
      console.error('Failed to load campaign stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to load campaign stats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCampaignAction = async (action: 'start' | 'pause' | 'cancel') => {
    setActionLoading(action)
    setError(null)

    try {
      let response
      switch (action) {
        case 'start':
          response = await smsService.startCampaign(campaign.id)
          break
        case 'pause':
          response = await smsService.pauseCampaign(campaign.id)
          break
        case 'cancel':
          response = await smsService.cancelCampaign(campaign.id)
          break
      }

      if (response.success) {
        // Reload stats after action
        await loadCampaignStats()
      } else {
        throw new Error(`Failed to ${action} campaign`)
      }
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error)
      setError(error instanceof Error ? error.message : `Failed to ${action} campaign`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-orange-100 text-orange-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const calculateSuccessRate = () => {
    if (!stats || stats.total_messages === 0) return 0
    return Math.round((stats.messages_sent / stats.total_messages) * 100)
  }

  if (isLoading && !stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Failed to load campaign stats</div>
          <button
            onClick={loadCampaignStats}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {stats.campaign_name}
            </h3>
            <div className="flex items-center mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stats.status)}`}
              >
                {stats.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                ID: {stats.campaign_id}
              </span>
            </div>
          </div>

          {/* Campaign Controls */}
          {showControls && (
            <div className="flex space-x-2">
              {stats.status === 'draft' && (
                <button
                  onClick={() => handleCampaignAction('start')}
                  disabled={actionLoading === 'start'}
                  className="px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {actionLoading === 'start' ? 'Starting...' : 'Start'}
                </button>
              )}

              {stats.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => handleCampaignAction('pause')}
                    disabled={actionLoading === 'pause'}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {actionLoading === 'pause' ? 'Pausing...' : 'Pause'}
                  </button>
                  <button
                    onClick={() => handleCampaignAction('cancel')}
                    disabled={actionLoading === 'cancel'}
                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel'}
                  </button>
                </>
              )}

              {stats.status === 'paused' && (
                <>
                  <button
                    onClick={() => handleCampaignAction('start')}
                    disabled={actionLoading === 'start'}
                    className="px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {actionLoading === 'start' ? 'Resuming...' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleCampaignAction('cancel')}
                    disabled={actionLoading === 'cancel'}
                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {stats.status === 'in_progress' && (
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{stats.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {stats.total_messages.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Messages</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.messages_sent.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Sent</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.messages_failed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {calculateSuccessRate()}%
            </div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </div>
        </div>

        {/* Status Breakdown */}
        {stats.status_breakdown && Object.keys(stats.status_breakdown).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Message Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.status_breakdown).map(([status, count]) => (
                <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {count.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carrier Breakdown */}
        {stats.carrier_breakdown && Object.keys(stats.carrier_breakdown).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">By Carrier</h4>
            <div className="space-y-2">
              {Object.entries(stats.carrier_breakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([carrier, count]) => (
                  <div key={carrier} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{carrier}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {count.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-sm text-gray-500 space-y-1">
          <div>Created: {formatDate(stats.created_at)}</div>
          {stats.started_at && <div>Started: {formatDate(stats.started_at)}</div>}
          {stats.completed_at && <div>Completed: {formatDate(stats.completed_at)}</div>}
          {stats.scheduled_time && <div>Scheduled: {formatDate(stats.scheduled_time)}</div>}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}