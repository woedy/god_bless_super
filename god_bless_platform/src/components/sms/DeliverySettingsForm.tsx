import React, { useEffect, useId, useMemo, useState } from 'react'
import { smsService } from '../../services'
import type { CampaignDeliverySettings } from '../../types/rotation'

const ROTATION_STRATEGIES: Array<{ value: CampaignDeliverySettings['proxy_rotation_strategy']; label: string }> = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'random', label: 'Random' },
  { value: 'least_used', label: 'Least Used' },
  { value: 'best_performance', label: 'Best Performance' },
  { value: 'smart_adaptive', label: 'Smart Adaptive' }
]

type DeliverySettingsFormValue = Pick<
  CampaignDeliverySettings,
  | 'use_proxy_rotation'
  | 'proxy_rotation_strategy'
  | 'use_smtp_rotation'
  | 'smtp_rotation_strategy'
  | 'custom_delay_enabled'
  | 'custom_delay_min'
  | 'custom_delay_max'
  | 'custom_random_seed'
  | 'selected_proxy_ids'
  | 'selected_smtp_account_ids'
  | 'applied_template_id'
  | 'adaptive_optimization_enabled'
  | 'carrier_optimization_enabled'
  | 'timezone_optimization_enabled'
>

interface DeliverySettingsFormProps {
  value: DeliverySettingsFormValue
  onChange: (value: DeliverySettingsFormValue) => void
  errors?: Partial<Record<keyof DeliverySettingsFormValue | 'custom_delay_range', string>>
  disabled?: boolean
  templates?: any[]
  onTemplateInspect?: (template: any) => void
  onManageInfrastructure?: () => void
  refreshKey?: number
}

interface ProxyOption {
  id: number
  host: string
  port: number
  protocol?: string
  is_active?: boolean
  success_rate?: number
}

interface SmtpOption {
  id: number
  host: string
  port: number
  username?: string
  provider?: string
  active?: boolean
  success_rate?: number
}

const resolveTemplateId = (template: any): string | undefined => {
  if (!template) return undefined
  if (template.template_id) return template.template_id
  return template.id
}

