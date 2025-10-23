import { createContext, useContext, useState } from 'react';
import { adService } from '../services/advertisementService';

const AdContext = createContext();

export function useAd() {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAd must be used within AdProvider');
  }
  return context;
}

export function AdProvider({ children }) {
  const [isEligible, setIsEligible] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null);
  const [adSession, setAdSession] = useState(null);
  const [showAdOffer, setShowAdOffer] = useState(false);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [discountToken, setDiscountToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check ad eligibility
  const checkEligibility = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adService.checkEligibility();
      setIsEligible(result.isEligible);
      setCooldownEndsAt(result.cooldownEndsAt);
      return result;
    } catch (err) {
      console.error('Failed to check eligibility:', err);
      setError(err.message);
      setIsEligible(false);
    } finally {
      setLoading(false);
    }
  };

  // Start ad session (percent: 10-15, baseFare: ride cost)
  const startAdSession = async (percent = 10, baseFare = 0) => {
    setLoading(true);
    setError(null);
    try {
      const session = await adService.createSession(percent);

      // Enrich session with ad data and fare calculations
      const enrichedSession = {
        ...session,
        baseFare: baseFare,
        discountAmount: baseFare * (percent / 100),
        finalFare: baseFare - (baseFare * (percent / 100)),
        ad: {
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
          duration: 30,
          advertiser: session.provider || 'CodeCruise Ads'
        }
      };

      setAdSession(enrichedSession);
      setShowAdOffer(true);
      return enrichedSession;
    } catch (err) {
      console.error('Failed to start ad session:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Play ad (start playback)
  const playAd = async () => {
    if (!adSession || !adSession.sessionId) return;

    setAdPlaying(true);
    setShowAdOffer(false);
    setError(null);

    try {
      // Record ad start event
      await adService.recordStart(adSession.sessionId);
    } catch (err) {
      console.error('Failed to record ad start:', err);
      setError(err.message);
    }
  };

  // Update ad progress (triggers quartile tracking)
  const updateAdProgress = async (progress) => {
    setAdProgress(progress);

    if (!adSession || !adSession.sessionId) return;

    try {
      // Record quartile events
      if (progress >= 0.25 && progress < 0.3) {
        await adService.recordQuartile(adSession.sessionId, '25%');
      } else if (progress >= 0.5 && progress < 0.55) {
        await adService.recordQuartile(adSession.sessionId, '50%');
      } else if (progress >= 0.75 && progress < 0.8) {
        await adService.recordQuartile(adSession.sessionId, '75%');
      }
    } catch (err) {
      console.error('Failed to record ad progress:', err);
    }
  };

  // Complete ad and get discount token
  const completeAd = async () => {
    if (!adSession || !adSession.sessionId) return null;

    setLoading(true);
    setError(null);

    try {
      // Record complete event
      await adService.recordComplete(adSession.sessionId);

      // Get discount token
      const token = await adService.completeSession(adSession.sessionId);
      setDiscountToken(token);
      setAdPlaying(false);

      return token;
    } catch (err) {
      console.error('Failed to complete ad:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Skip ad (no discount)
  const skipAd = () => {
    setShowAdOffer(false);
    setAdPlaying(false);
    setAdSession(null);
    setDiscountToken(null);
    setAdProgress(0);
  };

  // Close ad offer modal
  const closeAdOffer = () => {
    setShowAdOffer(false);
  };

  // Reset ad state
  const resetAd = () => {
    setIsEligible(false);
    setCooldownEndsAt(null);
    setAdSession(null);
    setShowAdOffer(false);
    setAdPlaying(false);
    setAdProgress(0);
    setDiscountToken(null);
    setError(null);
  };

  const value = {
    // State
    isEligible,
    cooldownEndsAt,
    adSession,
    showAdOffer,
    adPlaying,
    adProgress,
    discountToken,
    loading,
    error,
    // Methods
    checkEligibility,
    startAdSession,
    playAd,
    updateAdProgress,
    completeAd,
    skipAd,
    closeAdOffer,
    resetAd
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
}
