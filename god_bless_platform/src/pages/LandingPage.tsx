/**
 * Landing Page
 * Modern landing page for the God Bless Platform with features showcase and CTAs
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiPhone, 
  FiMessageSquare, 
  FiDatabase, 
  FiZap, 
  FiShield, 
  FiTrendingUp, 
  FiCheckCircle, 
  FiArrowRight,
  FiMenu,
  FiX
} from 'react-icons/fi'
import { APP_NAME } from '../config'

/**
 * Landing Page Component
 */
export function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileMenuOpen(false)
  }

  const features = [
    {
      icon: <FiPhone className="text-3xl" />,
      title: 'Phone Number Generation',
      description: 'Generate up to 1 million phone numbers with advanced filtering by carrier, area code, and type. Real-time progress tracking included.',
      color: 'bg-blue-600'
    },
    {
      icon: <FiMessageSquare className="text-3xl" />,
      title: 'SMS Campaign Management',
      description: 'Create, schedule, and manage SMS campaigns with personalization macros, template library, and carrier-specific rate limiting.',
      color: 'bg-blue-600'
    },
    {
      icon: <FiDatabase className="text-3xl" />,
      title: 'Advanced Data Management',
      description: 'Export data in multiple formats (CSV, TXT, DOC, JSON) with advanced filtering, sorting, and pagination capabilities.',
      color: 'bg-blue-600'
    },
    {
      icon: <FiZap className="text-3xl" />,
      title: 'Background Processing',
      description: 'Celery-powered background tasks handle resource-intensive operations with real-time progress updates and notifications.',
      color: 'bg-blue-600'
    },
    {
      icon: <FiShield className="text-3xl" />,
      title: 'Intelligent Validation',
      description: 'Internal database validation system ensures accuracy and reliability without external API dependencies.',
      color: 'bg-blue-600'
    },
    {
      icon: <FiTrendingUp className="text-3xl" />,
      title: 'Real-time Analytics',
      description: 'Comprehensive dashboard with system health monitoring, task tracking, and delivery status reporting.',
      color: 'bg-blue-600'
    }
  ]

  const benefits = [
    'No external API dependencies - fully self-contained',
    'Process up to 1 million phone numbers in a single request',
    'Intelligent proxy and SMTP rotation for optimal delivery',
    'Personalization macros for dynamic SMS content',
    'Multi-format export with advanced filtering',
    'Production-ready Docker deployment'
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 nav-bg-transition ${
        scrolled 
          ? 'bg-white shadow-lg backdrop-blur-sm bg-opacity-95' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <FiPhone className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('benefits')}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Benefits
              </button>
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-left text-gray-700 hover:text-blue-600 transition-colors px-4 py-2"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="text-left text-gray-700 hover:text-blue-600 transition-colors px-4 py-2"
                >
                  Benefits
                </button>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 transition-colors px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="mx-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-fade-in">
              Open Source Intelligence
              <span className="block gradient-text mt-2">Platform</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Comprehensive phone number management, SMS campaigns, and validation tools 
              designed for professionals who demand efficiency and scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                Start Free Trial
                <FiArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => scrollToSection('features')}
                className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-600 hover:text-white transition-all"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-gray-50 animate-count-up animate-delay-100">
              <div className="text-4xl font-bold text-blue-600 mb-2">1M+</div>
              <div className="text-gray-600">Phone Numbers Generated</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50 animate-count-up animate-delay-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">Validation Accuracy</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50 animate-count-up animate-delay-300">
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Background Processing</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage phone numbers and SMS campaigns at scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-lg shadow-lg feature-card"
              >
                <div className={`${feature.color} w-16 h-16 rounded-lg flex items-center justify-center text-white mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Why Choose Our Platform?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Built for professionals who need reliable, scalable, and efficient tools 
                for phone number management and SMS campaigns.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <FiCheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-600 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-2xl text-white">
              <h3 className="text-3xl font-bold mb-6">Ready to Get Started?</h3>
              <p className="text-lg mb-8 opacity-90">
                Join professionals who trust our platform for their phone number 
                management and SMS campaign needs.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>No credit card required</span>
                </li>
                <li className="flex items-center gap-3">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>Full feature access</span>
                </li>
                <li className="flex items-center gap-3">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>24/7 support</span>
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full text-center px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start Managing Phone Numbers Today
          </h2>
          <p className="text-xl text-white opacity-90 mb-8">
            Join thousands of professionals using our platform to streamline their operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-white text-white rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                  <FiPhone className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {APP_NAME}
                </h3>
              </div>
              <p className="text-gray-600">
                Open Source Intelligence Platform
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <Link to="/login" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center">
            <p className="text-gray-600">
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}