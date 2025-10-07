import React, { useState } from 'react';
import DataTable from './DataTable';
import { Column, FilterConfig, ExportFormat } from '../../types/dataTable';
import { exportData } from './exportUtils';

// Example: Phone Number Data
interface PhoneNumberData {
  id: number;
  number: string;
  carrier: string;
  type: string;
  areaCode: string;
  isValid: boolean;
  createdAt: string;
}

const DataTableExample: React.FC = () => {
  // Sample data
  const [data] = useState<PhoneNumberData[]>([
    {
      id: 1,
      number: '+1-555-0101',
      carrier: 'Verizon',
      type: 'Mobile',
      areaCode: '555',
      isValid: true,
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      number: '+1-555-0102',
      carrier: 'AT&T',
      type: 'Landline',
      areaCode: '555',
      isValid: true,
      createdAt: '2024-01-16',
    },
    {
      id: 3,
      number: '+1-555-0103',
      carrier: 'T-Mobile',
      type: 'Mobile',
      areaCode: '555',
      isValid: false,
      createdAt: '2024-01-17',
    },
    // Add more sample data as needed
  ]);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 100,
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

  // Handlers
  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page });
    // Fetch data for new page
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ ...pagination, pageSize, page: 1 });
    // Fetch data with new page size
  };

  const handleSort = (sortConfig: any) => {
    console.log('Sort:', sortConfig);
    // Fetch sorted data from API
  };

  const handleFilter = (filters: any) => {
    console.log('Filters:', filters);
    // Fetch filtered data from API
  };

  const handleExport = (format: ExportFormat, filteredData: PhoneNumberData[]) => {
    exportData(format, filteredData, columns, 'phone_numbers');
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
        Phone Numbers
      </h2>

      <DataTable
        data={data}
        columns={columns}
        filters={filters}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onFilter={handleFilter}
        onExport={handleExport}
        enableExport={true}
        enableVirtualScroll={false}
        emptyMessage="No phone numbers found"
      />
    </div>
  );
};

export default DataTableExample;
