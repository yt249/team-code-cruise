import { Router } from 'express'
import { z } from 'zod'
import { AuthService } from '../shared/auth.service.js'
import { RideService } from '../core/ride.service.js'
import { MatchingService } from '../core/matching.service.js'

export const rideRouter = Router()

const createRideSchema = z.object({
  pickup: z.object({ lat: z.number(), lon: z.number() }),
  dest: z.object({ lat: z.number(), lon: z.number() }),
  quoteId: z.string().uuid(),
  tokenId: z.string().min(1).optional()
})

rideRouter.post('/', AuthService.required, async (req, res) => {
  const riderId = req.user!.sub
  const { pickup, dest, quoteId, tokenId } = createRideSchema.parse(req.body)
  const ride = await RideService.createRide({ riderId, pickup, dest, quoteId, tokenId })
  await MatchingService.assignDriver(ride.id)
  const hydrated = await RideService.getRide(ride.id, riderId)
  res.status(201).json(hydrated)
})

rideRouter.get('/:id', AuthService.required, async (req, res) => {
  const ride = await RideService.getRide(req.params.id, req.user!.sub)
  res.json(ride)
})

rideRouter.post('/:id/cancel', AuthService.required, async (req, res) => {
  const ride = await RideService.cancelRide(req.params.id, req.user!.sub)
  res.json({ status: ride.status })
})

rideRouter.post('/:id/complete', AuthService.required, async (req, res) => {
  const ride = await RideService.completeRide(req.params.id, req.user!.sub)
  res.json({ status: ride.status })
})
