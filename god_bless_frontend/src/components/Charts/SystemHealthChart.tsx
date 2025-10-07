import { FC } from 'react';

interface SystemHealthData {
  cpu: {
    usage_percent: number;
    count: number;
    status: string;
  };
  memory: {
    usage_percent: number;
    available_gb: number;
    total_gb: number;
    used_gb: number;
    status: string;
  };
  disk: {
    usage_percent: number;
    free_gb: number;
    total_gb: number;
    used_gb: number;
    status: string;
  };
  overall_status: string;
}

interface SystemHealthChartProps {
  data: SystemHealthData;
}

const SystemHealthChart: FC<SystemHealthChartProps> = ({ data }) => {
  // Handle undefined or null data
  if (!data || !data.overall_status) {
    return (
      <div className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            System Health
          </h4>
          <span className="inline-flex rounded-full px-3 py-1 text-sm font-medium bg-gray-500 text-white">
            LOADING...
          </span>
        </div>
        <div className="text-center py-8 text-gray-500">
          Loading system health data...
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const ProgressBar = ({ value, status }: { value: number; status: string }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div
        className={`h-2.5 rounded-full ${getStatusColor(status)}`}
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );

  return (
    <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          System Health
        </h4>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusTextColor(
            data.overall_status,
          )}`}
        >
          {data.overall_status?.toUpperCase() || 'UNKNOWN'}
        </span>
      </div>

      <div className="space-y-6">
        {/* CPU Usage */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="fill-primary dark:fill-white"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM10 18C5.59 18 2 14.41 2 10C2 5.59 5.59 2 10 2C14.41 2 18 5.59 18 10C18 14.41 14.41 18 10 18Z" />
                <path d="M10 5C7.24 5 5 7.24 5 10C5 12.76 7.24 15 10 15C12.76 15 15 12.76 15 10C15 7.24 12.76 5 10 5ZM10 13C8.35 13 7 11.65 7 10C7 8.35 8.35 7 10 7C11.65 7 13 8.35 13 10C13 11.65 11.65 13 10 13Z" />
              </svg>
              <span className="text-sm font-medium text-black dark:text-white">
                CPU Usage
              </span>
            </div>
            <span className="text-sm font-semibold text-black dark:text-white">
              {data.cpu?.usage_percent ?? 0}%
            </span>
          </div>
          <ProgressBar value={data.cpu?.usage_percent ?? 0} status={data.cpu?.status ?? 'unknown'} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {data.cpu?.count ?? 0} cores available
          </p>
        </div>

        {/* Memory Usage */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="fill-primary dark:fill-white"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18 2H2C0.9 2 0 2.9 0 4V16C0 17.1 0.9 18 2 18H18C19.1 18 20 17.1 20 16V4C20 2.9 19.1 2 18 2ZM18 16H2V4H18V16Z" />
                <path d="M4 6H6V14H4V6ZM8 6H10V14H8V6ZM12 6H14V14H12V6ZM16 6H18V14H16V6Z" />
              </svg>
              <span className="text-sm font-medium text-black dark:text-white">
                Memory Usage
              </span>
            </div>
            <span className="text-sm font-semibold text-black dark:text-white">
              {data.memory?.usage_percent ?? 0}%
            </span>
          </div>
          <ProgressBar
            value={data.memory?.usage_percent ?? 0}
            status={data.memory?.status ?? 'unknown'}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {(data.memory?.used_gb ?? 0).toFixed(2)} GB / {(data.memory?.total_gb ?? 0).toFixed(2)} GB
          </p>
        </div>

        {/* Disk Usage */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="fill-primary dark:fill-white"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM10 18C5.59 18 2 14.41 2 10C2 5.59 5.59 2 10 2C14.41 2 18 5.59 18 10C18 14.41 14.41 18 10 18Z" />
                <circle cx="10" cy="10" r="3" />
              </svg>
              <span className="text-sm font-medium text-black dark:text-white">
                Disk Usage
              </span>
            </div>
            <span className="text-sm font-semibold text-black dark:text-white">
              {data.disk?.usage_percent ?? 0}%
            </span>
          </div>
          <ProgressBar value={data.disk?.usage_percent ?? 0} status={data.disk?.status ?? 'unknown'} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {(data.disk?.free_gb ?? 0).toFixed(2)} GB free of {(data.disk?.total_gb ?? 0).toFixed(2)} GB
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthChart;
