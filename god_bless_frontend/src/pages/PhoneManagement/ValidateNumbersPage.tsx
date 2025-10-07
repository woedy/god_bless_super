import { useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, projectID, userID, userToken } from '../../constants';
import { FiLoader, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  useTaskWebSocket,
  TaskProgressData,
} from '../../hooks/useTaskWebSocket';
import TaskProgressCard from '../../components/TaskProgress/TaskProgressCard';

interface ValidationTask {
  task_id: string;
  message: string;
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

interface ValidationResult {
  phone: string;
  valid: boolean;
  carrier?: string;
  location?: string;
  type?: string;
  country?: {
    name: string;
    prefix: string;
  };
}

const ValidateNumbersPage = () => {
  const [singleNumber, setSingleNumber] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<ValidationResult | null>(
    null,
  );
  const [batchValidationType, setBatchValidationType] = useState<
    'free' | 'abstract' | 'ipquality'
  >('free');
  const [batchLoading, setBatchLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<ValidationTask | null>(null);
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Initialize useTaskWebSocket hook for real-time progress tracking
   *
   * This hook manages WebSocket connections to receive live updates about the validation task.
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
    // Directly sets the task progress data received from WebSocket
    onProgress: (data: TaskProgressData) => {
      setTaskProgress(data);
    },
    // onCompleted: Handles successful task completion
    // Shows success message and clears the task state after a delay
    onCompleted: (data) => {
      setTaskProgress({
        task_id: data.task_id,
        status: 'completed',
        progress: 100,
        current_step: 'Completed',
        processed_items: data.result_data?.total_validated || 0,
        total_items: data.result_data?.total_validated || 0,
      });
      toast.success('Validation completed successfully!');
      setTimeout(() => {
        setCurrentTask(null);
        setTaskProgress(null);
        setBatchLoading(false);
      }, 3000);
    },
    // onError: Handles task failures
    // Shows error message and resets the validation state
    onError: (error) => {
      toast.error(`Validation failed: ${error}`);
      setCurrentTask(null);
      setTaskProgress(null);
      setBatchLoading(false);
    },
  });

