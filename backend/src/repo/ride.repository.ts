import { randomUUID } from 'node:crypto'
import { Prisma, RideStatus } from '@prisma/client'
import { prisma } from '../workbench/prisma.js'
import { LatLng } from '../shared/location.service.js'
import { getMemoryDb, MemoryRide } from '../workbench/memoryDb.js'
import { isMemoryMode } from '../workbench/runtimeConfig.js'

export type RideRecord = {
  id: string
  riderId: string
  driverId: string | null
  status: RideStatus
  fareAmount: number
  surge: number
  currency: string
  discountPercent: number | null
  discountedAmount: number | null
  discountTokenId: string | null
  pickup: LatLng
  dest: LatLng
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  driver: {
    id: string
    name: string
    rating: number
    status: string
    vehicle?: { make: string; model: string; plate: string; type: string; color: string } | null
    phone?: string
    location?: { lat: number; lon: number } | null
  } | null
  rider: { id: string; name: string; email: string; rating: number } | null
  paymentIntent: { id: string; status: string; amount: number } | null
}

type RideRepo = {
  save(input: {
    riderId: string
    pickup: LatLng
    dest: LatLng
    fareAmount: number
    surge: number
    currency: string
    discountPercent?: number | null
    discountedAmount?: number | null
    discountTokenId?: string | null
  }): Promise<RideRecord>
  findById(id: string): Promise<RideRecord | null>
  update(
    id: string,
    patch: Partial<{
      status: RideStatus
      driverId: string | null
      startedAt: Date | null
      completedAt: Date | null
    }>
  ): Promise<RideRecord>
  findActiveByDriver(driverId: string): Promise<RideRecord | null>
}

type RideRow = {
  id: string
  riderId: string
  driverId: string | null
  status: RideStatus
  fareAmount: number
  surge: Prisma.Decimal
  currency: string
  discountPercent: number | null
  discountedAmount: number | null
  discountTokenId: string | null
  pickupLat: number
  pickupLon: number
  destLat: number
  destLon: number
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  driver: any
  rider: any
  paymentIntent: any
}

const PrismaRideRepository: RideRepo = {
  async save(input) {
    const rows = await prisma.$queryRaw<RideRow[]>`
      INSERT INTO "Ride" ("riderId","pickup","destination","fareAmount","surge","currency","status","discountPercent","discountedAmount","discountTokenId")
      VALUES (
        ${input.riderId},
        ST_SetSRID(ST_MakePoint(${input.pickup.lon}, ${input.pickup.lat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${input.dest.lon}, ${input.dest.lat}), 4326)::geography,
        ${input.fareAmount},
        ${input.surge},
        ${input.currency},
        ${RideStatus.REQUESTED},
        ${input.discountPercent ?? null},
        ${input.discountedAmount ?? null},
        ${input.discountTokenId ?? null}
      )
      RETURNING
        "id",
        "riderId",
        "driverId",
        "status",
        "fareAmount",
        "surge",
        "currency",
        "discountPercent",
        "discountedAmount",
        "discountTokenId",
        "startedAt",
        "completedAt",
        "createdAt",
        ST_Y(ST_AsText("pickup"::geometry))      AS "pickupLat",
        ST_X(ST_AsText("pickup"::geometry))      AS "pickupLon",
        ST_Y(ST_AsText("destination"::geometry)) AS "destLat",
        ST_X(ST_AsText("destination"::geometry)) AS "destLon",
        NULL::jsonb                              AS "driver",
        NULL::jsonb                              AS "rider",
        NULL::jsonb                              AS "paymentIntent"
    `
    return mapPrismaRide(rows[0])
  },

  async findById(id) {
    const rows = await prisma.$queryRaw<RideRow[]>`
      SELECT
        r."id",
        r."riderId",
        r."driverId",
        r."status",
        r."fareAmount",
        r."surge",
        r."currency",
        r."discountPercent",
        r."discountedAmount",
        r."discountTokenId",
        r."startedAt",
        r."completedAt",
        r."createdAt",
        ST_Y(ST_AsText(r."pickup"::geometry))      AS "pickupLat",
        ST_X(ST_AsText(r."pickup"::geometry))      AS "pickupLon",
        ST_Y(ST_AsText(r."destination"::geometry)) AS "destLat",
        ST_X(ST_AsText(r."destination"::geometry)) AS "destLon",
        CASE WHEN d."id" IS NULL THEN NULL ELSE jsonb_build_object(
          'id', d."id",
          'name', d."name",
          'rating', d."rating",
          'status', d."status"
        ) END AS "driver",
        CASE WHEN u."id" IS NULL THEN NULL ELSE jsonb_build_object(
          'id', u."id",
          'name', u."name",
          'email', u."email",
          'rating', u."rating"
        ) END AS "rider",
        CASE WHEN p."id" IS NULL THEN NULL ELSE jsonb_build_object(
          'id', p."id",
          'status', p."status",
          'amount', p."amount"
        ) END AS "paymentIntent"
      FROM "Ride" r
      LEFT JOIN "Driver" d ON d."id" = r."driverId"
      LEFT JOIN "User" u ON u."id" = r."riderId"
      LEFT JOIN "PaymentIntent" p ON p."rideId" = r."id"
      WHERE r."id" = ${id}
      LIMIT 1
    `
    if (rows.length === 0) return null
    return mapPrismaRide(rows[0])
  },

  async update(id, patch) {
    await prisma.ride.update({
      where: { id },
      data: patch as any
    })
    const ride = await this.findById(id)
    if (!ride) throw new Error('Ride not found after update')
    return ride
  },

  async findActiveByDriver(driverId) {
    const rows = await prisma.$queryRaw<RideRow[]>`
      SELECT
        r."id",
        r."riderId",
        r."driverId",
        r."status",
        r."fareAmount",
        r."surge",
        r."currency",
        r."discountPercent",
        r."discountedAmount",
        r."discountTokenId",
        r."startedAt",
        r."completedAt",
        r."createdAt",
        ST_Y(ST_AsText(r."pickup"::geometry))      AS "pickupLat",
        ST_X(ST_AsText(r."pickup"::geometry))      AS "pickupLon",
        ST_Y(ST_AsText(r."destination"::geometry)) AS "destLat",
        ST_X(ST_AsText(r."destination"::geometry)) AS "destLon",
        NULL::jsonb AS "driver",
        NULL::jsonb AS "rider",
        NULL::jsonb AS "paymentIntent"
      FROM "Ride" r
      WHERE r."driverId" = ${driverId}
        AND r."status" IN (${RideStatus.DRIVER_ASSIGNED}, ${RideStatus.DRIVER_EN_ROUTE}, ${RideStatus.IN_RIDE})
      ORDER BY r."createdAt" DESC
      LIMIT 1
    `
    if (rows.length === 0) return null
    return mapPrismaRide(rows[0])
  }
}

