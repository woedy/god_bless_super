import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  FaBolt as Zap, 
  FaCheckCircle as CheckCircle, 
  FaExclamationTriangle as AlertTriangle, 
  FaChartLine as TrendingUp, 
  FaCog as Settings,
  FaClock as Clock,
  FaServer as Server,
  FaTachometerAlt as Gauge
} from 'react-icons/fa';

interface OptimizationResult {
  success: boolean;
  optimization_applied: boolean;
  config: {
    proxy_rotation_enabled: boolean;
    smtp_rotation_enabled: boolean;
    proxy_rotation_strategy: string;
    smtp_rotation_strategy: string;
    delivery_delay_enabled: boolean;
    delivery_delay_min: number;
    delivery_delay_max: number;
    adaptive_optimization_enabled: boolean;
  };
  analysis: {
    proxy_count: number;
    smtp_count: number;
    total_servers: number;
    avg_success_rate: number;
    health_status: string;
  };
  performance_improvement: {
    estimated_success_rate_improvement: number;
    estimated_delivery_time_improvement: number;
    confidence: number;
  };
  recommendations: Array<{
    type: string;
    message: string;
  }>;
}

interface OneClickOptimizationProps {
  campaignId?: number;
  onOptimizationComplete?: (result: OptimizationResult) => void;
  showAnalysis?: boolean;
}

const OneClickOptimization: React.FC<OneClickOptimizationProps> = ({
  campaignId,
  onOptimizationComplete,
  showAnalysis = true
}) => {
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const optimizationSteps = [
    'Analyzing infrastructure...',
    'Evaluating server performance...',
    'Calculating optimal configuration...',
    'Applying optimization settings...',
    'Generating performance estimates...'
  ];

  const handleOptimize = async () => {
    if (!campaignId) {
      return;
    }

    setOptimizing(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress steps
      for (let i = 0; i < optimizationSteps.length; i++) {
        setCurrentStep(optimizationSteps[i]);
        setProgress((i + 1) * 20);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const response = await fetch('/api/sms/optimization/auto_optimize_campaign/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          campaign_id: campaignId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setProgress(100);
        setCurrentStep('Optimization complete!');
        
        if (onOptimizationComplete) {
          onOptimizationComplete(data);
        }
      } else {
        throw new Error('Optimization failed');
      }
    } catch (error) {
      console.error('Auto-optimization failed:', error);
      setResult({
        success: false,
        optimization_applied: false,
        config: {} as any,
        analysis: {} as any,
        performance_improvement: {} as any,
        recommendations: [{ type: 'error', message: 'Optimization failed. Please try again.' }]
      });
    } finally {
      setOptimizing(false);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs_attention': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Optimization Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>One-Click Optimization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Automatically configure optimal settings for your SMS campaign based on your server infrastructure and historical performance data.
            </p>
            
            {!optimizing && !result && (
              <Button 
                onClick={handleOptimize}
                disabled={!campaignId}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Zap className="h-4 w-4 mr-2" />
                Optimize Campaign
              </Button>
            )}

            {optimizing && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">{currentStep}</span>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-gray-500">This may take a few moments...</p>
              </div>
            )}

            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {result.success 
                    ? "Campaign optimization completed successfully!" 
                    : "Optimization failed. Please check your configuration and try again."
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {result && result.success && showAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Infrastructure Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Infrastructure Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{result.analysis.proxy_count}</p>
                    <p className="text-sm text-gray-600">Proxy Servers</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{result.analysis.smtp_count}</p>
                    <p className="text-sm text-gray-600">SMTP Servers</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm">{formatPercentage(result.analysis.avg_success_rate)}</span>
                  </div>
                  <Progress value={result.analysis.avg_success_rate * 100} className="w-full" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Health Status</span>
                  <Badge className={getHealthStatusColor(result.analysis.health_status)}>
                    {result.analysis.health_status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applied Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Applied Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Proxy Rotation</span>
                  <Badge variant={result.config.proxy_rotation_enabled ? "default" : "secondary"}>
                    {result.config.proxy_rotation_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {result.config.proxy_rotation_enabled && (
                  <div className="flex items-center justify-between pl-4">
                    <span className="text-xs text-gray-600">Strategy</span>
                    <span className="text-xs">{result.config.proxy_rotation_strategy}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm">SMTP Rotation</span>
                  <Badge variant={result.config.smtp_rotation_enabled ? "default" : "secondary"}>
                    {result.config.smtp_rotation_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {result.config.smtp_rotation_enabled && (
                  <div className="flex items-center justify-between pl-4">
                    <span className="text-xs text-gray-600">Strategy</span>
                    <span className="text-xs">{result.config.smtp_rotation_strategy}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm">Delivery Delays</span>
                  <Badge variant={result.config.delivery_delay_enabled ? "default" : "secondary"}>
                    {result.config.delivery_delay_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {result.config.delivery_delay_enabled && (
                  <div className="flex items-center justify-between pl-4">
                    <span className="text-xs text-gray-600">Range</span>
                    <span className="text-xs">
                      {result.config.delivery_delay_min}s - {result.config.delivery_delay_max}s
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm">Adaptive Optimization</span>
                  <Badge variant={result.config.adaptive_optimization_enabled ? "default" : "secondary"}>
                    {result.config.adaptive_optimization_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Improvement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Expected Improvements</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate Improvement</span>
                    <span className="text-sm font-medium text-green-600">
                      +{formatPercentage(result.performance_improvement.estimated_success_rate_improvement)}
                    </span>
                  </div>
                  <Progress 
                    value={result.performance_improvement.estimated_success_rate_improvement * 100} 
                    className="w-full" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Delivery Time Improvement</span>
                    <span className="text-sm font-medium text-blue-600">
                      +{formatPercentage(result.performance_improvement.estimated_delivery_time_improvement)}
                    </span>
                  </div>
                  <Progress 
                    value={result.performance_improvement.estimated_delivery_time_improvement * 100} 
                    className="w-full" 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Confidence Level</span>
                  <div className="flex items-center space-x-2">
                    <Gauge className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      {formatPercentage(result.performance_improvement.confidence)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.recommendations.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">No additional recommendations</p>
                  </div>
                ) : (
                  result.recommendations.map((rec, index) => (
                    <Alert key={index} className="border-blue-200 bg-blue-50">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm">
                        {rec.message}
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OneClickOptimization;