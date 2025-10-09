/**
 * Templates Page
 * Campaign template management and library
 */

import React from 'react'
import { AppLayout } from '../../components/layout'
import { CampaignTemplates } from '../../components/sms'
import type { BreadcrumbItem } from '../../types'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    label: 'SMS Campaigns',
    href: '/sms/campaigns'
  },
  {
    label: 'Templates',
    href: '/sms/templates',
    isActive: true
  }
]

export function TemplatesPage() {
  const handleTemplateSelect = (template: any) => {
    console.log('Template selected:', template)
    // Could navigate to create campaign with template
  }

  const handleTemplateCreate = (template: any) => {
    console.log('Template created:', template)
    // Handle template creation
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Templates</h1>
            <p className="text-gray-600 mt-1">
              Manage and use pre-configured templates to optimize your SMS campaigns
            </p>
          </div>
        </div>

        {/* Templates Component */}
        <CampaignTemplates
          onTemplateSelect={handleTemplateSelect}
          onTemplateCreate={handleTemplateCreate}
          showCreateWizard={true}
        />
      </div>
    </AppLayout>
  )
}