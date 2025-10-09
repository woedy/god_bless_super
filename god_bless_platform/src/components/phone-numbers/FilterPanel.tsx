/**
 * FilterPanel Component
 * Advanced filtering and search interface for phone numbers
 */

import React, { useState, useEffect } from 'react'
import { Button, Input, Select, Card, DatePicker, Badge } from '../common'
import type { NumberFilters } from '../../types'

interface FilterPanelProps {
  filters: NumberFilters
  onFiltersChange: (filters: NumberFilters) => void
  onApplyFilters: () => void
  onClearFilters: () => void
  availableCarriers?: string[]
  availableCountries?: string[]
  availableLineTypes?: string[]
  isLoading?: boolean
}

interface FilterState extends NumberFilters {
  // Additional UI state
  showAdvanced: boolean
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  availableCarriers = [],
  availableCountries = [],
  availableLineTypes = [],
  isLoading = false
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>({
    ...filters,
    showAdvanced: false
  })
  
  // Real-time filter application
  const [applyFiltersRealTime, setApplyFiltersRealTime] = useState<boolean>(true)

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(prev => ({
      ...prev,
      ...filters
    }))
  }, [filters])

  const updateFilter = (key: keyof NumberFilters, value: unknown) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    
    // Remove the showAdvanced property before passing to parent
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { showAdvanced, ...filtersToPass } = newFilters
    onFiltersChange(filtersToPass)
    
    // Apply filters in real-time if enabled
    if (applyFiltersRealTime) {
      setTimeout(() => onApplyFilters(), 300) // Debounce for 300ms
    }
  }

  const handleApplyFilters = () => {
    onApplyFilters()
  }

  const handleClearFilters = () => {
    setLocalFilters({
      showAdvanced: localFilters.showAdvanced
    })
    onClearFilters()
  }

  const toggleAdvanced = () => {
    setLocalFilters(prev => ({
      ...prev,
      showAdvanced: !prev.showAdvanced
    }))
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.search) count++
    if (localFilters.isValid !== undefined) count++
    if (localFilters.carrier) count++
    if (localFilters.country) count++
    if (localFilters.lineType) count++
    if (localFilters.source) count++
    if (localFilters.validatedAfter) count++
    if (localFilters.validatedBefore) count++
    return count
  }

  const validationOptions = [
    { value: '', label: 'All Numbers' },
    { value: 'true', label: 'Valid Only' },
    { value: 'false', label: 'Invalid Only' }
  ]

  const carrierOptions = [
    { value: '', label: 'All Carriers' },
    ...availableCarriers.map(carrier => ({
      value: carrier,
      label: carrier
    }))
  ]

  const countryOptions = [
    { value: '', label: 'All Countries' },
    ...availableCountries.map(country => ({
      value: country,
      label: country
    }))
  ]

  const lineTypeOptions = [
    { value: '', label: 'All Line Types' },
    ...availableLineTypes.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }))
  ]

  const sourceOptions = [
    { value: '', label: 'All Sources' },
    { value: 'generated', label: 'Generated' },
    { value: 'imported', label: 'Imported' },
    { value: 'manual', label: 'Manual' }
  ]

  const sortOptions = [
    { value: '-createdAt', label: 'Newest First' },
    { value: 'createdAt', label: 'Oldest First' },
    { value: 'number', label: 'Number (A-Z)' },
    { value: '-number', label: 'Number (Z-A)' },
    { value: 'carrier', label: 'Carrier (A-Z)' },
    { value: '-carrier', label: 'Carrier (Z-A)' },
    { value: 'country', label: 'Country (A-Z)' },
    { value: '-country', label: 'Country (Z-A)' },
    { value: '-validatedAt', label: 'Recently Validated' },
    { value: 'validatedAt', label: 'Oldest Validated' }
  ]

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">Filters</h3>
            {getActiveFilterCount() > 0 && (
              <Badge variant="primary" size="sm">
                {getActiveFilterCount()}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAdvanced}
            >
              {localFilters.showAdvanced ? 'Hide' : 'Show'} Advanced
            </Button>
            
            {getActiveFilterCount() > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Real-time Filter Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="realtime-filters"
              checked={applyFiltersRealTime}
              onChange={(e) => setApplyFiltersRealTime(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="realtime-filters" className="text-sm text-gray-700">
              Apply filters in real-time
            </label>
          </div>
          
          <div className="text-sm text-gray-500">
            {isLoading ? 'Loading...' : `${getActiveFilterCount()} active filters`}
          </div>
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Search Numbers"
            placeholder="Search phone numbers..."
            value={localFilters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            icon={
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />

          <Select
            label="Validation Status"
            value={localFilters.isValid?.toString() || ''}
            onChange={(value: string) => updateFilter('isValid', value === '' ? undefined : value === 'true')}
            options={validationOptions}
          />

          <Select
            label="Carrier"
            value={localFilters.carrier || ''}
            onChange={(value: string) => updateFilter('carrier', value || undefined)}
            options={carrierOptions}
          />
          
          <Input
            label="Area Code"
            placeholder="e.g., 555"
            value={localFilters.areaCode || ''}
            onChange={(e) => updateFilter('areaCode', e.target.value)}
            maxLength={3}
          />
        </div>

        {/* Advanced Filters */}
        {localFilters.showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select
                label="Country"
                value={localFilters.country || ''}
                onChange={(value: string) => updateFilter('country', value || undefined)}
                options={countryOptions}
              />

              <Select
                label="Line Type"
                value={localFilters.lineType || ''}
                onChange={(value: string) => updateFilter('lineType', value || undefined)}
                options={lineTypeOptions}
              />

              <Select
                label="Source"
                value={localFilters.source || ''}
                onChange={(value: string) => updateFilter('source', value || undefined)}
                options={sourceOptions}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="Validated After"
                value={localFilters.validatedAfter || ''}
                onChange={(value: string) => updateFilter('validatedAfter', value || undefined)}
                placeholder="Select start date"
              />

              <DatePicker
                label="Validated Before"
                value={localFilters.validatedBefore || ''}
                onChange={(value: string) => updateFilter('validatedBefore', value || undefined)}
                placeholder="Select end date"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Sort By"
                value={localFilters.ordering || '-createdAt'}
                onChange={(value: string) => updateFilter('ordering', value)}
                options={sortOptions}
              />

              <Select
                label="Page Size"
                value={localFilters.pageSize?.toString() || '25'}
                onChange={(value: string) => updateFilter('pageSize', parseInt(value))}
                options={[
                  { value: '10', label: '10 per page' },
                  { value: '25', label: '25 per page' },
                  { value: '50', label: '50 per page' },
                  { value: '100', label: '100 per page' }
                ]}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={isLoading || getActiveFilterCount() === 0}
          >
            Clear Filters
          </Button>
          
          <Button
            onClick={handleApplyFilters}
            disabled={isLoading}
            loading={isLoading}
          >
            Apply Filters
          </Button>
        </div>

        {/* Active Filters Summary */}
        {getActiveFilterCount() > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              
              {localFilters.search && (
                <Badge variant="secondary" size="sm">
                  Search: "{localFilters.search}"
                </Badge>
              )}
              
              {localFilters.isValid !== undefined && (
                <Badge variant="secondary" size="sm">
                  Status: {localFilters.isValid ? 'Valid' : 'Invalid'}
                </Badge>
              )}
              
              {localFilters.carrier && (
                <Badge variant="secondary" size="sm">
                  Carrier: {localFilters.carrier}
                </Badge>
              )}
              
              {localFilters.country && (
                <Badge variant="secondary" size="sm">
                  Country: {localFilters.country}
                </Badge>
              )}
              
              {localFilters.lineType && (
                <Badge variant="secondary" size="sm">
                  Line Type: {localFilters.lineType}
                </Badge>
              )}
              
              {localFilters.source && (
                <Badge variant="secondary" size="sm">
                  Source: {localFilters.source}
                </Badge>
              )}
              
              {localFilters.validatedAfter && (
                <Badge variant="secondary" size="sm">
                  After: {new Date(localFilters.validatedAfter).toLocaleDateString()}
                </Badge>
              )}
              
              {localFilters.validatedBefore && (
                <Badge variant="secondary" size="sm">
                  Before: {new Date(localFilters.validatedBefore).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}