import { useState, useEffect } from 'react';
import { useBooking } from '../../context/BookingContext';
import { mockDrivers } from '../../data/mockDrivers';
import Map from '../Map/Map';
import './FindingDriverModal.css';

export default function FindingDriverModal() {
  const { booking, loading, cancelBooking } = useBooking();
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  // Get nearby available drivers when component mounts
  useEffect(() => {
    if (booking && booking.pickup) {
      // Get all available drivers and place them near pickup location
      const available = mockDrivers.filter(d => d.available);

      // Place drivers near the pickup location (within 0.02 degrees ~= 2km)
      const nearbyAvailable = available.map(driver => ({
        ...driver,
        location: {
          lat: booking.pickup.lat + (Math.random() - 0.5) * 0.04,
          lng: booking.pickup.lng + (Math.random() - 0.5) * 0.04
        }
      }));

      console.log('Available nearby drivers placed near pickup:', nearbyAvailable);
      setNearbyDrivers(nearbyAvailable);
    }
  }, [booking]);

  // Only show if we're loading and have a booking but no driver yet
  if (!booking || booking.driver || !loading) {
    return null;
  }

  const handleCancel = async () => {
    await cancelBooking();
  };

  console.log('Rendering FindingDriverModal with nearby drivers:', nearbyDrivers);

  return (
    <div className="finding-driver-fullscreen">
      {/* Map showing pickup, dropoff, and nearby drivers */}
      <div className="finding-driver-map">
        <Map
          pickup={booking.pickup}
          destination={booking.dropoff}
          showRoute={false}
          nearbyDrivers={nearbyDrivers}
        />
      </div>

      {/* Overlay modal */}
      <div className="finding-driver-overlay">
        <div className="finding-driver-modal">
          <h2 className="finding-driver-title">Finding your driver</h2>
          <p className="finding-driver-subtitle">
            Searching for available drivers nearby...
          </p>

          <div className="loading-spinner-container">
            <div className="loading-spinner" aria-label="Loading"></div>
          </div>

          <div className="nearby-drivers-count">
            {nearbyDrivers.length} driver{nearbyDrivers.length !== 1 ? 's' : ''} nearby
          </div>

          <button className="cancel-button-modal" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
