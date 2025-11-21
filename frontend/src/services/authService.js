/**
 * Authentication Service
 * Handles user login, token management, and authentication state
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
console.log('[authService] API_BASE =', API_BASE, 'import.meta.env.VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
const AUTH_TOKEN_KEY = 'rideshare_auth_token';

/**
 * Get stored authentication token
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Store authentication token
 */
export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Clear authentication token
 */
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Authentication Service API
 */
export const authService = {
  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{token: string}>}
   */
  async login(email, password) {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setAuthToken(data.token);
    return data;
  },

  /**
   * Logout user
   */
  logout() {
    clearAuthToken();
  },

  /**
   * Get current user profile
   * Requires authentication
   * @returns {Promise<{id: string, name: string, email: string, rating: number}>}
   */
  async getProfile() {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        throw new Error('Session expired. Please login again.');
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to get profile');
    }

    return response.json();
  },

  /**
   * Reset test data (drivers and rides) for testing
   * Requires authentication
   * @returns {Promise<Object>}
   */
  async resetTestData() {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}/reset-test-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Reset failed' }));
      throw new Error(error.error || 'Failed to reset test data');
    }

    return response.json();
  }
};
