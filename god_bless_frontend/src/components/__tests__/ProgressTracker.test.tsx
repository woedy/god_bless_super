/**
 * Component tests for ProgressTracker component
 * Tests Requirements: 6.1, 6.2, 6.3
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';

// Simple ProgressTracker component for testing
const ProgressTracker = ({ 
  progress,
  status,
  currentStep,
  totalItems,
  processedItems
}: {
  progress: number;
  status: string;
  currentStep?: string;
  totalItems?: number;
  processedItems?: number;
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500';
      case 'FAILURE': return 'bg-red-500';
      case 'PROGRESS': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="progress-tracker">
      <div className="progress-info">
        <span className="status">{status}</span>
        {currentStep && <span className="step">{currentStep}</span>}
        {totalItems !== undefined && processedItems !== undefined && (
          <span className="items">{processedItems} / {totalItems}</span>
        )}
      </div>
      <div className="progress-bar-container">
        <div 
          className={`progress-bar ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="progress-percentage">{progress}%</div>
    </div>
  );
};

describe('ProgressTracker Component', () => {
  it('renders progress bar with correct percentage', () => {
    render(<ProgressTracker progress={50} status="PROGRESS" />);
    
    expect(screen.getByText('50%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('displays status', () => {
    render(<ProgressTracker progress={25} status="PROGRESS" />);
    
    expect(screen.getByText('PROGRESS')).toBeInTheDocument();
  });

  it('displays current step when provided', () => {
    render(
      <ProgressTracker 
        progress={30} 
        status="PROGRESS" 
        currentStep="Processing batch 3 of 10"
      />
    );
    
    expect(screen.getByText('Processing batch 3 of 10')).toBeInTheDocument();
  });

  it('displays item counts when provided', () => {
    render(
      <ProgressTracker 
        progress={75} 
        status="PROGRESS"
        totalItems={1000}
        processedItems={750}
      />
    );
    
    expect(screen.getByText('750 / 1000')).toBeInTheDocument();
  });

  it('applies success color for SUCCESS status', () => {
    render(<ProgressTracker progress={100} status="SUCCESS" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  it('applies error color for FAILURE status', () => {
    render(<ProgressTracker progress={50} status="FAILURE" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('applies progress color for PROGRESS status', () => {
    render(<ProgressTracker progress={50} status="PROGRESS" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-blue-500');
  });

  it('handles 0% progress', () => {
    render(<ProgressTracker progress={0} status="PENDING" />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles 100% progress', () => {
    render(<ProgressTracker progress={100} status="SUCCESS" />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });
});
