/**
 * CampaignCard Component
 * Card display for individual SMS campaigns
 */

import React from 'react'
import { CampaignStatusBadge } from './CampaignStatusBadge'
import type { Campaign } from '../../types'

interface CampaignCardProps {
  campaign: Campaign
  onClick?: (campaign: Campaign) => void
  onEdit?: (campaign: Campaign) => void
  onDelete?: (campaign: Campaign) => void
  onViewReport?: (campaign: Campaign) => void
  showActions?: boolean
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onClick,
  onEdit,
  onDelete,
  onViewReport,
  showActions = true
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const calculateSuccessRate = () => {
    if (campaign.recipientCount === 0) return 0
    return Math.round((campaign.deliveredCount / campaign.recipientCount) * 100)
  }

  const getProgressPercentage = () => {
    if (campaign.recipientCount === 0) return 0
    return Math.round(((campaign.sentCount + campaign.failedCount) / campaign.recipientCount) * 100)
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onClick?.(campaign)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {campaign.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(campaign.createdAt)}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <CampaignStatusBadge status={campaign.status} showIcon />
        </div>
      </div>

      {/* Progress Bar */}
      {campaign.status === 'sending' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {campaign.recipientCount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Recipients</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {campaign.deliveredCount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Delivered</div>
        </div>
      </div>

      {/* Success Rate */}
      {campaign.recipientCount > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Success Rate</span>
            <span className={`font-medium ${
              calculateSuccessRate() >= 90 ? 'text-green-600' :
              calculateSuccessRate() >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {calculateSuccessRate()}%
            </span>
          </div>
        </div>
      )}

      {/* Message Preview */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-1">Message:</div>
        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border line-clamp-2">
          {campaign.message}
        </div>
      </div>

      {/* Timing Info */}
      <div className="text-xs text-gray-500 space-y-1 mb-4">
        {campaign.scheduledAt && (
          <div>Scheduled: {formatDate(campaign.scheduledAt)}</div>
        )}
        {campaign.startedAt && (
          <div>Started: {formatDate(campaign.startedAt)}</div>
        )}
        {campaign.completedAt && (
          <div>Completed: {formatDate(campaign.completedAt)}</div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(campaign)
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
            {onViewReport && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewReport(campaign)
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                View Report
              </button>
            )}
          </div>

          {onDelete && campaign.status !== 'sending' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(campaign)
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}