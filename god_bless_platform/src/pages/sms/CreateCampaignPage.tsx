/**
 * Create Campaign Page
 * Page for creating new SMS campaigns
 */

import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { CampaignCreator } from '../../components/sms'
import { smsService } from '../../services'
import type { BreadcrumbItem, Campaign, CreateCampaignData } from '../../types'

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
    label: 'Create Campaign',
    href: '/sms/create',
    isActive: true
  }
]

export function CreateCampaignPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCampaignCreated = (campaign: Campaign) => {
    // Navigate to campaign details or campaigns list
    navigate(`/sms/campaigns/${campaign.id}`)
  }

  const handleCancel = () => {
    navigate('/sms')
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create SMS Campaign</h1>
          <p className="text-gray-600 mt-1">
            Set up a new SMS campaign to reach your audience effectively.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Campaign Creator */}
        <CampaignCreator
          onCampaignCreated={handleCampaignCreated}
          onCancel={handleCancel}
          initialData={projectId ? { projectId } : undefined}
        />
      </div>
    </AppLayout>
  )
}