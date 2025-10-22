import { Router } from 'express';
import { z } from 'zod';
import { QuoteService } from '../core/quote.service.js';
import { AuthService } from '../shared/auth.service.js';
export const quoteRouter = Router();
const quoteSchema = z.object({
    pickup: z.object({ lat: z.number(), lon: z.number() }),
    dest: z.object({ lat: z.number(), lon: z.number() }),
    opts: z
        .object({
        vehicleType: z.string().optional(),
        pax: z.number().optional()
    })
        .optional()
});
quoteRouter.post('/', AuthService.optional, async (req, res) => {
    const { pickup, dest, opts } = quoteSchema.parse(req.body);
    const riderId = req.user?.sub;
    const quote = await QuoteService.getQuote(pickup, dest, { riderId, ...opts });
    res.json(quote);
});
