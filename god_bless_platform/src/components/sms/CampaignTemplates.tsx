/**
 * Campaign Template Management Interface
 * Template selection, creation, sharing, and performance analytics
 */

import React, { useState, useEffect } from 'react'
import type { CampaignTemplate, CampaignDeliverySettings, RotationStrategy } from '../../types/rotation'

interface CampaignTemplatesProps {
  onTemplateSelect?: (template: CampaignTemplate) => void
  onTemplateCreate?: (template: Partial<CampaignTemplate>) => void
  selectedTemplateId?: string
  showCreateWizard?: boolean
}

interface TemplateAnalytics {
  template_id: string
  usage_count: number
  average_success_rate: number
  total_messages_sent: number
  performance_trend: number
  last_used: string
  user_rating: number
  estimated_performance: {
    delivery_rate: number
    speed_score: number
    reliability_score: number
  }
}

interface EstimatedPerformance {
  delivery_rate: number
  speed_score: number
  reliability_score: number
}

interface CreateTemplateData {
  name: string
  description: string
  category: 'marketing' | 'alerts' | 'notifications' | 'custom'
  settings: CampaignDeliverySettings
  is_public: boolean
}

const TEMPLATE_CATEGORIES = [
  { value: 'marketing', label: 'Marketing', icon: '📢', color: 'blue' },
  { value: 'alerts', label: 'Alerts', icon: '🚨', color: 'red' },
  { value: 'notifications', label: 'Notifications', icon: '🔔', color: 'yellow' },
  { value: 'custom', label: 'Custom', icon: '⚙️', color: 'gray' }
] as const

