import React, { useState } from 'react';
import { AppLayout } from '../../components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  FaBolt as Zap, 
  FaUpload as Upload,
  FaCommentDots as MessageSquare,
  FaChartBar as BarChart3
} from 'react-icons/fa';
import type { BreadcrumbItem } from '../../types';

import OptimizationDashboard from '../../components/sms/OptimizationDashboard';
import OneClickOptimization from '../../components/sms/OneClickOptimization';
import RealTimeGuidance from '../../components/sms/RealTimeGuidance';
import ConfigurationImport from '../../components/sms/ConfigurationImport';

const breadcrumbs: BreadcrumbItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    label: 'SMS Campaigns',
    href: '/sms/campaigns'
  },
  {
    label: 'Optimization',
    href: '/sms/optimization',
    isActive: true
  }
];

type TabType = 'dashboard' | 'optimize' | 'guidance' | 'import' | 'maintenance';

const OptimizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | undefined>();

  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Overview and recommendations'
    },
    {
      id: 'optimize' as TabType,
      label: 'Auto-Optimize',
      icon: <Zap className="h-4 w-4" />,
      description: 'One-click optimization'
    },
    {
      id: 'guidance' as TabType,
      label: 'Guidance',
      icon: <MessageSquare className="h-4 w-4" />,
      description: 'Real-time tips and suggestions'
    },
    {
      id: 'import' as TabType,
      label: 'Import Config',
      icon: <Upload className="h-4 w-4" />,
      description: 'Bulk server configuration'
    }
  ];

  const handleOptimizationComplete = (result: unknown) => {
    // Handle optimization completion
    console.log('Optimization completed:', result);
    // Could show a success message or redirect
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OptimizationDashboard />;
      
      case 'optimize':
        return (
          <div className="space-y-6">
            {/* Campaign Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Campaign to Optimize</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Choose a campaign to apply automatic optimization settings.
                  </p>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      placeholder="Campaign ID"
                      value={selectedCampaignId || ''}
                      onChange={(e) => setSelectedCampaignId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCampaignId(1)} // Demo campaign
                    >
                      Use Demo Campaign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <OneClickOptimization 
              campaignId={selectedCampaignId}
              onOptimizationComplete={handleOptimizationComplete}
              showAnalysis={true}
            />
          </div>
        );
      
      case 'guidance':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RealTimeGuidance 
              context="campaign_setup"
              campaignData={{
                message_count: 5000,
                target_audience_size: 4800,
                estimated_duration: 45,
                server_count: 3
              }}
              autoRefresh={true}
              refreshInterval={30}
            />
            <RealTimeGuidance 
              context="server_config"
              autoRefresh={true}
              refreshInterval={60}
            />
          </div>
        );
      
      case 'import':
        return <ConfigurationImport />;
      
      default:
        return <OptimizationDashboard />;
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SMS Optimization Center</h1>
            <p className="text-gray-600 mt-1">
              Optimize your SMS campaigns with AI-powered recommendations and one-click configuration
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-600 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              System Healthy
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200 -mx-6 px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

        {/* Tab Content */}
        <div className="py-6">
          {renderTabContent()}
        </div>

      {/* Quick Actions Sidebar */}
      <div className="fixed bottom-6 right-6 space-y-2">
        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
          onClick={() => setActiveTab('optimize')}
        >
          <Zap className="h-5 w-5 mr-2" />
          Quick Optimize
        </Button>
      </div>
    </AppLayout>
  );
};

export default OptimizationPage;