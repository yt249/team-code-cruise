import { generateId, delay } from '../utils/helpers';
import { getRoute } from '../data/mockRoutes';
import { getNearestDriver } from '../data/mockDrivers';

// Mock booking service
export const mockBookingService = {
  // Get fare quote
  async getFareQuote(pickup, dropoff) {
    await delay(800); // Simulate network delay

    const route = getRoute(pickup, dropoff);

    return {
      id: generateId(),
      ...route,
      expiresAt: Date.now() + 300000, // 5 minutes
      createdAt: Date.now()
    };
  },

  // Create booking
  async createBooking(quote, discount = null) {
    await delay(1000);

    const baseFare = quote.fare;
    const discountAmount = discount ? (baseFare * discount.percentage) / 100 : 0;
    const finalFare = baseFare - discountAmount;

    return {
      id: generateId(),
      quoteId: quote.id,
      pickup: quote.pickup,
      dropoff: quote.dropoff,
      baseFare,
      discountAmount,
      finalFare,
      distance: quote.distance,
      status: 'Requested',
      createdAt: Date.now(),
      discount: discount
    };
  },

  // Request driver
  async requestDriver(booking) {
    await delay(2000); // Simulate searching for driver

    const driver = getNearestDriver(booking.pickup);

    if (!driver) {
      throw new Error('No drivers available');
    }

    return {
      ...booking,
      status: 'DriverAssigned',
      driver,
      assignedAt: Date.now()
    };
  },

  // Complete trip
  async completeTrip(booking) {
    await delay(1000);

    return {
      ...booking,
      status: 'Completed',
      completedAt: Date.now()
    };
  },

  // Cancel booking
  async cancelBooking(booking) {
    await delay(500);

    return {
      ...booking,
      status: 'Cancelled',
      cancelledAt: Date.now()
    };
  }
};
