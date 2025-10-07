import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, isTokenExpired, redirectToLogin } from '../utils/auth';
import Loader from '../common/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that checks authentication before rendering children
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          console.log('User not authenticated, redirecting to login');
          setShouldRedirect(true);
          return;
        }

        // Check if token is expired
        if (isTokenExpired()) {
          console.log('Token expired, redirecting to login');
          setShouldRedirect(true);
          return;
        }

        // User is authenticated and token is valid
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setShouldRedirect(true);
      }
    };

    checkAuth();
  }, []);

  // Handle redirect with intended destination
  useEffect(() => {
    if (shouldRedirect) {
      try {
        sessionStorage.setItem('intendedDestination', location.pathname);
      } catch (error) {
        console.warn('Could not store intended destination:', error);
      }
      setIsChecking(false);
    }
  }, [shouldRedirect, location.pathname]);

  // Show loader while checking authentication
  if (isChecking) {
    return <Loader />;
  }

  // Redirect to login if not authenticated
  if (shouldRedirect) {
    return <Navigate to="/signin" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;