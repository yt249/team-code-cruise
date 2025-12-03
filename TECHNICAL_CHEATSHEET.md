# CodeCruise Technical Cheat Sheet

---

## CRITICAL NUMBERS (Memorize These!)

| What | Value | Why |
|------|-------|-----|
| Driver animation update | **2 seconds** | Balance smoothness vs API limits |
| Google Maps polling | **100ms** | Fast detection without blocking |
| Driver search radius | **15 km** | Reasonable urban coverage |
| Ride timeout | **2 minutes** | Cancel stale/abandoned rides |
| Timeout check interval | **30 seconds** | Efficient background cleanup |
| Base fare | **$5.00** (500 cents) | Flat rate pricing |
| Discount range | **10-15%** | Incentive without hurting revenue |
| Discount token TTL | **15 minutes** | Use it or lose it |
| Ad session TTL | **5 minutes** | Complete ad quickly |
| Ad cooldown | **15 seconds** | Prevent spam watching |
| Daily ad limit | **5 per user** | Fair usage cap |
| JWT expiration | **7 days** | Convenience vs security |
| "Finding driver" UI delay | **5 seconds** | UX feels more realistic |
| Quote expiration | **5 minutes** | Prices stay current |

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + Vite + Google Maps API                          │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ AuthContext │ │BookingContext│ │ AdContext   │           │
│  │ - login     │ │ - quote     │ │ - eligibility│           │
│  │ - logout    │ │ - ride      │ │ - session   │           │
│  │ - token     │ │ - driver    │ │ - token     │           │
│  │ - profile   │ │ - animation │ │ - playback  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  Node.js + Express + TypeScript                             │
│                                                              │
│  Controllers (web/)                                          │
│       │                                                      │
│       ▼                                                      │
│  Services (core/, ad/, shared/)                             │
│       │                                                      │
│       ▼                                                      │
│  Repositories (repo/)                                        │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────┐  OR  ┌─────────────────┐              │
│  │ Memory Database │      │ PostgreSQL+PostGIS│              │
│  │ (Development)   │      │ (Production)     │              │
│  └─────────────────┘      └─────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## COORDINATE NAMING (Common Gotcha!)

```
Frontend: { lat, lng }    ←→    Backend: { lat, lon }
                  ↑                        ↑
              "lng"                     "lon"
```

Conversion in `rideService.js`:
```javascript
toBackendCoords  = (loc) => ({ lat: loc.lat, lon: loc.lng })
toFrontendCoords = (loc) => ({ lat: loc.lat, lng: loc.lon })
```

---

## RIDE LIFECYCLE (10 Steps)

```
1. User enters pickup/destination
         │
         ▼
2. POST /quotes → Get fare estimate (expires in 5 min)
         │
         ▼
3. [Optional] Watch 30-sec ad → Get discount token
         │
         ▼
4. POST /quotes (with tokenId) → Discounted quote
         │
         ▼
5. User clicks "Confirm Ride"
         │
         ▼
6. POST /rides → Backend auto-assigns nearest driver
         │
         ▼
7. Frontend shows "Finding Driver" (5 sec fake delay)
         │
         ▼
8. Driver animation: DriverEnRoute → ArrivedAtPickup → InTrip
         │
         ▼
9. POST /rides/:id/complete → Mark complete
         │
         ▼
10. Show trip summary & rating
```

---

## RIDE STATUS FLOW

```
REQUESTED → MATCHING → DRIVER_ASSIGNED → DRIVER_EN_ROUTE → IN_RIDE → COMPLETED
                                                                   ↘ CANCELLED
```

---

## AD DISCOUNT FLOW

```
1. Check eligibility     GET /ads/eligibility
   (cooldown? daily cap?)
         │
         ▼
2. Create session        POST /ads/sessions { percent: 12 }
         │
         ▼
3. Play video & track    POST /ads/playback { event: "start" }
   checkpoints           POST /ads/playback { event: "25%" }
                         POST /ads/playback { event: "50%" }
                         POST /ads/playback { event: "75%" }
                         POST /ads/playback { event: "complete" }
         │
         ▼
4. Get discount token    POST /ads/complete { sessionId }
   (returns tokenId)
         │
         ▼
5. Use token in quote    POST /quotes { pickup, dest, tokenId }
```

**Required checkpoints:** start, 75%, complete (minimum for validation)

---

## DRIVER MATCHING ALGORITHM

```javascript
// Haversine formula for distance (matching.service.ts)
function haversineKm(a, b) {
  const R = 6371;  // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const h = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLon/2);
  return 2 * R * atan2(√h, √(1-h));
}

// Find nearest driver within 15km
const nearby = await DriverRepository.findNearby(ride.pickup, 15);
const driver = nearby[0];  // First = closest
```

---

## AUTHENTICATION

