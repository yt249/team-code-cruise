import { useEffect, useRef } from 'react';
import { useAd } from '../../context/AdContext';
import { useBooking } from '../../context/BookingContext';
import { formatCurrency } from '../../utils/helpers';
import './AdDiscountUI.css';

export default function AdDiscountUI() {
  const {
    adSession,
    showAdOffer,
    adPlaying,
    adProgress,
    playAd,
    updateAdProgress,
    completeAd,
    skipAd
  } = useAd();

  const { quote, createBooking, requestDriver } = useBooking();

  const videoRef = useRef(null);

  // Handle play ad
  const handlePlayAd = () => {
    playAd();
  };

  // Handle skip ad
  const handleSkipAd = async () => {
    await skipAd();
    // Continue with booking without discount
    if (quote) {
      const bookingData = await createBooking(quote, null);
      await requestDriver(bookingData);
    }
  };

  // Handle video time update
  const handleTimeUpdate = () => {
    if (!videoRef.current || !adSession) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    const progress = (currentTime / duration) * 100;

    updateAdProgress(progress);
  };

  // Handle video ended
  const handleVideoEnded = async () => {
    const discountData = await completeAd();

    // Continue with booking with discount
    if (quote && discountData) {
      const bookingData = await createBooking(quote, discountData);
      await requestDriver(bookingData);
    }
  };

  // Auto-play video when ad starts playing
  useEffect(() => {
    if (adPlaying && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [adPlaying]);

  // Render ad offer modal (matching mockup exactly)
  if (showAdOffer && adSession && !adPlaying) {
    return (
      <div className="ad-modal-overlay">
        <div className="ad-offer-modal-new">
          <h2 className="ad-modal-title">Save on your ride!</h2>
          <p className="ad-modal-subtitle">
            Watch a {adSession.ad.duration}-second ad to reduce your fare by ${adSession.discountAmount.toFixed(2)}
          </p>

          <button className="play-button" onClick={handlePlayAd} aria-label="Play advertisement">
            <div className="play-icon">▶</div>
          </button>

          <div className="fare-comparison">
            <div className="fare-row original-fare">
              <span>Original fare:</span>
              <span className="strikethrough">{formatCurrency(adSession.baseFare)}</span>
            </div>
            <div className="fare-row discounted-fare">
              <span>With ad discount:</span>
              <span className="discount-price">{formatCurrency(adSession.finalFare)}</span>
            </div>
          </div>

          <div className="ad-modal-actions">
            <button className="skip-button-new" onClick={handleSkipAd}>
              Skip
            </button>
            <button className="watch-ad-button" onClick={handlePlayAd}>
              ▶ Watch Ad
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render video player (full screen with progress bar)
  if (adPlaying && adSession) {
    return (
      <div className="video-player-overlay">
        <div className="video-player-container">
          <video
            ref={videoRef}
            className="ad-video-fullscreen"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            controls={false}
            aria-label={`Advertisement from ${adSession.ad.advertiser}`}
          >
            <source src={adSession.ad.videoUrl} type="video/mp4" />
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>

          <div className="video-controls-overlay">
            <div className="video-progress-bar-new">
              <div
                className="video-progress-fill-new"
                style={{ width: `${adProgress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(adProgress)}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Advertisement progress"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
