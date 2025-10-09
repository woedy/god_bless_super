import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiX, FiLoader, FiRefreshCw, FiFilter } from 'react-icons/fi';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, getUserID } from '../../constants';
import { useTaskWebSocket, TaskProgressData } from '../../hooks/useTaskWebSocket';
import { TaskProgressModal, TaskNotification } from '../../components/TaskProgress';
import toast from 'react-hot-toast';

interface TaskHistoryItem extends TaskProgressData {
  task_name: string;
  category: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
  error_message?: string;
  result_data?: any;
}

const TaskHistoryPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskHistoryItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [completedNotifications, setCompletedNotifications] = useState<any[]>([]);

  const userID = getUserID();

  const { isConnected, activeTasks, cancelTask: wsCancelTask } = useTaskWebSocket({
    userId: userID,
    onProgress: (data) => {
      // Update task in list if it exists
      setTasks(prev => {
        const index = prev.findIndex(t => t.task_id === data.task_id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        }
        return prev;
      });
    },
    onCompleted: (data) => {
      // Show notification
      setCompletedNotifications(prev => [...prev, data]);
      // Refresh task list
      fetchTasks();
    }
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${baseUrl}api/tasks/user/?limit=100`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (categoryFilter !== 'all') {
        url += `&category=${categoryFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        toast.error('Failed to fetch task history');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Error loading task history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userID) {
      fetchTasks();
    }
  }, [userID, statusFilter, categoryFilter]);

  const handleCancelTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}api/tasks/cancel/${taskId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Task cancelled successfully');
        wsCancelTask(taskId);
        fetchTasks();
      } else {
        toast.error('Failed to cancel task');
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast.error('Error cancelling task');
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}api/tasks/retry/${taskId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Task queued for retry');
        fetchTasks();
      } else {
        toast.error('Failed to retry task');
      }
    } catch (error) {
      console.error('Error retrying task:', error);
      toast.error('Error retrying task');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <FiCheckCircle className="text-meta-3" size={20} />;
      case 'FAILURE':
        return <FiAlertCircle className="text-meta-1" size={20} />;
      case 'REVOKED':
        return <FiX className="text-meta-7" size={20} />;
      default:
        return <FiLoader className="animate-spin text-primary" size={20} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      'SUCCESS': { bg: 'bg-meta-3', text: 'Success' },
      'FAILURE': { bg: 'bg-meta-1', text: 'Failed' },
      'REVOKED': { bg: 'bg-meta-7', text: 'Cancelled' },
      'PENDING': { bg: 'bg-warning', text: 'Pending' },
      'STARTED': { bg: 'bg-primary', text: 'Started' },
      'PROGRESS': { bg: 'bg-primary', text: 'In Progress' },
      'RETRY': { bg: 'bg-warning', text: 'Retrying' }
    };

    const statusInfo = statusMap[status] || { bg: 'bg-gray-500', text: status };

    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium text-white ${statusInfo.bg}`}>
        {statusInfo.text}
      </span>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const isActive = (status: string) => {
    return ['PENDING', 'STARTED', 'PROGRESS', 'RETRY'].includes(status);
  };

  return (
    <>
      <Breadcrumb pageName="Task History" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" size={20} />
          <span className="text-sm font-medium text-black dark:text-white">Filters:</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-stroke bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark"
          >
            <option value="all">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failed</option>
            <option value="PENDING">Pending</option>
            <option value="STARTED">Started</option>
            <option value="PROGRESS">In Progress</option>
            <option value="REVOKED">Cancelled</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-stroke bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark"
          >
            <option value="all">All Categories</option>
            <option value="phone_generation">Phone Generation</option>
            <option value="phone_validation">Phone Validation</option>
            <option value="sms_sending">SMS Sending</option>
            <option value="data_export">Data Export</option>
            <option value="general">General</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* WebSocket Connection Status */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-meta-3' : 'bg-meta-1'}`}></div>
        <span className="text-gray-500 dark:text-gray-400">
          {isConnected ? 'Real-time updates active' : 'Real-time updates disconnected'}
        </span>
      </div>

      {/* Active Tasks Summary */}
      {activeTasks.length > 0 && (
        <div className="mb-6 rounded-sm border border-primary bg-primary bg-opacity-10 p-4 dark:border-primary">
          <p className="text-sm font-medium text-black dark:text-white">
            {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''} running
          </p>
        </div>
      )}

      {/* Task List */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Task History ({tasks.length})
          </h3>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="animate-spin text-primary" size={32} />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Task</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Category</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Progress</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Duration</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Created</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr
                      key={task.task_id}
                      className="border-b border-stroke dark:border-strokedark hover:bg-gray-2 dark:hover:bg-meta-4 cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          {getStatusBadge(task.status)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-black dark:text-white">
                          {task.task_name || 'Unknown Task'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {task.task_id.substring(0, 12)}...
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {task.category?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-32">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span>{task.progress}%</span>
                            <span className="text-gray-500">
                              {task.processed_items || 0}/{task.total_items || 0}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-boxdark">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {formatDuration(task.duration)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(task.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {isActive(task.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelTask(task.task_id);
                              }}
                              className="rounded bg-meta-1 px-3 py-1 text-xs text-white hover:bg-opacity-90"
                            >
                              Cancel
                            </button>
                          )}
                          {task.status === 'FAILURE' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryTask(task.task_id);
                              }}
                              className="rounded bg-primary px-3 py-1 text-xs text-white hover:bg-opacity-90"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskProgressModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onCancel={isActive(selectedTask.status) ? handleCancelTask : undefined}
        />
      )}

      {/* Completion Notifications */}
      {completedNotifications.map((notification, index) => (
        <TaskNotification
          key={`${notification.task_id}-${index}`}
          task={notification}
          onClose={() => {
            setCompletedNotifications(prev => prev.filter((_, i) => i !== index));
          }}
        />
      ))}
    </>
  );
};

export default TaskHistoryPage;
