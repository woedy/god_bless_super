import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import DataTable from '../../components/DataTable/DataTable';
import { baseUrl, userID, userToken } from '../../constants';
import { Column, FilterConfig, ExportFormat } from '../../types/dataTable';
import { FiPlay, FiPause, FiX, FiEdit, FiEye, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { exportToCSV, exportToJSON, exportToTXT } from '../../components/DataTable/exportUtils';

interface Campaign {
  id: number;
  name: string;
  description: string;
  status: string;
  progress: number;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  created_at: string;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
}

const CampaignList = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
  });
  const [filters, setFilters] = useState<Record<string, any>>({});

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: userID,
        page: String(pagination.page),
        page_size: String(pagination.pageSize),
        ...filters,
      });

      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.data?.campaigns) {
        setCampaigns(data.data.campaigns);
        setPagination((prev) => ({
          ...prev,
          total: data.data.pagination?.count || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleStartCampaign = async (campaignId: number) => {
    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${campaignId}/start/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({ user_id: userID }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        toast.success('Campaign started successfully');
        fetchCampaigns();
      } else {
        toast.error(data.message || 'Failed to start campaign');
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('Failed to start campaign');
    }
  };

  const handlePauseCampaign = async (campaignId: number) => {
    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${campaignId}/pause/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({ user_id: userID }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        toast.success('Campaign paused successfully');
        fetchCampaigns();
      } else {
        toast.error(data.message || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    }
  };

  const handleCancelCampaign = async (campaignId: number) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${campaignId}/cancel/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({ user_id: userID }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        toast.success('Campaign cancelled successfully');
        fetchCampaigns();
      } else {
        toast.error(data.message || 'Failed to cancel campaign');
      }
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      toast.error('Failed to cancel campaign');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-500',
      scheduled: 'bg-blue-500',
      in_progress: 'bg-yellow-500',
      completed: 'bg-green-500',
      paused: 'bg-orange-500',
      cancelled: 'bg-red-500',
      failed: 'bg-red-700',
    };

    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium text-white ${
          statusColors[status] || 'bg-gray-500'
        }`}
      >
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      label: 'Campaign Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium text-black dark:text-white">{value}</p>
          {row.description && (
            <p className="text-xs text-gray-500">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (value, row) => (
        <div className="w-full">
          <div className="mb-1 flex justify-between text-xs">
            <span>{value}%</span>
            <span>
              {row.messages_sent} / {row.total_recipients}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'messages_delivered',
      label: 'Delivered',
      sortable: true,
      render: (value, row) => (
        <div className="text-center">
          <p className="font-medium text-green-500">{value}</p>
          <p className="text-xs text-gray-500">
            {row.total_recipients > 0
              ? ((value / row.total_recipients) * 100).toFixed(1)
              : 0}
            %
          </p>
        </div>
      ),
    },
    {
      key: 'messages_failed',
      label: 'Failed',
      sortable: true,
      render: (value, row) => (
        <div className="text-center">
          <p className="font-medium text-red-500">{value}</p>
          <p className="text-xs text-gray-500">
            {row.total_recipients > 0
              ? ((value / row.total_recipients) * 100).toFixed(1)
              : 0}
            %
          </p>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/sms-campaigns/${value}`)}
            className="rounded p-2 hover:bg-gray-2 dark:hover:bg-meta-4"
            title="View Details"
          >
            <FiEye size={16} />
          </button>
          
          {row.status === 'draft' && (
            <button
              onClick={() => navigate(`/sms-campaigns/${value}/edit`)}
              className="rounded p-2 hover:bg-gray-2 dark:hover:bg-meta-4"
              title="Edit"
            >
              <FiEdit size={16} />
            </button>
          )}

          {(row.status === 'draft' || row.status === 'scheduled' || row.status === 'paused') && (
            <button
              onClick={() => handleStartCampaign(value)}
              className="rounded p-2 text-green-500 hover:bg-gray-2 dark:hover:bg-meta-4"
              title="Start Campaign"
            >
              <FiPlay size={16} />
            </button>
          )}

          {row.status === 'in_progress' && (
            <button
              onClick={() => handlePauseCampaign(value)}
              className="rounded p-2 text-orange-500 hover:bg-gray-2 dark:hover:bg-meta-4"
              title="Pause Campaign"
            >
              <FiPause size={16} />
            </button>
          )}

          {(row.status === 'draft' || row.status === 'scheduled' || row.status === 'paused' || row.status === 'in_progress') && (
            <button
              onClick={() => handleCancelCampaign(value)}
              className="rounded p-2 text-red-500 hover:bg-gray-2 dark:hover:bg-meta-4"
              title="Cancel Campaign"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'multiselect',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'paused', label: 'Paused' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'failed', label: 'Failed' },
      ],
    },
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search campaigns...',
    },
  ];

  const handleExport = (format: ExportFormat, data: Campaign[]) => {
    const exportData = data.map((campaign) => ({
      Name: campaign.name,
      Description: campaign.description,
      Status: campaign.status,
      'Total Recipients': campaign.total_recipients,
      'Messages Sent': campaign.messages_sent,
      'Messages Delivered': campaign.messages_delivered,
      'Messages Failed': campaign.messages_failed,
      'Progress (%)': campaign.progress,
      'Created At': new Date(campaign.created_at).toLocaleString(),
      'Scheduled Time': campaign.scheduled_time
        ? new Date(campaign.scheduled_time).toLocaleString()
        : 'N/A',
    }));

    const filename = `campaigns_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'csv':
        exportToCSV(exportData, filename);
        break;
      case 'json':
        exportToJSON(exportData, filename);
        break;
      case 'txt':
        exportToTXT(exportData, filename);
        break;
    }

    toast.success(`Exported ${data.length} campaigns as ${format.toUpperCase()}`);
  };

  return (
    <div className="mx-auto max-w-350">
      <div className="mb-6 flex items-center justify-between">
        <Breadcrumb pageName="SMS Campaigns" />
        <button
          onClick={() => navigate('/sms-campaigns/new')}
          className="flex items-center gap-2 rounded bg-primary px-6 py-3 text-white hover:bg-opacity-90"
        >
          <FiPlus />
          New Campaign
        </button>
      </div>

      <DataTable
        data={campaigns}
        columns={columns}
        filters={filterConfigs}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onPageSizeChange={(pageSize) =>
          setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
        }
        onFilter={setFilters}
        onExport={handleExport}
        enableExport={true}
        emptyMessage="No campaigns found. Create your first campaign to get started!"
      />
    </div>
  );
};

export default CampaignList;
