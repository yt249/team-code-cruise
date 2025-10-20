import { z } from 'zod';
export const LatLngSchema = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });
export const QuoteBody = z.object({ pickup: LatLngSchema, dest: LatLngSchema, opts: z.object({ vehicleType: z.string().optional(), pax: z.number().int().optional() }).optional(), tokenId: z.string().optional() });
export const CreateRideBody = z.object({ pickup: LatLngSchema, dest: LatLngSchema, quoteId: z.string().optional(), tokenId: z.string().optional() });
export const CreateIntentBody = z.object({ rideId: z.string() });
export const ConfirmPaymentBody = z.object({ intentId: z.string(), method: z.string() });
