/**
 * Campaigns Page
 * Page for listing and managing SMS campaigns
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { Button } from '../../components/common'
import { CampaignList, DeliveryReport } from '../../components/sms'
import { smsService } from '../../services'
import type { BreadcrumbItem, Campaign } from '../../types'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    label: 'SMS Campaigns',
    href: '/sms',
    isActive: true
  }
]

interface DashboardStats {
  total_campaigns: number
  active_campaigns: number
  completed_campaigns: number
  total_messages: number
  sent_messages: number
  failed_messages: number
  success_rate: number
  recent_campaigns: Campaign[]
}

export function CampaignsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project')
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showDeliveryReport, setShowDeliveryReport] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    setIsLoading(true)
    try {
      const response = await smsService.getCampaignDashboard()
      if (response.success) {
        setDashboardStats(response.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCampaign = () => {
    const url = projectId ? `/sms/create?project=${projectId}` : '/sms/create'
    navigate(url)
  }

  const handleCampaignClick = (campaign: Campaign) => {
    navigate(`/sms/campaigns/${campaign.id}`)
  }

  const handleCampaignEdit = (campaign: Campaign) => {
    navigate(`/sms/campaigns/${campaign.id}/edit`)
  }

  const handleCampaignReport = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setShowDeliveryReport(true)
  }

  const handleBulkSMS = () => {
    const url = projectId ? `/sms/bulk?project=${projectId}` : '/sms/bulk'
    navigate(url)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SMS Campaigns</h1>
            <p className="text-gray-600 mt-1">
              Create and manage SMS campaigns for your projects.
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => navigate('/sms/templates')}>
              📋 Templates
            </Button>
            <Button variant="outline" onClick={() => navigate('/sms/optimization')}>
              🚀 Optimization
            </Button>
            <Button variant="outline" onClick={handleBulkSMS}>
              Send Bulk SMS
            </Button>
            <Button variant="primary" onClick={handleCreateCampaign}>
              Create Campaign
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Total Campaigns</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {dashboardStats.total_campaigns.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">All time</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {dashboardStats.active_campaigns.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Currently running</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Messages Sent</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {dashboardStats.sent_messages.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total sent</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Success Rate</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {dashboardStats.success_rate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">Average rate</p>
            </div>
          </div>
        )}

        {/* Loading State for Stats */}
        {isLoading && !dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campaign List */}
        <CampaignList
          projectId={projectId || undefined}
          onCampaignClick={handleCampaignClick}
          onCampaignEdit={handleCampaignEdit}
          onCampaignReport={handleCampaignReport}
          showActions={true}
        />

        {/* Delivery Report Modal */}
        {showDeliveryReport && selectedCampaign && (
          <DeliveryReport
            campaign={selectedCampaign}
            onClose={() => {
              setShowDeliveryReport(false)
              setSelectedCampaign(null)
            }}
          />
        )}
      </div>
    </AppLayout>
  )
}