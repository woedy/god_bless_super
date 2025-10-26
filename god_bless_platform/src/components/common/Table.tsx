/**
 * Table Component
 * Reusable data table component
 */

import React from 'react'

export interface TableColumn<T = any> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onSort?: (column: string) => void
  sortBy?: string
  className?: string
}

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onSort,
  sortBy,
  className = ''
}: TableProps<T>) => {
  const handleSort = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key)
    }
  }

  const getSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable) return null

    const isActive = sortBy === column.key || sortBy === `-${column.key}`
    const isDesc = sortBy === `-${column.key}`

    return (
      <span className="ml-1 inline-flex flex-col">
        <svg
          className={`h-3 w-3 ${isActive && !isDesc ? 'text-gray-900' : 'text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        <svg
          className={`h-3 w-3 -mt-1 ${isActive && isDesc ? 'text-gray-900' : 'text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </span>
    )
  }

  if (loading) {
    return (
      <div className={`theme-table-container ${className}`}>
        <div className="border-b theme-border px-6 py-4">
          <div className="flex items-center space-x-3 text-sm theme-text-muted">
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            <span>Loading...</span>
          </div>
        </div>
        <div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`px-6 py-4 ${i < 4 ? 'border-b theme-border' : ''}`}
            >
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded theme-loading-bar animate-pulse"></div>
                <div className="h-4 w-1/2 rounded theme-loading-bar animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`theme-table-container ${className}`}>
      <div className="overflow-x-auto">
        <table className="theme-table">
          <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-semibold tracking-wider theme-table-header-cell ${
                  column.sortable ? 'theme-header-sortable hover:bg-gray-100 focus-visible:bg-gray-100' : ''
                } ${column.headerClassName || ''}`}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center">
                  {column.label}
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="theme-table-empty"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row.id || index} className="theme-table-row">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm theme-table-cell ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(row[column.key], row, index)
                      : row[column.key]
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  )
}