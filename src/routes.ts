import express from 'express';
import { requireAuth, signToken } from './auth.js';
import { AuthService, LocationService, MatchingService, PaymentService, PricingService, RideService } from './services.js';
import { CreateIntentBody, CreateRideBody, QuoteBody } from './validators.js';
import { DriversRepo } from './repositories.js';


export const router = express.Router();


// AuthController
router.post('/login', (req,res)=>{
const name = (req.body?.name as string) || 'Rider';
const user = AuthService.login(name, 'rider');
const token = signToken(user);
res.json({ token });
});
router.get('/me', requireAuth, (req,res)=>{ res.json((req as any).user); });


// QuoteController
router.post('/quotes', requireAuth, (req,res)=>{
const parsed = QuoteBody.safeParse(req.body);
if(!parsed.success) return res.status(400).json(parsed.error.flatten());
const { pickup, dest } = parsed.data;
const fare = PricingService.estimate(pickup, dest, parsed.data.opts);
const { minutes } = LocationService.eta(pickup, dest);
res.json({ amount: fare.amount, surge: fare.surge, currency: fare.currency, expiresAt: new Date(Date.now()+10*60*1000).toISOString(), etaMinutes: minutes });
});


// RideController
router.post('/rides', requireAuth, (req,res)=>{
const parsed = CreateRideBody.safeParse(req.body);
if(!parsed.success) return res.status(400).json(parsed.error.flatten());
const rider = (req as any).user;
const fare = PricingService.estimate(parsed.data.pickup, parsed.data.dest);
const ride = RideService.createRide(rider.id, parsed.data.pickup, parsed.data.dest, fare);
const driver = MatchingService.assignDriver(ride.id);
const withDriver = driver ? { ...ride, status: 'DRIVER_ASSIGNED', driver } : ride;
res.status(201).json(withDriver);
});


router.get('/rides/:id', requireAuth, (req,res)=>{
const ride = RideService.getRide(req.params.id);
if(!ride) return res.status(404).json({error:'not found'});
res.json(ride);
});


router.post('/rides/:id/cancel', requireAuth, (req,res)=>{
const ride = RideService.getRide(req.params.id);
if(!ride) return res.status(404).json({error:'not found'});
RideService.updateRideStatus(ride.id, 'CANCELLED');
res.json({ status: 'CANCELLED' });
});


router.post('/rides/:id/complete', requireAuth, (req,res)=>{
const ride = RideService.getRide(req.params.id);
if(!ride) return res.status(404).json({error:'not found'});
RideService.completeRide(ride.id);
res.json({ status: 'COMPLETED' });
});


// PaymentController
router.post('/payments/intents', requireAuth, (req,res)=>{
const parsed = CreateIntentBody.safeParse(req.body);
if(!parsed.success) return res.status(400).json(parsed.error.flatten());
const ride = RideService.getRide(parsed.data.rideId);
});