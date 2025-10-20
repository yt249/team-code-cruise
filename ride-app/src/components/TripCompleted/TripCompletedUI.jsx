import { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { formatCurrency, formatTime } from '../../utils/helpers';
import Map from '../Map/Map';
import './TripCompletedUI.css';

export default function TripCompletedUI({ onBookAnother }) {
  const { booking, trip, reset } = useBooking();
  const [rating, setRating] = useState(0);

  if (!booking || !trip || trip.state !== 'Completed') {
    return null;
  }

  const pickupLocation = booking.pickup;
  const destinationLocation = booking.dropoff;
  const tripDuration = trip.endTime && trip.pickupTime
    ? Math.round((trip.endTime - trip.pickupTime) / 60000)
    : Math.round(booking.distance * 2);

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
              <span className="summary-label">Distance</span>
              <span className="summary-value">{booking.distance.toFixed(1)} miles</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Base Fare</span>
              <span className="summary-value">{formatCurrency(booking.baseFare)}</span>
            </div>
            {booking.discount && (
              <div className="summary-row discount-row-completed">
                <span className="summary-label text-success">Ad Discount</span>
                <span className="summary-value text-success">-{formatCurrency(booking.discountAmount)}</span>
              </div>
            )}
            <div className="summary-row total-row-completed">
              <span className="summary-label font-bold">Total</span>
              <span className="summary-value font-bold">{formatCurrency(booking.finalFare)}</span>
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
