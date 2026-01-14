/**
 * SMS Campaign API Service
 * Handles all SMS campaign-related API operations
 */

import { apiClient } from './api'
import type {
  ApiResponse,
  CreateCampaignData,
  Campaign,
  CampaignFilters,
  CampaignReportParams,
  PaginatedResponse,
  FileUploadResponse,
  SendSingleSMSRequest,
  SingleSMSResponse,
  SendBulkSMSRequest,
  BulkSMSResponse
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
    return apiClient.get<Campaign[]>('/sms-sender/campaigns/', filters as unknown as Record<string, unknown> | undefined)
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
    return apiClient.get<any>(
      `/sms-sender/campaigns/${campaignId}/stats/`,
      params as unknown as Record<string, unknown> | undefined
    )
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
   * Send a single SMS via the simplified sender endpoint
   */
  async sendSingleSMS(payload: SendSingleSMSRequest): Promise<ApiResponse<SingleSMSResponse>> {
    return apiClient.post<SingleSMSResponse>('/sms-sender/send-single-sms/', payload)
  }

  /**
   * Send a bulk SMS job via the simplified sender endpoint
   */
  async sendBulkSMS(payload: SendBulkSMSRequest): Promise<ApiResponse<BulkSMSResponse>> {
    return apiClient.post<BulkSMSResponse>('/sms-sender/send-bulk-sms/', payload)
  }

  /**
   * Upload external numbers file for SMS campaign
   * Note: This endpoint may not be implemented yet on the backend
   */
  async uploadExternalNumbers(
    _file: File,
    _additionalData?: { campaign_id?: string; validate_numbers?: boolean }
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
   * Retrieve proxy servers owned by the authenticated user
   */
  async getProxies(params?: { page?: number; page_size?: number }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    
    const url = queryParams.toString() ? `proxy-server/list/?${queryParams}` : 'proxy-server/list/'
    const response = await apiClient.get<any>(url)

    // Backend uses envelope: { message: 'Successful', data: { results, count, ... } }
    // Normalize so callers can use response.data.results directly.
    const payload = response.data as any
    const normalizedData = payload?.data ?? payload

    return {
      ...response,
      data: normalizedData
    }
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

    return apiClient.post<any>('proxy-server/api/', payload)
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

    return apiClient.patch<any>(`proxy-server/api/${proxyId}/`, payload)
  }

  /**
   * Delete a proxy server configuration
   */
  async deleteProxyServer(proxyId: number | string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`proxy-server/api/${proxyId}/`)
  }

  /**
   * Run a live health check for a single proxy owned by the authenticated user
   */
  async checkProxyHealth(proxyId: number | string): Promise<ApiResponse<any>> {
    return apiClient.post<any>('proxy-server/health/check/', { proxy_id: Number(proxyId) })
  }

  /**
   * Run live health checks for all proxies owned by the authenticated user
   */
  async checkAllProxiesHealth(): Promise<ApiResponse<any>> {
    return apiClient.post<any>('proxy-server/health/check-all/', {})
  }

  /**
   * Download proxies from GeoNode and test their health
   */
  async downloadAndTestProxies(options: { protocols?: string[], limit?: number }): Promise<ApiResponse<any>> {
    return apiClient.post<any>('proxy-server/download/', options)
  }

  /**
   * Get status of proxy download task
   */
  async getProxyDownloadStatus(taskId: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`proxy-server/download/status/${taskId}/`)
  }

  /**
   * Clean up unhealthy proxies
   */
  async cleanupUnhealthyProxies(): Promise<ApiResponse<any>> {
    return apiClient.post<any>('proxy-server/cleanup/', {})
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
   * Get dashboard statistics (total campaigns, messages sent/failed)
   */
  async getDashboardStats(): Promise<ApiResponse<{
    total_campaigns: number
    messages_sent: number
    messages_failed: number
  }>> {
    return apiClient.get<{
      total_campaigns: number
      messages_sent: number
      messages_failed: number
    }>('/sms-sender/dashboard-stats/')
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
