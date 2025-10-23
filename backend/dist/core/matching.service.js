import { RideStatus } from '@prisma/client';
import { RideRepository } from '../repo/ride.repository.js';
import { DriverRepository } from '../repo/driver.repository.js';
function haversineKm(a, b) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
}
export class MatchingService {
    static async assignDriver(rideId) {
        const ride = await RideRepository.findById(rideId);
        if (!ride)
            throw Object.assign(new Error('Ride not found'), { status: 404 });
        await RideRepository.update(ride.id, { status: RideStatus.MATCHING });
        const nearby = await DriverRepository.findNearby(ride.pickup, 15);
        const choice = nearby[0];
        if (!choice) {
            await RideRepository.update(ride.id, { status: RideStatus.REQUESTED });
            return RideRepository.findById(ride.id);
        }
        await DriverRepository.setAvailability(choice.id, false);
        return RideRepository.update(ride.id, {
            status: RideStatus.DRIVER_ASSIGNED,
            driverId: choice.id
        });
    }
    static async updateDriverLocation(driverId, lat, lon) {
        await DriverRepository.updateDriverLocation(driverId, lat, lon);
        const ride = await RideRepository.findActiveByDriver(driverId);
        if (!ride)
            return null;
        if (ride.status === RideStatus.DRIVER_ASSIGNED) {
            const dist = haversineKm(ride.pickup, { lat, lon });
            if (dist < 0.5) {
                return RideRepository.update(ride.id, { status: RideStatus.DRIVER_EN_ROUTE });
            }
        }
        return ride;
    }
    static async releaseDriver(driverId) {
        await DriverRepository.setAvailability(driverId, true);
    }
}
