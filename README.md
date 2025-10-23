# RB Backend — Quickstart

```bash
# 1) env
cp .env.example .env
$EDITOR .env

# 2) deps & db
pnpm install  # or npm install / yarn
pnpm prisma:gen
pnpm prisma:migrate  # applies schema (requires PostGIS extension)

# 3) seed a test rider & driver via Prisma Studio (optional)
npx prisma studio

# 4) run
pnpm dev
```

### Run without a real database

An in-memory data store (seeded with a rider and driver) is available for development and tests:

```bash
RB_DATA_MODE=memory pnpm dev      # or npm run dev:memory
# PowerShell (Windows):
#   $env:RB_DATA_MODE="memory"; npm run dev
```

### Tests (DB-free)

```bash
npm test    # uses RB_DATA_MODE=memory under the hood
```

## Basic API (RB9)
- `POST /login` `{ email, password }` → `{ token }`
- `GET /me` (auth) → `UserProfile`
- `POST /quotes` `{ pickup:{lat,lon}, dest:{lat,lon}, opts?, tokenId? }` → `FareQuote` (includes `discountApplied`, `discountPercent`, `discountedAmount`, `discountTokenId` when a token is supplied)
- `POST /rides` (auth) `{ pickup, dest, quoteId, tokenId? }` → `Ride` (triggers driver matching; ride payload reflects applied discount fields)
- `GET /rides/:id` (auth) → `Ride`
- `POST /rides/:id/cancel` (auth) → `{ status }`
- `POST /rides/:id/complete` (auth) → `{ status }`
- `POST /payments/intents` (auth) `{ rideId }` → `{ intentId }`
- `POST /payments/confirm` (auth) `{ intentId, method }` → `{ status }`

### Ads & Discounts (AD9)
- `GET /ads/eligibility` (auth) → `{ isEligible, cooldownEndsAt? }`
- `POST /ads/sessions` (auth) `{ percent }` → `{ sessionId, provider, percent, expiresAt }`
- `POST /ads/playback` (auth) `{ sessionId, event, ts? }` → `{ ok: true }`
- `POST /ads/complete` (auth) `{ sessionId }` → `{ tokenId, expiresAt }`
- `POST /ads/token/redeem` (auth) `{ tokenId, rideId, quoteId? }` → `{ state }`

## Notes
- Implements RB5.2 ride lifecycle (simplified) and RB6.1 happy path.
- RB7 failures: basic safeguards for double-charge and no-driver.
- RB13 security: auth guard on ride, payment, and ad endpoints; per-rider access check.
- PostGIS `geography` columns store pickup/destination; helpers convert to lat/lon for API responses.
