/**
 * Single SMS Page - Simple Form
 * Quick form for sending one SMS message
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { MessageComposer } from '../../components/sms'
import { DeliverySettingsForm } from '../../components/sms/DeliverySettingsForm'
import { DeliveryInfrastructureManager } from '../../components/sms/DeliveryInfrastructureManager'
import type { DeliverySettingsFormValue } from '../../components/sms/DeliverySettingsForm'
import { smsService } from '../../services'
import type { BreadcrumbItem, SimpleSMSRecipient } from '../../types'
import type { SimpleDeliverySettingsPayload } from '../../types/api'

const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'SMS', href: '/sms' },
  { label: 'Send Single SMS', href: '/sms/single', isActive: true }
]

interface FormState {
  sender_name: string
  subject: string
  message_template: string
  custom_macros: Record<string, any>
  provider: string
}

const defaultDeliverySettings: DeliverySettingsFormValue = {
  use_proxy_rotation: false,
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
}

export function SingleSMSPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [recipients, setRecipients] = useState<SimpleSMSRecipient[]>([])
  const [formData, setFormData] = useState<FormState>({
    sender_name: '',
    subject: '',
    message_template: '',
    custom_macros: {},
    provider: ''
  })
  const [providers, setProviders] = useState<string[]>([])
  const [macros, setMacros] = useState<Record<string, any>>({})
  const [templates, setTemplates] = useState<any[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [deliverySettings, setDeliverySettings] = useState<DeliverySettingsFormValue>(defaultDeliverySettings)
  const [deliveryErrors, setDeliveryErrors] = useState<Partial<Record<keyof DeliverySettingsFormValue | 'custom_delay_range', string>>>({})
  const [isInfrastructureManagerOpen, setInfrastructureManagerOpen] = useState(false)
  const [infrastructureRefreshKey, setInfrastructureRefreshKey] = useState(0)

  useEffect(() => {
    loadProvidersMacrosTemplates()
  }, [])

  const selectedRecipient = recipients[0]
  const messageSegments = useMemo(
    () => Math.max(1, Math.ceil(formData.message_template.length / 160)),
    [formData.message_template.length]
  )

  const loadProvidersMacrosTemplates = async () => {
    try {
      const providersResponse = await smsService.getCarrierProviders()
      if (providersResponse.success && providersResponse.data.providers.length > 0) {
        setProviders(providersResponse.data.providers)
        setFormData((prev) => ({ ...prev, provider: prev.provider || providersResponse.data.providers[0] }))
      } else {
        throw new Error('No providers')
      }
    } catch {
      const fallbacks = ['Verizon', 'AT&T', 'T-Mobile']
      setProviders(fallbacks)
      setFormData((prev) => ({ ...prev, provider: prev.provider || fallbacks[0] }))
    }

    try {
      const macrosResponse = await smsService.getAvailableMacros()
      if (macrosResponse.success) {
        setMacros(macrosResponse.data.macros)
      }
    } catch {
      setMacros({
        FIRST: 'First name',
        LAST: 'Last name',
        REF: 'Reference number'
      })
    }

    try {
      const templatesResponse = await smsService.getCampaignTemplates()
      if (templatesResponse.success) {
        setTemplates(templatesResponse.data.templates)
      }
    } catch {
      setTemplates([])
    }
  }

  const setFieldValue = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!selectedRecipient) {
      errors.recipients = 'Select a recipient.'
    }
    if (!formData.sender_name.trim()) errors.sender_name = 'Sender name is required.'
    if (!formData.subject.trim()) errors.subject = 'Subject is required.'
    if (!formData.provider) errors.provider = 'Provider is required.'
    if (!formData.message_template.trim()) errors.message_template = 'Message is required.'

    // Validate delivery settings
    if (deliverySettings.use_smtp_rotation && deliverySettings.selected_smtp_account_ids.length === 0) {
      errors.smtp = 'Select at least one SMTP account or disable rotation.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSend = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        sender_name: formData.sender_name,
        subject: formData.subject,
        message_template: formData.message_template,
        custom_macros: formData.custom_macros,
        provider: formData.provider,
        recipient: selectedRecipient,
        delivery_settings: deliverySettings as SimpleDeliverySettingsPayload
      }

      const response = await smsService.sendSingleSMS(payload)
      if (!response.success) {
        const errorMsg = Array.isArray(response.errors) ? response.errors[0] : 'Failed to send SMS'
        throw new Error(typeof errorMsg === 'string' ? errorMsg : 'Failed to send SMS')
      }

      const status = response.data?.delivery_status
      const recipient = selectedRecipient.phone_number
      setSuccess(`SMS sent successfully to ${recipient}! ${status ? `Status: ${status}.` : ''} Redirecting to dashboard...`)
      
      setTimeout(() => {
        navigate('/sms')
      }, 2000)
    } catch (sendError) {
      console.error('Failed to send single SMS:', sendError)
      setError(sendError instanceof Error ? sendError.message : 'Failed to send SMS')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Send Single SMS</h1>
          <p className="text-gray-600 mt-1">
            Quickly send one SMS message to a single recipient.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Recipient */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipient</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={recipients[0]?.phone_number || ''}
                onChange={(e) => {
                  const phoneNumber = e.target.value
                  if (phoneNumber) {
                    setRecipients([{ phone_number: phoneNumber, carrier: formData.provider }])
                  } else {
                    setRecipients([])
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. +1234567890 or 1234567890"
              />
              {fieldErrors.recipients && (
                <p className="mt-2 text-sm text-red-600">{fieldErrors.recipients}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Enter the recipient's phone number with or without country code
              </p>
            </div>
          </div>

          {/* Message Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name *</label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => setFieldValue('sender_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Support"
                />
                {fieldErrors.sender_name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.sender_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFieldValue('subject', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Alert"
                />
                {fieldErrors.subject && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.subject}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFieldValue('provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
                {fieldErrors.provider && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.provider}</p>
                )}
              </div>
            </div>

            <MessageComposer
              message={formData.message_template}
              customMacros={formData.custom_macros}
              availableMacros={macros}
              templates={templates}
              onMessageChange={(msg) => setFieldValue('message_template', msg)}
              onMacrosChange={(macroMap) => setFieldValue('custom_macros', macroMap)}
              onTemplateSelect={(template) => {
                setDeliverySettings((prev) => ({
                  ...prev,
                  applied_template_id: template ? template.template_id ?? template.id : prev.applied_template_id
                }))
              }}
            />
            {fieldErrors.message_template && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.message_template}</p>
            )}

            <div className="mt-3 text-xs text-gray-500">
              {messageSegments} SMS segment{messageSegments > 1 ? 's' : ''} · {formData.message_template.length} characters
            </div>
          </div>

          {/* Delivery Settings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Settings</h3>
            <DeliverySettingsForm
              value={deliverySettings}
              onChange={setDeliverySettings}
              errors={deliveryErrors}
              templates={templates}
              disabled={isLoading}
              onManageInfrastructure={() => setInfrastructureManagerOpen(true)}
              refreshKey={infrastructureRefreshKey}
            />
            {fieldErrors.smtp && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.smtp}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/sms')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !selectedRecipient}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send SMS'}
            </button>
          </div>
        </div>
      </div>

      <DeliveryInfrastructureManager
        isOpen={isInfrastructureManagerOpen}
        onClose={() => setInfrastructureManagerOpen(false)}
        onUpdated={() => setInfrastructureRefreshKey((prev) => prev + 1)}
      />
    </AppLayout>
  )
}
