/** @jest-environment node */

import { authRouter } from '../src/web/auth.controller.ts'
import { quoteRouter } from '../src/web/quote.controller.ts'
import { adsRouter } from '../src/web/ad.controller.ts'
import { rideRouter } from '../src/web/ride.controller.ts'
import { paymentRouter } from '../src/web/payment.controller.ts'
import { initMemoryDb, resetMemoryDb } from '../src/workbench/memoryDb.ts'
import { QuoteStore } from '../src/workbench/quoteStore.ts'
import { EligibilityService } from '../src/ad/eligibility.service.ts'
import { executeRouterRoute } from './helpers/routerTestUtils'

const PICKUP = { lat: 40.4443, lon: -79.9436 }
const DEST = { lat: 40.4506, lon: -79.9859 }
const TEST_EMAIL = 'rider@example.com'
const TEST_PASSWORD = 'ride1234'

jest.setTimeout(20000)

type QuoteResponse = {
  id: string
  amount: number
  discountApplied?: boolean
  discountPercent?: number
  discountedAmount?: number
}

async function login() {
  const response = await executeRouterRoute(authRouter, 'POST', '/login', {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD }
  })
  expect(response.status).toBe(200)
  return response.body.token as string
}

async function requestQuote({
  tokenId,
  authToken
}: {
  tokenId?: string | null
  authToken?: string | null
} = {}) {
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined
  const response = await executeRouterRoute(quoteRouter, 'POST', '/', {
    headers,
    body: {
      pickup: PICKUP,
      dest: DEST,
      ...(tokenId ? { tokenId } : {})
    }
  })
  expect(response.status).toBe(200)
  return response.body as QuoteResponse
}

async function requestRide(
  authToken: string,
  quoteId: string,
  opts: { tokenId?: string | null } = {}
) {
  const response = await executeRouterRoute(rideRouter, 'POST', '/', {
    headers: { Authorization: `Bearer ${authToken}` },
    body: {
      pickup: PICKUP,
      dest: DEST,
      quoteId,
      ...(opts.tokenId ? { tokenId: opts.tokenId } : {})
    }
  })
  expect(response.status).toBe(201)
  return response.body
}

async function getRide(authToken: string, rideId: string) {
  const response = await executeRouterRoute(rideRouter, 'GET', '/:id', {
    headers: { Authorization: `Bearer ${authToken}` },
    params: { id: rideId }
  })
  expect(response.status).toBe(200)
  return response.body
}

async function cancelRide(authToken: string, rideId: string) {
  const response = await executeRouterRoute(rideRouter, 'POST', '/:id/cancel', {
    headers: { Authorization: `Bearer ${authToken}` },
    params: { id: rideId }
  })
  expect(response.status).toBe(200)
  return response.body
}

async function completeRide(authToken: string, rideId: string) {
  const response = await executeRouterRoute(rideRouter, 'POST', '/:id/complete', {
    headers: { Authorization: `Bearer ${authToken}` },
    params: { id: rideId }
  })
  expect(response.status).toBe(200)
  return response.body
}

async function createPaymentIntent(authToken: string, rideId: string) {
  const response = await executeRouterRoute(paymentRouter, 'POST', '/intents', {
    headers: { Authorization: `Bearer ${authToken}` },
    body: { rideId }
  })
  expect(response.status).toBe(200)
  return response.body.intentId as string
}

async function confirmPayment(authToken: string, intentId: string, method: string) {
  const response = await executeRouterRoute(paymentRouter, 'POST', '/confirm', {
    headers: { Authorization: `Bearer ${authToken}` },
    body: { intentId, method }
  })
  expect(response.status).toBe(200)
  return response.body.status as string
}

async function startAdSession(authToken: string, percent = 12) {
  const response = await executeRouterRoute(adsRouter, 'POST', '/sessions', {
    headers: { Authorization: `Bearer ${authToken}` },
    body: { percent }
  })
  return response.body
}

async function recordAdPlayback(authToken: string, sessionId: string, event: 'start' | '25%' | '50%' | '75%' | 'complete') {
  return executeRouterRoute(adsRouter, 'POST', '/playback', {
    headers: { Authorization: `Bearer ${authToken}` },
    body: { sessionId, event }
  })
}

async function completeAdSession(authToken: string, sessionId: string) {
  const response = await executeRouterRoute(adsRouter, 'POST', '/complete', {
    headers: { Authorization: `Bearer ${authToken}` },
    body: { sessionId }
  })
  expect(response.status).toBe(200)
  return response.body
}

