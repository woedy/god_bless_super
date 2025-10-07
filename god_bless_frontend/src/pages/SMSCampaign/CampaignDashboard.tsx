import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, userID, userToken } from '../../constants';
import {
  FiSend,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTrendingUp,
  FiActivity,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface DashboardStats {
  total_campaigns: number;
  active_campaigns: number;
  total_messages_sent: number;
  total_messages_delivered: number;
  total_messages_failed: number;
  overall_delivery_rate: number;
  campaigns_by_status: Record<string, number>;
  recent_campaigns: Array<{
    id: number;
    name: string;
    status: string;
    progress: number;
    messages_sent: number;
    total_recipients: number;
    created_at: string;
  }>;
  delivery_trends: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

const CampaignDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/dashboard/?user_id=${userID}&time_range=${timeRange}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.data?.stats) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'text-gray-500',
      scheduled: 'text-blue-500',
      in_progress: 'text-yellow-500',
      completed: 'text-green-500',
      paused: 'text-orange-500',
      cancelled: 'text-red-500',
      failed: 'text-red-700',
    };
    return colors[status] || 'text-gray-500';
  };

  return (
    <div className="mx-auto max-w-350">
      <div className="mb-6 flex items-center justify-between">
        <Breadcrumb pageName="SMS Campaign Dashboard" />
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded border border-stroke bg-white px-4 py-2 dark:border-strokedark dark:bg-boxdark"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={() => navigate('/sms-campaigns/new')}
            className="rounded bg-primary px-6 py-2 text-white hover:bg-opacity-90"
          >
            New Campaign
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-black dark:text-white">
                {stats?.total_campaigns || 0}
              </h4>
              <span className="text-sm font-medium">Total Campaigns</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meta-2">
              <FiActivity className="text-primary" size={24} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-500">
              {stats?.active_campaigns || 0} Active
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-black dark:text-white">
                {stats?.total_messages_sent.toLocaleString() || 0}
              </h4>
              <span className="text-sm font-medium">Messages Sent</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-meta-2">
              <FiSend className="text-primary" size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-green-500">
                {stats?.total_messages_delivered.toLocaleString() || 0}
              </h4>
              <span className="text-sm font-medium">Delivered</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <FiCheckCircle className="text-green-500" size={24} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-green-500">
              {stats?.overall_delivery_rate.toFixed(1) || 0}% Success Rate
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-2xl font-bold text-red-500">
                {stats?.total_messages_failed.toLocaleString() || 0}
              </h4>
              <span className="text-sm font-medium">Failed</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <FiXCircle className="text-red-500" size={24} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-red-500">
              {stats?.total_messages_sent > 0
                ? (
                    ((stats?.total_messages_failed || 0) /
                      stats.total_messages_sent) *
                    100
                  ).toFixed(1)
                : 0}
              % Failure Rate
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Campaigns - 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Recent Campaigns
              </h3>
            </div>
            <div className="p-6">
              {stats?.recent_campaigns && stats.recent_campaigns.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent_campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      onClick={() => navigate(`/sms-campaigns/${campaign.id}`)}
                      className="cursor-pointer rounded-lg border border-stroke p-4 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-black dark:text-white">
                            {campaign.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-medium ${getStatusColor(
                            campaign.status
                          )}`}
                        >
                          {campaign.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="mb-2">
                        <div className="mb-1 flex justify-between text-xs">
                          <span>Progress</span>
                          <span>
                            {campaign.messages_sent} / {campaign.total_recipients}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${campaign.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>No campaigns yet</p>
                  <button
                    onClick={() => navigate('/sms-campaigns/new')}
                    className="mt-4 text-primary hover:underline"
                  >
                    Create your first campaign
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Status Breakdown - 1 column */}
        <div className="space-y-6">
          {/* Status Distribution */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Campaign Status
              </h3>
            </div>
            <div className="p-6">
              {stats?.campaigns_by_status ? (
                <div className="space-y-3">
                  {Object.entries(stats.campaigns_by_status).map(
                    ([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              status === 'completed'
                                ? 'bg-green-500'
                                : status === 'in_progress'
                                ? 'bg-yellow-500'
                                : status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-gray-500'
                            }`}
                          />
                          <span className="text-sm capitalize">
                            {status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500">
                  No data available
                </p>
              )}
            </div>
          </div>

          {/* Delivery Trends */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="flex items-center gap-2 font-medium text-black dark:text-white">
                <FiTrendingUp />
                Delivery Trends
              </h3>
            </div>
            <div className="p-6">
              {stats?.delivery_trends && stats.delivery_trends.length > 0 ? (
                <div className="space-y-3">
                  {stats.delivery_trends.slice(-7).map((trend, index) => (
                    <div key={index}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{new Date(trend.date).toLocaleDateString()}</span>
                        <span className="text-green-500">
                          {trend.sent > 0
                            ? ((trend.delivered / trend.sent) * 100).toFixed(0)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{
                            width: `${
                              trend.sent > 0
                                ? (trend.delivered / trend.sent) * 100
                                : 0
                            }%`,
                          }}
                          title={`Delivered: ${trend.delivered}`}
                        />
                        <div
                          className="h-2 rounded-full bg-red-500"
                          style={{
                            width: `${
                              trend.sent > 0 ? (trend.failed / trend.sent) * 100 : 0
                            }%`,
                          }}
                          title={`Failed: ${trend.failed}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500">
                  No trend data available
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Quick Actions
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate('/sms-campaigns/new')}
                className="w-full rounded bg-primary px-4 py-3 text-left text-white hover:bg-opacity-90"
              >
                Create New Campaign
              </button>
              <button
                onClick={() => navigate('/sms-campaigns')}
                className="w-full rounded border border-stroke px-4 py-3 text-left hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
              >
                View All Campaigns
              </button>
              <button
                onClick={() => navigate('/smtp-manager')}
                className="w-full rounded border border-stroke px-4 py-3 text-left hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
              >
                Manage SMTP Servers
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDashboard;
