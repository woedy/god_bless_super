/**
 * Bulk SMS Page
 * Page for sending bulk SMS without creating a campaign
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { BulkSMSForm } from '../../components/sms'
import type { DeliverySettingsFormValue } from '../../components/sms/DeliverySettingsForm'
import { smsService } from '../../services'
import { useProject } from '../../contexts'
import type { BreadcrumbItem } from '../../types'
import type { SimpleDeliverySettingsPayload } from '../../types/api'

interface BulkFormSubmitPayload {
  recipients: Array<{ phone_number: string; carrier?: string; data?: Record<string, any> }>
  message_template: string
  custom_macros: Record<string, any>
  sender_name: string
  subject: string
  provider: string
  delivery_settings: DeliverySettingsFormValue
}

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
    label: 'Send Bulk SMS',
    href: '/sms/bulk',
    isActive: true
  }
]

export function BulkSMSPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedProjectId = searchParams.get('project')

  const {
    currentProjectId,
    selectProject,
    isReady: isProjectReady
  } = useProject()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!requestedProjectId || !isProjectReady) {
      return
    }

    if (requestedProjectId !== currentProjectId) {
      void selectProject(requestedProjectId)
    }
  }, [requestedProjectId, currentProjectId, isProjectReady, selectProject])

  const handleSubmit = async (data: BulkFormSubmitPayload) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        sender_name: data.sender_name,
        subject: data.subject,
        message_template: data.message_template,
        custom_macros: data.custom_macros,
        provider: data.provider,
        recipients: data.recipients,
        delivery_settings: data.delivery_settings as SimpleDeliverySettingsPayload
      }

      const response = await smsService.sendBulkSMS(payload)
      if (!response.success) {
        throw new Error(response.error ?? 'Failed to queue bulk SMS')
      }

      const bulkResult = response.data
      const count = bulkResult?.total_recipients ?? data.recipients.length
      const taskNote = bulkResult?.task_id ? ` Task ID: ${bulkResult.task_id}` : ''
      const dedupNote =
        bulkResult?.removed_duplicates && bulkResult.removed_duplicates > 0
          ? ` Removed duplicates: ${bulkResult.removed_duplicates}.`
          : ''
      setSuccess(`Bulk SMS queued for ${count} recipients.${dedupNote}${taskNote}`)
    } catch (error) {
      console.error('Failed to queue bulk SMS:', error)
      setError(error instanceof Error ? error.message : 'Failed to queue bulk SMS')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/sms')
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Send Bulk SMS</h1>
          <p className="text-gray-600 mt-1">
            Send SMS messages to multiple recipients quickly without creating a campaign.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-600">{success}</p>
                <p className="text-xs text-green-500 mt-1">Redirecting to campaigns...</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Bulk SMS Form */}
        <BulkSMSForm
          projectId={currentProjectId || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            About Bulk SMS
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              • Bulk SMS allows you to send messages to multiple recipients immediately
            </p>
            <p>
              • Messages are sent using the selected provider and SMTP rotation
            </p>
            <p>
              • For scheduled or more complex campaigns, use the "Create Campaign" feature
            </p>
            <p>
              • You can use macros like @FIRST@, @LAST@, @REF@ for personalization
            </p>
            <p>
              • Messages longer than 160 characters will be split into multiple SMS
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
