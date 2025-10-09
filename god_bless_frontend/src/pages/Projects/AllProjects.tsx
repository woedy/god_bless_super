import { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, getUserID, getUserToken } from '../../constants';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { FiBarChart } from 'react-icons/fi';
import { Project } from '../../types/project';

const AllProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [inputError, setInputError] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '' });
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${baseUrl}api/projects/get-all-projects/?user_id=${getUserID()}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;
      if (searchQuery) url += `&search=${searchQuery}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${getUserToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setProjects(data.data.projects);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDeleteModal = (itemId: number) => {
    setItemToDelete(itemId);
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId: number) => {
    const data = { user_id: getUserID(), project_id: itemId };

    try {
      const response = await fetch(`${baseUrl}api/projects/delete-project/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${getUserToken()}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to delete the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Item deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Error deleting item:', error);
      setAlert({
        message: 'An error occurred while deleting the item',
        type: 'error',
      });
    } finally {
      setIsModalOpen(false);
      setItemToDelete(null);
    }
  };

  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setItemToDelete(null);
  };

  const handleOpenProject = (event: React.MouseEvent, project_id: number, project_name: string) => {
    event.preventDefault();
    event.stopPropagation();

    localStorage.setItem('projectID', project_id);
    localStorage.setItem('project_name', project_name);
    navigate(`/project/${project_id}`);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      planning: 'bg-blue-500',
      active: 'bg-green-500',
      on_hold: 'bg-yellow-500',
      completed: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: { [key: string]: string } = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };


  const handleOpenAddProject = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    navigate('/add-project', );
    
  };

  return (
    <>
      <div className="mx-auto max-w-350 mt-5">
        <Breadcrumb pageName="All Projects" />

        {/* Navigation to Modern Dashboard */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-black dark:text-white">
            Project Management
          </h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90 transition-all"
          >
            <FiBarChart className="w-5 h-5" />
            Modern Dashboard
          </button>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded border border-stroke bg-gray py-2 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-stroke bg-gray py-2 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded border border-stroke bg-gray py-2 px-4 text-black focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              className="flex justify-center rounded bg-primary p-2 font-medium text-gray hover:bg-opacity-90"
              onClick={(event) => handleOpenAddProject(event)}
            >
              + Add Project
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {projects
            ? projects.map((project) => (
                <div
                  className="rounded-lg bg-white shadow-lg dark:bg-boxdark dark:border-strokedark p-6 hover:scale-105 transition-transform duration-300 ease-in-out cursor-pointer"
                  onClick={(event) =>
                    handleOpenProject(event, project.id, project.project_name)
                  }
                  key={project?.id || 'default-key'}
                >
                  <div className="flex flex-col h-full">
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium text-white ${getStatusColor(
                          project?.status || 'planning'
                        )}`}
                      >
                        {project?.status || 'planning'}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getPriorityBadge(
                          project?.priority || 'medium'
                        )}`}
                      >
                        {project?.priority || 'medium'}
                      </span>
                    </div>

                    {/* Project Name */}
                    <div className="flex-1 mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                        {project?.project_name ? project.project_name : '-'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {project?.description ? project.description : 'No description'}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="border-t border-stroke dark:border-strokedark pt-3 mb-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Tasks</p>
                          <p className="font-semibold text-black dark:text-white">
                            {project?.task_stats?.total || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Phones</p>
                          <p className="font-semibold text-black dark:text-white">
                            {project?.phone_stats?.total || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">SMS</p>
                          <p className="font-semibold text-black dark:text-white">
                            {project?.sms_stats?.total || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {project?.task_stats?.total > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="text-gray-500">
                            {project?.task_stats?.completion_rate?.toFixed(0) || 0}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{
                              width: `${project?.task_stats?.completion_rate || 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {project?.collaborators_count || 0} collaborators
                      </span>
                      <button
                        className="text-sm text-red-500 hover:text-red-700 focus:outline-none"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDeleteModal(project.id);
                        }}
                      >
                        <svg
                          className="fill-current"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z" />
                          <path d="M9.00039 9.11255C8.66289 9.11255 8.35352 9.3938 8.35352 9.75942V13.3313C8.35352 13.6688 8.63477 13.9782 9.00039 13.9782C9.33789 13.9782 9.64727 13.6969 9.64727 13.3313V9.75942C9.64727 9.3938 9.33789 9.11255 9.00039 9.11255Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            : null}
        </div>

        <DeleteConfirmationModal
          isOpen={isModalOpen}
          itemId={itemToDelete}
          onConfirm={handleDelete}
          onCancel={closeDeleteModal}
        />
      </div>
    </>
  );
};

export default AllProjects;
