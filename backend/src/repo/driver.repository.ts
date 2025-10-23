import { prisma } from '../workbench/prisma.js'
import { getMemoryDb } from '../workbench/memoryDb.js'
import { isMemoryMode } from '../workbench/runtimeConfig.js'

type DriverLocation = { lat: number; lon: number; available: boolean }
type NearbyDriver = { id: string; name: string; dist: number }
type DriverRecord = { id: string; name: string; rating: number; status: string }

type DriverRepo = {
  setAvailability(driverId: string, available: boolean): Promise<void>
  updateDriverLocation(driverId: string, lat: number, lon: number): Promise<DriverLocation>
  findNearby(pickup: { lat: number; lon: number }, radiusKm: number): Promise<NearbyDriver[]>
  findById(driverId: string): Promise<DriverRecord | null>
}

const runtimeLocations = new Map<string, DriverLocation>()

function getLocationStore() {
  if (isMemoryMode()) return getMemoryDb().driverLocations
  return runtimeLocations
}

const PrismaDriverRepository: DriverRepo = {
  async setAvailability(driverId, available) {
    const store = getLocationStore()
    const loc = store.get(driverId) || { lat: 0, lon: 0, available }
    loc.available = available
    store.set(driverId, loc)
  },

  async updateDriverLocation(driverId, lat, lon) {
    const store = getLocationStore()
    const loc = store.get(driverId) || { lat, lon, available: true }
    loc.lat = lat
    loc.lon = lon
    store.set(driverId, loc)
    return loc
  },

  async findNearby(pickup, radiusKm) {
    const store = getLocationStore()
    const drivers = await prisma.driver.findMany({})
    const normalized = drivers.map((d) => ({
      id: d.id,
      name: d.name,
      rating: Number(d.rating),
      status: d.status
    }))
    return computeNearby(normalized, store, pickup, radiusKm)
  },

  async findById(driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } })
    return driver ? { id: driver.id, name: driver.name, rating: Number(driver.rating), status: driver.status } : null
  }
}

const MemoryDriverRepository: DriverRepo = {
  async setAvailability(driverId, available) {
    const db = getMemoryDb()
    const loc = db.driverLocations.get(driverId) || { lat: 0, lon: 0, available }
    loc.available = available
    db.driverLocations.set(driverId, loc)
  },

  async updateDriverLocation(driverId, lat, lon) {
    const db = getMemoryDb()
    const loc = db.driverLocations.get(driverId) || { lat, lon, available: true }
    loc.lat = lat
    loc.lon = lon
    db.driverLocations.set(driverId, loc)
    return loc
  },

  async findNearby(pickup, radiusKm) {
    const db = getMemoryDb()
    console.log('[DriverRepo] Total drivers in DB:', db.drivers.size)
    console.log('[DriverRepo] Total driver locations:', db.driverLocations.size)

    const drivers = Array.from(db.drivers.values()).map((d) => ({
      id: d.id,
      name: d.name,
      rating: d.rating,
      status: d.status
    }))
    console.log('[DriverRepo] Drivers:', drivers.length)

    // Log first driver location as sample
    const firstLoc = Array.from(db.driverLocations.entries())[0]
    if (firstLoc) {
      console.log('[DriverRepo] Sample location:', firstLoc)
    }

    return computeNearby(drivers, db.driverLocations, pickup, radiusKm)
  },

  async findById(driverId) {
    const driver = getMemoryDb().drivers.get(driverId)
    return driver ? { id: driver.id, name: driver.name, rating: driver.rating, status: driver.status } : null
  }
}

function computeNearby(drivers: DriverRecord[], store: Map<string, DriverLocation>, pickup: { lat: number; lon: number }, radiusKm: number) {
  const result: NearbyDriver[] = []
  for (const driver of drivers) {
    const loc = store.get(driver.id)
    if (!loc || !loc.available) continue
    const dx = loc.lat - pickup.lat
    const dy = loc.lon - pickup.lon
    const dist = Math.sqrt(dx * dx + dy * dy) * 111
    if (dist <= radiusKm) result.push({ id: driver.id, name: driver.name, dist })
  }
  result.sort((a, b) => a.dist - b.dist)
  return result
}

export const DriverRepository: DriverRepo = isMemoryMode() ? MemoryDriverRepository : PrismaDriverRepository