async function earnDiscountToken(authToken: string, percent = 12) {
  await executeRouterRoute(adsRouter, 'GET', '/eligibility', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  const session = await startAdSession(authToken, percent)
  const sessionId = session.sessionId as string

  await recordAdPlayback(authToken, sessionId, 'start')
  await recordAdPlayback(authToken, sessionId, '25%')
  await recordAdPlayback(authToken, sessionId, '50%')
  await recordAdPlayback(authToken, sessionId, '75%')
  const completion = await recordAdPlayback(authToken, sessionId, 'complete')
  expect(completion.status).toBe(200)

  const token = await completeAdSession(authToken, sessionId)
  return { sessionId, tokenId: token.tokenId as string, percent }
}

describe('Ride booking integration flows', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeAll(() => {
    initMemoryDb({ seed: true })
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    resetMemoryDb({ seed: true })
    await QuoteStore.clear()
    EligibilityService.clear()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('Fare Quote & Discount Binding Pathway', () => {
    test('returns base fare when no discount token is used', async () => {
      const quote = await requestQuote()
      expect(quote.amount).toBeGreaterThan(0)
      expect(quote.discountApplied).toBeFalsy()
    })

    test('applies ad discount token to quote requests', async () => {
      const authToken = await login()
      const discount = await earnDiscountToken(authToken, 12)
      const quote = await requestQuote({ tokenId: discount.tokenId, authToken })

      expect(quote.discountApplied).toBe(true)
      expect(quote.discountPercent).toBe(discount.percent)
      expect(quote.discountedAmount).toBeLessThan(quote.amount)
    })
  })

  describe('Ad-Based Discount Flow', () => {
    test('enforces playback order for quartile events', async () => {
      const authToken = await login()
      const session = await startAdSession(authToken, 10)
      const response = await recordAdPlayback(authToken, session.sessionId as string, '25%')

      expect(response.status).toBe(422)
      expect(response.body.error).toMatch(/Playback sequence/)
    })

    test('blocks new ad sessions during cooldown', async () => {
      const authToken = await login()
      await earnDiscountToken(authToken, 15)

      const response = await executeRouterRoute(adsRouter, 'POST', '/sessions', {
        headers: { Authorization: `Bearer ${authToken}` },
        body: { percent: 11 }
      })

      expect(response.status).toBe(409)
      expect(response.body.error).toMatch(/not eligible/i)
    })
  })

  describe('Ride Lifecycle & Driver Tracking Pathway', () => {
    test('creates a ride and allows cancellation', async () => {
      const authToken = await login()
      const quote = await requestQuote()
      const ride = await requestRide(authToken, quote.id)

      expect(ride.driver).toBeTruthy()
      expect(ride.status).toBeDefined()

      const cancel = await cancelRide(authToken, ride.id)
      expect(cancel.status).toBe('CANCELLED')

      const fetched = await getRide(authToken, ride.id)
      expect(fetched.status).toBe('CANCELLED')
    })

    test('completes a ride and returns updated status', async () => {
      const authToken = await login()
      const quote = await requestQuote()
      const ride = await requestRide(authToken, quote.id)

      const completed = await completeRide(authToken, ride.id)
      expect(completed.status).toBe('COMPLETED')

      const fetched = await getRide(authToken, ride.id)
      expect(fetched.status).toBe('COMPLETED')
    })
  })

  describe('Payment Intent & Confirmation Pathway', () => {
    test('creates a payment intent and confirms payment success', async () => {
      const authToken = await login()
      const quote = await requestQuote()
      const ride = await requestRide(authToken, quote.id)

      const intentId = await createPaymentIntent(authToken, ride.id)
      const status = await confirmPayment(authToken, intentId, 'card')

      expect(status).toBe('PAID')
    })

    test('reports payment failures when gateway declines', async () => {
      const authToken = await login()
      const quote = await requestQuote()
      const ride = await requestRide(authToken, quote.id)

      const intentId = await createPaymentIntent(authToken, ride.id)
      const status = await confirmPayment(authToken, intentId, 'fail-card')

      expect(status).toBe('PAYMENT_FAILED')
    })
  })

  describe('Full Booking Journey Pathway', () => {
    test('completes ad discount, ride, and payment flow end-to-end', async () => {
      const authToken = await login()
      const discount = await earnDiscountToken(authToken, 15)
      const quote = await requestQuote({ tokenId: discount.tokenId, authToken })
      expect(quote.discountApplied).toBe(true)

      const ride = await requestRide(authToken, quote.id, { tokenId: discount.tokenId })
      const completed = await completeRide(authToken, ride.id)
      expect(completed.status).toBe('COMPLETED')

      const intentId = await createPaymentIntent(authToken, ride.id)
      const paymentStatus = await confirmPayment(authToken, intentId, 'card')
      expect(paymentStatus).toBe('PAID')

      const fetched = await getRide(authToken, ride.id)
      expect(fetched.status).toBe('COMPLETED')
      expect(fetched.discountPercent).toBe(discount.percent)
    })
  })
})
