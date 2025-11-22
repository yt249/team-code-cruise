/**
 * Ad Service - Backend API Integration
 * Handles advertisement sessions, playback tracking, and discount tokens
 */

import { getAuthToken } from './authService';
import { getApiBaseUrl } from './apiConfig';

const API_BASE = getApiBaseUrl();

/**
 * Handle API response errors
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));

    switch (response.status) {
      case 401:
        throw new Error('Session expired. Please log in again.');
      case 409:
        // Ad cooldown or eligibility conflict
        if (error.cooldownEndsAt) {
          const cooldownDate = new Date(error.cooldownEndsAt);
          throw new Error(`Please wait until ${cooldownDate.toLocaleTimeString()} to watch another ad.`);
        }
        throw new Error(error.error || 'You are not eligible to watch ads right now.');
      case 410:
        throw new Error('This ad session has expired.');
      case 422:
        throw new Error(error.error || 'Invalid ad playback sequence.');
      default:
        throw new Error(error.error || `Error: ${response.status}`);
    }
  }

  return response.json();
}

/**
 * Ad API Service
 */
export const adService = {
  /**
   * Check ad eligibility for current user
   * @returns {Promise<Object>} Eligibility status { isEligible, cooldownEndsAt? }
   */
  async checkEligibility() {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/ads/eligibility`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await handleResponse(response);

    // Transform backend response { eligible } to frontend format { isEligible }
    return {
      isEligible: data.eligible,
      cooldownEndsAt: data.cooldownEndsAt || null
    };
  },

  /**
   * Create ad session
   * @param {number} percent - Discount percentage (10-15)
   * @returns {Promise<Object>} Session object { sessionId, provider, percent, expiresAt }
   */
  async createSession(percent) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/ads/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ percent })
    });

    const data = await handleResponse(response);

    // Transform to frontend format
    return {
      id: data.sessionId,
      sessionId: data.sessionId,
      provider: data.provider,
      percent: data.percent,
      discountPercentage: data.percent,
      expiresAt: new Date(data.expiresAt).getTime(),
      status: 'Offered',
      createdAt: Date.now()
    };
  },

  /**
   * Record playback event
   * @param {string} sessionId - Ad session ID
   * @param {string} event - Event type: 'start' | '25%' | '50%' | '75%' | 'complete'
   * @param {Date} timestamp - Optional timestamp
   * @returns {Promise<Object>}
   */
  async recordPlayback(sessionId, event, timestamp = null) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const body = {
      sessionId,
      event
    };

    if (timestamp) {
      body.ts = timestamp.toISOString();
    }

    const response = await fetch(`${API_BASE}/ads/playback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    return handleResponse(response);
  },

  /**
   * Complete ad session and get discount token
   * @param {string} sessionId - Ad session ID
   * @returns {Promise<Object>} Token object { tokenId, expiresAt }
   */
  async completeSession(sessionId) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/ads/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId })
    });

    const data = await handleResponse(response);

    // Transform to frontend format
    return {
      tokenId: data.tokenId,
      id: data.tokenId,
      expiresAt: new Date(data.expiresAt).getTime(),
      createdAt: Date.now()
    };
  },

  /**
   * Helper: Record ad start event
   */
  async recordStart(sessionId) {
    return this.recordPlayback(sessionId, 'start', new Date());
  },

  /**
   * Helper: Record ad quartile events
   */
  async recordQuartile(sessionId, quartile) {
    const validQuartiles = ['25%', '50%', '75%'];
    if (!validQuartiles.includes(quartile)) {
      throw new Error(`Invalid quartile: ${quartile}`);
    }
    return this.recordPlayback(sessionId, quartile, new Date());
  },

  /**
   * Helper: Record ad complete event
   */
  async recordComplete(sessionId) {
    return this.recordPlayback(sessionId, 'complete', new Date());
  }
};
