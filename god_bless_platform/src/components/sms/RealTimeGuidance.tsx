import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  FaLightbulb as Lightbulb, 
  FaExclamationTriangle as AlertTriangle, 
  FaChartLine as TrendingUp, 
  FaCheckCircle as CheckCircle, 
  FaTimes as X,
  FaSync as RefreshCw,
  FaCommentDots as MessageSquare
} from 'react-icons/fa';

interface GuidanceData {
  tips: string[];
  warnings: string[];
  suggestions: string[];
  context: string;
}

interface RealTimeGuidanceProps {
  context: 'campaign_setup' | 'server_config' | 'performance_review' | 'general';
  campaignData?: {
    message_count?: number;
    target_audience_size?: number;
    estimated_duration?: number;
    server_count?: number;
  };
  onGuidanceUpdate?: (guidance: GuidanceData) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

const RealTimeGuidance: React.FC<RealTimeGuidanceProps> = ({
  context,
  campaignData,
  onGuidanceUpdate,
  autoRefresh = false,
  refreshInterval = 30
}) => {
  const [guidance, setGuidance] = useState<GuidanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadGuidance();
  }, [context, campaignData]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadGuidance();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadGuidance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sms/optimization/guidance/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          context,
          campaign_data: campaignData || {}
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuidance(data.guidance);
        setLastRefresh(new Date());
        
        if (onGuidanceUpdate) {
          onGuidanceUpdate(data.guidance);
        }
      }
    } catch (error) {
      console.error('Failed to load guidance:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissItem = (type: 'tip' | 'warning' | 'suggestion', index: number) => {
    const key = `${type}-${index}`;
    setDismissed(prev => new Set([...prev, key]));
  };

  const isDismissed = (type: 'tip' | 'warning' | 'suggestion', index: number) => {
    const key = `${type}-${index}`;
    return dismissed.has(key);
  };

  const getContextTitle = (context: string) => {
    switch (context) {
      case 'campaign_setup': return 'Campaign Setup Guidance';
      case 'server_config': return 'Server Configuration Tips';
      case 'performance_review': return 'Performance Insights';
      default: return 'Real-time Guidance';
    }
  };

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'campaign_setup': return <MessageSquare className="h-5 w-5" />;
      case 'server_config': return <TrendingUp className="h-5 w-5" />;
      case 'performance_review': return <CheckCircle className="h-5 w-5" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!guidance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getContextIcon(context)}
            <span>{getContextTitle(context)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasContent = guidance.tips.length > 0 || guidance.warnings.length > 0 || guidance.suggestions.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {getContextIcon(context)}
            <span>{getContextTitle(context)}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Updated {formatTimeAgo(lastRefresh)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadGuidance}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>All good!</p>
            <p className="text-sm">No guidance needed at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Warnings */}
            {guidance.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-orange-700 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Warnings</span>
                  <Badge variant="outline" className="text-orange-600">
                    {guidance.warnings.filter((_, index) => !isDismissed('warning', index)).length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {guidance.warnings.map((warning, index) => (
                    !isDismissed('warning', index) && (
                      <Alert key={index} className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-sm">{warning}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissItem('warning', index)}
                            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {guidance.tips.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-blue-700 flex items-center space-x-2">
                  <Lightbulb className="h-4 w-4" />
                  <span>Tips</span>
                  <Badge variant="outline" className="text-blue-600">
                    {guidance.tips.filter((_, index) => !isDismissed('tip', index)).length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {guidance.tips.map((tip, index) => (
                    !isDismissed('tip', index) && (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Lightbulb className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-blue-800 flex-1">{tip}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissItem('tip', index)}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {guidance.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-green-700 flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Suggestions</span>
                  <Badge variant="outline" className="text-green-600">
                    {guidance.suggestions.filter((_, index) => !isDismissed('suggestion', index)).length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {guidance.suggestions.map((suggestion, index) => (
                    !isDismissed('suggestion', index) && (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-800 flex-1">{suggestion}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissItem('suggestion', index)}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Context-specific information */}
            {campaignData && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Context Information</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {campaignData.message_count && (
                    <div>Messages: {campaignData.message_count.toLocaleString()}</div>
                  )}
                  {campaignData.target_audience_size && (
                    <div>Audience: {campaignData.target_audience_size.toLocaleString()}</div>
                  )}
                  {campaignData.estimated_duration && (
                    <div>Est. Duration: {campaignData.estimated_duration}min</div>
                  )}
                  {campaignData.server_count && (
                    <div>Servers: {campaignData.server_count}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeGuidance;