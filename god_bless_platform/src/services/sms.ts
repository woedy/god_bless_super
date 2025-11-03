/**
 * SMS Campaign API Service
 * Handles all SMS campaign-related API operations
 */

import { apiClient } from './api'
import { authService } from './auth'
import type {
  ApiResponse,
  CreateCampaignData,
  Campaign,
  CampaignFilters,
  CampaignReportParams,
  SendSMSParams,
  PaginatedResponse,
  FileUploadResponse,
  TaskActionRequest
} from '../types'
import type { CampaignDeliverySettings } from '../types/rotation'

// SMS Campaign Service
export class SMSService {
  /**
   * Create a new SMS campaign
   */
  async createCampaign(campaignData: CreateCampaignData): Promise<ApiResponse<Campaign>> {
    return apiClient.post<Campaign>('/sms-sender/campaigns/', campaignData)
  }

  /**
   * Get all campaigns for the current user
   */
  async getCampaigns(filters?: CampaignFilters): Promise<ApiResponse<Campaign[]>> {
    return apiClient.get<Campaign[]>('/sms-sender/campaigns/', filters)
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaign(campaignId: string): Promise<ApiResponse<Campaign>> {
    return apiClient.get<Campaign>(`/sms-sender/campaigns/${campaignId}/`)
  }

  /**
   * Update a campaign
   */
  async updateCampaign(campaignId: string, updates: Partial<CreateCampaignData>): Promise<ApiResponse<Campaign>> {
    return apiClient.put<Campaign>(`/sms-sender/campaigns/${campaignId}/`, updates)
  }

  /**
   * Fetch delivery settings for a campaign
   */
  async getCampaignDeliverySettings(campaignId: string | number): Promise<ApiResponse<CampaignDeliverySettings>> {
    return apiClient.get<CampaignDeliverySettings>(
      '/sms-sender/api/campaign-delivery-settings/by_campaign/',
      { campaign_id: String(campaignId) }
    )
  }

  /**
   * Update delivery settings for a campaign
   */
  async updateCampaignDeliverySettings(
    campaignId: string | number,
    settings: Partial<CampaignDeliverySettings>
  ): Promise<ApiResponse<CampaignDeliverySettings>> {
    return apiClient.post<CampaignDeliverySettings>(
      '/sms-sender/api/campaign-delivery-settings/update_by_campaign/',
      {
        campaign_id: String(campaignId),
        ...settings
      }
    )
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(campaignId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/sms-sender/campaigns/${campaignId}/`)
  }

  /**
   * Start a campaign
   */
  async startCampaign(campaignId: string): Promise<ApiResponse<{ task_id: string; message: string }>> {
    return apiClient.post<{ task_id: string; message: string }>(`/sms-sender/campaigns/${campaignId}/start/`)
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>(`/sms-sender/campaigns/${campaignId}/pause/`)
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>(`/sms-sender/campaigns/${campaignId}/cancel/`)
  }

  /**
   * Get campaign statistics and report
   */
  async getCampaignReport(campaignId: string, params?: CampaignReportParams): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/sms-sender/campaigns/${campaignId}/stats/`, params)
  }

  /**
   * Get campaign messages with pagination
   */
  async getCampaignMessages(
    campaignId: string, 
    params?: { page?: number; page_size?: number; status?: string }
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    return apiClient.get<PaginatedResponse<any>>(`/sms-sender/campaigns/${campaignId}/messages/`, params)
  }

  /**
   * Add recipients to a campaign
   */
  async addCampaignRecipients(
    campaignId: string, 
    recipients: Array<{ phone_number: string; carrier?: string; data?: Record<string, any> }>
  ): Promise<ApiResponse<{ created_count: number; errors: any[] }>> {
    return apiClient.post<{ created_count: number; errors: any[] }>(
      `/sms-sender/campaigns/${campaignId}/recipients/`,
      { recipients }
    )
  }

  /**
   * Send single SMS (legacy endpoint)
   */
  async sendSingleSMS(params: {
    user_id: string
    v_phone_number: string
    sender_name: string
    subject: string
    message: string
    smtp_id: string
    provider: string
  }): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/sms-sender/send-single-sms/', params)
  }

