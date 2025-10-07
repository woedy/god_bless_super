/**
 * Project Card Component
 * Card component for displaying individual project information
 */

import { useState } from 'react'
import { Button } from '../common'
import type { Project } from '../../types/models'

interface ProjectCardProps {
  project: Project
  onView: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onArchive?: (project: Project) => void
  onRestore?: (project: Project) => void
}

/**
 * Get status badge color based on project status
 */
function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'planning':
      return 'bg-blue-100 text-blue-800'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800'
    case 'completed':
      return 'bg-purple-100 text-purple-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'archived':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get priority badge color based on project priority
 */
function getPriorityBadgeColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800'
    case 'high':
      return 'bg-orange-100 text-orange-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'low':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Format status text for display
 */
function formatStatus(status: string) {
  switch (status) {
    case 'on_hold':
      return 'On Hold'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

/**
 * Format priority text for display
 */
function formatPriority(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

export function ProjectCard({ 
  project, 
  onView, 
  onEdit, 
  onDelete, 
  onArchive, 
  onRestore 
}: ProjectCardProps) {
  const [showActions, setShowActions] = useState(false)

  const phoneCount = project.phone_stats?.total || project.target_phone_count || 0
  const validCount = project.phone_stats?.valid || 0
  const campaignCount = project.sms_stats?.total || 0
  const taskStats = project.task_stats

  const isArchived = project.status === 'archived' || project.is_archived

  return (
    <div 
      className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {project.project_name || project.name || 'Unnamed Project'}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(project.status)}`}>
              {formatStatus(project.status)}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadgeColor(project.priority)}`}>
              {formatPriority(project.priority)}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        {showActions && (
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={() => onView(project)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="View Project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={() => onEdit(project)}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Edit Project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {project.description || 'No description available'}
      </p>
      
      {/* Statistics */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Phone Numbers:</span>
          <span className="font-medium">{phoneCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Valid Numbers:</span>
          <span className="font-medium text-green-600">{validCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">SMS Campaigns:</span>
          <span className="font-medium">{campaignCount}</span>
        </div>
        {taskStats && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tasks:</span>
            <span className="font-medium">
              {taskStats.completed}/{taskStats.total}
              {taskStats.total > 0 && (
                <span className="text-xs text-gray-400 ml-1">
                  ({Math.round(taskStats.completion_rate)}%)
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar (if task stats available) */}
      {taskStats && taskStats.total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(taskStats.completion_rate)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${taskStats.completion_rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Dates */}
      {(project.start_date || project.due_date) && (
        <div className="text-xs text-gray-500 mb-4 space-y-1">
          {project.start_date && (
            <div>Start: {new Date(project.start_date).toLocaleDateString()}</div>
          )}
          {project.due_date && (
            <div>Due: {new Date(project.due_date).toLocaleDateString()}</div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onView(project)}>
            View
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>
            Edit
          </Button>
          
          {/* Archive/Restore or Delete */}
          {isArchived ? (
            onRestore && (
              <Button variant="ghost" size="sm" onClick={() => onRestore(project)}>
                Restore
              </Button>
            )
          ) : (
            <>
              {onArchive && (
                <Button variant="ghost" size="sm" onClick={() => onArchive(project)}>
                  Archive
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onDelete(project)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}