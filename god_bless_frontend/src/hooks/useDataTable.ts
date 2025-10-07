import { useState, useCallback, useMemo } from 'react';
import {
  SortConfig,
  FilterValue,
  PaginationConfig,
} from '../types/dataTable';

interface UseDataTableOptions {
  initialPageSize?: number;
  initialPage?: number;
}

interface UseDataTableReturn {
  // State
  sortConfig: SortConfig;
  filterValues: FilterValue;
  pagination: PaginationConfig;
  
  // Setters
  setSortConfig: (config: SortConfig) => void;
  setFilterValues: (values: FilterValue) => void;
  setPagination: (config: PaginationConfig) => void;
  
  // Handlers
  handleSort: (config: SortConfig) => void;
  handleFilter: (values: FilterValue) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  
  // Reset
  resetFilters: () => void;
  resetSort: () => void;
  resetAll: () => void;
}

/**
 * Custom hook for managing DataTable state
 * Simplifies state management for sorting, filtering, and pagination
 */
export const useDataTable = (
  options: UseDataTableOptions = {}
): UseDataTableReturn => {
  const { initialPageSize = 25, initialPage = 1 } = options;

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: '',
    direction: null,
  });

  // Filter state
  const [filterValues, setFilterValues] = useState<FilterValue>({});

  // Pagination state
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });

  // Sort handler
  const handleSort = useCallback((config: SortConfig) => {
    setSortConfig(config);
    // Reset to first page when sorting changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Filter handler
  const handleFilter = useCallback((values: FilterValue) => {
    setFilterValues(values);
    // Reset to first page when filters change
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Page change handler
  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  // Page size change handler
  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // Reset functions
  const resetFilters = useCallback(() => {
    setFilterValues({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const resetSort = useCallback(() => {
    setSortConfig({ key: '', direction: null });
  }, []);

  const resetAll = useCallback(() => {
    resetFilters();
    resetSort();
    setPagination({
      page: initialPage,
      pageSize: initialPageSize,
      total: 0,
    });
  }, [initialPage, initialPageSize, resetFilters, resetSort]);

  return {
    sortConfig,
    filterValues,
    pagination,
    setSortConfig,
    setFilterValues,
    setPagination,
    handleSort,
    handleFilter,
    handlePageChange,
    handlePageSizeChange,
    resetFilters,
    resetSort,
    resetAll,
  };
};

/**
 * Hook for client-side data filtering and sorting
 * Use this when you want to handle filtering/sorting on the client
 */
export const useClientSideDataTable = <T extends Record<string, any>>(
  data: T[],
  options: UseDataTableOptions = {}
) => {
  const tableState = useDataTable(options);
  const { sortConfig, filterValues, pagination } = tableState;

  // Client-side filtering
  const filteredData = useMemo(() => {
    let filtered = [...data];

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
  }, [data, filterValues]);

  // Client-side sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.direction) return filteredData;

    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredData, sortConfig]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, pagination.page, pagination.pageSize]);

  // Update total count
  const paginationWithTotal = useMemo(
    () => ({
      ...pagination,
      total: sortedData.length,
    }),
    [pagination, sortedData.length]
  );

  return {
    ...tableState,
    pagination: paginationWithTotal,
    filteredData: sortedData,
    paginatedData,
  };
};

export default useDataTable;
