import { RideStatus } from '@prisma/client'
import { getMemoryDb } from '../workbench/memoryDb.js'
import { DriverRepository } from '../repo/driver.repository.js'

const TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes
const CHECK_INTERVAL_MS = 30 * 1000 // 30 seconds

export class RideTimeoutService {
  private static intervalId: NodeJS.Timeout | null = null

  /**
   * Start monitoring rides for timeouts
   */
  static start() {
    if (this.intervalId) {
      return
    }


    this.intervalId = setInterval(async () => {
      try {
        await this.checkTimeouts()
      } catch (error) {
        console.error('[RideTimeout] Error checking timeouts:', error)
      }
    }, CHECK_INTERVAL_MS)
  }

  /**
   * Stop monitoring rides
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Check all active rides and cancel those that have timed out
   */
  private static async checkTimeouts() {
    const db = getMemoryDb()
    const now = Date.now()
    const activeStatuses = new Set<RideStatus>([
      RideStatus.DRIVER_ASSIGNED,
      RideStatus.DRIVER_EN_ROUTE,
      RideStatus.IN_RIDE
    ])

    const rides = Array.from(db.rides.values())
    const stalRides = rides.filter(ride => {
      if (!activeStatuses.has(ride.status)) return false

      const lastActivity = ride.lastActivityAt.getTime()
      const timeSinceActivity = now - lastActivity

      return timeSinceActivity > TIMEOUT_MS
    })

    if (stalRides.length > 0) {

      for (const ride of stalRides) {
        const timeSinceActivity = Math.round((now - ride.lastActivityAt.getTime()) / 1000)
        console.warn(
          `[RideTimeout] Cancelling ride ${ride.id} (status: ${ride.status}, ` +
          `last activity: ${timeSinceActivity}s ago, driver: ${ride.driverId})`
        )

        // Update ride status to cancelled
        db.rides.set(ride.id, {
          ...ride,
          status: RideStatus.CANCELLED,
          completedAt: new Date()
        })

        // Release the driver if assigned
        if (ride.driverId) {
          await DriverRepository.setAvailability(ride.driverId, true)
        }
      }
    }
  }
}
