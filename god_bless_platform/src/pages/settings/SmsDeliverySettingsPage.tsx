/**
 * SMS Delivery Settings Page
 * Dedicated management surface for SMTP, proxy, and delay infrastructure
 */

import React, { useState } from 'react'
import { AppLayout } from '../../components/layout'
import { DeliveryInfrastructureManager } from '../../components/sms/DeliveryInfrastructureManager'
import { ROUTES } from '../../config/routes'
import type { BreadcrumbItem } from '../../types'

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD
  },
  {
    label: 'Settings'
  },
  {
    label: 'SMS Delivery Infrastructure',
    href: ROUTES.SMS_DELIVERY_SETTINGS,
    isActive: true
  }
]

export function SmsDeliverySettingsPage() {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SMS Delivery Infrastructure</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Configure SMTP accounts, proxy pools, and delivery delays from a single control centre. Updates here feed directly
            into manual campaigns, automation flows, and optimization templates.
          </p>
        </header>

        <section className="space-y-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <h2 className="text-base font-semibold text-blue-900 dark:text-blue-100">How this page works</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Use the <strong>Guided view</strong> to add or edit SMTP accounts and proxy servers with form validation.</li>
            <li>Switch to the <strong>Developer view</strong> for JSON import/export, validation, and bulk automation alignment.</li>
            <li>Changes persist instantly&mdash;campaign forms and optimization flows reload the latest settings without a refresh.</li>
          </ul>
          {lastUpdatedAt && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Infrastructure last updated at {lastUpdatedAt.toLocaleTimeString()}.
            </p>
          )}
        </section>

        <DeliveryInfrastructureManager
          displayMode="page"
          onUpdated={() => setLastUpdatedAt(new Date())}
        />
      </div>
    </AppLayout>
  )
}

export default SmsDeliverySettingsPage
