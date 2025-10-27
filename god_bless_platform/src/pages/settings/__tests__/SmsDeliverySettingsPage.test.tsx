import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SmsDeliverySettingsPage } from '../SmsDeliverySettingsPage'
import { smsService } from '../../../services'

vi.mock('../../../components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  )
}))

let smtpSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  smtpSpy = vi.spyOn(smsService, 'getSmtpAccounts').mockResolvedValue({
    success: true,
    data: []
  })
  vi.spyOn(smsService, 'getProxyServers').mockResolvedValue({
    success: true,
    data: { proxies: [] }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SmsDeliverySettingsPage', () => {
  it('renders guided management surface and loads infrastructure', async () => {
    render(<SmsDeliverySettingsPage />)

    expect(await screen.findByRole('heading', { name: /^SMS Delivery Infrastructure$/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Guided view/i })).toBeInTheDocument()

    await waitFor(() => expect(smtpSpy).toHaveBeenCalled())
    expect(await screen.findByRole('heading', { name: /^SMTP Accounts$/i })).toBeInTheDocument()
  })

  it('allows switching to developer view for JSON workflows', async () => {
    render(<SmsDeliverySettingsPage />)

    const developerTab = await screen.findByRole('button', { name: /Developer view/i })
    developerTab.click()

    expect(await screen.findByText(/Configuration data/i)).toBeInTheDocument()
  })
})