  const handleSingleValidation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!singleNumber) {
      setErrors({ singleNumber: 'Phone number is required' });
      return;
    }

    if (!/^\d{11}$/.test(singleNumber)) {
      setErrors({
        singleNumber:
          'Phone number must be exactly 11 digits (e.g., 14155091612)',
      });
      return;
    }

    setSingleLoading(true);
    setErrors({});
    setSingleResult(null);

    const formData = new FormData();
    formData.append('phone', singleNumber);

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/validate-number/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${userToken}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors({
            singleNumber: Object.values(data.errors).flat().join(', '),
          });
        }
        toast.error('Validation failed');
        return;
      }

      setSingleResult(data.data);
      toast.success('Number validated successfully');
    } catch (error) {
      console.error('Error validating number:', error);
      toast.error('Failed to validate number');
    } finally {
      setSingleLoading(false);
    }
  };

  const handleBatchValidation = async () => {
    if (!window.confirm('Start batch validation for all pending numbers?')) {
      return;
    }

    setBatchLoading(true);
    setErrors({});

    let endpoint = '';
    switch (batchValidationType) {
      case 'free':
        endpoint = 'api/phone-validator/start-validation-free/';
        break;
      case 'abstract':
        endpoint = 'api/phone-validator/start-validation/';
        break;
      case 'ipquality':
        endpoint = 'api/phone-validator/start-validation-quality/';
        break;
    }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
        body: JSON.stringify({
          user_id: userID,
          project_id: projectID,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          toast.error(Object.values(data.errors).flat().join(', '));
        } else {
          toast.error('Failed to start validation');
        }
        setBatchLoading(false);
        return;
      }

      if (data.data?.task_id) {
        setCurrentTask({
          task_id: data.data.task_id,
          message: data.data.message || 'Validation started',
        });
        toast.success('Batch validation started!');
      } else {
        toast.success(data.message || 'Validation started');
        setBatchLoading(false);
      }
    } catch (error) {
      console.error('Error starting batch validation:', error);
      toast.error('Failed to start validation');
      setBatchLoading(false);
    }
  };

  const handleCancelValidation = () => {
    if (
      currentTask &&
      window.confirm('Are you sure you want to cancel this validation?')
    ) {
      cancelTask(currentTask.task_id);
      toast.success('Validation cancelled');
      setCurrentTask(null);
      setTaskProgress(null);
      setBatchLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb pageName="Validate Phone Numbers" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Single Number Validation */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-7 py-4 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Single Number Validation
            </h3>
          </div>

          <div className="p-7">
            <form onSubmit={handleSingleValidation}>
              <div className="mb-5.5">
                <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                  Phone Number <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 14155091612"
                  value={singleNumber}
                  onChange={(e) => setSingleNumber(e.target.value)}
                  disabled={singleLoading}
                  className={`w-full rounded border ${
                    errors.singleNumber ? 'border-meta-1' : 'border-stroke'
                  } bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary ${
                    singleLoading ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                />
                {errors.singleNumber && (
                  <p className="mt-1 text-sm text-meta-1">
                    {errors.singleNumber}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Enter 11-digit phone number with country code (e.g.,
                  14155091612)
                </p>
              </div>

              <div className="flex justify-end gap-4.5">
                <button
                  type="button"
                  onClick={() => {
                    setSingleNumber('');
                    setSingleResult(null);
                    setErrors({});
                  }}
                  disabled={singleLoading}
                  className="flex justify-center rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={singleLoading}
                  className="flex items-center justify-center gap-2 rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {singleLoading && (
                    <FiLoader className="animate-spin" size={18} />
                  )}
                  {singleLoading ? 'Validating...' : 'Validate'}
                </button>
              </div>
            </form>

            {/* Single Validation Result */}
            {singleResult && (
              <div className="mt-6 rounded-lg border border-stroke p-4 dark:border-strokedark">
                <h4 className="mb-4 font-medium text-black dark:text-white">
                  Validation Result
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        singleResult.valid
                          ? 'bg-meta-3 text-white'
                          : 'bg-meta-1 text-white'
                      }`}
                    >
                      {singleResult.valid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Phone:
                    </span>
                    <span className="text-sm font-medium text-black dark:text-white">
                      {singleResult.phone}
                    </span>
                  </div>
                  {singleResult.carrier && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Carrier:
                      </span>
                      <span className="text-sm font-medium text-black dark:text-white">
                        {singleResult.carrier}
                      </span>
                    </div>
                  )}
                  {singleResult.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Location:
                      </span>
                      <span className="text-sm font-medium text-black dark:text-white">
                        {singleResult.location}
                      </span>
                    </div>
                  )}
                  {singleResult.type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Type:
                      </span>
                      <span className="text-sm font-medium text-black dark:text-white">
                        {singleResult.type}
                      </span>
                    </div>
                  )}
                  {singleResult.country && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Country:
                      </span>
                      <span className="text-sm font-medium text-black dark:text-white">
                        {singleResult.country.name} (+
                        {singleResult.country.prefix})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Batch Validation */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-7 py-4 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Batch Validation
            </h3>
          </div>

          <div className="p-7">
            <div className="mb-5.5">
              <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                Validation Provider
              </label>
              <select
                value={batchValidationType}
                onChange={(e) => setBatchValidationType(e.target.value as any)}
                disabled={batchLoading}
                className={`w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary ${
                  batchLoading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <option value="free">Free Validation (Basic)</option>
                <option value="abstract">Abstract API (Advanced)</option>
                <option value="ipquality">IPQuality Score (Premium)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {batchValidationType === 'free' &&
                  'Basic validation using internal library'}
                {batchValidationType === 'abstract' &&
                  'Advanced validation with carrier info'}
                {batchValidationType === 'ipquality' &&
                  'Premium validation with quality scoring'}
              </p>
            </div>

            <div className="mb-5.5 rounded-lg bg-blue-50 p-4 dark:bg-meta-4">
              <div className="flex items-start gap-3">
                <FiInfo className="mt-0.5 text-primary" size={20} />
                <div>
                  <p className="text-sm font-medium text-black dark:text-white">
                    Batch Validation Info
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    This will validate all pending phone numbers in your
                    project. The process runs in the background and you can
                    track progress in real-time.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4.5">
              {currentTask ? (
                <button
                  type="button"
                  onClick={handleCancelValidation}
                  className="flex justify-center rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                >
                  Cancel Validation
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBatchValidation}
                  disabled={batchLoading}
                  className="flex items-center justify-center gap-2 rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {batchLoading && (
                    <FiLoader className="animate-spin" size={18} />
                  )}
                  {batchLoading ? 'Starting...' : 'Start Batch Validation'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Validation Progress */}
      {taskProgress && (
        <div className="mt-8">
          {/* TaskProgressCard: Reusable component for displaying task progress
              Shows progress bar, status, estimated completion time, and cancel button */}
          <TaskProgressCard
            task={taskProgress}
            onCancel={handleCancelValidation}
            showCancel={taskProgress.status === 'in_progress'}
          />
        </div>
      )}
    </div>
  );
};

export default ValidateNumbersPage;
