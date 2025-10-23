import { useEffect, useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import Map from '../Map/Map';
import './DriverTrackingUI.css';

export default function DriverTrackingUI() {
  const {
    driver,
    driverLocation,
    trip,
    tripProgress,
    tripDistance,
    driverETA,
    booking,
    updateTripState,
    cancelRide,
    completeRide,
    setDriverLocation,
    setTripProgress
  } = useBooking();

  const [eta, setEta] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(0);

  // Calculate ETA based on trip state and progress
  useEffect(() => {
    if (trip && trip.state === 'DriverEnRoute' && driverETA) {
      // Use real driver ETA from Google Maps
      const totalSeconds = Math.ceil(driverETA.duration * 60 * (1 - (tripProgress || 0)));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formattedEta = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setEta(formattedEta);
      setEtaSeconds(totalSeconds);
    } else if (trip && trip.state === 'InTrip' && tripDistance) {
      // Use trip distance for in-progress trip
      const totalSeconds = Math.ceil(tripDistance.duration * 60 * (1 - (tripProgress || 0)));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formattedEta = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setEta(formattedEta);
      setEtaSeconds(totalSeconds);
    }
  }, [trip, tripProgress, driverETA, tripDistance]);

  // Countdown timer
  useEffect(() => {
    if (etaSeconds > 0 && trip && trip.state !== 'Completed') {
      const timer = setInterval(() => {
        setEtaSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          const newSeconds = prev - 1;
          const minutes = Math.floor(newSeconds / 60);
          const seconds = newSeconds % 60;
          setEta(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          return newSeconds;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [etaSeconds, trip]);

  // Handle cancel
  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this ride?')) {
      await cancelRide();
    }
  };

  // Handle start trip
  const handleStartTrip = () => {
    updateTripState('InTrip');
  };

  // [DEV ONLY] Teleport driver to pickup location
  const handleTeleportToPickup = () => {
    if (!booking || !booking.pickup) return;

    // Set driver location to pickup
    setDriverLocation({
      lat: booking.pickup.lat,
      lng: booking.pickup.lng
    });

    // Set progress to 100%
    setTripProgress(1);

    // Reset ETA to 0
    setEta('0:00');
    setEtaSeconds(0);

    // Transition to ArrivedAtPickup state
    updateTripState('ArrivedAtPickup');

    console.log('[DEV] Teleported driver to pickup location');
  };

  // [DEV ONLY] Teleport driver to destination and complete trip
  const handleTeleportToDestination = async () => {
    if (!booking || !booking.dropoff) return;

    // Set driver location to destination
    setDriverLocation({
      lat: booking.dropoff.lat,
      lng: booking.dropoff.lng
    });

    // Set progress to 100%
    setTripProgress(1);

    // Reset ETA to 0
    setEta('0:00');
    setEtaSeconds(0);

    // Complete the trip
    await completeRide();

    console.log('[DEV] Teleported driver to destination and completed trip');
  };

  if (!driver || !trip || !booking) {
    return null;
  }

  console.log('DriverTrackingUI - driverLocation:', driverLocation);
  console.log('DriverTrackingUI - trip state:', trip.state);

  const pickupLocation = booking.pickup;
  const destinationLocation = booking.dropoff;

  return (
    <div className="split-screen-layout">
      {/* Map Section - 70% */}
      <div className="map-section">
        {/* Route Bar at Top */}
        <div className="route-bar">
          <div className="route-location">
            <span className="route-icon pickup" aria-hidden="true">📍</span>
            <span>{pickupLocation.address || 'here'}</span>
          </div>
          <div className="route-arrow" aria-hidden="true">→</div>
          <div className="route-location">
            <span className="route-icon destination" aria-hidden="true">🎯</span>
            <span>{destinationLocation.address || 'there'}</span>
          </div>
        </div>

        {/* Map with Route */}
        <Map
          pickup={pickupLocation}
          destination={destinationLocation}
          showRoute={true}
          useDirections={true}
          routeCompleted={trip.state === 'Completed'}
          driverPosition={driverLocation}
        />
      </div>

      {/* Sidebar Section - 30% */}
      <div className="sidebar-section tracking-sidebar">
        {trip.state === 'InTrip' && (
          <div className="trip-status-card">
            <div className="status-header">
              <span className="status-icon destination-icon" aria-hidden="true">🎯</span>
              <div>
                <h3 className="status-title">Heading to destination</h3>
                <p className="status-subtitle">{destinationLocation.address || 'Downtown Conference Center'}</p>
              </div>
            </div>

            <div className="eta-display">
              <span className="eta-icon" aria-hidden="true">🕒</span>
              <span className="eta-time">{eta || '...'} min</span>
            </div>

            {/* DEV ONLY: Skip to destination button */}
            <button
              className="dev-skip-button"
              onClick={handleTeleportToDestination}
              style={{
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                marginBottom: '12px',
                width: '100%'
              }}
            >
              🏁 [DEV] Skip to Destination
            </button>

            <button className="share-trip-button">
              <span aria-hidden="true">🔗</span>
              Share Trip
            </button>
          </div>
        )}

        {trip.state === 'DriverEnRoute' && (
          <div className="trip-status-card">
            <div className="driver-card-new">
              <div className="driver-avatar-new">
                {driver.name.charAt(0)}
              </div>
              <div className="driver-info-new">
                <h3>{driver.name}</h3>
                <p className="driver-vehicle">{driver.vehicle.color} {driver.vehicle.make} • {driver.vehicle.plate}</p>
                <div className="driver-rating-new">
                  <span aria-hidden="true">⭐</span>
                  <span>{driver.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="driver-eta-new">
                <div className="eta-value-new">{eta || '...'}</div>
                <div className="eta-label-new">Away</div>
              </div>
            </div>

            <p className="status-text">Driver is on the way</p>

            {/* DEV ONLY: Skip animation button */}
            <button
              className="dev-skip-button"
              onClick={handleTeleportToPickup}
              style={{
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                marginBottom: '12px',
                width: '100%'
              }}
            >
              ⚡ [DEV] Skip to Pickup
            </button>

            <button className="cancel-ride-button" onClick={handleCancel}>
              Cancel Ride
            </button>
          </div>
        )}

        {trip.state === 'ArrivedAtPickup' && (
          <div className="trip-status-card">
            <div className="arrived-banner">
              <span className="checkmark" aria-hidden="true">✓</span>
              <span>Driver has arrived</span>
            </div>

            <div className="driver-card-new">
              <div className="driver-avatar-new">
                {driver.name.charAt(0)}
              </div>
              <div className="driver-info-new">
                <h3>{driver.name}</h3>
                <p className="driver-vehicle">{driver.vehicle.color} {driver.vehicle.make} • {driver.vehicle.plate}</p>
                <div className="driver-rating-new">
                  <span aria-hidden="true">⭐</span>
                  <span>{driver.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <button className="start-trip-button-new" onClick={handleStartTrip}>
              Start Trip
            </button>

            <button className="cancel-ride-button" onClick={handleCancel}>
              Cancel Ride
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
