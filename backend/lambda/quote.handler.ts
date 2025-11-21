// Lambda handler for quote endpoints
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { ApiGatewayAdapter } from './apiGatewayAdapter.js'
import { QuoteService } from '../src/core/quote.service.js'

const quoteSchema = z.object({
  pickup: z.object({ lat: z.number(), lon: z.number() }),
  dest: z.object({ lat: z.number(), lon: z.number() }),
  tokenId: z.string().min(1).optional(),
  opts: z.object({
    vehicleType: z.string().optional(),
    pax: z.number().optional(),
  }).optional(),
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

// POST /quotes - Get fare quote
export async function createQuoteHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event) // Optional for quotes

    const req = ApiGatewayAdapter.parseRequest(event)
    const { pickup, dest, opts, tokenId } = quoteSchema.parse(req.body)

    const quote = await QuoteService.getQuote(pickup, dest, {
      riderId: riderId || undefined,
      ...(opts ?? {}),
      tokenId,
    })

    return ApiGatewayAdapter.successResponse(quote)
  } catch (error: any) {
    console.error('Create quote error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}
