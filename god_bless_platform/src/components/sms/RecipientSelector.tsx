/**
 * RecipientSelector Component
 * Interface for selecting and managing SMS campaign recipients
 */

import React, { useState, useEffect } from 'react'
import { phoneNumberService, smsService } from '../../services'
import type { PhoneNumber, NumberFilters } from '../../types'

interface RecipientSelectorProps {
  projectId?: string
  selectedRecipients: Array<{
    phone_number: string
    carrier?: string
    data?: Record<string, any>
  }>
  onRecipientsChange: (recipients: Array<{
    phone_number: string
    carrier?: string
    data?: Record<string, any>
  }>) => void
  targetCarrier?: string
  targetType?: string
  targetAreaCodes?: string[]
}

type RecipientSource = 'project_numbers' | 'uploaded_file' | 'manual_entry'

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  projectId,
  selectedRecipients,
  onRecipientsChange,
  targetCarrier,
  targetType,
  targetAreaCodes
}) => {
  const [recipientSource, setRecipientSource] = useState<RecipientSource>('project_numbers')
  const [projectNumbers, setProjectNumbers] = useState<PhoneNumber[]>([])
  const [filteredNumbers, setFilteredNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualNumbers, setManualNumbers] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [filters, setFilters] = useState<NumberFilters>({
    projectId,
    isValid: true,
    carrier: targetCarrier,
    lineType: targetType
  })

  // Load project numbers when component mounts or projectId changes
  useEffect(() => {
    if (projectId && recipientSource === 'project_numbers') {
      loadProjectNumbers()
    }
  }, [projectId, recipientSource])

  // Apply filters when filters change
  useEffect(() => {
    applyFilters()
  }, [projectNumbers, filters, targetAreaCodes])

  const loadProjectNumbers = async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await phoneNumberService.getNumbers({
        ...filters,
        projectId,
        page: 1,
        pageSize: 1000 // Load more numbers for selection
      })

      if (response.success) {
        setProjectNumbers(response.data.results)
      } else {
        throw new Error('Failed to load phone numbers')
      }
    } catch (error) {
      console.error('Failed to load project numbers:', error)
      setError(error instanceof Error ? error.message : 'Failed to load phone numbers')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...projectNumbers]

    // Apply carrier filter
    if (filters.carrier) {
      filtered = filtered.filter(num => 
        num.carrier?.toLowerCase().includes(filters.carrier!.toLowerCase())
      )
    }

    // Apply line type filter
    if (filters.lineType) {
      filtered = filtered.filter(num => num.lineType === filters.lineType)
    }

    // Apply area code filter
    if (targetAreaCodes && targetAreaCodes.length > 0) {
      filtered = filtered.filter(num => {
        const areaCode = num.number.substring(0, 3)
        return targetAreaCodes.includes(areaCode)
      })
    }

    // Apply validation filter
    if (filters.isValid !== undefined) {
      filtered = filtered.filter(num => num.isValid === filters.isValid)
    }

    setFilteredNumbers(filtered)
  }

  const handleSourceChange = (source: RecipientSource) => {
    setRecipientSource(source)
    setError(null)
    
    // Clear recipients when changing source
    onRecipientsChange([])
  }

  const handleNumberSelection = (number: PhoneNumber, selected: boolean) => {
    const recipient = {
      phone_number: number.number,
      carrier: number.carrier,
      data: {
        country: number.country,
        region: number.region,
        lineType: number.lineType
      }
    }

    if (selected) {
      onRecipientsChange([...selectedRecipients, recipient])
    } else {
      onRecipientsChange(
        selectedRecipients.filter(r => r.phone_number !== number.number)
      )
    }
  }

  const handleSelectAll = () => {
    const allRecipients = filteredNumbers.map(number => ({
      phone_number: number.number,
      carrier: number.carrier,
      data: {
        country: number.country,
        region: number.region,
        lineType: number.lineType
      }
    }))
    onRecipientsChange(allRecipients)
  }

  const handleDeselectAll = () => {
    onRecipientsChange([])
  }

  const handleManualNumbersSubmit = () => {
    const numbers = manualNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(number => ({
        phone_number: number,
        carrier: undefined,
        data: {}
      }))

    onRecipientsChange(numbers)
    setManualNumbers('')
  }

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file)
    setIsLoading(true)
    setError(null)

    try {
      // For now, we'll parse the file client-side since the backend endpoint isn't ready
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      const recipients = lines.map(line => {
        const phoneNumber = line.trim().replace(/[^\d+]/g, '') // Clean phone number
        return {
          phone_number: phoneNumber,
          carrier: undefined,
          data: {}
        }
      }).filter(recipient => recipient.phone_number.length > 0)

      onRecipientsChange(recipients)
    } catch (error) {
      console.error('Failed to process file:', error)
      setError(error instanceof Error ? error.message : 'Failed to process file')
    } finally {
      setIsLoading(false)
    }
  }

  const isNumberSelected = (number: PhoneNumber) => {
    return selectedRecipients.some(r => r.phone_number === number.number)
  }

  const renderProjectNumbers = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Filter Numbers</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier
            </label>
            <input
              type="text"
              value={filters.carrier || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, carrier: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter by carrier"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Line Type
            </label>
            <select
              value={filters.lineType || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, lineType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="mobile">Mobile</option>
              <option value="landline">Landline</option>
              <option value="voip">VoIP</option>
              <option value="toll_free">Toll Free</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="valid_only"
              checked={filters.isValid === true}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                isValid: e.target.checked ? true : undefined 
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="valid_only" className="ml-2 block text-sm text-gray-700">
              Valid numbers only
            </label>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {filteredNumbers.length} numbers available, {selectedRecipients.length} selected
        </div>
        <div className="space-x-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Numbers List */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading numbers...</div>
        ) : filteredNumbers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No numbers found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNumbers.map((number) => (
              <div
                key={number.id}
                className="p-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isNumberSelected(number)}
                    onChange={(e) => handleNumberSelection(number, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {number.formattedNumber || number.number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {number.carrier} • {number.lineType} • {number.country}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {number.isValid ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Invalid
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderFileUpload = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Upload a file with phone numbers
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                CSV, TXT, or JSON files up to 10MB
              </span>
            </label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept=".csv,.txt,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
            />
          </div>
        </div>
      </div>

      {uploadedFile && (
        <div className="text-sm text-gray-600">
          Uploaded: {uploadedFile.name} ({selectedRecipients.length} numbers processed)
        </div>
      )}
    </div>
  )

  const renderManualEntry = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter phone numbers (one per line)
        </label>
        <textarea
          value={manualNumbers}
          onChange={(e) => setManualNumbers(e.target.value)}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter phone numbers, one per line:&#10;+1234567890&#10;+1987654321"
        />
      </div>

      <button
        onClick={handleManualNumbersSubmit}
        disabled={!manualNumbers.trim()}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add Numbers
      </button>

      {selectedRecipients.length > 0 && (
        <div className="text-sm text-gray-600">
          {selectedRecipients.length} numbers added
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Source Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Recipient Source
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleSourceChange('project_numbers')}
            className={`p-4 border rounded-lg text-left ${
              recipientSource === 'project_numbers'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium text-gray-900">Project Numbers</div>
            <div className="text-sm text-gray-500">Use numbers from current project</div>
          </button>

          <button
            onClick={() => handleSourceChange('uploaded_file')}
            className={`p-4 border rounded-lg text-left ${
              recipientSource === 'uploaded_file'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium text-gray-900">Upload File</div>
            <div className="text-sm text-gray-500">Upload CSV, TXT, or JSON file</div>
          </button>

          <button
            onClick={() => handleSourceChange('manual_entry')}
            className={`p-4 border rounded-lg text-left ${
              recipientSource === 'manual_entry'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="font-medium text-gray-900">Manual Entry</div>
            <div className="text-sm text-gray-500">Enter numbers manually</div>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Source Content */}
      <div>
        {recipientSource === 'project_numbers' && renderProjectNumbers()}
        {recipientSource === 'uploaded_file' && renderFileUpload()}
        {recipientSource === 'manual_entry' && renderManualEntry()}
      </div>

      {/* Selected Recipients Summary */}
      {selectedRecipients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Selected Recipients ({selectedRecipients.length})
          </h4>
          <div className="text-sm text-blue-700">
            Ready to send SMS to {selectedRecipients.length} recipients
          </div>
        </div>
      )}
    </div>
  )
}