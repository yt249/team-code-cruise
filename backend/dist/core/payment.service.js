import { PaymentStatus } from '@prisma/client';
import { RideService } from './ride.service.js';
import { EventBus } from '../shared/eventBus.js';
import { PaymentIntentRepository } from '../repo/paymentIntent.repository.js';
export class PaymentService {
    static async createPaymentIntent(rideId, requesterId) {
        const ride = await RideService.getRide(rideId, requesterId);
        const existing = await PaymentIntentRepository.findByRideId(ride.id);
        if (existing)
            return existing;
        const id = `pi_${ride.id}`;
        return PaymentIntentRepository.create({
            id,
            rideId: ride.id,
            amount: ride.fareAmount,
            status: PaymentStatus.REQUIRES_CONFIRMATION
        });
    }
    static async confirmPayment(intentId, method, requesterId) {
        const intent = await PaymentIntentRepository.findById(intentId);
        if (!intent)
            throw Object.assign(new Error('Payment intent not found'), { status: 404 });
        await RideService.getRide(intent.rideId, requesterId);
        const outcome = simulateGateway(method);
        const finalStatus = outcome === 'success' ? PaymentStatus.PAID : PaymentStatus.FAILED;
        await PaymentIntentRepository.update(intentId, { status: finalStatus, method });
        if (finalStatus === PaymentStatus.PAID) {
            EventBus.publish('ride.completed', { rideId: intent.rideId });
            return 'PAID';
        }
        return 'PAYMENT_FAILED';
    }
}
function simulateGateway(method) {
    return method.toLowerCase().includes('fail') ? 'fail' : 'success';
}
