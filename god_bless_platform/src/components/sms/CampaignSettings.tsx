/**
 * Enhanced Campaign Settings Component
 * Provides comprehensive configuration for SMS campaign delivery optimization
 */

import React, { useState, useEffect } from 'react'
import type { 
  RotationStrategy, 
  CampaignDeliverySettings, 
  CampaignTemplate,
  OptimizationRecommendation 
} from '../../types/rotation'

interface CampaignSettingsProps {
  campaignId?: string
  initialSettings?: Partial<CampaignDeliverySettings>
  onSettingsChange: (settings: CampaignDeliverySettings) => void
  onOptimizationApplied?: (recommendations: OptimizationRecommendation[]) => void
  disabled?: boolean
}

const ROTATION_STRATEGIES: { value: RotationStrategy; label: string; description: string }[] = [
  {
    value: 'round_robin',
    label: 'Round Robin',
    description: 'Distribute messages evenly across all servers'
  },
  {
    value: 'random',
    label: 'Random',
    description: 'Randomly select servers for each message'
  },
  {
    value: 'least_used',
    label: 'Least Used',
    description: 'Prefer servers with lowest usage'
  },
  {
    value: 'best_performance',
    label: 'Best Performance',
    description: 'Use servers with highest success rates'
  },
  {
    value: 'smart_adaptive',
    label: 'Smart Adaptive',
    description: 'AI-powered server selection based on real-time performance'
  }
]

const DEFAULT_SETTINGS: CampaignDeliverySettings = {
  use_proxy_rotation: true,
  proxy_rotation_strategy: 'round_robin',
  use_smtp_rotation: true,
  smtp_rotation_strategy: 'round_robin',
  custom_delay_enabled: false,
  custom_delay_min: 1,
  custom_delay_max: 5,
  smart_optimization_enabled: false,
  carrier_optimization_enabled: false,
  time_zone_optimization_enabled: false,
  adaptive_rate_limiting_enabled: false
}

