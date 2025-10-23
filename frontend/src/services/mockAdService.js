import { generateId, delay } from '../utils/helpers';
import { getRandomAd, calculateDiscountAmount } from '../data/mockAds';

// Mock ad service
export const mockAdService = {
  // Start ad session
  async startAdSession(riderId, baseFare) {
    await delay(500);

    const ad = getRandomAd();
    const discountAmount = calculateDiscountAmount(baseFare, ad.discountPercentage);

    return {
      id: generateId(),
      riderId,
      ad,
      status: 'Offered',
      discountPercentage: ad.discountPercentage,
      discountAmount,
      baseFare,
      finalFare: baseFare - discountAmount,
      ttl: 300, // 5 minutes
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000
    };
  },

  // Record ad event (play, pause, complete, skip)
  async recordAdEvent(sessionId, event) {
    await delay(200);
    console.log(`Ad event: ${event} for session ${sessionId}`);
    return { success: true };
  },

  // Mark ad as completed
  async completeAd(session) {
    await delay(500);

    return {
      ...session,
      status: 'Completed',
      completedAt: Date.now()
    };
  },

  // Skip ad
  async skipAd(session) {
    await delay(300);

    return {
      ...session,
      status: 'Skipped',
      skippedAt: Date.now(),
      discountAmount: 0,
      finalFare: session.baseFare
    };
  },

  // Finalize discount (verify and return discount object)
  async finalizeDiscount(session) {
    await delay(400);

    if (session.status !== 'Completed') {
      return null;
    }

    return {
      sessionId: session.id,
      percentage: session.discountPercentage,
      amount: session.discountAmount,
      appliedAt: Date.now()
    };
  }
};
