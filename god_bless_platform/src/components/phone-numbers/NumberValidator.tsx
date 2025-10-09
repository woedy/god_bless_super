/**
 * NumberValidator Component
 * Interface for validating phone numbers with bulk operations
 */

import React, { useState, useEffect } from 'react'
import { Button, Input, Select, Card, Textarea, ProgressBar, Badge } from '../common'
import { phoneNumberService } from '../../services'
import { websocketManager } from '../../services'
import type { ValidateNumbersParams, Project } from '../../types'

interface NumberValidatorProps {
  project: Project
  onValidationComplete?: (taskId: string) => void
  onError?: (error: string) => void
}

type ValidationType = 'project' | 'manual' | 'single'

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

export const NumberValidator: React.FC<NumberValidatorProps> = ({
  project,
  onValidationComplete,
  onError
}) => {
  // Form state
  const [validationType, setValidationType] = useState<ValidationType>('project')
  const [provider, setProvider] = useState<string>('default')
  const [batchSize, setBatchSize] = useState<number>(100)
  const [manualNumbers, setManualNumbers] = useState<string>('')
  const [singleNumber, setSingleNumber] = useState<string>('')

  // UI state
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [progressMessage, setProgressMessage] = useState<string>('')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  // Single validation state
  const [singleValidationResult, setSingleValidationResult] = useState<SingleValidationResult | null>(null)
  const [isValidatingSingle, setIsValidatingSingle] = useState<boolean>(false)

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
          setIsValidating(false)
          setProgress(100)
          setProgressMessage('Validation completed successfully!')
          setCurrentTaskId(null)
          onValidationComplete?.(currentTaskId)
        }
      }

      const handleTaskError = (message: { data?: any; [key: string]: unknown }) => {
        const data = message.data || message
        if (data.task_id === currentTaskId || data.taskId === currentTaskId) {
          setIsValidating(false)
          setProgress(0)
          setProgressMessage('')
          setCurrentTaskId(null)
          onError?.(data.error || 'Validation failed')
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
  }, [currentTaskId, onValidationComplete, onError])

  const handleBulkValidation = async () => {
    try {
      setIsValidating(true)
      setProgress(0)
      setProgressMessage('Starting phone number validation...')

      const params: ValidateNumbersParams = {
        provider,
        batchSize
      }

      if (validationType === 'project') {
        params.projectId = project.id
      } else if (validationType === 'manual') {
        const numbers = manualNumbers
          .split('\n')
          .map(n => n.trim())
          .filter(n => n.length > 0)
        
        if (numbers.length === 0) {
          throw new Error('Please enter phone numbers to validate')
        }
        
        params.numbers = numbers
      }

      const response = await phoneNumberService.validateNumbers(params)
      
      if (response.success) {
        setCurrentTaskId(response.data.id)
        setProgressMessage('Validation task started...')
      } else {
        throw new Error('Failed to start validation task')
      }
    } catch (error) {
      console.error('Validation failed:', error)
      setIsValidating(false)
      setProgress(0)
      setProgressMessage('')
      onError?.(error instanceof Error ? error.message : 'Validation failed')
    }
  }

  const handleSingleValidation = async () => {
    if (!singleNumber.trim()) {
      onError?.('Please enter a phone number to validate')
      return
    }

    try {
      setIsValidatingSingle(true)
      setSingleValidationResult(null)

      const response = await phoneNumberService.validateSingleNumber(singleNumber.trim(), provider)
      
      if (response.success) {
        setSingleValidationResult(response.data)
      } else {
        throw new Error('Failed to validate phone number')
      }
    } catch (error) {
      console.error('Single validation failed:', error)
      onError?.(error instanceof Error ? error.message : 'Validation failed')
    } finally {
      setIsValidatingSingle(false)
    }
  }

  const handleCancel = () => {
    setIsValidating(false)
    setProgress(0)
    setProgressMessage('')
    setCurrentTaskId(null)
  }

  const getManualNumberCount = () => {
    return manualNumbers
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0).length
  }

  const validationTypeOptions = [
    { value: 'project', label: 'Validate Project Numbers' },
    { value: 'manual', label: 'Validate Manual List' },
    { value: 'single', label: 'Validate Single Number' }
  ]

  const providerOptions = [
    { value: 'default', label: 'Default Provider' },
    { value: 'twilio', label: 'Twilio' },
    { value: 'numverify', label: 'NumVerify' }
  ]

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Validate Phone Numbers
        </h3>
        <p className="text-sm text-gray-600">
          Validate phone numbers for project "{project.project_name}"
        </p>
      </div>

      {isValidating && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Validating Numbers...
            </span>
            <span className="text-sm text-blue-700">
              {progress}%
            </span>
          </div>
          <ProgressBar progress={progress} className="mb-2" />
          {progressMessage && (
            <p className="text-sm text-blue-700">{progressMessage}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="mt-3"
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Validation Type"
            value={validationType}
            onChange={(value: string) => setValidationType(value as ValidationType)}
            options={validationTypeOptions}
            disabled={isValidating}
            required
          />

          <Select
            label="Validation Provider"
            value={provider}
            onChange={setProvider}
            options={providerOptions}
            disabled={isValidating}
            required
          />
        </div>

        {validationType === 'project' && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              This will validate all phone numbers in the current project.
            </p>
            <div className="mt-2">
              <Input
                label="Batch Size"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
                min={1}
                max={1000}
                disabled={isValidating}
                helperText="Number of numbers to validate per batch"
              />
            </div>
          </div>
        )}

        {validationType === 'manual' && (
          <div className="space-y-4">
            <Textarea
              label="Phone Numbers"
              value={manualNumbers}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setManualNumbers(e.target.value)}
              placeholder="Enter phone numbers, one per line&#10;+1234567890&#10;+9876543210&#10;..."
              rows={8}
              disabled={isValidating}
              helperText={`${getManualNumberCount()} numbers entered`}
              required
            />
            <Input
              label="Batch Size"
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
              min={1}
              max={1000}
              disabled={isValidating}
              helperText="Number of numbers to validate per batch"
            />
          </div>
        )}

        {validationType === 'single' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  label="Phone Number"
                  value={singleNumber}
                  onChange={(e) => setSingleNumber(e.target.value)}
                  placeholder="+1234567890"
                  disabled={isValidatingSingle}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSingleValidation}
                  disabled={isValidatingSingle || !singleNumber.trim()}
                  loading={isValidatingSingle}
                  size="sm"
                >
                  Validate
                </Button>
              </div>
            </div>

            {singleValidationResult && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    variant={singleValidationResult.isValid ? 'success' : 'error'}
                  >
                    {singleValidationResult.isValid ? 'Valid' : 'Invalid'}
                  </Badge>
                  <span className="font-medium">
                    {singleValidationResult.formattedNumber}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Country:</span>
                    <span className="ml-2 font-medium">
                      {singleValidationResult.country} ({singleValidationResult.countryCode})
                    </span>
                  </div>
                  
                  {singleValidationResult.carrier && (
                    <div>
                      <span className="text-gray-600">Carrier:</span>
                      <span className="ml-2 font-medium">{singleValidationResult.carrier}</span>
                    </div>
                  )}
                  
                  {singleValidationResult.lineType && (
                    <div>
                      <span className="text-gray-600">Line Type:</span>
                      <span className="ml-2 font-medium">{singleValidationResult.lineType}</span>
                    </div>
                  )}
                  
                  {singleValidationResult.region && (
                    <div>
                      <span className="text-gray-600">Region:</span>
                      <span className="ml-2 font-medium">{singleValidationResult.region}</span>
                    </div>
                  )}
                  
                  {singleValidationResult.timezone && (
                    <div>
                      <span className="text-gray-600">Timezone:</span>
                      <span className="ml-2 font-medium">{singleValidationResult.timezone}</span>
                    </div>
                  )}
                </div>

                {singleValidationResult.error && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                    {singleValidationResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {validationType !== 'single' && (
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleBulkValidation}
            disabled={
              isValidating || 
              (validationType === 'manual' && getManualNumberCount() === 0)
            }
            loading={isValidating}
            className="min-w-32"
          >
            {isValidating ? 'Validating...' : 'Start Validation'}
          </Button>
        </div>
      )}
    </Card>
  )
}