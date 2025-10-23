import { LatLng } from '../shared/location.service.js'

type QuoteRecord = {
  id: string
  riderId?: string
  amount: number
  surge: number
  currency: string
  pickup: LatLng
  dest: LatLng
  expiresAt: Date
  discountTokenId?: string | null
  discountPercent?: number | null
  discountedAmount?: number | null
}

class InMemoryQuoteStore {
  private quotes = new Map<string, QuoteRecord>()

  async save(record: QuoteRecord) {
    this.cleanup()
    this.quotes.set(record.id, record)
  }

  async get(id: string) {
    this.cleanup()
    return this.quotes.get(id)
  }

  async delete(id: string) {
    this.quotes.delete(id)
  }

  async clear() {
    this.quotes.clear()
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.quotes.entries()) {
      if (value.expiresAt.getTime() <= now) this.quotes.delete(key)
    }
  }
}

export const QuoteStore = new InMemoryQuoteStore()
