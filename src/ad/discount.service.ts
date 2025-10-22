import { TokenState } from '@prisma/client'
import { EventBus } from '../shared/eventBus.js'
import {
  DiscountTokenRecord,
  DiscountTokenRepository
} from '../repo/discountToken.repository.js'

const TOKEN_TTL_MS = 15 * 60 * 1000
const MIN_PERCENT = 10
const MAX_PERCENT = 15

type ValidationContext = {
  quoteId?: string
  riderId?: string
}

export class DiscountService {
  static async mintToken(
    sessionId: string,
    riderId: string,
    percent: number
  ): Promise<DiscountTokenRecord> {
    if (percent < MIN_PERCENT || percent > MAX_PERCENT) {
      throw httpError('Requested discount percent is out of allowed range', 400)
    }
    const id = generateUlid()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
    const token = await DiscountTokenRepository.mint({
      id,
      riderId,
      percent,
      quoteId: null,
      expiresAt,
      sessionId
    })
    EventBus.publish('ads.token.minted', { tokenId: token.id, riderId, percent })
    return token
  }

  static async validateToken(
    tokenId: string,
    riderId: string,
    ctx: ValidationContext = {}
  ): Promise<DiscountTokenRecord> {
    const token = await DiscountTokenRepository.findActiveById(tokenId)
    if (!token) throw httpError('Discount token not found or inactive', 404)
    if (token.riderId !== riderId) throw httpError('Discount token does not belong to rider', 403)
    if (token.expiresAt.getTime() <= Date.now()) {
      await DiscountTokenRepository.update(token.id, { state: TokenState.EXPIRED })
      throw httpError('Discount token expired', 410)
    }
    if (ctx.quoteId && token.quoteId && token.quoteId !== ctx.quoteId) {
      throw httpError('Discount token already bound to a different quote', 409)
    }
    if (ctx.quoteId && !token.quoteId) {
      await DiscountTokenRepository.update(token.id, { quoteId: ctx.quoteId })
      token.quoteId = ctx.quoteId
    }
    return token
  }

  static async redeemToken(
    tokenId: string,
    rideId: string,
    ctx: ValidationContext = {}
  ): Promise<DiscountTokenRecord> {
    const token = await DiscountTokenRepository.findById(tokenId)
    if (!token) throw httpError('Discount token not found', 404)
    if (token.state !== TokenState.ACTIVE) throw httpError('Discount token is not redeemable', 409)
    if (ctx.riderId && token.riderId !== ctx.riderId) {
      throw httpError('Discount token does not belong to rider', 403)
    }
    if (token.expiresAt.getTime() <= Date.now()) {
      await DiscountTokenRepository.update(token.id, { state: TokenState.EXPIRED })
      throw httpError('Discount token expired', 410)
    }
    if (ctx.quoteId && token.quoteId && token.quoteId !== ctx.quoteId) {
      throw httpError('Discount token bound to another quote', 409)
    }
    const updated = await DiscountTokenRepository.update(token.id, {
      state: TokenState.REDEEMED,
      redeemedRideId: rideId
    })
    EventBus.publish('ads.token.redeemed', { tokenId, rideId })
    return updated
  }

  static async fetch(tokenId: string) {
    return DiscountTokenRepository.findById(tokenId)
  }
}

function httpError(message: string, status = 400) {
  const err = new Error(message)
  ;(err as any).status = status
  return err
}

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function generateUlid() {
  const time = Date.now()
  const timeChars = encodeTime(time, 10)
  const randChars = encodeRandom(16)
  return timeChars + randChars
}

function encodeTime(time: number, length: number) {
  let value = time
  const chars = Array<string>(length)
  for (let i = length - 1; i >= 0; i -= 1) {
    const mod = value % 32
    chars[i] = ENCODING[mod]
    value = Math.floor(value / 32)
  }
  return chars.join('')
}

function encodeRandom(length: number) {
  const chars = Array<string>(length)
  for (let i = 0; i < length; i += 1) {
    const rand = Math.floor(Math.random() * 32)
    chars[i] = ENCODING[rand]
  }
  return chars.join('')
}
