import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { AdProvider, useAd } from './context/AdContext';
import { useBooking } from './context/BookingContext';
import LoginPage from './components/Landing/LoginPage';
import LandingPage from './components/Landing/LandingPage';
import NewBookingUI from './components/booking/NewBookingUI';
import PaymentConfirmation from './components/payment/PaymentConfirmation';
import FindingDriverModal from './components/FindingDriverModal/FindingDriverModal';
import DriverTrackingUI from './components/tracking/DriverTrackingUI';
import TripCompletedUI from './components/TripCompleted/TripCompletedUI';
import { rideService } from './services/rideService';
import './App.css';

function AppContent() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { booking, trip, reset, requestRide } = useBooking();
  const { resetAd } = useAd();
  const [currentView, setCurrentView] = useState('landing'); // landing, booking, payment, tracking, completed
  const [tripData, setTripData] = useState(null);

  // debugging amplify
  console.log('API base URL:', getApiBaseUrl());

  // Handle ride cancellation - redirect to landing page
  useEffect(() => {
    if (
      booking &&
      booking.status === 'Cancelled' &&
      currentView === 'tracking'
    ) {
      reset();
      setTripData(null);
      setCurrentView('landing');
    }
  }, [booking, currentView, reset]);

  const handleGetStarted = () => {
    resetAd(); // Clear any previous ad state
    setCurrentView('booking');
  };

  const handleProceedToPayment = (data) => {
    setTripData(data);
    setCurrentView('payment');
  };

  const handleConfirmPayment = async (paymentMethod, discountToken) => {
    // Request ride with backend API (driver auto-assigned)

    // Change to tracking view before requesting ride (so FindingDriverModal can show)
    setCurrentView('tracking');

    try {
      const pickup = tripData.pickup.location; // { lat, lng }
      const dropoff = tripData.dropoff.location; // { lat, lng }
      const tokenId = discountToken?.tokenId || null;

      // If there's a discount token, request a NEW quote with the token
      // This associates the token with the quote in the backend
      let quoteId = tripData.quote.id;
      if (tokenId) {
        const newQuote = await rideService.getQuote(pickup, dropoff, tokenId);
        quoteId = newQuote.id;

        // Update tripData with the new quote
        setTripData({
          ...tripData,
          quote: newQuote,
        });
      }

      // Actually request the ride using BookingContext to properly store state
      const pickupAddress = tripData.pickup.address || 'Pickup Location';
      const dropoffAddress = tripData.dropoff.address || 'Destination';

      await requestRide(
        pickup,
        dropoff,
        quoteId,
        tokenId,
        pickupAddress,
        dropoffAddress
      );

      // Clear ad state after successful booking (discount token consumed)
      resetAd();
    } catch (err) {
      console.error('Failed to request ride:', err);
      alert('Failed to request ride: ' + err.message);
      // Go back to payment on error
      setCurrentView('payment');
    }
  };

  const handleCancelPayment = () => {
    setCurrentView('booking');
  };

  const handleBackToLanding = () => {
    resetAd(); // Clear ad state for new booking
    setTripData(null);
    setCurrentView('landing');
  };

  const handleLoginSuccess = () => {
    setCurrentView('landing');
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className='app'>
        <div className='loading-screen'>
          <div className='loading-spinner'></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isLoggedIn) {
    return (
      <div className='app'>
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
    <div className='app'>
      <main className='app-main'>{renderView()}</main>

      {/* Modals - FindingDriverModal only (don't show on payment screen) */}
      {currentView !== 'payment' && <FindingDriverModal />}
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
