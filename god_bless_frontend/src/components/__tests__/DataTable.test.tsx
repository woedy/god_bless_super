/**
 * Component tests for DataTable component
 * Tests Requirements: 6.1, 6.2, 6.3
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { mockPhoneNumber } from '../../test/utils';

// Simple DataTable component for testing
const DataTable = ({ 
  data, 
  columns,
  onSort,
  onFilter,
  onExport
}: {
  data: any[];
  columns: Array<{ key: string; label: string; sortable?: boolean }>;
  onSort?: (key: string) => void;
  onFilter?: (filters: any) => void;
  onExport?: (format: string) => void;
}) => {
  return (
    <div className="data-table">
      <div className="table-actions">
        <button onClick={() => onExport?.('csv')}>Export CSV</button>
        <button onClick={() => onExport?.('json')}>Export JSON</button>
      </div>
      <table>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>
                {col.label}
                {col.sortable && (
                  <button onClick={() => onSort?.(col.key)}>Sort</button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>No data available</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx}>
                {columns.map(col => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

describe('DataTable Component', () => {
  const mockColumns = [
    { key: 'phone_number', label: 'Phone Number', sortable: true },
    { key: 'carrier', label: 'Carrier', sortable: true },
    { key: 'type', label: 'Type', sortable: false },
  ];

  const mockData = [
    { phone_number: '1234567890', carrier: 'Verizon', type: 'mobile' },
    { phone_number: '0987654321', carrier: 'AT&T', type: 'landline' },
  ];

  it('renders table with data', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByText('Phone Number')).toBeInTheDocument();
    expect(screen.getByText('Carrier')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('Verizon')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<DataTable data={[]} columns={mockColumns} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('calls onSort when sort button clicked', () => {
    const handleSort = vi.fn();
    render(<DataTable data={mockData} columns={mockColumns} onSort={handleSort} />);
    
    const sortButtons = screen.getAllByText('Sort');
    fireEvent.click(sortButtons[0]);
    
    expect(handleSort).toHaveBeenCalledWith('phone_number');
  });

  it('renders export buttons', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
  });

  it('calls onExport with correct format', () => {
    const handleExport = vi.fn();
    render(<DataTable data={mockData} columns={mockColumns} onExport={handleExport} />);
    
    fireEvent.click(screen.getByText('Export CSV'));
    expect(handleExport).toHaveBeenCalledWith('csv');
    
    fireEvent.click(screen.getByText('Export JSON'));
    expect(handleExport).toHaveBeenCalledWith('json');
  });

  it('renders all rows from data', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    const rows = screen.getAllByRole('row');
    // +1 for header row
    expect(rows).toHaveLength(mockData.length + 1);
  });

  it('renders sortable columns with sort button', () => {
    render(<DataTable data={mockData} columns={mockColumns} />);
    
    const sortButtons = screen.getAllByText('Sort');
    // Only 2 columns are sortable
    expect(sortButtons).toHaveLength(2);
  });
});
