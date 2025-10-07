import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import DataTable from '../../components/DataTable/DataTable';
import { Column, Filter, FilterValue } from '../../types/dataTable';
import { baseUrl, projectID, userID, userToken } from '../../constants';
import { exportToCSV, exportToJSON } from '../../components/DataTable/exportUtils';
import toast from 'react-hot-toast';
import { FiTrash2, FiCheckCircle } from 'react-icons/fi';

interface PhoneNumber {
  id: number;
  phone_number: string;
  valid_number: boolean | null;
  carrier: string | null;
  location: string | null;
  type: string | null;
  country_name: string | null;
  created_at: string;
}

const AllNumbersPage = () => {
  const [data, setData] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
  });
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const navigate = useNavigate();

  const fetchData = useCallback(async (customFilters?: FilterValue, customPage?: number) => {
    setLoading(true);
    try {
      const currentFilters = customFilters || filterValues;
      const currentPage = customPage || pagination.page;
      
      const params = new URLSearchParams({
        user_id: userID,
        project_id: projectID,
        page: currentPage.toString(),
        page_size: pagination.pageSize.toString(),
        search: currentFilters.search?.toString() || '',
      });

      // Add additional filter parameters - only if they have values
      if (currentFilters.valid_number && currentFilters.valid_number !== '') {
        params.append('valid_number', currentFilters.valid_number.toString());
      }
      if (currentFilters.type && currentFilters.type !== '') {
        params.append('type', currentFilters.type.toString());
      }
      if (currentFilters.carrier && currentFilters.carrier !== '') {
        params.append('carrier', currentFilters.carrier.toString());
      }
      if (currentFilters.country_name && currentFilters.country_name !== '') {
        params.append('country_name', currentFilters.country_name.toString());
      }

      const fullUrl = `${baseUrl}api/phone-generator/list-numbers/?${params}`;
      console.log('🔍 FILTER DEBUG - Fetching with URL:', fullUrl);
      console.log('🔍 FILTER DEBUG - Current filters object:', currentFilters);
      console.log('🔍 FILTER DEBUG - Params string:', params.toString());

      const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch numbers');
      }

      const result = await response.json();
      console.log('🔍 FILTER DEBUG - API Response:', result);
      
      setData(result.data.numbers);
      setPagination((prev) => ({
        ...prev,
        total: result.data.pagination.count,
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filterValues]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<PhoneNumber>[] = [
    {
      key: 'select',
      label: '',
      width: '50px',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleSelectRow(row.id)}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
    },
    {
      key: 'phone_number',
      label: 'Phone Number',
      sortable: true,
      width: '180px',
    },
    {
      key: 'valid_number',
      label: 'Status',
      sortable: true,
      width: '120px',
      render: (value) => {
        if (value === null) {
          return (
            <span className="inline-flex rounded-full bg-gray-400 px-3 py-1 text-xs font-medium text-white">
              Pending
            </span>
          );
        }
        return value ? (
          <span className="inline-flex rounded-full bg-meta-3 px-3 py-1 text-xs font-medium text-white">
            Valid
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-meta-1 px-3 py-1 text-xs font-medium text-white">
            Invalid
          </span>
        );
      },
    },
    {
      key: 'carrier',
      label: 'Carrier',
      sortable: true,
      width: '150px',
      render: (value) => value || '-',
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      width: '150px',
      render: (value) => value || '-',
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      width: '120px',
      render: (value) => value || '-',
    },
    {
      key: 'country_name',
      label: 'Country',
      sortable: true,
      width: '120px',
      render: (value) => value || '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '200px',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleValidateSingle(row.id)}
            className="rounded bg-primary px-3 py-1 text-xs text-white hover:bg-opacity-90"
            title="Validate"
          >
            Validate
          </button>
          <button
            onClick={() => handleDeleteSingle(row.id)}
            className="rounded bg-meta-1 px-3 py-1 text-xs text-white hover:bg-opacity-90"
            title="Delete"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const filters: Filter[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search phone numbers...',
    },
    {
      key: 'valid_number',
      label: 'Validation Status',
      type: 'select',
      options: [
        { label: 'All', value: '' },
        { label: 'Valid', value: 'true' },
        { label: 'Invalid', value: 'false' },
        { label: 'Pending', value: 'null' },
      ],
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'All', value: '' },
        { label: 'Mobile', value: 'Mobile' },
        { label: 'Landline', value: 'Landline' },
      ],
    },
    {
      key: 'carrier',
      label: 'Carrier',
      type: 'select',
      options: [
        { label: 'All', value: '' },
        { label: 'AT&T', value: 'AT&T' },
        { label: 'Verizon', value: 'Verizon' },
        { label: 'T-Mobile', value: 'T-Mobile' },
        { label: 'Sprint', value: 'Sprint' },
        { label: 'Other', value: 'Other' },
      ],
    },
    {
      key: 'country_name',
      label: 'Country',
      type: 'text',
      placeholder: 'Filter by country...',
    },
  ];

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((row) => row.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('No numbers selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected numbers?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/delete-numbers/?user_id=${userID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({ selectedNumbers: selectedIds }),
        }
      );

      if (response.ok) {
        toast.success('Numbers deleted successfully');
        setSelectedIds([]);
        fetchData();
      } else {
        toast.error('Failed to delete numbers');
      }
    } catch (error) {
      console.error('Error deleting numbers:', error);
      toast.error('Failed to delete numbers');
    }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!window.confirm('Delete this number?')) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/delete-numbers/?user_id=${userID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({ selectedNumbers: [id] }),
        }
      );

      if (response.ok) {
        toast.success('Number deleted successfully');
        fetchData();
      } else {
        toast.error('Failed to delete number');
      }
    } catch (error) {
      console.error('Error deleting number:', error);
      toast.error('Failed to delete number');
    }
  };

  const handleValidateSingle = async (id: number) => {
    toast.info('Validation started');
    // Implementation for single validation
  };

  const handleBulkValidate = async () => {
    if (!window.confirm('Start bulk validation for all pending numbers?')) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/start-validation-free/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({
            user_id: userID,
            project_id: projectID,
          }),
        }
      );

      if (response.ok) {
        toast.success('Bulk validation started');
      } else {
        toast.error('Failed to start validation');
      }
    } catch (error) {
      console.error('Error starting validation:', error);
      toast.error('Failed to start validation');
    }
  };

  const handleClearInvalid = async () => {
    if (!window.confirm('Clear all invalid numbers? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/clear-numbers/?user_id=${userID}&project_id=${projectID}`,
        {
          headers: {
            Authorization: `Token ${userToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Invalid numbers cleared');
        fetchData();
      } else {
        toast.error('Failed to clear numbers');
      }
    } catch (error) {
      console.error('Error clearing numbers:', error);
      toast.error('Failed to clear numbers');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete ALL ${pagination.total} numbers in this project? This action cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/delete-all/?user_id=${userID}&project_id=${projectID}`,
        {
          headers: {
            Authorization: `Token ${userToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success('All numbers deleted successfully');
        setSelectedIds([]);
        fetchData();
      } else {
        toast.error('Failed to delete all numbers');
      }
    } catch (error) {
      console.error('Error deleting all numbers:', error);
      toast.error('Failed to delete all numbers');
    }
  };

  const handleExport = async (format: 'csv' | 'json', filteredData: PhoneNumber[]) => {
    try {
      // Build filters object based on current filter state
      const filters: any = {};
      
      if (filterValues.search) {
        filters.search = filterValues.search.toString();
      }
      if (filterValues.valid_number && filterValues.valid_number !== '') {
        filters.valid_number = filterValues.valid_number.toString();
      }
      if (filterValues.type && filterValues.type !== '') {
        filters.type = filterValues.type.toString();
      }
      if (filterValues.carrier && filterValues.carrier !== '') {
        filters.carrier = filterValues.carrier.toString();
      }
      if (filterValues.country_name && filterValues.country_name !== '') {
        filters.country_name = filterValues.country_name.toString();
      }

      console.log('🔍 EXPORT DEBUG - Exporting with filters:', filters);
      console.log('🔍 EXPORT DEBUG - Current filter values:', filterValues);

      // Use the proper export endpoint
      const exportPayload = {
        user_id: userID,
        project_id: projectID,
        format: format,
        filters: filters,
        fields: ['phone_number', 'carrier', 'type', 'area_code', 'valid_number', 'created_at', 'location', 'country_name'],
        use_background: false, // For immediate export
        include_invalid: true, // Include all numbers based on filters
        include_metadata: true
      };

      const response = await fetch(
        `${baseUrl}api/phone-generator/export/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify(exportPayload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const result = await response.json();
      
      if (result.data.content) {
        // Create and download the file
        const blob = new Blob([result.data.content], { 
          type: format === 'csv' ? 'text/csv' : 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename || `phone-numbers-filtered.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${result.data.total_records} filtered numbers as ${format.toUpperCase()}`);
      } else {
        throw new Error('No content received from export');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export filtered data');
    }
  };

  return (
    <div className="mx-auto max-w-full">
      <Breadcrumb pageName="All Phone Numbers (NEW VERSION WITH FILTERS)" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/generate-numbers')}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
          >
            Generate Numbers
          </button>
          <button
            onClick={handleBulkValidate}
            className="flex items-center gap-2 rounded bg-meta-3 px-4 py-2 text-white hover:bg-opacity-90"
          >
            <FiCheckCircle size={16} />
            Bulk Validate
          </button>
          <button
            onClick={() => {
              console.log('🔍 FILTER DEBUG - Manual refresh clicked, current filters:', filterValues);
              fetchData();
            }}
            className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-opacity-90"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              const testFilters = { valid_number: 'true', carrier: 'AT&T' };
              console.log('🔍 FILTER DEBUG - Testing filters:', testFilters);
              setFilterValues(testFilters);
              fetchData(testFilters, 1);
            }}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-opacity-90"
          >
            Test Filters
          </button>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 rounded bg-meta-1 px-4 py-2 text-white hover:bg-opacity-90"
              >
                <FiTrash2 size={16} />
                Delete Selected
              </button>
            </>
          )}
          <button
            onClick={handleClearInvalid}
            className="rounded border border-stroke px-4 py-2 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
          >
            Clear Invalid
          </button>
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 rounded bg-meta-1 px-4 py-2 text-white hover:bg-opacity-90"
            disabled={pagination.total === 0}
          >
            <FiTrash2 size={16} />
            Delete All
          </button>
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        filters={filters}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => {
          console.log('🔍 FILTER DEBUG - Page changed to:', page);
          setPagination((prev) => ({ ...prev, page }));
          fetchData(filterValues, page);
        }}
        onPageSizeChange={(pageSize) => {
          console.log('🔍 FILTER DEBUG - Page size changed to:', pageSize);
          setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
          fetchData(filterValues, 1);
        }}
        onFilter={(newFilters) => {
          console.log('🔍 FILTER DEBUG - Filter changed:', newFilters);
          console.log('🔍 FILTER DEBUG - Current filterValues before update:', filterValues);
          setFilterValues(newFilters);
          // Reset to page 1 when filters change
          setPagination((prev) => ({ ...prev, page: 1 }));
          // Fetch data with new filters immediately
          fetchData(newFilters, 1);
        }}
        onExport={handleExport}
        enableExport={true}
        emptyMessage="No phone numbers found. Generate some numbers to get started."
      />
    </div>
  );
};

export default AllNumbersPage;
