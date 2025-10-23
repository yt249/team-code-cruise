import { useBooking } from '../../context/BookingContext';
import Map from '../Map/Map';
import './FindingDriverModal.css';

export default function FindingDriverModal() {
  const { booking, driver, loading, error, cancelRide } = useBooking();

  // Only show if we're loading during ride request
  // Don't show if we already have a driver (backend assigns immediately)
  if (!loading || driver || !booking) {
    return null;
  }

  const handleCancel = async () => {
    if (booking && booking.id) {
      await cancelRide();
    }
  };

  return (
    <div className="finding-driver-fullscreen">
      {/* Map showing pickup and dropoff */}
      <div className="finding-driver-map">
        <Map
          pickup={booking.pickup}
          destination={booking.dropoff}
          showRoute={false}
        />
      </div>

      {/* Overlay modal */}
      <div className="finding-driver-overlay">
        <div className="finding-driver-modal">
          <h2 className="finding-driver-title">Finding your driver</h2>
          <p className="finding-driver-subtitle">
            Matching you with a nearby driver...
          </p>

          <div className="loading-spinner-container">
            <div className="loading-spinner" aria-label="Loading"></div>
          </div>

          {error && (
            <div className="error-message" style={{color: 'red', marginTop: '1rem'}}>
              {error}
            </div>
          )}

          <button className="cancel-button-modal" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
