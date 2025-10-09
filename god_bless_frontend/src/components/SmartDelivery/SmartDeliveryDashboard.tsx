import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTarget, FiClock, FiActivity, FiSettings, FiInfo } from 'react-icons/fi';
import { baseUrl, userToken } from '../../constants';
import toast from 'react-hot-toast';

interface SmartDeliveryAnalytics {
  total_messages: number;
  carrier_breakdown: Record<string, {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    success_rate: number;
    avg_response_time: number;
  }>;
  timezone_breakdown: Record<string, {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    success_rate: number;
  }>;
  performance_insights: string[];
  optimization_enabled: {
    carrier_optimization: boolean;
    adaptive_rate_limiting: boolean;
    timezone_optimization: boolean;
  };
}

interface Recommendation {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: string;
}

interface SmartDeliveryDashboardProps {
  campaignId: string;
}

const SmartDeliveryDashboard: React.FC<SmartDeliveryDashboardProps> = ({ campaignId }) => {
  const [analytics, setAnalytics] = useState<SmartDeliveryAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'carriers' | 'timezones' | 'recommendations'>('overview');

  useEffect(() => {
    if (campaignId) {
      fetchAnalytics();
      fetchRecommendations();
    }
  }, [campaignId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}api/sms-sender/api/smart-delivery/${campaignId}/analytics/`, {
        headers: {
          'Authorization': `Token ${userToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        toast.error('Failed to load smart delivery analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`${baseUrl}api/sms-sender/api/smart-delivery/${campaignId}/recommendations/`, {
        headers: {
          'Authorization': `Token ${userToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      default: return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
        <h3 className="flex items-center gap-2 font-medium text-black dark:text-white">
          <FiActivity className="text-primary" />
          Smart Delivery Intelligence
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-stroke dark:border-strokedark">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview', icon: FiTrendingUp },
            { key: 'carriers', label: 'Carriers', icon: FiTarget },
            { key: 'timezones', label: 'Timezones', icon: FiClock },
            { key: 'recommendations', label: 'Recommendations', icon: FiInfo },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 border-b-2 py-4 text-sm font-medium ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Optimization Status */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className={`rounded-lg border p-4 ${analytics.optimization_enabled.carrier_optimization ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${analytics.optimization_enabled.carrier_optimization ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">Carrier Optimization</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {analytics.optimization_enabled.carrier_optimization ? 'Active' : 'Disabled'}
                </p>
              </div>

              <div className={`rounded-lg border p-4 ${analytics.optimization_enabled.adaptive_rate_limiting ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${analytics.optimization_enabled.adaptive_rate_limiting ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">Adaptive Rate Limiting</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {analytics.optimization_enabled.adaptive_rate_limiting ? 'Active' : 'Disabled'}
                </p>
              </div>

              <div className={`rounded-lg border p-4 ${analytics.optimization_enabled.timezone_optimization ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${analytics.optimization_enabled.timezone_optimization ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">Timezone Optimization</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {analytics.optimization_enabled.timezone_optimization ? 'Active' : 'Disabled'}
                </p>
              </div>
            </div>

            {/* Performance Insights */}
            {analytics.performance_insights.length > 0 && (
              <div>
                <h4 className="mb-3 text-lg font-medium text-black dark:text-white">Performance Insights</h4>
                <div className="space-y-2">
                  {analytics.performance_insights.map((insight, index) => (
                    <div key={index} className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-black dark:text-white">
                  {analytics.total_messages.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black dark:text-white">
                  {Object.keys(analytics.carrier_breakdown).length}
                </div>
                <div className="text-sm text-gray-500">Carriers Detected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black dark:text-white">
                  {Object.keys(analytics.timezone_breakdown).length}
                </div>
                <div className="text-sm text-gray-500">Timezones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {Object.values(analytics.carrier_breakdown).length > 0
                    ? (Object.values(analytics.carrier_breakdown).reduce((sum, carrier) => sum + carrier.success_rate, 0) / Object.values(analytics.carrier_breakdown).length).toFixed(1)
                    : 0}%
                </div>
                <div className="text-sm text-gray-500">Avg Success Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Carriers Tab */}
        {activeTab === 'carriers' && analytics && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-black dark:text-white">Carrier Performance</h4>
            {Object.entries(analytics.carrier_breakdown).map(([carrier, stats]) => (
              <div key={carrier} className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-medium capitalize text-black dark:text-white">{carrier}</h5>
                  <span className={`text-sm font-medium ${stats.success_rate >= 80 ? 'text-green-500' : stats.success_rate >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {stats.success_rate.toFixed(1)}% Success Rate
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-lg font-semibold text-black dark:text-white">{stats.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-500">{stats.sent + stats.delivered}</div>
                    <div className="text-xs text-gray-500">Successful</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-red-500">{stats.failed}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-black dark:text-white">
                      {stats.avg_response_time ? `${stats.avg_response_time.toFixed(2)}s` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Avg Response</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${stats.success_rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timezones Tab */}
        {activeTab === 'timezones' && analytics && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-black dark:text-white">Timezone Performance</h4>
            {Object.entries(analytics.timezone_breakdown).map(([timezone, stats]) => (
              <div key={timezone} className="rounded-lg border border-stroke p-4 dark:border-strokedark">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-medium capitalize text-black dark:text-white">{timezone} Time</h5>
                  <span className={`text-sm font-medium ${stats.success_rate >= 80 ? 'text-green-500' : stats.success_rate >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {stats.success_rate.toFixed(1)}% Success Rate
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-lg font-semibold text-black dark:text-white">{stats.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-500">{stats.sent + stats.delivered}</div>
                    <div className="text-xs text-gray-500">Successful</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-red-500">{stats.failed}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-black dark:text-white">
                      {((stats.sent + stats.delivered) / stats.total * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Delivery Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-black dark:text-white">Optimization Recommendations</h4>
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <div key={index} className={`rounded-lg border p-4 ${getRecommendationColor(rec.type)}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getRecommendationIcon(rec.type)}</span>
                    <div className="flex-1">
                      <h5 className="font-medium">{rec.title}</h5>
                      <p className="mt-1 text-sm">{rec.message}</p>
                      {rec.action && (
                        <p className="mt-2 text-xs font-medium">Action: {rec.action}</p>
                      )}
                    </div>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                <FiInfo className="mx-auto mb-2 h-8 w-8" />
                <p>No recommendations available</p>
                <p className="text-sm">Your campaign is performing well!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartDeliveryDashboard;