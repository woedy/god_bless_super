import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, userID, userToken } from '../../constants';
import { FiSave, FiSend, FiEye, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  category: string;
  message_template: string;
  description: string;
}

interface Macro {
  key: string;
  label: string;
  description: string;
  example: string;
}

const CampaignBuilder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [macros, setMacros] = useState<Macro[]>([]);
  
  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const [customMacros, setCustomMacros] = useState<Record<string, string>>({});
  
  // Targeting options
  const [targetCarrier, setTargetCarrier] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetAreaCodes, setTargetAreaCodes] = useState<string[]>([]);
  const [areaCodeInput, setAreaCodeInput] = useState('');
  
  // Campaign settings
  const [batchSize, setBatchSize] = useState(100);
  const [rateLimit, setRateLimit] = useState(10);
  const [useProxyRotation, setUseProxyRotation] = useState(true);
  const [useSmtpRotation, setUseSmtpRotation] = useState(true);
  
  // Scheduling
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledTime, setScheduledTime] = useState('');
  
  // UI state
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchTemplates();
    fetchMacros();
  }, []);

  useEffect(() => {
    // Update preview when message template changes
    processPreview();
  }, [messageTemplate, customMacros]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${baseUrl}api/sms-sender/templates/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
      });
      const data = await response.json();
      if (data.data?.templates) {
        setTemplates(data.data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchMacros = async () => {
    try {
      const response = await fetch(`${baseUrl}api/sms-sender/macros/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
      });
      const data = await response.json();
      if (data.data?.macros) {
        setMacros(data.data.macros);
      }
    } catch (error) {
      console.error('Error fetching macros:', error);
    }
  };

  const processPreview = async () => {
    if (!messageTemplate) {
      setPreviewMessage('');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}api/sms-sender/process-template/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
        body: JSON.stringify({
          template: messageTemplate,
          custom_macros: customMacros,
        }),
      });
      const data = await response.json();
      if (data.data?.processed_message) {
        setPreviewMessage(data.data.processed_message);
      }
    } catch (error) {
      console.error('Error processing preview:', error);
    }
  };

  const insertMacro = (macroKey: string) => {
    const cursorPosition = (document.getElementById('messageTemplate') as HTMLTextAreaElement)?.selectionStart || messageTemplate.length;
    const before = messageTemplate.substring(0, cursorPosition);
    const after = messageTemplate.substring(cursorPosition);
    setMessageTemplate(`${before}@${macroKey}@${after}`);
  };

  const loadTemplate = (template: Template) => {
    setMessageTemplate(template.message_template);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" loaded`);
  };

  const addAreaCode = () => {
    if (areaCodeInput && !targetAreaCodes.includes(areaCodeInput)) {
      setTargetAreaCodes([...targetAreaCodes, areaCodeInput]);
      setAreaCodeInput('');
    }
  };

  const removeAreaCode = (code: string) => {
    setTargetAreaCodes(targetAreaCodes.filter(c => c !== code));
  };

  const saveCampaign = async (status: 'draft' | 'scheduled') => {
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (!messageTemplate.trim()) {
      toast.error('Message template is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}api/sms-sender/campaigns/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
        body: JSON.stringify({
          user_id: userID,
          name: campaignName,
          description,
          message_template: messageTemplate,
          custom_macros: customMacros,
          target_carrier: targetCarrier || null,
          target_type: targetType || null,
          target_area_codes: targetAreaCodes,
          batch_size: batchSize,
          rate_limit: rateLimit,
          use_proxy_rotation: useProxyRotation,
          use_smtp_rotation: useSmtpRotation,
          send_immediately: sendImmediately,
          scheduled_time: !sendImmediately && scheduledTime ? scheduledTime : null,
          status,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Campaign ${status === 'draft' ? 'saved' : 'scheduled'} successfully`);
        navigate('/sms-campaigns');
      } else {
        toast.error(data.message || 'Failed to save campaign');
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="mx-auto max-w-350">
      <Breadcrumb pageName="Campaign Builder" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Editor - 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Campaign Details
              </h3>
            </div>
            <div className="p-6 space-y-5">
              {/* Campaign Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                  className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the campaign"
                  className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              {/* Message Template */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-black dark:text-white">
                    Message Template *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="text-sm text-primary hover:underline"
                    >
                      Load Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMacros(!showMacros)}
                      className="text-sm text-primary hover:underline"
                    >
                      Insert Macro
                    </button>
                  </div>
                </div>
                <textarea
                  id="messageTemplate"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Type your message here... Use @MACRO@ for dynamic content"
                  rows={6}
                  className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {messageTemplate.length} characters
                </p>
              </div>

              {/* Targeting Options */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Target Carrier
                  </label>
                  <select
                    value={targetCarrier}
                    onChange={(e) => setTargetCarrier(e.target.value)}
                    className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="">All Carriers</option>
                    <option value="verizon">Verizon</option>
                    <option value="att">AT&T</option>
                    <option value="tmobile">T-Mobile</option>
                    <option value="sprint">Sprint</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Target Type
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="">All Types</option>
                    <option value="mobile">Mobile</option>
                    <option value="landline">Landline</option>
                  </select>
                </div>
              </div>

              {/* Area Codes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Target Area Codes
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={areaCodeInput}
                    onChange={(e) => setAreaCodeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAreaCode())}
                    placeholder="Enter area code"
                    className="flex-1 rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addAreaCode}
                    className="rounded bg-primary px-4 py-3 text-white hover:bg-opacity-90"
                  >
                    <FiPlus />
                  </button>
                </div>
                {targetAreaCodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {targetAreaCodes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 rounded bg-primary bg-opacity-10 px-3 py-1 text-sm text-primary"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => removeAreaCode(code)}
                          className="hover:text-red-500"
                        >
                          <FiX size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Campaign Settings */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    min="1"
                    max="1000"
                    className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Rate Limit (msgs/min)
                  </label>
                  <input
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </div>
              </div>

              {/* Rotation Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useProxyRotation}
                    onChange={(e) => setUseProxyRotation(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <span className="text-sm text-black dark:text-white">
                    Enable Proxy Rotation
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useSmtpRotation}
                    onChange={(e) => setUseSmtpRotation(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <span className="text-sm text-black dark:text-white">
                    Enable SMTP Rotation
                  </span>
                </label>
              </div>

              {/* Scheduling */}
              <div>
                <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                  Scheduling
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={sendImmediately}
                      onChange={() => setSendImmediately(true)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-black dark:text-white">
                      Send Immediately (after adding recipients)
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!sendImmediately}
                      onChange={() => setSendImmediately(false)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-black dark:text-white">
                      Schedule for Later
                    </span>
                  </label>

                  {!sendImmediately && (
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full rounded border border-stroke bg-gray px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => saveCampaign('draft')}
                  disabled={loading}
                  className="flex items-center gap-2 rounded border border-stroke px-6 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  <FiSave />
                  Save Draft
                </button>
                <button
                  onClick={() => saveCampaign('scheduled')}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-white hover:bg-opacity-90"
                >
                  <FiSend />
                  {sendImmediately ? 'Create Campaign' : 'Schedule Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Tools - 1 column */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="flex items-center gap-2 font-medium text-black dark:text-white">
                <FiEye />
                Live Preview
              </h3>
            </div>
            <div className="p-6">
              <div className="rounded bg-gray-2 p-4 dark:bg-meta-4">
                <p className="text-sm text-black dark:text-white whitespace-pre-wrap">
                  {previewMessage || 'Your message preview will appear here...'}
                </p>
              </div>
            </div>
          </div>

          {/* Template Library */}
          {showTemplates && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Template Library
                </h3>
              </div>
              <div className="p-6">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="mb-4 w-full rounded border border-stroke bg-gray px-4 py-2 text-sm dark:border-strokedark dark:bg-meta-4"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="w-full rounded border border-stroke p-3 text-left hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                    >
                      <p className="font-medium text-sm text-black dark:text-white">
                        {template.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Macro Selector */}
          {showMacros && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Available Macros
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {macros.map((macro) => (
                    <button
                      key={macro.key}
                      onClick={() => insertMacro(macro.key)}
                      className="w-full rounded border border-stroke p-3 text-left hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                    >
                      <p className="font-medium text-sm text-primary">
                        @{macro.key}@
                      </p>
                      <p className="text-xs text-black dark:text-white mt-1">
                        {macro.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Example: {macro.example}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignBuilder;
