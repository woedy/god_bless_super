/**
 * Enhanced Campaign Management Page
 * Demonstrates the new rotation and optimization components
 */

import React, { useState } from 'react'
import {
  CampaignSettings,
  ServerMonitoring,
  SmartDeliveryDashboard,
  CampaignTemplates
} from '../../components/sms'
import type { 
  CampaignTemplate, 
  CampaignDeliverySettings, 
  OptimizationRecommendation 
} from '../../types/rotation'

const EnhancedCampaignPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'monitoring' | 'delivery' | 'templates'>('settings')
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null)
  const [campaignSettings, setCampaignSettings] = useState<CampaignDeliverySettings | null>(null)
  const [optimizationResults, setOptimizationResults] = useState<OptimizationRecommendation[]>([])

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template)
    setCampaignSettings(template.settings)
  }

  const handleSettingsChange = (settings: CampaignDeliverySettings) => {
    setCampaignSettings(settings)
  }

  const handleOptimizationApplied = (recommendations: OptimizationRecommendation[]) => {
    setOptimizationResults(recommendations)
  }

  const tabs = [
    { id: 'settings', label: 'Campaign Settings', icon: '⚙️' },
    { id: 'monitoring', label: 'Server Monitoring', icon: '📊' },
    { id: 'delivery', label: 'Smart Delivery', icon: '🚀' },
    { id: 'templates', label: 'Templates', icon: '📋' }
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Enhanced Campaign Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Advanced SMS campaign configuration with intelligent rotation and optimization
          </p>
        </div>

        {/* Optimization Results Banner */}
        {optimizationResults.length > 0 && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Optimization Applied Successfully
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {optimizationResults.length} optimization{optimizationResults.length > 1 ? 's' : ''} applied. 
                  Expected improvement: {optimizationResults[0]?.estimated_improvement}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {activeTab === 'settings' && (
            <div className="p-6">
              <CampaignSettings
                campaignId="example-campaign"
                initialSettings={campaignSettings || undefined}
                onSettingsChange={handleSettingsChange}
                onOptimizationApplied={handleOptimizationApplied}
              />
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="p-6">
              <ServerMonitoring
                userId="example-user"
                campaignId="example-campaign"
                refreshInterval={30000}
                onMaintenanceToggle={(serverId, serverType, enabled) => {
                  console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} for ${serverType} server ${serverId}`)
                }}
              />
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="p-6">
              <SmartDeliveryDashboard
                campaignId="example-campaign"
                userId="example-user"
                refreshInterval={15000}
                onOptimizationApply={handleOptimizationApplied}
              />
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="p-6">
              <CampaignTemplates
                selectedTemplateId={selectedTemplate?.id}
                onTemplateSelect={handleTemplateSelect}
                onTemplateCreate={(template) => {
                  console.log('Template created:', template)
                }}
              />
            </div>
          )}
        </div>

        {/* Current Configuration Summary */}
        {campaignSettings && (
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Current Configuration Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Proxy Strategy</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                  {campaignSettings.proxy_rotation_strategy.replace('_', ' ')}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">SMTP Strategy</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                  {campaignSettings.smtp_rotation_strategy.replace('_', ' ')}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Smart Optimization</div>
                <div className={`text-lg font-medium ${
                  campaignSettings.smart_optimization_enabled 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {campaignSettings.smart_optimization_enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Custom Delays</div>
                <div className={`text-lg font-medium ${
                  campaignSettings.custom_delay_enabled 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {campaignSettings.custom_delay_enabled 
                    ? `${campaignSettings.custom_delay_min}-${campaignSettings.custom_delay_max}s`
                    : 'Disabled'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Template Info */}
        {selectedTemplate && (
          <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-indigo-800 dark:text-indigo-200 mb-2">
              Selected Template: {selectedTemplate.name}
            </h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-4">
              {selectedTemplate.description}
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div>
                <span className="text-indigo-500 dark:text-indigo-300">Category:</span>
                <span className="ml-2 font-medium text-indigo-800 dark:text-indigo-200 capitalize">
                  {selectedTemplate.category}
                </span>
              </div>
              <div>
                <span className="text-indigo-500 dark:text-indigo-300">Estimated Delivery Rate:</span>
                <span className="ml-2 font-medium text-indigo-800 dark:text-indigo-200">
                  {selectedTemplate.estimated_delivery_rate}%
                </span>
              </div>
              {selectedTemplate.usage_count !== undefined && (
                <div>
                  <span className="text-indigo-500 dark:text-indigo-300">Usage Count:</span>
                  <span className="ml-2 font-medium text-indigo-800 dark:text-indigo-200">
                    {selectedTemplate.usage_count}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedCampaignPage