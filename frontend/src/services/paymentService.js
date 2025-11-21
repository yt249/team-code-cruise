/**
 * Payment Service - Backend API Integration
 * Handles payment intent creation and confirmation
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
      case 404:
        throw new Error('Payment intent not found.');
      case 409:
        throw new Error(error.error || 'Payment conflict.');
      default:
        throw new Error(error.error || 'Payment failed. Please try again.');
    }
  }

  return response.json();
}

/**
 * Payment API Service
 */
export const paymentService = {
  /**
   * Create payment intent for a ride
   * @param {string} rideId - Ride ID
   * @returns {Promise<Object>} Payment intent { intentId }
   */
  async createPaymentIntent(rideId) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/payments/intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rideId })
    });

    return handleResponse(response);
  },

  /**
   * Confirm payment with method
   * @param {string} intentId - Payment intent ID
   * @param {string} method - Payment method (e.g., 'card', 'cash')
   * @returns {Promise<Object>} Payment status { status }
   */
  async confirmPayment(intentId, method) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        intentId,
        method
      })
    });

    const data = await handleResponse(response);

    return {
      status: data.status, // 'PAID' or 'FAILED'
      success: data.status === 'PAID'
    };
  }
};
