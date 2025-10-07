/**
 * ExportDialog Component
 * Modal dialog for exporting phone numbers in multiple formats
 */

import React, { useState, useEffect } from 'react'
import { Button, Select, Modal, Checkbox, Card, Badge, ProgressBar } from '../common'
import { phoneNumberService } from '../../services'
import { websocketManager } from '../../services'
import type { ExportParams, NumberFilters, Project } from '../../types'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  project: Project
  filters?: NumberFilters
  selectedNumbers?: string[]
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
}

type ExportFormat = 'csv' | 'txt' | 'json' | 'doc'

interface ExportOptions {
  format: ExportFormat
  includeInvalid: boolean
  includeMetadata: boolean
  customFields: string[]
  downloadFilename?: string
}

const FORMAT_DESCRIPTIONS = {
  csv: 'Comma-separated values file, compatible with Excel and most applications',
  txt: 'Plain text file with one phone number per line',
  json: 'JSON format with complete phone number data and metadata',
  doc: 'Microsoft Word document with formatted phone number list'
}

const AVAILABLE_FIELDS = [
  { key: 'phone_number', label: 'Phone Number', required: true },
  { key: 'carrier', label: 'Carrier', required: false },
  { key: 'type', label: 'Line Type', required: false },
  { key: 'valid_number', label: 'Validation Status', required: false },
  { key: 'country_name', label: 'Country', required: false },
  { key: 'code', label: 'Country Code', required: false },
  { key: 'state', label: 'Region', required: false },
  { key: 'area_code', label: 'Area Code', required: false },
  { key: 'validation_date', label: 'Validation Date', required: false },
  { key: 'created_at', label: 'Creation Date', required: false },
  { key: 'updated_at', label: 'Updated Date', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'prefix', label: 'Prefix', required: false }
]

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  project,
  filters,
  selectedNumbers,
  onSuccess,
  onError
}) => {
  // Export options state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeInvalid: false,
    includeMetadata: false,
    customFields: ['phone_number', 'carrier', 'type', 'valid_number', 'country_name']
  })

  // Export progress state
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [progressMessage, setProgressMessage] = useState<string>('')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  // Estimated export info
  const [estimatedCount, setEstimatedCount] = useState<number>(0)
  const [estimatedSize, setEstimatedSize] = useState<string>('')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setProgress(0)
      setProgressMessage('')
      setCurrentTaskId(null)
      setDownloadUrl(null)
      setIsExporting(false)
      
      // Estimate export count
      if (selectedNumbers && selectedNumbers.length > 0) {
        setEstimatedCount(selectedNumbers.length)
      } else {
        // Use project phone count or make an API call to get filtered count
        setEstimatedCount(project.phone_stats?.total || 0)
      }
    }
  }, [isOpen, selectedNumbers, project])

  // WebSocket task progress monitoring
  useEffect(() => {
    if (currentTaskId) {
      const handleTaskProgress = (message: { data?: any; [key: string]: any }) => {
        const data = message.data || message
        if (data.task_id === currentTaskId || data.taskId === currentTaskId) {
          setProgress(data.progress || 0)
          setProgressMessage(data.message || data.progressMessage || '')
        }
      }

      const handleTaskComplete = (message: { data?: any; [key: string]: any }) => {
        const data = message.data || message
        if (data.task_id === currentTaskId || data.taskId === currentTaskId) {
          setIsExporting(false)
          setProgress(100)
          setProgressMessage('Export completed successfully!')
          
          const result = data.result
          if (result?.downloadUrl) {
            setDownloadUrl(result.downloadUrl)
          }
          
          setCurrentTaskId(null)
          onSuccess?.('Export completed successfully!')
        }
      }

      const handleTaskError = (message: { data?: any; [key: string]: unknown }) => {
        const data = message.data || message
        if (data.task_id === currentTaskId || data.taskId === currentTaskId) {
          setIsExporting(false)
          setProgress(0)
          setProgressMessage('')
          setCurrentTaskId(null)
          onError?.(data.error || 'Export failed')
        }
      }

      const unsubscribeProgress = websocketManager.subscribe('task_progress', handleTaskProgress)
      const unsubscribeComplete = websocketManager.subscribe('task_complete', handleTaskComplete)
      const unsubscribeError = websocketManager.subscribe('task_error', handleTaskError)

      return () => {
        unsubscribeProgress()
        unsubscribeComplete()
        unsubscribeError()
      }
    }
  }, [currentTaskId, onSuccess, onError])

  // Update estimated size when options change
  useEffect(() => {
    const bytesPerNumber = exportOptions.format === 'json' ? 200 : 
                          exportOptions.format === 'csv' ? 100 : 
                          exportOptions.format === 'doc' ? 150 : 15
    
    const totalBytes = estimatedCount * bytesPerNumber
    
    if (totalBytes < 1024) {
      setEstimatedSize(`${totalBytes} B`)
    } else if (totalBytes < 1024 * 1024) {
      setEstimatedSize(`${(totalBytes / 1024).toFixed(1)} KB`)
    } else {
      setEstimatedSize(`${(totalBytes / (1024 * 1024)).toFixed(1)} MB`)
    }
  }, [estimatedCount, exportOptions.format])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setProgress(0)
      setProgressMessage('Starting export...')
      setDownloadUrl(null)

      // Use the phoneNumberService for export
      const params: ExportParams = {
        projectId: project.id,
        format: exportOptions.format,
        includeInvalid: exportOptions.includeInvalid,
        includeMetadata: exportOptions.includeMetadata,
        customFields: exportOptions.customFields,
        filters: filters
      }

      console.log('ExportDialog - Export params:', params)

      const response = await phoneNumberService.exportNumbers(params)
      
      console.log('ExportDialog - Service response:', response)
      console.log('ExportDialog - Response success:', response.success)
      console.log('ExportDialog - Response data keys:', response.data ? Object.keys(response.data) : 'No data')
      console.log('ExportDialog - Nested data keys:', response.data?.data ? Object.keys(response.data.data) : 'No nested data')
      console.log('ExportDialog - Has content field:', response.data?.data && 'content' in response.data.data)
      console.log('ExportDialog - Content value:', response.data?.data?.content?.substring(0, 100) + '...')
      console.log('ExportDialog - Format value:', response.data?.data?.format)
      console.log('ExportDialog - Filename value:', response.data?.data?.filename)

      if (response.success && response.data) {
        // The backend response is nested: response.data.data contains the actual export data
        const exportData = response.data.data || response.data
        
        // Check for background task first (this is the most common case for large datasets)
        if (exportData.task_id || exportData.taskId) {
          // Background task started
          console.log('Background task started:', exportData.task_id || exportData.taskId)
          setCurrentTaskId(exportData.task_id || exportData.taskId || null)
          setProgressMessage('Export task started...')
        } else if (exportData.downloadUrl) {
          // Direct download available
          setDownloadUrl(exportData.downloadUrl)
          setIsExporting(false)
          setProgress(100)
          setProgressMessage('Export ready for download!')
        } else if (exportData && exportData.content !== undefined) {
          // Direct export completed - create download from content
          setIsExporting(false)
          setProgress(100)
          setProgressMessage('Export completed!')
          
          const content = exportData.content
          const filename = exportData.filename || `phone_numbers_export.${exportOptions.format}`
          const format = exportData.format || exportOptions.format
          
          const mimeTypes = {
            'csv': 'text/csv',
            'txt': 'text/plain',
            'json': 'application/json',
            'doc': 'application/msword'
          }
          
          const blob = new Blob([content], { 
            type: mimeTypes[format] || 'text/plain'
          })
          const url = URL.createObjectURL(blob)
          
          // Store both the URL and filename for download
          setDownloadUrl(url)
          
          // Store filename in state for download handler
          setExportOptions(prev => ({ ...prev, downloadFilename: filename }))
        } else {
          // Backend returned success but no content field - check what we have
          console.error('Export response missing content field:', exportData)
          console.error('Available exportData keys:', exportData ? Object.keys(exportData) : 'No exportData')
          console.error('ExportData values:', exportData)
          console.error('Full response:', response)
          console.error('Response message:', response.data?.message)
          
          // Check if this might be a background task response that wasn't caught above
          if (exportData && (exportData.task_id || exportData.taskId)) {
            console.log('Detected background task response in fallback')
            setCurrentTaskId(exportData.task_id || exportData.taskId || null)
            setProgressMessage('Export task started...')
          } else if (response.data && response.data.message && response.data.message.includes('background')) {
            // Check if the message indicates background processing
            console.log('Detected background task from message')
            setProgressMessage('Export task started in background...')
          } else {
            // The backend returned success but no content - this shouldn't happen
            // Let's show a helpful error message
            throw new Error(`Export completed but no content received. This might indicate a backend issue. Response data: ${JSON.stringify(exportData)}`)
          }
        }
      } else {
        // Handle error response
        const errorMessage = response.error?.message || 'Export failed'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setProgress(0)
      setProgressMessage('')
      onError?.(error instanceof Error ? error.message : 'Export failed')
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      // Create a temporary link element to trigger download with filename
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = exportOptions.downloadFilename || `phone_numbers_export.${exportOptions.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleClose = () => {
    if (!isExporting) {
      onClose()
    }
  }

  const updateExportOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setExportOptions(prev => ({ ...prev, [key]: value }))
  }

  const toggleCustomField = (field: string) => {
    setExportOptions(prev => ({
      ...prev,
      customFields: prev.customFields.includes(field)
        ? prev.customFields.filter(f => f !== field)
        : [...prev.customFields, field]
    }))
  }

  const formatOptions = [
    { value: 'csv', label: 'CSV (Excel Compatible)' },
    { value: 'txt', label: 'Text File' },
    { value: 'json', label: 'JSON Data' },
    { value: 'doc', label: 'Word Document' }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Phone Numbers"
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Export Progress */}
        {isExporting && (
          <Card className="p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Exporting Numbers...
              </span>
              <span className="text-sm text-blue-700">
                {progress}%
              </span>
            </div>
            <ProgressBar progress={progress} className="mb-2" />
            {progressMessage && (
              <p className="text-sm text-blue-700">{progressMessage}</p>
            )}
          </Card>
        )}

        {/* Download Ready */}
        {downloadUrl && !isExporting && (
          <Card className="p-4 bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">
                  Export Ready!
                </p>
                <p className="text-sm text-green-700">
                  Your export file is ready for download.
                </p>
              </div>
              <Button
                onClick={handleDownload}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Download
              </Button>
            </div>
          </Card>
        )}

        {/* Export Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {estimatedCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Numbers to Export</div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {estimatedSize}
              </div>
              <div className="text-sm text-gray-600">Estimated Size</div>
            </div>
          </Card>
        </div>

        {/* Format Selection */}
        <div>
          <Select
            label="Export Format"
            value={exportOptions.format}
            onChange={(value: string) => updateExportOption('format', value as ExportFormat)}
            options={formatOptions}
            disabled={isExporting}
            required
          />
          <p className="mt-2 text-sm text-gray-600">
            {FORMAT_DESCRIPTIONS[exportOptions.format]}
          </p>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Export Options</h4>
          
          <div className="space-y-3">
            <Checkbox
              label="Include invalid numbers"
              checked={exportOptions.includeInvalid}
              onChange={(checked: boolean) => updateExportOption('includeInvalid', checked)}
              disabled={isExporting}
              helperText="Include phone numbers that failed validation"
            />
            
            <Checkbox
              label="Include metadata"
              checked={exportOptions.includeMetadata}
              onChange={(checked: boolean) => updateExportOption('includeMetadata', checked)}
              disabled={isExporting}
              helperText="Include additional information like source, tags, and notes"
            />
          </div>
        </div>

        {/* Custom Fields Selection */}
        {(exportOptions.format === 'csv' || exportOptions.format === 'json') && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Fields to Include</h4>
            
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_FIELDS.map(field => (
                <Checkbox
                  key={field.key}
                  label={field.label}
                  checked={exportOptions.customFields.includes(field.key)}
                  onChange={() => toggleCustomField(field.key)}
                  disabled={isExporting || field.required}
                  helperText={field.required ? 'Required field' : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Selected Fields Summary */}
        {exportOptions.customFields.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              Selected Fields ({exportOptions.customFields.length})
            </h5>
            <div className="flex flex-wrap gap-1">
              {exportOptions.customFields.map(field => {
                const fieldInfo = AVAILABLE_FIELDS.find(f => f.key === field)
                return (
                  <Badge key={field} variant="secondary" size="sm">
                    {fieldInfo?.label || field}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExporting}
          >
            {downloadUrl ? 'Close' : 'Cancel'}
          </Button>
          
          {!downloadUrl && (
            <Button
              onClick={handleExport}
              disabled={isExporting || estimatedCount === 0}
              loading={isExporting}
            >
              Start Export
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}