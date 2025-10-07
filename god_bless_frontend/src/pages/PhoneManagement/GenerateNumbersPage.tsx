import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, projectID, userID, userToken } from '../../constants';
import { FiLoader, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  useTaskWebSocket,
  TaskProgressData,
} from '../../hooks/useTaskWebSocket';
import TaskProgressCard from '../../components/TaskProgress/TaskProgressCard';

interface GenerationTask {
  task_id: string;
  area_code: string;
  quantity: number;
  estimated_time: string;
}

interface TaskProgress {
  task_id: string;
  status: string;
  progress: number;
  current_step: string;
  processed_items: number;
  total_items: number;
  estimated_completion?: string;
}

const GenerateNumbersPage = () => {
  const [areaCode, setAreaCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [batchSize, setBatchSize] = useState('1000');
  const [autoValidate, setAutoValidate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null);
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();

  /**
   * Initialize useTaskWebSocket hook for real-time progress tracking
   *
   * This hook manages WebSocket connections to receive live updates about the phone generation task.
   * It automatically handles connection, reconnection, and cleanup.
   *
   * @param userId - The current user's ID for WebSocket connection
   * @param onProgress - Callback fired when progress updates are received via WebSocket
   * @param onCompleted - Callback fired when the task completes successfully
   * @param onError - Callback fired when the task fails or encounters an error
   *
   * @returns cancelTask - Function to cancel the currently running task
   */
  const { cancelTask } = useTaskWebSocket({
    userId: userID,
    // onProgress: Updates the UI with real-time progress information
    // Receives progress percentage, current step, and item counts
    onProgress: (data: TaskProgressData) => {
      setTaskProgress({
        task_id: data.task_id,
        status: data.status,
        progress: data.progress,
        current_step: data.current_step,
        processed_items: data.processed_items,
        total_items: data.total_items,
        estimated_completion: data.estimated_completion,
      });
    },
    // onCompleted: Handles successful task completion
    // Shows success message and redirects to the numbers list page
    onCompleted: (data) => {
      setTaskProgress({
        task_id: data.task_id,
        status: 'completed',
        progress: 100,
        current_step: 'Completed',
        processed_items: data.result_data?.total_generated || 0,
        total_items: data.result_data?.total_generated || 0,
      });
      toast.success('Phone numbers generated successfully!');
      setTimeout(() => {
        navigate('/all-numbers');
      }, 2000);
    },
    // onError: Handles task failures
    // Shows error message and resets the form state
    onError: (error) => {
      toast.error(`Generation failed: ${error}`);
      setCurrentTask(null);
      setTaskProgress(null);
      setLoading(false);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!areaCode) {
      newErrors.areaCode = 'Area code is required';
    } else if (!/^\d{3}$/.test(areaCode)) {
      newErrors.areaCode = 'Area code must be exactly 3 digits';
    }

    if (!quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (parseInt(quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    } else if (parseInt(quantity) > 1000000) {
      newErrors.quantity = 'Maximum quantity is 1,000,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    const formData = {
      user_id: userID,
      project_id: projectID,
      area_code: areaCode,
      quantity: parseInt(quantity),
      batch_size: parseInt(batchSize),
      auto_validate: autoValidate,
    };

    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/generate-numbers-config/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errorMessages: Record<string, string> = {};
          Object.entries(data.errors).forEach(([key, value]) => {
            errorMessages[key] = Array.isArray(value)
              ? value.join(', ')
              : String(value);
          });
          setErrors(errorMessages);
        }
        toast.error('Failed to start generation');
        setLoading(false);
        return;
      }

      setCurrentTask(data.data);
      toast.success('Generation started!');
    } catch (error) {
      console.error('Error starting generation:', error);
      toast.error('Failed to start generation');
      setLoading(false);
    }
  };

  const handleCancel = (taskId: string) => {
    if (window.confirm('Are you sure you want to cancel this generation?')) {
      cancelTask(taskId);
      toast.success('Generation cancelled');
      setCurrentTask(null);
      setTaskProgress(null);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb pageName="Generate Phone Numbers" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Generation Form */}
        <div className="lg:col-span-2">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-7 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Generate Phone Numbers
              </h3>
            </div>

            <div className="p-7">
              <form onSubmit={handleSubmit}>
                <div className="mb-5.5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Area Code <span className="text-meta-1">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 415"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value)}
                      disabled={loading}
                      className={`w-full rounded border ${
                        errors.areaCode ? 'border-meta-1' : 'border-stroke'
                      } bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary ${
                        loading ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    />
                    {errors.areaCode && (
                      <p className="mt-1 text-sm text-meta-1">
                        {errors.areaCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Quantity <span className="text-meta-1">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 10000"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={loading}
                      className={`w-full rounded border ${
                        errors.quantity ? 'border-meta-1' : 'border-stroke'
                      } bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary ${
                        loading ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    />
                    {errors.quantity && (
                      <p className="mt-1 text-sm text-meta-1">
                        {errors.quantity}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-5.5">
                  <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                    Batch Size
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    disabled={loading}
                    className={`w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary ${
                      loading ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <option value="500">500 (Slower, more stable)</option>
                    <option value="1000">1000 (Balanced)</option>
                    <option value="2000">2000 (Faster)</option>
                    <option value="5000">5000 (Fastest, high load)</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Larger batch sizes are faster but use more resources
                  </p>
                </div>

                <div className="mb-5.5">
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={autoValidate}
                      onChange={(e) => setAutoValidate(e.target.checked)}
                      disabled={loading}
                      className="sr-only"
                    />
                    <div
                      className={`mr-3 flex h-5 w-5 items-center justify-center rounded border ${
                        autoValidate
                          ? 'border-primary bg-primary'
                          : 'border-stroke'
                      } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {autoValidate && (
                        <span className="text-white">
                          <FiCheckCircle size={14} />
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-black dark:text-white">
                      Auto-validate after generation
                    </span>
                  </label>
                  <p className="ml-8 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Automatically validate numbers after generation completes
                  </p>
                </div>

                <div className="flex justify-end gap-4.5">
                  {currentTask ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(currentTask.task_id)}
                      className="flex justify-center rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                    >
                      Cancel Generation
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate('/all-numbers')}
                        disabled={loading}
                        className="flex justify-center rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading && (
                          <FiLoader className="animate-spin" size={18} />
                        )}
                        {loading ? 'Starting...' : 'Generate Numbers'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="lg:col-span-1">
          {taskProgress ? (
            // TaskProgressCard: Reusable component for displaying task progress
            // Shows progress bar, status, estimated completion time, and cancel button
            <TaskProgressCard
              task={taskProgress}
              onCancel={handleCancel}
              showCancel={taskProgress.status === 'in_progress'}
            />
          ) : (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-7 py-4 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Quick Tips
                </h3>
              </div>

              <div className="p-7">
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-primary">•</span>
                    <span>Area codes must be exactly 3 digits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-primary">•</span>
                    <span>Maximum 1,000,000 numbers per generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-primary">•</span>
                    <span>
                      Larger batches are faster but use more resources
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-primary">•</span>
                    <span>
                      Auto-validation will validate numbers after generation
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-primary">•</span>
                    <span>You can track progress in real-time</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateNumbersPage;
