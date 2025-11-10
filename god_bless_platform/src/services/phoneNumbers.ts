/**
 * Phone Number API Service
 * Handles phone number generation, validation, and management operations
 */

import { apiClient } from './api'
import { API_ENDPOINTS } from '../config/constants'
import type {
  ApiResponse,
  PaginatedResponse,
  GenerateNumbersParams,
  ValidateNumbersParams,
  NumberFilters,
  ExportParams,
  ExportResponse,
  ImportNumbersParams,
  FileUploadResponse,
  BulkOperationResponse
} from '../types'
import type { PhoneNumber, Task } from '../types/models'

// Define specific response types
interface PhoneNumberStatistics {
  total: number
  valid: number
  invalid: number
  byCarrier: Record<string, number>
  byCountry: Record<string, number>
  byLineType: Record<string, number>
  recentlyGenerated: number
  recentlyValidated: number
}

interface CountryInfo {
  code: string
  name: string
  flag: string
  supportedCarriers: string[]
}

interface CarrierInfo {
  name: string
  code: string
  supportedLineTypes: string[]
}

interface SingleValidationResult {
  isValid: boolean
  formattedNumber: string
  carrier?: string
  lineType?: string
  country: string
  countryCode: string
  region?: string
  timezone?: string
  error?: string
}

/**
 * Phone Number Service Class
 */
