/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { rideService } from '../services/rideService';
import { paymentService } from '../services/paymentService';
import { calculateTripDistance, calculateDriverETA, getRoutePath } from '../utils/googleMaps';

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
  const [tripDistance, setTripDistance] = useState(null); // { distance: km, duration: min, distanceText, durationText }
  const [driverETA, setDriverETA] = useState(null); // { distance: km, duration: min, distanceText, durationText }
  const driverAnimationRef = useRef(null);
  const initialDriverLocationRef = useRef(null);
  const routePathRef = useRef(null); // Store route path for animation

  // Simulate driver movement towards pickup following actual roads
   
  useEffect(() => {
    // Only start animation when trip state changes to DriverEnRoute
    if (!trip || trip.state !== 'DriverEnRoute' || !booking || !booking.pickup) {
      return;
    }

    // Don't restart animation if already running
    if (driverAnimationRef.current) {
      return;
    }

    // Store initial driver location when animation starts
    if (!initialDriverLocationRef.current && driverLocation) {
      initialDriverLocationRef.current = { ...driverLocation };
    }

    if (!initialDriverLocationRef.current) {
      return;
    }

    const pickup = booking.pickup;
    const updateInterval = 2000; // Update every 2 seconds


    // Fetch the actual route path first
    getRoutePath(initialDriverLocationRef.current, pickup)
      .then(path => {
        // Validate path has points
        if (!path || path.length === 0) {
          throw new Error('Route path is empty');
        }

        routePathRef.current = path;

        const totalSteps = driverETA ? Math.ceil(driverETA.duration * 60 / 2) : 60; // Total steps based on ETA
        let currentStep = 0;

        driverAnimationRef.current = setInterval(() => {
          currentStep++;
          const progress = Math.min(currentStep / totalSteps, 1);

          // Calculate position along the route path with safety check
          const pathIndex = Math.min(Math.floor(progress * (path.length - 1)), path.length - 1);
          const currentPoint = path[pathIndex];

          if (currentPoint && currentPoint.lat !== undefined && currentPoint.lng !== undefined) {
            setDriverLocation(currentPoint);
          }
          setTripProgress(progress);

          // If driver reached pickup, stop animation and transition state
          if (progress >= 1) {
            clearInterval(driverAnimationRef.current);
            driverAnimationRef.current = null;

            // Automatically transition to ArrivedAtPickup state
            setTrip(prev => ({
              ...prev,
              state: 'ArrivedAtPickup'
            }));
          }
        }, updateInterval);
      })
      .catch(err => {
        console.error('[Animation] Failed to fetch route path, falling back to linear animation:', err);

        // Fallback to linear interpolation if route fetching fails
        const totalSteps = driverETA ? Math.ceil(driverETA.duration * 60 / 2) : 60;
        let currentStep = 0;

        driverAnimationRef.current = setInterval(() => {
          currentStep++;
          const progress = Math.min(currentStep / totalSteps, 1);

          const newLat = initialDriverLocationRef.current.lat + (pickup.lat - initialDriverLocationRef.current.lat) * progress;
          const newLng = initialDriverLocationRef.current.lng + (pickup.lng - initialDriverLocationRef.current.lng) * progress;

          setDriverLocation({ lat: newLat, lng: newLng });
          setTripProgress(progress);

          if (progress >= 1) {
            clearInterval(driverAnimationRef.current);
            driverAnimationRef.current = null;

            setTrip(prev => ({
              ...prev,
              state: 'ArrivedAtPickup'
            }));
          }
        }, updateInterval);
      });

    return () => {
      if (driverAnimationRef.current) {
        clearInterval(driverAnimationRef.current);
        driverAnimationRef.current = null;
      }
    };
  }, 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [trip?.state]); // Only depend on trip state change

  // Simulate driver movement from pickup to destination during trip following actual roads
   
  useEffect(() => {
    // Only start animation when trip state changes to InTrip
    if (!trip || trip.state !== 'InTrip' || !booking || !booking.pickup || !booking.dropoff) {
      return;
    }

    // Don't restart animation if already running
    if (driverAnimationRef.current) {
      return;
    }

    // Reset initial location to pickup when starting trip
    initialDriverLocationRef.current = { ...booking.pickup };

    const destination = booking.dropoff;
    const updateInterval = 2000; // Update every 2 seconds


    // Fetch the actual route path first
    getRoutePath(booking.pickup, destination)
      .then(path => {
        // Validate path has points
        if (!path || path.length === 0) {
          throw new Error('Route path is empty');
        }

        routePathRef.current = path;

        const totalSteps = tripDistance ? Math.ceil(tripDistance.duration * 60 / 2) : 90; // Total steps based on trip duration
        let currentStep = 0;

        driverAnimationRef.current = setInterval(() => {
          currentStep++;
          const progress = Math.min(currentStep / totalSteps, 1);

          // Calculate position along the route path with safety check
          const pathIndex = Math.min(Math.floor(progress * (path.length - 1)), path.length - 1);
          const currentPoint = path[pathIndex];

          if (currentPoint && currentPoint.lat !== undefined && currentPoint.lng !== undefined) {
            setDriverLocation(currentPoint);
          }
          setTripProgress(progress);

          // If driver reached destination, stop animation and complete trip
          if (progress >= 1) {
            clearInterval(driverAnimationRef.current);
            driverAnimationRef.current = null;

            // Automatically complete the trip
            completeRide();
          }
        }, updateInterval);
      })
      .catch(err => {
        console.error('[Animation] Failed to fetch trip route path, falling back to linear animation:', err);

        // Fallback to linear interpolation if route fetching fails
        const totalSteps = tripDistance ? Math.ceil(tripDistance.duration * 60 / 2) : 90;
        let currentStep = 0;

        driverAnimationRef.current = setInterval(() => {
          currentStep++;
          const progress = Math.min(currentStep / totalSteps, 1);

          const newLat = initialDriverLocationRef.current.lat + (destination.lat - initialDriverLocationRef.current.lat) * progress;
          const newLng = initialDriverLocationRef.current.lng + (destination.lng - initialDriverLocationRef.current.lng) * progress;

          setDriverLocation({ lat: newLat, lng: newLng });
          setTripProgress(progress);

          if (progress >= 1) {
            clearInterval(driverAnimationRef.current);
            driverAnimationRef.current = null;
            completeRide();
          }
        }, updateInterval);
      });

    return () => {
      if (driverAnimationRef.current) {
        clearInterval(driverAnimationRef.current);
        driverAnimationRef.current = null;
      }
    };
  }, 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [trip?.state]); // Only depend on trip state change

  // Get fare quote (with optional discount token)
  const getFareQuote = async (pickup, dropoff, tokenId = null) => {
    setLoading(true);
    setError(null);
    try {
      // Calculate trip distance using Google Maps API (non-blocking)
      try {
        const distanceData = await calculateTripDistance(pickup, dropoff);
        setTripDistance(distanceData);
      } catch (distErr) {
        console.error('[BookingContext] Failed to calculate trip distance:', distErr);
        // Continue without distance - not critical
      }

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
  const requestRide = async (pickup, dropoff, quoteId, tokenId = null, pickupAddress = null, dropoffAddress = null) => {
    setLoading(true);
    setError(null);
    try {
      // Backend creates ride and auto-assigns nearest driver
      const rideData = await rideService.createRide(pickup, dropoff, quoteId, tokenId);

      // Add addresses to the already-normalized ride data (rideService already converted lon->lng and dest->dropoff)
      const normalizedRideData = {
        ...rideData,
        pickup: {
          ...rideData.pickup,
          address: pickupAddress || 'Pickup Location'
        },
        dropoff: {
          ...rideData.dropoff,
          address: dropoffAddress || 'Destination'
        }
      };

      // Set booking immediately so FindingDriverModal can access it
      // But don't set driver yet - this keeps the modal showing
      setBooking(normalizedRideData);

      // Check if driver was assigned
      if (!normalizedRideData.driver) {
        throw new Error('No drivers available. Please try again later.');
      }

      // Show "Finding driver" modal for 5 seconds before revealing driver
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Now reveal the driver
      setDriver(normalizedRideData.driver);

      // Set driver location (already converted to { lat, lng } by rideService)
      if (normalizedRideData.driver && normalizedRideData.driver.location) {
        setDriverLocation(normalizedRideData.driver.location);

        // Calculate driver ETA to pickup location (non-blocking)
        try {
          const etaData = await calculateDriverETA(normalizedRideData.driver.location, pickup);
          setDriverETA(etaData);
        } catch (etaErr) {
          console.error('[BookingContext] Failed to calculate driver ETA:', etaErr);
          // Continue without ETA - animation will use default
        }
      } else {
        console.warn('[BookingContext] No driver or driver location in ride data');
      }

      // Set initial trip state to DriverEnRoute (driver is automatically assigned and en route)
      setTrip({
        state: 'DriverEnRoute',
        startTime: normalizedRideData.createdAt
      });

      return normalizedRideData;
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
    // Clear driver animation
    if (driverAnimationRef.current) {
      clearInterval(driverAnimationRef.current);
      driverAnimationRef.current = null;
    }
    initialDriverLocationRef.current = null;

    setPickupText('');
    setDropoffText('');
    setQuote(null);
    setBooking(null);
    setTrip(null);
    setDriver(null);
    setDriverLocation(null);
    setTripProgress(0);
    setTripDistance(null);
    setDriverETA(null);
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
    tripDistance,
    driverETA,
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
    reset,
    // Dev helpers (for testing/debugging)
    setDriverLocation,
    setTripProgress
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}