const DEFAULT_TEMPLATE_SETTINGS: CampaignDeliverySettings = {
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

const CampaignTemplates: React.FC<CampaignTemplatesProps> = ({
  onTemplateSelect,
  onTemplateCreate,
  selectedTemplateId,
  showCreateWizard = false
}) => {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [analytics, setAnalytics] = useState<Record<string, TemplateAnalytics>>({})
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'performance' | 'recent'>('performance')
  const [showPublicTemplates, setShowPublicTemplates] = useState(true)
  
  const [showCreateModal, setShowCreateModal] = useState(showCreateWizard)
  const [createData, setCreateData] = useState<CreateTemplateData>({
    name: '',
    description: '',
    category: 'custom',
    settings: DEFAULT_TEMPLATE_SETTINGS,
    is_public: false
  })
  const [createStep, setCreateStep] = useState(1)
  const [estimatedPerformance, setEstimatedPerformance] = useState<EstimatedPerformance | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [showPublicTemplates])

  const loadTemplates = async () => {
    try {
      // TODO: Implement API call to load templates
      // const response = await templateService.getTemplates({ include_public: showPublicTemplates })
      // setTemplates(response.data.templates)
      // setAnalytics(response.data.analytics)
      
      // Mock data for now
      const mockTemplates: CampaignTemplate[] = [
        {
          id: 'marketing-high-volume',
          name: 'High-Volume Marketing',
          description: 'Optimized for large marketing campaigns with maximum delivery rates',
          category: 'marketing',
          settings: {
            ...DEFAULT_TEMPLATE_SETTINGS,
            smart_optimization_enabled: true,
            carrier_optimization_enabled: true,
            proxy_rotation_strategy: 'best_performance',
            smtp_rotation_strategy: 'best_performance',
            adaptive_rate_limiting_enabled: true
          },
          estimated_delivery_rate: 96.8,
          usage_count: 245,
          average_success_rate: 96.2,
          is_public: true,
          created_by: 'System',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'alerts-urgent',
          name: 'Urgent Alerts',
          description: 'Fast delivery for time-critical notifications and alerts',
          category: 'alerts',
          settings: {
            ...DEFAULT_TEMPLATE_SETTINGS,
            custom_delay_enabled: false,
            proxy_rotation_strategy: 'least_used',
            smtp_rotation_strategy: 'least_used',
            adaptive_rate_limiting_enabled: true,
            time_zone_optimization_enabled: false
          },
          estimated_delivery_rate: 98.9,
          usage_count: 189,
          average_success_rate: 98.1,
          is_public: true,
          created_by: 'System',
          created_at: '2024-01-10T14:30:00Z'
        },
        {
          id: 'notifications-balanced',
          name: 'Balanced Notifications',
          description: 'Reliable delivery for general notifications with good performance',
          category: 'notifications',
          settings: {
            ...DEFAULT_TEMPLATE_SETTINGS,
            custom_delay_enabled: true,
            custom_delay_min: 2,
            custom_delay_max: 8,
            smart_optimization_enabled: true
          },
          estimated_delivery_rate: 94.5,
          usage_count: 156,
          average_success_rate: 93.8,
          is_public: true,
          created_by: 'System',
          created_at: '2024-01-08T09:15:00Z'
        },
        {
          id: 'custom-user-1',
          name: 'My Custom Template',
          description: 'Custom template for specific use case',
          category: 'custom',
          settings: {
            ...DEFAULT_TEMPLATE_SETTINGS,
            carrier_optimization_enabled: true,
            custom_delay_enabled: true,
            custom_delay_min: 1,
            custom_delay_max: 3
          },
          estimated_delivery_rate: 92.1,
          usage_count: 23,
          average_success_rate: 91.5,
          is_public: false,
          created_by: 'user123',
          created_at: '2024-02-01T16:45:00Z'
        }
      ]
      
      const mockAnalytics: Record<string, TemplateAnalytics> = {
        'marketing-high-volume': {
          template_id: 'marketing-high-volume',
          usage_count: 245,
          average_success_rate: 96.2,
          total_messages_sent: 1250000,
          performance_trend: 2.3,
          last_used: '2024-02-08T14:30:00Z',
          user_rating: 4.8,
          estimated_performance: {
            delivery_rate: 96.8,
            speed_score: 94.2,
            reliability_score: 97.1
          }
        },
        'alerts-urgent': {
          template_id: 'alerts-urgent',
          usage_count: 189,
          average_success_rate: 98.1,
          total_messages_sent: 890000,
          performance_trend: 1.8,
          last_used: '2024-02-08T12:15:00Z',
          user_rating: 4.9,
          estimated_performance: {
            delivery_rate: 98.9,
            speed_score: 98.5,
            reliability_score: 96.8
          }
        }
      }
      
      setTemplates(mockTemplates)
      setAnalytics(mockAnalytics)
      setError(null)
    } catch (err) {
      setError('Failed to load templates')
      console.error('Template loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: CampaignTemplate) => {
    onTemplateSelect?.(template)
  }

  const handleCreateTemplate = async () => {
    try {
      // TODO: Implement API call to create template
      // const response = await templateService.createTemplate(createData)
      
      const newTemplate: CampaignTemplate = {
        id: `custom-${Date.now()}`,
        ...createData,
        estimated_delivery_rate: estimatedPerformance?.delivery_rate || 90,
        usage_count: 0,
        average_success_rate: 0,
        created_by: 'current_user',
        created_at: new Date().toISOString()
      }
      
      setTemplates(prev => [...prev, newTemplate])
      onTemplateCreate?.(newTemplate)
      setShowCreateModal(false)
      resetCreateForm()
    } catch (err) {
      console.error('Failed to create template:', err)
    }
  }

  const estimatePerformance = async (settings: CampaignDeliverySettings) => {
    // TODO: Implement API call to estimate performance
    // const response = await templateService.estimatePerformance(settings)
    
    // Mock estimation based on settings
    let baseRate = 85
    if (settings.smart_optimization_enabled) baseRate += 5
    if (settings.carrier_optimization_enabled) baseRate += 3
    if (settings.adaptive_rate_limiting_enabled) baseRate += 2
    if (settings.proxy_rotation_strategy === 'best_performance') baseRate += 2
    if (settings.smtp_rotation_strategy === 'best_performance') baseRate += 2
    
    const estimated = {
      delivery_rate: Math.min(baseRate, 99),
      speed_score: baseRate - 5,
      reliability_score: baseRate + 2
    }
    
    setEstimatedPerformance(estimated)
  }

  const resetCreateForm = () => {
    setCreateData({
      name: '',
      description: '',
      category: 'custom',
      settings: DEFAULT_TEMPLATE_SETTINGS,
      is_public: false
    })
    setCreateStep(1)
    setEstimatedPerformance(null)
  }

  const getCategoryIcon = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.value === category)
    return cat?.icon || '⚙️'
  }

  const getCategoryColor = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.value === category)
    return cat?.color || 'gray'
  }

  const formatUsageCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
  }

  const filteredTemplates = templates
    .filter(template => selectedCategory === 'all' || template.category === selectedCategory)
    .filter(template => showPublicTemplates || !template.is_public)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'usage':
          return (b.usage_count || 0) - (a.usage_count || 0)
        case 'performance':
          return (b.estimated_delivery_rate || 0) - (a.estimated_delivery_rate || 0)
        case 'recent':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Campaign Templates
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pre-configured templates for optimal campaign delivery
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Categories</option>
            {TEMPLATE_CATEGORIES.map(category => (
              <option key={category.value} value={category.value}>
                {category.icon} {category.label}
              </option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'usage' | 'performance' | 'recent')}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="performance">Best Performance</option>
            <option value="usage">Most Used</option>
            <option value="name">Name</option>
            <option value="recent">Recently Created</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-public"
            checked={showPublicTemplates}
            onChange={(e) => setShowPublicTemplates(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <label htmlFor="show-public" className="text-sm text-gray-700 dark:text-gray-300">
            Include public templates
          </label>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const templateAnalytics = analytics[template.id]
          const isSelected = selectedTemplateId === template.id
          
          return (
            <div
              key={template.id}
              className={`relative bg-white dark:bg-gray-800 shadow rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
                isSelected 
                  ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              {/* Template Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {template.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getCategoryColor(template.category) === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      getCategoryColor(template.category) === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      getCategoryColor(template.category) === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {template.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {template.is_public && (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isSelected && (
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {template.description}
              </p>

              {/* Performance Metrics */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Estimated Delivery Rate</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {template.estimated_delivery_rate?.toFixed(1)}%
                  </span>
                </div>
                
                {template.usage_count !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Usage Count</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatUsageCount(template.usage_count)}
                    </span>
                  </div>
                )}
                
                {template.average_success_rate !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Actual Success Rate</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {template.average_success_rate?.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Performance Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Performance Score</span>
                  <span>{template.estimated_delivery_rate?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (template.estimated_delivery_rate || 0) >= 95 ? 'bg-green-500' :
                      (template.estimated_delivery_rate || 0) >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(template.estimated_delivery_rate || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Analytics (if available) */}
              {templateAnalytics && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {templateAnalytics.total_messages_sent.toLocaleString()} messages sent
                    </span>
                    {templateAnalytics.user_rating && (
                      <div className="flex items-center">
                        <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {templateAnalytics.user_rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Create Campaign Template
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                {[1, 2, 3].map((step) => (
                  <React.Fragment key={step}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      step <= createStep ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-12 h-1 ${
                        step < createStep ? 'bg-indigo-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="space-y-4">
              {createStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={createData.name}
                      onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter template name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={createData.description}
                      onChange={(e) => setCreateData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Describe the template's purpose and use case"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={createData.category}
                      onChange={(e) => setCreateData(prev => ({ ...prev, category: e.target.value as 'marketing' | 'alerts' | 'notifications' | 'custom' }))}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {TEMPLATE_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.icon} {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {createStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Configure Delivery Settings
                  </h4>
                  
                  {/* Simplified settings configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Proxy Strategy
                      </label>
                      <select
                        value={createData.settings.proxy_rotation_strategy}
                        onChange={(e) => setCreateData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, proxy_rotation_strategy: e.target.value as RotationStrategy }
                        }))}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="round_robin">Round Robin</option>
                        <option value="random">Random</option>
                        <option value="least_used">Least Used</option>
                        <option value="best_performance">Best Performance</option>
                        <option value="smart_adaptive">Smart Adaptive</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SMTP Strategy
                      </label>
                      <select
                        value={createData.settings.smtp_rotation_strategy}
                        onChange={(e) => setCreateData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, smtp_rotation_strategy: e.target.value as RotationStrategy }
                        }))}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="round_robin">Round Robin</option>
                        <option value="random">Random</option>
                        <option value="least_used">Least Used</option>
                        <option value="best_performance">Best Performance</option>
                        <option value="smart_adaptive">Smart Adaptive</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { key: 'smart_optimization_enabled', label: 'Smart Optimization' },
                      { key: 'carrier_optimization_enabled', label: 'Carrier Optimization' },
                      { key: 'adaptive_rate_limiting_enabled', label: 'Adaptive Rate Limiting' },
                      { key: 'custom_delay_enabled', label: 'Custom Delays' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                        <button
                          type="button"
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            createData.settings[key as keyof CampaignDeliverySettings] ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          onClick={() => setCreateData(prev => ({
                            ...prev,
                            settings: { 
                              ...prev.settings, 
                              [key]: !prev.settings[key as keyof CampaignDeliverySettings] 
                            }
                          }))}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              createData.settings[key as keyof CampaignDeliverySettings] ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => estimatePerformance(createData.settings)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Estimate Performance
                  </button>
                  
                  {estimatedPerformance && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Estimated Performance
                      </h5>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {estimatedPerformance.delivery_rate}%
                          </div>
                          <div className="text-xs text-blue-500 dark:text-blue-300">Delivery Rate</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {estimatedPerformance.speed_score}
                          </div>
                          <div className="text-xs text-blue-500 dark:text-blue-300">Speed Score</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {estimatedPerformance.reliability_score}
                          </div>
                          <div className="text-xs text-blue-500 dark:text-blue-300">Reliability</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {createStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Review & Create
                  </h4>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Name:</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-white">{createData.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Category:</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-white">
                          {getCategoryIcon(createData.category)} {createData.category}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Estimated Performance:</dt>
                        <dd className="text-sm font-medium text-green-600 dark:text-green-400">
                          {estimatedPerformance?.delivery_rate || 'Not calculated'}%
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="make-public"
                      checked={createData.is_public}
                      onChange={(e) => setCreateData(prev => ({ ...prev, is_public: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <label htmlFor="make-public" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Make this template public (share with other users)
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => createStep > 1 ? setCreateStep(createStep - 1) : setShowCreateModal(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {createStep > 1 ? 'Previous' : 'Cancel'}
              </button>
              
              <button
                onClick={() => createStep < 3 ? setCreateStep(createStep + 1) : handleCreateTemplate()}
                disabled={createStep === 1 && (!createData.name || !createData.description)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStep < 3 ? 'Next' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignTemplates