import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import ProjectLayout from '../../layout/ProjectLayout';
import { baseUrl, userToken } from '../../constants';

interface ProjectStats {
  task_stats: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    completion_rate: number;
  };
  phone_stats: {
    total: number;
    valid: number;
    invalid: number;
  };
  sms_stats: {
    total: number;
    sent: number;
    pending: number;
    failed: number;
  };
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to_details: any;
}

interface Activity {
  id: number;
  activity_type: string;
  description: string;
  created_at: string;
  user_details: {
    username: string;
  };
}

interface Project {
  id: number;
  project_name: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  due_date: string;
  target_phone_count: number;
  target_sms_count: number;
  task_stats: any;
  phone_stats: any;
  sms_stats: any;
  recent_activities: Activity[];
}

const ProjectDashboard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/projects/project/${projectId}/`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to fetch project');

      const data = await response.json();
      setProject(data.data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(
        `${baseUrl}api/projects/project/${projectId}/tasks/`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      setTasks(data.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
    fetchTasks();
  }, [fetchProjectDetails, fetchTasks]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      planning: 'bg-blue-500',
      active: 'bg-green-500',
      on_hold: 'bg-yellow-500',
      completed: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      low: 'text-blue-500',
      medium: 'text-yellow-500',
      high: 'text-orange-500',
      urgent: 'text-red-500',
    };
    return colors[priority] || 'text-gray-500';
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <ProjectLayout projectName={project.project_name}>
      <div className="mx-auto max-w-350 mt-5">
        <Breadcrumb pageName={`Project: ${project.project_name}`} />

      {/* Project Header */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
                {project.project_name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {project.description}
              </p>
              <div className="flex gap-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium text-white ${getStatusColor(
                    project.status,
                  )}`}
                >
                  {project.status}
                </span>
                <span
                  className={`text-sm font-medium ${getPriorityColor(
                    project.priority,
                  )}`}
                >
                  Priority: {project.priority}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/edit-project/${projectId}`)}
              className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
            >
              Edit Project
            </button>
          </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Task Stats */}
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {project.task_stats?.total || 0}
                </h4>
                <span className="text-sm font-medium">Total Tasks</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Completed: {project.task_stats?.completed || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                In Progress: {project.task_stats?.in_progress || 0}
              </div>
            </div>
          </div>

          {/* Phone Stats */}
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {project.phone_stats?.total || 0}
                </h4>
                <span className="text-sm font-medium">Phone Numbers</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-green-600">
                Valid: {project.phone_stats?.valid || 0}
              </div>
              <div className="text-sm text-red-600">
                Invalid: {project.phone_stats?.invalid || 0}
              </div>
            </div>
          </div>

          {/* SMS Stats */}
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {project.sms_stats?.total || 0}
                </h4>
                <span className="text-sm font-medium">SMS Messages</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-green-600">
                Sent: {project.sms_stats?.sent || 0}
              </div>
              <div className="text-sm text-yellow-600">
                Pending: {project.sms_stats?.pending || 0}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {project.task_stats?.completion_rate?.toFixed(0) || 0}%
                </h4>
                <span className="text-sm font-medium">Completion Rate</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{
                    width: `${project.task_stats?.completion_rate || 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Tasks */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark flex justify-between items-center">
              <h3 className="font-medium text-black dark:text-white">
                Recent Tasks
              </h3>
              <button
                onClick={() => navigate(`/project/${projectId}/tasks`)}
                className="text-sm text-primary hover:underline"
              >
                View All
              </button>
            </div>
            <div className="p-6">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="mb-4 pb-4 border-b border-stroke dark:border-strokedark last:border-0"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-black dark:text-white">
                        {task.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {task.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-center text-gray-500">No tasks yet</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Recent Activity
              </h3>
            </div>
            <div className="p-6">
              {project.recent_activities?.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="mb-4 pb-4 border-b border-stroke dark:border-strokedark last:border-0"
                >
                  <p className="text-sm text-black dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    by {activity.user_details.username} •{' '}
                    {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {(!project.recent_activities ||
                project.recent_activities.length === 0) && (
                <p className="text-center text-gray-500">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
};

export default ProjectDashboard;
