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
    booking,
    startTrip,
    cancelBooking
  } = useBooking();

  const [eta, setEta] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(0);

  // Calculate ETA based on trip progress
  useEffect(() => {
    if (trip && booking) {
      const estimatedMinutes = booking.distance * 2; // Rough estimate: 2 min per mile
      const remainingProgress = 1 - (tripProgress || 0);
      const totalSeconds = Math.ceil(estimatedMinutes * remainingProgress * 60);

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      // Format as m:ss
      const formattedEta = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setEta(formattedEta);
      setEtaSeconds(totalSeconds);
    }
  }, [trip, booking, tripProgress]);

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
      await cancelBooking();
    }
  };

  if (!driver || !trip || !booking) {
    return null;
  }

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

            <button className="start-trip-button-new" onClick={startTrip}>
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
