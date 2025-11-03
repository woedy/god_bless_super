import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SmsDeliverySettingsPage } from '../SmsDeliverySettingsPage'
import { smsService } from '../../../services'

vi.mock('../../../components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  )
}))

let smtpSpy: ReturnType<typeof vi.spyOn>
let proxySpy: ReturnType<typeof vi.spyOn>
let deleteSmtpSpy: ReturnType<typeof vi.spyOn>
let deleteProxySpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  smtpSpy = vi.spyOn(smsService, 'getSmtpAccounts').mockResolvedValue({
    success: true,
    data: []
  })
  proxySpy = vi.spyOn(smsService, 'getProxyServers').mockResolvedValue({
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
  deleteSmtpSpy = vi.spyOn(smsService, 'deleteSmtpAccount').mockResolvedValue({
    success: true,
    data: undefined
  })
  deleteProxySpy = vi.spyOn(smsService, 'deleteProxyServer').mockResolvedValue({
    success: true,
    data: undefined
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

  it('allows deleting SMTP accounts and proxy servers from the settings page', async () => {
    smtpSpy.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 1,
          host: 'smtp.delete-me.test',
          port: '2525',
          username: 'relay@test.com',
          active: true
        }
      ]
    })

    proxySpy.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 11,
          host: 'proxy.delete-me.test',
          port: 8080,
          protocol: 'http',
          is_active: true
        }
      ]
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<SmsDeliverySettingsPage />)

    expect(await screen.findByText(/smtp\.delete-me\.test:2525/i)).toBeInTheDocument()
    expect(await screen.findByText(/proxy\.delete-me\.test:8080/i)).toBeInTheDocument()

    const smtpText = await screen.findByText(/smtp\.delete-me\.test:2525/i)
    const smtpRow = smtpText.closest('div')?.parentElement?.parentElement as HTMLElement
    const smtpDeleteButton = within(smtpRow).getByRole('button', { name: /Delete/i })

    const proxyText = await screen.findByText(/proxy\.delete-me\.test:8080/i)
    const proxyRow = proxyText.closest('div')?.parentElement?.parentElement as HTMLElement
    const proxyDeleteButton = within(proxyRow).getByRole('button', { name: /Delete/i })

    fireEvent.click(proxyDeleteButton)
    fireEvent.click(smtpDeleteButton)

    await waitFor(() => expect(deleteProxySpy).toHaveBeenCalledWith(11))
    await waitFor(() => expect(deleteSmtpSpy).toHaveBeenCalledWith(1))

    confirmSpy.mockRestore()
  })
})
