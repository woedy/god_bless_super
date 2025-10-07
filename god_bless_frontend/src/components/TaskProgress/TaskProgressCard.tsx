import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiLoader, FiX, FiClock } from 'react-icons/fi';
import { TaskProgressData } from '../../hooks/useTaskWebSocket';

interface TaskProgressCardProps {
  task: TaskProgressData;
  onCancel?: (taskId: string) => void;
  showCancel?: boolean;
}

const TaskProgressCard: React.FC<TaskProgressCardProps> = ({
  task,
  onCancel,
  showCancel = true
}) => {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'SUCCESS':
      case 'completed':
        return <FiCheckCircle className="text-meta-3" size={24} />;
      case 'FAILURE':
      case 'failed':
        return <FiAlertCircle className="text-meta-1" size={24} />;
      case 'REVOKED':
      case 'cancelled':
        return <FiX className="text-meta-7" size={24} />;
      default:
        return <FiLoader className="animate-spin text-primary" size={24} />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'SUCCESS':
      case 'completed':
        return 'text-meta-3';
      case 'FAILURE':
      case 'failed':
        return 'text-meta-1';
      case 'REVOKED':
      case 'cancelled':
        return 'text-meta-7';
      default:
        return 'text-primary';
    }
  };

  const getStatusText = () => {
    return task.status.charAt(0).toUpperCase() + task.status.slice(1).toLowerCase();
  };

  const isActive = !['SUCCESS', 'FAILURE', 'REVOKED', 'completed', 'failed', 'cancelled'].includes(task.status);

  const formatEstimatedTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      
      if (diff < 0) return 'Completing...';
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      if (minutes > 0) {
        return `~${minutes}m ${seconds}s`;
      }
      return `~${seconds}s`;
    } catch {
      return 'Calculating...';
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-black dark:text-white">
            Task Progress
          </h3>
          {showCancel && isActive && onCancel && (
            <button
              onClick={() => onCancel(task.task_id)}
              className="flex items-center gap-2 rounded bg-meta-1 px-4 py-2 text-white hover:bg-opacity-90"
            >
              <FiX size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-black dark:text-white">
              {task.progress}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {task.processed_items?.toLocaleString() || 0} /{' '}
              {task.total_items?.toLocaleString() || 0}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-meta-4">
            <div
              className="h-2.5 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
            ></div>
          </div>
        </div>

        {/* Task Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Status */}
          <div className="rounded-lg bg-gray-2 p-4 dark:bg-meta-4">
            <div className="flex items-start gap-3">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className={`text-lg font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
              </div>
            </div>
          </div>

          {/* Current Step */}
          <div className="rounded-lg bg-gray-2 p-4 dark:bg-meta-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Step</p>
            <p className="mt-1 text-sm font-medium text-black dark:text-white">
              {task.current_step || 'Initializing...'}
            </p>
          </div>

          {/* Estimated Completion */}
          {task.estimated_completion && isActive && (
            <div className="rounded-lg bg-gray-2 p-4 dark:bg-meta-4">
              <div className="flex items-start gap-3">
                <FiClock className="mt-0.5 text-gray-500" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Estimated Time Remaining
                  </p>
                  <p className="mt-1 text-sm font-medium text-black dark:text-white">
                    {formatEstimatedTime(task.estimated_completion)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskProgressCard;
