import { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import ProjectLayout from '../../layout/ProjectLayout';
import CardDataStats from '../../components/CardDataStats';
import SystemHealthChart from '../../components/Charts/SystemHealthChart';
import TaskActivityChart from '../../components/Charts/TaskActivityChart';
import TaskCategoryChart from '../../components/Charts/TaskCategoryChart';
import ActiveTasksMonitor from '../../components/Dashboard/ActiveTasksMonitor';
import {
  baseUrl,
  getUserToken,
  getUserID,
  getProjectID,
} from '../../constants';
import toast from 'react-hot-toast';

interface DashboardAnalytics {
  platform_metrics: {
    total_projects: number;
    total_phone_numbers: number;
    valid_phone_numbers: number;
    total_smtps: number;
    active_tasks: number;
  };
  task_stats: {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    pending_tasks: number;
    tasks_24h: number;
  };
  task_by_category: Array<{
    category: string;
    count: number;
  }>;
  recent_activity: Array<{
    hour: string;
    count: number;
  }>;
  phone_generation_trend: Array<{
    date: string;
    count: number;
  }>;
  system_health: {
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
  };
  user_activity: {
    total_activities: number;
    activities_24h: number;
    activities_7d: number;
  };
}

interface ActiveTask {
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

const NewModernDashboard = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      // If no projectID is set, fetch user's first project
      let currentProjectID = getProjectID();

      if (!currentProjectID) {
        // Fetch user's projects to get the first one
        const projectsResponse = await fetch(
          `${baseUrl}api/projects/get-all-projects/?user_id=${getUserID()}&page_size=1`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Token ${getUserToken()}`,
            },
          },
        );

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          if (projectsData.data?.projects?.length > 0) {
            currentProjectID = projectsData.data.projects[0].id;
            // Store it for future use
            localStorage.setItem('projectID', currentProjectID || '');
          } else {
            // No projects found, show message
            toast.error(
              'Please create a project first to view dashboard analytics',
            );
            return;
          }
        }
      }

      const response = await fetch(
        `${baseUrl}api/dashboard/analytics/?project_id=${currentProjectID}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${getUserToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load dashboard analytics');
    }
  }, []);

  const fetchActiveTasks = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}api/dashboard/tasks/active/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${getUserToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active tasks');
      }

      const data = await response.json();
      setActiveTasks(data.data);
    } catch (error) {
      console.error('Error fetching active tasks:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAnalytics(), fetchActiveTasks()]);
    setIsLoading(false);
  }, [fetchAnalytics, fetchActiveTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAnalytics(), fetchActiveTasks()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActiveTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData, fetchActiveTasks]);

  if (isLoading || !analytics) {
    return (
      <ProjectLayout projectName="Dashboard">
        <div className="flex items-center justify-center h-screen">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      </ProjectLayout>
    );
  }

  const successRate =
    analytics?.task_stats?.total_tasks > 0
      ? (
          (analytics.task_stats.completed_tasks /
            analytics.task_stats.total_tasks) *
          100
        ).toFixed(1)
      : '0';

  return (
    <ProjectLayout projectName="Platform Dashboard">
      <div className="mx-auto max-w-350 mt-5">
        <Breadcrumb pageName="Platform Dashboard" />

        {/* Header with Refresh Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">
              Dashboard Overview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time platform metrics and system health
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            <svg
              className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
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
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Platform Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5 mb-6">
          <CardDataStats
            title="Total Projects"
            total={analytics.platform_metrics.total_projects.toString()}
          >
            <svg
              className="fill-primary dark:fill-white"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21.1063 18.0469L19.3875 3.23126C19.2157 1.71876 17.9438 0.584381 16.3969 0.584381H5.56878C4.05628 0.584381 2.78441 1.71876 2.57816 3.23126L0.859406 18.0469C0.756281 18.9063 1.03128 19.7313 1.61566 20.3844C2.20003 21.0375 2.99066 21.3813 3.85003 21.3813H18.1157C18.975 21.3813 19.8 21.0031 20.35 20.3844C20.9 19.7656 21.2094 18.9063 21.1063 18.0469ZM19.2157 19.3531C18.9407 19.6625 18.5625 19.8344 18.15 19.8344H3.85003C3.43753 19.8344 3.05941 19.6625 2.78441 19.3531C2.50941 19.0438 2.37191 18.6313 2.44066 18.2188L4.12503 3.43751C4.19378 2.71563 4.81253 2.16563 5.56878 2.16563H16.4313C17.1532 2.16563 17.7719 2.71563 17.875 3.43751L19.5938 18.2531C19.6282 18.6656 19.4907 19.0438 19.2157 19.3531Z" />
            </svg>
          </CardDataStats>

          <CardDataStats
            title="Phone Numbers"
            total={analytics.platform_metrics.total_phone_numbers.toString()}
          >
            <svg
              className="fill-primary dark:fill-white"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16.5 2H5.5C4.4 2 3.5 2.9 3.5 4V20C3.5 21.1 4.4 22 5.5 22H16.5C17.6 22 18.5 21.1 18.5 20V4C18.5 2.9 17.6 2 16.5 2ZM11 20C10.2 20 9.5 19.3 9.5 18.5C9.5 17.7 10.2 17 11 17C11.8 17 12.5 17.7 12.5 18.5C12.5 19.3 11.8 20 11 20ZM16.5 16H5.5V4H16.5V16Z" />
            </svg>
          </CardDataStats>

          <CardDataStats
            title="Valid Numbers"
            total={analytics.platform_metrics.valid_phone_numbers.toString()}
          >
            <svg
              className="fill-primary dark:fill-white"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </CardDataStats>

          <CardDataStats
            title="Active Tasks"
            total={analytics.platform_metrics.active_tasks.toString()}
          >
            <svg
              className="fill-primary dark:fill-white"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M11 2C6.03 2 2 6.03 2 11C2 15.97 6.03 20 11 20C15.97 20 20 15.97 20 11C20 6.03 15.97 2 11 2ZM11 18C7.13 18 4 14.87 4 11C4 7.13 7.13 4 11 4C14.87 4 18 7.13 18 11C18 14.87 14.87 18 11 18ZM11.5 7H10V12L14.25 14.52L15 13.34L11.5 11.25V7Z" />
            </svg>
          </CardDataStats>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5 mb-6">
          <CardDataStats
            title="Total Tasks"
            total={analytics.task_stats.total_tasks.toString()}
          >
            <svg
              className="fill-primary dark:fill-white"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
          </CardDataStats>

          <CardDataStats
            title="Completed"
            total={analytics.task_stats.completed_tasks.toString()}
          >
            <svg
              className="fill-green-500 dark:fill-green-400"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </CardDataStats>

          <CardDataStats
            title="Failed"
            total={analytics.task_stats.failed_tasks.toString()}
          >
            <svg
              className="fill-red-500 dark:fill-red-400"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </CardDataStats>

          <CardDataStats title="Success Rate" total={`${successRate}%`}>
            <svg
              className="fill-primary dark:fill-white"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
            </svg>
          </CardDataStats>
        </div>

        {/* Charts and Monitoring */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5 mb-6">
          {/* System Health */}
          <div className="col-span-12 xl:col-span-4">
            <SystemHealthChart data={analytics.system_health} />
          </div>

          {/* Active Tasks Monitor */}
          <div className="col-span-12 xl:col-span-8">
            <ActiveTasksMonitor
              tasks={activeTasks}
              onRefresh={fetchActiveTasks}
            />
          </div>
        </div>

        {/* Activity Charts */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5 mb-6">
          <div className="col-span-12 xl:col-span-8">
            <TaskActivityChart
              data={analytics.recent_activity}
              title="Task Activity (Last 24 Hours)"
              type="hourly"
            />
          </div>

          <div className="col-span-12 xl:col-span-4">
            <TaskCategoryChart data={analytics.task_by_category} />
          </div>
        </div>

        {/* Phone Generation Trend */}
        {analytics.phone_generation_trend.length > 0 && (
          <div className="mb-6">
            <TaskActivityChart
              data={analytics.phone_generation_trend}
              title="Phone Number Generation (Last 7 Days)"
              type="daily"
            />
          </div>
        )}
      </div>
    </ProjectLayout>
  );
};

export default NewModernDashboard;
