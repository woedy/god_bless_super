/**
 * Delete Confirmation Modal Component
 * Modal for confirming project deletion
 */

import { Button } from '../common'
import type { Project } from '../../types/models'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  project: Project | null
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  type?: 'delete' | 'archive'
}

export function DeleteConfirmationModal({ 
  isOpen, 
  project, 
  onConfirm, 
  onCancel, 
  loading = false,
  type = 'delete'
}: DeleteConfirmationModalProps) {
  if (!isOpen || !project) return null

  const actionText = type === 'archive' ? 'archive' : 'delete'
  const actionTextCapitalized = actionText.charAt(0).toUpperCase() + actionText.slice(1)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              type === 'archive' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {type === 'archive' ? (
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6 5l-3 3-3-3" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {actionTextCapitalized} Project
              </h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to {actionText} the project{' '}
            <span className="font-medium text-gray-900">
              "{project.project_name || project.name}"
            </span>
            ?
          </p>

          {type === 'delete' ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Warning: This action cannot be undone
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>All project data will be permanently deleted</li>
                      <li>Associated phone numbers and campaigns will be removed</li>
                      <li>Project tasks and notes will be lost</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Archive Project
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>The project will be archived and hidden from the main view. You can restore it later if needed.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Info */}
          <div className="bg-gray-50 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Project Details:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Name: {project.project_name || project.name}</div>
              <div>Status: {project.status}</div>
              <div>Priority: {project.priority}</div>
              {project.phone_stats && (
                <div>Phone Numbers: {project.phone_stats.total}</div>
              )}
              {project.task_stats && (
                <div>Tasks: {project.task_stats.total}</div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={type === 'archive' ? 'outline' : 'danger'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? `${actionTextCapitalized}ing...` : `${actionTextCapitalized} Project`}
          </Button>
        </div>
      </div>
    </div>
  )
}