import { randomUUID } from 'node:crypto';
import { PricingService } from '../shared/pricing.service.js';
import { LocationService } from '../shared/location.service.js';
import { QuoteStore } from '../workbench/quoteStore.js';
export class QuoteService {
    static async getQuote(pickup, dest, opts = {}) {
        const { amount, surge, currency } = PricingService.estimate(pickup, dest, opts);
        const expiresAt = new Date(Date.now() + 5 * 60_000);
        const etaMinutes = await LocationService.eta(pickup, dest);
        const id = randomUUID();
        await QuoteStore.save({
            id,
            riderId: opts.riderId,
            amount,
            surge,
            currency,
            pickup,
            dest,
            expiresAt
        });
        return {
            id,
            amount,
            surge,
            currency,
            expiresAt: expiresAt.toISOString(),
            etaMinutes
        };
    }
}
