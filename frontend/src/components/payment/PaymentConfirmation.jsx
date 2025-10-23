import { useState, useRef, useEffect } from 'react';
import { useAd } from '../../context/AdContext';
import { adService } from '../../services/advertisementService';
import './PaymentConfirmation.css';

export default function PaymentConfirmation({ tripData, onConfirm, onCancel }) {
  const [selectedPayment, setSelectedPayment] = useState('card');

  // Use AdContext for backend integration
  const {
    isEligible,
    adSession,
    showAdOffer,
    adPlaying,
    adProgress,
    discountToken,
    checkEligibility,
    startAdSession,
    playAd,
    updateAdProgress,
    completeAd,
    skipAd,
    closeAdOffer
  } = useAd();

  const { pickup, dropoff, quote, tripDistance } = tripData;
  const videoRef = useRef(null);

  const paymentMethods = [
    { id: 'card', name: 'Credit Card', icon: '💳', details: '•••• 4242' },
    { id: 'apple', name: 'Apple Pay', icon: '', details: 'Apple Pay' },
    { id: 'google', name: 'Google Pay', icon: '🅖', details: 'Google Pay' },
    { id: 'cash', name: 'Cash', icon: '💵', details: 'Pay with cash' }
  ];

  // Check ad eligibility when component mounts (but don't create session yet)
  useEffect(() => {
    const initAd = async () => {
      try {
        // Only check eligibility, don't create session until user clicks "Watch Ad"
        const result = await checkEligibility();
      } catch (err) {
        console.error('Failed to check ad eligibility:', err);
      }
    };

    initAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  // Track if we're initiating an ad watch
  const [initiatingAd, setInitiatingAd] = useState(false);

  // Handle watch ad button click
  const handleWatchAd = async () => {
    try {
      setInitiatingAd(true);
      // Create ad session with discount percentage and base fare
      await startAdSession(12, quote.fare);
      // playAd() will be called automatically by useEffect below
    } catch (err) {
      console.error('Failed to start ad:', err);
      alert('Failed to start ad: ' + err.message);
      setInitiatingAd(false);
    }
  };

  // Auto-play ad when session is created after user clicks "Watch Ad"
  useEffect(() => {
    if (initiatingAd && adSession && !adPlaying) {
      playAd();
      setInitiatingAd(false);
    }
  }, [initiatingAd, adSession, adPlaying, playAd]);

  // Track which checkpoints have been sent
  const checkpointsSent = useRef({
    start: false,
    '25%': false,
    '50%': false,
    '75%': false
  });

  // Handle video time update and send checkpoints
  const handleVideoTimeUpdate = async () => {
    if (!videoRef.current || !adSession) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    const progress = (currentTime / duration) * 100;

    // Update progress in context
    updateAdProgress(progress);

    // Send checkpoint events to backend
    try {
      if (!checkpointsSent.current.start && currentTime > 0) {
        await adService.recordStart(adSession.sessionId);
        checkpointsSent.current.start = true;
      }
      if (!checkpointsSent.current['25%'] && progress >= 25) {
        await adService.recordQuartile(adSession.sessionId, '25%');
        checkpointsSent.current['25%'] = true;
      }
      if (!checkpointsSent.current['50%'] && progress >= 50) {
        await adService.recordQuartile(adSession.sessionId, '50%');
        checkpointsSent.current['50%'] = true;
      }
      if (!checkpointsSent.current['75%'] && progress >= 75) {
        await adService.recordQuartile(adSession.sessionId, '75%');
        checkpointsSent.current['75%'] = true;
      }
    } catch (err) {
      console.error('Failed to record playback checkpoint:', err);
    }
  };

  // Handle video ended
  const handleVideoEnded = async () => {
    try {
      // Send final "complete" checkpoint
      if (adSession?.sessionId) {
        await adService.recordComplete(adSession.sessionId);
      }
      // Complete the ad session and get discount token
      await completeAd();
    } catch (err) {
      console.error('Failed to complete ad:', err);
    }
  };

  // Handle skip ad
  const handleSkipAd = () => {
    skipAd();
  };

  // Auto-play video when ad starts playing
  useEffect(() => {
    if (adPlaying && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [adPlaying]);

  // Reset checkpoints when new ad session starts
  useEffect(() => {
    if (adSession) {
      checkpointsSent.current = {
        start: false,
        '25%': false,
        '50%': false,
        '75%': false
      };
    }
  }, [adSession]);

  // Calculate final amount with discount if available
  const discountAmount = discountToken && adSession ? adSession.discountAmount : 0;
  const finalAmount = (quote.fare - discountAmount).toFixed(2);

  // Watching ad view - use backend ad video
  if (adPlaying && adSession) {
    const timeRemaining = adSession.ad.duration ?
      Math.max(0, Math.round((100 - adProgress) / 100 * adSession.ad.duration)) :
      Math.max(0, Math.round((100 - adProgress) / 100 * 30));

    const discountPercentage = adSession.discountPercentage || 12;

    return (
      <div className="ad-modal-overlay">
        <div className="ad-modal-container">
          <div className="ad-modal-header">
            <div className="ad-badge">
              <span className="ad-icon">📺</span>
              <span>Advertisement</span>
            </div>
            <div className="ad-timer">
              {timeRemaining}s remaining
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
              <source src={adSession.ad.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="ad-progress-container">
            <div className="ad-progress-bar">
              <div className="ad-progress-fill" style={{ width: `${adProgress}%` }}></div>
            </div>
            <p className="ad-reward-text">
              Watch until the end to save {discountPercentage}% on your ride!
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
              {tripDistance && (
                <div className="stat-item">
                  <div className="stat-icon">📏</div>
                  <div className="stat-info">
                    <div className="stat-value">{tripDistance.distanceText}</div>
                    <div className="stat-label">Distance</div>
                  </div>
                </div>
              )}
              <div className="stat-item">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <div className="stat-value">{tripDistance ? tripDistance.durationText : `${quote.eta} min`}</div>
                  <div className="stat-label">Est. Time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Offer - show if eligible and no discount token yet */}
          {isEligible && !discountToken && (
            <div className="ad-offer-card">
              <div className="ad-offer-icon">📺</div>
              <div className="ad-offer-content">
                <h4>Save 12% on your ride!</h4>
                <p>Watch a quick 30-second ad to reduce your fare by ${(quote.fare * 0.12).toFixed(2)}</p>
              </div>
              <div className="ad-offer-actions">
                <button className="watch-ad-btn" onClick={handleWatchAd}>
                  Watch Ad
                </button>
                <button className="skip-ad-btn" onClick={handleSkipAd}>
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
              {discountToken && discountAmount > 0 && (
                <div className="fare-item discount-item">
                  <span>Ad Discount ({adSession?.discountPercentage || 12}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="fare-item total-fare">
                <span>Total</span>
                <span className="total-amount">${finalAmount}</span>
              </div>
            </div>
          </div>

          {/* Confirm Button - pass discount token to backend */}
          <button className="confirm-ride-button" onClick={() => onConfirm(selectedPayment, discountToken)}>
            <span>Confirm Ride</span>
            <span className="button-amount">${finalAmount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
