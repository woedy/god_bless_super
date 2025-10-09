/**
 * Forgot Password Form Component
 * Form for requesting password reset email
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import type { ForgotPasswordRequest } from '../../types'

// Form validation errors
interface FormErrors {
  email?: string
  general?: string
}

// Forgot Password Form Props
interface ForgotPasswordFormProps {
  onSuccess?: () => void
}

/**
 * Forgot Password Form Component
 */
export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  // Form state
  const [formData, setFormData] = useState<ForgotPasswordRequest>({
    email: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    
    try {
      await authService.forgotPassword(formData)
      setIsSuccess(true)
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send password reset email'
      setErrors({ general: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Icons
  const EmailIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
    </svg>
  )

  const CheckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )

  // Success state
  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckIcon />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Email Sent Successfully
          </h3>
          <p className="text-green-700 mb-4">
            We've sent a password reset link to <strong>{formData.email}</strong>. 
            Please check your email and follow the instructions to reset your password.
          </p>
          <p className="text-sm text-green-600 mb-6">
            Didn't receive the email? Check your spam folder or try again in a few minutes.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setIsSuccess(false)
                setFormData({ email: '' })
              }}
              variant="outline"
              fullWidth
            >
              Send Another Email
            </Button>
            <Link
              to="/login"
              className="block text-center text-sm text-green-600 hover:text-green-500 focus:outline-none focus:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center">
          <p className="text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Email Field */}
        <Input
          name="email"
          type="email"
          label="Email Address"
          placeholder="Enter your email address"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          leftIcon={<EmailIcon />}
          required
          fullWidth
          autoComplete="email"
          autoFocus
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </Button>

        {/* Back to Login Link */}
        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
          >
            ← Back to Login
          </Link>
        </div>
      </form>
    </div>
  )
}