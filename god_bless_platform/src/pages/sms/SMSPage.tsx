/**
 * SMS Landing Page
 * Simple hub that highlights single and bulk sending flows
 */

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { ROUTES } from '../../config/routes'
import { smsService } from '../../services'
import type { BreadcrumbItem } from '../../types'

const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'SMS', href: '/sms', isActive: true }
]

const cards = [
  {
    title: 'Send Single SMS',
    description: 'Quickly deliver a personalized SMS to one recipient using your delivery infrastructure.',
    actionLabel: 'Open Single Sender',
    href: ROUTES.SMS_SINGLE
  },
  {
    title: 'Send Bulk SMS',
    description: 'Import or select multiple recipients, personalize with macros, and monitor delivery via tasks.',
    actionLabel: 'Open Bulk Sender',
    href: ROUTES.SMS_BULK
  }
]

interface DashboardStats {
  totalCampaigns: number
  messagesSent: number
  messagesFailed: number
  smtpServers: number
  proxyServers: number
}

export function SMSPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    messagesSent: 0,
    messagesFailed: 0,
    smtpServers: 0,
    proxyServers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const [smtpResponse, proxyResponse, statsResponse] = await Promise.all([
        smsService.getSmtpAccounts(),
        smsService.getProxyServers(),
        smsService.getDashboardStats()
      ])

      console.log('SMTP Response:', smtpResponse)
      console.log('Proxy Response:', proxyResponse)
      console.log('Stats Response:', statsResponse)

      // Count active SMTP servers
      let smtpCount = 0
      if (smtpResponse.success && smtpResponse.data) {
        if (Array.isArray(smtpResponse.data)) {
          smtpCount = smtpResponse.data.filter((s: any) => s.active && !s.is_archived).length
        }
      }

      // Count active proxy servers
      let proxyCount = 0
      if (proxyResponse.success && proxyResponse.data) {
        if (Array.isArray(proxyResponse.data)) {
          proxyCount = proxyResponse.data.filter((p: any) => p.is_active).length
        } else if ((proxyResponse.data as any)?.proxies) {
          proxyCount = (proxyResponse.data as any).proxies.filter((p: any) => p.is_active).length
        }
      }

      const campaignStats = statsResponse.success && statsResponse.data
        ? statsResponse.data
        : { total_campaigns: 0, messages_sent: 0, messages_failed: 0 }

      setStats({
        totalCampaigns: campaignStats.total_campaigns,
        messagesSent: campaignStats.messages_sent,
        messagesFailed: campaignStats.messages_failed,
        smtpServers: smtpCount,
        proxyServers: proxyCount
      })
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Active SMTP Servers', value: stats.smtpServers, color: 'blue' },
    { label: 'Active Proxy Servers', value: stats.proxyServers, color: 'green' },
    { label: 'Messages Sent', value: stats.messagesSent, color: 'purple' },
    { label: 'Messages Failed', value: stats.messagesFailed, color: 'red' }
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMS Sender</h1>
          <p className="text-gray-600 mt-2">
            Choose a sending mode below. Both flows reuse your delivery infrastructure, rotation policies, and
            manual recipient sources.
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              <div className={`text-2xl font-bold mt-2 text-${stat.color}-600`}>
                {loading ? '...' : (stat.value ?? 0)}
              </div>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <div key={card.title} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{card.title}</h2>
                <p className="text-gray-600 mt-3">{card.description}</p>
              </div>
              <button
                onClick={() => navigate(card.href)}
                className="mt-6 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {card.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
