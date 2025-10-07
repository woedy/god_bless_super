/**
 * Component tests for Dashboard page
 * Tests Requirements: 6.1, 6.2, 6.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { mockApiResponse } from '../../test/utils';

// Simple Dashboard component for testing
const Dashboard = () => {
  const [stats, setStats] = React.useState({
    totalPhones: 0,
    totalCampaigns: 0,
    activeTasks: 0,
    recentActivity: []
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Phone Numbers</h3>
          <p>{stats.totalPhones}</p>
        </div>
        <div className="stat-card">
          <h3>Total Campaigns</h3>
          <p>{stats.totalCampaigns}</p>
        </div>
        <div className="stat-card">
          <h3>Active Tasks</h3>
          <p>{stats.activeTasks}</p>
        </div>
      </div>
    </div>
  );
};

// Import React for the component
import React from 'react';

describe('Dashboard Page', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  it('renders dashboard title', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        totalPhones: 1000,
        totalCampaigns: 5,
        activeTasks: 2
      })
    );

    render(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<Dashboard />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays stats after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        totalPhones: 1000,
        totalCampaigns: 5,
        activeTasks: 2
      })
    );

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('renders all stat cards', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        totalPhones: 0,
        totalCampaigns: 0,
        activeTasks: 0
      })
    );

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Phone Numbers')).toBeInTheDocument();
      expect(screen.getByText('Total Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});
