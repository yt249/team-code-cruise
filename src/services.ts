import { DriversRepo, PaymentRepo, RidesRepo, UsersRepo } from './repositories.js';
import { Driver, LatLng, Money, PaymentIntent, PaymentStatus, Ride, RideStatus, UUID } from './types.js';
import { haversineKm, nowISO } from './utils.js';
import { customAlphabet } from 'nanoid';

const idRide = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);
const idPay = customAlphabet('payabcdefghijklmnopqrstuvwxyz0123456789', 18);

export const AuthService = {
  verify(tokenUser: {id:UUID}){ return UsersRepo.findById(tokenUser.id); },
  login(name: string, role: 'rider'|'driver'|'admin' = 'rider'){
    const id = `usr-${customAlphabet('abcdef0123456789',12)()}`;
    const user = { id, name, role } as const;
    UsersRepo.upsert(user);
    return user;
  }
};

export const LocationService = {
  eta(pickup:LatLng, dest:LatLng){
    const km = haversineKm(pickup, dest);
    const avgSpeedKmh = 30; // simple constant
    const minutes = Math.ceil((km/avgSpeedKmh)*60);
    return { km, minutes };
  }
};

export const PricingService = {
  estimate(pickup:LatLng, dest:LatLng, opts?: {vehicleType?: string, pax?: number}): Money & { surge:number }{
    const base = 300; // base 3.00
    const perKm = 120; // 1.20 / km
    const km = haversineKm(pickup, dest);
    const surge = 1.00; // simple MVP
    const amount = Math.max(500, Math.round((base + perKm*km) * surge));
    return { amount, currency: 'USD', surge };
  }
};

export const MatchingService = {
  assignDriver(rideId: UUID){
    const ride = RidesRepo.get(rideId); if(!ride) throw new Error('ride not found');
    const avail = DriversRepo.allAvailable();
    if(avail.length===0) return null;
    const nearest = avail
      .map(d=> ({ d, km: haversineKm({lat:d.lat,lon:d.lon}, ride.pickup) }))
      .sort((a,b)=> a.km - b.km)[0].d;
    RidesRepo.update(rideId, { driver_id: nearest.id, status: 'DRIVER_ASSIGNED' });
    return nearest;
  }
};

export const RideService = {
  createRide(riderId:UUID, pickup:LatLng, dest:LatLng, quote: ReturnType<typeof PricingService.estimate> & {discounted_amount?: number, discount_percent?: number, discount_token_id?: string}){
    const id = `ride_${idRide()}`;
    const r: Ride = {
      id,
      rider_id: riderId,
      driver_id: null,
      pickup, destination: dest,
      status: 'REQUESTED',
      fare_amount: quote.discounted_amount ?? quote.amount,
      surge: quote.surge,
      currency: 'USD',
      started_at: null,
      completed_at: null,
      created_at: nowISO(),
      discount_percent: quote.discount_percent ?? null,
      discounted_amount: quote.discounted_amount ?? null,
      discount_token_id: quote.discount_token_id ?? null,
    };
    RidesRepo.insert(r);
    return r;
  },
  getRide(id:UUID){ return RidesRepo.get(id); },
  updateRideStatus(id:UUID, status: RideStatus){ RidesRepo.update(id, { status }); },
  completeRide(id:UUID){ RidesRepo.update(id, { status: 'COMPLETED', completed_at: nowISO() }); }
};

export const PaymentService = {
  createPaymentIntent(rideId:UUID, amount:number){
    const existing = PaymentRepo.findByRide(rideId);
    if(existing) return existing; // idempotent per-ride
    const intent: PaymentIntent = {
      id: idPay(), ride_id: rideId, amount,
      status: 'REQUIRES_CONFIRMATION', method: null, created_at: nowISO(), updated_at: nowISO()
    };
    PaymentRepo.upsert(intent);
    return intent;
  },
  confirmPayment(intentId:string, method:string){
    const pi = PaymentRepo.get(intentId); if(!pi) throw new Error('intent not found');
    // Simulate gateway confirmation success always
    pi.status = 'PAID'; pi.method = method; pi.updated_at = nowISO();
    PaymentRepo.upsert(pi);
    // Mark ride as PAID
    RidesRepo.update(pi.ride_id, { status: 'PAID' });
    return pi as PaymentIntent & { status: PaymentStatus };
  }
}