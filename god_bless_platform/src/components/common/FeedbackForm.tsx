/**
 * Feedback Form Component
 * Allows users to provide feedback on operations and errors
 */

import React, { useState } from 'react'
import { Button } from './Button'
import { Textarea } from './Textarea'
import { Select } from './Select'
import { Modal } from './Modal'
import { useNotifications } from '../../hooks/useNotifications'

export interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'other'
  message: string
  context?: Record<string, any>
  userAgent?: string
  url?: string
  timestamp?: string
}

export interface FeedbackFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (feedback: FeedbackData) => Promise<void>
  initialType?: FeedbackData['type']
  initialMessage?: string
  context?: Record<string, any>
  title?: string
}

/**
 * Feedback Form Component
 */
export function FeedbackForm({
  isOpen,
  onClose,
  onSubmit,
  initialType = 'other',
  initialMessage = '',
  context,
  title = 'Send Feedback'
}: FeedbackFormProps) {
  const [type, setType] = useState<FeedbackData['type']>(initialType)
  const [message, setMessage] = useState(initialMessage)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { notifySuccess, notifyError } = useNotifications()

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement Suggestion' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      notifyError('Validation Error', 'Please provide a message')
      return
    }

    setIsSubmitting(true)

    try {
      const feedbackData: FeedbackData = {
        type,
        message: message.trim(),
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }

      await onSubmit(feedbackData)
      
      notifySuccess('Feedback sent', 'Thank you for your feedback!')
      
      // Reset form
      setType('other')
      setMessage('')
      onClose()
    } catch (error) {
      notifyError(
        'Failed to send feedback',
        error instanceof Error ? error.message : 'Please try again later'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setType(initialType)
      setMessage(initialMessage)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback Type
          </label>
          <Select
            value={type}
            onChange={(value) => setType(value as FeedbackData['type'])}
            options={feedbackTypes}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message *
          </label>
          <Textarea
            value={message}
            onChange={setMessage}
            placeholder="Please describe your feedback in detail..."
            rows={6}
            disabled={isSubmitting}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Please provide as much detail as possible to help us understand your feedback.
          </p>
        </div>

        {context && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Additional Context
            </h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!message.trim()}
          >
            Send Feedback
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Quick Feedback Button Component
 */
export function QuickFeedbackButton({
  className = '',
  onFeedbackSubmit
}: {
  className?: string
  onFeedbackSubmit: (feedback: FeedbackData) => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${className}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Feedback
      </button>

      <FeedbackForm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={onFeedbackSubmit}
      />
    </>
  )
}

/**
 * Error Feedback Component
 * Specialized feedback form for error reporting
 */
export function ErrorFeedbackForm({
  isOpen,
  onClose,
  onSubmit,
  error,
  errorContext
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (feedback: FeedbackData) => Promise<void>
  error: Error | string
  errorContext?: Record<string, any>
}) {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'object' && error.stack ? error.stack : undefined

  const context = {
    error: {
      message: errorMessage,
      stack: errorStack,
      ...errorContext
    },
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  }

  return (
    <FeedbackForm
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      initialType="bug"
      initialMessage={`I encountered an error: ${errorMessage}\n\nSteps to reproduce:\n1. \n2. \n3. \n\nExpected behavior:\n\n\nActual behavior:\n`}
      context={context}
      title="Report Error"
    />
  )
}

export default FeedbackForm