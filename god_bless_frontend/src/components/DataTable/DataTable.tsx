import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  DataTableProps,
  SortConfig,
  FilterValue,
  ExportFormat,
} from '../../types/dataTable';
import {
  FiChevronUp,
  FiChevronDown,
  FiFilter,
  FiDownload,
  FiLoader,
  FiUpload,
} from 'react-icons/fi';
import FilterPanel from './FilterPanel';
import ExportModal from './ExportModal';
import ImportModal, { ImportFormat, ImportOptions } from './ImportModal';
import Pagination from '../Pagination';

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  filters = [],
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSort,
  onFilter,
  onExport,
  onImport,
  enableExport = true,
  enableImport = false,
  enableVirtualScroll = false,
  rowHeight = 50,
  emptyMessage = 'No data available',
  className = '',
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: '',
    direction: null,
  });
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const virtualScrollHeight = data.length * rowHeight;

  // Load filter values from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFilters: FilterValue = {};
    
    filters.forEach((filter) => {
      const value = params.get(filter.key);
      if (value) {
        if (filter.type === 'multiselect') {
          urlFilters[filter.key] = value.split(',');
        } else {
          urlFilters[filter.key] = value;
        }
      }
    });

    if (Object.keys(urlFilters).length > 0) {
      setFilterValues(urlFilters);
      if (onFilter) {
        onFilter(urlFilters);
      }
    }
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== '' && (!Array.isArray(value) || value.length > 0)) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
  }, [filterValues]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);
    
    if (onSort) {
      onSort(newSortConfig);
    }
  };

  const handleFilterChange = (newFilters: FilterValue) => {
    setFilterValues(newFilters);
    if (onFilter) {
      onFilter(newFilters);
    }
  };

  const handleFilterReset = () => {
    setFilterValues({});
    if (onFilter) {
      onFilter({});
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (onExport) {
      onExport(format, filteredData);
    }
  };

  const handleImport = (file: File, format: ImportFormat, options?: ImportOptions) => {
    if (onImport) {
      onImport(file, format, options);
    }
  };

  // Client-side filtering and sorting if no server-side handlers
  const filteredData = useMemo(() => {
    if (onFilter) return data; // Server-side filtering

    let filtered = [...data];

    // Apply filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
        return;
      }

      filtered = filtered.filter((row) => {
        const rowValue = row[key];
        
        if (Array.isArray(value)) {
          return value.includes(String(rowValue));
        }
        
        return String(rowValue)
          .toLowerCase()
          .includes(String(value).toLowerCase());
      });
    });

    return filtered;
  }, [data, filterValues, onFilter]);

  const sortedData = useMemo(() => {
    if (onSort || !sortConfig.direction) return filteredData; // Server-side sorting

    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      
      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredData, sortConfig, onSort]);

  // Virtual scrolling calculations
  const visibleData = useMemo(() => {
    if (!enableVirtualScroll) return sortedData;

    const startIndex = Math.floor(scrollTop / rowHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil((tableContainerRef.current?.clientHeight || 600) / rowHeight) + 1,
      sortedData.length
    );

    return sortedData.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      _virtualIndex: startIndex + index,
    }));
  }, [sortedData, scrollTop, rowHeight, enableVirtualScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const activeFilterCount = Object.values(filterValues).filter(
    (v) => v && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length;

  return (
    <div className={`rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark ${className}`}>
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stroke px-4 py-4 dark:border-strokedark md:px-6">
        <div className="flex items-center gap-3">
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative flex items-center gap-2 rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
            >
              <FiFilter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-meta-1 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pagination && onPageSizeChange && (
            <select
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-stroke bg-transparent px-3 py-2 text-sm outline-none dark:border-strokedark"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          )}

          {enableImport && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 rounded border border-stroke px-4 py-2 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
            >
              <FiUpload size={16} />
              Import
            </button>
          )}

          {enableExport && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 rounded border border-stroke px-4 py-2 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
            >
              <FiDownload size={16} />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {filters.length > 0 && (
        <div className="px-4 pt-4 md:px-6">
          <FilterPanel
            filters={filters}
            values={filterValues}
            onChange={handleFilterChange}
            onReset={handleFilterReset}
            isOpen={showFilters}
          />
        </div>
      )}

      {/* Table */}
      <div
        ref={tableContainerRef}
        className={`overflow-auto ${enableVirtualScroll ? 'max-h-[600px]' : ''}`}
        onScroll={enableVirtualScroll ? handleScroll : undefined}
      >
        {enableVirtualScroll && (
          <div style={{ height: virtualScrollHeight, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: Math.floor(scrollTop / rowHeight) * rowHeight,
                left: 0,
                right: 0,
              }}
            >
              <table className="w-full table-auto">
                <thead className="sticky top-0 z-10 bg-gray-2 dark:bg-meta-4">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-4 py-4 text-left font-medium ${
                          column.sortable ? 'cursor-pointer select-none' : ''
                        }`}
                        style={{ width: column.width }}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm uppercase text-black dark:text-white">
                            {column.label}
                          </span>
                          {column.sortable && sortConfig.key === column.key && (
                            <>
                              {sortConfig.direction === 'asc' && (
                                <FiChevronUp size={16} />
                              )}
                              {sortConfig.direction === 'desc' && (
                                <FiChevronDown size={16} />
                              )}
                            </>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-8 text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <FiLoader className="animate-spin" size={20} />
                          <span>Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : visibleData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    visibleData.map((row: any, index) => (
                      <tr
                        key={row._virtualIndex || index}
                        className="border-b border-stroke dark:border-strokedark"
                        style={{ height: rowHeight }}
                      >
                        {columns.map((column) => (
                          <td key={column.key} className="px-4 py-3">
                            {column.render
                              ? column.render(row[column.key], row)
                              : row[column.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!enableVirtualScroll && (
          <table className="w-full table-auto">
            <thead className="bg-gray-2 dark:bg-meta-4">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-4 text-left font-medium ${
                      column.sortable ? 'cursor-pointer select-none' : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm uppercase text-black dark:text-white">
                        {column.label}
                      </span>
                      {column.sortable && sortConfig.key === column.key && (
                        <>
                          {sortConfig.direction === 'asc' && (
                            <FiChevronUp size={16} />
                          )}
                          {sortConfig.direction === 'desc' && (
                            <FiChevronDown size={16} />
                          )}
                        </>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FiLoader className="animate-spin" size={20} />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-stroke dark:border-strokedark last:border-b-0"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3">
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && onPageChange && !loading && sortedData.length > 0 && (
        <div className="border-t border-stroke px-4 py-4 dark:border-strokedark">
          <Pagination
            pagination={{
              page_number: pagination.page,
              total_pages: Math.ceil(pagination.total / pagination.pageSize),
              next: pagination.page < Math.ceil(pagination.total / pagination.pageSize)
                ? pagination.page + 1
                : null,
              previous: pagination.page > 1 ? pagination.page - 1 : null,
            }}
            setPage={onPageChange}
          />
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      {/* Import Modal */}
      {enableImport && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

export default DataTable;
