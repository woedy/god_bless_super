import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl } from '../../constants';
import { FiSave, FiSettings, FiUser, FiBell, FiServer } from 'react-icons/fi';

interface UserPreferences {
  theme_preference: string;
  notification_preferences: {
    email_notifications: boolean;
    sms_notifications: boolean;
    task_completion: boolean;
    system_alerts: boolean;
  };
}

interface SystemSettings {
  smtp_rotation_enabled: boolean;
  proxy_rotation_enabled: boolean;
  delivery_delay_min: number;
  delivery_delay_max: number;
  delivery_delay_seed: number | null;
  batch_size: number;
  sms_rate_limit_per_minute: number;
}

interface RotationSettings {
  proxy_rotation_enabled: boolean;
  proxy_rotation_strategy: string;
  proxy_health_check_interval: number;
  proxy_max_failures: number;
  smtp_rotation_enabled: boolean;
  smtp_rotation_strategy: string;
  smtp_health_check_interval: number;
  smtp_max_failures: number;
  delivery_delay_enabled: boolean;
  delivery_delay_min: number;
  delivery_delay_max: number;
  delivery_delay_random_seed: number | null;
}

const EnhancedSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'rotation' | 'system'>('preferences');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    theme_preference: 'light',
    notification_preferences: {
      email_notifications: true,
      sms_notifications: true,
      task_completion: true,
      system_alerts: true,
    },
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    smtp_rotation_enabled: true,
    proxy_rotation_enabled: true,
    delivery_delay_min: 1,
    delivery_delay_max: 5,
    delivery_delay_seed: null,
    batch_size: 100,
    sms_rate_limit_per_minute: 10,
  });

  const [rotationSettings, setRotationSettings] = useState<RotationSettings>({
    proxy_rotation_enabled: true,
    proxy_rotation_strategy: 'round_robin',
    proxy_health_check_interval: 300,
    proxy_max_failures: 3,
    smtp_rotation_enabled: true,
    smtp_rotation_strategy: 'round_robin',
    smtp_health_check_interval: 300,
    smtp_max_failures: 3,
    delivery_delay_enabled: true,
    delivery_delay_min: 1,
    delivery_delay_max: 5,
    delivery_delay_random_seed: null,
  });

  const strategyOptions = [
    { value: 'round_robin', label: 'Round Robin' },
    { value: 'random', label: 'Random' },
    { value: 'least_used', label: 'Least Used' },
    { value: 'best_performance', label: 'Best Performance' },
  ];

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/accounts/all-settings/?user_id=${user.user_id}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        if (result.data.user_preferences) {
          setUserPreferences({
            theme_preference: result.data.user_preferences.theme_preference || 'light',
            notification_preferences: result.data.user_preferences.notification_preferences || {
              email_notifications: true,
              sms_notifications: true,
              task_completion: true,
              system_alerts: true,
            },
          });
        }
        if (result.data.system_settings) {
          setSystemSettings(result.data.system_settings);
        }
        if (result.data.rotation_settings) {
          setRotationSettings(result.data.rotation_settings);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/accounts/user-preferences/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            user_id: user.user_id,
            ...userPreferences,
          }),
        },
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        toast.success('Preferences saved successfully');
        
        // Update theme in localStorage and trigger theme change
        localStorage.setItem('theme', userPreferences.theme_preference);
        window.dispatchEvent(new Event('themeChange'));
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/accounts/system-settings/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            user_id: user.user_id,
            ...systemSettings,
          }),
        },
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        toast.success('System settings saved successfully');
      } else {
        toast.error('Failed to save system settings');
      }
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast.error('Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRotationSettings = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/proxy-server/rotation/settings/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            user_id: user.user_id,
            ...rotationSettings,
          }),
        },
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        toast.success('Rotation settings saved successfully');
      } else {
        toast.error('Failed to save rotation settings');
      }
    } catch (error) {
      console.error('Error saving rotation settings:', error);
      toast.error('Failed to save rotation settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="Settings" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-270">
      <Breadcrumb pageName="Settings" />

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-4 border-b border-stroke dark:border-strokedark">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
            activeTab === 'preferences'
              ? 'border-b-2 border-primary text-primary'
              : 'text-body dark:text-bodydark hover:text-primary'
          }`}
        >
          <FiUser />
          User Preferences
        </button>
        <button
          onClick={() => setActiveTab('rotation')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
            activeTab === 'rotation'
              ? 'border-b-2 border-primary text-primary'
              : 'text-body dark:text-bodydark hover:text-primary'
          }`}
        >
          <FiServer />
          Rotation & Delivery
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
            activeTab === 'system'
              ? 'border-b-2 border-primary text-primary'
              : 'text-body dark:text-bodydark hover:text-primary'
          }`}
        >
          <FiSettings />
          System Settings
        </button>
      </div>

      {/* User Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              User Preferences
            </h3>
          </div>

          <div className="p-6.5">
            {/* Theme Preference */}
            <div className="mb-6">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Theme
              </h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={userPreferences.theme_preference === 'light'}
                    onChange={(e) =>
                      setUserPreferences({
                        ...userPreferences,
                        theme_preference: e.target.value,
                      })
                    }
                    className="form-radio"
                  />
                  <span className="text-black dark:text-white">Light Mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={userPreferences.theme_preference === 'dark'}
                    onChange={(e) =>
                      setUserPreferences({
                        ...userPreferences,
                        theme_preference: e.target.value,
                      })
                    }
                    className="form-radio"
                  />
                  <span className="text-black dark:text-white">Dark Mode</span>
                </label>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="mb-6">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                <FiBell />
                Notifications
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userPreferences.notification_preferences.email_notifications}
                    onChange={(e) =>
                      setUserPreferences({
                        ...userPreferences,
                        notification_preferences: {
                          ...userPreferences.notification_preferences,
                          email_notifications: e.target.checked,
                        },
                      })
                    }
                    className="form-checkbox"
                  />
                  <span className="text-black dark:text-white">Email Notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userPreferences.notification_preferences.sms_notifications}
                    onChange={(e) =>
                      setUserPreferences({
                        ...userPreferences,
                        notification_preferences: {
                          ...userPreferences.notification_preferences,
                          sms_notifications: e.target.checked,
                        },
                      })
                    }
                    className="form-checkbox"
                  />
                  <span className="text-black dark:text-white">SMS Notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userPreferences.notification_preferences.task_completion}
                    onChange={(e) =>
                      setUserPreferences({
                        ...userPreferences,
                        notification_preferences: {
                          ...userPreferences.notification_preferences,
                          task_completion: e.target.checked,
                        },
                      })
                    }
                    className="form-checkbox"
                  />
                  <span className="text-black dark:text-white">Task Completion Alerts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userPreferences.notification_preferences.system_alerts}
                    onChange={(e) =>
                      setUserPreferences({
                        ...userPreferences,
                        notification_preferences: {
                          ...userPreferences.notification_preferences,
                          system_alerts: e.target.checked,
                        },
                      })
                    }
                    className="form-checkbox"
                  />
                  <span className="text-black dark:text-white">System Alerts</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
            >
              <FiSave />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Rotation & Delivery Tab */}
      {activeTab === 'rotation' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Rotation & Delivery Settings
            </h3>
          </div>

          <div className="p-6.5">
            {/* Proxy Rotation */}
            <div className="mb-8">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Proxy Rotation
              </h4>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  <input
                    type="checkbox"
                    checked={rotationSettings.proxy_rotation_enabled}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        proxy_rotation_enabled: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Enable Proxy Rotation
                </label>
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Rotation Strategy
                </label>
                <select
                  value={rotationSettings.proxy_rotation_strategy}
                  onChange={(e) =>
                    setRotationSettings({
                      ...rotationSettings,
                      proxy_rotation_strategy: e.target.value,
                    })
                  }
                  disabled={!rotationSettings.proxy_rotation_enabled}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  {strategyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4.5 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Health Check Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={rotationSettings.proxy_health_check_interval}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        proxy_health_check_interval: parseInt(e.target.value),
                      })
                    }
                    disabled={!rotationSettings.proxy_rotation_enabled}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Max Failures Before Unhealthy
                  </label>
                  <input
                    type="number"
                    value={rotationSettings.proxy_max_failures}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        proxy_max_failures: parseInt(e.target.value),
                      })
                    }
                    disabled={!rotationSettings.proxy_rotation_enabled}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* SMTP Rotation */}
            <div className="mb-8">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                SMTP Rotation
              </h4>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  <input
                    type="checkbox"
                    checked={rotationSettings.smtp_rotation_enabled}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        smtp_rotation_enabled: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Enable SMTP Rotation
                </label>
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Rotation Strategy
                </label>
                <select
                  value={rotationSettings.smtp_rotation_strategy}
                  onChange={(e) =>
                    setRotationSettings({
                      ...rotationSettings,
                      smtp_rotation_strategy: e.target.value,
                    })
                  }
                  disabled={!rotationSettings.smtp_rotation_enabled}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  {strategyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4.5 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Health Check Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={rotationSettings.smtp_health_check_interval}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        smtp_health_check_interval: parseInt(e.target.value),
                      })
                    }
                    disabled={!rotationSettings.smtp_rotation_enabled}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Max Failures Before Unhealthy
                  </label>
                  <input
                    type="number"
                    value={rotationSettings.smtp_max_failures}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        smtp_max_failures: parseInt(e.target.value),
                      })
                    }
                    disabled={!rotationSettings.smtp_rotation_enabled}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Delay */}
            <div className="mb-8">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Delivery Delay
              </h4>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  <input
                    type="checkbox"
                    checked={rotationSettings.delivery_delay_enabled}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        delivery_delay_enabled: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Enable Delivery Delay
                </label>
              </div>

              <div className="mb-4.5 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Minimum Delay (seconds)
                  </label>
                  <input
                    type="number"
                    value={rotationSettings.delivery_delay_min}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        delivery_delay_min: parseInt(e.target.value),
                      })
                    }
                    disabled={!rotationSettings.delivery_delay_enabled}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Maximum Delay (seconds)
                  </label>
                  <input
                    type="number"
                    value={rotationSettings.delivery_delay_max}
                    onChange={(e) =>
                      setRotationSettings({
                        ...rotationSettings,
                        delivery_delay_max: parseInt(e.target.value),
                      })
                    }
                    disabled={!rotationSettings.delivery_delay_enabled}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Random Seed (optional, for reproducible delays)
                </label>
                <input
                  type="number"
                  value={rotationSettings.delivery_delay_random_seed || ''}
                  onChange={(e) =>
                    setRotationSettings({
                      ...rotationSettings,
                      delivery_delay_random_seed: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  disabled={!rotationSettings.delivery_delay_enabled}
                  placeholder="Leave empty for random"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveRotationSettings}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
            >
              <FiSave />
              {saving ? 'Saving...' : 'Save Rotation Settings'}
            </button>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              System Settings
            </h3>
          </div>

          <div className="p-6.5">
            {/* Batch Processing */}
            <div className="mb-6">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Batch Processing
              </h4>
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Default Batch Size
                </label>
                <input
                  type="number"
                  value={systemSettings.batch_size}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      batch_size: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
                <p className="mt-1 text-sm text-body dark:text-bodydark">
                  Number of items to process in each batch
                </p>
              </div>
            </div>

            {/* Rate Limiting */}
            <div className="mb-6">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Rate Limiting
              </h4>
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  SMS Rate Limit (per minute)
                </label>
                <input
                  type="number"
                  value={systemSettings.sms_rate_limit_per_minute}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      sms_rate_limit_per_minute: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
                <p className="mt-1 text-sm text-body dark:text-bodydark">
                  Maximum SMS messages to send per minute
                </p>
              </div>
            </div>

            {/* Delivery Settings */}
            <div className="mb-6">
              <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Delivery Configuration
              </h4>
              <div className="mb-4.5 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Minimum Delay (seconds)
                  </label>
                  <input
                    type="number"
                    value={systemSettings.delivery_delay_min}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        delivery_delay_min: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Maximum Delay (seconds)
                  </label>
                  <input
                    type="number"
                    value={systemSettings.delivery_delay_max}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        delivery_delay_max: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>

              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Random Seed (optional)
                </label>
                <input
                  type="number"
                  value={systemSettings.delivery_delay_seed || ''}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      delivery_delay_seed: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Leave empty for random delays"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSystemSettings}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
            >
              <FiSave />
              {saving ? 'Saving...' : 'Save System Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSettings;
