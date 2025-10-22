process.env.RB_DATA_MODE = 'memory'
process.env.JWT_SECRET = 'test-secret'

const { test, beforeEach, afterEach } = await import('node:test')
const assert = (await import('node:assert/strict')).default
const { initMemoryDb, getMemoryDb, resetMemoryDb } = await import('../src/workbench/memoryDb.js')
const { QuoteStore } = await import('../src/workbench/quoteStore.js')
const { AdService } = await import('../src/ad/ad.service.js')
const { EligibilityService } = await import('../src/ad/eligibility.service.js')
const { QuoteService } = await import('../src/core/quote.service.js')
const { RideService } = await import('../src/core/ride.service.js')
const { DiscountTokenRepository } = await import('../src/repo/discountToken.repository.js')
const { TokenState } = await import('@prisma/client')

beforeEach(async () => {
  initMemoryDb({ seed: true })
  await QuoteStore.clear()
  EligibilityService.clear()
})

afterEach(async () => {
  await QuoteStore.clear()
  resetMemoryDb({ seed: true })
  EligibilityService.clear()
})

function seededEntities() {
  const db = getMemoryDb()
  const rider = Array.from(db.users.values())[0]
  const driver = Array.from(db.drivers.values())[0]
  const pickup = db.driverLocations.get(driver.id) || {
    lat: 37.7749,
    lon: -122.4194,
    available: true
  }
  return { rider, pickup }
}

test('rider can complete ad session to receive discount token and book discounted ride', async () => {
  const { rider, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.02, lon: pickup.lon + 0.015 }

  const eligibility = await EligibilityService.checkRider(rider.id)
  assert.equal(eligibility.isEligible, true)

  const session = await AdService.createSession(rider.id, 12)
  await AdService.recordPlayback(session.sessionId, 'start')
  await AdService.recordPlayback(session.sessionId, '25%')
  await AdService.recordPlayback(session.sessionId, '50%')
  await AdService.recordPlayback(session.sessionId, '75%')
  await AdService.recordPlayback(session.sessionId, 'complete')

  const token = await AdService.completeSession(session.sessionId)
  assert.ok(token.id)
  assert.equal(token.percent, 12)

  const eligibilityPost = await EligibilityService.checkRider(rider.id)
  assert.equal(eligibilityPost.isEligible, false)
  assert.ok(eligibilityPost.cooldownEndsAt instanceof Date)

  const quote = await QuoteService.getQuote(pickup, dest, {
    riderId: rider.id,
    tokenId: token.id
  })

  assert.equal(quote.discountApplied, true)
  assert.equal(quote.discountPercent, token.percent)
  assert.ok(typeof quote.discountedAmount === 'number')
  assert.equal(quote.discountTokenId, token.id)

  const ride = await RideService.createRide({
    riderId: rider.id,
    pickup,
    dest,
    quoteId: quote.id,
    tokenId: token.id
  })

  assert.equal(ride.discountTokenId, token.id)
  assert.equal(ride.discountPercent, token.percent)
  assert.equal(ride.fareAmount, quote.discountedAmount)
  assert.equal(ride.discountedAmount, quote.discountedAmount)

  const storedToken = await DiscountTokenRepository.findById(token.id)
  assert.ok(storedToken)
  assert.equal(storedToken!.state, TokenState.REDEEMED)
})

test('discount token cannot be reused across different quotes once bound', async () => {
  const { rider, pickup } = seededEntities()
  const destA = { lat: pickup.lat + 0.01, lon: pickup.lon + 0.01 }
  const destB = { lat: pickup.lat + 0.03, lon: pickup.lon + 0.005 }

  const session = await AdService.createSession(rider.id, 10)
  await AdService.recordPlayback(session.sessionId, 'start')
  await AdService.recordPlayback(session.sessionId, '25%')
  await AdService.recordPlayback(session.sessionId, '50%')
  await AdService.recordPlayback(session.sessionId, '75%')
  await AdService.recordPlayback(session.sessionId, 'complete')
  const token = await AdService.completeSession(session.sessionId)

  await QuoteService.getQuote(pickup, destA, { riderId: rider.id, tokenId: token.id })

  await assert.rejects(
    () => QuoteService.getQuote(pickup, destB, { riderId: rider.id, tokenId: token.id }),
    /Discount token already bound to a different quote/
  )
})
