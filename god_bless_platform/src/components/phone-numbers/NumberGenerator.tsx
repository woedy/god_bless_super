/**
 * NumberGenerator Component
 * Interface for generating phone numbers with various options
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Input, Select, Card, Checkbox, ProgressBar } from '../common'
import { phoneNumberService } from '../../services'
import { useTaskProgress } from '../../hooks'
import type { GenerateNumbersParams, Project } from '../../types'

interface NumberGeneratorProps {
  project: Project
  onGenerationComplete?: (taskId: string) => void
  onError?: (error: string) => void
}

type GenerationStage = 'generation' | 'validation'

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

const AREA_CODE_PATTERN = /^\d{3}$/

const normalizeAreaCodeValue = (value: string): string | null => {
  if (!value) {
    return null
  }

  const digitsOnly = value.trim().replace(/\D/g, '')
  if (digitsOnly.length !== 3 || !AREA_CODE_PATTERN.test(digitsOnly)) {
    return null
  }

  return digitsOnly
}

const extractAreaCodeFromPrefix = (value?: string | null): string | null => {
  if (!value) {
    return null
  }

  const digitsOnly = value.replace(/\D/g, '')
  if (digitsOnly.length < 3) {
    return null
  }

  return digitsOnly.slice(0, 3)
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
  const [areaCodeQueue, setAreaCodeQueue] = useState<string[]>([])
  const [activeAreaCodeIndex, setActiveAreaCodeIndex] = useState<number>(0)

  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [progressMessage, setProgressMessage] = useState<string>('')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<GenerationStage | null>(null)

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

  const {
    task,
    progress,
    progressMessage: taskProgressMessage,
    isCompleted,
    isFailed,
    isCancelled,
    error: taskError
  } = useTaskProgress(currentTaskId)

  const rootTaskIdRef = useRef<string | null>(null)
  const latestTaskIdRef = useRef<string | null>(null)

  const resetTaskTracking = useCallback(() => {
    setCurrentTaskId(null)
    setActiveStage(null)
    rootTaskIdRef.current = null
    latestTaskIdRef.current = null
  }, [])

  const trackTaskId = useCallback((taskId: string | null) => {
    setCurrentTaskId(taskId)
    latestTaskIdRef.current = taskId
  }, [])

  const finalizeGeneration = useCallback(
    (completionMessage: string) => {
      setIsGenerating(false)
      setProgressMessage(prev => prev || completionMessage)

      const completionId =
        rootTaskIdRef.current || latestTaskIdRef.current || currentTaskId
      if (completionId) {
        onGenerationComplete?.(completionId)
      }

      setAreaCodeQueue([])
      setActiveAreaCodeIndex(0)
      resetTaskTracking()
    },
    [currentTaskId, onGenerationComplete, resetTaskTracking]
  )

  const startAreaCodeGeneration = useCallback(
    async (code: string, index: number, total: number): Promise<boolean> => {
      try {
        const parsedExcludePatterns = excludePatterns
          ? excludePatterns
              .split(',')
              .map(pattern => pattern.trim())
              .filter(Boolean)
          : undefined

        setActiveStage('generation')
        setProgressMessage(
          total > 1
            ? `Starting generation for area code ${code} (${index + 1} of ${total})...`
            : 'Starting phone number generation...'
        )

        const params: GenerateNumbersParams = {
          projectId: project.id,
          quantity,
          country: selectedCountry,
          carrier: selectedCarrier || undefined,
          lineType: selectedLineType || undefined,
          autoValidate,
          areaCodes: [code],
          prefix: prefix || undefined,
          excludePatterns: parsedExcludePatterns
        }

        const response = await phoneNumberService.generateNumbers(params)

        if (response.success) {
          if (!rootTaskIdRef.current) {
            rootTaskIdRef.current = response.data.id
          }
          trackTaskId(response.data.id)
          return true
        }

        throw new Error('Failed to start generation task')
      } catch (error) {
        console.error('Generation failed:', error)
        setIsGenerating(false)
        setProgressMessage('')
        onError?.(error instanceof Error ? error.message : 'Generation failed')
        resetTaskTracking()
        setAreaCodeQueue([])
        setActiveAreaCodeIndex(0)
        return false
      }
    },
    [
      autoValidate,
      excludePatterns,
      onError,
      prefix,
      project.id,
      quantity,
      resetTaskTracking,
      selectedCarrier,
      selectedCountry,
      selectedLineType,
      trackTaskId
    ]
  )

  // Sync WebSocket progress message into local state for display
  useEffect(() => {
    if (taskProgressMessage) {
      setProgressMessage(taskProgressMessage)
    }
  }, [taskProgressMessage])

  // Handle task completion
  useEffect(() => {
    if (!currentTaskId || !isCompleted) {
      return
    }

    const resultData = (task?.result?.data || {}) as Record<string, any>
    const autoValidationTaskId =
      resultData.auto_validation_task_id ||
      resultData.autoValidationTaskId ||
      resultData.validation_task_id ||
      resultData.validationTaskId

    if (activeStage !== 'validation' && autoValidationTaskId) {
      const targetCount =
        resultData.auto_validation_target_count ||
        resultData.autoValidationTargetCount ||
        resultData.validation_target_count ||
        resultData.validationTargetCount

      setProgressMessage(
        targetCount
          ? `Generation completed. Auto-validating ${targetCount} numbers...`
          : 'Generation completed. Starting auto-validation...'
      )
      setActiveStage('validation')
      trackTaskId(String(autoValidationTaskId))
      return
    }

    const resultMessage =
      typeof resultData.message === 'string'
        ? resultData.message
        : undefined

    const completionMessage =
      resultMessage ||
      task?.result?.message ||
      (activeStage === 'validation'
        ? 'Auto-validation completed successfully!'
        : 'Generation completed successfully!')

    const hasMoreAreaCodes =
      areaCodeQueue.length > 0 &&
      activeAreaCodeIndex < areaCodeQueue.length - 1

    if (hasMoreAreaCodes) {
      const nextIndex = activeAreaCodeIndex + 1
      setActiveAreaCodeIndex(nextIndex)
      startAreaCodeGeneration(
        areaCodeQueue[nextIndex],
        nextIndex,
        areaCodeQueue.length
      )
      return
    }

    finalizeGeneration(completionMessage)
  }, [
    isCompleted,
    currentTaskId,
    activeStage,
    task?.result?.data,
    task?.result?.message,
    areaCodeQueue,
    activeAreaCodeIndex,
    trackTaskId,
    startAreaCodeGeneration,
    finalizeGeneration
  ])

  // Handle task failure or cancellation
  useEffect(() => {
    if (!currentTaskId) {
      return
    }

    if (isFailed || isCancelled) {
      setIsGenerating(false)
      const stageLabel = activeStage === 'validation' ? 'Auto-validation' : 'Generation'
      setProgressMessage('')
      const failureMessage =
        task?.error?.message ??
        taskError ??
        (isCancelled ? `${stageLabel} was cancelled` : `${stageLabel} failed`)
      onError?.(failureMessage)
      resetTaskTracking()
      setAreaCodeQueue([])
      setActiveAreaCodeIndex(0)
    }
  }, [
    isFailed,
    isCancelled,
    taskError,
    task?.error?.message,
    currentTaskId,
    onError,
    activeStage,
    resetTaskTracking
  ])

  const handleGenerate = async () => {
    if (!selectedCountry) {
      onError?.('Please select a country')
      return
    }

    if (quantity < 1 || quantity > 1000000) {
      onError?.('Quantity must be between 1 and 1,000,000')
      return
    }

    const rawAreaCodes = areaCode
      .split(',')
      .map(code => code.trim())
      .filter(code => code.length > 0)

    const validAreaCodes: string[] = []
    const invalidAreaCodes: string[] = []

    rawAreaCodes.forEach(code => {
      const normalized = normalizeAreaCodeValue(code)
      if (normalized) {
        validAreaCodes.push(normalized)
      } else {
        invalidAreaCodes.push(code || ' ')
      }
    })

    if (invalidAreaCodes.length > 0) {
      const message =
        invalidAreaCodes.length === 1
          ? `Invalid area code: ${invalidAreaCodes[0]}`
          : `Invalid area codes: ${invalidAreaCodes.join(', ')}`
      onError?.(message)
      return
    }

    const uniqueAreaCodes = Array.from(new Set(validAreaCodes))
    const fallbackAreaCode = extractAreaCodeFromPrefix(prefix)
    const candidateAreaCodes =
      uniqueAreaCodes.length > 0
        ? uniqueAreaCodes
        : fallbackAreaCode
          ? [fallbackAreaCode]
          : []
    const finalAreaCodes = candidateAreaCodes.length > 0 ? candidateAreaCodes : ['555']

    try {
      setIsGenerating(true)
      setActiveStage('generation')
      rootTaskIdRef.current = null
      latestTaskIdRef.current = null

      setAreaCodeQueue(finalAreaCodes)
      setActiveAreaCodeIndex(0)

      const started = await startAreaCodeGeneration(
        finalAreaCodes[0],
        0,
        finalAreaCodes.length
      )

      if (!started) {
        return
      }
    } catch (error) {
      console.error('Generation failed:', error)
      setIsGenerating(false)
      setProgressMessage('')
      onError?.(error instanceof Error ? error.message : 'Generation failed')
      resetTaskTracking()
      setAreaCodeQueue([])
      setActiveAreaCodeIndex(0)
    }
  }

  const handleCancel = () => {
    setIsGenerating(false)
    setProgressMessage('')
    resetTaskTracking()
    setAreaCodeQueue([])
    setActiveAreaCodeIndex(0)
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

  const totalAreaCodes = areaCodeQueue.length
  const currentAreaCodeLabel =
    totalAreaCodes > 0
      ? areaCodeQueue[Math.min(activeAreaCodeIndex, totalAreaCodes - 1)]
      : undefined

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
              {activeStage === 'validation'
                ? 'Auto-validating Numbers...'
                : 'Generating Numbers...'}
            </span>
            <span className="text-sm text-blue-700">
              {Math.round(progress)}%
            </span>
          </div>
          <ProgressBar progress={progress} className="mb-2" />
          {currentAreaCodeLabel && (
            <p className="text-xs text-blue-700 mb-1">
              Area code {currentAreaCodeLabel}
              {totalAreaCodes > 1 &&
                ` (${Math.min(activeAreaCodeIndex + 1, totalAreaCodes)} of ${totalAreaCodes})`}
            </p>
          )}
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
            label="Area Codes"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            placeholder="e.g., 305, 818, 212"
            disabled={isGenerating}
            helperText="Comma-separated 3-digit codes (each code receives the full quantity)"
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
          {isGenerating
            ? activeStage === 'validation'
              ? 'Validating...'
              : 'Generating...'
            : 'Generate Numbers'}
        </Button>
      </div>
    </Card>
  )
}
