/**
 * Rotation and Delivery Settings Types
 * TypeScript interfaces for SMS rotation and delivery optimization
 */

export type RotationStrategy = 'round_robin' | 'random' | 'least_used' | 'best_performance' | 'smart_adaptive'

export interface RotationSettings {
  proxy_rotation_enabled: boolean
  proxy_rotation_strategy: RotationStrategy
  smtp_rotation_enabled: boolean
  smtp_rotation_strategy: RotationStrategy
  delivery_delay_enabled: boolean
  delivery_delay_min: number
  delivery_delay_max: number
  adaptive_optimization_enabled: boolean
}

export interface ServerHealth {
  id: number
  type: 'proxy' | 'smtp'
  host: string
  port: number
  is_healthy: boolean
  success_rate: number
  predicted_failure_risk: number
  last_used: string
  performance_score: number
  response_time?: number
  error_count?: number
  total_requests?: number
}

export interface CampaignTemplate {
  id: string
  name: string
  description: string
  category: 'marketing' | 'alerts' | 'notifications' | 'custom'
  settings: CampaignDeliverySettings
  estimated_delivery_rate: number
  usage_count?: number
  average_success_rate?: number
  is_public?: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface CampaignDeliverySettings {
  id?: string
  campaign_id?: string
  
  // Proxy settings
  use_proxy_rotation: boolean
  proxy_rotation_strategy: RotationStrategy
  
  // SMTP settings  
  use_smtp_rotation: boolean
  smtp_rotation_strategy: RotationStrategy
  
  // Delivery timing
  custom_delay_enabled: boolean
  custom_delay_min: number
  custom_delay_max: number
  custom_random_seed?: number
  
  // Smart optimization
  smart_optimization_enabled: boolean
  carrier_optimization_enabled: boolean
  time_zone_optimization_enabled: boolean
  adaptive_rate_limiting_enabled: boolean
  
  // Template
  template_id?: string
}

export interface ServerUsageStats {
  server_id: number
  server_type: 'proxy' | 'smtp'
  messages_processed: number
  successful_messages: number
  failed_messages: number
  success_rate: number
  average_response_time: number
  last_used: string
}

export interface CarrierPerformance {
  carrier: string
  proxy_server_id: number
  smtp_server_id: number
  success_rate: number
  average_delivery_time: number
  messages_sent: number
  last_updated: string
}

export interface OptimizationRecommendation {
  type: 'server_selection' | 'timing' | 'strategy' | 'configuration'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  confidence: number
  action: string
  estimated_improvement: string
}

export interface PredictiveAnalytics {
  completion_forecast: {
    estimated_completion_time: string
    confidence_interval: number
    factors: string[]
  }
  server_predictions: {
    server_id: number
    server_type: 'proxy' | 'smtp'
    failure_risk: number
    recommended_action: string
  }[]
  optimization_suggestions: OptimizationRecommendation[]
}

export interface CampaignProgress {
  campaign_id: string
  total_messages: number
  sent_messages: number
  delivered_messages: number
  failed_messages: number
  pending_messages: number
  
  current_server_usage: {
    proxy_servers: ServerUsageStats[]
    smtp_servers: ServerUsageStats[]
  }
  
  real_time_metrics: {
    messages_per_minute: number
    success_rate: number
    average_delivery_time: number
    active_servers: number
  }
  
  estimated_completion: string
  progress_percentage: number
}