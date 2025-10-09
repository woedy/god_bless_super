/**
 * CampaignCreator Component
 * Main interface for creating and configuring SMS campaigns
 */

import React, { useState, useEffect } from 'react'
import { MessageComposer } from './MessageComposer'
import { RecipientSelector } from './RecipientSelector'
import { MessagePreview } from './MessagePreview'
import { smsService } from '../../services'
import type { CreateCampaignData, Campaign, Project } from '../../types'

interface CampaignCreatorProps {
  project?: Project
  onCampaignCreated?: (campaign: Campaign) => void
  onCancel?: () => void
  initialData?: Partial<CreateCampaignData>
}

interface CampaignFormData extends CreateCampaignData {
  recipients: Array<{
    phone_number: string
    carrier?: string
    data?: Record<string, any>
  }>
}

export const CampaignCreator: React.FC<CampaignCreatorProps> = ({
  project,
  onCampaignCreated,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    message_template: '',
    custom_macros: {},
    target_carrier: '',
    target_type: '',
    target_area_codes: [],
    scheduled_time: '',
    send_immediately: true,
    batch_size: 100,
    rate_limit: 10,
    use_proxy_rotation: true,
    use_smtp_rotation: true,
    projectId: project?.id || '',
    recipients: [],
    ...initialData
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [macros, setMacros] = useState<Record<string, any>>({})

  // Load templates and macros on mount
  useEffect(() => {
    loadTemplatesAndMacros()
  }, [])

  const loadTemplatesAndMacros = async () => {
    try {
      const [templatesResponse, macrosResponse] = await Promise.all([
        smsService.getCampaignTemplates(),
        smsService.getAvailableMacros()
      ])

      if (templatesResponse.success) {
        setTemplates(templatesResponse.data.templates)
      }

      if (macrosResponse.success) {
        setMacros(macrosResponse.data.macros)
      }
    } catch (error) {
      console.error('Failed to load templates and macros:', error)
    }
  }

  const handleFormChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const handleRecipientsChange = (recipients: CampaignFormData['recipients']) => {
    setFormData(prev => ({
      ...prev,
      recipients
    }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.message_template)
      case 2:
        return formData.recipients.length > 0
      case 3:
        return true // Settings are optional
      default:
        return false
    }
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsLoading(true)
    setError(null)

    try {
      // Create the campaign
      const campaignResponse = await smsService.createCampaign(formData)
      
      if (!campaignResponse.success) {
        throw new Error('Failed to create campaign')
      }

      const campaign = campaignResponse.data

      // Add recipients to the campaign
      if (formData.recipients.length > 0) {
        await smsService.addCampaignRecipients(campaign.id, formData.recipients)
      }

      onCampaignCreated?.(campaign)
    } catch (error) {
      console.error('Failed to create campaign:', error)
      setError(error instanceof Error ? error.message : 'Failed to create campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Campaign Details
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter campaign description"
                  />
                </div>
              </div>
            </div>

            <MessageComposer
              message={formData.message_template}
              customMacros={formData.custom_macros}
              availableMacros={macros}
              templates={templates}
              onMessageChange={(message) => handleFormChange('message_template', message)}
              onMacrosChange={(macros) => handleFormChange('custom_macros', macros)}
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Recipients
              </h3>
              
              <RecipientSelector
                projectId={formData.projectId}
                selectedRecipients={formData.recipients}
                onRecipientsChange={handleRecipientsChange}
                targetCarrier={formData.target_carrier}
                targetType={formData.target_type}
                targetAreaCodes={formData.target_area_codes}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Campaign Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={formData.batch_size}
                    onChange={(e) => handleFormChange('batch_size', parseInt(e.target.value))}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Messages per batch (1-1000)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate Limit (per minute)
                  </label>
                  <input
                    type="number"
                    value={formData.rate_limit}
                    onChange={(e) => handleFormChange('rate_limit', parseInt(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Messages per minute (1-100)</p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="proxy_rotation"
                    checked={formData.use_proxy_rotation}
                    onChange={(e) => handleFormChange('use_proxy_rotation', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="proxy_rotation" className="ml-2 block text-sm text-gray-700">
                    Use Proxy Rotation
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="smtp_rotation"
                    checked={formData.use_smtp_rotation}
                    onChange={(e) => handleFormChange('use_smtp_rotation', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smtp_rotation" className="ml-2 block text-sm text-gray-700">
                    Use SMTP Rotation
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="send_immediately"
                    checked={formData.send_immediately}
                    onChange={(e) => handleFormChange('send_immediately', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="send_immediately" className="ml-2 block text-sm text-gray-700">
                    Send Immediately
                  </label>
                </div>

                {!formData.send_immediately && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_time}
                      onChange={(e) => handleFormChange('scheduled_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Campaign
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Campaign Details</h4>
                  <p className="text-sm text-gray-600">Name: {formData.name}</p>
                  <p className="text-sm text-gray-600">Recipients: {formData.recipients.length}</p>
                  <p className="text-sm text-gray-600">
                    Delivery: {formData.send_immediately ? 'Immediate' : `Scheduled for ${formData.scheduled_time}`}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Message Preview</h4>
                  <MessagePreview
                    template={formData.message_template}
                    customMacros={formData.custom_macros}
                    sampleRecipient={formData.recipients[0]}
                  />
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              <div className="ml-2 text-sm font-medium text-gray-900">
                {step === 1 && 'Message'}
                {step === 2 && 'Recipients'}
                {step === 3 && 'Settings'}
                {step === 4 && 'Review'}
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <button
              onClick={handlePrevStep}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Previous
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNextStep}
              disabled={!validateStep(currentStep)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading || !validateStep(currentStep)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}