/**
 * Edit Campaign Page
 * Page for editing existing SMS campaigns
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { CampaignForm } from '../../components/sms'
import { smsService } from '../../services'
import type { BreadcrumbItem, Campaign, CreateCampaignData } from '../../types'

export function EditCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      label: campaign?.name || 'Campaign',
      href: `/sms/campaigns/${campaignId}`
    },
    {
      label: 'Edit',
      href: `/sms/campaigns/${campaignId}/edit`,
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
        
        // Check if campaign can be edited
        if (response.data.status !== 'draft') {
          setError('Only draft campaigns can be edited')
        }
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

  const handleSubmit = async (data: CreateCampaignData) => {
    if (!campaignId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await smsService.updateCampaign(campaignId, data)
      
      if (response.success) {
        // Navigate back to campaign details
        navigate(`/sms/campaigns/${campaignId}`)
      } else {
        throw new Error('Failed to update campaign')
      }
    } catch (error) {
      console.error('Failed to update campaign:', error)
      setError(error instanceof Error ? error.message : 'Failed to update campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(`/sms/campaigns/${campaignId}`)
  }

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-4xl mx-auto">
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

  if (error && !campaign) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <div className="space-x-3">
              <button
                onClick={loadCampaign}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/sms')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back to Campaigns
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!campaign) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Campaign not found</div>
            <button
              onClick={() => navigate('/sms')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Campaigns
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (campaign.status !== 'draft') {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-yellow-600 mb-4">
              Only draft campaigns can be edited. This campaign has status: {campaign.status}
            </div>
            <button
              onClick={() => navigate(`/sms/campaigns/${campaignId}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Campaign
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
          <p className="text-gray-600 mt-1">
            Update your SMS campaign settings and content.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Form */}
        <CampaignForm
          campaign={campaign}
          projectId={campaign.projectId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />

        {/* Information Panel */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-900 mb-3">
            Important Notes
          </h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>
              • Only draft campaigns can be edited
            </p>
            <p>
              • Changes to recipients will require re-adding them after saving
            </p>
            <p>
              • Message changes will affect all recipients when the campaign is sent
            </p>
            <p>
              • Scheduling changes will update the campaign's send time
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}