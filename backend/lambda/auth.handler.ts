// Lambda handler for authentication endpoints
import './init.js' // Initialize Lambda environment on cold start
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { ApiGatewayAdapter } from './apiGatewayAdapter.js'
import { UserRepository } from '../src/repo/user.repository.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// POST /login
export async function loginHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const req = ApiGatewayAdapter.parseRequest(event)

    // Validate input
    const { email, password } = loginSchema.parse(req.body)

    // Find user
    const user = await UserRepository.findByEmail(email)
    if (!user) {
      return ApiGatewayAdapter.errorResponse(401, 'Invalid credentials')
    }

    // Check password
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      return ApiGatewayAdapter.errorResponse(401, 'Invalid credentials')
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'secret'
    const token = jwt.sign({ sub: user.id, role: 'rider' }, secret, {
      expiresIn: '7d',
    })

    return ApiGatewayAdapter.successResponse({ token })
  } catch (error: any) {
    console.error('Login error:', error)
    if (error instanceof z.ZodError) {
      return ApiGatewayAdapter.errorResponse(400, 'Invalid input')
    }
    return ApiGatewayAdapter.errorResponse(500, 'Internal server error')
  }
}

// GET /me
export async function meHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Extract JWT from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiGatewayAdapter.errorResponse(401, 'Unauthorized')
    }

    const token = authHeader.substring(7)
    const secret = process.env.JWT_SECRET || 'secret'

    let decoded: any
    try {
      decoded = jwt.verify(token, secret)
    } catch (e) {
      return ApiGatewayAdapter.errorResponse(401, 'Invalid token')
    }

    // Get user
    const user = await UserRepository.findById(decoded.sub)
    if (!user) {
      return ApiGatewayAdapter.errorResponse(404, 'User not found')
    }

    return ApiGatewayAdapter.successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      rating: user.rating,
      createdAt: user.createdAt,
    })
  } catch (error: any) {
    console.error('Me endpoint error:', error)
    return ApiGatewayAdapter.errorResponse(500, 'Internal server error')
  }
}
