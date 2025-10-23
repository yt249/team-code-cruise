import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatTime } from '../../utils/helpers';
import Map from '../Map/Map';
import './TripCompletedUI.css';

export default function TripCompletedUI({ onBookAnother }) {
  const { booking, trip, reset } = useBooking();
  const { logout } = useAuth();
  const [rating, setRating] = useState(0);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  if (!booking || !trip || trip.state !== 'Completed') {
    return null;
  }

  const pickupLocation = booking.pickup;
  const destinationLocation = booking.dropoff;
  const tripDuration = trip.endTime && trip.pickupTime
    ? Math.round((trip.endTime - trip.pickupTime) / 60000)
    : 10; // Default 10 minutes if not calculated

  // Extract fare information from booking
  // booking.baseFare and booking.finalFare are already in dollars (transformed by rideService)
  // booking.fareAmount is in cents from backend (raw)
  const baseFare = booking.baseFare || (booking.fareAmount ? booking.fareAmount / 100 : 0);
  const finalFare = booking.finalFare || baseFare;
  const discountAmount = booking.discountAmount || 0;
  const discountPercent = booking.discountPercent || 0;
  const hasDiscount = discountPercent > 0 || discountAmount > 0;

  const handleStarClick = (starIndex) => {
    setRating(starIndex + 1);
  };

  const handleRequestAnother = () => {
    reset();
    if (onBookAnother) {
      onBookAnother();
    }
  };

  return (
    <div className="split-screen-layout">
      {/* Logout button */}
      <button className="logout-button" onClick={handleLogout}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </button>

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

        {/* Map with Completed Route (green) */}
        <Map
          pickup={pickupLocation}
          destination={destinationLocation}
          showRoute={true}
          useDirections={true}
          routeCompleted={true}
        />
      </div>

      {/* Sidebar Section - 30% */}
      <div className="sidebar-section completed-sidebar">
        <div className="completed-card">
          <h2 className="completed-title">Trip Completed!</h2>
          <p className="completed-subtitle">Thank you for riding with us</p>

          <div className="trip-summary">
            <div className="summary-row">
              <span className="summary-label">Duration</span>
              <span className="summary-value">{formatTime(tripDuration)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Fare</span>
              <span className="summary-value">{formatCurrency(baseFare)}</span>
            </div>
            {hasDiscount && (
              <div className="summary-row discount-row-completed">
                <span className="summary-label text-success">Ad Discount</span>
                <span className="summary-value text-success">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="summary-row total-row-completed">
              <span className="summary-label font-bold">Total</span>
              <span className="summary-value font-bold">{formatCurrency(finalFare)}</span>
            </div>
          </div>

          <div className="rating-section">
            <p className="rating-label">Rate your driver</p>
            <div className="stars">
              {[0, 1, 2, 3, 4].map((index) => (
                <button
                  key={index}
                  className={`star-button ${index < rating ? 'active' : ''}`}
                  onClick={() => handleStarClick(index)}
                  aria-label={`Rate ${index + 1} stars`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <button
            className="request-another-button"
            onClick={handleRequestAnother}
          >
            Request Another Ride
          </button>
        </div>
      </div>
    </div>
  );
}
