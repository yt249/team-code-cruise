import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { AdProvider } from './context/AdContext';
import { useBooking } from './context/BookingContext';
import LoginPage from './components/Landing/LoginPage';
import LandingPage from './components/Landing/LandingPage';
import NewBookingUI from './components/booking/NewBookingUI';
import PaymentConfirmation from './components/payment/PaymentConfirmation';
import FindingDriverModal from './components/FindingDriverModal/FindingDriverModal';
import DriverTrackingUI from './components/tracking/DriverTrackingUI';
import TripCompletedUI from './components/TripCompleted/TripCompletedUI';
import './App.css';

function AppContent() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { booking, trip, createBooking, requestDriver, reset } = useBooking();
  const [currentView, setCurrentView] = useState('landing'); // landing, booking, payment, tracking, completed
  const [tripData, setTripData] = useState(null);

  // Handle ride cancellation - redirect to landing page
  useEffect(() => {
    if (booking && booking.status === 'Cancelled' && currentView === 'tracking') {
      console.log('Ride cancelled, redirecting to landing');
      reset();
      setTripData(null);
      setCurrentView('landing');
    }
  }, [booking, currentView, reset]);

  const handleGetStarted = () => {
    setCurrentView('booking');
  };

  const handleProceedToPayment = (data) => {
    setTripData(data);
    setCurrentView('payment');
  };

  const handleConfirmPayment = async (paymentMethod, discount) => {
    // Create booking with trip data
    try {
      // Create booking first
      const discountData = discount ? { percentage: 12, amount: discount } : null;
      const bookingData = await createBooking(tripData.quote, discountData);

      // Set booking data with full location objects (including address)
      bookingData.pickup = {
        ...tripData.pickup.location,
        address: tripData.pickup.address
      };
      bookingData.dropoff = {
        ...tripData.dropoff.location,
        address: tripData.dropoff.address
      };

      // Request driver
      await requestDriver(bookingData);
      setCurrentView('tracking');
    } catch (err) {
      console.error('Failed to request driver:', err);
    }
  };

  const handleCancelPayment = () => {
    setCurrentView('booking');
  };

  const handleBackToLanding = () => {
    setTripData(null);
    setCurrentView('landing');
  };

  const handleLoginSuccess = () => {
    setCurrentView('landing');
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="app">
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Render appropriate view
  const renderView = () => {
    // Check for trip completion
    if (trip && trip.state === 'Completed') {
      return <TripCompletedUI onBookAnother={handleBackToLanding} />;
    }

    // Check for active tracking
    if (booking && booking.driver && trip && currentView === 'tracking') {
      return <DriverTrackingUI />;
    }

    // Render based on current view
    switch (currentView) {
      case 'landing':
        return <LandingPage onGetStarted={handleGetStarted} />;

      case 'booking':
        return <NewBookingUI onProceedToPayment={handleProceedToPayment} />;

      case 'payment':
        return (
          <PaymentConfirmation
            tripData={tripData}
            onConfirm={handleConfirmPayment}
            onCancel={handleCancelPayment}
          />
        );

      case 'tracking':
        return <DriverTrackingUI />;

      default:
        return <LandingPage onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <div className="app">
      <main className="app-main">
        {renderView()}
      </main>

      {/* Modals - FindingDriverModal only */}
      <FindingDriverModal />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <AdProvider>
          <AppContent />
        </AdProvider>
      </BookingProvider>
    </AuthProvider>
  );
}

export default App;