const DeliverySettingsForm: React.FC<DeliverySettingsFormProps> = ({
  value,
  onChange,
  errors = {},
  disabled = false,
  templates = [],
  onTemplateInspect,
  onManageInfrastructure,
  refreshKey
}) => {
  const [smtpAccounts, setSmtpAccounts] = useState<SmtpOption[]>([])
  const [proxyServers, setProxyServers] = useState<ProxyOption[]>([])
  const [loading, setLoading] = useState({ smtp: false, proxies: false })
  const [loadError, setLoadError] = useState<string | null>(null)
  const templateSelectId = useId()

  useEffect(() => {
    let cancelled = false

    const loadInfrastructure = async () => {
      try {
        setLoading({ smtp: true, proxies: true })
        setLoadError(null)

        const [smtpResponse, proxyResponse] = await Promise.all([
          smsService.getSmtpAccounts(),
          smsService.getProxyServers()
        ])

        if (!cancelled) {
          if (smtpResponse.success) {
            setSmtpAccounts(Array.isArray(smtpResponse.data) ? smtpResponse.data : [])
          } else {
            setSmtpAccounts([])
            setLoadError('Unable to load SMTP accounts. Please check your credentials.')
          }

          if (proxyResponse.success) {
            setProxyServers(proxyResponse.data?.proxies ?? [])
          } else {
            setProxyServers([])
            setLoadError(prev => prev ?? 'Unable to load proxy pools for manual configuration.')
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load delivery infrastructure', error)
          setLoadError('Failed to load delivery infrastructure. Manual selections may be limited.')
        }
      } finally {
        if (!cancelled) {
          setLoading({ smtp: false, proxies: false })
        }
      }
    }

    loadInfrastructure()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleFieldChange = <K extends keyof DeliverySettingsFormValue>(field: K, fieldValue: DeliverySettingsFormValue[K]) => {
    onChange({
      ...value,
      [field]: fieldValue
    })
  }

  const toggleArrayValue = (field: 'selected_proxy_ids' | 'selected_smtp_account_ids', id: number) => {
    const current = new Set(value[field])
    if (current.has(id)) {
      current.delete(id)
    } else {
      current.add(id)
    }
    handleFieldChange(field, Array.from(current))
  }

  const selectedTemplate = useMemo(() => {
    if (!value.applied_template_id) return undefined
    return templates.find((template) => resolveTemplateId(template) === value.applied_template_id)
  }, [templates, value.applied_template_id])

  return (
    <div className="space-y-6">
      {(loading.smtp || loading.proxies) && (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Loading delivery infrastructure...
        </div>
      )}

      {loadError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {loadError}
        </div>
      )}

      {/* SMTP Accounts */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-medium text-gray-900">SMTP Accounts</h4>
            <p className="text-sm text-gray-500">
              Choose which SMTP accounts participate in this campaign and fine-tune the rotation cadence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onManageInfrastructure && (
              <button
                type="button"
                onClick={onManageInfrastructure}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:border-gray-300"
              >
                Manage accounts
              </button>
            )}
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={value.use_smtp_rotation}
                onChange={(event) => handleFieldChange('use_smtp_rotation', event.target.checked)}
                disabled={disabled}
              />
              <span>Enable SMTP Rotation</span>
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Rotation Strategy</label>
            <select
              value={value.smtp_rotation_strategy}
              onChange={(event) => handleFieldChange('smtp_rotation_strategy', event.target.value as DeliverySettingsFormValue['smtp_rotation_strategy'])}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled || !value.use_smtp_rotation}
            >
              {ROTATION_STRATEGIES.map((strategy) => (
                <option key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Accounts in Rotation</label>
            <div className="space-y-2 rounded-md border border-gray-200 p-3 max-h-48 overflow-y-auto">
              {smtpAccounts.length === 0 && (
                <p className="text-sm text-gray-500">
                  No SMTP accounts available. {onManageInfrastructure ? 'Open the manager to create one.' : 'Add accounts in the SMTP Manager.'}
                </p>
              )}
              {smtpAccounts.map((account) => (
                <label key={account.id} className="flex items-start space-x-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={value.selected_smtp_account_ids.includes(account.id)}
                    onChange={() => toggleArrayValue('selected_smtp_account_ids', account.id)}
                    disabled={disabled}
                  />
                  <span>
                    <span className="font-medium">{account.host}:{account.port}</span>
                    {account.username && <span className="text-gray-500"> • {account.username}</span>}
                    {account.success_rate != null && (
                      <span className="block text-xs text-gray-500">Success rate: {account.success_rate}%</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {errors.selected_smtp_account_ids && (
              <p className="mt-2 text-sm text-red-600">{errors.selected_smtp_account_ids}</p>
            )}
          </div>
        </div>
      </div>

      {/* Proxy Selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-medium text-gray-900">Proxy Pools</h4>
            <p className="text-sm text-gray-500">
              Select proxy servers to balance carrier load and minimise throttling events.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onManageInfrastructure && (
              <button
                type="button"
                onClick={onManageInfrastructure}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:border-gray-300"
              >
                Manage proxies
              </button>
            )}
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={value.use_proxy_rotation}
                onChange={(event) => handleFieldChange('use_proxy_rotation', event.target.checked)}
                disabled={disabled}
              />
              <span>Enable Proxy Rotation</span>
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Rotation Strategy</label>
            <select
              value={value.proxy_rotation_strategy}
              onChange={(event) => handleFieldChange('proxy_rotation_strategy', event.target.value as DeliverySettingsFormValue['proxy_rotation_strategy'])}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled || !value.use_proxy_rotation}
            >
              {ROTATION_STRATEGIES.map((strategy) => (
                <option key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Active Proxies</label>
            <div className="space-y-2 rounded-md border border-gray-200 p-3 max-h-48 overflow-y-auto">
              {proxyServers.length === 0 && (
                <p className="text-sm text-gray-500">
                  No proxies found. {onManageInfrastructure ? 'Open the manager to add a proxy.' : 'Configure proxies in the Proxy Manager.'}
                </p>
              )}
              {proxyServers.map((proxy) => (
                <label key={proxy.id} className="flex items-start space-x-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={value.selected_proxy_ids.includes(proxy.id)}
                    onChange={() => toggleArrayValue('selected_proxy_ids', proxy.id)}
                    disabled={disabled}
                  />
                  <span>
                    <span className="font-medium">{proxy.host}:{proxy.port}</span>
                    {proxy.protocol && <span className="text-gray-500"> • {proxy.protocol.toUpperCase()}</span>}
                    {proxy.success_rate != null && (
                      <span className="block text-xs text-gray-500">Success rate: {proxy.success_rate}%</span>
                    )}
                    {proxy.is_active === false && (
                      <span className="block text-xs text-amber-600">Marked inactive</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {errors.selected_proxy_ids && (
              <p className="mt-2 text-sm text-red-600">{errors.selected_proxy_ids}</p>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Delays */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="text-base font-medium text-gray-900">Delivery Delay Window</h4>
        <p className="text-sm text-gray-500">
          Configure per-message delays to avoid rate limits and carrier throttling.
        </p>

        <div className="mt-4 space-y-4">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={value.custom_delay_enabled}
              onChange={(event) => handleFieldChange('custom_delay_enabled', event.target.checked)}
              disabled={disabled}
            />
            <span>Enable custom delay window</span>
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Minimum Delay (seconds)</label>
              <input
                type="number"
                min={0}
                value={value.custom_delay_min}
                onChange={(event) => handleFieldChange('custom_delay_min', Number(event.target.value) || 0)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled || !value.custom_delay_enabled}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Maximum Delay (seconds)</label>
              <input
                type="number"
                min={0}
                value={value.custom_delay_max}
                onChange={(event) => handleFieldChange('custom_delay_max', Number(event.target.value) || 0)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled || !value.custom_delay_enabled}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Random Seed (optional)</label>
              <input
                type="number"
                value={value.custom_random_seed ?? ''}
                onChange={(event) =>
                  handleFieldChange('custom_random_seed', event.target.value ? Number(event.target.value) : undefined)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled || !value.custom_delay_enabled}
              />
            </div>
          </div>

          {(errors.custom_delay_min || errors.custom_delay_max || errors.custom_delay_range) && (
            <p className="text-sm text-red-600">
              {errors.custom_delay_range || errors.custom_delay_min || errors.custom_delay_max}
            </p>
          )}
        </div>
      </div>

      {/* Optimization Toggles */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="text-base font-medium text-gray-900">Optimization Enhancements</h4>
        <p className="text-sm text-gray-500">Align manual settings with adaptive optimisation services.</p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center space-x-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={value.adaptive_optimization_enabled}
              onChange={(event) => handleFieldChange('adaptive_optimization_enabled', event.target.checked)}
              disabled={disabled}
            />
            <span>Adaptive optimisation (auto balances throttling and retries)</span>
          </label>
          <label className="flex items-center space-x-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={value.carrier_optimization_enabled}
              onChange={(event) => handleFieldChange('carrier_optimization_enabled', event.target.checked)}
              disabled={disabled}
            />
            <span>Carrier-aware routing (prioritise healthiest carrier paths)</span>
          </label>
          <label className="flex items-center space-x-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={value.timezone_optimization_enabled}
              onChange={(event) => handleFieldChange('timezone_optimization_enabled', event.target.checked)}
              disabled={disabled}
            />
            <span>Timezone optimisation (respect local quiet hours)</span>
          </label>
        </div>
      </div>

      {/* Template Alignment */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="text-base font-medium text-gray-900">Optimization Templates</h4>
        <p className="text-sm text-gray-500">
          Apply campaign templates with pre-vetted throttling and rotation settings to keep automation in sync with manual
          choices.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor={templateSelectId}>
              Apply Template
            </label>
            <select
              id={templateSelectId}
              value={value.applied_template_id ?? ''}
              onChange={(event) => handleFieldChange('applied_template_id', event.target.value || undefined)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
            >
              <option value="">No template</option>
              {templates.map((template) => {
                const templateId = resolveTemplateId(template)
                return (
                  <option key={templateId} value={templateId}>
                    {template.name} ({template.category})
                  </option>
                )
              })}
            </select>
          </div>

          {selectedTemplate && (
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <div className="flex items-center justify-between">
                <div className="font-medium">{selectedTemplate.name}</div>
                <button
                  type="button"
                  onClick={() => onTemplateInspect?.(selectedTemplate)}
                  className="text-xs font-medium text-blue-700 underline"
                >
                  View details
                </button>
              </div>
              <p className="mt-1 text-blue-800">{selectedTemplate.description}</p>
              {selectedTemplate.use_case && (
                <p className="mt-1 text-xs uppercase tracking-wide text-blue-600">Use case: {selectedTemplate.use_case}</p>
              )}
              {selectedTemplate.settings?.throttling_hint && (
                <p className="mt-2 text-xs text-blue-700">{selectedTemplate.settings.throttling_hint}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { DeliverySettingsFormValue }
export { DeliverySettingsForm }
