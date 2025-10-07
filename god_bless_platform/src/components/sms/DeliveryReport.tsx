/**
 * DeliveryReport Component
 * Comprehensive analytics and reporting for SMS campaign delivery
 */

import React, { useState, useEffect } from 'react'
import { smsService } from '../../services'
import type { Campaign } from '../../types'

interface DeliveryReportProps {
  campaign: Campaign
  onClose?: () => void
}

interface DeliveryReportData {
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
  status_breakdown: Record<string, number>
  carrier_breakdown: Record<string, number>
}

interface MessageData {
  id: string
  phone_number: string
  carrier?: string
  delivery_status: string
  message_content: string
  created_at: string
  sent_at?: string
  delivered_at?: string
  error_message?: string
  send_attempts: number
}

export const DeliveryReport: React.FC<DeliveryReportProps> = ({
  campaign,
  onClose
}) => {
  const [reportData, setReportData] = useState<DeliveryReportData | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'analytics'>('overview')
  const [messageFilters, setMessageFilters] = useState({
    status: '',
    carrier: '',
    page: 1,
    page_size: 50
  })
  const [totalMessages, setTotalMessages] = useState(0)

  useEffect(() => {
    loadReportData()
  }, [campaign.id])

  useEffect(() => {
    if (activeTab === 'messages') {
      loadMessages()
    }
  }, [activeTab, messageFilters])

  const loadReportData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await smsService.getCampaignReport(campaign.id, {
        includeDetails: true,
        groupBy: 'status'
      })

      if (response.success) {
        setReportData(response.data)
      } else {
        throw new Error('Failed to load delivery report')
      }
    } catch (error) {
      console.error('Failed to load delivery report:', error)
      setError(error instanceof Error ? error.message : 'Failed to load delivery report')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async () => {
    try {
      const response = await smsService.getCampaignMessages(campaign.id, messageFilters)

      if (response.success) {
        setMessages(response.data.results)
        setTotalMessages(response.data.count)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'text-green-600 bg-green-100'
      case 'failed':
      case 'bounced':
        return 'text-red-600 bg-red-100'
      case 'pending':
      case 'queued':
        return 'text-yellow-600 bg-yellow-100'
      case 'sending':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const calculateDeliveryRate = () => {
    if (!reportData || reportData.total_messages === 0) return 0
    return Math.round((reportData.messages_sent / reportData.total_messages) * 100)
  }

  const calculateFailureRate = () => {
    if (!reportData || reportData.total_messages === 0) return 0
    return Math.round((reportData.messages_failed / reportData.total_messages) * 100)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const exportReport = async () => {
    try {
      // This would typically generate and download a report file
      const reportContent = {
        campaign: reportData,
        messages: messages,
        generated_at: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(reportContent, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `campaign-${campaign.id}-report.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {reportData?.total_messages.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-500">Total Messages</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {reportData?.messages_sent.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-500">Successfully Sent</div>
          <div className="text-xs text-gray-400 mt-1">
            {calculateDeliveryRate()}% delivery rate
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {reportData?.messages_failed.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-500">Failed</div>
          <div className="text-xs text-gray-400 mt-1">
            {calculateFailureRate()}% failure rate
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {reportData?.pending_messages.toLocaleString() || 0}
          </div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
      </div>

      {/* Status Breakdown Chart */}
      {reportData?.status_breakdown && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Message Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(reportData.status_breakdown).map(([status, count]) => {
              const percentage = reportData.total_messages > 0 
                ? (count / reportData.total_messages) * 100 
                : 0
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="ml-3 text-sm text-gray-900">
                      {count.toLocaleString()} messages
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Carrier Breakdown */}
      {reportData?.carrier_breakdown && Object.keys(reportData.carrier_breakdown).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Carrier Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(reportData.carrier_breakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([carrier, count]) => {
                const percentage = reportData.total_messages > 0 
                  ? (count / reportData.total_messages) * 100 
                  : 0
                
                return (
                  <div key={carrier} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{carrier}</div>
                      <div className="text-sm text-gray-500">
                        {count.toLocaleString()} messages ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Campaign Timeline */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Timeline</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Created</span>
            <span className="text-sm text-gray-900">{formatDate(reportData?.created_at)}</span>
          </div>
          {reportData?.started_at && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Started</span>
              <span className="text-sm text-gray-900">{formatDate(reportData.started_at)}</span>
            </div>
          )}
          {reportData?.completed_at && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Completed</span>
              <span className="text-sm text-gray-900">{formatDate(reportData.completed_at)}</span>
            </div>
          )}
          {reportData?.started_at && reportData?.completed_at && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Duration</span>
              <span className="text-sm text-gray-900">
                {Math.round((new Date(reportData.completed_at).getTime() - new Date(reportData.started_at).getTime()) / 60000)} minutes
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderMessages = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={messageFilters.status}
              onChange={(e) => setMessageFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="queued">Queued</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier
            </label>
            <input
              type="text"
              value={messageFilters.carrier}
              onChange={(e) => setMessageFilters(prev => ({ ...prev, carrier: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by carrier"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setMessageFilters({ status: '', carrier: '', page: 1, page_size: 50 })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {message.phone_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.delivery_status)}`}>
                      {message.delivery_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {message.carrier || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {message.send_attempts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {message.sent_at ? formatDate(message.sent_at) : 'Not sent'}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {message.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setMessageFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={messageFilters.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setMessageFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={messages.length < messageFilters.page_size}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(messageFilters.page - 1) * messageFilters.page_size + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(messageFilters.page * messageFilters.page_size, totalMessages)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{totalMessages}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setMessageFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={messageFilters.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setMessageFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={messages.length < messageFilters.page_size}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics</h3>
        <p className="text-gray-500">
          Detailed analytics and insights will be available here, including delivery trends, 
          carrier performance, and optimization recommendations.
        </p>
      </div>
    </div>
  )

  if (isLoading && !reportData) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white mb-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Delivery Report: {reportData?.campaign_name}
            </h2>
            <p className="text-sm text-gray-500">
              Campaign ID: {campaign.id}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportReport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'messages', name: 'Messages' },
              { id: 'analytics', name: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={loadReportData}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'messages' && renderMessages()}
            {activeTab === 'analytics' && renderAnalytics()}
          </>
        )}
      </div>
    </div>
  )
}