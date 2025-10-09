/**
 * Project List Component
 * Component for displaying projects in grid or list view
 */

import { useState } from 'react'
import { ProjectCard } from './ProjectCard'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'
import { Button } from '../common'
import type { Project } from '../../types/models'

interface ProjectListProps {
  projects: Project[]
  loading?: boolean
  onView: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (project: Project) => Promise<void>
  onArchive?: (project: Project) => Promise<void>
  onRestore?: (project: Project) => Promise<void>
  onCreate: () => void
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
}

export function ProjectList({
  projects,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onCreate,
  viewMode = 'grid',
  onViewModeChange
}: ProjectListProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    project: Project | null
    type: 'delete' | 'archive'
  }>({
    isOpen: false,
    project: null,
    type: 'delete'
  })
  const [actionLoading, setActionLoading] = useState(false)

  const handleDeleteClick = (project: Project) => {
    setDeleteModal({
      isOpen: true,
      project,
      type: 'delete'
    })
  }

  const handleArchiveClick = (project: Project) => {
    setDeleteModal({
      isOpen: true,
      project,
      type: 'archive'
    })
  }

  const handleConfirmAction = async () => {
    if (!deleteModal.project) return

    setActionLoading(true)
    try {
      if (deleteModal.type === 'delete') {
        await onDelete(deleteModal.project)
      } else if (onArchive) {
        await onArchive(deleteModal.project)
      }
      setDeleteModal({ isOpen: false, project: null, type: 'delete' })
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelAction = () => {
    setDeleteModal({ isOpen: false, project: null, type: 'delete' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="space-y-2 mb-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first project.</p>
        <div className="mt-6">
          <Button variant="primary" onClick={onCreate}>
            Create Project
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">View:</span>
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`px-3 py-1 text-sm rounded-l-md ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`px-3 py-1 text-sm rounded-r-md ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid/List */}
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onView={onView}
            onEdit={onEdit}
            onDelete={handleDeleteClick}
            onArchive={onArchive ? handleArchiveClick : undefined}
            onRestore={onRestore}
          />
        ))}
      </div>

      {/* Delete/Archive Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        project={deleteModal.project}
        type={deleteModal.type}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        loading={actionLoading}
      />
    </div>
  )
}