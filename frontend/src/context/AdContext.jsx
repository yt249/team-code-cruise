import { createContext, useContext, useState } from 'react';
import { mockAdService } from '../services/mockAdService';

const AdContext = createContext();

export function useAd() {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAd must be used within AdProvider');
  }
  return context;
}

export function AdProvider({ children }) {
  const [adSession, setAdSession] = useState(null);
  const [showAdOffer, setShowAdOffer] = useState(false);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [discount, setDiscount] = useState(null);
  const [loading, setLoading] = useState(false);

  // Start ad session
  const startAdSession = async (riderId, baseFare) => {
    setLoading(true);
    try {
      const session = await mockAdService.startAdSession(riderId, baseFare);
      setAdSession(session);
      setShowAdOffer(true);
      return session;
    } catch (err) {
      console.error('Failed to start ad session:', err);
    } finally {
      setLoading(false);
    }
  };

  // Play ad
  const playAd = async () => {
    if (!adSession) return;

    setAdPlaying(true);
    setShowAdOffer(false);
    await mockAdService.recordAdEvent(adSession.id, 'play');
  };

  // Update ad progress
  const updateAdProgress = (progress) => {
    setAdProgress(progress);
  };

  // Complete ad
  const completeAd = async () => {
    if (!adSession) return;

    setAdPlaying(false);
    await mockAdService.recordAdEvent(adSession.id, 'complete');

    const completedSession = await mockAdService.completeAd(adSession);
    setAdSession(completedSession);

    const discountData = await mockAdService.finalizeDiscount(completedSession);
    setDiscount(discountData);

    return discountData;
  };

  // Skip ad
  const skipAd = async () => {
    if (!adSession) {
      setShowAdOffer(false);
      return null;
    }

    if (adPlaying) {
      await mockAdService.recordAdEvent(adSession.id, 'skip');
    }

    const skippedSession = await mockAdService.skipAd(adSession);
    setAdSession(skippedSession);
    setShowAdOffer(false);
    setAdPlaying(false);
    setDiscount(null);

    return null;
  };

  // Close ad offer modal
  const closeAdOffer = () => {
    setShowAdOffer(false);
  };

  // Reset ad state
  const resetAd = () => {
    setAdSession(null);
    setShowAdOffer(false);
    setAdPlaying(false);
    setAdProgress(0);
    setDiscount(null);
  };

  const value = {
    adSession,
    showAdOffer,
    adPlaying,
    adProgress,
    discount,
    loading,
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
