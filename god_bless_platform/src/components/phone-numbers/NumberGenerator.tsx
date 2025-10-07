/**
 * NumberGenerator Component
 * Interface for generating phone numbers with various options
 */

import React, { useState, useEffect } from 'react'
import { Button, Input, Select, Card, Checkbox, ProgressBar } from '../common'
import { phoneNumberService } from '../../services'
import { websocketManager } from '../../services'
import type { GenerateNumbersParams, Project } from '../../types'

interface NumberGeneratorProps {
  project: Project
  onGenerationComplete?: (taskId: string) => void
  onError?: (error: string) => void
}

interface CountryOption {
  code: string
  name: string
  flag: string
  supportedCarriers: string[]
}

interface CarrierOption {
  name: string
  code: string
  supportedLineTypes: string[]
}

export const NumberGenerator: React.FC<NumberGeneratorProps> = ({
  project,
  onGenerationComplete,
  onError
}) => {
  // Form state
  const [quantity, setQuantity] = useState<number>(1000)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedCarrier, setSelectedCarrier] = useState<string>('')
  const [selectedLineType, setSelectedLineType] = useState<string>('')
  const [areaCode, setAreaCode] = useState<string>('')
  const [prefix, setPrefix] = useState<string>('')
  const [excludePatterns, setExcludePatterns] = useState<string>('')
  const [autoValidate, setAutoValidate] = useState<boolean>(false)

  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [progressMessage, setProgressMessage] = useState<string>('')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  // Options state
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [carriers, setCarriers] = useState<CarrierOption[]>([])
  const [lineTypes, setLineTypes] = useState<string[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(true)
  const [isLoadingCarriers, setIsLoadingCarriers] = useState<boolean>(false)

  // Load available countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoadingCountries(true)
        const response = await phoneNumberService.getAvailableCountries()
        if (response.success) {
          setCountries(response.data)
        }
      } catch (error) {
        console.error('Failed to load countries:', error)
        onError?.('Failed to load available countries')
      } finally {
        setIsLoadingCountries(false)
      }
    }

    loadCountries()
  }, [onError])

  // Load carriers when country changes
  useEffect(() => {
    const loadCarriers = async (countryCode: string) => {
      try {
        setIsLoadingCarriers(true)
        const response = await phoneNumberService.getAvailableCarriers(countryCode)
        if (response.success) {
          setCarriers(response.data)
        }
      } catch (error) {
        console.error('Failed to load carriers:', error)
        onError?.('Failed to load available carriers')
      } finally {
        setIsLoadingCarriers(false)
      }
    }

    if (selectedCountry) {
      loadCarriers(selectedCountry)
    } else {
      setCarriers([])
      setLineTypes([])
      setSelectedCarrier('')
      setSelectedLineType('')
    }
  }, [selectedCountry, onError])

  // Update line types when carrier changes
  useEffect(() => {
    if (selectedCarrier) {
      const carrier = carriers.find(c => c.code === selectedCarrier)
      setLineTypes(carrier?.supportedLineTypes || [])
      setSelectedLineType('')
    } else {
      setLineTypes([])
      setSelectedLineType('')
    }
  }, [selectedCarrier, carriers])

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
          setIsGenerating(false)
          setProgress(100)
          setProgressMessage('Generation completed successfully!')
          setCurrentTaskId(null)
          onGenerationComplete?.(currentTaskId)
        }
      }

      const handleTaskError = (message: { data?: any; [key: string]: any }) => {
        const data = message.data || message
        if (data.task_id === currentTaskId || data.taskId === currentTaskId) {
          setIsGenerating(false)
          setProgress(0)
          setProgressMessage('')
          setCurrentTaskId(null)
          onError?.(data.error || 'Generation failed')
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
  }, [currentTaskId, onGenerationComplete, onError])



  const handleGenerate = async () => {
    if (!selectedCountry) {
      onError?.('Please select a country')
      return
    }

    if (quantity < 1 || quantity > 1000000) {
      onError?.('Quantity must be between 1 and 1,000,000')
      return
    }

    try {
      setIsGenerating(true)
      setProgress(0)
      setProgressMessage('Starting phone number generation...')

      const params: GenerateNumbersParams = {
        projectId: project.id,
        quantity,
        country: selectedCountry,
        carrier: selectedCarrier || undefined,
        lineType: selectedLineType || undefined,
        autoValidate,
        prefix: areaCode || prefix || undefined, // Use area code as prefix if provided
        excludePatterns: excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : undefined
      }

      const response = await phoneNumberService.generateNumbers(params)
      
      if (response.success) {
        setCurrentTaskId(response.data.id)
        setProgressMessage('Generation task started...')
      } else {
        throw new Error('Failed to start generation task')
      }
    } catch (error) {
      console.error('Generation failed:', error)
      setIsGenerating(false)
      setProgress(0)
      setProgressMessage('')
      onError?.(error instanceof Error ? error.message : 'Generation failed')
    }
  }

  const handleCancel = () => {
    setIsGenerating(false)
    setProgress(0)
    setProgressMessage('')
    setCurrentTaskId(null)
  }

  const countryOptions = countries.map(country => ({
    value: country.code,
    label: `${country.flag} ${country.name}`
  }))

  const carrierOptions = carriers.map(carrier => ({
    value: carrier.code,
    label: carrier.name
  }))

  const lineTypeOptions = lineTypes.map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1)
  }))

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Generate Phone Numbers
        </h3>
        <p className="text-sm text-gray-600">
          Generate up to 1,000,000 phone numbers for project "{project.project_name}"
        </p>
      </div>

      {isGenerating && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Generating Numbers...
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Input
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            min={1}
            max={1000000}
            placeholder="Enter number of phones to generate"
            disabled={isGenerating}
            required
          />

          <Select
            label="Country"
            value={selectedCountry}
            onChange={setSelectedCountry}
            options={countryOptions}
            placeholder="Select a country"
            disabled={isGenerating || isLoadingCountries}
            loading={isLoadingCountries}
            required
          />

          <Select
            label="Carrier (Optional)"
            value={selectedCarrier}
            onChange={setSelectedCarrier}
            options={carrierOptions}
            placeholder="Select a carrier"
            disabled={isGenerating || isLoadingCarriers || !selectedCountry}
            loading={isLoadingCarriers}
          />

          <Select
            label="Line Type (Optional)"
            value={selectedLineType}
            onChange={setSelectedLineType}
            options={lineTypeOptions}
            placeholder="Select line type"
            disabled={isGenerating || !selectedCarrier}
          />
        </div>

        <div className="space-y-4">
          <Input
            label="Area Code"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            placeholder="e.g., 555, 212, 310"
            disabled={isGenerating}
            helperText="3-digit area code for generated numbers"
            maxLength={3}
            pattern="[0-9]{3}"
          />

          <Input
            label="Additional Prefix (Optional)"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g., +1"
            disabled={isGenerating}
            helperText="Additional prefix to prepend to numbers"
          />

          <Input
            label="Exclude Patterns (Optional)"
            value={excludePatterns}
            onChange={(e) => setExcludePatterns(e.target.value)}
            placeholder="Comma-separated patterns to exclude"
            disabled={isGenerating}
            helperText="e.g., 666, 911, 000"
          />

          <Checkbox
            label="Auto-validate generated numbers"
            checked={autoValidate}
            onChange={setAutoValidate}
            disabled={isGenerating}
            helperText="Automatically validate numbers after generation"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedCountry || quantity < 1}
          loading={isGenerating}
          className="min-w-32"
        >
          {isGenerating ? 'Generating...' : 'Generate Numbers'}
        </Button>
      </div>
    </Card>
  )
}