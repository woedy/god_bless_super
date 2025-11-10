/**
 * Single SMS Page
 * Guided wizard for sending a one-off SMS
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { MessageComposer } from '../../components/sms/MessageComposer'
import { RecipientSelector } from '../../components/sms/RecipientSelector'
import { DeliverySettingsForm } from '../../components/sms/DeliverySettingsForm'
import { DeliveryInfrastructureManager } from '../../components/sms/DeliveryInfrastructureManager'
import type { DeliverySettingsFormValue } from '../../components/sms/DeliverySettingsForm'
import { useProject } from '../../contexts'
import { smsService } from '../../services'
import type { BreadcrumbItem } from '../../types'
import type {
  SimpleDeliverySettingsPayload,
  SimpleSMSRecipient
} from '../../types/api'

const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'SMS', href: '/sms' },
  { label: 'Send Single SMS', href: '/sms/single', isActive: true }
]

const steps = [
  { title: 'Recipient', description: 'Choose exactly one number' },
  { title: 'Message', description: 'Compose and personalize' },
  { title: 'Delivery', description: 'Review routing & send' }
]

interface FormState {
  sender_name: string
  subject: string
  message_template: string
  custom_macros: Record<string, any>
  provider: string
}

const defaultDeliverySettings: DeliverySettingsFormValue = {
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
}

export function SingleSMSPage() {
  const { currentProjectId } = useProject()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
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

  const [deliverySettings, setDeliverySettings] = useState<DeliverySettingsFormValue>(
    defaultDeliverySettings
  )
  const [deliveryErrors, setDeliveryErrors] = useState<
    Partial<Record<keyof DeliverySettingsFormValue | 'custom_delay_range', string>>
  >({})
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
        setFormData((prev) => ({
          ...prev,
          provider: prev.provider || providersResponse.data.providers[0]
        }))
      } else {
        throw new Error('No providers returned')
      }
    } catch (providerError) {
      console.warn('Falling back to default providers', providerError)
      const fallbacks = ['Verizon', 'AT&T', 'T-Mobile']
      setProviders(fallbacks)
      setFormData((prev) => ({ ...prev, provider: prev.provider || fallbacks[0] }))
    }

    try {
      const macrosResponse = await smsService.getAvailableMacros()
      if (macrosResponse.success) {
        setMacros(macrosResponse.data.macros)
      } else {
        throw new Error('Macro request failed')
      }
    } catch (macroError) {
      console.warn('Falling back to default macros', macroError)
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
      } else {
        setTemplates([])
      }
    } catch {
      setTemplates([])
    }
  }

  const setFieldValue = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev
      }
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }

  const validateStep = (stepIndex: number): boolean => {
    const errors: Record<string, string> = {}
    if (stepIndex === 0) {
      if (recipients.length !== 1) {
        errors.recipients = 'Select exactly one recipient to continue.'
      }
    }

    if (stepIndex === 1) {
      if (!formData.sender_name.trim()) errors.sender_name = 'Sender name is required.'
      if (!formData.subject.trim()) errors.subject = 'Subject is required.'
      if (!formData.provider) errors.provider = 'Provider is required.'
      if (!formData.message_template.trim()) {
        errors.message_template = 'Message is required.'
      }
    }

    if (stepIndex === 2) {
      const deliveryValid = validateDeliverySettings()
      if (!deliveryValid) {
        return false
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
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

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
      setError(null)
    }
  }

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    setError(null)
  }

  const handleSend = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      return
    }

    if (!selectedRecipient) {
      setFieldErrors({ recipients: 'Select a recipient before sending.' })
      setCurrentStep(0)
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
        throw new Error(response.error ?? 'Failed to send SMS')
      }

      const status = response.data?.delivery_status
      setSuccess(`SMS sent successfully${status ? ` (${status})` : ''}.`)
      setCurrentStep(2)
    } catch (sendError) {
      console.error('Failed to send single SMS:', sendError)
      setError(sendError instanceof Error ? sendError.message : 'Failed to send SMS')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <ol className="mb-8 flex flex-wrap gap-4">
      {steps.map((step, index) => {
        const status =
          index < currentStep ? 'complete' : index === currentStep ? 'current' : 'upcoming'
        const baseClasses =
          'flex-1 min-w-[180px] rounded-lg border px-4 py-3 transition-colors duration-150'
        const statusClasses =
          status === 'complete'
            ? 'border-green-200 bg-green-50 text-green-700'
            : status === 'current'
              ? 'border-blue-300 bg-blue-50 text-blue-800'
              : 'border-gray-200 bg-white text-gray-500'

        return (
          <li key={step.title} className={`${baseClasses} ${statusClasses}`}>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Step {index + 1} of {steps.length}
            </div>
            <div className="text-sm font-semibold text-gray-900">{step.title}</div>
            <div className="text-xs text-gray-600">{step.description}</div>
          </li>
        )
      })}
    </ol>
  )

  const renderRecipientStep = () => (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Recipient</h3>
            <p className="text-sm text-gray-600">
              Choose one validated number from a project, upload, or enter manually.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {selectedRecipient ? 'Recipient locked in' : 'Selection required'}
          </div>
        </div>

        <RecipientSelector
          projectId={currentProjectId || undefined}
          selectedRecipients={recipients}
          onRecipientsChange={setRecipients}
          maxRecipients={1}
        />

        {fieldErrors.recipients && (
          <p className="mt-2 text-sm text-red-600">{fieldErrors.recipients}</p>
        )}
      </div>

      {selectedRecipient && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <div className="font-semibold">Selected Recipient</div>
          <div>{selectedRecipient.phone_number}</div>
          {selectedRecipient.carrier && <div>Carrier: {selectedRecipient.carrier}</div>}
        </div>
      )}
    </div>
  )

  const renderComposeStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sender & Channel</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sender Name *
            </label>
            <input
              type="text"
              value={formData.sender_name}
              onChange={(e) => setFieldValue('sender_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Support Team"
            />
            {fieldErrors.sender_name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.sender_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFieldValue('subject', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Order Update"
            />
            {fieldErrors.subject && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.subject}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => setFieldValue('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select provider</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            {fieldErrors.provider && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.provider}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Message & Personalization</h3>

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
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        {messageSegments} SMS segment{messageSegments > 1 ? 's' : ''} �?�{' '}
        {formData.message_template.length} characters
      </div>
    </div>
  )

  const renderDeliveryStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Infrastructure</h3>
        <DeliverySettingsForm
          value={deliverySettings}
          onChange={(settings) => {
            setDeliverySettings(settings)
            if (settings.applied_template_id && !formData.message_template) {
              const template = templates.find(
                (t) => (t.template_id ?? t.id) === settings.applied_template_id
              )
              if (template?.message_template) {
                setFieldValue('message_template', template.message_template)
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Review & Send</h4>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-900">
          <div>
            <dt className="font-medium">Recipient</dt>
            <dd>{selectedRecipient?.phone_number || 'Not selected'}</dd>
          </div>
          <div>
            <dt className="font-medium">Provider</dt>
            <dd>{formData.provider || 'Not set'}</dd>
          </div>
          <div>
            <dt className="font-medium">Sender</dt>
            <dd>{formData.sender_name || 'Not set'}</dd>
          </div>
          <div>
            <dt className="font-medium">SMTP Rotation</dt>
            <dd>
              {deliverySettings.use_smtp_rotation
                ? `${deliverySettings.smtp_rotation_strategy.replace('_', ' ')} (${deliverySettings.selected_smtp_account_ids.length} accounts)`
                : 'Disabled'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderRecipientStep()
      case 1:
        return renderComposeStep()
      case 2:
      default:
        return renderDeliveryStep()
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Single SMS Wizard</h1>
          <p className="text-gray-600 mt-1">
            Follow the guided steps to deliver a personalized message to one recipient.
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

        {renderStepIndicator()}
        <div className="space-y-6">{renderStepContent()}</div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={currentStep === 0 ? () => navigate('/sms') : goToPreviousStep}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send SMS'}
            </button>
          )}
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
