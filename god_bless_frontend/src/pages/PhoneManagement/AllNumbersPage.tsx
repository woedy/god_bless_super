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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: userID,
        project_id: projectID,
        page: pagination.page.toString(),
        search: filterValues.search?.toString() || '',
      });

      const response = await fetch(
        `${baseUrl}api/phone-generator/list-numbers/?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch numbers');
      }

      const result = await response.json();
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
  }, [pagination.page, filterValues]);

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

  const handleExport = (format: 'csv' | 'json', filteredData: PhoneNumber[]) => {
    const exportData = filteredData.map((row) => ({
      'Phone Number': row.phone_number,
      Status: row.valid_number === null ? 'Pending' : row.valid_number ? 'Valid' : 'Invalid',
      Carrier: row.carrier || '',
      Location: row.location || '',
      Type: row.type || '',
      Country: row.country_name || '',
      'Created At': row.created_at,
    }));

    if (format === 'csv') {
      exportToCSV(exportData, 'phone-numbers');
    } else {
      exportToJSON(exportData, 'phone-numbers');
    }

    toast.success(`Exported ${filteredData.length} numbers as ${format.toUpperCase()}`);
  };

  return (
    <div className="mx-auto max-w-full">
      <Breadcrumb pageName="All Phone Numbers" />

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
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onPageSizeChange={(pageSize) =>
          setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
        }
        onFilter={setFilterValues}
        onExport={handleExport}
        enableExport={true}
        emptyMessage="No phone numbers found. Generate some numbers to get started."
      />
    </div>
  );
};

export default AllNumbersPage;
