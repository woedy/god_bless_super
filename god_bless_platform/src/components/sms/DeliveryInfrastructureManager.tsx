import React, { useEffect, useMemo, useState } from 'react'

import { Modal } from '../common/Modal'
import { smsService } from '../../services'

type GuidedView = 'guided' | 'developer'

interface DeliveryInfrastructureManagerProps {
  isOpen?: boolean
  onClose?: () => void
  onUpdated?: () => void
  displayMode?: 'modal' | 'page'
}

interface SmtpFormState {
  id?: number
  host: string
  port: string
  username: string
  password: string
  ssl: boolean
  tls: boolean
  active: boolean
}

interface ProxyFormState {
  id?: number
  host: string
  port: string
  username: string
  password: string
  protocol: string
  is_active: boolean
}

const SMTP_DEFAULT: SmtpFormState = {
  host: '',
  port: '',
  username: '',
  password: '',
  ssl: false,
  tls: true,
  active: true
}

const PROXY_DEFAULT: ProxyFormState = {
  host: '',
  port: '',
  username: '',
  password: '',
  protocol: 'http',
  is_active: true
}

const protocolOptions = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks4', label: 'SOCKS4' },
  { value: 'socks5', label: 'SOCKS5' }
]

const DeliveryInfrastructureManager: React.FC<DeliveryInfrastructureManagerProps> = ({
  isOpen = false,
  onClose,
  onUpdated,
  displayMode = 'modal'
}) => {
  const isPageMode = displayMode === 'page'
  const isActive = isPageMode ? true : isOpen
  const [activeView, setActiveView] = useState<GuidedView>('guided')
  const [loadingInfrastructure, setLoadingInfrastructure] = useState(false)
  const [infrastructureError, setInfrastructureError] = useState<string | null>(null)
  const [smtpAccounts, setSmtpAccounts] = useState<any[]>([])
  const [proxyServers, setProxyServers] = useState<any[]>([])

  const [smtpForm, setSmtpForm] = useState<SmtpFormState>(SMTP_DEFAULT)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpFeedback, setSmtpFeedback] = useState<string | null>(null)

  const [proxyForm, setProxyForm] = useState<ProxyFormState>(PROXY_DEFAULT)
  const [proxySaving, setProxySaving] = useState(false)
  const [proxyFeedback, setProxyFeedback] = useState<string | null>(null)

  const [developerFormat, setDeveloperFormat] = useState<'json' | 'csv'>('json')
  const [developerData, setDeveloperData] = useState('')
  const [developerStatus, setDeveloperStatus] = useState<string | null>(null)
  const [developerSummary, setDeveloperSummary] = useState<Record<string, any> | null>(null)
  const [developerProcessing, setDeveloperProcessing] = useState(false)

  useEffect(() => {
    if (isActive) {
      setActiveView('guided')
      setSmtpForm(SMTP_DEFAULT)
      setProxyForm(PROXY_DEFAULT)
      loadInfrastructure()
    } else if (!isPageMode) {
      setDeveloperData('')
      setDeveloperStatus(null)
      setDeveloperSummary(null)
    }
  }, [isActive, isPageMode])

  const loadInfrastructure = async () => {
    setLoadingInfrastructure(true)
    setInfrastructureError(null)
    try {
      const [smtpResponse, proxyResponse] = await Promise.all([
        smsService.getSmtpAccounts(),
        smsService.getProxyServers()
      ])

      if (smtpResponse.success) {
        setSmtpAccounts(Array.isArray(smtpResponse.data) ? smtpResponse.data : [])
      } else {
        setSmtpAccounts([])
      }

      if (proxyResponse.success) {
        const proxyData = (proxyResponse.data as { proxies?: any[] })?.proxies ?? []
        setProxyServers(Array.isArray(proxyData) ? proxyData : [])
      } else {
        setProxyServers([])
      }
    } catch (error) {
      console.error('Failed to load infrastructure', error)
      setInfrastructureError('Unable to load existing SMTP accounts and proxy servers.')
    } finally {
      setLoadingInfrastructure(false)
    }
  }

  const handleSmtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSmtpSaving(true)
    setSmtpFeedback(null)

    const payload: Record<string, any> = {
      host: smtpForm.host,
      port: smtpForm.port ? String(smtpForm.port) : '',
      username: smtpForm.username || undefined,
      ssl: smtpForm.ssl,
      tls: smtpForm.tls,
      active: smtpForm.active
    }

    if (!smtpForm.id || smtpForm.password.trim().length > 0) {
      payload.password = smtpForm.password
    }

    try {
      const response = smtpForm.id
        ? await smsService.updateSmtpAccount(smtpForm.id, payload)
        : await smsService.createSmtpAccount(payload)

      if (response.success) {
        setSmtpFeedback(smtpForm.id ? 'SMTP account updated.' : 'SMTP account added.')
        setSmtpForm(SMTP_DEFAULT)
        await loadInfrastructure()
        onUpdated?.()
      } else {
        setSmtpFeedback('Unable to save SMTP account. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save SMTP account', error)
      setSmtpFeedback('Failed to save SMTP account. Please check your values and try again.')
    } finally {
      setSmtpSaving(false)
    }
  }

  const handleProxySubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setProxySaving(true)
    setProxyFeedback(null)

    const payload: Record<string, any> = {
      host: proxyForm.host,
      port: proxyForm.port,
      username: proxyForm.username || undefined,
      password: proxyForm.password || undefined,
      protocol: proxyForm.protocol,
      is_active: proxyForm.is_active
    }

    try {
      const response = proxyForm.id
        ? await smsService.updateProxyServer(proxyForm.id, payload)
        : await smsService.createProxyServer(payload)

      if (response.success) {
        setProxyFeedback(proxyForm.id ? 'Proxy server updated.' : 'Proxy server added.')
        setProxyForm(PROXY_DEFAULT)
        await loadInfrastructure()
        onUpdated?.()
      } else {
        setProxyFeedback('Unable to save proxy server. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save proxy server', error)
      setProxyFeedback('Failed to save proxy server. Please verify the host and port.')
    } finally {
      setProxySaving(false)
    }
  }

  const startEditSmtp = (account: any) => {
    setSmtpForm({
      id: account.id,
      host: account.host ?? '',
      port: account.port ?? '',
      username: account.username ?? '',
      password: '',
      ssl: Boolean(account.ssl),
      tls: Boolean(account.tls),
      active: Boolean(account.active ?? true)
    })
    setSmtpFeedback(null)
  }

  const startEditProxy = (proxy: any) => {
    setProxyForm({
      id: proxy.id,
      host: proxy.host ?? '',
      port: proxy.port != null ? String(proxy.port) : '',
      username: proxy.username ?? '',
      password: '',
      protocol: proxy.protocol ?? 'http',
      is_active: proxy.is_active !== undefined ? Boolean(proxy.is_active) : true
    })
    setProxyFeedback(null)
  }

  const exportConfiguration = async (format: 'json' | 'csv') => {
    setDeveloperProcessing(true)
    setDeveloperStatus(null)
    setDeveloperSummary(null)
    try {
      const response = await smsService.exportBulkConfiguration(format)
      if (response.success) {
        const rawData = response.data
        if (format === 'json') {
          const text = typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2)
          setDeveloperData(text)
          setDeveloperFormat('json')
          setDeveloperStatus('Configuration exported as JSON. You can review or edit it below.')
        } else {
          const text = typeof rawData === 'string' ? rawData : String(rawData)
          const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
          const downloadUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = 'sms_configuration.csv'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(downloadUrl)
          setDeveloperStatus('CSV download started. Import is currently limited to JSON payloads.')
        }
      } else {
        setDeveloperStatus('Unable to export configuration. Please try again.')
      }
    } catch (error) {
      console.error('Export failed', error)
      setDeveloperStatus('Failed to export configuration.')
    } finally {
      setDeveloperProcessing(false)
    }
  }

  const importJsonConfiguration = async () => {
    if (!developerData.trim()) {
      setDeveloperStatus('Provide JSON configuration data before importing.')
      return
    }

    setDeveloperProcessing(true)
    setDeveloperStatus(null)
    setDeveloperSummary(null)

    try {
      const parsed = JSON.parse(developerData)
      const response = await smsService.importBulkConfiguration(parsed)

      if (response.success) {
        setDeveloperStatus('Configuration imported successfully.')
        setDeveloperSummary(response.data ?? null)
        await loadInfrastructure()
        onUpdated?.()
      } else {
        setDeveloperStatus('Import completed with warnings. Review the response for details.')
        setDeveloperSummary(response.data ?? null)
      }
    } catch (error) {
      console.error('Import failed', error)
      setDeveloperStatus('Failed to import configuration. Ensure JSON is valid.')
    } finally {
      setDeveloperProcessing(false)
    }
  }

  const validateJsonConfiguration = async () => {
    if (!developerData.trim()) {
      setDeveloperStatus('Provide JSON configuration data before validating.')
      return
    }

    setDeveloperProcessing(true)
    setDeveloperStatus(null)
    setDeveloperSummary(null)

    try {
      const parsed = JSON.parse(developerData)
      const response = await smsService.validateBulkConfiguration(parsed)

      if (response.success) {
        setDeveloperStatus(response.data?.is_valid ? 'Configuration looks valid.' : 'Configuration has validation issues.')
        setDeveloperSummary(response.data?.summary ?? null)
      } else {
        setDeveloperStatus('Validation returned warnings. Review the output for more information.')
        setDeveloperSummary(response.data ?? null)
      }
    } catch (error) {
      console.error('Validation failed', error)
      setDeveloperStatus('Failed to validate configuration. Confirm the JSON payload is valid.')
    } finally {
      setDeveloperProcessing(false)
    }
  }

  const handleDeveloperFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = typeof e.target?.result === 'string' ? e.target.result : ''
      setDeveloperData(text)
      if (file.name.endsWith('.json')) {
        setDeveloperFormat('json')
      } else if (file.name.endsWith('.csv')) {
        setDeveloperFormat('csv')
        setDeveloperStatus('CSV import is not yet supported. Convert to JSON before importing.')
      }
    }
    reader.readAsText(file)
  }

  const developerSummaryText = useMemo(() => {
    if (!developerSummary) return null
    try {
      return JSON.stringify(developerSummary, null, 2)
    } catch (error) {
      return String(developerSummary)
    }
  }, [developerSummary])

  const renderGuidedView = () => (
    <div className="space-y-8 px-6 py-4">
      {infrastructureError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {infrastructureError}
        </div>
      )}

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">SMTP Accounts</h3>
            <p className="text-sm text-gray-500">Add or edit the accounts used for sending campaign emails and SMS relays.</p>
          </div>
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:border-gray-300"
            onClick={() => {
              setSmtpForm(SMTP_DEFAULT)
              setSmtpFeedback(null)
            }}
          >
            Add New
          </button>
        </header>

        <div className="space-y-2">
          {loadingInfrastructure && smtpAccounts.length === 0 && (
            <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">Loading SMTP accounts...</div>
          )}
          {!loadingInfrastructure && smtpAccounts.length === 0 && (
            <div className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              No SMTP accounts configured yet. Add one using the form below.
            </div>
          )}
          {smtpAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-gray-900">{account.host}:{account.port}</div>
                <div className="text-xs text-gray-500">
                  {account.username ? `User: ${account.username}` : 'Anonymous'} · {account.active ? 'Active' : 'Disabled'}
                </div>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:underline"
                onClick={() => startEditSmtp(account)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        <form className="space-y-4 rounded-lg border border-gray-200 bg-white p-4" onSubmit={handleSmtpSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Host
              <input
                type="text"
                value={smtpForm.host}
                onChange={(event) => setSmtpForm((prev) => ({ ...prev, host: event.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Port
              <input
                type="text"
                value={smtpForm.port}
                onChange={(event) => setSmtpForm((prev) => ({ ...prev, port: event.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Username
              <input
                type="text"
                value={smtpForm.username}
                onChange={(event) => setSmtpForm((prev) => ({ ...prev, username: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Password
              <input
                type="password"
                value={smtpForm.password}
                onChange={(event) => setSmtpForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={smtpForm.id ? 'Leave blank to keep existing password' : ''}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={smtpForm.ssl}
                onChange={(event) => setSmtpForm((prev) => ({ ...prev, ssl: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>SSL</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={smtpForm.tls}
                onChange={(event) => setSmtpForm((prev) => ({ ...prev, tls: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>TLS</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={smtpForm.active}
                onChange={(event) => setSmtpForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Active</span>
            </label>
          </div>

          {smtpFeedback && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{smtpFeedback}</div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {smtpForm.id ? `Editing account #${smtpForm.id}` : 'Creating new SMTP account'}
            </div>
            <div className="flex items-center gap-2">
              {smtpForm.id && (
                <button
                  type="button"
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300"
                  onClick={() => {
                    setSmtpForm(SMTP_DEFAULT)
                    setSmtpFeedback(null)
                  }}
                >
                  Cancel edit
                </button>
              )}
              <button
                type="submit"
                disabled={smtpSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {smtpSaving ? 'Saving…' : smtpForm.id ? 'Update SMTP' : 'Add SMTP'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Proxy Servers</h3>
            <p className="text-sm text-gray-500">Register the proxies that route SMS traffic and control rotation.</p>
          </div>
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:border-gray-300"
            onClick={() => {
              setProxyForm(PROXY_DEFAULT)
              setProxyFeedback(null)
            }}
          >
            Add New
          </button>
        </header>

        <div className="space-y-2">
          {loadingInfrastructure && proxyServers.length === 0 && (
            <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">Loading proxy servers...</div>
          )}
          {!loadingInfrastructure && proxyServers.length === 0 && (
            <div className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              No proxy servers configured yet. Add one using the form below.
            </div>
          )}
          {proxyServers.map((proxy) => (
            <div
              key={proxy.id}
              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-gray-900">{proxy.host}:{proxy.port}</div>
                <div className="text-xs text-gray-500">
                  {proxy.protocol?.toUpperCase() ?? 'HTTP'} · {proxy.is_active ? 'Active' : 'Disabled'}
                </div>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:underline"
                onClick={() => startEditProxy(proxy)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        <form className="space-y-4 rounded-lg border border-gray-200 bg-white p-4" onSubmit={handleProxySubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Host
              <input
                type="text"
                value={proxyForm.host}
                onChange={(event) => setProxyForm((prev) => ({ ...prev, host: event.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Port
              <input
                type="text"
                value={proxyForm.port}
                onChange={(event) => setProxyForm((prev) => ({ ...prev, port: event.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Username
              <input
                type="text"
                value={proxyForm.username}
                onChange={(event) => setProxyForm((prev) => ({ ...prev, username: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Password
              <input
                type="password"
                value={proxyForm.password}
                onChange={(event) => setProxyForm((prev) => ({ ...prev, password: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Protocol
              <select
                value={proxyForm.protocol}
                onChange={(event) => setProxyForm((prev) => ({ ...prev, protocol: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {protocolOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={proxyForm.is_active}
                onChange={(event) => setProxyForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Active</span>
            </label>
          </div>

          {proxyFeedback && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{proxyFeedback}</div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {proxyForm.id ? `Editing proxy #${proxyForm.id}` : 'Creating new proxy server'}
            </div>
            <div className="flex items-center gap-2">
              {proxyForm.id && (
                <button
                  type="button"
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300"
                  onClick={() => {
                    setProxyForm(PROXY_DEFAULT)
                    setProxyFeedback(null)
                  }}
                >
                  Cancel edit
                </button>
              )}
              <button
                type="submit"
                disabled={proxySaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {proxySaving ? 'Saving…' : proxyForm.id ? 'Update Proxy' : 'Add Proxy'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )

  const renderDeveloperView = () => (
    <div className="space-y-6 px-6 py-4">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
        Export your existing infrastructure as JSON for editing, or paste a JSON payload to validate and import updates. CSV
        downloads are supported for reference, but JSON is required for imports at the moment.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => exportConfiguration('json')}
          disabled={developerProcessing}
        >
          Export JSON
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:border-gray-300"
          onClick={() => exportConfiguration('csv')}
          disabled={developerProcessing}
        >
          Download CSV Snapshot
        </button>
        <label className="ml-auto text-sm text-gray-600">
          <span className="mr-2 font-medium">Import Format:</span>
          <select
            value={developerFormat}
            onChange={(event) => setDeveloperFormat(event.target.value as 'json' | 'csv')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Upload configuration file
          <input
            type="file"
            accept={developerFormat === 'json' ? '.json' : '.csv'}
            onChange={handleDeveloperFileUpload}
            className="mt-2 block w-full text-sm text-gray-600"
          />
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Configuration data
          <textarea
            rows={12}
            value={developerData}
            onChange={(event) => setDeveloperData(event.target.value)}
            placeholder={`Paste ${developerFormat.toUpperCase()} configuration here...`}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          onClick={importJsonConfiguration}
          disabled={developerProcessing || developerFormat !== 'json'}
        >
          {developerProcessing ? 'Processing…' : 'Import JSON'}
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          onClick={validateJsonConfiguration}
          disabled={developerProcessing || developerFormat !== 'json'}
        >
          Validate JSON
        </button>
        {developerFormat === 'csv' && (
          <span className="text-xs text-amber-600">CSV import is not yet supported. Convert to JSON to validate or import.</span>
        )}
      </div>

      {developerStatus && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{developerStatus}</div>
      )}

      {developerSummaryText && (
        <div>
          <div className="text-sm font-medium text-gray-700">Validation summary</div>
          <pre className="mt-2 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
{developerSummaryText}
          </pre>
        </div>
      )}
    </div>
  )

  const handleRefreshClick = () => {
    if (!loadingInfrastructure) {
      void loadInfrastructure()
    }
  }

  const tabList = (
    <div className="border-b border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
        <nav className="flex space-x-1">
          {[
            { key: 'guided', label: 'Guided view' },
            { key: 'developer', label: 'Developer view' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                activeView === tab.key
                  ? 'bg-white text-blue-600 shadow-inner'
                  : 'bg-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveView(tab.key as GuidedView)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={loadingInfrastructure}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-400"
        >
          {loadingInfrastructure ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>
    </div>
  )

  const content = (
    <div className={isPageMode ? 'overflow-visible' : 'max-h-[75vh] overflow-y-auto'}>
      {activeView === 'guided' ? renderGuidedView() : renderDeveloperView()}
    </div>
  )

  if (isPageMode) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {tabList}
        {content}
      </section>
    )
  }

  return (
    <Modal
      isOpen={Boolean(isOpen)}
      onClose={onClose ?? (() => {})}
      title="Manage Delivery Infrastructure"
      size="xl"
    >
      {tabList}
      {content}

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:border-gray-300"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export { DeliveryInfrastructureManager }
