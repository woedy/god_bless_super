/**
 * CampaignForm Component
 * Simple form for creating/editing SMS campaigns
 */

import React, { useState, useEffect } from 'react'
import { MessageComposer } from './MessageComposer'
import { smsService } from '../../services'
import type { CreateCampaignData, Campaign } from '../../types'

interface CampaignFormProps {
  campaign?: Campaign
  projectId?: string
  onSubmit: (data: CreateCampaignData) => void
  onCancel: () => void
  isLoading?: boolean
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  campaign,
  projectId,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateCampaignData>({
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
    projectId: projectId || ''
  })

  const [macros, setMacros] = useState<Record<string, any>>({})
  const [templates, setTemplates] = useState<any[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load initial data
  useEffect(() => {
    loadMacrosAndTemplates()
    
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: '',
        message_template: campaign.message,
        custom_macros: {},
        target_carrier: '',
        target_type: '',
        target_area_codes: [],
        scheduled_time: campaign.scheduledAt || '',
        send_immediately: !campaign.scheduledAt,
        batch_size: 100,
        rate_limit: 10,
        use_proxy_rotation: true,
        use_smtp_rotation: true,
        projectId: campaign.projectId || projectId || ''
      })
    }
  }, [campaign, projectId])

  const loadMacrosAndTemplates = async () => {
    try {
      const [macrosResponse, templatesResponse] = await Promise.all([
        smsService.getAvailableMacros(),
        smsService.getCampaignTemplates()
      ])

      if (macrosResponse.success) {
        setMacros(macrosResponse.data.macros)
      }

      if (templatesResponse.success) {
        setTemplates(templatesResponse.data.templates)
      }
    } catch (error) {
      console.error('Failed to load macros and templates:', error)
    }
  }

  const handleChange = (field: keyof CreateCampaignData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required'
    }

    if (!formData.message_template.trim()) {
      newErrors.message_template = 'Message template is required'
    }

    if (!formData.send_immediately && !formData.scheduled_time) {
      newErrors.scheduled_time = 'Scheduled time is required when not sending immediately'
    }

    if (formData.batch_size < 1 || formData.batch_size > 1000) {
      newErrors.batch_size = 'Batch size must be between 1 and 1000'
    }

    if (formData.rate_limit < 1 || formData.rate_limit > 100) {
      newErrors.rate_limit = 'Rate limit must be between 1 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Campaign Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter campaign name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter campaign description (optional)"
            />
          </div>
        </div>
      </div>

      {/* Message Composition */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Message Content
        </h3>
        
        <MessageComposer
          message={formData.message_template}
          customMacros={formData.custom_macros}
          availableMacros={macros}
          templates={templates}
          onMessageChange={(message) => handleChange('message_template', message)}
          onMacrosChange={(macros) => handleChange('custom_macros', macros)}
        />
        
        {errors.message_template && (
          <p className="mt-1 text-sm text-red-600">{errors.message_template}</p>
        )}
      </div>

      {/* Campaign Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              onChange={(e) => handleChange('batch_size', parseInt(e.target.value) || 100)}
              min="1"
              max="1000"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.batch_size ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <p className="text-sm text-gray-500 mt-1">Messages per batch (1-1000)</p>
            {errors.batch_size && (
              <p className="mt-1 text-sm text-red-600">{errors.batch_size}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Limit (per minute)
            </label>
            <input
              type="number"
              value={formData.rate_limit}
              onChange={(e) => handleChange('rate_limit', parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.rate_limit ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <p className="text-sm text-gray-500 mt-1">Messages per minute (1-100)</p>
            {errors.rate_limit && (
              <p className="mt-1 text-sm text-red-600">{errors.rate_limit}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="proxy_rotation"
              checked={formData.use_proxy_rotation}
              onChange={(e) => handleChange('use_proxy_rotation', e.target.checked)}
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
              onChange={(e) => handleChange('use_smtp_rotation', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="smtp_rotation" className="ml-2 block text-sm text-gray-700">
              Use SMTP Rotation
            </label>
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Scheduling
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="send_immediately"
              checked={formData.send_immediately}
              onChange={(e) => handleChange('send_immediately', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="send_immediately" className="ml-2 block text-sm text-gray-700">
              Send Immediately
            </label>
          </div>

          {!formData.send_immediately && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={(e) => handleChange('scheduled_time', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.scheduled_time ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.scheduled_time && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduled_time}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
        </button>
      </div>
    </form>
  )
}