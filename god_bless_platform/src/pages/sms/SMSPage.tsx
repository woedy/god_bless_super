/**
 * SMS Landing Page
 * Simple hub that highlights single and bulk sending flows
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout'
import { ROUTES } from '../../config/routes'
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

export function SMSPage() {
  const navigate = useNavigate()

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
