import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import ProjectLayout from '../../layout/ProjectLayout';
import { baseUrl, userToken, userID } from '../../constants';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to_details: any;
  created_by_details: any;
}

const ProjectTasks = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
  });

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/projects/project/${projectId}/tasks/`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      setTasks(data.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}api/projects/add-task/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to add task');

      await fetchTasks();
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
      });
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}api/projects/update-task/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
        body: JSON.stringify({
          task_id: editingTask.id,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      await fetchTasks();
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
      });
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${baseUrl}api/projects/delete-task/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!response.ok) throw new Error('Failed to delete task');

      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || '',
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <ProjectLayout>
      <div className="mx-auto max-w-350 mt-5">
        <Breadcrumb pageName="Project Tasks" />

      <div className="flex justify-end items-center mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
          >
            + Add Task
          </button>
      </div>

      {/* Tasks List */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">All Tasks</h3>
          </div>
          <div className="p-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="mb-4 p-4 border border-stroke dark:border-strokedark rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-black dark:text-white mb-1">
                      {task.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {task.description}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(task)}
                      className="text-primary hover:text-primary-dark"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No tasks yet. Add your first task to get started!
              </p>
            )}
          </div>
      </div>

      {/* Add/Edit Task Modal */}
      {(showAddModal || editingTask) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-medium text-black dark:text-white mb-4">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h3>
              <form onSubmit={editingTask ? handleUpdateTask : handleAddTask}>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded border border-stroke bg-gray py-3 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full rounded border border-stroke bg-gray py-3 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    rows={3}
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full rounded border border-stroke bg-gray py-3 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded border border-stroke bg-gray py-3 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="w-full rounded border border-stroke bg-gray py-3 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingTask(null);
                      setFormData({
                        title: '',
                        description: '',
                        priority: 'medium',
                        status: 'pending',
                        due_date: '',
                      });
                    }}
                    className="rounded border border-stroke py-2 px-6 text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded bg-primary py-2 px-6 text-white hover:bg-opacity-90"
                  >
                    {isLoading ? 'Saving...' : editingTask ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      )}
      </div>
    </ProjectLayout>
  );
};

export default ProjectTasks;
