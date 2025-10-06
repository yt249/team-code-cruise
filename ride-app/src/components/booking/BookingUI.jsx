import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAd } from '../../context/AdContext';
import Map from '../Map/Map';
import './BookingUI.css';

export default function BookingUI() {
  const {
    pickupText,
    setPickupText,
    dropoffText,
    setDropoffText,
    quote,
    loading,
    error,
    getFareQuote,
    createBooking,
    requestDriver
  } = useBooking();

  const { startAdSession } = useAd();
  const [showAdOffer, setShowAdOffer] = useState(false);
  const [pendingQuote, setPendingQuote] = useState(null);

  // Handle request ride
  const handleRequestRide = async (e) => {
    e.preventDefault();
    if (!pickupText.trim() || !dropoffText.trim()) return;

    try {
      // Get fare quote
      const quoteData = await getFareQuote(pickupText, dropoffText);
      setPendingQuote(quoteData);

      // Show ad offer modal
      await startAdSession('rider-1', quoteData.fare);
      setShowAdOffer(true);
    } catch (err) {
      console.error('Failed to get quote:', err);
    }
  };

  // Parse locations for map
  const pickupLocation = pickupText === 'here' ? { lat: 40.7580, lng: -73.9855 } : null;
  const destinationLocation = dropoffText === 'there' ? { lat: 40.7829, lng: -73.9654 } : null;

  return (
    <div className="split-screen-layout">
      {/* Map Section - 70% */}
      <div className="map-section">
        <Map
          pickup={pickupLocation}
          destination={destinationLocation}
          showRoute={false}
          routeCompleted={false}
        />
      </div>

      {/* Sidebar Section - 30% */}
      <div className="sidebar-section">
        <form onSubmit={handleRequestRide} className="ride-request-form">
          <div className="input-group">
            <div className="input-with-icon">
              <span className="input-icon pickup-icon" aria-hidden="true">📍</span>
              <input
                type="text"
                value={pickupText}
                onChange={(e) => setPickupText(e.target.value)}
                placeholder="here"
                className="location-input"
                disabled={loading}
                required
                aria-label="Pickup location"
              />
            </div>

            <div className="input-with-icon">
              <span className="input-icon destination-icon" aria-hidden="true">🎯</span>
              <input
                type="text"
                value={dropoffText}
                onChange={(e) => setDropoffText(e.target.value)}
                placeholder="there"
                className="location-input"
                disabled={loading}
                required
                aria-label="Destination location"
              />
            </div>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="request-ride-button"
            disabled={loading || !pickupText.trim() || !dropoffText.trim()}
            aria-label="Request ride"
          >
            {loading ? 'Loading...' : 'Request Ride'}
          </button>
        </form>
      </div>
    </div>
  );
}
