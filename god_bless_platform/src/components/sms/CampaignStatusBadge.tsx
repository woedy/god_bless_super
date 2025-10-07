/**
 * CampaignStatusBadge Component
 * Displays campaign status with appropriate styling
 */

import React from 'react'
import type { CampaignStatus } from '../../types'

interface CampaignStatusBadgeProps {
  status: CampaignStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export const CampaignStatusBadge: React.FC<CampaignStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = false,
  className = ''
}) => {
  const getStatusConfig = (status: CampaignStatus) => {
    switch (status) {
      case 'draft':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: '📝',
          label: 'Draft'
        }
      case 'scheduled':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: '⏰',
          label: 'Scheduled'
        }
      case 'sending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: '📤',
          label: 'Sending'
        }
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          icon: '✅',
          label: 'Completed'
        }
      case 'paused':
        return {
          color: 'bg-orange-100 text-orange-800',
          icon: '⏸️',
          label: 'Paused'
        }
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800',
          icon: '❌',
          label: 'Cancelled'
        }
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800',
          icon: '⚠️',
          label: 'Failed'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: '❓',
          label: status
        }
    }
  }

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs'
      case 'md':
        return 'px-2.5 py-0.5 text-sm'
      case 'lg':
        return 'px-3 py-1 text-base'
      default:
        return 'px-2.5 py-0.5 text-sm'
    }
  }

  const config = getStatusConfig(status)
  const sizeClasses = getSizeClasses(size)

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClasses} ${className}`}
    >
      {showIcon && (
        <span className="mr-1" role="img" aria-label={config.label}>
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  )
}