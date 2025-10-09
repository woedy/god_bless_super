/**
 * Responsive Design Tests
 * Tests for responsive components and utilities
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useResponsive } from '../hooks/useResponsive'
import { ResponsiveGrid, ResponsiveFlex, ResponsiveContainer } from '../components/common/ResponsiveGrid'
import { ResponsiveTable } from '../components/common/ResponsiveTable'
import { MobileNavigation } from '../components/layout/MobileNavigation'
import { AuthProvider } from '../contexts/AuthContext'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  })
  
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// Test component for useResponsive hook
function TestResponsiveComponent() {
  const responsive = useResponsive()
  
  return (
    <div>
      <div data-testid="is-mobile">{responsive.isMobile.toString()}</div>
      <div data-testid="is-tablet">{responsive.isTablet.toString()}</div>
      <div data-testid="is-desktop">{responsive.isDesktop.toString()}</div>
      <div data-testid="screen-width">{responsive.screenWidth}</div>
    </div>
  )
}

describe('useResponsive Hook', () => {
  it('should detect desktop screen size', () => {
    render(<TestResponsiveComponent />)
    
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('false')
    expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('true')
    expect(screen.getByTestId('screen-width')).toHaveTextContent('1024')
  })

  it('should detect mobile screen size', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    })
    
    render(<TestResponsiveComponent />)
    
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
    expect(screen.getByTestId('is-tablet')).toHaveTextContent('false')
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('false')
  })

  it('should update on window resize', () => {
    const { rerender } = render(<TestResponsiveComponent />)
    
    // Start with desktop
    expect(screen.getByTestId('is-desktop')).toHaveTextContent('true')
    
    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    })
    
    fireEvent(window, new Event('resize'))
    rerender(<TestResponsiveComponent />)
    
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true')
  })
})

describe('ResponsiveGrid Component', () => {
  it('should render children in grid layout', () => {
    render(
      <ResponsiveGrid data-testid="responsive-grid">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    )
    
    const grid = screen.getByTestId('responsive-grid')
    expect(grid).toBeInTheDocument()
    expect(grid).toHaveClass('grid')
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('should apply custom column configuration', () => {
    render(
      <ResponsiveGrid 
        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
        data-testid="custom-grid"
      >
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    )
    
    const grid = screen.getByTestId('custom-grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-3')
  })

  it('should use auto-fit when specified', () => {
    render(
      <ResponsiveGrid 
        autoFit 
        minItemWidth="200px"
        data-testid="auto-fit-grid"
      >
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    )
    
    const grid = screen.getByTestId('auto-fit-grid')
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
    })
  })
})

describe('ResponsiveFlex Component', () => {
  it('should render children in flex layout', () => {
    render(
      <ResponsiveFlex data-testid="responsive-flex">
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveFlex>
    )
    
    const flex = screen.getByTestId('responsive-flex')
    expect(flex).toBeInTheDocument()
    expect(flex).toHaveClass('flex')
    expect(flex).toHaveClass('flex-row')
  })

  it('should apply responsive configuration', () => {
    render(
      <ResponsiveFlex 
        responsive={{
          mobile: { direction: 'col', align: 'center' },
          tablet: { direction: 'row', justify: 'between' }
        }}
        data-testid="responsive-flex"
      >
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveFlex>
    )
    
    const flex = screen.getByTestId('responsive-flex')
    expect(flex).toHaveClass('flex-col')
    expect(flex).toHaveClass('items-center')
    expect(flex).toHaveClass('sm:flex-row')
    expect(flex).toHaveClass('sm:justify-between')
  })
})

describe('ResponsiveContainer Component', () => {
  it('should render with max width and padding', () => {
    render(
      <ResponsiveContainer maxWidth="lg" data-testid="container">
        <div>Content</div>
      </ResponsiveContainer>
    )
    
    const container = screen.getByTestId('container')
    expect(container).toHaveClass('max-w-lg')
    expect(container).toHaveClass('mx-auto')
    expect(container).toHaveClass('px-4')
  })

  it('should render without padding when specified', () => {
    render(
      <ResponsiveContainer padding={false} data-testid="container">
        <div>Content</div>
      </ResponsiveContainer>
    )
    
    const container = screen.getByTestId('container')
    expect(container).not.toHaveClass('px-4')
  })
})

describe('ResponsiveTable Component', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' }
  ]

  const mockColumns = [
    { key: 'name', title: 'Name', priority: 'high' as const },
    { key: 'email', title: 'Email', priority: 'medium' as const },
    { key: 'status', title: 'Status', priority: 'low' as const }
  ]

  it('should render table with data', () => {
    render(
      <ResponsiveTable 
        data={mockData} 
        columns={mockColumns}
      />
    )
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(
      <ResponsiveTable 
        data={[]} 
        columns={mockColumns}
        loading={true}
      />
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should show empty state', () => {
    render(
      <ResponsiveTable 
        data={[]} 
        columns={mockColumns}
        emptyMessage="No users found"
      />
    )
    
    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('should handle row clicks', () => {
    const onRowClick = vi.fn()
    
    render(
      <ResponsiveTable 
        data={mockData} 
        columns={mockColumns}
        onRowClick={onRowClick}
      />
    )
    
    const firstRow = screen.getByText('John Doe').closest('tr')
    if (firstRow) {
      fireEvent.click(firstRow)
      expect(onRowClick).toHaveBeenCalledWith(mockData[0], 0)
    }
  })
})

describe('MobileNavigation Component', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    )
  }

  it('should not render when closed', () => {
    renderWithRouter(
      <MobileNavigation isOpen={false} onClose={vi.fn()} />
    )
    
    expect(screen.queryByText('God Bless Platform')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    renderWithRouter(
      <MobileNavigation isOpen={true} onClose={vi.fn()} />
    )
    
    expect(screen.getByText('God Bless Platform')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    
    renderWithRouter(
      <MobileNavigation isOpen={true} onClose={onClose} />
    )
    
    const backdrop = document.querySelector('.fixed.inset-0.bg-black')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    
    renderWithRouter(
      <MobileNavigation isOpen={true} onClose={onClose} />
    )
    
    const closeButton = screen.getByLabelText('Close navigation')
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })
})