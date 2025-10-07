import { useState, useRef, useEffect } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, userID, userToken } from '../../constants';
import { FiUpload, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import {
  useTaskWebSocket,
  TaskProgressData,
} from '../../hooks/useTaskWebSocket';
import TaskProgressCard from '../../components/TaskProgress/TaskProgressCard';

interface RecipientRow {
  phone_number: string;
  name?: string;
}

const BulkSmsSender = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [smtp, setSmtp] = useState('');
  const [provider, setProvider] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(1);

  const [smtps, setSMTPs] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<{ task_id: string } | null>(
    null,
  );
  const [taskProgress, setTaskProgress] = useState<TaskProgressData | null>(
    null,
  );

  // Modern WebSocket hook
  const { isConnected, cancelTask } = useTaskWebSocket({
    userId: userID,
    onProgress: (data) => {
      setTaskProgress(data);
    },
    onCompleted: (data) => {
      toast.success('Bulk SMS sending completed!');
      setTaskProgress(null);
      setCurrentTask(null);
      // Reset form
      setRecipients([]);
      setSenderName('');
      setSubject('');
      setMessage('');
      setSmtp('');
      setProvider('');
    },
    onError: (error) => {
      toast.error(`Error: ${error}`);
      setTaskProgress(null);
      setCurrentTask(null);
    },
  });

  // Fetch SMTPs and providers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${baseUrl}api/sms-sender/get-smtps-providers/?user_id=${userID}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Token ${userToken}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setSMTPs(data.data.smtps);
          setCarriers(data.data.providers);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as RecipientRow[];
          const validRecipients = data.filter((row) => row.phone_number);
          setRecipients(validRecipients);
          toast.success(`${validRecipients.length} recipients loaded`);
        },
        error: (error) => {
          toast.error(`Error parsing CSV: ${error.message}`);
        },
      });
    } else if (fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());
        const data = lines.map((line) => ({
          phone_number: line.trim(),
        }));
        setRecipients(data);
        toast.success(`${data.length} recipients loaded`);
      };
      reader.readAsText(file);
    } else {
      toast.error('Unsupported file format. Please use CSV or TXT');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!senderName || !subject || !message || !smtp || !provider) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Please upload recipients');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', userID);
      formData.append('sender_name', senderName);
      formData.append('subject', subject);
      formData.append('message', message);
      formData.append('smtp_id', smtp);
      formData.append('provider', provider);
      formData.append('delay_seconds', delaySeconds.toString());
      formData.append(
        'v_phone_numbers',
        JSON.stringify(recipients.map((r) => r.phone_number)),
      );

      const response = await fetch(`${baseUrl}api/sms-sender/send-bulk-sms/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${userToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Bulk SMS sending started!');
        setCurrentTask({ task_id: data.data.task_id });
      } else {
        toast.error(data.message || 'Failed to start bulk SMS');
      }
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      toast.error('Failed to send bulk SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = () => {
    if (currentTask) {
      cancelTask(currentTask.task_id);
    }
  };

  const downloadTemplate = () => {
    const template = `phone_number,name
+12345678901,John Doe
+19876543210,Jane Smith`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_sms_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-350">
      <Breadcrumb pageName="Bulk SMS Sender" />

      {/* Show progress card if task is running */}
      {taskProgress && (
        <div className="mb-6">
          <TaskProgressCard
            task={taskProgress}
            onCancel={handleCancelTask}
            showCancel={taskProgress.status === 'in_progress'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Form - 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Send Bulk SMS
              </h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {/* Recipients Upload */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Upload Recipients *
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stroke p-8 hover:border-primary dark:border-strokedark"
                    >
                      <FiUpload size={32} className="mb-2 text-gray-400" />
                      <p className="mb-1 text-sm font-medium text-black dark:text-white">
                        Click to upload CSV or TXT file
                      </p>
                      <p className="text-xs text-gray-500">
                        {recipients.length > 0
                          ? `${recipients.length} recipients loaded`
                          : 'No file selected'}
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Sender Name */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Sender Name *
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      placeholder="Enter sender name"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      placeholder="Enter subject"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Message *
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      placeholder="Enter your message"
                    />
                  </div>

                  {/* SMTP Selection */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Select SMTP *
                    </label>
                    <select
                      value={smtp}
                      onChange={(e) => setSmtp(e.target.value)}
                      className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    >
                      <option value="">Select SMTP</option>
                      {smtps.map((smtpOption) => (
                        <option key={smtpOption.id} value={smtpOption.id}>
                          {smtpOption.host}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Provider Selection */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Provider *
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    >
                      <option value="">Select Provider</option>
                      {carriers.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delay */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Delay Between Messages (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={delaySeconds}
                      onChange={(e) =>
                        setDelaySeconds(parseInt(e.target.value))
                      }
                      className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      className="rounded border border-stroke px-6 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        loading || recipients.length === 0 || !!currentTask
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {loading
                        ? 'Starting...'
                        : `Send to ${recipients.length} Recipients`}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Instructions - 1 column */}
        <div className="space-y-6">
          {/* Template Download */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Template
              </h3>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-500">
                Download a template file to see the correct format.
              </p>
              <button
                onClick={downloadTemplate}
                className="w-full rounded border border-stroke px-4 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
              >
                Download Template
              </button>
            </div>
          </div>

          {/* Macros */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Available Macros
              </h3>
            </div>
            <div className="p-6">
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="font-mono text-primary">@REF@</span> - Random
                  reference
                </li>
                <li>
                  <span className="font-mono text-primary">@TICKET@</span> -
                  Random ticket
                </li>
                <li>
                  <span className="font-mono text-primary">@FIRST@</span> -
                  Random first name
                </li>
                <li>
                  <span className="font-mono text-primary">@LAST@</span> -
                  Random last name
                </li>
                <li>
                  <span className="font-mono text-primary">@TIME@</span> -
                  Current time
                </li>
                <li>
                  <span className="font-mono text-primary">@YEAR@</span> -
                  Current year
                </li>
                <li>
                  <span className="font-mono text-primary">@MONTH@</span> -
                  Current month
                </li>
                <li>
                  <span className="font-mono text-primary">@DAY@</span> -
                  Current day
                </li>
              </ul>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">Tips</h3>
            </div>
            <div className="p-6">
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-500">
                <li>Use link shortener for clickable links</li>
                <li>Avoid flagged words</li>
                <li>Test with small batches first</li>
                <li>Monitor delivery rates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkSmsSender;
