/**
 * Project Form Component
 * Form for creating and editing projects
 */

import { useState, useEffect } from 'react'
import { Button } from '../common'
import type { Project, ProjectPriority, ProjectStatus } from '../../types/models'
import type { CreateProjectData, UpdateProjectData } from '../../types/api'

interface ProjectFormProps {
  project?: Project
  onSubmit: (data: CreateProjectData | UpdateProjectData) => Promise<void>
  onCancel: () => void
  loading?: boolean
  mode: 'create' | 'edit'
}

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
]

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' }
]

export function ProjectForm({ project, onSubmit, onCancel, loading = false, mode }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: project?.project_name || project?.name || '',
    description: project?.description || '',
    priority: (project?.priority || 'medium') as ProjectPriority,
    status: (project?.status || 'planning') as ProjectStatus,
    target_phone_count: project?.target_phone_count || 0,
    target_sms_count: project?.target_sms_count || 0,
    budget: project?.budget || 0,
    start_date: project?.start_date || '',
    due_date: project?.due_date || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Project name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Project name cannot exceed 100 characters'
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters'
    }

    if (formData.target_phone_count < 0) {
      newErrors.target_phone_count = 'Target phone count cannot be negative'
    }

    if (formData.target_sms_count < 0) {
      newErrors.target_sms_count = 'Target SMS count cannot be negative'
    }

    if (formData.budget < 0) {
      newErrors.budget = 'Budget cannot be negative'
    }

    if (formData.start_date && formData.due_date && formData.start_date > formData.due_date) {
      newErrors.due_date = 'Due date cannot be before start date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        ...(mode === 'edit' && { status: formData.status }),
        target_phone_count: formData.target_phone_count,
        target_sms_count: formData.target_sms_count,
        budget: formData.budget || undefined,
        start_date: formData.start_date || undefined,
        due_date: formData.due_date || undefined,
        settings: {
          maxPhoneNumbers: formData.target_phone_count || 1000000,
          autoValidation: true,
          validationProvider: 'default',
          smsProvider: 'default',
          defaultCountry: 'US',
          allowDuplicates: false
        }
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Project Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
          placeholder="Enter project name"
          disabled={loading}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
          placeholder="Enter project description"
          disabled={loading}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      {/* Priority and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            {PRIORITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {mode === 'edit' && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="target_phone_count" className="block text-sm font-medium text-gray-700 mb-1">
            Target Phone Numbers
          </label>
          <input
            type="number"
            id="target_phone_count"
            min="0"
            value={formData.target_phone_count}
            onChange={(e) => handleInputChange('target_phone_count', parseInt(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.target_phone_count ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            disabled={loading}
          />
          {errors.target_phone_count && <p className="mt-1 text-sm text-red-600">{errors.target_phone_count}</p>}
        </div>

        <div>
          <label htmlFor="target_sms_count" className="block text-sm font-medium text-gray-700 mb-1">
            Target SMS Count
          </label>
          <input
            type="number"
            id="target_sms_count"
            min="0"
            value={formData.target_sms_count}
            onChange={(e) => handleInputChange('target_sms_count', parseInt(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.target_sms_count ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            disabled={loading}
          />
          {errors.target_sms_count && <p className="mt-1 text-sm text-red-600">{errors.target_sms_count}</p>}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
          Budget ($)
        </label>
        <input
          type="number"
          id="budget"
          min="0"
          step="0.01"
          value={formData.budget}
          onChange={(e) => handleInputChange('budget', parseFloat(e.target.value) || 0)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.budget ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
          placeholder="0.00"
          disabled={loading}
        />
        {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="start_date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            id="due_date"
            value={formData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.due_date ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            disabled={loading}
          />
          {errors.due_date && <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Update Project'}
        </Button>
      </div>
    </form>
  )
}