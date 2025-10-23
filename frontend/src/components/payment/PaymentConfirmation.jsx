import { useState, useRef, useEffect } from 'react';
import './PaymentConfirmation.css';

export default function PaymentConfirmation({ tripData, onConfirm, onCancel }) {
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [showAdOffer, setShowAdOffer] = useState(true);
  const [discount, setDiscount] = useState(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const adTimerRef = useRef(null);

  const { pickup, dropoff, quote } = tripData;

  const paymentMethods = [
    { id: 'card', name: 'Credit Card', icon: '💳', details: '•••• 4242' },
    { id: 'apple', name: 'Apple Pay', icon: '', details: 'Apple Pay' },
    { id: 'google', name: 'Google Pay', icon: '🅖', details: 'Google Pay' },
    { id: 'cash', name: 'Cash', icon: '💵', details: 'Pay with cash' }
  ];

  const videoRef = useRef(null);

  const handleWatchAd = () => {
    setWatchingAd(true);
    setAdProgress(0);
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setAdProgress(progress);
  };

  const handleVideoEnded = () => {
    // Apply discount after ad completes
    const discountAmount = (quote.fare * 0.12).toFixed(2);
    setDiscount(parseFloat(discountAmount));
    setWatchingAd(false);
    setShowAdOffer(false);
  };

  useEffect(() => {
    if (watchingAd && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [watchingAd]);


  const finalAmount = discount ? (quote.fare - discount).toFixed(2) : quote.fare.toFixed(2);

  // Watching ad view
  if (watchingAd) {
    return (
      <div className="ad-modal-overlay">
        <div className="ad-modal-container">
          <div className="ad-modal-header">
            <div className="ad-badge">
              <span className="ad-icon">📺</span>
              <span>Advertisement</span>
            </div>
            <div className="ad-timer">
              {Math.max(0, Math.round((100 - adProgress) / 100 * 30))}s remaining
            </div>
          </div>

          <div className="ad-video-wrapper">
            <video
              ref={videoRef}
              className="ad-video-player"
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              controls={false}
              autoPlay
              playsInline
            >
              <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="ad-progress-container">
            <div className="ad-progress-bar">
              <div className="ad-progress-fill" style={{ width: `${adProgress}%` }}></div>
            </div>
            <p className="ad-reward-text">
              Watch until the end to save 12% on your ride!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-confirmation-layout">
      <div className="payment-panel">
        {/* Header */}
        <div className="payment-header">
          <button className="back-button" onClick={onCancel}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Confirm & Pay</h2>
        </div>

        <div className="payment-content">
          {/* Trip Summary Card */}
          <div className="trip-summary-card">
            <h3>Trip Details</h3>

            <div className="route-summary">
              <div className="route-point">
                <div className="route-marker pickup-marker">📍</div>
                <div className="route-info">
                  <div className="route-label">Pickup</div>
                  <div className="route-address">{pickup.address}</div>
                </div>
              </div>

              <div className="route-line"></div>

              <div className="route-point">
                <div className="route-marker dropoff-marker">🎯</div>
                <div className="route-info">
                  <div className="route-label">Destination</div>
                  <div className="route-address">{dropoff.address}</div>
                </div>
              </div>
            </div>

            <div className="trip-stats">
              <div className="stat-item">
                <div className="stat-icon">🚗</div>
                <div className="stat-info">
                  <div className="stat-value">{quote.distance.toFixed(1)} mi</div>
                  <div className="stat-label">Distance</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <div className="stat-value">{quote.estimatedTime} min</div>
                  <div className="stat-label">Est. Time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Offer */}
          {showAdOffer && (
            <div className="ad-offer-card">
              <div className="ad-offer-icon">📺</div>
              <div className="ad-offer-content">
                <h4>Save 12% on your ride!</h4>
                <p>Watch a quick 30-second ad to reduce your fare</p>
              </div>
              <div className="ad-offer-actions">
                <button className="watch-ad-btn" onClick={handleWatchAd}>
                  Watch Ad
                </button>
                <button className="skip-ad-btn" onClick={() => setShowAdOffer(false)}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="payment-methods-section">
            <h3>Payment Method</h3>
            <div className="payment-methods-list">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  className={`payment-method-card ${selectedPayment === method.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPayment(method.id)}
                >
                  <div className="payment-method-icon">{method.icon}</div>
                  <div className="payment-method-info">
                    <div className="payment-method-name">{method.name}</div>
                    <div className="payment-method-details">{method.details}</div>
                  </div>
                  <div className="payment-method-radio">
                    {selectedPayment === method.id && '✓'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fare Breakdown */}
          <div className="fare-breakdown-section">
            <h3>Fare Breakdown</h3>
            <div className="fare-items">
              <div className="fare-item">
                <span>Base Fare</span>
                <span>${quote.fare.toFixed(2)}</span>
              </div>
              {discount && (
                <div className="fare-item discount-item">
                  <span>Ad Discount (12%)</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="fare-item total-fare">
                <span>Total</span>
                <span className="total-amount">${finalAmount}</span>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button className="confirm-ride-button" onClick={() => onConfirm(selectedPayment, discount)}>
            <span>Confirm Ride</span>
            <span className="button-amount">${finalAmount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