export const CampaignSettings: React.FC<CampaignSettingsProps> = ({
  // campaignId, // Reserved for future API calls
  initialSettings,
  onSettingsChange,
  onOptimizationApplied,
  disabled = false
}) => {
  const [settings, setSettings] = useState<CampaignDeliverySettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  })
  
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  // const [showAdvanced, setShowAdvanced] = useState(false) // Reserved for future use
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResults, setOptimizationResults] = useState<OptimizationRecommendation[]>([])

  // Load available templates
  useEffect(() => {
    loadTemplates()
  }, [])

  // Notify parent of settings changes
  useEffect(() => {
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  const loadTemplates = async () => {
    try {
      // TODO: Implement API call to load templates
      // const response = await smsService.getCampaignTemplates()
      // setTemplates(response.data.templates)
      
      // Mock data for now
      setTemplates([
        {
          id: 'marketing',
          name: 'Marketing Campaign',
          description: 'Optimized for promotional messages with high delivery rates',
          category: 'marketing',
          settings: {
            ...DEFAULT_SETTINGS,
            smart_optimization_enabled: true,
            carrier_optimization_enabled: true,
            proxy_rotation_strategy: 'best_performance',
            smtp_rotation_strategy: 'best_performance'
          },
          estimated_delivery_rate: 95.2
        },
        {
          id: 'alerts',
          name: 'Alert Messages',
          description: 'Fast delivery for time-sensitive notifications',
          category: 'alerts',
          settings: {
            ...DEFAULT_SETTINGS,
            custom_delay_enabled: false,
            adaptive_rate_limiting_enabled: true,
            proxy_rotation_strategy: 'least_used',
            smtp_rotation_strategy: 'least_used'
          },
          estimated_delivery_rate: 98.7
        },
        {
          id: 'notifications',
          name: 'General Notifications',
          description: 'Balanced approach for regular notifications',
          category: 'notifications',
          settings: DEFAULT_SETTINGS,
          estimated_delivery_rate: 92.1
        }
      ])
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const handleSettingChange = <K extends keyof CampaignDeliverySettings>(
    key: K,
    value: CampaignDeliverySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSettings(prev => ({
        ...prev,
        ...template.settings,
        template_id: templateId
      }))
    }
  }

  const handleOneClickOptimization = async () => {
    setIsOptimizing(true)
    try {
      // TODO: Implement API call for optimization
      // const response = await optimizationService.getOptimizationRecommendations(campaignId)
      
      // Mock optimization results
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          type: 'strategy',
          title: 'Switch to Best Performance Strategy',
          description: 'Your current servers show 15% better performance with best_performance strategy',
          impact: 'high',
          confidence: 0.87,
          action: 'Change rotation strategy to best_performance',
          estimated_improvement: '+15% delivery rate'
        },
        {
          type: 'timing',
          title: 'Enable Adaptive Rate Limiting',
          description: 'Carriers are showing rate limiting patterns, adaptive limiting can improve success',
          impact: 'medium',
          confidence: 0.72,
          action: 'Enable adaptive rate limiting',
          estimated_improvement: '+8% success rate'
        }
      ]
      
      setOptimizationResults(mockRecommendations)
      
      // Apply optimizations
      const optimizedSettings = {
        ...settings,
        proxy_rotation_strategy: 'best_performance' as RotationStrategy,
        smtp_rotation_strategy: 'best_performance' as RotationStrategy,
        adaptive_rate_limiting_enabled: true,
        smart_optimization_enabled: true
      }
      
      setSettings(optimizedSettings)
      onOptimizationApplied?.(mockRecommendations)
      
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Campaign Delivery Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure rotation strategies and delivery optimization
          </p>
        </div>
        
        <button
          onClick={handleOneClickOptimization}
          disabled={disabled || isOptimizing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOptimizing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Optimizing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              One-Click Optimize
            </>
          )}
        </button>
      </div>

      {/* Template Selection */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Campaign Templates
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`relative rounded-lg border-2 cursor-pointer transition-colors ${
                selectedTemplate === template.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => !disabled && handleTemplateSelect(template.id)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </h5>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {template.estimated_delivery_rate}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    template.category === 'marketing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    template.category === 'alerts' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {template.category}
                  </span>
                  {selectedTemplate === template.id && (
                    <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rotation Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Server Rotation Settings
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Proxy Rotation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Proxy Rotation
              </label>
              <button
                type="button"
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  settings.use_proxy_rotation ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                onClick={() => handleSettingChange('use_proxy_rotation', !settings.use_proxy_rotation)}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.use_proxy_rotation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            {settings.use_proxy_rotation && (
              <select
                value={settings.proxy_rotation_strategy}
                onChange={(e) => handleSettingChange('proxy_rotation_strategy', e.target.value as RotationStrategy)}
                disabled={disabled}
                className="mt-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {ROTATION_STRATEGIES.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* SMTP Rotation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SMTP Rotation
              </label>
              <button
                type="button"
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  settings.use_smtp_rotation ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                onClick={() => handleSettingChange('use_smtp_rotation', !settings.use_smtp_rotation)}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.use_smtp_rotation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            {settings.use_smtp_rotation && (
              <select
                value={settings.smtp_rotation_strategy}
                onChange={(e) => handleSettingChange('smtp_rotation_strategy', e.target.value as RotationStrategy)}
                disabled={disabled}
                className="mt-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {ROTATION_STRATEGIES.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Timing */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            Delivery Timing
          </h4>
          <button
            type="button"
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.custom_delay_enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            onClick={() => handleSettingChange('custom_delay_enabled', !settings.custom_delay_enabled)}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.custom_delay_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        
        {settings.custom_delay_enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Delay (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.custom_delay_min}
                onChange={(e) => handleSettingChange('custom_delay_min', parseInt(e.target.value) || 0)}
                disabled={disabled}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Delay (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="300"
                value={settings.custom_delay_max}
                onChange={(e) => handleSettingChange('custom_delay_max', parseInt(e.target.value) || 0)}
                disabled={disabled}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Smart Optimization */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Smart Optimization
        </h4>
        
        <div className="space-y-4">
          {[
            { key: 'smart_optimization_enabled', label: 'AI-Powered Optimization', description: 'Use machine learning for optimal server selection' },
            { key: 'carrier_optimization_enabled', label: 'Carrier-Specific Routing', description: 'Route messages based on carrier performance data' },
            { key: 'time_zone_optimization_enabled', label: 'Time Zone Intelligence', description: 'Optimize delivery times based on recipient location' },
            { key: 'adaptive_rate_limiting_enabled', label: 'Adaptive Rate Limiting', description: 'Dynamically adjust sending rates based on feedback' }
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  settings[key as keyof CampaignDeliverySettings] ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                onClick={() => handleSettingChange(key as keyof CampaignDeliverySettings, !settings[key as keyof CampaignDeliverySettings])}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings[key as keyof CampaignDeliverySettings] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Optimization Results */}
      {optimizationResults.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h4 className="text-md font-medium text-green-800 dark:text-green-200 mb-4">
            Optimization Applied
          </h4>
          <div className="space-y-3">
            {optimizationResults.map((result, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200">
                    {result.title}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {result.description} • {result.estimated_improvement}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignSettings