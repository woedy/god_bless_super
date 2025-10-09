/**
 * Landing Page Tests
 * Tests for the landing page component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LandingPage } from '../LandingPage'

// Wrapper component for router context
const LandingPageWrapper = () => (
  <BrowserRouter>
    <LandingPage />
  </BrowserRouter>
)

describe('LandingPage', () => {
  it('should render the main heading', () => {
    render(<LandingPageWrapper />)
    
    expect(screen.getByText('Open Source Intelligence')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(<LandingPageWrapper />)
    
    expect(screen.getAllByText('Features').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Benefits').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0)
  })

  it('should render CTA buttons', () => {
    render(<LandingPageWrapper />)
    
    const getStartedButtons = screen.getAllByText('Get Started')
    expect(getStartedButtons.length).toBeGreaterThan(0)
    
    const startFreeTrialButton = screen.getByText('Start Free Trial')
    expect(startFreeTrialButton).toBeInTheDocument()
  })

  it('should render feature cards', () => {
    render(<LandingPageWrapper />)
    
    expect(screen.getByText('Phone Number Generation')).toBeInTheDocument()
    expect(screen.getByText('SMS Campaign Management')).toBeInTheDocument()
    expect(screen.getByText('Advanced Data Management')).toBeInTheDocument()
    expect(screen.getAllByText('Background Processing').length).toBeGreaterThan(0)
    expect(screen.getByText('Intelligent Validation')).toBeInTheDocument()
    expect(screen.getByText('Real-time Analytics')).toBeInTheDocument()
  })

  it('should render statistics', () => {
    render(<LandingPageWrapper />)
    
    expect(screen.getByText('1M+')).toBeInTheDocument()
    expect(screen.getByText('Phone Numbers Generated')).toBeInTheDocument()
    expect(screen.getByText('99.9%')).toBeInTheDocument()
    expect(screen.getByText('Validation Accuracy')).toBeInTheDocument()
    expect(screen.getByText('24/7')).toBeInTheDocument()
    expect(screen.getAllByText('Background Processing').length).toBeGreaterThan(0)
  })

  it('should render footer', () => {
    render(<LandingPageWrapper />)
    
    expect(screen.getByText('Open Source Intelligence Platform')).toBeInTheDocument()
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
  })
})