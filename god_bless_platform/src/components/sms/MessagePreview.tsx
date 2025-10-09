/**
 * MessagePreview Component
 * Shows a preview of how the SMS message will appear with processed macros
 */

import React, { useState, useEffect } from 'react'
import { smsService } from '../../services'

interface MessagePreviewProps {
  template: string
  customMacros?: Record<string, any>
  sampleRecipient?: {
    phone_number: string
    carrier?: string
    data?: Record<string, any>
  }
  className?: string
}

export const MessagePreview: React.FC<MessagePreviewProps> = ({
  template,
  customMacros = {},
  sampleRecipient,
  className = ''
}) => {
  const [processedMessage, setProcessedMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (template.trim()) {
      processTemplate()
    } else {
      setProcessedMessage('')
    }
  }, [template, customMacros, sampleRecipient])

  const processTemplate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const recipientData = sampleRecipient?.data || {
        phone_number: sampleRecipient?.phone_number || '+1234567890',
        carrier: sampleRecipient?.carrier || 'Verizon',
        country: 'US'
      }

      const response = await smsService.processMessageTemplate({
        template,
        custom_data: customMacros,
        recipient_data: recipientData
      })

      if (response.success) {
        setProcessedMessage(response.data.processed)
      } else {
        throw new Error('Failed to process template')
      }
    } catch (error) {
      console.error('Failed to process template:', error)
      setError('Failed to process template')
      setProcessedMessage(template) // Fallback to original template
    } finally {
      setIsLoading(false)
    }
  }

  const getMessageLength = () => processedMessage.length
  const getSmsCount = () => Math.ceil(processedMessage.length / 160)

  const getMessageLengthColor = () => {
    const length = getMessageLength()
    if (length <= 160) return 'text-green-600'
    if (length <= 320) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!template.trim()) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-sm">Enter a message template to see preview</div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Preview Header */}
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">Message Preview</h4>
        <div className={`text-sm font-medium ${getMessageLengthColor()}`}>
          {getMessageLength()} chars • {getSmsCount()} SMS
        </div>
      </div>

      {/* Phone Mockup */}
      <div className="max-w-sm mx-auto">
        <div className="bg-gray-900 rounded-2xl p-2 shadow-lg">
          {/* Phone Header */}
          <div className="bg-black rounded-xl p-3 mb-2">
            <div className="flex justify-between items-center text-white text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
              <div>9:41 AM</div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-2 border border-white rounded-sm"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Message Screen */}
          <div className="bg-white rounded-xl p-4 min-h-[200px]">
            {/* Message Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">SMS</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {sampleRecipient?.phone_number || '+1234567890'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {sampleRecipient?.carrier || 'Carrier'}
                  </div>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-sm">
                  {error}
                </div>
              ) : (
                <div className="bg-blue-500 text-white p-3 rounded-2xl rounded-bl-sm max-w-[80%] ml-auto">
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {processedMessage}
                  </div>
                  <div className="text-xs text-blue-100 mt-1 text-right">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>

            {/* Message Info */}
            <div className="mt-4 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <div>Length: {getMessageLength()} characters</div>
                <div>SMS Count: {getSmsCount()}</div>
                {getSmsCount() > 1 && (
                  <div className="text-yellow-600">
                    ⚠️ Message will be split into {getSmsCount()} parts
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Data Info */}
      {sampleRecipient && (
        <div className="text-xs text-gray-500 text-center">
          Preview using sample data: {sampleRecipient.phone_number}
          {sampleRecipient.carrier && ` (${sampleRecipient.carrier})`}
        </div>
      )}
    </div>
  )
}