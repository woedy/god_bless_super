import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../../components/layout'
import { smsService } from '../../services/sms'
import { ROUTES } from '../../config/routes'
import type { BreadcrumbItem } from '../../types'

type ProxyHealthRow = {
  id: number
  host: string
  port: number
  protocol?: string
  is_active: boolean
  is_healthy: boolean
  health_check_failures?: number
  last_health_check?: string | null
  last_health_check_latency_ms?: number | null
  last_health_check_status_code?: number | null
  last_health_check_error?: string | null
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD
  },
  {
    label: 'Settings'
  },
  {
    label: 'Proxy Health Checker',
    href: ROUTES.PROXY_HEALTH_CHECKER,
    isActive: true
  }
]

export function ProxyHealthCheckerPage() {
  const [loading, setLoading] = useState(false)
  const [checkingAll, setCheckingAll] = useState(false)
  const [rowCheckingId, setRowCheckingId] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proxies, setProxies] = useState<ProxyHealthRow[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [downloadStatus, setDownloadStatus] = useState<{
    taskId: string | null
    status: string
    message: string
    progress?: number
    currentStep?: string
    stats?: { total: number; added: number; healthy: number; unhealthy: number }
  } | null>(null)

  const activeCount = useMemo(() => proxies.filter((p) => p.is_active).length, [proxies])
  const healthyCount = useMemo(
    () => proxies.filter((p) => p.is_active && p.is_healthy).length,
    [proxies]
  )

  const loadProxies = useCallback(async (page: number = pagination.page) => {
    setLoading(true)
    setError(null)
    try {
      const response = await smsService.getProxies({ page, page_size: pagination.pageSize })
      if (response.success) {
        const data = response.data as any
        setProxies(data.results || [])
        setPagination(prev => ({
          ...prev,
          page: data.current_page || page,
          total: data.count || 0,
          totalPages: Math.ceil((data.count || 0) / pagination.pageSize)
        }))
      } else {
        setError('Unable to load proxy list.')
      }
    } catch (e) {
      console.error('Failed to load proxies', e)
      setError('Unable to load proxy list.')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    void loadProxies()
  }, [loadProxies])

  const checkAll = async () => {
    setCheckingAll(true)
    setError(null)
    try {
      const response = await smsService.checkAllProxiesHealth()
      if (response.success) {
        const payload = response.data as any
        const list = Array.isArray(payload?.proxies) ? payload.proxies : []
        setProxies(list)
      } else {
        setError('Unable to run proxy health checks.')
      }
    } catch (e) {
      console.error('Failed to check all proxies', e)
      setError('Unable to run proxy health checks.')
    } finally {
      setCheckingAll(false)
    }
  }

  const checkOne = async (proxyId: number) => {
    setRowCheckingId(proxyId)
    setError(null)
    try {
      const response = await smsService.checkProxyHealth(proxyId)
      if (response.success) {
        const updated = response.data as any
        setProxies((prev) => prev.map((p) => (p.id === proxyId ? { ...p, ...updated } : p)))
      } else {
        setError('Unable to check proxy health.')
      }
    } catch (e) {
      console.error('Failed to check proxy', e)
      setError('Unable to check proxy health.')
    } finally {
      setRowCheckingId(null)
    }
  }

  const downloadAndTestProxies = async (protocols: string[] = ['http', 'socks5'], limit: number = 500) => {
    setDownloading(true)
    setError(null)
    setDownloadStatus(null)
    
    try {
      const response = await smsService.downloadAndTestProxies({ protocols, limit })
      if (response.success) {
        const data = response.data as any
        setDownloadStatus({
          taskId: data.task_id,
          status: data.status,
          message: 'Download task started'
        })
        
        // Start polling for status
        pollDownloadStatus(data.task_id)
      } else {
        setError('Unable to start proxy download.')
        setDownloading(false)
      }
    } catch (e) {
      console.error('Failed to start proxy download', e)
      setError('Unable to start proxy download.')
      setDownloading(false)
    }
  }

  const pollDownloadStatus = async (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await smsService.getProxyDownloadStatus(taskId)
        if (response.success) {
          const data = response.data as any
          setDownloadStatus(data)
          
          if (data.status === 'SUCCESS') {
            clearInterval(pollInterval)
            setDownloading(false)
            // Reload proxies to show new ones
            await loadProxies()
          } else if (data.status === 'FAILURE') {
            clearInterval(pollInterval)
            setDownloading(false)
            setError(data.message || 'Download failed')
          }
        }
      } catch (e) {
        console.error('Failed to check download status', e)
        clearInterval(pollInterval)
        setDownloading(false)
      }
    }, 2000)
    
    // Cleanup after 5 minutes max
    setTimeout(() => {
      clearInterval(pollInterval)
      setDownloading(false)
    }, 300000)
  }

  const cleanupUnhealthyProxies = async () => {
    setError(null)
    try {
      const response = await smsService.cleanupUnhealthyProxies()
      if (response.success) {
        // Reload proxies after cleanup
        await loadProxies()
      } else {
        setError('Unable to cleanup unhealthy proxies.')
      }
    } catch (e) {
      console.error('Failed to cleanup proxies', e)
      setError('Unable to cleanup unhealthy proxies.')
    }
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Proxy Health Checker</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Run live health checks against your proxy pool. Results update each proxy&apos;s health status, latency, and last
            error.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-200">
              <div>
                <span className="font-semibold">Total:</span> {proxies.length}
              </div>
              <div>
                <span className="font-semibold">Active:</span> {activeCount}
              </div>
              <div>
                <span className="font-semibold">Healthy:</span> {healthyCount}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                onClick={() => void loadProxies()}
                disabled={loading || checkingAll || downloading}
              >
                Refresh
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                onClick={() => void checkAll()}
                disabled={loading || checkingAll || downloading || proxies.length === 0}
              >
                {checkingAll ? 'Checking…' : 'Check All'}
              </button>
              <button
                type="button"
                className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                onClick={() => void downloadAndTestProxies()}
                disabled={loading || checkingAll || downloading}
              >
                {downloading ? 'Downloading…' : 'Download & Test'}
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                onClick={() => void cleanupUnhealthyProxies()}
                disabled={loading || checkingAll || downloading}
              >
                Cleanup
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {downloadStatus && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Proxy Download Status</div>
                  <div className="text-xs mt-1">{downloadStatus.message}</div>
                  {downloadStatus.currentStep && (
                    <div className="text-xs mt-1 font-medium">{downloadStatus.currentStep}</div>
                  )}
                  {downloadStatus.stats && (
                    <div className="text-xs mt-1">
                      Total: {downloadStatus.stats.total} | 
                      Added: {downloadStatus.stats.added} | 
                      Healthy: {downloadStatus.stats.healthy} | 
                      Unhealthy: {downloadStatus.stats.unhealthy}
                    </div>
                  )}
                </div>
                {downloadStatus.progress !== undefined && (
                  <div className="text-xs font-medium">{downloadStatus.progress}%</div>
                )}
              </div>
              {downloadStatus.progress !== undefined && (
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2 dark:bg-blue-800">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${downloadStatus.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Proxy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Last Check</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Latency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">HTTP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Failures</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Last Error</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300" colSpan={8}>
                      Loading proxies…
                    </td>
                  </tr>
                )}

                {!loading && proxies.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300" colSpan={8}>
                      No proxies found. Add proxies in SMS Delivery Infrastructure.
                    </td>
                  </tr>
                )}

                {!loading &&
                  proxies.map((proxy) => {
                    const statusLabel = !proxy.is_active ? 'Inactive' : proxy.is_healthy ? 'Healthy' : 'Unhealthy'
                    const statusClass = !proxy.is_active
                      ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                      : proxy.is_healthy
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'

                    const lastCheck = proxy.last_health_check ? new Date(proxy.last_health_check).toLocaleString() : '—'

                    return (
                      <tr key={proxy.id}>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {proxy.protocol?.toUpperCase() ?? 'HTTP'}://{proxy.host}:{proxy.port}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{lastCheck}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {proxy.last_health_check_latency_ms !== null && proxy.last_health_check_latency_ms !== undefined
                            ? `${proxy.last_health_check_latency_ms} ms`
                            : '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {proxy.last_health_check_status_code !== null && proxy.last_health_check_status_code !== undefined
                            ? proxy.last_health_check_status_code
                            : '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{proxy.health_check_failures ?? '—'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {proxy.last_health_check_error ? proxy.last_health_check_error : '—'}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                            onClick={() => void checkOne(proxy.id)}
                            disabled={checkingAll || rowCheckingId !== null || downloading}
                          >
                            {rowCheckingId === proxy.id ? 'Checking…' : 'Check'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-200">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} proxies
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  onClick={() => void loadProxies(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading || downloading}
                >
                  Previous
                </button>
                <span className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  onClick={() => void loadProxies(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading || downloading}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}

export default ProxyHealthCheckerPage
