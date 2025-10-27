import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    data: []
  })
  vi.spyOn(smsService, 'getRotationSettings').mockResolvedValue({
    success: true,
    data: {
      proxy_rotation_enabled: true,
      proxy_rotation_strategy: 'round_robin',
      smtp_rotation_enabled: true,
      smtp_rotation_strategy: 'round_robin',
      delivery_delay_enabled: true,
      delivery_delay_min: 2,
      delivery_delay_max: 6
    }
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
    expect(await screen.findByRole('heading', { name: /Delivery delay & rotation defaults/i })).toBeInTheDocument()
  })

  it('allows switching to developer view for JSON workflows', async () => {
    render(<SmsDeliverySettingsPage />)

    const developerTab = await screen.findByRole('button', { name: /Developer view/i })
    fireEvent.click(developerTab)

    expect(await screen.findByText(/Configuration data/i)).toBeInTheDocument()
  })
})
