import { randomUUID } from 'node:crypto'
import { AdStatus } from '@prisma/client'
import { AdSessionRepository } from '../repo/adSession.repository.js'
import { DiscountService } from './discount.service.js'
import { EligibilityService } from './eligibility.service.js'
import { EventBus } from '../shared/eventBus.js'

const SESSION_TTL_MS = 5 * 60 * 1000
const DEFAULT_PROVIDER = 'AcmeAds'

type PlaybackEvent = 'start' | '25%' | '50%' | '75%' | 'complete'

const VALID_EVENTS: PlaybackEvent[] = ['start', '25%', '50%', '75%', 'complete']

export class AdService {
  static async createSession(riderId: string, percent: number) {
    if (percent < 10 || percent > 15) throw httpError('Percent must be between 10 and 15', 400)
    const eligibility = await EligibilityService.checkRider(riderId)
    if (!eligibility.isEligible) {
      const err = httpError('Rider not eligible to view advertisement right now', 409)
      ;(err as any).cooldownEndsAt = eligibility.cooldownEndsAt
      throw err
    }

    const id = randomUUID()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    await AdSessionRepository.save({
      id,
      riderId,
      percent,
      provider: DEFAULT_PROVIDER,
      status: AdStatus.OFFERED,
      startedAt: null,
      completedAt: null,
      playbackEvents: {},
      expiresAt
    })

    return {
      sessionId: id,
      provider: DEFAULT_PROVIDER,
      percent,
      expiresAt
    }
  }

  static async recordPlayback(sessionId: string, event: PlaybackEvent, ts?: Date) {
    if (!VALID_EVENTS.includes(event)) throw httpError('Unsupported playback event', 400)
    const session = await AdSessionRepository.findById(sessionId)
    if (!session) throw httpError('Ad session not found', 404)
    this.ensureActive(session)

    const timestamp = ts ?? new Date()
    const events = { ...session.playbackEvents, [event]: timestamp.toISOString() }
    let status = session.status
    let startedAt = session.startedAt

    if (event === 'start') {
      status = AdStatus.WATCHING
      startedAt = timestamp
    }

    if (event !== 'start' && !session.playbackEvents.start) {
      throw httpError('Playback sequence invalid. Start event missing.', 422)
    }

    const updated = await AdSessionRepository.update(sessionId, {
      status,
      startedAt,
      playbackEvents: events
    })

    return updated
  }

  static async completeSession(sessionId: string) {
    const session = await AdSessionRepository.findById(sessionId)
    if (!session) throw httpError('Ad session not found', 404)
    this.ensureActive(session, { allowCompleted: true })

    if (session.status === AdStatus.COMPLETED && session.tokenId) {
      const token = await DiscountService.fetch(session.tokenId)
      if (token) return token
    }

    if (!session.playbackEvents.start || !session.playbackEvents['75%'] || !session.playbackEvents.complete) {
      throw httpError('Ad session missing required playback checkpoints', 422)
    }

    const completedAt = new Date()
    await AdSessionRepository.update(sessionId, {
      status: AdStatus.COMPLETED,
      completedAt,
      playbackEvents: {
        ...session.playbackEvents,
        complete: session.playbackEvents.complete ?? completedAt.toISOString()
      }
    })

    EligibilityService.registerCompletion(session.riderId, completedAt)
    EventBus.publish('ads.session.completed', {
      sessionId: session.id,
      riderId: session.riderId,
      percent: session.percent
    })

    const token = await DiscountService.mintToken(session.id, session.riderId, session.percent)
    await AdSessionRepository.update(sessionId, { tokenId: token.id })
    return token
  }

  private static ensureActive(
    session: {
      status: AdStatus
      expiresAt: Date
    },
    opts: { allowCompleted?: boolean } = {}
  ) {
    if (session.expiresAt.getTime() <= Date.now()) {
      throw httpError('Ad session expired', 410)
    }
    if (session.status === AdStatus.CANCELLED) throw httpError('Ad session cancelled', 409)
    if (session.status === AdStatus.COMPLETED && !opts.allowCompleted) {
      throw httpError('Ad session already completed', 409)
    }
  }
}

function httpError(message: string, status = 400) {
  const err = new Error(message)
  ;(err as any).status = status
  return err
}
