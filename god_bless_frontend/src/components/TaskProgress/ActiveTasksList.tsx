import React from 'react';
import { FiLoader, FiCheckCircle, FiAlertCircle, FiX, FiRefreshCw } from 'react-icons/fi';
import { TaskProgressData } from '../../hooks/useTaskWebSocket';

interface ActiveTasksListProps {
  tasks: TaskProgressData[];
  onTaskClick?: (task: TaskProgressData) => void;
  onCancelTask?: (taskId: string) => void;
  onRefresh?: () => void;
}

const ActiveTasksList: React.FC<ActiveTasksListProps> = ({
  tasks,
  onTaskClick,
  onCancelTask,
  onRefresh
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'completed':
        return <FiCheckCircle className="text-meta-3" size={20} />;
      case 'FAILURE':
      case 'failed':
        return <FiAlertCircle className="text-meta-1" size={20} />;
      case 'REVOKED':
      case 'cancelled':
        return <FiX className="text-meta-7" size={20} />;
      default:
        return <FiLoader className="animate-spin text-primary" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'completed':
        return 'bg-meta-3';
      case 'FAILURE':
      case 'failed':
        return 'bg-meta-1';
      case 'REVOKED':
      case 'cancelled':
        return 'bg-meta-7';
      default:
        return 'bg-primary';
    }
  };

  const isActive = (status: string) => {
    return !['SUCCESS', 'FAILURE', 'REVOKED', 'completed', 'failed', 'cancelled'].includes(status);
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-sm border border-stroke bg-white p-6 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
        <p className="text-gray-500 dark:text-gray-400">No active tasks</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-black dark:text-white">
            Active Tasks ({tasks.length})
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-opacity-90"
            >
              <FiRefreshCw size={14} />
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className="cursor-pointer rounded-lg border border-stroke bg-gray-2 p-4 transition-all hover:shadow-md dark:border-strokedark dark:bg-meta-4"
              onClick={() => onTaskClick?.(task)}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(task.status)}
                  <div>
                    <p className="font-medium text-black dark:text-white">
                      {task.current_step || 'Processing...'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Task ID: {task.task_id.substring(0, 8)}...
                    </p>
                  </div>
                </div>
                {isActive(task.status) && onCancelTask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelTask(task.task_id);
                    }}
                    className="flex items-center gap-1 rounded bg-meta-1 px-2 py-1 text-xs text-white hover:bg-opacity-90"
                  >
                    <FiX size={12} />
                    Cancel
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {task.progress}%
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {task.processed_items?.toLocaleString() || 0} /{' '}
                    {task.total_items?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-boxdark">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(task.status)}`}
                    style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium text-white ${getStatusColor(task.status)}`}
                >
                  {task.status}
                </span>
                {task.estimated_completion && isActive(task.status) && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ETA: {new Date(task.estimated_completion).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveTasksList;
