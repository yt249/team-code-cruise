import { RideStatus } from '@prisma/client';
import { RideRepository } from '../repo/ride.repository.js';
import { QuoteStore } from '../workbench/quoteStore.js';
import { DriverRepository } from '../repo/driver.repository.js';
function badRequest(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}
function forbidden() {
    const err = new Error('Forbidden');
    err.status = 403;
    return err;
}
export class RideService {
    static async createRide(input) {
        const quote = await QuoteStore.get(input.quoteId);
        if (!quote)
            throw badRequest('Quote not found or expired');
        if (quote.expiresAt.getTime() < Date.now())
            throw badRequest('Quote expired');
        if (quote.riderId && quote.riderId !== input.riderId)
            throw forbidden();
        // Basic sanity check: ensure coordinates match within epsilon
        const epsilon = 0.0001;
        const coordsMatch = Math.abs(quote.pickup.lat - input.pickup.lat) < epsilon &&
            Math.abs(quote.pickup.lon - input.pickup.lon) < epsilon &&
            Math.abs(quote.dest.lat - input.dest.lat) < epsilon &&
            Math.abs(quote.dest.lon - input.dest.lon) < epsilon;
        if (!coordsMatch)
            throw badRequest('Quote does not match requested route');
        const ride = await RideRepository.save({
            riderId: input.riderId,
            pickup: input.pickup,
            dest: input.dest,
            fareAmount: quote.amount,
            surge: quote.surge,
            currency: quote.currency
        });
        await QuoteStore.delete(input.quoteId);
        return ride;
    }
    static async getRide(id, requesterId) {
        const ride = await RideRepository.findById(id);
        if (!ride)
            throw Object.assign(new Error('Ride not found'), { status: 404 });
        if (ride.riderId !== requesterId)
            throw forbidden();
        return ride;
    }
    static async cancelRide(id, requesterId) {
        const ride = await this.getRide(id, requesterId);
        if (ride.status === RideStatus.COMPLETED)
            throw badRequest('Ride already completed');
        if (ride.status === RideStatus.CANCELLED)
            return ride;
        const updated = await RideRepository.update(ride.id, { status: RideStatus.CANCELLED });
        if (updated.driverId)
            await DriverRepository.setAvailability(updated.driverId, true);
        return updated;
    }
    static async updateRideStatus(id, status) {
        return RideRepository.update(id, { status });
    }
    static async startRide(id, driverId) {
        const ride = await RideRepository.findById(id);
        if (!ride)
            throw Object.assign(new Error('Ride not found'), { status: 404 });
        if (ride.driverId !== driverId)
            throw forbidden();
        return RideRepository.update(id, { status: RideStatus.IN_RIDE, startedAt: new Date() });
    }
    static async completeRide(id, requesterId) {
        const ride = await this.getRide(id, requesterId);
        const updated = await RideRepository.update(ride.id, {
            status: RideStatus.COMPLETED,
            completedAt: new Date()
        });
        if (updated.driverId)
            await DriverRepository.setAvailability(updated.driverId, true);
        return updated;
    }
}
