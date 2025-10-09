/**
 * Campaign Details Page
 * Page for viewing and monitoring individual SMS campaign details
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { Button } from '../../components/common'
import { CampaignMonitor, DeliveryReport, CampaignStatusBadge } from '../../components/sms'
import { smsService } from '../../services'
import type { BreadcrumbItem, Campaign } from '../../types'

export function CampaignDetailsPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeliveryReport, setShowDeliveryReport] = useState(false)

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard'
    },
    {
      label: 'SMS Campaigns',
      href: '/sms'
    },
    {
      label: campaign?.name || 'Campaign Details',
      href: `/sms/campaigns/${campaignId}`,
      isActive: true
    }
  ]

  useEffect(() => {
    if (campaignId) {
      loadCampaign()
    }
  }, [campaignId])

  const loadCampaign = async () => {
    if (!campaignId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await smsService.getCampaign(campaignId)
      
      if (response.success) {
        setCampaign(response.data)
      } else {
        throw new Error('Failed to load campaign')
      }
    } catch (error) {
      console.error('Failed to load campaign:', error)
      setError(error instanceof Error ? error.message : 'Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCampaignUpdate = (updatedCampaign: Campaign) => {
    setCampaign(updatedCampaign)
  }

  const handleEditCampaign = () => {
    navigate(`/sms/campaigns/${campaignId}/edit`)
  }

  const handleViewReport = () => {
    setShowDeliveryReport(true)
  }

  const handleDeleteCampaign = async () => {
    if (!campaign || !campaignId) return

    if (!window.confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      return
    }

    try {
      const response = await smsService.deleteCampaign(campaignId)
      
      if (response.success) {
        navigate('/sms')
      } else {
        throw new Error('Failed to delete campaign')
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      alert('Failed to delete campaign. Please try again.')
    }
  }

  if (isLoading && !campaign) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <div className="space-x-3">
              <Button onClick={loadCampaign}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate('/sms')}>
                Back to Campaigns
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!campaign) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Campaign not found</div>
            <Button variant="outline" onClick={() => navigate('/sms')}>
              Back to Campaigns
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {campaign.name}
              </h1>
              <CampaignStatusBadge status={campaign.status} showIcon />
            </div>
            <p className="text-gray-600 mt-1">
              Created {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex space-x-3 ml-4">
            <Button variant="outline" onClick={handleViewReport}>
              View Report
            </Button>
            
            {campaign.status === 'draft' && (
              <Button variant="outline" onClick={handleEditCampaign}>
                Edit Campaign
              </Button>
            )}
            
            {campaign.status !== 'sending' && (
              <Button variant="outline" onClick={handleDeleteCampaign}>
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Campaign Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Campaign Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <CampaignStatusBadge status={campaign.status} showIcon />
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Recipients</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {campaign.recipientCount.toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Messages Sent</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {campaign.sentCount.toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Delivered</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {campaign.deliveredCount.toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Failed</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {campaign.failedCount.toLocaleString()}
                  </dd>
                </div>

                {campaign.scheduledAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Scheduled</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(campaign.scheduledAt).toLocaleString()}
                    </dd>
                  </div>
                )}

                {campaign.startedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Started</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(campaign.startedAt).toLocaleString()}
                    </dd>
                  </div>
                )}

                {campaign.completedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Completed</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(campaign.completedAt).toLocaleString()}
                    </dd>
                  </div>
                )}
              </div>
            </div>

            {/* Message Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Message Content
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {campaign.message}
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                {campaign.message.length} characters • {Math.ceil(campaign.message.length / 160)} SMS
              </div>
            </div>
          </div>

          {/* Campaign Monitor */}
          <div className="lg:col-span-2">
            <CampaignMonitor
              campaign={campaign}
              onCampaignUpdate={handleCampaignUpdate}
              showControls={true}
            />
          </div>
        </div>

        {/* Delivery Report Modal */}
        {showDeliveryReport && (
          <DeliveryReport
            campaign={campaign}
            onClose={() => setShowDeliveryReport(false)}
          />
        )}
      </div>
    </AppLayout>
  )
}