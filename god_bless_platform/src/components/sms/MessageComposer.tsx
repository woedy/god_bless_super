/**
 * MessageComposer Component
 * Rich interface for composing SMS messages with macro support
 */

import React, { useState, useEffect } from 'react'
import { smsService } from '../../services'

interface MessageComposerProps {
  message: string
  customMacros: Record<string, any>
  availableMacros: Record<string, any>
  templates?: any[]
  onMessageChange: (message: string) => void
  onMacrosChange: (macros: Record<string, any>) => void
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  message,
  customMacros,
  availableMacros,
  templates = [],
  onMessageChange,
  onMacrosChange
}) => {
  const [showTemplates, setShowTemplates] = useState(false)
  const [showMacros, setShowMacros] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')
  const [messageLength, setMessageLength] = useState(0)
  const [smsCount, setSmsCount] = useState(1)

  // Update message length and SMS count when message changes
  useEffect(() => {
    const length = message.length
    setMessageLength(length)
    setSmsCount(Math.ceil(length / 160))
  }, [message])

  // Update preview when message or macros change
  useEffect(() => {
    updatePreview()
  }, [message, customMacros])

  const updatePreview = async () => {
    if (!message.trim()) {
      setPreviewMessage('')
      return
    }

    try {
      const response = await smsService.processMessageTemplate({
        template: message,
        custom_data: customMacros,
        recipient_data: {
          // Sample recipient data for preview
          phone_number: '+1234567890',
          carrier: 'Verizon',
          country: 'US'
        }
      })

      if (response.success) {
        setPreviewMessage(response.data.processed)
      }
    } catch (error) {
      console.error('Failed to process template:', error)
      setPreviewMessage(message)
    }
  }

  const insertMacro = (macroKey: string) => {
    const macro = `@${macroKey}@`
    const textarea = document.getElementById('message-textarea') as HTMLTextAreaElement
    
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newMessage = message.substring(0, start) + macro + message.substring(end)
      onMessageChange(newMessage)
      
      // Set cursor position after the inserted macro
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + macro.length, start + macro.length)
      }, 0)
    } else {
      onMessageChange(message + macro)
    }
  }

  const insertTemplate = (template: any) => {
    onMessageChange(template.message_template)
    if (template.suggested_macros) {
      onMacrosChange({ ...customMacros, ...template.suggested_macros })
    }
    setShowTemplates(false)
  }

  const updateCustomMacro = (key: string, value: any) => {
    onMacrosChange({
      ...customMacros,
      [key]: value
    })
  }

  const getMessageLengthColor = () => {
    if (messageLength <= 160) return 'text-green-600'
    if (messageLength <= 320) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Message Template *
          </label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setShowMacros(!showMacros)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Macros
            </button>
          </div>
        </div>

        <textarea
          id="message-textarea"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your SMS message. Use @MACRO@ format for dynamic content."
        />

        <div className="flex justify-between items-center mt-2 text-sm">
          <div className="text-gray-500">
            Use @MACRO@ format for dynamic content (e.g., @FIRST@, @REF@, @TIME@)
          </div>
          <div className={`font-medium ${getMessageLengthColor()}`}>
            {messageLength} chars • {smsCount} SMS
          </div>
        </div>
      </div>

      {/* Templates Panel */}
      {showTemplates && templates.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Message Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300"
                onClick={() => insertTemplate(template)}
              >
                <div className="font-medium text-sm text-gray-900 mb-1">
                  {template.name}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {template.category}
                </div>
                <div className="text-sm text-gray-700 line-clamp-2">
                  {template.message_template}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Macros Panel */}
      {showMacros && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Available Macros</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {Object.entries(availableMacros).map(([key, description]) => (
              <button
                key={key}
                onClick={() => insertMacro(key)}
                className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                title={String(description)}
              >
                @{key}@
              </button>
            ))}
          </div>

          {/* Custom Macros */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Custom Values</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(availableMacros).map(([key, description]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {key} - {String(description)}
                  </label>
                  <input
                    type="text"
                    value={customMacros[key] || ''}
                    onChange={(e) => updateCustomMacro(key, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={`Custom ${key} value`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Preview */}
      {previewMessage && (
        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-medium text-gray-900 mb-2">Message Preview</h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
            {previewMessage}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Preview shows how the message will appear with sample data
          </div>
        </div>
      )}

      {/* Message Guidelines */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>• SMS messages are limited to 160 characters per segment</div>
        <div>• Messages longer than 160 characters will be split into multiple SMS</div>
        <div>• Use macros like @FIRST@, @LAST@, @REF@ for personalization</div>
        <div>• Avoid special characters that may not display correctly</div>
      </div>
    </div>
  )
}