import { Router } from 'express'
import { z } from 'zod'
import { AuthService } from '../shared/auth.service.js'
import { EligibilityService } from '../ad/eligibility.service.js'
import { AdService } from '../ad/ad.service.js'
import { DiscountService } from '../ad/discount.service.js'

export const adsRouter = Router()

const playbackSchema = z.object({
  sessionId: z.string().uuid(),
  event: z.enum(['start', '25%', '50%', '75%', 'complete']),
  ts: z.string().datetime({ offset: true }).optional()
})

const sessionSchema = z.object({
  percent: z.number().int().min(10).max(15)
})

const completeSchema = z.object({
  sessionId: z.string().uuid()
})

const redeemSchema = z.object({
  tokenId: z.string().min(1),
  rideId: z.string().uuid(),
  quoteId: z.string().uuid().optional()
})

adsRouter.get('/eligibility', AuthService.required, async (req, res) => {
  const riderId = req.user!.sub
  const eligibility = await EligibilityService.checkRider(riderId)
  res.json({
    isEligible: eligibility.isEligible,
    cooldownEndsAt: eligibility.cooldownEndsAt?.toISOString()
  })
})

adsRouter.post('/sessions', AuthService.required, async (req, res) => {
  const riderId = req.user!.sub
  const { percent } = sessionSchema.parse(req.body)
  const session = await AdService.createSession(riderId, percent)
  res.status(201).json({
    sessionId: session.sessionId,
    provider: session.provider,
    percent: session.percent,
    expiresAt: session.expiresAt.toISOString()
  })
})

adsRouter.post('/playback', AuthService.required, async (req, res) => {
  const { sessionId, event, ts } = playbackSchema.parse(req.body)
  const timestamp = ts ? new Date(ts) : undefined
  if (timestamp && Number.isNaN(timestamp.getTime())) {
    throw Object.assign(new Error('Invalid timestamp'), { status: 400 })
  }
  await AdService.recordPlayback(sessionId, event, timestamp)
  res.json({ ok: true })
})

adsRouter.post('/complete', AuthService.required, async (req, res) => {
  const { sessionId } = completeSchema.parse(req.body)
  const token = await AdService.completeSession(sessionId)
  res.json({ tokenId: token.id, expiresAt: token.expiresAt.toISOString() })
})

adsRouter.post('/token/redeem', AuthService.required, async (req, res) => {
  const riderId = req.user!.sub
  const { tokenId, rideId, quoteId } = redeemSchema.parse(req.body)
  const token = await DiscountService.redeemToken(tokenId, rideId, {
    quoteId,
    riderId
  })
  res.json({ state: token.state })
})
