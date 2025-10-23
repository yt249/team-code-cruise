import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PaymentStatus, RideStatus } from '@prisma/client'
import { LatLng } from '../shared/location.service.js'

export type MemoryUser = {
  id: string
  name: string
  email: string
  password: string
  rating: number
  createdAt: Date
}

export type MemoryDriver = {
  id: string
  name: string
  rating: number
  status: string
  vehicleId?: string
}

export type MemoryVehicle = {
  id: string
  make: string
  model: string
  plate: string
  type: string
  driverId?: string
}

export type MemoryRide = {
  id: string
  riderId: string
  driverId: string | null
  status: RideStatus
  pickup: LatLng
  dest: LatLng
  fareAmount: number
  surge: number
  currency: string
  discountPercent: number | null
  discountedAmount: number | null
  discountTokenId: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

export type MemoryPaymentIntent = {
  id: string
  rideId: string
  amount: number
  status: PaymentStatus
  method: string | null
  createdAt: Date
  updatedAt: Date
}

export type MemoryAdSession = {
  id: string
  riderId: string
  percent: number
  provider: string
  status: 'OFFERED' | 'WATCHING' | 'COMPLETED' | 'CANCELLED'
  startedAt: Date | null
  completedAt: Date | null
  playbackEvents: Record<string, string>
  expiresAt: Date
  createdAt: Date
  tokenId: string | null
}

export type MemoryDiscountToken = {
  id: string
  riderId: string
  percent: number
  state: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'REVOKED'
  quoteId: string | null
  expiresAt: Date
  redeemedRideId: string | null
  createdAt: Date
  sessionId: string
}

export type MemoryDb = {
  users: Map<string, MemoryUser>
  drivers: Map<string, MemoryDriver>
  vehicles: Map<string, MemoryVehicle>
  rides: Map<string, MemoryRide>
  paymentIntents: Map<string, MemoryPaymentIntent>
  driverLocations: Map<string, { lat: number; lon: number; available: boolean }>
  adSessions: Map<string, MemoryAdSession>
  discountTokens: Map<string, MemoryDiscountToken>
}

let memoryDb: MemoryDb | null = null

export function initMemoryDb({ seed = true } = {}) {
  if (!memoryDb) {
    memoryDb = {
      users: new Map(),
      drivers: new Map(),
      vehicles: new Map(),
      rides: new Map(),
      paymentIntents: new Map(),
      driverLocations: new Map(),
      adSessions: new Map(),
      discountTokens: new Map()
    }
  } else {
    resetMemoryDb({ seed: false })
  }

  if (seed) seedMemoryDb()
  return memoryDb
}

export function getMemoryDb(): MemoryDb {
  if (!memoryDb) throw new Error('Memory DB not initialized. Call initMemoryDb() first.')
  return memoryDb
}

export function resetMemoryDb({ seed = true } = {}) {
  if (!memoryDb) return
  memoryDb.users.clear()
  memoryDb.drivers.clear()
  memoryDb.vehicles.clear()
  memoryDb.rides.clear()
  memoryDb.paymentIntents.clear()
  memoryDb.driverLocations.clear()
  memoryDb.adSessions.clear()
  memoryDb.discountTokens.clear()
  if (seed) seedMemoryDb()
}

export function seedMemoryDb() {
  if (!memoryDb) throw new Error('Memory DB not initialized')

  const riderId = randomUUID()
  const driverId = randomUUID()
  const vehicleId = randomUUID()

  const passwordHash = bcrypt.hashSync('ride1234', 10)
  memoryDb.users.set(riderId, {
    id: riderId,
    name: 'Test Rider',
    email: 'rider@example.com',
    password: passwordHash,
    rating: 4.9,
    createdAt: new Date()
  })

  memoryDb.drivers.set(driverId, {
    id: driverId,
    name: 'Driver One',
    rating: 4.8,
    status: 'AVAILABLE',
    vehicleId
  })

  memoryDb.vehicles.set(vehicleId, {
    id: vehicleId,
    make: 'Toyota',
    model: 'Prius',
    plate: 'TEST-123',
    type: 'SEDAN',
    driverId
  })

  memoryDb.driverLocations.set(driverId, { lat: 37.7749, lon: -122.4194, available: true })
}
