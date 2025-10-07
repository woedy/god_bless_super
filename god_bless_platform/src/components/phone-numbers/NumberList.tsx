/**
 * NumberList Component
 * Displays phone numbers with pagination, filtering, and bulk operations
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Button, Input, Select, Card, Badge, Checkbox, Modal, Table, Pagination } from '../common'
import { phoneNumberService } from '../../services'
import type { PhoneNumber, NumberFilters, Project } from '../../types'

interface NumberListProps {
  project: Project
  filters?: NumberFilters
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
}

interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: PhoneNumber) => React.ReactNode
}

export const NumberList: React.FC<NumberListProps> = ({
  project,
  filters: externalFilters,
  onError,
  onSuccess
}) => {
  // Data state
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)
  const [totalPages, setTotalPages] = useState<number>(0)

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [validationFilter, setValidationFilter] = useState<string>('all')
  const [carrierFilter, setCarrierFilter] = useState<string>('')
  const [countryFilter, setCountryFilter] = useState<string>('')
  const [lineTypeFilter, setLineTypeFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('-createdAt')

  // Selection state
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState<boolean>(false)

  // UI state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Available filter options
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([])
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [availableLineTypes, setAvailableLineTypes] = useState<string[]>([])

  // Load numbers when filters or pagination change
  useEffect(() => {
    loadNumbers()
  }, [currentPage, pageSize, searchQuery, validationFilter, carrierFilter, countryFilter, lineTypeFilter, sortBy, project.id, externalFilters])

  // Update select all state when selection changes
  useEffect(() => {
    setSelectAll(selectedNumbers.size > 0 && selectedNumbers.size === numbers.length)
  }, [selectedNumbers, numbers])

  const loadNumbers = useCallback(async () => {
    try {
      setIsLoading(true)

      // Build filters object combining external and internal filters
      const filters: NumberFilters = {
        projectId: project.id,
        page: currentPage,
        pageSize,
        ordering: sortBy
      }

      // Apply external filters first (from FilterPanel)
      if (externalFilters) {
        if (externalFilters.search) filters.search = externalFilters.search
        if (externalFilters.isValid !== undefined) filters.isValid = externalFilters.isValid
        if (externalFilters.carrier) filters.carrier = externalFilters.carrier
        if (externalFilters.country) filters.country = externalFilters.country
        if (externalFilters.lineType) filters.lineType = externalFilters.lineType
      }

      // Apply internal filters (from the component's own filter controls)
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim()
      }

      if (validationFilter !== 'all') {
        filters.isValid = validationFilter === 'valid'
      }

      if (carrierFilter) {
        filters.carrier = carrierFilter
      }

      if (countryFilter) {
        filters.country = countryFilter
      }

      if (lineTypeFilter) {
        filters.lineType = lineTypeFilter
      }

      console.log('🔍 NumberList - Loading with filters:', filters)
      console.log('🔍 NumberList - External filters:', externalFilters)
      console.log('🔍 NumberList - Internal filters:', {
        searchQuery,
        validationFilter,
        carrierFilter,
        countryFilter,
        lineTypeFilter
      })
      
      const response = await phoneNumberService.getNumbers(filters)

      if (response.success) {
        setNumbers(response.data.results)
        setTotalCount(response.data.count)
        setTotalPages(response.data.totalPages)

        // Extract unique filter options
        const carriers = [...new Set(response.data.results.map(n => n.carrier).filter(Boolean) as string[])]
        const countries = [...new Set(response.data.results.map(n => n.country).filter(Boolean) as string[])]
        const lineTypes = [...new Set(response.data.results.map(n => n.lineType).filter(Boolean) as string[])]

        setAvailableCarriers(carriers)
        setAvailableCountries(countries)
        setAvailableLineTypes(lineTypes)
      }
    } catch (error) {
      console.error('Failed to load numbers:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to load phone numbers')
    } finally {
      setIsLoading(false)
    }
  }, [project.id, currentPage, pageSize, searchQuery, validationFilter, carrierFilter, countryFilter, lineTypeFilter, sortBy, onError])

  const handleSelectNumber = (numberId: string, selected: boolean) => {
    const newSelection = new Set(selectedNumbers)
    if (selected) {
      newSelection.add(numberId)
    } else {
      newSelection.delete(numberId)
    }
    setSelectedNumbers(newSelection)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedNumbers(new Set(numbers.map(n => n.id)))
    } else {
      setSelectedNumbers(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedNumbers.size === 0) return

    try {
      setIsDeleting(true)
      const numberIds = Array.from(selectedNumbers)
      
      const response = await phoneNumberService.bulkDeleteNumbers(numberIds)
      
      if (response.success) {
        onSuccess?.(`Successfully deleted ${numberIds.length} phone numbers`)
        setSelectedNumbers(new Set())
        setShowDeleteModal(false)
        loadNumbers() // Reload the list
      }
    } catch (error) {
      console.error('Bulk delete failed:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to delete phone numbers')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleQuickExport = async () => {
    if (selectedNumbers.size === 0) return

    try {
      // Get selected numbers data
      const selectedNumbersData = numbers.filter(n => selectedNumbers.has(n.id))
      
      // Create CSV content
      const headers = ['Phone Number', 'Carrier', 'Line Type', 'Country', 'Status', 'Created']
      const csvContent = [
        headers.join(','),
        ...selectedNumbersData.map(number => [
          `"${number.formattedNumber || number.number}"`,
          `"${number.carrier || ''}"`,
          `"${number.lineType || ''}"`,
          `"${number.country || ''}"`,
          `"${number.isValid ? 'Valid' : 'Invalid'}"`,
          `"${number.createdAt ? new Date(number.createdAt).toLocaleDateString() : ''}"`
        ].join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `selected_numbers_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onSuccess?.(`Successfully exported ${selectedNumbers.size} phone numbers`)
      setSelectedNumbers(new Set())
    } catch (error) {
      console.error('Quick export failed:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to export phone numbers')
    }
  }

  const handleSort = (column: string) => {
    const newSortBy = sortBy === column ? `-${column}` : column
    setSortBy(newSortBy)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setValidationFilter('all')
    setCarrierFilter('')
    setCountryFilter('')
    setLineTypeFilter('')
    setCurrentPage(1)
  }

  const columns: TableColumn[] = [
    {
      key: 'select',
      label: '',
      render: (_, row) => (
        <Checkbox
          checked={selectedNumbers.has(row.id)}
          onChange={(checked: boolean) => handleSelectNumber(row.id, checked)}
        />
      )
    },
    {
      key: 'number',
      label: 'Phone Number',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{row.formattedNumber || (value as string)}</div>
          {row.metadata?.source && (
            <div className="text-xs text-gray-500">
              Source: {row.metadata.source}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'isValid',
      label: 'Status',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={(value as boolean) ? 'success' : 'error'}>
          {(value as boolean) ? 'Valid' : 'Invalid'}
        </Badge>
      )
    },
    {
      key: 'carrier',
      label: 'Carrier',
      sortable: true,
      render: (value: unknown) => (value as string) || '-'
    },
    {
      key: 'lineType',
      label: 'Line Type',
      sortable: true,
      render: (value: unknown) => (value as string) ? (
        <Badge variant="secondary">
          {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
        </Badge>
      ) : '-'
    },
    {
      key: 'country',
      label: 'Country',
      sortable: true,
      render: (value: unknown, row: PhoneNumber) => (
        <div>
          <div>{value as string}</div>
          {row.countryCode && (
            <div className="text-xs text-gray-500">{row.countryCode}</div>
          )}
        </div>
      )
    },
    {
      key: 'validatedAt',
      label: 'Validated',
      sortable: true,
      render: (value: unknown) => (value as string) ? (
        <div className="text-sm">
          {new Date(value as string).toLocaleDateString()}
        </div>
      ) : '-'
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: unknown) => (
        <div className="text-sm">
          {new Date(value as string).toLocaleDateString()}
        </div>
      )
    }
  ]

  const validationOptions = [
    { value: 'all', label: 'All Numbers' },
    { value: 'valid', label: 'Valid Only' },
    { value: 'invalid', label: 'Invalid Only' }
  ]

  const carrierOptions = availableCarriers.map(carrier => ({
    value: carrier,
    label: carrier
  }))

  const countryOptions = availableCountries.map(country => ({
    value: country,
    label: country
  }))

  const lineTypeOptions = availableLineTypes.map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1)
  }))

  const pageSizeOptions = [
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' }
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Search phone numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            value={validationFilter}
            onChange={setValidationFilter}
            options={validationOptions}
            placeholder="Filter by validation"
          />

          <Select
            value={carrierFilter}
            onChange={setCarrierFilter}
            options={carrierOptions}
            placeholder="Filter by carrier"
          />

          <Select
            value={countryFilter}
            onChange={setCountryFilter}
            options={countryOptions}
            placeholder="Filter by country"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select
              value={lineTypeFilter}
              onChange={setLineTypeFilter}
              options={lineTypeOptions}
              placeholder="Filter by line type"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {totalCount} total numbers
            </span>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedNumbers.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedNumbers.size} numbers selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNumbers(new Set())}
              >
                Clear Selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickExport}
              >
                Export Selected
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectAll}
                onChange={handleSelectAll}
                indeterminate={selectedNumbers.size > 0 && selectedNumbers.size < numbers.length}
              />
              <h3 className="font-medium">Phone Numbers</h3>
            </div>

            <Select
              value={pageSize.toString()}
              onChange={(value: string) => setPageSize(parseInt(value))}
              options={pageSizeOptions}
              size="sm"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={numbers}
          loading={isLoading}
          onSort={handleSort}
          sortBy={sortBy}
          emptyMessage="No phone numbers found"
        />

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showPageSize={false}
            />
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Phone Numbers"
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Are you sure you want to delete {selectedNumbers.size} phone numbers? 
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              loading={isDeleting}
            >
              Delete Numbers
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}