import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { BulkSMSPage } from '../BulkSMSPage'
import { smsService } from '../../../services'

vi.mock('../../../components/sms', () => {
  const React = require('react')
  return {
    __esModule: true,
    BulkSMSForm: ({ onSubmit }: any) => {
      React.useEffect(() => {
        onSubmit({
          recipients: ['+15550001', '+15550002'],
          message: 'Hello team',
          sender_name: 'Ops',
          subject: 'Launch',
          provider: 'TestProvider',
          delivery_settings: {
            use_proxy_rotation: true,
            proxy_rotation_strategy: 'round_robin',
            use_smtp_rotation: true,
            smtp_rotation_strategy: 'round_robin',
            custom_delay_enabled: false,
            custom_delay_min: 1,
            custom_delay_max: 5,
            custom_random_seed: undefined,
            selected_proxy_ids: [11],
            selected_smtp_account_ids: [1],
            applied_template_id: 'flash_sale',
            adaptive_optimization_enabled: true,
            carrier_optimization_enabled: false,
            timezone_optimization_enabled: false
          },
          applied_template_id: 'flash_sale'
        })
      }, [onSubmit])
      return <div data-testid="bulk-form-mock" />
    }
  }
})

vi.mock('../../../components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>
}))

vi.mock('../../../contexts', () => ({
  useProject: () => ({
    currentProjectId: '',
    selectProject: vi.fn(),
    isReady: true
  })
}))

beforeEach(() => {
  vi.spyOn(smsService, 'createCampaign').mockResolvedValue({
    success: true,
    data: { id: 42, name: 'Manual bulk send' }
  })
  vi.spyOn(smsService, 'updateCampaignDeliverySettings').mockResolvedValue({
    success: true,
    data: {
      id: 1
    }
  })
  vi.spyOn(smsService, 'addCampaignRecipients').mockResolvedValue({
    success: true,
    data: { created_count: 2, errors: [] }
  })
  vi.spyOn(smsService, 'startCampaign').mockResolvedValue({
    success: true,
    data: { task_id: 'abc123', message: 'started' }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BulkSMSPage save behaviour', () => {
  it('persists delivery settings through update service', async () => {
    const updateSpy = vi.spyOn(smsService, 'updateCampaignDeliverySettings')

    render(
      <MemoryRouter>
        <BulkSMSPage />
      </MemoryRouter>
    )

    await waitFor(() => expect(updateSpy).toHaveBeenCalled())

    expect(updateSpy).toHaveBeenCalledWith(42, expect.objectContaining({
      selected_proxy_ids: [11],
      selected_smtp_account_ids: [1],
      applied_template_id: 'flash_sale'
    }))
  })
})
