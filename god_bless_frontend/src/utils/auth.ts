/**
 * Authentication utilities for the God Bless platform
 */

import { getUserToken, getUserID, getUsername, getUserEmail } from '../constants';

export interface User {
  id: string;
  username: string;
  email: string;
  photo?: string;
}

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = (): boolean => {
  try {
    const token = getUserToken();
    const userId = getUserID();
    return !!(token && userId);
  } catch (error) {
    console.warn('Error checking authentication status:', error);
    return false;
  }
};

/**
 * Get current user data from localStorage
 */
export const getCurrentUser = (): User | null => {
  try {
    if (!isAuthenticated()) {
      return null;
    }

    const id = getUserID();
    const username = getUsername();
    const email = getUserEmail();

    if (!id || !username || !email) {
      return null;
    }

    return {
      id,
      username,
      email,
      photo: localStorage.getItem('photo') || undefined,
    };
  } catch (error) {
    console.warn('Error getting current user:', error);
    return null;
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('photo');
    sessionStorage.clear();
  } catch (error) {
    console.warn('Error clearing authentication data:', error);
  }
};

/**
 * Check if token is expired (basic check)
 * Note: This is a simple check. In production, you'd want to validate with the server
 */
export const isTokenExpired = (): boolean => {
  const token = getUserToken();
  if (!token) return true;

  try {
    // Basic JWT token structure check
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode payload (basic check without verification)
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    return payload.exp && payload.exp < currentTime;
  } catch (error) {
    console.warn('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Redirect to login with intended destination
 */
export const redirectToLogin = (intendedPath?: string): void => {
  if (intendedPath && typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('intendedDestination', intendedPath);
    } catch (error) {
      console.warn('Could not store intended destination:', error);
    }
  }
  
  // Use window.location for full page redirect to ensure clean state
  if (typeof window !== 'undefined') {
    window.location.href = '/signin';
  }
};

/**
 * Handle authentication errors (token expired, unauthorized, etc.)
 */
export const handleAuthError = (): void => {
  clearAuthData();
  redirectToLogin(window.location.pathname);
};