const MemoryRideRepository: RideRepo = {
  async save(input) {
    const db = getMemoryDb()
    const ride: MemoryRide = {
      id: randomUUID(),
      riderId: input.riderId,
      driverId: null,
      status: RideStatus.REQUESTED,
      pickup: input.pickup,
      dest: input.dest,
      fareAmount: input.fareAmount,
      surge: input.surge,
      currency: input.currency,
      discountPercent: input.discountPercent ?? null,
      discountedAmount: input.discountedAmount ?? null,
      discountTokenId: input.discountTokenId ?? null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date()
    }
    db.rides.set(ride.id, ride)
    return mapMemoryRide(ride)
  },

  async findById(id) {
    const db = getMemoryDb()
    const ride = db.rides.get(id)
    return ride ? mapMemoryRide(ride) : null
  },

  async update(id, patch) {
    const db = getMemoryDb()
    const ride = db.rides.get(id)
    if (!ride) throw new Error('Ride not found')
    db.rides.set(id, {
      ...ride,
      ...patch
    })
    return mapMemoryRide(db.rides.get(id)!)
  },

  async findActiveByDriver(driverId) {
    const db = getMemoryDb()
    const activeStatuses = new Set<RideStatus>([
      RideStatus.DRIVER_ASSIGNED,
      RideStatus.DRIVER_EN_ROUTE,
      RideStatus.IN_RIDE
    ])
    const rides = Array.from(db.rides.values())
      .filter((r) => r.driverId === driverId && activeStatuses.has(r.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const ride = rides[0]
    return ride ? mapMemoryRide(ride) : null
  }
}

function mapPrismaRide(row: RideRow): RideRecord {
  return {
    id: row.id,
    riderId: row.riderId,
    driverId: row.driverId,
    status: row.status,
    fareAmount: row.fareAmount,
    surge: Number(row.surge),
    currency: row.currency,
    discountPercent: row.discountPercent,
    discountedAmount: row.discountedAmount,
    discountTokenId: row.discountTokenId,
    pickup: { lat: Number(row.pickupLat), lon: Number(row.pickupLon) },
    dest: { lat: Number(row.destLat), lon: Number(row.destLon) },
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    driver: row.driver?.id
      ? {
          id: row.driver.id,
          name: row.driver.name,
          rating: Number(row.driver.rating || 5),
          status: row.driver.status || 'UNKNOWN'
        }
      : null,
    rider: row.rider?.id
      ? {
          id: row.rider.id,
          name: row.rider.name,
          email: row.rider.email,
          rating: Number(row.rider.rating || 5)
        }
      : null,
    paymentIntent: row.paymentIntent?.id
      ? {
          id: row.paymentIntent.id,
          status: row.paymentIntent.status,
          amount: Number(row.paymentIntent.amount)
        }
      : null
  }
}

function mapMemoryRide(ride: MemoryRide): RideRecord {
  const db = getMemoryDb()
  const rider = db.users.get(ride.riderId) || null
  const driver = ride.driverId ? db.drivers.get(ride.driverId) || null : null
  const paymentIntent = Array.from(db.paymentIntents.values()).find((p) => p.rideId === ride.id) || null

  // Get vehicle and location for driver
  const vehicle = driver?.vehicleId ? db.vehicles.get(driver.vehicleId) || null : null
  const driverLocation = ride.driverId ? db.driverLocations.get(ride.driverId) || null : null

  return {
    id: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    status: ride.status,
    fareAmount: ride.fareAmount,
    surge: ride.surge,
    currency: ride.currency,
    discountPercent: ride.discountPercent,
    discountedAmount: ride.discountedAmount,
    discountTokenId: ride.discountTokenId,
    pickup: ride.pickup,
    dest: ride.dest,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    createdAt: ride.createdAt,
    driver: driver
      ? {
          id: driver.id,
          name: driver.name,
          rating: driver.rating,
          status: driver.status,
          vehicle: vehicle ? {
            make: vehicle.make,
            model: vehicle.model,
            plate: vehicle.plate,
            type: vehicle.type,
            color: 'Black' // Default color since it's not in DB
          } : null,
          phone: '+1 (555) 123-4567', // Mock phone number
          location: driverLocation ? { lat: driverLocation.lat, lon: driverLocation.lon } : null
        }
      : null,
    rider: rider
      ? {
          id: rider.id,
          name: rider.name,
          email: rider.email,
          rating: rider.rating
        }
      : null,
    paymentIntent: paymentIntent
      ? {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount
        }
      : null
  }
}

export const RideRepository: RideRepo = isMemoryMode() ? MemoryRideRepository : PrismaRideRepository
