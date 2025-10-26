import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { CampaignForm } from '../CampaignForm'
import { smsService } from '../../../services'

vi.mock('../OneClickOptimization', () => ({
  __esModule: true,
  default: () => null
}))

const mockMacros = { macros: { FIRST: 'First name' } }
const mockTemplates = {
  templates: [
    {
      id: 'flash_sale',
      name: 'Flash Sale',
      category: 'marketing',
      description: 'Boost conversions',
      message_template: 'Hello world',
      use_case: 'Promo'
    }
  ],
  categories: []
}

beforeEach(() => {
  vi.spyOn(smsService, 'getAvailableMacros').mockResolvedValue({ success: true, data: mockMacros })
  vi.spyOn(smsService, 'getCampaignTemplates').mockResolvedValue({ success: true, data: mockTemplates })
  vi.spyOn(smsService, 'getSmtpAccounts').mockResolvedValue({
    success: true,
    data: [
      { id: 1, host: 'smtp.local', port: 25, username: 'mailer', success_rate: 98 }
    ]
  })
  vi.spyOn(smsService, 'getProxyServers').mockResolvedValue({
    success: true,
    data: { proxies: [{ id: 11, host: 'proxy.local', port: 8000, protocol: 'http', success_rate: 95 }] }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CampaignForm manual delivery configuration', () => {
  it('prevents submission when rotations have no selections', async () => {
    const handleSubmit = vi.fn()

    render(
      <CampaignForm
        onSubmit={handleSubmit}
        onCancel={() => {}}
      />
    )

    await waitFor(() => expect(screen.getByText(/Campaign Information/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/Campaign Name/i), { target: { value: 'Test Campaign' } })
    fireEvent.change(screen.getByLabelText(/Message Template/i), { target: { value: 'Hello world' } })

    fireEvent.click(screen.getByRole('button', { name: /Create Campaign/i }))

    await waitFor(() => {
      expect(screen.getByText(/Select at least one SMTP account/i)).toBeInTheDocument()
    })

    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('submits delivery settings with selected infrastructure and template', async () => {
    const handleSubmit = vi.fn()

    render(
      <CampaignForm
        onSubmit={handleSubmit}
        onCancel={() => {}}
      />
    )

    await waitFor(() => expect(screen.getByLabelText(/smtp.local:25/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/Campaign Name/i), { target: { value: 'Test Campaign' } })
    fireEvent.change(screen.getByLabelText(/Message Template/i), { target: { value: 'Hello world' } })

    fireEvent.click(screen.getByLabelText(/smtp.local:25/i))
    fireEvent.click(screen.getByLabelText(/proxy.local:8000/i))

    fireEvent.change(screen.getByLabelText(/Apply Template/i), { target: { value: 'flash_sale' } })

    fireEvent.click(screen.getByRole('button', { name: /Create Campaign/i }))

    await waitFor(() => expect(handleSubmit).toHaveBeenCalled())

    const payload = handleSubmit.mock.calls[0][0]
    expect(payload.delivery_settings.selected_smtp_account_ids).toEqual([1])
    expect(payload.delivery_settings.selected_proxy_ids).toEqual([11])
    expect(payload.delivery_settings.applied_template_id).toBe('flash_sale')
  })
})
