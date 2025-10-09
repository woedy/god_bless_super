/**
 * Example Component with Error Handling
 * Demonstrates how to integrate error handling and notifications
 */

import React, { useState } from 'react'
import { Button, LoadingState, ProgressIndicator, ErrorBoundary } from './index'
import { useNotifications, useLoadingState, useError } from '../../hooks'
import { enhancedApiClient } from '../../services/enhancedApi'
import type { ProgressStep } from './ProgressIndicator'

/**
 * Example component showing error handling integration
 */
export function ExampleWithErrorHandling() {
  const [data, setData] = useState<any>(null)
  const [steps, setSteps] = useState<ProgressStep[]>([])
  
  const { 
    notifySuccess, 
    notifyError, 
    notifyApiSuccess, 
    notifyApiError,
    notifyOperationStart,
    notifyOperationSuccess,
    notifyOperationError
  } = useNotifications()
  
  const { 
    isLoading, 
    startLoading, 
    stopLoading, 
    withLoading 
  } = useLoadingState({
    showNotifications: true,
    autoNotify: true
  })
  
  const { addError } = useError()

  // Example: Simple API call with error handling
  const handleSimpleApiCall = async () => {
    try {
      const response = await enhancedApiClient.get('/api/example', {}, {
        showSuccessNotification: true,
        successMessage: 'Data loaded successfully'
      })
      setData(response.data)
      notifyApiSuccess('Data fetch', 'Example data')
    } catch (error) {
      notifyApiError('Data fetch', error)
    }
  }

  // Example: Operation with loading state
  const handleOperationWithLoading = async () => {
    const operationId = 'example-operation'
    
    try {
      await withLoading(operationId, async () => {
        // Simulate long operation
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Simulate potential error
        if (Math.random() > 0.7) {
          throw new Error('Random operation failure')
        }
        
        return { success: true }
      }, 'Processing example operation')
      
      notifySuccess('Operation completed', 'The example operation finished successfully')
    } catch (error) {
      notifyError('Operation failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Example: Multi-step operation with progress
  const handleMultiStepOperation = async () => {
    const operationSteps: ProgressStep[] = [
      { id: 'step1', label: 'Initialize', status: 'pending' },
      { id: 'step2', label: 'Process Data', status: 'pending' },
      { id: 'step3', label: 'Validate Results', status: 'pending' },
      { id: 'step4', label: 'Finalize', status: 'pending' }
    ]
    
    setSteps(operationSteps)
    
    const toastId = notifyOperationStart('Multi-step operation')
    
    try {
      for (let i = 0; i < operationSteps.length; i++) {
        const step = operationSteps[i]
        
        // Update step to active
        setSteps(prev => prev.map(s => 
          s.id === step.id 
            ? { ...s, status: 'active', message: `Processing ${s.label}...` }
            : s
        ))
        
        // Simulate step processing
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Simulate potential step failure
        if (step.id === 'step3' && Math.random() > 0.8) {
          setSteps(prev => prev.map(s => 
            s.id === step.id 
              ? { ...s, status: 'error', error: 'Validation failed' }
              : s
          ))
          throw new Error('Step 3 validation failed')
        }
        
        // Mark step as completed
        setSteps(prev => prev.map(s => 
          s.id === step.id 
            ? { ...s, status: 'completed', message: `${s.label} completed` }
            : s
        ))
      }
      
      notifyOperationSuccess('Multi-step operation', 'All steps completed successfully', toastId)
    } catch (error) {
      notifyOperationError(
        'Multi-step operation', 
        error instanceof Error ? error.message : 'Operation failed',
        toastId,
        () => handleMultiStepOperation() // Retry function
      )
    }
  }

  // Example: Trigger a runtime error for testing
  const handleRuntimeError = () => {
    // This will be caught by the error boundary
    throw new Error('This is a test runtime error')
  }

  // Example: Add a custom error
  const handleCustomError = () => {
    addError('This is a custom error for testing', {
      type: 'validation_error',
      severity: 'medium',
      context: { component: 'ExampleWithErrorHandling' }
    })
  }

  // Example: File upload with progress
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const toastId = notifyOperationStart(`Uploading ${file.name}`)
    
    try {
      // Simulate file upload with progress
      const response = await enhancedApiClient.upload('/api/upload', file, {}, {
        showSuccessNotification: true,
        successMessage: `${file.name} uploaded successfully`
      })
      
      notifyOperationSuccess('File upload', `${file.name} uploaded successfully`, toastId)
      setData(response.data)
    } catch (error) {
      notifyOperationError(
        'File upload',
        `Failed to upload ${file.name}`,
        toastId,
        () => handleFileUpload(event) // Retry function
      )
    }
  }

  return (
    <ErrorBoundary level="component">
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Error Handling & Notifications Example
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Operations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Basic Operations</h3>
            
            <Button
              onClick={handleSimpleApiCall}
              variant="primary"
              loading={isLoading('simple-api')}
            >
              Simple API Call
            </Button>
            
            <Button
              onClick={handleOperationWithLoading}
              variant="secondary"
              loading={isLoading('example-operation')}
            >
              Operation with Loading
            </Button>
            
            <Button
              onClick={handleMultiStepOperation}
              variant="outline"
            >
              Multi-step Operation
            </Button>
          </div>
          
          {/* Error Testing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Error Testing</h3>
            
            <Button
              onClick={handleRuntimeError}
              variant="danger"
            >
              Trigger Runtime Error
            </Button>
            
            <Button
              onClick={handleCustomError}
              variant="warning"
            >
              Add Custom Error
            </Button>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test File Upload
              </label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </div>
        
        {/* Progress Display */}
        {steps.length > 0 && (
          <div className="mt-6">
            <ProgressIndicator
              steps={steps}
              title="Multi-step Operation Progress"
              showSteps={true}
              showOverallProgress={true}
              overallProgress={
                (steps.filter(s => s.status === 'completed').length / steps.length) * 100
              }
              onRetry={handleMultiStepOperation}
            />
          </div>
        )}
        
        {/* Data Display */}
        {data && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Response Data:</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
        
        {/* Loading Overlay Example */}
        {isLoading('example-operation') && (
          <div className="relative">
            <LoadingState
              overlay
              text="Processing operation..."
              size="lg"
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default ExampleWithErrorHandling