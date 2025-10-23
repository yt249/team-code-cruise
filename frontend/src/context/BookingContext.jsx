import { createContext, useContext, useState } from 'react';
import { rideService } from '../services/rideService';
import { paymentService } from '../services/paymentService';

const BookingContext = createContext();

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
}

export function BookingProvider({ children }) {
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [quote, setQuote] = useState(null);
  const [booking, setBooking] = useState(null);
  const [trip, setTrip] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tripProgress, setTripProgress] = useState(0);

  // Get fare quote (with optional discount token)
  const getFareQuote = async (pickup, dropoff, tokenId = null) => {
    setLoading(true);
    setError(null);
    try {
      // Expect pickup/dropoff to be { lat, lng } objects
      const quoteData = await rideService.getQuote(pickup, dropoff, tokenId);
      setQuote(quoteData);
      return quoteData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create ride (combines booking + driver assignment)
  // Backend automatically assigns driver when ride is created
  const requestRide = async (pickup, dropoff, quoteId, tokenId = null) => {
    setLoading(true);
    setError(null);
    try {
      // Backend creates ride and auto-assigns nearest driver
      const rideData = await rideService.createRide(pickup, dropoff, quoteId, tokenId);

      setBooking(rideData);
      setDriver(rideData.driver);

      // Set driver location (static from backend)
      if (rideData.driver && rideData.driver.location) {
        setDriverLocation(rideData.driver.location);
      }

      // Set initial trip state
      setTrip({
        state: 'DriverAssigned',
        startTime: rideData.createdAt
      });

      return rideData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Manual trip state updates (no animation)
  const updateTripState = (state) => {
    setTrip(prev => ({
      ...prev,
      state,
      ...(state === 'InTrip' && { pickupTime: Date.now() }),
      ...(state === 'Completed' && { endTime: Date.now() })
    }));
  };

  // Complete ride
  const completeRide = async () => {
    if (!booking || !booking.id) return;

    setLoading(true);
    try {
      await rideService.completeRide(booking.id);

      setTrip(prev => ({
        ...prev,
        state: 'Completed',
        endTime: Date.now()
      }));

      // Update booking status
      setBooking(prev => ({ ...prev, status: 'Completed' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel ride
  const cancelRide = async () => {
    if (!booking || !booking.id) return;

    setLoading(true);
    try {
      await rideService.cancelRide(booking.id);

      // Update local state
      setBooking(prev => ({ ...prev, status: 'Cancelled' }));
      setTrip(prev => prev ? { ...prev, state: 'Cancelled' } : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Payment handling
  const createPayment = async (rideId) => {
    setLoading(true);
    setError(null);
    try {
      const { intentId } = await paymentService.createPaymentIntent(rideId);
      return intentId;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (intentId, method = 'card') => {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.confirmPayment(intentId, method);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear quote (useful when user changes route)
  const clearQuote = () => {
    setQuote(null);
    setError(null);
  };

  // Reset all state
  const reset = () => {
    setPickupText('');
    setDropoffText('');
    setQuote(null);
    setBooking(null);
    setTrip(null);
    setDriver(null);
    setDriverLocation(null);
    setTripProgress(0);
    setError(null);
  };

  const value = {
    // State
    pickupText,
    setPickupText,
    dropoffText,
    setDropoffText,
    quote,
    booking,
    trip,
    driver,
    driverLocation,
    tripProgress,
    loading,
    error,
    // Quote methods
    getFareQuote,
    clearQuote,
    // Ride methods
    requestRide,
    completeRide,
    cancelRide,
    updateTripState,
    // Payment methods
    createPayment,
    confirmPayment,
    // Utility
    reset
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}
