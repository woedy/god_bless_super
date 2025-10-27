import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
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
    data: [{ id: 11, host: 'proxy.local', port: 8000, protocol: 'http', success_rate: 95 }]
  })
  vi.spyOn(smsService, 'processMessageTemplate').mockResolvedValue({
    success: true,
    data: { processed: 'Hello world' }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CampaignForm manual delivery configuration', () => {
  it('prevents submission when rotations have no selections', async () => {
    const handleSubmit = vi.fn()

    render(
      <MemoryRouter>
        <CampaignForm
          onSubmit={handleSubmit}
          onCancel={() => {}}
        />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText(/Campaign Information/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Enter campaign name/i), { target: { value: 'Test Campaign' } })
    fireEvent.change(screen.getByPlaceholderText(/Enter your SMS message/i), { target: { value: 'Hello world' } })

    fireEvent.click(screen.getByRole('button', { name: /Create Campaign/i }))

    await waitFor(() => {
      expect(screen.getByText(/Select at least one SMTP account/i)).toBeInTheDocument()
    })

    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('submits delivery settings with selected infrastructure and template', async () => {
    const handleSubmit = vi.fn()

    render(
      <MemoryRouter>
        <CampaignForm
          onSubmit={handleSubmit}
          onCancel={() => {}}
        />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByLabelText(/smtp.local:25/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Enter campaign name/i), { target: { value: 'Test Campaign' } })
    fireEvent.change(screen.getByPlaceholderText(/Enter your SMS message/i), { target: { value: 'Hello world' } })

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
