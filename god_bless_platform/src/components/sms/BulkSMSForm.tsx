/**
 * BulkSMSForm Component
 * Guided multi-section form for launching bulk SMS sends
 */

import React, { useEffect, useMemo, useState } from 'react'
import { MessageComposer } from './MessageComposer'
import { RecipientSelector } from './RecipientSelector'
import { DeliverySettingsForm } from './DeliverySettingsForm'
import { DeliveryInfrastructureManager } from './DeliveryInfrastructureManager'
import type { DeliverySettingsFormValue } from './DeliverySettingsForm'
import { smsService } from '../../services'

type Recipient = {
  phone_number: string
  carrier?: string
  data?: Record<string, any>
}

interface BulkSMSFormProps {
  projectId?: string
  onSubmit: (data: {
    recipients: Recipient[]
    message_template: string
    custom_macros: Record<string, any>
    sender_name: string
    subject: string
    provider: string
    delivery_settings: DeliverySettingsFormValue
  }) => void
  onCancel: () => void
  isLoading?: boolean
  campaignId?: number | string
}

export const BulkSMSForm: React.FC<BulkSMSFormProps> = ({
  projectId,
  onSubmit,
  onCancel,
  isLoading = false,
  campaignId
}) => {
  const [formData, setFormData] = useState({
    sender_name: '',
    subject: '',
    message_template: '',
    custom_macros: {},
    provider: ''
  })

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [macros, setMacros] = useState<Record<string, any>>({})
  const [templates, setTemplates] = useState<any[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deliveryErrors, setDeliveryErrors] = useState<
    Partial<Record<keyof DeliverySettingsFormValue | 'custom_delay_range', string>>
  >({})
  const [isInfrastructureManagerOpen, setInfrastructureManagerOpen] = useState(false)
  const [infrastructureRefreshKey, setInfrastructureRefreshKey] = useState(0)

  const [deliverySettings, setDeliverySettings] = useState<DeliverySettingsFormValue>({
    use_proxy_rotation: true,
    proxy_rotation_strategy: 'round_robin',
    use_smtp_rotation: true,
    smtp_rotation_strategy: 'round_robin',
    custom_delay_enabled: false,
    custom_delay_min: 1,
    custom_delay_max: 5,
    custom_random_seed: undefined,
    selected_proxy_ids: [],
    selected_smtp_account_ids: [],
    applied_template_id: undefined,
    adaptive_optimization_enabled: false,
    carrier_optimization_enabled: false,
    timezone_optimization_enabled: false
  })

  useEffect(() => {
    loadProvidersAndMacros()
    if (campaignId) {
      hydrateDeliverySettings(campaignId)
    }
  }, [campaignId])

  const loadProvidersAndMacros = async () => {
    try {
      const providersResponse = await smsService.getCarrierProviders()
      if (providersResponse.success) {
        setProviders(providersResponse.data.providers)
        if (providersResponse.data.providers.length > 0) {
          setFormData((prev) => ({ ...prev, provider: providersResponse.data.providers[0] }))
        }
      }
    } catch (error) {
      console.warn('Failed to load providers, using defaults:', error)
      setProviders(['Verizon', 'AT&T', 'T-Mobile', 'Sprint'])
      setFormData((prev) => ({ ...prev, provider: prev.provider || 'Verizon' }))
    }

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

    try {
      const templatesResponse = await smsService.getCampaignTemplates()
      if (templatesResponse.success) {
        setTemplates(templatesResponse.data.templates)
      }
    } catch (error) {
      console.warn('Failed to load templates', error)
      setTemplates([])
    }
  }

  const hydrateDeliverySettings = async (campaignId: number | string) => {
    try {
      const response = await smsService.getCampaignDeliverySettings(campaignId)
      if (response.success) {
        setDeliverySettings((prev) => ({
          ...prev,
          ...response.data
        }))
      }
    } catch (error) {
      console.warn('Failed to hydrate delivery settings for bulk form', error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateDeliverySettings = (): boolean => {
    const newErrors: Partial<Record<keyof DeliverySettingsFormValue | 'custom_delay_range', string>> =
      {}

    if (
      deliverySettings.use_smtp_rotation &&
      deliverySettings.selected_smtp_account_ids.length === 0
    ) {
      newErrors.selected_smtp_account_ids =
        'Select at least one SMTP account or disable rotation.'
    }

    if (
      deliverySettings.use_proxy_rotation &&
      deliverySettings.selected_proxy_ids.length === 0
    ) {
      newErrors.selected_proxy_ids = 'Select at least one proxy or disable rotation.'
    }

    if (deliverySettings.custom_delay_enabled) {
      if (deliverySettings.custom_delay_min < 0 || deliverySettings.custom_delay_max < 0) {
        newErrors.custom_delay_range = 'Delay values must be zero or greater.'
      } else if (deliverySettings.custom_delay_min > deliverySettings.custom_delay_max) {
        newErrors.custom_delay_range =
          'Minimum delay must be less than or equal to maximum delay.'
      }
    }

    setDeliveryErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
    const deliveryValid = validateDeliverySettings()
    return Object.keys(newErrors).length === 0 && deliveryValid
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    onSubmit({
      recipients,
      message_template: formData.message_template,
      custom_macros: formData.custom_macros,
      sender_name: formData.sender_name,
      subject: formData.subject,
      provider: formData.provider,
      delivery_settings: deliverySettings
    })
  }

  const recipientStats = useMemo(() => {
    const normalized = new Set<string>()
    recipients.forEach((recipient) => {
      const normalizedNumber = recipient.phone_number.replace(/\D/g, '')
      if (normalizedNumber) normalized.add(normalizedNumber)
    })
    const total = recipients.length
    const unique = normalized.size
    const duplicates = Math.max(total - unique, 0)
    return { total, unique, duplicates }
  }, [recipients])

  const StepBadge = ({ label, complete }: { label: string; complete: boolean }) => (
    <div
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
        complete
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-white text-gray-500'
      }`}
    >
      {label}
    </div>
  )

  const StepSection = ({
    step,
    title,
    subtitle,
    children
  }: {
    step: number
    title: string
    subtitle: string
    children: React.ReactNode
  }) => (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
          Step {step} of 4
        </p>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
      {children}
    </section>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StepBadge label="Recipients" complete={recipients.length > 0} />
        <StepBadge label="Personalize" complete={!!formData.message_template} />
        <StepBadge
          label="Delivery"
          complete={deliverySettings.selected_smtp_account_ids.length > 0}
        />
        <StepBadge label="Review" complete={false} />
      </div>

      <StepSection
        step={1}
        title="Choose Recipients"
        subtitle="Import from your project, upload CSV/TXT, or paste numbers manually."
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <RecipientSelector
            projectId={projectId}
            selectedRecipients={recipients}
            onRecipientsChange={setRecipients}
          />
          {errors.recipients && (
            <p className="mt-2 text-sm text-red-600">{errors.recipients}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">
            <div className="text-xs uppercase tracking-wide text-blue-500">Total numbers</div>
            <div className="text-2xl font-semibold">{recipientStats.total}</div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
            <div className="text-xs uppercase tracking-wide text-green-500">Unique</div>
            <div className="text-2xl font-semibold">{recipientStats.unique}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="text-xs uppercase tracking-wide text-amber-500">Duplicates</div>
            <div className="text-2xl font-semibold">{recipientStats.duplicates}</div>
          </div>
        </div>
      </StepSection>

      <StepSection
        step={2}
        title="Personalize Message"
        subtitle="Define sender, subject, and SMS content with macros and templates."
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                placeholder="Enter subject or campaign name"
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
              )}
            </div>

            <div>
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

          <MessageComposer
            message={formData.message_template}
            customMacros={formData.custom_macros}
            availableMacros={macros}
            templates={templates}
            onMessageChange={(message) => handleChange('message_template', message)}
            onMacrosChange={(macros) => handleChange('custom_macros', macros)}
            onTemplateSelect={(template) => {
              handleChange('message_template', template.message_template)
              setDeliverySettings((prev) => ({
                ...prev,
                applied_template_id: template ? template.template_id ?? template.id : prev.applied_template_id
              }))
            }}
          />
          {errors.message_template && (
            <p className="text-sm text-red-600">{errors.message_template}</p>
          )}
        </div>
      </StepSection>

      <StepSection
        step={3}
        title="Configure Delivery"
        subtitle="Reuse rotating SMTP/proxy pools or apply delivery templates."
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <DeliverySettingsForm
            value={deliverySettings}
            onChange={(settings) => {
              setDeliverySettings(settings)
              if (settings.applied_template_id) {
                const template = templates.find(
                  (t) => (t.template_id ?? t.id) === settings.applied_template_id
                )
                if (template && template.message_template && !formData.message_template) {
                  handleChange('message_template', template.message_template)
                }
              }
            }}
            errors={deliveryErrors}
            templates={templates}
            disabled={isLoading}
            onManageInfrastructure={() => setInfrastructureManagerOpen(true)}
            refreshKey={infrastructureRefreshKey}
          />
        </div>
      </StepSection>

      <StepSection
        step={4}
        title="Review & Launch"
        subtitle="Confirm counts, personalization, and routing before sending."
      >
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-900">
          <div>
            <div className="text-xs uppercase tracking-wide text-blue-500">Recipients</div>
            <div className="text-2xl font-semibold">{recipientStats.unique}</div>
            <div>{recipientStats.duplicates} duplicates removed</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-blue-500">Provider</div>
            <div className="text-lg font-semibold">{formData.provider || 'Not set'}</div>
            <div>Sender: {formData.sender_name || 'Not set'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-blue-500">Message Length</div>
            <div className="text-2xl font-semibold">{formData.message_template.length} chars</div>
            <div>{Math.ceil(formData.message_template.length / 160)} SMS segments</div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
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
            {isLoading ? 'Sending...' : `Send to ${recipientStats.unique} Recipients`}
          </button>
        </div>
      </StepSection>

      <DeliveryInfrastructureManager
        isOpen={isInfrastructureManagerOpen}
        onClose={() => setInfrastructureManagerOpen(false)}
        onUpdated={() => setInfrastructureRefreshKey((prev) => prev + 1)}
      />
    </form>
  )
}
