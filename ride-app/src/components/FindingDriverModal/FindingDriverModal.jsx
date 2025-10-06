import { useBooking } from '../../context/BookingContext';
import './FindingDriverModal.css';

export default function FindingDriverModal() {
  const { booking, loading, cancelBooking } = useBooking();

  // Only show if we're loading and have a booking but no driver yet
  if (!booking || booking.driver || !loading) {
    return null;
  }

  const handleCancel = async () => {
    await cancelBooking();
  };

  return (
    <div className="finding-driver-overlay">
      <div className="finding-driver-modal">
        <h2 className="finding-driver-title">Finding your driver</h2>
        <p className="finding-driver-subtitle">
          We're searching for available drivers in your area. This may take a few moments.
        </p>

        <div className="loading-spinner-container">
          <div className="loading-spinner" aria-label="Loading"></div>
        </div>

        <button className="cancel-button-modal" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
