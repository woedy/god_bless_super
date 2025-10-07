import React from 'react';
import DataTable from './DataTable';
import { Column, FilterConfig, ExportFormat } from '../../types/dataTable';
import { useClientSideDataTable } from '../../hooks/useDataTable';
import { exportData } from './exportUtils';

interface PhoneNumberData {
  id: number;
  number: string;
  carrier: string;
  type: string;
  areaCode: string;
  isValid: boolean;
  createdAt: string;
}

// Sample data
const sampleData: PhoneNumberData[] = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  number: `+1-555-${String(i).padStart(4, '0')}`,
  carrier: ['Verizon', 'AT&T', 'T-Mobile', 'Sprint'][i % 4],
  type: ['Mobile', 'Landline', 'VoIP'][i % 3],
  areaCode: ['555', '212', '310', '415'][i % 4],
  isValid: i % 5 !== 0,
  createdAt: new Date(2024, 0, (i % 28) + 1).toISOString().split('T')[0],
}));

const DataTableHookExample: React.FC = () => {
  // Use the custom hook for easy state management
  const {
    pagination,
    handleSort,
    handleFilter,
    handlePageChange,
    handlePageSizeChange,
    paginatedData,
    filteredData,
  } = useClientSideDataTable(sampleData, {
    initialPageSize: 25,
    initialPage: 1,
  });

  // Define columns
  const columns: Column<PhoneNumberData>[] = [
    {
      key: 'number',
      label: 'Phone Number',
      sortable: true,
      width: '200px',
    },
    {
      key: 'carrier',
      label: 'Carrier',
      sortable: true,
      filterable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      filterable: true,
    },
    {
      key: 'areaCode',
      label: 'Area Code',
      sortable: true,
      filterable: true,
    },
    {
      key: 'isValid',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            value
              ? 'bg-success bg-opacity-10 text-success'
              : 'bg-danger bg-opacity-10 text-danger'
          }`}
        >
          {value ? 'Valid' : 'Invalid'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
    },
  ];

  // Define filters
  const filters: FilterConfig[] = [
    {
      key: 'carrier',
      label: 'Carrier',
      type: 'select',
      options: [
        { value: 'Verizon', label: 'Verizon' },
        { value: 'AT&T', label: 'AT&T' },
        { value: 'T-Mobile', label: 'T-Mobile' },
        { value: 'Sprint', label: 'Sprint' },
      ],
    },
    {
      key: 'type',
      label: 'Type',
      type: 'multiselect',
      options: [
        { value: 'Mobile', label: 'Mobile' },
        { value: 'Landline', label: 'Landline' },
        { value: 'VoIP', label: 'VoIP' },
      ],
    },
    {
      key: 'areaCode',
      label: 'Area Code',
      type: 'text',
      placeholder: 'Enter area code...',
    },
    {
      key: 'isValid',
      label: 'Validation Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Valid' },
        { value: 'false', label: 'Invalid' },
      ],
    },
  ];

  // Export handler
  const handleExport = (format: ExportFormat) => {
    // Export the filtered data (not just the current page)
    exportData(format, filteredData, columns, 'phone_numbers');
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white">
          Phone Numbers Management
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Advanced data table with filtering, sorting, and export capabilities
        </p>
      </div>

      <DataTable
        data={paginatedData}
        columns={columns}
        filters={filters}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onFilter={handleFilter}
        onExport={handleExport}
        enableExport={true}
        emptyMessage="No phone numbers found. Try adjusting your filters."
      />

      <div className="mt-4 rounded-lg border border-stroke bg-gray-2 p-4 dark:border-strokedark dark:bg-meta-4">
        <h3 className="mb-2 font-semibold text-black dark:text-white">
          Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold text-black dark:text-white">
              {sampleData.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filtered</p>
            <p className="text-xl font-bold text-black dark:text-white">
              {filteredData.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Valid</p>
            <p className="text-xl font-bold text-success">
              {filteredData.filter((d) => d.isValid).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Invalid</p>
            <p className="text-xl font-bold text-danger">
              {filteredData.filter((d) => !d.isValid).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTableHookExample;
