// Lambda handler for payment endpoints
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { ApiGatewayAdapter } from './apiGatewayAdapter.js'
import { PaymentService } from '../src/core/payment.service.js'

const createIntentSchema = z.object({
  rideId: z.string().uuid(),
})

const confirmSchema = z.object({
  intentId: z.string(),
  method: z.string(),
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

// POST /payments/intents - Create payment intent
export async function createPaymentIntentHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const req = ApiGatewayAdapter.parseRequest(event)
    const { rideId } = createIntentSchema.parse(req.body)

    const intent = await PaymentService.createPaymentIntent(rideId, riderId)
    return ApiGatewayAdapter.successResponse({ intentId: intent.id })
  } catch (error: any) {
    console.error('Create payment intent error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}

// POST /payments/confirm - Confirm payment
export async function confirmPaymentHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const riderId = getUserFromToken(event)
    if (!riderId) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const req = ApiGatewayAdapter.parseRequest(event)
    const { intentId, method } = confirmSchema.parse(req.body)

    const status = await PaymentService.confirmPayment(intentId, method, riderId)
    return ApiGatewayAdapter.successResponse({ status })
  } catch (error: any) {
    console.error('Confirm payment error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, error.message || 'Internal server error')
  }
}
