import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../../constants';

interface RotationSettingsData {
  id?: number;
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

const RotationSettings: React.FC = () => {
  const [settings, setSettings] = useState<RotationSettingsData>({
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const strategyOptions = [
    { value: 'round_robin', label: 'Round Robin' },
    { value: 'random', label: 'Random' },
    { value: 'least_used', label: 'Least Used' },
    { value: 'best_performance', label: 'Best Performance' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseUrl}api/proxy-server/rotation/settings/?user_id=${user.user_id}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load rotation settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
            ...settings,
          }),
        },
      );

      const result = await response.json();
      if (result.message === 'Successful') {
        toast.success('Settings saved successfully');
        setSettings(result.data);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof RotationSettingsData, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
        <h3 className="font-medium text-black dark:text-white">
          Rotation & Delivery Settings
        </h3>
      </div>

      <div className="p-6.5">
        {/* Proxy Rotation Settings */}
        <div className="mb-8">
          <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
            Proxy Rotation
          </h4>

          <div className="mb-4.5">
            <label className="mb-2.5 block text-black dark:text-white">
              <input
                type="checkbox"
                checked={settings.proxy_rotation_enabled}
                onChange={(e) =>
                  handleChange('proxy_rotation_enabled', e.target.checked)
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
              value={settings.proxy_rotation_strategy}
              onChange={(e) =>
                handleChange('proxy_rotation_strategy', e.target.value)
              }
              disabled={!settings.proxy_rotation_enabled}
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
                value={settings.proxy_health_check_interval}
                onChange={(e) =>
                  handleChange(
                    'proxy_health_check_interval',
                    parseInt(e.target.value),
                  )
                }
                disabled={!settings.proxy_rotation_enabled}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2.5 block text-black dark:text-white">
                Max Failures Before Unhealthy
              </label>
              <input
                type="number"
                value={settings.proxy_max_failures}
                onChange={(e) =>
                  handleChange('proxy_max_failures', parseInt(e.target.value))
                }
                disabled={!settings.proxy_rotation_enabled}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* SMTP Rotation Settings */}
        <div className="mb-8">
          <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
            SMTP Rotation
          </h4>

          <div className="mb-4.5">
            <label className="mb-2.5 block text-black dark:text-white">
              <input
                type="checkbox"
                checked={settings.smtp_rotation_enabled}
                onChange={(e) =>
                  handleChange('smtp_rotation_enabled', e.target.checked)
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
              value={settings.smtp_rotation_strategy}
              onChange={(e) =>
                handleChange('smtp_rotation_strategy', e.target.value)
              }
              disabled={!settings.smtp_rotation_enabled}
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
                value={settings.smtp_health_check_interval}
                onChange={(e) =>
                  handleChange(
                    'smtp_health_check_interval',
                    parseInt(e.target.value),
                  )
                }
                disabled={!settings.smtp_rotation_enabled}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2.5 block text-black dark:text-white">
                Max Failures Before Unhealthy
              </label>
              <input
                type="number"
                value={settings.smtp_max_failures}
                onChange={(e) =>
                  handleChange('smtp_max_failures', parseInt(e.target.value))
                }
                disabled={!settings.smtp_rotation_enabled}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Delivery Delay Settings */}
        <div className="mb-8">
          <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">
            Delivery Delay
          </h4>

          <div className="mb-4.5">
            <label className="mb-2.5 block text-black dark:text-white">
              <input
                type="checkbox"
                checked={settings.delivery_delay_enabled}
                onChange={(e) =>
                  handleChange('delivery_delay_enabled', e.target.checked)
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
                value={settings.delivery_delay_min}
                onChange={(e) =>
                  handleChange('delivery_delay_min', parseInt(e.target.value))
                }
                disabled={!settings.delivery_delay_enabled}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2.5 block text-black dark:text-white">
                Maximum Delay (seconds)
              </label>
              <input
                type="number"
                value={settings.delivery_delay_max}
                onChange={(e) =>
                  handleChange('delivery_delay_max', parseInt(e.target.value))
                }
                disabled={!settings.delivery_delay_enabled}
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
              value={settings.delivery_delay_random_seed || ''}
              onChange={(e) =>
                handleChange(
                  'delivery_delay_random_seed',
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              disabled={!settings.delivery_delay_enabled}
              placeholder="Leave empty for random"
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default RotationSettings;