class PhoneNumberServiceClass {
  /**
   * Generate phone numbers
   * Initiates a Celery task for phone number generation
   */
  async generateNumbers(params: GenerateNumbersParams): Promise<ApiResponse<Task>> {
    console.log('PhoneNumberService - Generating numbers:', params)
    
    // Get user ID from localStorage
    const userData = localStorage.getItem('god_bless_user_data')
    let userId = ''
    if (userData) {
      try {
        const user = JSON.parse(userData)
        userId = user.user_id || user.id
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }

    const normalizedAreaCodes = Array.isArray(params.areaCodes)
      ? Array.from(
          new Set(
            params.areaCodes
              .map(code => (typeof code === 'string' ? code.trim() : ''))
              .map(code => code.replace(/\D/g, ''))
              .filter(code => code.length === 3)
          )
        )
      : []

    // Use provided area codes first, then fall back to prefix/default
    let areaCode = normalizedAreaCodes[0] || '555'
    if (!normalizedAreaCodes.length && params.prefix) {
      // If prefix looks like an area code (3 digits), use it
      if (/^\d{3}$/.test(params.prefix)) {
        areaCode = params.prefix
      } else {
        // Try to extract 3-digit area code from prefix
        const match = params.prefix.match(/\d{3}/)
        if (match) {
          areaCode = match[0]
        }
      }
    }
    
    const requestData: Record<string, unknown> = {
      user_id: userId,
      project_id: params.projectId,
      area_code: areaCode,
      quantity: params.quantity,
      carrier_filter: params.carrier || null,
      type_filter: params.lineType || null,
      auto_validate: params.autoValidate || false, // Send auto-validation preference
      batch_size: 1000 // Default batch size
    }

    if (normalizedAreaCodes.length > 0) {
      requestData.area_codes = normalizedAreaCodes
    }

    try {
      const backendResponse = await apiClient.post<{
        message: string
        data: {
          task_id: string
          status: string
          message: string
        }
      }>(API_ENDPOINTS.PHONE_NUMBERS.GENERATE, requestData)
      
      if (backendResponse.success && backendResponse.data.message === 'Phone number generation started') {
        // Transform backend response to frontend expected format
        const transformedResponse: ApiResponse<Task> = {
          success: true,
          data: {
            id: backendResponse.data.data.task_id,
            type: 'phone_generation',
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString(),
            userId: userId,
            parameters: params,
            retryCount: 0,
            maxRetries: 3,
            canRetry: true,
            progressMessage:
              backendResponse.data.data.message || backendResponse.data.message
          } as Task
        }
        
        console.log('PhoneNumberService - Transformed generate response:', transformedResponse)
        return transformedResponse
      } else {
        throw new Error('Backend returned unsuccessful response')
      }
    } catch (error) {
      console.error('PhoneNumberService - Generate error:', error)
      throw error
    }
  }

  /**
   * Validate phone numbers
   * Initiates bulk validation via Celery task when supported, otherwise falls back to
   * the legacy synchronous validation endpoint.
   */
  async validateNumbers(params: ValidateNumbersParams): Promise<ApiResponse<Task>> {
    console.log('PhoneNumberService - Validating numbers:', params)

    // Get user ID from localStorage
    const userData = localStorage.getItem('god_bless_user_data')
    let userId = ''
    if (userData) {
      try {
        const user = JSON.parse(userData)
        userId = user.user_id || user.id
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }

    const hasManualNumbers = Array.isArray(params.numbers) && params.numbers.length > 0
    const hasPhoneIds = Array.isArray(params.phoneNumberIds) && params.phoneNumberIds.length > 0
    const hasProjectTarget = Boolean(params.projectId)
    const timestamp = new Date().toISOString()

    const buildSummaryTask = (
      message: string,
      stats?: {
        validated_count?: number
        error_count?: number
        phone_count?: number
        total_processed?: number
      },
      success = true
    ): ApiResponse<Task> => {
      const validated = stats?.validated_count ?? stats?.total_processed ?? 0
      const failed = stats?.error_count ?? 0
      const processed = stats?.total_processed ?? validated + failed
      const total = stats?.phone_count ?? processed

      const task: Task = {
        id: `validation_${Date.now()}`,
        type: 'phone_validation',
        status: success ? 'completed' : 'failed',
        progress: 100,
        createdAt: timestamp,
        completedAt: timestamp,
        userId,
        projectId: params.projectId,
        parameters: params,
        retryCount: 0,
        maxRetries: 3,
        canRetry: true,
        progressMessage: message,
        result: {
          success,
          message,
          statistics: {
            totalItems: total,
            processedItems: processed,
            successfulItems: validated,
            failedItems: failed,
            skippedItems: Math.max(total - processed, 0),
            duration: 0
          }
        }
      }

      return {
        success: true,
        data: task
      }
    }

    try {
      const shouldUseEnhancedEndpoint = !hasManualNumbers && (hasProjectTarget || hasPhoneIds)

      if (shouldUseEnhancedEndpoint) {
        const enhancedPayload: Record<string, unknown> = {
          user_id: userId,
          batch_size: params.batchSize ?? 1000
        }

        if (hasProjectTarget) {
          enhancedPayload.project_id = params.projectId
        }

        if (hasPhoneIds) {
          enhancedPayload.phone_ids = params.phoneNumberIds
        }

        const response = await apiClient.post<{
          message: string
          data?: {
            task_id?: string
            message?: string
          }
        }>(API_ENDPOINTS.PHONE_NUMBERS.VALIDATE_ENHANCED, enhancedPayload)

        const backendResponse = response.data

        if (response.success && backendResponse?.data?.task_id) {
          const taskId = backendResponse.data.task_id
          const progressMessage = backendResponse.data.message || backendResponse.message || 'Validation task started'

          const transformedResponse: ApiResponse<Task> = {
            success: true,
            data: {
              id: taskId,
              type: 'phone_validation',
              status: 'pending',
              progress: 0,
              createdAt: timestamp,
              userId,
              projectId: params.projectId,
              parameters: params,
              retryCount: 0,
              maxRetries: 3,
              canRetry: true,
              progressMessage
            } as Task
          }

          console.log('PhoneNumberService - Enhanced validation task:', transformedResponse)
          return transformedResponse
        }

        console.warn(
          'PhoneNumberService - Enhanced validation response missing task id, falling back to summary handling',
          backendResponse
        )

        return buildSummaryTask(
          backendResponse?.message || 'Validation completed'
        )
      }

      // Legacy/manual fallback flow
      const fallbackPayload: Record<string, unknown> = {
        user_id: userId,
        project_id: params.projectId,
        batch_size: params.batchSize
      }

      if (hasManualNumbers) {
        fallbackPayload.numbers = params.numbers
      }

      const response = await apiClient.post<{
        message: string
        data?: {
          validated_count?: number
          error_count?: number
          phone_count?: number
          total_processed?: number
        }
        validated?: number
        failed?: number
      }>(API_ENDPOINTS.PHONE_NUMBERS.VALIDATE, fallbackPayload)

      const backendResponse = response.data

      const statistics = {
        validated_count:
          backendResponse.data?.validated_count ?? backendResponse.validated ?? 0,
        error_count: backendResponse.data?.error_count ?? backendResponse.failed ?? 0,
        total_processed: backendResponse.data?.total_processed,
        phone_count: backendResponse.data?.phone_count
      }

      return buildSummaryTask(
        backendResponse.message || 'Validation completed',
        statistics
      )
    } catch (error) {
      console.error('PhoneNumberService - Validate error:', error)
      throw error
    }
  }

  /**
   * Get phone numbers with filtering and pagination
   */
  async getNumbers(filters: NumberFilters = {}): Promise<ApiResponse<PaginatedResponse<PhoneNumber>>> {
    console.log('🔍 PhoneNumberService - Getting numbers with filters:', filters)
    console.log('🔍 PhoneNumberService - Building API parameters...')
    
    const params: Record<string, unknown> = {}
    
    // Required parameters for backend
    // Get user ID from localStorage (stored during login)
    const userData = localStorage.getItem('god_bless_user_data')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        // Backend expects user_id field, not the primary key id
        params.user_id = user.user_id || user.id
        console.log('🔍 PhoneNumberService - User ID:', params.user_id)
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }
    
    // Pagination
    if (filters.page) params.page = filters.page
    if (filters.pageSize) params.page_size = filters.pageSize
    if (filters.search) params.search = filters.search
    if (filters.ordering) params.ordering = filters.ordering
    
    // Filters - map frontend filter names to backend parameter names
    if (filters.projectId) params.project_id = filters.projectId
    
    // Add validation status filter
    if (filters.isValid !== undefined) {
      params.valid_number = filters.isValid.toString()
      console.log('🔍 PhoneNumberService - Adding valid_number filter:', params.valid_number)
    }
    
    // Add carrier filter
    if (filters.carrier) {
      params.carrier = filters.carrier
      console.log('🔍 PhoneNumberService - Adding carrier filter:', params.carrier)
    }
    
    // Add country filter (backend expects country_name)
    if (filters.country) {
      params.country_name = filters.country
      console.log('🔍 PhoneNumberService - Adding country_name filter:', params.country_name)
    }
    
    // Add line type filter (backend expects type)
    if (filters.lineType) {
      params.type = filters.lineType
      console.log('🔍 PhoneNumberService - Adding type filter:', params.type)
    }

    console.log('🔍 PhoneNumberService - Final API parameters:', params)
    
    // Build the full URL for debugging
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    const fullUrl = `${API_ENDPOINTS.PHONE_NUMBERS.LIST}?${queryString}`
    console.log('🔍 PhoneNumberService - Full API URL:', fullUrl)

    try {
      const backendResponse = await apiClient.get<{
        message: string
        data: {
          numbers: PhoneNumber[]
          pagination: {
            page_number: number
            count: number
            total_pages: number
            next: number | null
            previous: number | null
          }
        }
      }>(API_ENDPOINTS.PHONE_NUMBERS.LIST, params)
      
      if (backendResponse.success && backendResponse.data.message === 'Successful') {
        // Transform backend phone numbers to frontend format
        const transformedNumbers: PhoneNumber[] = backendResponse.data.data.numbers.map((backendNumber: any) => ({
          id: backendNumber.id,
          number: backendNumber.phone_number,
          formattedNumber: backendNumber.phone_number, // Backend doesn't format, use as-is
          carrier: backendNumber.carrier,
          lineType: backendNumber.type,
          isValid: backendNumber.valid_number,
          validatedAt: backendNumber.validation_date,
          validationError: backendNumber.valid_number === false ? 'Validation failed' : undefined,
          country: backendNumber.country_name || 'Unknown',
          countryCode: backendNumber.code || '+1',
          region: backendNumber.state,
          timezone: undefined, // Backend doesn't provide timezone
          projectId: backendNumber.project,
          createdAt: backendNumber.created_at,
          updatedAt: backendNumber.updated_at,
          metadata: {
            source: 'generated', // Default source
            generationBatch: undefined,
            importBatch: undefined,
            tags: [],
            notes: undefined,
            lastUsed: undefined,
            usageCount: 0
          }
        }))

        // Transform backend response to frontend expected format
        const transformedResponse: ApiResponse<PaginatedResponse<PhoneNumber>> = {
          success: true,
          data: {
            results: transformedNumbers,
            count: backendResponse.data.data.pagination.count,
            next: backendResponse.data.data.pagination.next ? `?page=${backendResponse.data.data.pagination.next}` : undefined,
            previous: backendResponse.data.data.pagination.previous ? `?page=${backendResponse.data.data.pagination.previous}` : undefined,
            page: backendResponse.data.data.pagination.page_number,
            pageSize: filters.pageSize || 100,
            totalPages: backendResponse.data.data.pagination.total_pages
          }
        }
        
        console.log('PhoneNumberService - Transformed response:', transformedResponse)
        return transformedResponse
      } else {
        throw new Error('Backend returned unsuccessful response')
      }
    } catch (error) {
      console.error('PhoneNumberService - Get numbers error:', error)
      throw error
    }
  }

  /**
   * Export phone numbers in various formats
   * Initiates a background task for file generation
   */
  async exportNumbers(params: ExportParams): Promise<ApiResponse<ExportResponse>> {
    console.log('🔍 PhoneNumberService - Exporting numbers with params:', params)
    console.log('🔍 PhoneNumberService - Export filters received:', params.filters)
    
    // Get user ID from localStorage
    const userData = localStorage.getItem('god_bless_user_data')
    let userId = ''
    if (userData) {
      try {
        const user = JSON.parse(userData)
        userId = user.user_id || user.id
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }

    const requestData: Record<string, unknown> = {
      user_id: userId,
      format: params.format,
      include_invalid: params.includeInvalid || false,
      include_metadata: params.includeMetadata || false
    }

    // Add project filter if specified
    if (params.projectId) {
      requestData.project_id = params.projectId
    }

    // Add custom fields if specified (backend expects 'fields', not 'custom_fields')
    if (params.customFields && params.customFields.length > 0) {
      requestData.fields = params.customFields
    }

    // Add filters - map frontend field names to backend field names (same as list method)
    if (params.filters) {
      const filterObj: Record<string, unknown> = {}
      
      // Handle validation status filter (convert boolean to string like list method)
      if (params.filters.isValid !== undefined) {
        filterObj.valid_number = params.filters.isValid.toString()
      }
      
      if (params.filters.carrier) filterObj.carrier = params.filters.carrier
      if (params.filters.country) filterObj.country_name = params.filters.country
      
      // Map lineType to type for backend compatibility
      if (params.filters.lineType) {
        filterObj.type = params.filters.lineType
        console.log('🔍 PhoneNumberService - Mapping lineType filter:', params.filters.lineType, '-> type:', filterObj.type)
      }
      
      if (params.filters.source) filterObj.source = params.filters.source
      if (params.filters.search) filterObj.search = params.filters.search
      if (params.filters.areaCode) filterObj.area_code = params.filters.areaCode
      
      console.log('🔍 PhoneNumberService - Export filters:', filterObj)
      requestData.filters = filterObj
    }

    console.log('🔍 PhoneNumberService - Final export request data:', requestData)
    
    const response = await apiClient.post<ExportResponse>(API_ENDPOINTS.PHONE_NUMBERS.EXPORT, requestData)
    
    console.log('🔍 PhoneNumberService - Export response:', response)
    console.log('PhoneNumberService - Response success:', response.success)
    console.log('PhoneNumberService - Response data keys:', response.data ? Object.keys(response.data) : 'No data')
    console.log('PhoneNumberService - Has content field:', response.data && 'content' in response.data)
    if (response.data && 'content' in response.data) {
      console.log('PhoneNumberService - Content length:', response.data.content?.length)
      console.log('PhoneNumberService - Content type:', typeof response.data.content)
    }
    return response
  }

  /**
   * Import phone numbers from file
   * Uploads and processes phone numbers from CSV, TXT, or JSON files
   */
  async importNumbers(params: ImportNumbersParams): Promise<ApiResponse<FileUploadResponse>> {
    console.log('PhoneNumberService - Importing numbers:', params)
    
    const formData = new FormData()
    formData.append('file', params.file)
    formData.append('project_id', params.projectId)
    formData.append('format', params.format)
    
    if (params.validateOnImport !== undefined) {
      formData.append('validate_on_import', params.validateOnImport.toString())
    }
    
    if (params.skipDuplicates !== undefined) {
      formData.append('skip_duplicates', params.skipDuplicates.toString())
    }
    
    if (params.mapping) {
      formData.append('mapping', JSON.stringify(params.mapping))
    }

    const response = await apiClient.post<FileUploadResponse>('/phone-generator/import/', formData)
    
    console.log('PhoneNumberService - Import response:', response)
    return response
  }

  /**
   * Get phone number by ID
   */
  async getNumberById(id: string): Promise<ApiResponse<PhoneNumber>> {
    console.log('PhoneNumberService - Getting number by ID:', id)
    
    const response = await apiClient.get<PhoneNumber>(`/phone-generator/list-numbers/${id}/`)
    
    console.log('PhoneNumberService - Get number response:', response)
    return response
  }

  /**
   * Update phone number
   */
  async updateNumber(id: string, data: Partial<PhoneNumber>): Promise<ApiResponse<PhoneNumber>> {
    console.log('PhoneNumberService - Updating number:', id, data)
    
    const response = await apiClient.patch<PhoneNumber>(`/phone-generator/list-numbers/${id}/`, data)
    
    console.log('PhoneNumberService - Update response:', response)
    return response
  }

  /**
   * Delete phone number
   */
  async deleteNumber(id: string): Promise<ApiResponse<void>> {
    console.log('PhoneNumberService - Deleting number:', id)
    
    const response = await apiClient.delete<void>(`/phone-generator/list-numbers/${id}/`)
    
    console.log('PhoneNumberService - Delete response:', response)
    return response
  }

  /**
   * Delete all phone numbers for a project
   */
  async deleteAllNumbers(projectId: string): Promise<ApiResponse<BulkOperationResponse>> {
    console.log('PhoneNumberService - Deleting all numbers for project:', projectId)

    // Get user ID from localStorage
    const userData = localStorage.getItem('god_bless_user_data')
    let userId = ''
    if (userData) {
      try {
        const user = JSON.parse(userData)
        userId = user.user_id || user.id
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }

    const params = {
      user_id: userId,
      project_id: projectId
    }

    const response = await apiClient.get<BulkOperationResponse>(API_ENDPOINTS.PHONE_NUMBERS.DELETE_ALL, params)

    console.log('PhoneNumberService - Delete all response:', response)
    return response
  }

  /**
   * Delete filtered phone numbers for a project
   */
  async deleteFilteredNumbers(projectId: string, filters: NumberFilters): Promise<ApiResponse<BulkOperationResponse>> {
    console.log('PhoneNumberService - Deleting filtered numbers for project:', projectId, 'with filters:', filters)

    // Get user ID from localStorage
    const userData = localStorage.getItem('god_bless_user_data')
    let userId = ''
    if (userData) {
      try {
        const user = JSON.parse(userData)
        userId = user.user_id || user.id
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }

    // Build filter parameters for the request (same format as list endpoint)
    const filterParams: Record<string, unknown> = {}

    if (filters.search) filterParams.search = filters.search
    if (filters.isValid !== undefined) filterParams.valid_number = filters.isValid.toString()
    if (filters.carrier) filterParams.carrier = filters.carrier
    if (filters.country) filterParams.country_name = filters.country
    if (filters.lineType) filterParams.type = filters.lineType

    const requestData = {
      user_id: userId,
      project_id: projectId,
      ...filterParams
    }

    try {
      const response = await apiClient.post<BulkOperationResponse>(API_ENDPOINTS.PHONE_NUMBERS.DELETE_FILTERED, requestData)

      console.log('PhoneNumberService - Delete filtered response:', response)
      return response
    } catch (error) {
      console.error('PhoneNumberService - Delete filtered error:', error)
      throw error
    }
  }

  /**
   * Bulk delete phone numbers
   */
  async bulkDeleteNumbers(phoneNumberIds: string[]): Promise<ApiResponse<BulkOperationResponse>> {
    console.log('PhoneNumberService - Bulk deleting numbers:', phoneNumberIds)

    // Get user ID from localStorage
    const userData = localStorage.getItem('god_bless_user_data')
    let userId = ''
    if (userData) {
      try {
        const user = JSON.parse(userData)
        userId = user.user_id || user.id
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }

    // Build URL with user_id as query parameter
    const params = new URLSearchParams({ user_id: userId })
    const url = `/phone-generator/delete-numbers/?${params.toString()}`

    const response = await apiClient.post<BulkOperationResponse>(url, {
      selectedNumbers: phoneNumberIds
    })

    console.log('PhoneNumberService - Bulk delete response:', response)
    return response
  }

  /**
   * Get phone number statistics for a project
   */
  async getNumberStatistics(projectId?: string): Promise<ApiResponse<PhoneNumberStatistics>> {
    console.log('PhoneNumberService - Getting statistics for project:', projectId)
    
    const params: Record<string, unknown> = {}
    if (projectId) params.project_id = projectId
    
    const response = await apiClient.get<PhoneNumberStatistics>('/phone-generator/statistics/', params)
    
    console.log('PhoneNumberService - Statistics response:', response)
    return response
  }

  /**
   * Get available countries for phone number generation
   */
  async getAvailableCountries(): Promise<ApiResponse<CountryInfo[]>> {
    console.log('PhoneNumberService - Getting available countries')
    
    // Mock data until backend endpoint is implemented
    const mockCountries: CountryInfo[] = [
      { code: 'US', name: 'United States', flag: '🇺🇸', supportedCarriers: ['Verizon', 'AT&T', 'T-Mobile'] },
      { code: 'CA', name: 'Canada', flag: '🇨🇦', supportedCarriers: ['Rogers', 'Bell', 'Telus'] },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', supportedCarriers: ['EE', 'Vodafone', 'O2'] },
    ]
    
    return {
      success: true,
      data: mockCountries
    }
  }

  /**
   * Get available carriers for a country
   */
  async getAvailableCarriers(countryCode: string): Promise<ApiResponse<CarrierInfo[]>> {
    console.log('PhoneNumberService - Getting carriers for country:', countryCode)
    
    // Mock data until backend endpoint is implemented
    const carriersByCountry: Record<string, CarrierInfo[]> = {
      'US': [
        { name: 'Verizon', code: 'verizon', supportedLineTypes: ['mobile', 'landline'] },
        { name: 'AT&T', code: 'att', supportedLineTypes: ['mobile', 'landline'] },
        { name: 'T-Mobile', code: 'tmobile', supportedLineTypes: ['mobile'] },
      ],
      'CA': [
        { name: 'Rogers', code: 'rogers', supportedLineTypes: ['mobile', 'landline'] },
        { name: 'Bell', code: 'bell', supportedLineTypes: ['mobile', 'landline'] },
        { name: 'Telus', code: 'telus', supportedLineTypes: ['mobile'] },
      ],
      'GB': [
        { name: 'EE', code: 'ee', supportedLineTypes: ['mobile'] },
        { name: 'Vodafone', code: 'vodafone', supportedLineTypes: ['mobile', 'landline'] },
        { name: 'O2', code: 'o2', supportedLineTypes: ['mobile'] },
      ]
    }
    
    return {
      success: true,
      data: carriersByCountry[countryCode] || []
    }
  }

  /**
   * Validate a single phone number
   */
  async validateSingleNumber(phoneNumber: string, _provider?: string): Promise<ApiResponse<SingleValidationResult>> {
    console.log('PhoneNumberService - Validating single number:', phoneNumber)
    
    // Mock validation until backend supports raw phone number validation
    // Basic validation logic
    const cleaned = phoneNumber.replace(/\D/g, '')
    const isValid = cleaned.length >= 10 && cleaned.length <= 15
    
    const mockResult: SingleValidationResult = {
      isValid,
      formattedNumber: isValid ? `+1 (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}` : phoneNumber,
      country: 'United States',
      countryCode: '+1',
      carrier: isValid ? 'Unknown' : undefined,
      lineType: isValid ? 'mobile' : undefined,
      region: isValid ? 'Unknown' : undefined,
      error: isValid ? undefined : 'Invalid phone number format'
    }
    
    return {
      success: true,
      data: mockResult
    }
  }
}

// Create and export singleton instance
export const phoneNumberService = new PhoneNumberServiceClass()

// Export the class for testing
export { PhoneNumberServiceClass as PhoneNumberService }
