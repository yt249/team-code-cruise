import { createContext, useContext, useState } from 'react';
import { mockBookingService } from '../services/mockBookingService';
import { geocodeLocation } from '../data/mockRoutes';
import { simulateDriverMovement } from '../data/mockDrivers';

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

  // Get fare quote
  const getFareQuote = async (pickup, dropoff) => {
    setLoading(true);
    setError(null);
    try {
      const pickupLocation = typeof pickup === 'string' ? geocodeLocation(pickup) : pickup;
      const dropoffLocation = typeof dropoff === 'string' ? geocodeLocation(dropoff) : dropoff;

      const quoteData = await mockBookingService.getFareQuote(pickupLocation, dropoffLocation);
      setQuote(quoteData);
      return quoteData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create booking with optional discount
  const createBooking = async (quoteData, discount = null) => {
    setLoading(true);
    setError(null);
    try {
      const bookingData = await mockBookingService.createBooking(quoteData, discount);
      setBooking(bookingData);
      return bookingData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Request driver
  const requestDriver = async (bookingData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedBooking = await mockBookingService.requestDriver(bookingData);
      setBooking(updatedBooking);
      setDriver(updatedBooking.driver);
      setDriverLocation(updatedBooking.driver.location);

      // Start trip simulation
      startTripSimulation(updatedBooking);

      return updatedBooking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Start trip simulation (driver movement)
  const startTripSimulation = (bookingData) => {
    const driver = bookingData.driver;
    const destination = bookingData.pickup;

    setTrip({
      state: 'DriverEnRoute',
      startTime: Date.now()
    });

    // Simulate driver moving to pickup
    const interval = simulateDriverMovement(driver, destination, (newLocation, progress) => {
      setDriverLocation(newLocation);
      setTripProgress(progress);

      // Driver arrived
      if (progress >= 1) {
        setTrip(prev => ({
          ...prev,
          state: 'ArrivedAtPickup'
        }));
      }
    });

    return interval;
  };

  // Start trip (rider picked up)
  const startTrip = () => {
    setTrip(prev => ({
      ...prev,
      state: 'InTrip',
      pickupTime: Date.now()
    }));

    // Simulate trip to destination
    if (booking && driver) {
      const interval = simulateDriverMovement(
        { ...driver, location: driverLocation },
        booking.dropoff,
        (newLocation, progress) => {
          setDriverLocation(newLocation);
          setTripProgress(progress);

          // Trip completed
          if (progress >= 1) {
            completeTrip();
          }
        }
      );
      return interval;
    }
  };

  // Complete trip
  const completeTrip = async () => {
    if (!booking) return;

    try {
      const completedBooking = await mockBookingService.completeTrip(booking);
      setBooking(completedBooking);
      setTrip(prev => ({
        ...prev,
        state: 'Completed',
        endTime: Date.now()
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  // Cancel booking
  const cancelBooking = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      const cancelledBooking = await mockBookingService.cancelBooking(booking);
      setBooking(cancelledBooking);
      setDriver(null);
      setTrip(null);
      setDriverLocation(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    getFareQuote,
    createBooking,
    requestDriver,
    startTrip,
    completeTrip,
    cancelBooking,
    reset
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}
