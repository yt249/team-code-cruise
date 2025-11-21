/**
 * Initialize driver locations for Lambda cold start
 * Call this once when Lambda starts to populate the runtime location map
 */

import { DriverRepository } from '../src/repo/driver.repository.js'

// Pittsburgh area driver locations (around CMU campus)
const DRIVER_LOCATIONS = [
  { lat: 40.4443, lon: -79.9436 }, // CMU Campus
  { lat: 40.4506, lon: -79.9859 }, // Oakland
  { lat: 40.4306, lon: -80.0059 }, // South Side
  { lat: 40.4606, lon: -79.9759 }, // Shadyside
  { lat: 40.4206, lon: -80.0159 }  // West End
]

export async function initializeDriverLocations() {
  try {
    // Get all drivers from database
    const { prisma } = await import('../src/workbench/prisma.js')
    const drivers = await prisma.driver.findMany({
      select: { id: true }
    })

    console.log(`[init-drivers] Found ${drivers.length} drivers in database`)

    if (drivers.length === 0) {
      console.warn('[init-drivers] No drivers found in database. Skipping location initialization.')
      return
    }

    // Assign locations to drivers in round-robin fashion
    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i]
      const location = DRIVER_LOCATIONS[i % DRIVER_LOCATIONS.length]

      await DriverRepository.updateDriverLocation(driver.id, location.lat, location.lon)
      console.log(`[init-drivers] Set location for driver ${driver.id}: ${location.lat}, ${location.lon}`)
    }

    console.log('[init-drivers] Successfully initialized all driver locations')
  } catch (error) {
    console.error('[init-drivers] Failed to initialize driver locations:', error)
    // Don't throw - allow Lambda to start even if initialization fails
  }
}
