import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../../constants';

interface ProxyStats {
  total_proxies: number;
  active_proxies: number;
  healthy_proxies: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  rotation_enabled: boolean;
  rotation_strategy: string;
}

interface SMTPStats {
  total_smtp_servers: number;
  active_smtp_servers: number;
  healthy_smtp_servers: number;
  total_emails_sent: number;
  successful_emails: number;
  failed_emails: number;
  success_rate: number;
  rotation_enabled: boolean;
  rotation_strategy: string;
}

interface ProxyServer {
  id: number;
  host: string;
  port: number;
  protocol: string;
  is_active: boolean;
  is_healthy: boolean;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  last_used: string | null;
  last_health_check: string | null;
}

interface SMTPServer {
  id: number;
  host: string;
  port: string;
  active: boolean;
  is_healthy: boolean;
  total_emails_sent: number;
  successful_emails: number;
  failed_emails: number;
  last_used: string | null;
  last_health_check: string | null;
}

const RotationMonitoring: React.FC = () => {
  const [proxyStats, setProxyStats] = useState<ProxyStats | null>(null);
  const [smtpStats, setSMTPStats] = useState<SMTPStats | null>(null);
  const [proxies, setProxies] = useState<ProxyServer[]>([]);
  const [smtpServers, setSMTPServers] = useState<SMTPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchProxies();
    fetchSMTPServers();
  }, []);

  const fetchStats = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const [proxyResponse, smtpResponse] = await Promise.all([
        fetch(
          `${baseUrl}api/proxy-server/rotation/stats/?user_id=${user.user_id}`,
          {
            headers: { Authorization: `Token ${token}` },
          }
        ),
        fetch(
          `${baseUrl}api/smtp-manager/rotation/stats/?user_id=${user.user_id}`,
          {
            headers: { Authorization: `Token ${token}` },
          }
        ),
      ]);

      const proxyResult = await proxyResponse.json();
      const smtpResult = await smtpResponse.json();

      if (proxyResult.message === 'Successful') {
        setProxyStats(proxyResult.data);
      }

      if (smtpResult.message === 'Successful') {
        setSMTPStats(smtpResult.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProxies = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/proxy-server/list/?user_id=${user.user_id}`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        setProxies(result.data.proxies || []);
      }
    } catch (error) {
      console.error('Error fetching proxies:', error);
    }
  };

  const fetchSMTPServers = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/smtp-manager/get-smtps/?user_id=${user.user_id}`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        setSMTPServers(result.data.smtps || []);
      }
    } catch (error) {
      console.error('Error fetching SMTP servers:', error);
    }
  };

  const checkAllProxiesHealth = async () => {
    setCheckingHealth(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/proxy-server/health/check-all/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ user_id: user.user_id }),
        }
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        toast.success('Proxy health check completed');
        fetchStats();
        fetchProxies();
      }
    } catch (error) {
      console.error('Error checking proxy health:', error);
      toast.error('Failed to check proxy health');
    } finally {
      setCheckingHealth(false);
    }
  };

  const checkAllSMTPHealth = async () => {
    setCheckingHealth(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/smtp-manager/health/check-all/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ user_id: user.user_id }),
        }
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        toast.success('SMTP health check completed');
        fetchStats();
        fetchSMTPServers();
      }
    } catch (error) {
      console.error('Error checking SMTP health:', error);
      toast.error('Failed to check SMTP health');
    } finally {
      setCheckingHealth(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    subtitle?: string;
    color?: string;
  }> = ({ title, value, subtitle, color = 'primary' }) => (
    <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mt-4 flex items-end justify-between">
        <div>
          <h4 className="text-title-md font-bold text-black dark:text-white">
            {value}
          </h4>
          <span className="text-sm font-medium">{title}</span>
          {subtitle && (
            <p className="text-xs text-meta-3 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Proxy Statistics */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Proxy Rotation Status
          </h3>
          <button
            onClick={checkAllProxiesHealth}
            disabled={checkingHealth}
            className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            {checkingHealth ? 'Checking...' : 'Check All Proxies'}
          </button>
        </div>

        {proxyStats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              title="Total Proxies"
              value={proxyStats.total_proxies}
              subtitle={`${proxyStats.active_proxies} active`}
            />
            <StatCard
              title="Healthy Proxies"
              value={proxyStats.healthy_proxies}
              color="success"
            />
            <StatCard
              title="Total Requests"
              value={proxyStats.total_requests}
              subtitle={`${proxyStats.successful_requests} successful`}
            />
            <StatCard
              title="Success Rate"
              value={`${proxyStats.success_rate}%`}
              color="meta-3"
            />
          </div>
        )}

        {/* Proxy List */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="py-6 px-4 md:px-6 xl:px-7.5">
            <h4 className="text-xl font-semibold text-black dark:text-white">
              Proxy Servers
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Proxy
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Status
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Requests
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Success Rate
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Last Used
                  </th>
                </tr>
              </thead>
              <tbody>
                {proxies.map((proxy) => (
                  <tr key={proxy.id}>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {proxy.protocol}://{proxy.host}:{proxy.port}
                      </p>
                    </td>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <span
                        className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                          proxy.is_healthy
                            ? 'bg-success text-success'
                            : 'bg-danger text-danger'
                        }`}
                      >
                        {proxy.is_healthy ? 'Healthy' : 'Unhealthy'}
                      </span>
                    </td>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {proxy.total_requests}
                      </p>
                    </td>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {proxy.success_rate}%
                      </p>
                    </td>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {proxy.last_used
                          ? new Date(proxy.last_used).toLocaleString()
                          : 'Never'}
                      </p>
                    </td>
                  </tr>
                ))}
                {proxies.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-[#eee] py-5 px-4 text-center dark:border-strokedark"
                    >
                      No proxies configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SMTP Statistics */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            SMTP Rotation Status
          </h3>
          <button
            onClick={checkAllSMTPHealth}
            disabled={checkingHealth}
            className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            {checkingHealth ? 'Checking...' : 'Check All SMTP'}
          </button>
        </div>

        {smtpStats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              title="Total SMTP Servers"
              value={smtpStats.total_smtp_servers}
              subtitle={`${smtpStats.active_smtp_servers} active`}
            />
            <StatCard
              title="Healthy SMTP"
              value={smtpStats.healthy_smtp_servers}
              color="success"
            />
            <StatCard
              title="Total Emails"
              value={smtpStats.total_emails_sent}
              subtitle={`${smtpStats.successful_emails} successful`}
            />
            <StatCard
              title="Success Rate"
              value={`${smtpStats.success_rate}%`}
              color="meta-3"
            />
          </div>
        )}

        {/* SMTP List */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="py-6 px-4 md:px-6 xl:px-7.5">
            <h4 className="text-xl font-semibold text-black dark:text-white">
              SMTP Servers
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Server
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Status
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Emails Sent
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Last Used
                  </th>
                </tr>
              </thead>
              <tbody>
                {smtpServers.map((smtp) => (
                  <tr key={smtp.id}>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {smtp.host}:{smtp.port}
                      </p>
                    </td>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <span
                        className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                          smtp.is_healthy
                            ? 'bg-success text-success'
                            : 'bg-danger text-danger'
                        }`}
                      >
                        {smtp.is_healthy ? 'Healthy' : 'Unhealthy'}
                      </span>
                    </td>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {smtp.total_emails_sent}
                      </p>
                    </td>
                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                      <p className="text-black dark:text-white">
                        {smtp.last_used
                          ? new Date(smtp.last_used).toLocaleString()
                          : 'Never'}
                      </p>
                    </td>
                  </tr>
                ))}
                {smtpServers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="border-b border-[#eee] py-5 px-4 text-center dark:border-strokedark"
                    >
                      No SMTP servers configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotationMonitoring;
