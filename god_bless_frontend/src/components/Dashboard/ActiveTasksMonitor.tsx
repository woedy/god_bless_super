import { FC } from 'react';

interface Task {
  task_id: string;
  task_name: string;
  category: string;
  status: string;
  progress: number;
  current_step: string;
  created_at: string;
  estimated_completion: string | null;
  duration: number;
  is_complete: boolean;
}

interface ActiveTasksMonitorProps {
  tasks: Task[];
  onRefresh?: () => void;
}

const ActiveTasksMonitor: FC<ActiveTasksMonitorProps> = ({
  tasks,
  onRefresh,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-500';
      case 'failure':
        return 'bg-red-500';
      case 'started':
      case 'progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failure':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'started':
      case 'progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Active Tasks
          </h4>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              className="mb-4 h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              No active tasks at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.task_id}
                className="rounded-lg border border-stroke p-4 dark:border-strokedark"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="mb-1 font-semibold text-black dark:text-white">
                      {task.task_name}
                    </h5>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(
                          task.status,
                        )}`}
                      >
                        {task.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {task.progress}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDuration(task.duration)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(
                        task.status,
                      )}`}
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Step */}
                {task.current_step && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {task.current_step}
                  </p>
                )}

                {/* Metadata */}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Started: {formatTime(task.created_at)}</span>
                  {task.estimated_completion && (
                    <span>
                      ETA: {formatTime(task.estimated_completion)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveTasksMonitor;
