/**
 * CampaignList Component
 * List view for SMS campaigns with filtering and pagination
 */

import React, { useState, useEffect } from 'react'
import { CampaignCard } from './CampaignCard'
import { smsService } from '../../services'
import type { Campaign, CampaignFilters, CampaignStatus } from '../../types'

interface CampaignListProps {
  projectId?: string
  onCampaignClick?: (campaign: Campaign) => void
  onCampaignEdit?: (campaign: Campaign) => void
  onCampaignDelete?: (campaign: Campaign) => void
  onCampaignReport?: (campaign: Campaign) => void
  showActions?: boolean
  className?: string
}

export const CampaignList: React.FC<CampaignListProps> = ({
  projectId,
  onCampaignClick,
  onCampaignEdit,
  onCampaignDelete,
  onCampaignReport,
  showActions = true,
  className = ''
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CampaignFilters>({
    projectId,
    page: 1,
    pageSize: 12
  })

  useEffect(() => {
    loadCampaigns()
  }, [filters])

  const loadCampaigns = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await smsService.getCampaigns(filters)
      
      if (response.success) {
        setCampaigns(response.data)
      } else {
        throw new Error('Failed to load campaigns')
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error)
      setError(error instanceof Error ? error.message : 'Failed to load campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (field: keyof CampaignFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const handleDeleteCampaign = async (campaign: Campaign) => {
    if (!window.confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      return
    }

    try {
      const response = await smsService.deleteCampaign(campaign.id)
      
      if (response.success) {
        // Remove from local state
        setCampaigns(prev => prev.filter(c => c.id !== campaign.id))
      } else {
        throw new Error('Failed to delete campaign')
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      alert('Failed to delete campaign. Please try again.')
    }
  }

  if (isLoading && campaigns.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Loading skeleton */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                </div>
                <div className="text-center">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                </div>
              </div>
              <div className="h-16 bg-gray-200 rounded mb-4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadCampaigns}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value as CampaignStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sending">Sending</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created After
            </label>
            <input
              type="date"
              value={filters.createdAfter || ''}
              onChange={(e) => handleFilterChange('createdAfter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created Before
            </label>
            <input
              type="date"
              value={filters.createdBefore || ''}
              onChange={(e) => handleFilterChange('createdBefore', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ projectId, page: 1, pageSize: 12 })}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
          <p className="text-gray-500">
            {filters.status || filters.createdAfter || filters.createdBefore
              ? 'Try adjusting your filters to see more campaigns.'
              : 'Create your first SMS campaign to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={onCampaignClick}
              onEdit={onCampaignEdit}
              onDelete={onCampaignDelete ? () => handleDeleteCampaign(campaign) : undefined}
              onViewReport={onCampaignReport}
              showActions={showActions}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {campaigns.length > 0 && campaigns.length >= (filters.pageSize || 12) && (
        <div className="text-center">
          <button
            onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}