  /**
   * Send bulk SMS (legacy endpoint)
   */
  async sendBulkSMS(params: {
    user_id: string
    v_phone_numbers: string[]
    sender_name: string
    subject: string
    message: string
    provider: string
  }): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/sms-sender/send-bulk-sms/', params)
  }

  /**
   * Upload external numbers file for SMS campaign
   * Note: This endpoint may not be implemented yet on the backend
   */
  async uploadExternalNumbers(
    file: File,
    additionalData?: { campaign_id?: string; validate_numbers?: boolean }
  ): Promise<ApiResponse<FileUploadResponse>> {
    // TODO: Implement this endpoint on the backend
    throw new Error('Upload external numbers endpoint not implemented yet')
  }

  /**
   * Get SMTP providers and configurations
   */
  async getSmtpProviders(userId: string): Promise<ApiResponse<{
    smtps: any[]
    providers: string[]
  }>> {
    return apiClient.get<{
      smtps: any[]
      providers: string[]
    }>('/sms-sender/get-smtps-providers/', { user_id: userId })
  }

  /**
   * Get SMTP accounts for the authenticated user via the manager API
   */
  async getSmtpAccounts(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/smtp-manager/api/')
  }

  /**
   * Create a new SMTP account through the manager API
   */
  async createSmtpAccount(account: {
    host?: string
    port?: string | number
    username?: string
    password?: string
    ssl?: boolean
    tls?: boolean
    active?: boolean
  }): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/smtp-manager/api/', account)
  }

  /**
   * Update an existing SMTP account
   */
  async updateSmtpAccount(
    accountId: number | string,
    updates: Partial<{
      host: string
      port: string | number
      username: string
      password: string
      ssl: boolean
      tls: boolean
      active: boolean
    }>
  ): Promise<ApiResponse<any>> {
    return apiClient.patch<any>(`/smtp-manager/api/${accountId}/`, updates)
  }

  /**
   * Delete an SMTP account owned by the authenticated user
   */
  async deleteSmtpAccount(accountId: number | string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/smtp-manager/api/${accountId}/`)
  }

  /**
   * Get proxy servers available to the authenticated user
   */
  async getProxyServers(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/proxy-server/api/')
  }

  /**
   * Add a new proxy server configuration
   */
  async createProxyServer(proxy: {
    host: string
    port: string | number
    username?: string
    password?: string
    protocol?: string
    is_active?: boolean
  }): Promise<ApiResponse<any>> {
    const payload: Record<string, unknown> = {
      host: proxy.host,
      port: Number(proxy.port),
      protocol: proxy.protocol ?? 'http',
      is_active: proxy.is_active ?? true
    }

    if (proxy.username) {
      payload.username = proxy.username
    }

    if (proxy.password) {
      payload.password = proxy.password
    }

    return apiClient.post<any>('/proxy-server/api/', payload)
  }

  /**
   * Update an existing proxy server configuration
   */
  async updateProxyServer(
    proxyId: number | string,
    updates: Partial<{
      host: string
      port: string | number
      username: string
      password: string
      protocol: string
      is_active: boolean
    }>
  ): Promise<ApiResponse<any>> {
    const payload: Record<string, unknown> = {}

    if (updates.host !== undefined) {
      payload.host = updates.host
    }
    if (updates.port !== undefined) {
      payload.port = Number(updates.port)
    }
    if (updates.username !== undefined) {
      payload.username = updates.username
    }
    if (updates.password !== undefined) {
      payload.password = updates.password
    }
    if (updates.protocol !== undefined) {
      payload.protocol = updates.protocol
    }
    if (updates.is_active !== undefined) {
      payload.is_active = updates.is_active
    }

    return apiClient.patch<any>(`/proxy-server/api/${proxyId}/`, payload)
  }

  /**
   * Delete a proxy server configuration
   */
  async deleteProxyServer(proxyId: number | string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/proxy-server/api/${proxyId}/`)
  }

  /**
   * Retrieve rotation and delivery delay defaults for the authenticated user
   */
  async getRotationSettings(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/sms-sender/api/rotation-settings/')
  }

  /**
   * Update rotation and delivery delay defaults for the authenticated user
   */
  async updateRotationSettings(payload: Record<string, unknown>): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/sms-sender/api/rotation-settings/', payload)
  }

  /**
   * Export the user's delivery infrastructure configuration
   */
  async exportBulkConfiguration(format: 'json' | 'csv' = 'json'): Promise<ApiResponse<string>> {
    return apiClient.get<string>('/sms-sender/api/bulk-configuration/export/', { format })
  }

  /**
   * Import delivery infrastructure configuration from JSON payload
   */
  async importBulkConfiguration(payload: Record<string, any>): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/sms-sender/api/bulk-configuration/import_config/', payload)
  }

  /**
   * Validate a configuration payload without importing
   */
  async validateBulkConfiguration(payload: Record<string, any>): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/sms-sender/api/bulk-configuration/validate_import/', payload)
  }

  /**
   * Get available campaign templates
   */
  async getCampaignTemplates(category?: string): Promise<ApiResponse<{
    templates: any[]
    categories: string[]
  }>> {
    return apiClient.get<{
      templates: any[]
      categories: string[]
    }>('/sms-sender/templates/', category ? { category } : undefined)
  }

  /**
   * Get specific template by ID
   */
  async getTemplate(templateId: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/sms-sender/templates/${templateId}/`)
  }

  /**
   * Process message template with macros
   */
  async processMessageTemplate(params: {
    template: string
    custom_data?: Record<string, any>
    recipient_data?: Record<string, any>
  }): Promise<ApiResponse<{
    original: string
    processed: string
    macros_found: string[]
    validation: any
  }>> {
    return apiClient.post<{
      original: string
      processed: string
      macros_found: string[]
      validation: any
    }>('/sms-sender/process-template/', params)
  }

  /**
   * Get available macros for message templates
   */
  async getAvailableMacros(): Promise<ApiResponse<{
    macros: Record<string, any>
    sample_data: Record<string, any>
  }>> {
    return apiClient.get<{
      macros: Record<string, any>
      sample_data: Record<string, any>
    }>('/sms-sender/macros/')
  }

  /**
   * Get rate limiting information
   */
  async getRateLimitInfo(carrier?: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/sms-sender/rate-limits/', carrier ? { carrier } : undefined)
  }

  /**
   * Test rate limiting for a carrier
   */
  async testRateLimit(params: {
    carrier: string
    campaign_id?: string
  }): Promise<ApiResponse<{
    carrier: string
    can_send: boolean
    stats: any
  }>> {
    return apiClient.post<{
      carrier: string
      can_send: boolean
      stats: any
    }>('/sms-sender/rate-limits/test/', params)
  }

  /**
   * Get SMS campaign dashboard statistics
   */
  async getCampaignDashboard(): Promise<ApiResponse<{
    total_campaigns: number
    active_campaigns: number
    completed_campaigns: number
    total_messages: number
    sent_messages: number
    failed_messages: number
    success_rate: number
    recent_campaigns: Campaign[]
  }>> {
    return apiClient.get<{
      total_campaigns: number
      active_campaigns: number
      completed_campaigns: number
      total_messages: number
      sent_messages: number
      failed_messages: number
      success_rate: number
      recent_campaigns: Campaign[]
    }>('/sms-sender/dashboard/')
  }

  /**
   * Get all carrier providers list
   */
  async getCarrierProviders(): Promise<ApiResponse<{
    providers: string[]
  }>> {
    return apiClient.get<{
      providers: string[]
    }>('/sms-sender/get-all-carrier-list/')
  }
}

// Create and export singleton instance
export const smsService = new SMSService()