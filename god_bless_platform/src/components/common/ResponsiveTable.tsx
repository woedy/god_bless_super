/**
 * Responsive Table Component
 * Table that adapts to mobile screens with card layout
 */

import React from 'react'
import { useResponsive } from '../../hooks/useResponsive'

export interface ResponsiveTableColumn<T = any> {
  key: string
  title: string
  render?: (value: any, record: T, index: number) => React.ReactNode
  width?: string | number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  mobileLabel?: string
  hideOnMobile?: boolean
  priority?: 'high' | 'medium' | 'low' // Controls which columns show on mobile
}

export interface ResponsiveTableProps<T = any> {
  data: T[]
  columns: ResponsiveTableColumn<T>[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (record: T, index: number) => void
  className?: string
  mobileCardRender?: (record: T, index: number) => React.ReactNode
  showMobileHeaders?: boolean
}

export function ResponsiveTable<T = any>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  mobileCardRender,
  showMobileHeaders = true
}: ResponsiveTableProps<T>) {
  const { isMobile } = useResponsive()

  // Filter columns for mobile based on priority
  const getMobileColumns = () => {
    return columns.filter(col => 
      !col.hideOnMobile && 
      (col.priority === 'high' || (!col.priority && columns.indexOf(col) < 2))
    )
  }

  // Render loading state
  if (loading) {
    return (
      <div className={`theme-table-container ${className}`}>
        <div className="px-8 py-10 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-transparent theme-border">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
          </div>
          <p className="text-sm theme-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // Render empty state
  if (!data || data.length === 0) {
    return (
      <div className={`theme-table-container ${className}`}>
        <div className="px-8 py-10 text-center">
          <svg className="mx-auto h-12 w-12 theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-3 text-sm theme-text-muted">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  // Mobile card layout
  if (isMobile) {
    if (mobileCardRender) {
      return (
        <div className={`space-y-3 ${className}`}>
          {data.map((record, index) => (
            <div
              key={index}
              className={`theme-surface border theme-border rounded-xl p-4 transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
              }`}
              onClick={() => onRowClick?.(record, index)}
            >
              {mobileCardRender(record, index)}
            </div>
          ))}
        </div>
      )
    }

    const mobileColumns = getMobileColumns()

    return (
        <div className={`space-y-3 ${className}`}>
          {data.map((record, index) => (
            <div
              key={index}
              className={`theme-surface border theme-border rounded-xl p-4 transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
              }`}
              onClick={() => onRowClick?.(record, index)}
            >
              <div className="space-y-3">
              {mobileColumns.map((column) => {
                const value = record[column.key]
                const displayValue = column.render ? column.render(value, record, index) : value

                return (
                  <div key={column.key} className="flex justify-between items-start">
                    {showMobileHeaders && (
                      <span className="text-sm font-medium theme-text-muted min-w-0 flex-1 mr-4">
                        {column.mobileLabel || column.title}:
                      </span>
                    )}
                    <div className={`text-sm theme-text-primary ${showMobileHeaders ? 'text-right' : 'w-full'}`}>
                      {displayValue}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Desktop table layout
  return (
    <div className={`theme-table-container ${className}`}>
      <div className="overflow-x-auto">
        <table className="theme-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-semibold theme-table-header-cell tracking-wider ${
                    column.align === 'center' ? 'text-center' :
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((record, index) => (
              <tr
                key={index}
                className={`theme-table-row ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
                    : ''
                }`}
                onClick={() => onRowClick?.(record, index)}
              >
                {columns.map((column) => {
                  const value = record[column.key]
                  const displayValue = column.render ? column.render(value, record, index) : value

                  return (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm theme-table-cell ${
                        column.align === 'center' ? 'text-center' :
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {displayValue}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Responsive Data List Component
 * Simple list component for mobile-first data display
 */
export interface ResponsiveDataListProps<T = any> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  loading?: boolean
  emptyMessage?: string
  className?: string
  itemClassName?: string
  onItemClick?: (item: T, index: number) => void
}

export function ResponsiveDataList<T = any>({
  data,
  renderItem,
  loading = false,
  emptyMessage = 'No items found',
  className = '',
  itemClassName = '',
  onItemClick
}: ResponsiveDataListProps<T>) {
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((item, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg border border-gray-200 p-4 ${
            onItemClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
          } ${itemClassName}`}
          onClick={() => onItemClick?.(item, index)}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}