// Lambda handler for ad endpoints
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { ApiGatewayAdapter } from './apiGatewayAdapter.js'
import { EligibilityService } from '../src/ad/eligibility.service.js'
import { AdService } from '../src/ad/ad.service.js'

const playbackSchema = z.object({
  sessionId: z.string().uuid(),
  event: z.enum(['start', '25%', '50%', '75%', 'complete']),
  ts: z.string().datetime({ offset: true }).optional(),
})

const sessionSchema = z.object({
  percent: z.number().int().min(10).max(15),
})

const completeSchema = z.object({
  sessionId: z.string().uuid(),
})

function getUserFromToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers.Authorization || event.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  try {
    const token = authHeader.substring(7)
    const secret = process.env.JWT_SECRET || 'secret'
    const decoded: any = jwt.verify(token, secret)
    return decoded.sub
  } catch {
    return null
  }
}

// GET /ads/eligibility - Check ad eligibility
export async function checkEligibilityHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const eligibility = await EligibilityService.checkRider(riderId)
    return ApiGatewayAdapter.successResponse({
      isEligible: eligibility.isEligible,
      cooldownEndsAt: eligibility.cooldownEndsAt?.toISOString(),
    })
  } catch (error: any) {
    console.error('Check eligibility error:', error)
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// POST /ads/sessions - Create ad session
export async function createAdSessionHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const req = ApiGatewayAdapter.parseRequest(event)
    const { percent } = sessionSchema.parse(req.body)

    const session = await AdService.createSession(riderId, percent)
    return ApiGatewayAdapter.createResponse(201, {
      sessionId: session.sessionId,
      provider: session.provider,
      percent: session.percent,
      expiresAt: session.expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Create ad session error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// POST /ads/playback - Record ad playback
export async function recordPlaybackHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const req = ApiGatewayAdapter.parseRequest(event)
    const { sessionId, event: adEvent, ts } = playbackSchema.parse(req.body)

    const timestamp = ts ? new Date(ts) : undefined
    if (timestamp && Number.isNaN(timestamp.getTime())) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid timestamp')
    }

    await AdService.recordPlayback(sessionId, adEvent, timestamp)
    return ApiGatewayAdapter.successResponse({ ok: true })
  } catch (error: any) {
    console.error('Record playback error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// POST /ads/complete - Complete ad and get token
export async function completeAdHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const req = ApiGatewayAdapter.parseRequest(event)
    const { sessionId } = completeSchema.parse(req.body)

    const token = await AdService.completeSession(sessionId)
    return ApiGatewayAdapter.successResponse({
      tokenId: token.id,
      expiresAt: token.expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Complete ad error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// POST /ads/reset-cooldown - Reset ad cooldown (for testing)
export async function resetCooldownHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    EligibilityService.clear(riderId)
    return ApiGatewayAdapter.successResponse({
      message: 'Cooldown reset successfully',
      riderId
    })
  } catch (error: any) {
    console.error('Reset cooldown error:', error)
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}
