import { LatLng } from './location.service.js'

export class PricingService {
  static baseFare(_pickup: LatLng, _dest: LatLng): number {
    return 500
  }

  static surgeFactor(_area: string, _t: Date): number {
    return 1.0
  }

  static estimate(pickup: LatLng, dest: LatLng, _opts?: any) {
    const base = this.baseFare(pickup, dest)
    const surge = this.surgeFactor('default', new Date())
    const amount = Math.round(base * surge)
    return { amount, surge, currency: 'USD' as const }
  }

  static applyDiscount(baseAmount: number, percent: number) {
    const discount = Math.round((baseAmount * percent) / 100)
    const discounted = Math.max(0, baseAmount - discount)
    return {
      discountedAmount: discounted,
      savings: discount
    }
  }
}
