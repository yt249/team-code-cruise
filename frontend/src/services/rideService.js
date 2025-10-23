/**
 * Ride Service - Backend API Integration
 * Handles quotes, ride creation, and ride management
 */

import { getAuthToken } from './authService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Convert frontend coordinate format to backend format
 * Frontend: { lat, lng } → Backend: { lat, lon }
 */
const toBackendCoords = (location) => ({
  lat: location.lat,
  lon: location.lng || location.lon
});

/**
 * Convert backend coordinate format to frontend format
 * Backend: { lat, lon } → Frontend: { lat, lng }
 */
const toFrontendCoords = (location) => ({
  lat: location.lat,
  lng: location.lon || location.lng
});

/**
 * Convert cents to dollars
 */
const toDollars = (cents) => cents / 100;

/**
 * Map backend RideStatus enum to frontend status
 */
const STATUS_MAP = {
  'REQUESTED': 'Requested',
  'MATCHING': 'Finding Driver',
  'DRIVER_ASSIGNED': 'DriverAssigned',
  'DRIVER_EN_ROUTE': 'DriverEnRoute',
  'IN_RIDE': 'InProgress',
  'COMPLETED': 'Completed',
  'CANCELLED': 'Cancelled'
};

/**
 * Handle API response errors
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));

    switch (response.status) {
      case 401:
        throw new Error('Session expired. Please log in again.');
      case 403:
        throw new Error('You do not have permission to perform this action.');
      case 404:
        throw new Error('Resource not found.');
      case 409:
        throw new Error(error.error || 'Conflict - please try again.');
      case 410:
        throw new Error('This resource has expired.');
      default:
        throw new Error(error.error || `Error: ${response.status}`);
    }
  }

  return response.json();
}

/**
 * Ride API Service
 */
export const rideService = {
  /**
   * Get fare quote
   * @param {Object} pickup - { lat, lng }
   * @param {Object} dropoff - { lat, lng }
   * @param {string} tokenId - Optional discount token ID
   * @returns {Promise<Object>} Quote object
   */
  async getQuote(pickup, dropoff, tokenId = null) {
    const body = {
      pickup: toBackendCoords(pickup),
      dest: toBackendCoords(dropoff)
    };

    if (tokenId) {
      body.tokenId = tokenId;
      // Add auth header if using discount token
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required to use discount token');
      }
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add auth if available (optional for quotes)
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await handleResponse(response);

    // Transform response to frontend format
    return {
      id: data.id,
      fare: toDollars(data.amount),
      baseFare: toDollars(data.amount),
      surge: data.surge,
      currency: data.currency,
      eta: data.etaMinutes,
      expiresAt: new Date(data.expiresAt).getTime(),
      discountApplied: data.discountApplied || false,
      discountPercent: data.discountPercent || null,
      discountedAmount: data.discountedAmount ? toDollars(data.discountedAmount) : null,
      discountTokenId: data.discountTokenId || null,
      createdAt: Date.now()
    };
  },

  /**
   * Create a new ride
   * @param {Object} pickup - { lat, lng }
   * @param {Object} dropoff - { lat, lng }
   * @param {string} quoteId - Quote ID
   * @param {string} tokenId - Optional discount token ID
   * @returns {Promise<Object>} Ride object with driver assignment
   */
  async createRide(pickup, dropoff, quoteId, tokenId = null) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const body = {
      pickup: toBackendCoords(pickup),
      dest: toBackendCoords(dropoff),
      quoteId
    };

    if (tokenId) {
      body.tokenId = tokenId;
    }

    const response = await fetch(`${API_BASE}/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await handleResponse(response);

    // Transform response to frontend format
    return {
      id: data.id,
      riderId: data.riderId,
      driverId: data.driverId,
      status: STATUS_MAP[data.status] || data.status,
      pickup: toFrontendCoords(data.pickup),
      dropoff: toFrontendCoords(data.destination),
      baseFare: toDollars(data.fareAmount),
      finalFare: data.discountedAmount ? toDollars(data.discountedAmount) : toDollars(data.fareAmount),
      discountAmount: data.discountPercent ? (toDollars(data.fareAmount) * data.discountPercent / 100) : 0,
      surge: parseFloat(data.surge),
      currency: data.currency,
      driver: data.driver ? {
        id: data.driver.id,
        name: data.driver.name,
        rating: data.driver.rating,
        phone: data.driver.phone || 'N/A',
        vehicle: data.driver.vehicle ? {
          make: data.driver.vehicle.make,
          model: data.driver.vehicle.model,
          plate: data.driver.vehicle.plate,
          type: data.driver.vehicle.type
        } : null,
        location: data.driver.location ? toFrontendCoords(data.driver.location) : null
      } : null,
      startedAt: data.startedAt ? new Date(data.startedAt).getTime() : null,
      completedAt: data.completedAt ? new Date(data.completedAt).getTime() : null,
      createdAt: new Date(data.createdAt).getTime()
    };
  },

  /**
   * Get ride details
   * @param {string} rideId - Ride ID
   * @returns {Promise<Object>} Ride object
   */
  async getRide(rideId) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/rides/${rideId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await handleResponse(response);

    // Transform response to frontend format (same as createRide)
    return {
      id: data.id,
      riderId: data.riderId,
      driverId: data.driverId,
      status: STATUS_MAP[data.status] || data.status,
      pickup: toFrontendCoords(data.pickup),
      dropoff: toFrontendCoords(data.destination),
      baseFare: toDollars(data.fareAmount),
      finalFare: data.discountedAmount ? toDollars(data.discountedAmount) : toDollars(data.fareAmount),
      discountAmount: data.discountPercent ? (toDollars(data.fareAmount) * data.discountPercent / 100) : 0,
      surge: parseFloat(data.surge),
      currency: data.currency,
      driver: data.driver ? {
        id: data.driver.id,
        name: data.driver.name,
        rating: data.driver.rating,
        phone: data.driver.phone || 'N/A',
        vehicle: data.driver.vehicle ? {
          make: data.driver.vehicle.make,
          model: data.driver.vehicle.model,
          plate: data.driver.vehicle.plate,
          type: data.driver.vehicle.type
        } : null,
        location: data.driver.location ? toFrontendCoords(data.driver.location) : null
      } : null,
      startedAt: data.startedAt ? new Date(data.startedAt).getTime() : null,
      completedAt: data.completedAt ? new Date(data.completedAt).getTime() : null,
      createdAt: new Date(data.createdAt).getTime()
    };
  },

  /**
   * Cancel a ride
   * @param {string} rideId - Ride ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelRide(rideId) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return handleResponse(response);
  },

  /**
   * Complete a ride
   * @param {string} rideId - Ride ID
   * @returns {Promise<Object>} Completion result
   */
  async completeRide(rideId) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE}/rides/${rideId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return handleResponse(response);
  }
};
