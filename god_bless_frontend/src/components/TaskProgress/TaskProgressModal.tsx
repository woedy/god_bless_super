import React from 'react';
import { FiX } from 'react-icons/fi';
import { TaskProgressData } from '../../hooks/useTaskWebSocket';
import TaskProgressCard from './TaskProgressCard';

interface TaskProgressModalProps {
  task: TaskProgressData;
  isOpen: boolean;
  onClose: () => void;
  onCancel?: (taskId: string) => void;
}

const TaskProgressModal: React.FC<TaskProgressModalProps> = ({
  task,
  isOpen,
  onClose,
  onCancel
}) => {
  if (!isOpen) return null;

  const isComplete = ['SUCCESS', 'FAILURE', 'REVOKED', 'completed', 'failed', 'cancelled'].includes(task.status);

  return (
    <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="relative w-full max-w-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100 dark:bg-boxdark dark:text-white dark:hover:bg-meta-4"
        >
          <FiX size={20} />
        </button>

        {/* Task Progress Card */}
        <TaskProgressCard
          task={task}
          onCancel={onCancel}
          showCancel={!isComplete}
        />

        {/* Auto-close message for completed tasks */}
        {isComplete && (
          <div className="mt-4 rounded-sm border border-stroke bg-white p-4 text-center dark:border-strokedark dark:bg-boxdark">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This window will close automatically in a few seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskProgressModal;
