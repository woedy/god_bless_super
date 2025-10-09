import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  FaBolt as Zap, 
  FaCog as Settings, 
  FaChartLine as TrendingUp, 
  FaExclamationTriangle as AlertTriangle, 
  FaCheckCircle as CheckCircle, 
  FaClock as Clock,
  FaServer as Server,
  FaWrench as Wrench
} from 'react-icons/fa';

interface OptimizationRecommendation {
  type: 'infrastructure' | 'performance' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
}

interface GuidanceData {
  tips: string[];
  warnings: string[];
  suggestions: string[];
  context: string;
}

interface MaintenanceStatus {
  proxy_servers: Array<{
    id: number;
    host: string;
    port: number;
    is_maintenance: boolean;
    is_active: boolean;
  }>;
  smtp_servers: Array<{
    id: number;
    host: string;
    port: number;
    is_maintenance: boolean;
    is_active: boolean;
  }>;
}

const OptimizationDashboard: React.FC = () => {
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [guidance, setGuidance] = useState<GuidanceData | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadRecommendations();
    loadGuidance();
    loadMaintenanceStatus();
  }, []);

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/sms/optimization/recommendations/', {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadGuidance = async () => {
    try {
      const response = await fetch('/api/sms/optimization/guidance/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          context: 'performance_review'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuidance(data.guidance);
      }
    } catch (error) {
      console.error('Failed to load guidance:', error);
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/sms/optimization/maintenance_status/', {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaintenanceStatus(data.maintenance_status);
      }
    } catch (error) {
      console.error('Failed to load maintenance status:', error);
    }
  };

  const handleAutoOptimize = async (campaignId?: number) => {
    if (!campaignId) {
      // Show campaign selection dialog or use bulk optimization
      return;
    }

    setOptimizing(true);
    try {
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
        if (data.success) {
          // Show success message and refresh recommendations
          loadRecommendations();
        }
      }
    } catch (error) {
      console.error('Auto-optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleMaintenanceToggle = async (serverType: string, serverId: number, enable: boolean) => {
    setLoading(true);
    try {
      const endpoint = enable ? 'enable_maintenance' : 'disable_maintenance';
      const response = await fetch(`/api/sms/optimization/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          server_type: serverType,
          server_id: serverId,
          duration_minutes: enable ? 30 : undefined
        }),
      });
      
      if (response.ok) {
        loadMaintenanceStatus();
      }
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'infrastructure': return <Server className="h-4 w-4" />;
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      case 'strategy': return <Settings className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMS Optimization</h1>
          <p className="text-gray-600">Optimize your SMS campaigns with AI-powered recommendations</p>
        </div>
        <Button 
          onClick={() => handleAutoOptimize()}
          disabled={optimizing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Zap className="h-4 w-4 mr-2" />
          {optimizing ? 'Optimizing...' : 'Auto-Optimize'}
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Auto-Optimize</p>
                <p className="text-xs text-gray-600">One-click setup</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Performance</p>
                <p className="text-xs text-gray-600">Monitor & improve</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Configuration</p>
                <p className="text-xs text-gray-600">Manage settings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Maintenance</p>
                <p className="text-xs text-gray-600">Server management</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Optimization Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All systems optimized!</p>
                  <p className="text-sm">No recommendations at this time.</p>
                </div>
              ) : (
                recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(rec.type)}
                        <h4 className="font-medium">{rec.title}</h4>
                      </div>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600">Impact: {rec.impact}</span>
                      <span className="text-blue-600">{rec.action}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Guidance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Real-time Guidance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {guidance?.warnings && guidance.warnings.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {guidance.warnings.map((warning, index) => (
                        <p key={index} className="text-sm">{warning}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {guidance?.tips && guidance.tips.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Tips</h4>
                  <div className="space-y-1">
                    {guidance.tips.map((tip, index) => (
                      <p key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>{tip}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {guidance?.suggestions && guidance.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Suggestions</h4>
                  <div className="space-y-1">
                    {guidance.suggestions.map((suggestion, index) => (
                      <p key={index} className="text-sm text-blue-600 flex items-start space-x-2">
                        <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{suggestion}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Maintenance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Server Maintenance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Proxy Servers */}
            <div>
              <h4 className="font-medium mb-3">Proxy Servers</h4>
              <div className="space-y-2">
                {maintenanceStatus?.proxy_servers?.map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{server.host}:{server.port}</p>
                      <div className="flex items-center space-x-2 text-sm">
                        <Badge variant={server.is_active ? 'default' : 'secondary'}>
                          {server.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {server.is_maintenance && (
                          <Badge variant="outline" className="text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Maintenance
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={server.is_maintenance ? "outline" : "secondary"}
                      onClick={() => handleMaintenanceToggle('proxy', server.id, !server.is_maintenance)}
                      disabled={loading}
                    >
                      {server.is_maintenance ? 'End Maintenance' : 'Start Maintenance'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* SMTP Servers */}
            <div>
              <h4 className="font-medium mb-3">SMTP Servers</h4>
              <div className="space-y-2">
                {maintenanceStatus?.smtp_servers?.map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{server.host}:{server.port}</p>
                      <div className="flex items-center space-x-2 text-sm">
                        <Badge variant={server.is_active ? 'default' : 'secondary'}>
                          {server.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {server.is_maintenance && (
                          <Badge variant="outline" className="text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Maintenance
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={server.is_maintenance ? "outline" : "secondary"}
                      onClick={() => handleMaintenanceToggle('smtp', server.id, !server.is_maintenance)}
                      disabled={loading}
                    >
                      {server.is_maintenance ? 'End Maintenance' : 'Start Maintenance'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OptimizationDashboard;