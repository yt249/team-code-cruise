import { Router } from 'express'
import { z } from 'zod'
import { AuthService } from '../shared/auth.service.js'
import { PaymentService } from '../core/payment.service.js'

export const paymentRouter = Router()

const createIntentSchema = z.object({
  rideId: z.string().uuid()
})

const confirmSchema = z.object({
  intentId: z.string(),
  method: z.string()
})

paymentRouter.post('/intents', AuthService.required, async (req, res) => {
  const { rideId } = createIntentSchema.parse(req.body)
  const intent = await PaymentService.createPaymentIntent(rideId, req.user!.sub)
  res.json({ intentId: intent.id })
})

paymentRouter.post('/confirm', AuthService.required, async (req, res) => {
  const { intentId, method } = confirmSchema.parse(req.body)
  const status = await PaymentService.confirmPayment(intentId, method, req.user!.sub)
  res.json({ status })
})
