import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to error tracking service (e.g., Sentry, LogRocket)
    this.logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Send error to backend logging endpoint
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Send to backend (non-blocking)
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:6161'}/api/logs/frontend-error/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
    }).catch((err) => {
      console.error('Failed to log error to service:', err);
    });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-boxdark-2 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-boxdark p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <FiAlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  We're sorry for the inconvenience. The error has been logged and we'll look into it.
                </p>
              </div>
            </div>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 rounded-lg bg-gray-50 dark:bg-meta-4 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Error Details (Development Mode)
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Message:</p>
                    <p className="text-sm text-red-600 dark:text-red-400 font-mono">
                      {this.state.error.message}
                    </p>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stack Trace:</p>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto bg-white dark:bg-boxdark p-2 rounded">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded bg-primary px-6 py-3 text-white hover:bg-opacity-90 transition-all"
              >
                <FiRefreshCw className="h-5 w-5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 rounded border border-stroke dark:border-strokedark px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 transition-all"
              >
                <FiHome className="h-5 w-5" />
                Go Home
              </button>
            </div>

            {/* Support Information */}
            <div className="mt-6 pt-6 border-t border-stroke dark:border-strokedark">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
