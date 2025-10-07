import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import DataTable from '../../components/DataTable/DataTable';
import { baseUrl, userID, userToken } from '../../constants';
import { Column, FilterConfig, ExportFormat } from '../../types/dataTable';
import {
  FiPlay,
  FiPause,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { exportToCSV, exportToJSON, exportToTXT } from '../../components/DataTable/exportUtils';

interface CampaignDetails {
  id: number;
  name: string;
  description: string;
  message_template: string;
  status: string;
  progress: number;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  target_carrier: string | null;
  target_type: string | null;
  batch_size: number;
  rate_limit: number;
  created_at: string;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface Message {
  id: number;
  phone_number: string;
  message_content: string;
  carrier: string;
  delivery_status: string;
  send_attempts: number;
  error_message: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
  });
  const [filters, setFilters] = useState<Record<string, any>>({});

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${id}/?user_id=${userID}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.data?.campaign) {
        setCampaign(data.data.campaign);
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: userID,
        page: String(pagination.page),
        page_size: String(pagination.pageSize),
        ...filters,
      });

      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${id}/messages/?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.data?.messages) {
        setMessages(data.data.messages);
        setPagination((prev) => ({
          ...prev,
          total: data.data.pagination?.count || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignDetails();
    fetchMessages();
  }, [id, pagination.page, pagination.pageSize, filters]);

  // Auto-refresh for active campaigns
  useEffect(() => {
    if (!autoRefresh || !campaign || campaign.status !== 'in_progress') {
      return;
    }

    const interval = setInterval(() => {
      fetchCampaignDetails();
      fetchMessages();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, campaign?.status]);

  const handleStartCampaign = async () => {
    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${id}/start/`,
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
        fetchCampaignDetails();
      } else {
        toast.error(data.message || 'Failed to start campaign');
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('Failed to start campaign');
    }
  };

  const handlePauseCampaign = async () => {
    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${id}/pause/`,
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
        fetchCampaignDetails();
      } else {
        toast.error(data.message || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    }
  };

  const handleCancelCampaign = async () => {
    if (!confirm('Are you sure you want to cancel this campaign?')) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${id}/cancel/`,
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
        fetchCampaignDetails();
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
      pending: 'bg-gray-500',
      queued: 'bg-blue-500',
      sending: 'bg-yellow-500',
      sent: 'bg-green-500',
      delivered: 'bg-green-600',
      failed: 'bg-red-500',
      bounced: 'bg-red-700',
    };

    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium text-white ${
          statusColors[status] || 'bg-gray-500'
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  const columns: Column<Message>[] = [
    {
      key: 'phone_number',
      label: 'Phone Number',
      sortable: true,
    },
    {
      key: 'carrier',
      label: 'Carrier',
      sortable: true,
    },
    {
      key: 'delivery_status',
      label: 'Status',
      sortable: true,
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'send_attempts',
      label: 'Attempts',
      sortable: true,
      render: (value) => (
        <span className={value > 1 ? 'text-orange-500' : ''}>{value}</span>
      ),
    },
    {
      key: 'sent_at',
      label: 'Sent At',
      sortable: true,
      render: (value) =>
        value ? new Date(value).toLocaleString() : '-',
    },
    {
      key: 'error_message',
      label: 'Error',
      render: (value) =>
        value ? (
          <span className="text-xs text-red-500" title={value}>
            {value.substring(0, 50)}...
          </span>
        ) : (
          '-'
        ),
    },
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: 'delivery_status',
      label: 'Status',
      type: 'multiselect',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'queued', label: 'Queued' },
        { value: 'sending', label: 'Sending' },
        { value: 'sent', label: 'Sent' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'failed', label: 'Failed' },
        { value: 'bounced', label: 'Bounced' },
      ],
    },
    {
      key: 'carrier',
      label: 'Carrier',
      type: 'select',
      options: [
        { value: 'verizon', label: 'Verizon' },
        { value: 'att', label: 'AT&T' },
        { value: 'tmobile', label: 'T-Mobile' },
        { value: 'sprint', label: 'Sprint' },
      ],
    },
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search phone numbers...',
    },
  ];

  const handleExport = (format: ExportFormat, data: Message[]) => {
    const exportData = data.map((message) => ({
      'Phone Number': message.phone_number,
      Carrier: message.carrier,
      Status: message.delivery_status,
      'Send Attempts': message.send_attempts,
      'Sent At': message.sent_at
        ? new Date(message.sent_at).toLocaleString()
        : 'N/A',
      'Delivered At': message.delivered_at
        ? new Date(message.delivered_at).toLocaleString()
        : 'N/A',
      Error: message.error_message || 'N/A',
    }));

    const filename = `campaign_${id}_messages_${
      new Date().toISOString().split('T')[0]
    }`;

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

    toast.success(
      `Exported ${data.length} messages as ${format.toUpperCase()}`
    );
  };

  if (loading && !campaign) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-350">
        <Breadcrumb pageName="Campaign Not Found" />
        <div className="rounded-sm border border-stroke bg-white p-10 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="text-gray-500">Campaign not found</p>
          <button
            onClick={() => navigate('/sms-campaigns')}
            className="mt-4 rounded bg-primary px-6 py-2 text-white hover:bg-opacity-90"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  const deliveryRate =
    campaign.total_recipients > 0
      ? ((campaign.messages_delivered / campaign.total_recipients) * 100).toFixed(1)
      : 0;
  const failureRate =
    campaign.total_recipients > 0
      ? ((campaign.messages_failed / campaign.total_recipients) * 100).toFixed(1)
      : 0;

  return (
    <div className="mx-auto max-w-350">
      <div className="mb-6 flex items-center justify-between">
        <Breadcrumb pageName={campaign.name} />
        <div className="flex gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 rounded border px-4 py-2 ${
              autoRefresh
                ? 'border-primary bg-primary text-white'
                : 'border-stroke hover:bg-gray-2 dark:border-strokedark'
            }`}
          >
            <FiRefreshCw className={autoRefresh ? 'animate-spin' : ''} />
            Auto Refresh
          </button>

          {(campaign.status === 'draft' ||
            campaign.status === 'scheduled' ||
            campaign.status === 'paused') && (
            <button
              onClick={handleStartCampaign}
              className="flex items-center gap-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-opacity-90"
            >
              <FiPlay />
              Start
            </button>
          )}

          {campaign.status === 'in_progress' && (
            <button
              onClick={handlePauseCampaign}
              className="flex items-center gap-2 rounded bg-orange-500 px-4 py-2 text-white hover:bg-opacity-90"
            >
              <FiPause />
              Pause
            </button>
          )}

          {(campaign.status === 'draft' ||
            campaign.status === 'scheduled' ||
            campaign.status === 'paused' ||
            campaign.status === 'in_progress') && (
            <button
              onClick={handleCancelCampaign}
              className="flex items-center gap-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-opacity-90"
            >
              <FiX />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-black dark:text-white">
                {campaign.total_recipients}
              </h4>
              <span className="text-sm font-medium">Total Recipients</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meta-2">
              <FiClock className="text-primary" size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-green-500">
                {campaign.messages_delivered}
              </h4>
              <span className="text-sm font-medium">Delivered ({deliveryRate}%)</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <FiCheckCircle className="text-green-500" size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-red-500">
                {campaign.messages_failed}
              </h4>
              <span className="text-sm font-medium">Failed ({failureRate}%)</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <FiXCircle className="text-red-500" size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-black dark:text-white">
                {campaign.progress}%
              </h4>
              <span className="text-sm font-medium">Progress</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meta-2">
              <FiAlertCircle className="text-primary" size={24} />
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${campaign.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="mb-6 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Campaign Details
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="font-medium text-black dark:text-white">
                {campaign.description || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium text-black dark:text-white">
                {campaign.status.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Target Carrier</p>
              <p className="font-medium text-black dark:text-white">
                {campaign.target_carrier || 'All Carriers'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Target Type</p>
              <p className="font-medium text-black dark:text-white">
                {campaign.target_type || 'All Types'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Batch Size</p>
              <p className="font-medium text-black dark:text-white">
                {campaign.batch_size}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rate Limit</p>
              <p className="font-medium text-black dark:text-white">
                {campaign.rate_limit} msgs/min
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium text-black dark:text-white">
                {new Date(campaign.created_at).toLocaleString()}
              </p>
            </div>
            {campaign.scheduled_time && (
              <div>
                <p className="text-sm text-gray-500">Scheduled Time</p>
                <p className="font-medium text-black dark:text-white">
                  {new Date(campaign.scheduled_time).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">Message Template</p>
            <div className="mt-2 rounded bg-gray-2 p-4 dark:bg-meta-4">
              <p className="whitespace-pre-wrap text-sm text-black dark:text-white">
                {campaign.message_template}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Table */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Campaign Messages
          </h3>
        </div>
        <DataTable
          data={messages}
          columns={columns}
          filters={filterConfigs}
          loading={messagesLoading}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) =>
            setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
          }
          onFilter={setFilters}
          onExport={handleExport}
          enableExport={true}
          emptyMessage="No messages found for this campaign"
        />
      </div>
    </div>
  );
};

export default CampaignDetail;
