import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPhone, FiMessageSquare, FiDatabase, FiZap, FiShield, FiTrendingUp, FiCheckCircle, FiArrowRight } from 'react-icons/fi';

const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const features = [
    {
      icon: <FiPhone className="text-3xl" />,
      title: 'Phone Number Generation',
      description: 'Generate up to 1 million phone numbers with advanced filtering by carrier, area code, and type. Real-time progress tracking included.',
      color: 'bg-primary'
    },
    {
      icon: <FiMessageSquare className="text-3xl" />,
      title: 'SMS Campaign Management',
      description: 'Create, schedule, and manage SMS campaigns with personalization macros, template library, and carrier-specific rate limiting.',
      color: 'bg-primary'
    },
    {
      icon: <FiDatabase className="text-3xl" />,
      title: 'Advanced Data Management',
      description: 'Export data in multiple formats (CSV, TXT, DOC, JSON) with advanced filtering, sorting, and pagination capabilities.',
      color: 'bg-primary'
    },
    {
      icon: <FiZap className="text-3xl" />,
      title: 'Background Processing',
      description: 'Celery-powered background tasks handle resource-intensive operations with real-time progress updates and notifications.',
      color: 'bg-primary'
    },
    {
      icon: <FiShield className="text-3xl" />,
      title: 'Intelligent Validation',
      description: 'Internal database validation system ensures accuracy and reliability without external API dependencies.',
      color: 'bg-primary'
    },
    {
      icon: <FiTrendingUp className="text-3xl" />,
      title: 'Real-time Analytics',
      description: 'Comprehensive dashboard with system health monitoring, task tracking, and delivery status reporting.',
      color: 'bg-primary'
    }
  ];

  const benefits = [
    'No external API dependencies - fully self-contained',
    'Process up to 1 million phone numbers in a single request',
    'Intelligent proxy and SMTP rotation for optimal delivery',
    'Personalization macros for dynamic SMS content',
    'Multi-format export with advanced filtering',
    'Production-ready Docker deployment'
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-boxdark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-boxdark border-b border-stroke dark:border-strokedark backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">God Bless America</h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-body dark:text-bodydark hover:text-primary transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('benefits')}
                className="text-body dark:text-bodydark hover:text-primary transition-colors"
              >
                Benefits
              </button>
              <Link
                to="/signin"
                className="text-body dark:text-bodydark hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white mb-6 animate-fade-in">
              Open Source Intelligence
              <span className="block text-primary mt-2">Platform</span>
            </h1>
            <p className="text-xl md:text-2xl text-body dark:text-bodydark mb-8 max-w-3xl mx-auto">
              Comprehensive phone number management, SMS campaigns, and validation tools 
              designed for professionals who demand efficiency and scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-primary text-white rounded-lg text-lg font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                Start Free Trial
                <FiArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => scrollToSection('features')}
                className="px-8 py-4 border-2 border-primary text-primary dark:text-primary rounded-lg text-lg font-semibold hover:bg-primary hover:text-white transition-all"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-meta-4">
              <div className="text-4xl font-bold text-primary mb-2">1M+</div>
              <div className="text-body dark:text-bodydark">Phone Numbers Generated</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-meta-4">
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-body dark:text-bodydark">Validation Accuracy</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-meta-4">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-body dark:text-bodydark">Background Processing</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-meta-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-body dark:text-bodydark max-w-2xl mx-auto">
              Everything you need to manage phone numbers and SMS campaigns at scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-boxdark p-8 rounded-lg shadow-default hover:shadow-lg transition-all transform hover:-translate-y-1"
              >
                <div className={`${feature.color} w-16 h-16 rounded-lg flex items-center justify-center text-white mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-body dark:text-bodydark">
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
              <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-6">
                Why Choose Our Platform?
              </h2>
              <p className="text-xl text-body dark:text-bodydark mb-8">
                Built for professionals who need reliable, scalable, and efficient tools 
                for phone number management and SMS campaigns.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <FiCheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <span className="text-body dark:text-bodydark text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-2xl text-white">
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
                to="/signup"
                className="block w-full text-center px-8 py-4 bg-white text-primary rounded-lg text-lg font-semibold hover:bg-opacity-90 transition-all"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start Managing Phone Numbers Today
          </h2>
          <p className="text-xl text-white opacity-90 mb-8">
            Join thousands of professionals using our platform to streamline their operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 bg-white text-primary rounded-lg text-lg font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              to="/signin"
              className="px-8 py-4 border-2 border-white text-white rounded-lg text-lg font-semibold hover:bg-white hover:text-primary transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-meta-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-4">
                God Bless America
              </h3>
              <p className="text-body dark:text-bodydark">
                Open Source Intelligence Platform
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="text-body dark:text-bodydark hover:text-primary transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <Link to="/signin" className="text-body dark:text-bodydark hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-body dark:text-bodydark hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-body dark:text-bodydark hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-body dark:text-bodydark hover:text-primary transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-body dark:text-bodydark hover:text-primary transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stroke dark:border-strokedark pt-8 text-center">
            <p className="text-body dark:text-bodydark">
              © {new Date().getFullYear()} God Bless America. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
