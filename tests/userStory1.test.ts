process.env.RB_DATA_MODE = 'memory'
process.env.JWT_SECRET = 'test-secret'

const { test, beforeEach, afterEach } = await import('node:test')
const assert = (await import('node:assert/strict')).default
const { initMemoryDb, getMemoryDb, resetMemoryDb } = await import('../src/workbench/memoryDb.js')
const { QuoteStore } = await import('../src/workbench/quoteStore.js')
const { QuoteService } = await import('../src/core/quote.service.js')
const { RideService } = await import('../src/core/ride.service.js')
const { MatchingService } = await import('../src/core/matching.service.js')
const { PaymentService } = await import('../src/core/payment.service.js')
const { DriverRepository } = await import('../src/repo/driver.repository.js')
const { EventBus } = await import('../src/shared/eventBus.js')
const { RideStatus } = await import('@prisma/client')
const { randomUUID } = await import('node:crypto')
const bcrypt = (await import('bcryptjs')).default

beforeEach(async () => {
  initMemoryDb({ seed: true })
  await QuoteStore.clear()
})

afterEach(async () => {
  await QuoteStore.clear()
  resetMemoryDb({ seed: true })
})

function seededEntities() {
  const db = getMemoryDb()
  const rider = Array.from(db.users.values())[0]
  const driver = Array.from(db.drivers.values())[0]
  const pickup = db.driverLocations.get(driver.id) || { lat: 37.7749, lon: -122.4194, available: true }
  return { rider, driver, pickup }
}

test('happy path ride lifecycle and payment succeeds with completion event', async () => {
  const { rider, driver, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.02, lon: pickup.lon + 0.02 }

  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })
  const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id })

  const assigned = await MatchingService.assignDriver(ride.id)
  assert.ok(assigned)
  assert.equal(assigned!.driverId, driver.id)
  assert.equal(assigned!.status, RideStatus.DRIVER_ASSIGNED)

  await MatchingService.updateDriverLocation(driver.id, pickup.lat + 0.001, pickup.lon + 0.001)
  let rideState = await RideService.getRide(ride.id, rider.id)
  assert.equal(rideState.status, RideStatus.DRIVER_EN_ROUTE)

  await RideService.startRide(ride.id, driver.id)
  rideState = await RideService.getRide(ride.id, rider.id)
  assert.equal(rideState.status, RideStatus.IN_RIDE)

  await RideService.completeRide(ride.id, rider.id)
  rideState = await RideService.getRide(ride.id, rider.id)
  assert.equal(rideState.status, RideStatus.COMPLETED)

  const intent = await PaymentService.createPaymentIntent(ride.id, rider.id)
  let completedEvent = false
  const unsubscribe = EventBus.subscribe('ride.completed', (payload: { rideId: string }) => {
    if (payload.rideId === ride.id) completedEvent = true
  })
  const status = await PaymentService.confirmPayment(intent.id, 'card_success', rider.id)
  unsubscribe()

  assert.equal(status, 'PAID')
  assert.equal(completedEvent, true)
})

test('payment failure is surfaced to caller without emitting completion event', async () => {
  const { rider, driver, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.01, lon: pickup.lon + 0.005 }

  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })
  const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id })
  await MatchingService.assignDriver(ride.id)

  const intent = await PaymentService.createPaymentIntent(ride.id, rider.id)
  let completedEvent = false
  const unsubscribe = EventBus.subscribe('ride.completed', () => {
    completedEvent = true
  })
  const status = await PaymentService.confirmPayment(intent.id, 'fail-card', rider.id)
  unsubscribe()

  assert.equal(status, 'PAYMENT_FAILED')
  assert.equal(completedEvent, false)
})

test('canceling a ride releases the driver and updates status', async () => {
  const { rider, driver, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.01, lon: pickup.lon + 0.006 }

  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })
  const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id })
  await MatchingService.assignDriver(ride.id)

  const db = getMemoryDb()
  const availabilityBefore = db.driverLocations.get(driver.id)?.available
  assert.equal(availabilityBefore, false)

  const cancelled = await RideService.cancelRide(ride.id, rider.id)
  assert.equal(cancelled.status, RideStatus.CANCELLED)

  const availabilityAfter = db.driverLocations.get(driver.id)?.available
  assert.equal(availabilityAfter, true)
})

test('riders cannot view rides they do not own', async () => {
  const { rider, driver, pickup } = seededEntities()
  const db = getMemoryDb()
  const otherUserId = randomUUID()
  const existingPasswordHash = rider.password

  db.users.set(otherUserId, {
    id: otherUserId,
    name: 'Intruder',
    email: 'intruder@example.com',
    password: existingPasswordHash ?? bcrypt.hashSync('intrude123', 10),
    rating: 3.5,
    createdAt: new Date()
  })

  const dest = { lat: pickup.lat + 0.008, lon: pickup.lon + 0.004 }
  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })
  const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id })
  await MatchingService.assignDriver(ride.id)

  await assert.rejects(() => RideService.getRide(ride.id, otherUserId), /Forbidden/)
})

test('ride creation rejects quotes minted for another rider', async () => {
  const { rider, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.007, lon: pickup.lon + 0.007 }
  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })

  const db = getMemoryDb()
  const otherUserId = randomUUID()
  db.users.set(otherUserId, {
    id: otherUserId,
    name: 'Second Rider',
    email: 'second@example.com',
    password: rider.password ?? bcrypt.hashSync('ride1234', 10),
    rating: 4.2,
    createdAt: new Date()
  })

  await assert.rejects(
    () => RideService.createRide({ riderId: otherUserId, pickup, dest, quoteId: quote.id }),
    /Forbidden/
  )
})

test('ride creation enforces quote coordinates match', async () => {
  const { rider, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.01, lon: pickup.lon + 0.01 }
  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })

  const alteredDest = { lat: dest.lat + 0.01, lon: dest.lon }
  await assert.rejects(
    () =>
      RideService.createRide({
        riderId: rider.id,
        pickup,
        dest: alteredDest,
        quoteId: quote.id
      }),
    /Quote does not match requested route/
  )
})

test('quotes cannot be reused after booking a ride', async () => {
  const { rider, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.009, lon: pickup.lon + 0.009 }
  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })

  await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id })
  await assert.rejects(
    () => RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id }),
    /Quote not found or expired/
  )
})

test('assignDriver keeps ride in requested status when no drivers are available', async () => {
  const { rider, driver, pickup } = seededEntities()
  await DriverRepository.setAvailability(driver.id, false)
  const dest = { lat: pickup.lat + 0.012, lon: pickup.lon + 0.003 }

  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })
  const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id })

  const result = await MatchingService.assignDriver(ride.id)
  assert.ok(result)
  assert.equal(result!.status, RideStatus.REQUESTED)
  assert.equal(result!.driverId, null)
})

test('only the assigned driver can start a ride', async () => {
  const { rider, pickup } = seededEntities()
  const dest = { lat: pickup.lat + 0.006, lon: pickup.lon + 0.004 }
  const quote = await QuoteService.getQuote(pickup, dest, { riderId: rider.id })
  const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId: quote.id })

  await MatchingService.assignDriver(ride.id)
  await assert.rejects(() => RideService.startRide(ride.id, randomUUID()), /Forbidden/)
})
