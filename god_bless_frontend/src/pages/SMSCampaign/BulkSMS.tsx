import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, userID, userToken } from '../../constants';
import { FiUpload, FiX, FiCheckCircle, FiAlertCircle, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

interface RecipientRow {
  phone_number: string;
  name?: string;
  location?: string;
  custom_field_1?: string;
  custom_field_2?: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  valid: RecipientRow[];
  invalid: Array<{ row: number; data: any; errors: string[] }>;
}

const BulkSMS = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

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
          validateRecipients(data);
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
        validateRecipients(data);
      };
      reader.readAsText(file);
    } else if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          validateRecipients(Array.isArray(data) ? data : [data]);
        } catch (error) {
          toast.error('Invalid JSON format');
        }
      };
      reader.readAsText(file);
    } else {
      toast.error('Unsupported file format. Please use CSV, TXT, or JSON');
    }
  };

  const handleManualInput = () => {
    const lines = manualInput.split('\n').filter((line) => line.trim());
    const data = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        phone_number: parts[0],
        name: parts[1],
        location: parts[2],
      };
    });
    validateRecipients(data);
    setShowManualInput(false);
  };

  const validateRecipients = (data: RecipientRow[]) => {
    const valid: RecipientRow[] = [];
    const invalid: Array<{ row: number; data: any; errors: string[] }> = [];

    data.forEach((row, index) => {
      const errors: string[] = [];

      if (!row.phone_number) {
        errors.push('Phone number is required');
      } else if (!/^\+?[1-9]\d{1,14}$/.test(row.phone_number.replace(/[\s-()]/g, ''))) {
        errors.push('Invalid phone number format');
      }

      if (errors.length > 0) {
        invalid.push({ row: index + 1, data: row, errors });
      } else {
        valid.push(row);
      }
    });

    setValidationResult({ valid, invalid });
    setRecipients(valid);

    if (invalid.length > 0) {
      toast.error(`${invalid.length} invalid entries found. Please review.`);
    } else {
      toast.success(`${valid.length} recipients validated successfully`);
    }
  };

  const handleUploadRecipients = async () => {
    if (recipients.length === 0) {
      toast.error('No valid recipients to upload');
      return;
    }

    if (!campaignId) {
      toast.error('Campaign ID is required');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(
        `${baseUrl}api/sms-sender/campaigns/${campaignId}/recipients/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({
            user_id: userID,
            recipients: recipients,
          }),
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      if (response.ok) {
        toast.success(`${recipients.length} recipients added successfully`);
        setTimeout(() => {
          navigate(`/sms-campaigns/${campaignId}`);
        }, 1000);
      } else {
        toast.error(data.message || 'Failed to upload recipients');
      }
    } catch (error) {
      console.error('Error uploading recipients:', error);
      toast.error('Failed to upload recipients');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `phone_number,name,location,custom_field_1,custom_field_2
+12345678901,John Doe,New York,Value1,Value2
+19876543210,Jane Smith,Los Angeles,Value3,Value4`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipients_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-350">
      <Breadcrumb pageName="Bulk SMS Import" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload Section - 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Import Recipients
              </h3>
            </div>
            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                  Upload File
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stroke p-12 hover:border-primary dark:border-strokedark"
                >
                  <FiUpload size={48} className="mb-4 text-gray-400" />
                  <p className="mb-2 text-sm font-medium text-black dark:text-white">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    CSV, TXT, or JSON (MAX. 10MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Manual Input Toggle */}
              <div className="text-center">
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-sm text-primary hover:underline"
                >
                  Or enter recipients manually
                </button>
              </div>

              {/* Manual Input */}
              {showManualInput && (
                <div>
                  <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                    Manual Entry
                  </label>
                  <textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter one recipient per line&#10;Format: phone_number, name, location&#10;Example:&#10;+12345678901, John Doe, New York&#10;+19876543210, Jane Smith, Los Angeles"
                    rows={10}
                    className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                  <button
                    onClick={handleManualInput}
                    className="mt-3 rounded bg-primary px-6 py-2 text-white hover:bg-opacity-90"
                  >
                    Validate
                  </button>
                </div>
              )}

              {/* Validation Results */}
              {validationResult && (
                <div className="space-y-4">
                  {/* Valid Recipients */}
                  {validationResult.valid.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FiCheckCircle className="text-green-500" />
                        <h4 className="font-medium text-green-700 dark:text-green-400">
                          Valid Recipients: {validationResult.valid.length}
                        </h4>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-green-200 dark:border-green-800">
                              <th className="py-2 text-left">Phone Number</th>
                              <th className="py-2 text-left">Name</th>
                              <th className="py-2 text-left">Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validationResult.valid.slice(0, 10).map((recipient, index) => (
                              <tr key={index} className="border-b border-green-100 dark:border-green-900">
                                <td className="py-2">{recipient.phone_number}</td>
                                <td className="py-2">{recipient.name || '-'}</td>
                                <td className="py-2">{recipient.location || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {validationResult.valid.length > 10 && (
                          <p className="mt-2 text-xs text-gray-500">
                            Showing 10 of {validationResult.valid.length} recipients
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Invalid Recipients */}
                  {validationResult.invalid.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FiAlertCircle className="text-red-500" />
                        <h4 className="font-medium text-red-700 dark:text-red-400">
                          Invalid Entries: {validationResult.invalid.length}
                        </h4>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {validationResult.invalid.map((item, index) => (
                          <div
                            key={index}
                            className="mb-2 rounded bg-white p-2 dark:bg-boxdark"
                          >
                            <p className="text-xs font-medium">
                              Row {item.row}: {JSON.stringify(item.data)}
                            </p>
                            <p className="text-xs text-red-500">
                              {item.errors.join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {loading && (
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Uploading recipients...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => navigate(`/sms-campaigns/${campaignId}`)}
                  className="rounded border border-stroke px-6 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadRecipients}
                  disabled={loading || recipients.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  <FiUpload />
                  Upload {recipients.length} Recipients
                </button>
              </div>
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
                Download a template file to see the correct format for importing recipients.
              </p>
              <button
                onClick={downloadTemplate}
                className="flex w-full items-center justify-center gap-2 rounded border border-stroke px-4 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
              >
                <FiDownload />
                Download Template
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Import Instructions
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-black dark:text-white mb-1">
                    CSV Format
                  </h4>
                  <p className="text-gray-500">
                    First row should contain headers. Required column: phone_number
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-black dark:text-white mb-1">
                    TXT Format
                  </h4>
                  <p className="text-gray-500">
                    One phone number per line
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-black dark:text-white mb-1">
                    JSON Format
                  </h4>
                  <p className="text-gray-500">
                    Array of objects with phone_number field
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-black dark:text-white mb-1">
                    Optional Fields
                  </h4>
                  <ul className="list-disc list-inside text-gray-500 space-y-1">
                    <li>name - Recipient name</li>
                    <li>location - Recipient location</li>
                    <li>custom_field_1 - Custom data</li>
                    <li>custom_field_2 - Custom data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Supported Macros */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Personalization
              </h3>
            </div>
            <div className="p-6">
              <p className="mb-3 text-sm text-gray-500">
                Use these macros in your campaign message to personalize for each recipient:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary">@NAME@</span>
                  <span className="text-gray-500">- Recipient name</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary">@LOCATION@</span>
                  <span className="text-gray-500">- Recipient location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary">@CUSTOM1@</span>
                  <span className="text-gray-500">- Custom field 1</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary">@CUSTOM2@</span>
                  <span className="text-gray-500">- Custom field 2</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkSMS;
