import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import { TaskCompletedData } from '../../hooks/useTaskWebSocket';

interface TaskNotificationProps {
  task: TaskCompletedData;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const TaskNotification: React.FC<TaskNotificationProps> = ({
  task,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const isSuccess = task.status === 'SUCCESS' || task.status === 'completed';
  const isFailure = task.status === 'FAILURE' || task.status === 'failed';

  const getIcon = () => {
    if (isSuccess) {
      return <FiCheckCircle className="text-meta-3" size={24} />;
    }
    if (isFailure) {
      return <FiAlertCircle className="text-meta-1" size={24} />;
    }
    return <FiCheckCircle className="text-primary" size={24} />;
  };

  const getBorderColor = () => {
    if (isSuccess) return 'border-meta-3';
    if (isFailure) return 'border-meta-1';
    return 'border-primary';
  };

  const getTitle = () => {
    if (isSuccess) return 'Task Completed Successfully';
    if (isFailure) return 'Task Failed';
    return 'Task Completed';
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-99999 w-full max-w-md transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`rounded-lg border-l-4 ${getBorderColor()} bg-white p-4 shadow-lg dark:bg-boxdark`}
      >
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <h4 className="font-medium text-black dark:text-white">
              {getTitle()}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Task ID: {task.task_id.substring(0, 12)}...
            </p>
            {task.error_message && (
              <p className="mt-2 text-sm text-meta-1">
                {task.error_message}
              </p>
            )}
            {task.result_data?.message && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {task.result_data.message}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskNotification;
