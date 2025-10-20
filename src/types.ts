export type UUID = string;
export type LatLng = { lat: number; lon: number };
export type Money = { amount: number; currency: string };
export type RideStatus =
  | "REQUESTED" | "MATCHING" | "DRIVER_ASSIGNED" | "DRIVER_EN_ROUTE"
  | "IN_RIDE" | "COMPLETED" | "PAID" | "PAYMENT_FAILED" | "CANCELLED";
export type PaymentStatus = "REQUIRES_CONFIRMATION" | "PAID" | "FAILED";

export interface Ride {
  id: UUID;
  rider_id: UUID;
  driver_id: UUID | null;
  pickup: LatLng;
  destination: LatLng;
  status: RideStatus;
  fare_amount: number; // cents
  surge: number; // 1.00..x
  currency: string; // ISO
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  discount_percent?: number | null;
  discounted_amount?: number | null; // cents
  discount_token_id?: string | null;
}

export interface PaymentIntent {
  id: string; // gateway id
  ride_id: UUID;
  amount: number; // cents
  status: PaymentStatus;
  method: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver { id: UUID; name: string; lat: number; lon: number; status: "AVAILABLE" | "BUSY"; }
export interface UserProfile { id: UUID; name: string; role: "rider" | "driver" | "admin"; }
