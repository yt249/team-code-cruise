import { randomUUID } from 'node:crypto';
import { PricingService } from '../shared/pricing.service.js';
import { LocationService } from '../shared/location.service.js';
import { QuoteStore } from '../workbench/quoteStore.js';
import { DiscountService } from '../ad/discount.service.js';
export class QuoteService {
    static async getQuote(pickup, dest, opts = {}) {
        const { amount, surge, currency } = PricingService.estimate(pickup, dest, opts);
        const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 minutes expiration
        const etaMinutes = await LocationService.eta(pickup, dest);
        const id = randomUUID();
        let discountApplied = false;
        let discountPercent;
        let discountedAmount;
        let discountTokenId;
        if (opts.tokenId) {
            if (!opts.riderId)
                throw badRequest('Authenticated rider required to apply discount token');
            const token = await DiscountService.validateToken(opts.tokenId, opts.riderId, { quoteId: id });
            const { discountedAmount: nextAmount } = PricingService.applyDiscount(amount, token.percent);
            discountApplied = true;
            discountPercent = token.percent;
            discountedAmount = nextAmount;
            discountTokenId = token.id;
        }
        await QuoteStore.save({
            id,
            riderId: opts.riderId,
            amount,
            surge,
            currency,
            pickup,
            dest,
            expiresAt,
            discountPercent: discountPercent ?? null,
            discountTokenId: discountTokenId ?? null,
            discountedAmount: discountedAmount ?? null
        });
        return {
            id,
            amount,
            surge,
            currency,
            expiresAt: expiresAt.toISOString(),
            etaMinutes,
            discountApplied,
            discountPercent,
            discountedAmount,
            discountTokenId
        };
    }
}
function badRequest(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}
