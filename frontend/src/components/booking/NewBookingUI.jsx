import { useState, useRef, useEffect } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import Map from '../Map/Map';
import './NewBookingUI.css';

export default function NewBookingUI({ onProceedToPayment }) {
  const {
    quote,
    tripDistance,
    loading,
    error,
    getFareQuote,
    clearQuote
  } = useBooking();

  const { logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

  const pickupInputRef = useRef(null);
  const dropoffInputRef = useRef(null);
  const pickupAutocompleteRef = useRef(null);
  const dropoffAutocompleteRef = useRef(null);

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLocation({ lat, lng });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
          // Set a default location (e.g., New York City) if geolocation fails
          setCurrentLocation({ lat: 40.7580, lng: -73.9855 });
        }
      );
    } else {
      // Fallback to default location if geolocation is not supported
      setCurrentLocation({ lat: 40.7580, lng: -73.9855 });
    }
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initAutocomplete = () => {
      if (!window.google || !window.google.maps) return;

      // Pickup autocomplete
      if (pickupInputRef.current && !pickupAutocompleteRef.current) {
        pickupAutocompleteRef.current = new window.google.maps.places.Autocomplete(
          pickupInputRef.current,
          {
            fields: ['formatted_address', 'geometry', 'name'],
            componentRestrictions: { country: 'us' }
          }
        );

        pickupAutocompleteRef.current.addListener('place_changed', () => {
          const place = pickupAutocompleteRef.current.getPlace();
          if (place.geometry) {
            setPickupAddress(place.formatted_address || place.name);
            setPickupLocation({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            });
            setShowPickupSuggestions(false);
          }
        });
      }

      // Dropoff autocomplete
      if (dropoffInputRef.current && !dropoffAutocompleteRef.current) {
        dropoffAutocompleteRef.current = new window.google.maps.places.Autocomplete(
          dropoffInputRef.current,
          {
            fields: ['formatted_address', 'geometry', 'name'],
            componentRestrictions: { country: 'us' }
          }
        );

        dropoffAutocompleteRef.current.addListener('place_changed', () => {
          const place = dropoffAutocompleteRef.current.getPlace();
          if (place.geometry) {
            setDropoffAddress(place.formatted_address || place.name);
            setDropoffLocation({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            });
            setShowDropoffSuggestions(false);
          }
        });
      }
    };

    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initAutocomplete();
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  // Clear quote when pickup or dropoff location changes
  useEffect(() => {
    if (quote) {
      clearQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupLocation, dropoffLocation]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Set location immediately
        setPickupLocation({ lat, lng });

        // Reverse geocode to get address
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              setPickupAddress(results[0].formatted_address);
            } else {
              setPickupAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          });
        } else {
          setPickupAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enter it manually.');
      }
    );
  };

  const handleGetQuote = async () => {
    if (!pickupLocation || !dropoffLocation) return;

    try {
      await getFareQuote(pickupLocation, dropoffLocation);
    } catch (err) {
      console.error('Failed to get quote:', err);
    }
  };

  const handleProceedToPayment = () => {
    if (quote && pickupLocation && dropoffLocation) {
      onProceedToPayment({
        pickup: { address: pickupAddress, location: pickupLocation },
        dropoff: { address: dropoffAddress, location: dropoffLocation },
        quote,
        tripDistance
      });
    }
  };

  const canGetQuote = pickupLocation && dropoffLocation && !loading;
  const hasQuote = quote !== null;

  return (
    <div className="new-booking-layout">
      {/* Logout button */}
      <button className="logout-button" onClick={handleLogout}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </button>

      {/* Map Section */}
      <div className="new-map-section">
        <Map
          pickup={pickupLocation}
          destination={dropoffLocation}
          currentLocation={currentLocation}
          showRoute={pickupLocation && dropoffLocation}
          routeCompleted={false}
          useDirections={true}
        />
      </div>

      {/* Booking Panel */}
      <div className="new-booking-panel">
        <div className="booking-panel-header">
          <h2>Where to?</h2>
          <p>Enter your pickup and destination</p>
        </div>

        <div className="booking-form">
          {/* Pickup Input */}
          <div className="location-input-wrapper">
            <div className="input-label">
              <span className="label-icon">📍</span>
              <span>Pickup Location</span>
              <button
                className="current-location-button"
                onClick={handleUseCurrentLocation}
                title="Use my current location"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 2V6M12 18V22M22 12H18M6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Current Location
              </button>
            </div>
            <div className="autocomplete-input-container">
              <input
                ref={pickupInputRef}
                type="text"
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  setShowPickupSuggestions(true);
                }}
                onFocus={() => setShowPickupSuggestions(true)}
                placeholder="Enter pickup address..."
                className="location-autocomplete-input"
              />
              {pickupLocation && (
                <button
                  className="clear-input-button"
                  onClick={() => {
                    setPickupAddress('');
                    setPickupLocation(null);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Dropoff Input */}
          <div className="location-input-wrapper">
            <div className="input-label">
              <span className="label-icon">🎯</span>
              <span>Destination</span>
            </div>
            <div className="autocomplete-input-container">
              <input
                ref={dropoffInputRef}
                type="text"
                value={dropoffAddress}
                onChange={(e) => {
                  setDropoffAddress(e.target.value);
                  setShowDropoffSuggestions(true);
                }}
                onFocus={() => setShowDropoffSuggestions(true)}
                placeholder="Enter destination address..."
                className="location-autocomplete-input"
              />
              {dropoffLocation && (
                <button
                  className="clear-input-button"
                  onClick={() => {
                    setDropoffAddress('');
                    setDropoffLocation(null);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="booking-error-message">
              {error}
            </div>
          )}

          {/* Get Quote Button */}
          {!hasQuote && (
            <button
              className="get-quote-button"
              onClick={handleGetQuote}
              disabled={!canGetQuote}
            >
              {loading ? 'Calculating...' : 'Get Fare Estimate'}
            </button>
          )}

          {/* Quote Display */}
          {hasQuote && (
            <div className="quote-display">
              <div className="quote-header">
                <h3>Fare Estimate</h3>
              </div>

              <div className="quote-details">
                {tripDistance && (
                  <div className="quote-row">
                    <span>Distance</span>
                    <span className="quote-value">{tripDistance.distanceText}</span>
                  </div>
                )}
                <div className="quote-row">
                  <span>Estimated Time</span>
                  <span className="quote-value">{tripDistance ? tripDistance.durationText : `${quote.eta} min`}</span>
                </div>
                <div className="quote-row quote-total">
                  <span>Total Fare</span>
                  <span className="quote-value">${quote.fare.toFixed(2)}</span>
                </div>
              </div>

              <button
                className="proceed-to-payment-button"
                onClick={handleProceedToPayment}
              >
                Proceed to Payment
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button
                className="recalculate-button"
                onClick={() => {
                  setPickupAddress('');
                  setDropoffAddress('');
                  setPickupLocation(null);
                  setDropoffLocation(null);
                }}
              >
                Change Route
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
