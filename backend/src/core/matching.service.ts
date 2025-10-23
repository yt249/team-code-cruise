import { RideStatus } from '@prisma/client'
import { RideRepository } from '../repo/ride.repository.js'
import { DriverRepository } from '../repo/driver.repository.js'

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

export class MatchingService {
  static async assignDriver(rideId: string) {
    const ride = await RideRepository.findById(rideId)
    if (!ride) throw Object.assign(new Error('Ride not found'), { status: 404 })

    console.log('[Matching] Finding drivers near:', ride.pickup)
    await RideRepository.update(ride.id, { status: RideStatus.MATCHING })
    const nearby = await DriverRepository.findNearby(ride.pickup, 15) // 15km radius
    console.log('[Matching] Found nearby drivers:', nearby.length)
    const choice = nearby[0]
    if (!choice) {
      console.log('[Matching] No drivers found, reverting to REQUESTED')
      await RideRepository.update(ride.id, { status: RideStatus.REQUESTED })
      return RideRepository.findById(ride.id)
    }

    console.log('[Matching] Assigning driver:', choice.name, choice.id)
    await DriverRepository.setAvailability(choice.id, false)

    try {
      return await RideRepository.update(ride.id, {
        status: RideStatus.DRIVER_ASSIGNED,
        driverId: choice.id
      })
    } catch (error) {
      // If ride update fails, release the driver
      console.error('[Matching] Failed to assign driver to ride, releasing driver:', choice.id)
      await DriverRepository.setAvailability(choice.id, true)
      throw error
    }
  }

  static async updateDriverLocation(driverId: string, lat: number, lon: number) {
    await DriverRepository.updateDriverLocation(driverId, lat, lon)
    const ride = await RideRepository.findActiveByDriver(driverId)
    if (!ride) return null

    if (ride.status === RideStatus.DRIVER_ASSIGNED) {
      const dist = haversineKm(ride.pickup, { lat, lon })
      if (dist < 0.5) {
        return RideRepository.update(ride.id, { status: RideStatus.DRIVER_EN_ROUTE })
      }
    }
    return ride
  }

  static async releaseDriver(driverId: string) {
    await DriverRepository.setAvailability(driverId, true)
  }
}
