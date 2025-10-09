/**
 * BulkSMSForm Component
 * Simple form for sending bulk SMS without creating a campaign
 */

import React, { useState, useEffect } from 'react'
import { MessageComposer } from './MessageComposer'
import { RecipientSelector } from './RecipientSelector'
import { smsService } from '../../services'

interface BulkSMSFormProps {
  projectId?: string
  onSubmit: (data: {
    recipients: string[]
    message: string
    sender_name: string
    subject: string
    provider: string
  }) => void
  onCancel: () => void
  isLoading?: boolean
}

export const BulkSMSForm: React.FC<BulkSMSFormProps> = ({
  projectId,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    sender_name: '',
    subject: '',
    message_template: '',
    custom_macros: {},
    provider: ''
  })

  const [recipients, setRecipients] = useState<Array<{
    phone_number: string
    carrier?: string
    data?: Record<string, any>
  }>>([])

  const [providers, setProviders] = useState<string[]>([])
  const [macros, setMacros] = useState<Record<string, any>>({})
  const [templates, setTemplates] = useState<any[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProvidersAndMacros()
  }, [])

  const loadProvidersAndMacros = async () => {
    try {
      // Load providers
      try {
        const providersResponse = await smsService.getCarrierProviders()
        if (providersResponse.success) {
          setProviders(providersResponse.data.providers)
          if (providersResponse.data.providers.length > 0) {
            setFormData(prev => ({ ...prev, provider: providersResponse.data.providers[0] }))
          }
        }
      } catch (error) {
        console.warn('Failed to load providers, using defaults:', error)
        setProviders(['Verizon', 'AT&T', 'T-Mobile', 'Sprint'])
        setFormData(prev => ({ ...prev, provider: 'Verizon' }))
      }

      // Load macros
      try {
        const macrosResponse = await smsService.getAvailableMacros()
        if (macrosResponse.success) {
          setMacros(macrosResponse.data.macros)
        }
      } catch (error) {
        console.warn('Failed to load macros, using defaults:', error)
        setMacros({
          FIRST: 'First name',
          LAST: 'Last name',
          REF: 'Reference number',
          TIME: 'Current time',
          DATE: 'Current date'
        })
      }

      // Load templates
      try {
        const templatesResponse = await smsService.getCampaignTemplates()
        if (templatesResponse.success) {
          setTemplates(templatesResponse.data.templates)
        }
      } catch (error) {
        console.warn('Failed to load templates:', error)
        setTemplates([])
      }
    } catch (error) {
      console.error('Failed to load providers and macros:', error)
    }
  }

  const handleChange = (field: string, value: any) => {
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

    if (!formData.sender_name.trim()) {
      newErrors.sender_name = 'Sender name is required'
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required'
    }

    if (!formData.message_template.trim()) {
      newErrors.message_template = 'Message is required'
    }

    if (!formData.provider) {
      newErrors.provider = 'Provider is required'
    }

    if (recipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Process message template for each recipient
    const processedRecipients = []
    
    for (const recipient of recipients) {
      try {
        const response = await smsService.processMessageTemplate({
          template: formData.message_template,
          custom_data: formData.custom_macros,
          recipient_data: recipient.data || {}
        })

        if (response.success) {
          processedRecipients.push({
            phone_number: recipient.phone_number,
            message: response.data.processed
          })
        } else {
          processedRecipients.push({
            phone_number: recipient.phone_number,
            message: formData.message_template
          })
        }
      } catch (error) {
        processedRecipients.push({
          phone_number: recipient.phone_number,
          message: formData.message_template
        })
      }
    }

    onSubmit({
      recipients: processedRecipients.map(r => r.phone_number),
      message: formData.message_template,
      sender_name: formData.sender_name,
      subject: formData.subject,
      provider: formData.provider
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sender Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Sender Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sender Name *
            </label>
            <input
              type="text"
              value={formData.sender_name}
              onChange={(e) => handleChange('sender_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.sender_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter sender name"
            />
            {errors.sender_name && (
              <p className="mt-1 text-sm text-red-600">{errors.sender_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subject ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter message subject"
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => handleChange('provider', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.provider ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a provider</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            {errors.provider && (
              <p className="mt-1 text-sm text-red-600">{errors.provider}</p>
            )}
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

      {/* Recipients */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Recipients
        </h3>
        
        <RecipientSelector
          projectId={projectId}
          selectedRecipients={recipients}
          onRecipientsChange={setRecipients}
        />
        
        {errors.recipients && (
          <p className="mt-1 text-sm text-red-600">{errors.recipients}</p>
        )}
      </div>

      {/* Summary */}
      {recipients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Ready to Send
          </h4>
          <div className="text-sm text-blue-700">
            <div>Recipients: {recipients.length}</div>
            <div>Provider: {formData.provider}</div>
            <div>Message length: {formData.message_template.length} characters</div>
            <div>Estimated SMS count: {Math.ceil(formData.message_template.length / 160)} per recipient</div>
          </div>
        </div>
      )}

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
          disabled={isLoading || recipients.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : `Send to ${recipients.length} Recipients`}
        </button>
      </div>
    </form>
  )
}