```
┌─────────────┐     POST /login          ┌─────────────┐
│   Client    │ ──────────────────────▶  │   Server    │
│             │  { email, password }     │             │
│             │                          │             │
│             │  ◀──────────────────────  │  bcrypt     │
│             │     { token: "jwt..." }  │  compare    │
│             │                          │             │
│ localStorage│                          │             │
│ .setItem()  │                          │             │
└─────────────┘                          └─────────────┘

All subsequent requests:
Authorization: Bearer <jwt_token>
```

JWT Payload: `{ sub: "user-uuid", role: "rider" }`

---

## ERROR CODES

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Expired quote, invalid coords |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Not owner of ride |
| 404 | Not Found | Ride/token doesn't exist |
| 409 | Conflict | Ad cooldown active, token already used |
| 410 | Gone | Token/session expired |
| 422 | Unprocessable | Missing ad checkpoints |

---

## TESTING

```bash
# Backend (Jest + SWC)
cd backend
pnpm test              # Run tests
pnpm test:ci           # With coverage
# Forces RB_DATA_MODE=memory

# Frontend (Jest + SWC)
cd frontend
npm test               # Run tests
npm test:ci            # With coverage
# Mocks fetch() and getAuthToken()
```

---

## DEV MODE SEEDED DATA

**Test User:**
- Email: `rider@example.com`
- Password: `ride1234`

**5 Drivers (Pittsburgh area):**
1. John Smith - Toyota Camry - CMU Campus
2. Maria Garcia - Honda Accord - Oakland
3. David Chen - Ford Fusion - South Side
4. Sarah Johnson - Chevrolet Malibu - Shadyside
5. Michael Brown - Nissan Altima - West End

---

## KEY FILES QUICK REFERENCE

| Purpose | Frontend | Backend |
|---------|----------|---------|
| Entry point | `App.jsx` | `index.ts` |
| Auth state | `context/AuthContext.jsx` | `web/auth.controller.ts` |
| Booking state | `context/BookingContext.jsx` | `core/ride.service.ts` |
| Ad state | `context/AdContext.jsx` | `ad/ad.service.ts` |
| Map component | `components/Map/Map.jsx` | - |
| API calls | `services/rideService.js` | `web/ride.controller.ts` |
| Driver matching | - | `core/matching.service.ts` |
| Pricing | - | `shared/pricing.service.ts` |
| Database | - | `workbench/memoryDb.ts` |

---

## COMMON Q&A ANSWERS

**Q: Why 2-second driver updates?**
> Balances smooth animation, API rate limits, and realism. Real GPS is 1-3 sec.

**Q: How do you prevent race conditions in driver assignment?**
> Mark driver unavailable first, then update ride. Rollback on failure.

**Q: Why memory mode?**
> Fast development, no DB setup needed. Resets enable consistent testing.

**Q: How do you prevent ad abuse?**
> 15-sec cooldown, 5/day limit, 15-min token expiry, server-side checkpoint validation.

**Q: Why ULID instead of UUID?**
> Time-sortable for easier debugging. Same randomness as UUID.

**Q: What if Google Directions API fails?**
> Fallback to linear interpolation (straight line between points).

**Q: Why poll for Google Maps instead of callback?**
> React lifecycle doesn't guarantee order. Polling is more reliable.

**Q: How does the discount token bind to a quote?**
> First time token is used in POST /quotes, it's bound to that quote's ID. Can't switch.

---

## QUICK ARCHITECTURE SOUNDBITES

- **"Clean architecture"** - Controllers → Services → Repositories
- **"Event-driven"** - EventBus for decoupled service communication
- **"React Context"** - Three contexts for auth, booking, ads state
- **"Haversine formula"** - For real-world distance calculations
- **"Graceful degradation"** - Fallbacks if Google APIs fail

---

## API ENDPOINTS SUMMARY

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Login, returns JWT |
| GET | `/me` | Get user profile (auth required) |
| POST | `/reset-test-data` | Reset dev data (memory mode only) |

### Quotes & Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/quotes` | Get fare quote |
| POST | `/rides` | Create ride (auto-assigns driver) |
| GET | `/rides/:id` | Get ride details |
| POST | `/rides/:id/complete` | Complete ride |
| POST | `/rides/:id/cancel` | Cancel ride |

### Advertisements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ads/eligibility` | Check if user can watch ads |
| POST | `/ads/sessions` | Create ad session |
| POST | `/ads/playback` | Track playback events |
| POST | `/ads/complete` | Finalize ad, get token |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/intents` | Create payment intent |
| POST | `/payments/confirm` | Confirm payment |

---

## TECHNOLOGY STACK

### Frontend
- React 19
- Vite (build tool)
- Google Maps JavaScript API
- React Context API (state)
- Jest + SWC (testing)

### Backend
- Node.js + TypeScript
- Express.js
- Prisma ORM
- JWT (jsonwebtoken)
- bcryptjs (password hashing)
- Zod (validation)
- Jest + SWC (testing)

### Database
- PostgreSQL + PostGIS (production)
- In-memory Maps (development)

---

Good luck with your presentation!
