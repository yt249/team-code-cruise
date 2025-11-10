/** @jest-environment node */

const { randomUUID } = require('node:crypto')
const { RideStatus } = require('@prisma/client')
const { RideService } = require('../src/core/ride.service.ts')
const { QuoteStore } = require('../src/workbench/quoteStore.ts')
const { getMemoryDb, initMemoryDb, resetMemoryDb } = require('../src/workbench/memoryDb.ts')
const { DiscountService } = require('../src/ad/discount.service.ts')
const { PricingService } = require('../src/shared/pricing.service.ts')

process.env.RB_DATA_MODE = 'memory'
process.env.JWT_SECRET = 'test-secret'

describe('RideService (Jest)', () => {
  beforeEach(async () => {
    initMemoryDb({ seed: true })
    await QuoteStore.clear()
  })

  afterEach(async () => {
    await QuoteStore.clear()
    resetMemoryDb({ seed: true })
    jest.restoreAllMocks()
  })

  test('badRequest_setsStatus400', async () => {
    await expect(
      RideService.createRide({
        riderId: 'rider-1',
        pickup: { lat: 37.7749, lon: -122.4194 },
        dest: { lat: 37.7849, lon: -122.4094 },
        quoteId: 'non-existent-quote'
      })
    ).rejects.toMatchObject({
      message: 'Quote not found or expired',
      status: 400
    })
  })

  test('createRide_requiresTokenWhenQuoteDiscounted', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 1800,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: 'token-1',
      discountPercent: 10,
      discountedAmount: 1620
    })

    await expect(
      RideService.createRide({
        riderId: rider.id,
        pickup,
        dest,
        quoteId
      })
    ).rejects.toMatchObject({
      message: 'Discount token required for discounted quote',
      status: 400
    })
  })

  test('createRide_validatesTokenMatchesQuote', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 1800,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: 'token-1',
      discountPercent: 10,
      discountedAmount: 1620
    })

    await expect(
      RideService.createRide({
        riderId: rider.id,
        pickup,
        dest,
        quoteId,
        tokenId: 'token-2'
      })
    ).rejects.toMatchObject({
      message: 'Discount token does not match quote',
      status: 400
    })
  })

  test('createRide_rejectsUnboundToken', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 1800,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    await expect(
      RideService.createRide({
        riderId: rider.id,
        pickup,
        dest,
        quoteId,
        tokenId: 'token-3'
      })
    ).rejects.toMatchObject({
      message: 'Discount token is not associated with this quote',
      status: 400
    })
  })

  test('createRide_appliesDiscountAndRedeemsToken', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()
    const tokenId = 'token-apply'

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 2200,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: tokenId,
      discountPercent: null,
      discountedAmount: null
    })

    const validateSpy = jest.spyOn(DiscountService, 'validateToken').mockResolvedValue({
      id: tokenId,
      riderId: rider.id,
      percent: 12,
      quoteId,
      expiresAt: new Date(Date.now() + 5_000),
      state: 'ACTIVE'
    })

    const redeemSpy = jest.spyOn(DiscountService, 'redeemToken').mockResolvedValue({
      id: tokenId,
      riderId: rider.id,
      percent: 12,
      state: 'REDEEMED',
      quoteId,
      expiresAt: new Date(),
      redeemedRideId: 'ride',
      createdAt: new Date(),
      sessionId: 'session'
    })

    const discountValue = { discountedAmount: 1936 }
    const pricingSpy = jest.spyOn(PricingService, 'applyDiscount').mockReturnValue(discountValue)

    const ride = await RideService.createRide({
      riderId: rider.id,
      pickup,
      dest,
      quoteId,
      tokenId
    })

    expect(ride.fareAmount).toBe(discountValue.discountedAmount)
    expect(ride.discountTokenId).toBe(tokenId)
    expect(validateSpy).toHaveBeenCalledWith(tokenId, rider.id, { quoteId })
    expect(pricingSpy).toHaveBeenCalledWith(2200, 12)
    expect(redeemSpy).toHaveBeenCalledTimes(1)
  })

  test('createRide_happyPath', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 2150,
      surge: 1.1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    const ride = await RideService.createRide({
      riderId: rider.id,
      pickup,
      dest,
      quoteId
    })

    expect(ride.riderId).toBe(rider.id)
    expect(ride.status).toBe(RideStatus.REQUESTED)
    expect(ride.fareAmount).toBe(2150)
    expect(ride.surge).toBe(1.1)
    await expect(QuoteStore.get(quoteId)).resolves.toBeUndefined()

    const storedRide = db.rides.get(ride.id)
    expect(storedRide).toBeDefined()
    expect(storedRide!.status).toBe(RideStatus.REQUESTED)
  })

  test('createRide_rejectsMismatchedRoute', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 1800,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    await expect(
      RideService.createRide({
        riderId: rider.id,
        pickup,
        dest: { lat: dest.lat + 0.01, lon: dest.lon },
        quoteId
      })
    ).rejects.toMatchObject({
      message: 'Quote does not match requested route',
      status: 400
    })
  })

  test('getRide_returnsForOwner', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 2000,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId })
    const fetched = await RideService.getRide(ride.id, rider.id)

    expect(fetched.id).toBe(ride.id)
    expect(fetched.riderId).toBe(rider.id)
  })

  test('getRide_blocksForeignRider', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 2100,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId })

    await expect(RideService.getRide(ride.id, 'intruder')).rejects.toMatchObject({
      message: 'Forbidden',
      status: 403
    })
  })

  test('cancelRide_releasesDriver', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const driver = Array.from(db.drivers.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 2300,
      surge: 1.2,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId })
    const existing = db.rides.get(ride.id)!
    db.rides.set(ride.id, {
      ...existing,
      status: RideStatus.DRIVER_ASSIGNED,
      driverId: driver.id
    })
    const currentLoc = db.driverLocations.get(driver.id) ?? { lat: pickup.lat, lon: pickup.lon, available: true }
    db.driverLocations.set(driver.id, { ...currentLoc, available: false })

    const cancelled = await RideService.cancelRide(ride.id, rider.id)

    expect(cancelled.status).toBe(RideStatus.CANCELLED)
    const locAfter = db.driverLocations.get(driver.id)
    expect(locAfter?.available).toBe(true)
  })

  test('updateRideStatus_setsRequestedStatus', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 1900,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId })
    const updated = await RideService.updateRideStatus(ride.id, RideStatus.IN_RIDE)

    expect(updated.status).toBe(RideStatus.IN_RIDE)
    const stored = db.rides.get(ride.id)
    expect(stored?.status).toBe(RideStatus.IN_RIDE)
  })

  test('startRide_requiresAssignedDriver', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const driver = Array.from(db.drivers.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 2050,
      surge: 1,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId })
    const existing = db.rides.get(ride.id)!
    db.rides.set(ride.id, {
      ...existing,
      status: RideStatus.DRIVER_ASSIGNED,
      driverId: driver.id
    })

    const started = await RideService.startRide(ride.id, driver.id)
    expect(started.status).toBe(RideStatus.IN_RIDE)
    expect(started.startedAt).toBeInstanceOf(Date)

    await expect(RideService.startRide(ride.id, 'driver-bad')).rejects.toMatchObject({
      message: 'Forbidden',
      status: 403
    })
  })

  test('completeRide_marksCompleteAndFreesDriver', async () => {
    const db = getMemoryDb()
    const rider = Array.from(db.users.values())[0]
    const driver = Array.from(db.drivers.values())[0]
    const pickup = { lat: 37.7749, lon: -122.4194 }
    const dest = { lat: 37.7849, lon: -122.4094 }
    const quoteId = randomUUID()

    await QuoteStore.save({
      id: quoteId,
      riderId: rider.id,
      amount: 2400,
      surge: 1.3,
      currency: 'USD',
      pickup,
      dest,
      expiresAt: new Date(Date.now() + 60_000),
      discountTokenId: null,
      discountPercent: null,
      discountedAmount: null
    })

    const ride = await RideService.createRide({ riderId: rider.id, pickup, dest, quoteId })
    const existing = db.rides.get(ride.id)!
    db.rides.set(ride.id, {
      ...existing,
      status: RideStatus.IN_RIDE,
      driverId: driver.id
    })
    const currentLoc = db.driverLocations.get(driver.id) ?? { lat: pickup.lat, lon: pickup.lon, available: false }
    db.driverLocations.set(driver.id, { ...currentLoc, available: false })

    const completed = await RideService.completeRide(ride.id, rider.id)

    expect(completed.status).toBe(RideStatus.COMPLETED)
    expect(completed.completedAt).toBeInstanceOf(Date)
    const locAfter = db.driverLocations.get(driver.id)
    expect(locAfter?.available).toBe(true)
  })
})
