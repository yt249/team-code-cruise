import { BookingProvider } from './context/BookingContext';
import { AdProvider } from './context/AdContext';
import { useBooking } from './context/BookingContext';
import BookingUI from './components/booking/BookingUI';
import AdDiscountUI from './components/ad/AdDiscountUI';
import FindingDriverModal from './components/FindingDriverModal/FindingDriverModal';
import DriverTrackingUI from './components/tracking/DriverTrackingUI';
import TripCompletedUI from './components/TripCompleted/TripCompletedUI';
import ErrorDemo from './components/ErrorDemo/ErrorDemo';
import './App.css';

function AppContent() {
  const { booking, trip } = useBooking();

  // Determine which view to show based on booking state
  const renderView = () => {
    // Show trip completed UI if trip is completed
    if (trip && trip.state === 'Completed') {
      return <TripCompletedUI />;
    }

    // Show driver tracking UI if driver is assigned
    if (booking && booking.driver && trip) {
      return <DriverTrackingUI />;
    }

    // Default to booking UI
    return <BookingUI />;
  };

  return (
    <div className="app">
      <main className="app-main">
        {renderView()}
      </main>

      {/* Modals and overlays */}
      <AdDiscountUI />
      <FindingDriverModal />
      <ErrorDemo />
    </div>
  );
}

function App() {
  return (
    <BookingProvider>
      <AdProvider>
        <AppContent />
      </AdProvider>
    </BookingProvider>
  );
}

export default App;
