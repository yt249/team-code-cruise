// Lambda handler for ride endpoints
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { ApiGatewayAdapter } from './apiGatewayAdapter.js'
import { RideService } from '../src/core/ride.service.js'
import { MatchingService } from '../src/core/matching.service.js'
import { initializeDriverLocations } from './init-drivers.js'

// Global flag to ensure initialization runs only once per Lambda container
let initialized = false

async function ensureInitialized() {
  if (!initialized) {
    await initializeDriverLocations()
    initialized = true
  }
}

const createRideSchema = z.object({
  pickup: z.object({ lat: z.number(), lon: z.number() }),
  dest: z.object({ lat: z.number(), lon: z.number() }),
  quoteId: z.string().uuid(),
  tokenId: z.string().min(1).optional(),
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

// POST /rides - Create ride
export async function createRideHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Initialize driver locations on cold start
    await ensureInitialized()

    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const req = ApiGatewayAdapter.parseRequest(event)
    const { pickup, dest, quoteId, tokenId } = createRideSchema.parse(req.body)

    const ride = await RideService.createRide({ riderId, pickup, dest, quoteId, tokenId })
    await MatchingService.assignDriver(ride.id)
    const hydrated = await RideService.getRide(ride.id, riderId)

    return ApiGatewayAdapter.createResponse(201, hydrated)
  } catch (error: any) {
    console.error('Create ride error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// GET /rides/{id} - Get ride details
export async function getRideHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const rideId = event.pathParameters?.id
    if (!rideId) {
      return ApiGatewayAdapter.errorResponse(400, 'Missing ride ID')
    }

    const ride = await RideService.getRide(rideId, riderId)
    return ApiGatewayAdapter.successResponse(ride)
  } catch (error: any) {
    console.error('Get ride error:', error)
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// POST /rides/{id}/cancel - Cancel ride
export async function cancelRideHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const rideId = event.pathParameters?.id
    if (!rideId) {
      return ApiGatewayAdapter.errorResponse(400, 'Missing ride ID')
    }

    const ride = await RideService.cancelRide(rideId, riderId)
    return ApiGatewayAdapter.successResponse({ status: ride.status })
  } catch (error: any) {
    console.error('Cancel ride error:', error)
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// POST /rides/{id}/complete - Complete ride
export async function completeRideHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const rideId = event.pathParameters?.id
    if (!rideId) {
      return ApiGatewayAdapter.errorResponse(400, 'Missing ride ID')
    }

    const ride = await RideService.completeRide(rideId, riderId)
    return ApiGatewayAdapter.successResponse({ status: ride.status })
  } catch (error: any) {
    console.error('Complete ride error:', error)
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}
