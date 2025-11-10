export class PricingService {
    static baseFare(_pickup, _dest) {
        return 500;
    }
    static surgeFactor(_area, _t) {
        return 1.0;
    }
    static estimate(pickup, dest, _opts) {
        const base = this.baseFare(pickup, dest);
        const surge = this.surgeFactor('default', new Date());
        const amount = Math.round(base * surge);
        return { amount, surge, currency: 'USD' };
    }
    static applyDiscount(baseAmount, percent) {
        const discount = Math.round((baseAmount * percent) / 100);
        const discounted = Math.max(0, baseAmount - discount);
        return {
            discountedAmount: discounted,
            savings: discount
        };
    }
}
