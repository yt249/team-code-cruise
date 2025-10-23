# Backend Code Structure Analysis

## Overview
The backend is a Node.js/Express API written in TypeScript with Prisma ORM. It supports both PostgreSQL database mode and an in-memory data mode for development/testing.

## Architecture Pattern
**Layered Architecture** with clear separation of concerns:
- **Web Layer** (Controllers): HTTP request handling, validation
- **Core Layer** (Services): Business logic
- **Data Layer** (Repositories): Database access
- **Shared Layer**: Cross-cutting concerns (auth, pricing, etc.)

## Directory Structure

```
backend/src/
├── ad/                     # User Story #3: Advertisement Discount
│   ├── ad.service.ts       # Ad session management
│   ├── discount.service.ts # Discount token operations
│   └── eligibility.service.ts # Ad eligibility checking
├── core/                   # User Story #1: Core Business Logic
│   ├── matching.service.ts # Driver matching
│   ├── payment.service.ts  # Payment processing
│   ├── quote.service.ts    # Fare quote generation
│   └── ride.service.ts     # Ride lifecycle management
├── repo/                   # Data Access Layer
│   ├── adSession.repository.ts
│   ├── discountToken.repository.ts
│   ├── driver.repository.ts
│   ├── paymentIntent.repository.ts
│   ├── ride.repository.ts
│   └── user.repository.ts
├── server/                 # Server Setup
│   ├── app.ts              # Express app configuration
│   └── errorHandler.ts     # Global error handling
├── shared/                 # Shared Utilities
│   ├── auth.service.ts     # JWT authentication
│   ├── eventBus.ts         # Event system
│   ├── location.service.ts # Geographic calculations
│   ├── pricing.service.ts  # Fare calculation
│   └── rating.service.ts   # Rating updates
├── web/                    # API Controllers (HTTP Layer)
│   ├── ad.controller.ts    # /ads/* endpoints
│   ├── auth.controller.ts  # /login, /signup
│   ├── payment.controller.ts # /payments/* endpoints
│   ├── quote.controller.ts # /quotes endpoint
│   └── ride.controller.ts  # /rides/* endpoints
├── workbench/              # Development Utilities
│   ├── memoryDb.ts         # In-memory database implementation
│   ├── prisma.ts           # Prisma client instance
│   ├── quoteStore.ts       # Quote storage abstraction
│   └── runtimeConfig.ts    # Environment configuration
└── index.ts                # Application entry point
```

## API Endpoints

### Authentication (`/`)
- `POST /login` - User login (returns JWT)
- `POST /signup` - User registration

### Quotes (`/quotes`)
- `POST /quotes` - Get fare quote (optional auth)
  - Body: `{ pickup, dest, opts?, tokenId? }`
  - Returns: FareQuote with amount, surge, ETA

### Rides (`/rides`)
- `POST /rides` - Create ride (requires auth)
  - Body: `{ pickup, dest, quoteId, tokenId? }`
  - Auto-triggers driver matching
- `GET /rides/:id` - Get ride details (requires auth)
- `POST /rides/:id/cancel` - Cancel ride (requires auth)
- `POST /rides/:id/complete` - Complete ride (requires auth)

### Payments (`/payments`)
- `POST /payments/intents` - Create payment intent (requires auth)
  - Body: `{ rideId, method }`
- `POST /payments/intents/:id/confirm` - Confirm payment (requires auth)

### Ads (`/ads`)
- `GET /ads/eligibility` - Check if rider eligible for ad (requires auth)
- `POST /ads/sessions` - Create ad session (requires auth)
  - Body: `{ percent }` (10-15)
- `POST /ads/playback` - Record playback event (requires auth)
  - Body: `{ sessionId, event, ts? }`
  - Events: 'start', '25%', '50%', '75%', 'complete'
- `POST /ads/complete` - Complete ad session and get token (requires auth)
  - Body: `{ sessionId }`
  - Returns: `{ tokenId, expiresAt }`
- `POST /ads/token/redeem` - Redeem discount token (requires auth)
  - Body: `{ tokenId, rideId, quoteId? }`

## Data Models (Prisma Schema)

### Core Models
- **User**: Rider accounts (id, name, email, password, rating)
- **Driver**: Driver profiles (id, name, rating, status)
- **Vehicle**: Vehicle info (id, make, model, plate, type, driverId)
- **Ride**: Ride requests (id, riderId, driverId, pickup, dest, status, fareAmount, surge, discountPercent, etc.)
- **PaymentIntent**: Payments (id, rideId, amount, status, method)

### Ad/Discount Models (User Story #3)
- **AdSession**: Ad viewing sessions (id, riderId, percent, provider, status, playbackEvents, expiresAt)
- **DiscountToken**: Discount tokens from completed ads (id, riderId, percent, state, quoteId, expiresAt, sessionId)

### Enums
- **RideStatus**: REQUESTED, MATCHING, DRIVER_ASSIGNED, DRIVER_EN_ROUTE, IN_RIDE, COMPLETED, CANCELLED
- **PaymentStatus**: REQUIRES_CONFIRMATION, PAID, FAILED
- **AdStatus**: OFFERED, WATCHING, COMPLETED, CANCELLED
- **TokenState**: ACTIVE, REDEEMED, EXPIRED, REVOKED

## Key Services

### QuoteService
- `getQuote(pickup, dest, opts)`: Calculate fare quote
- Applies discount tokens if provided
- Returns quote ID for ride creation

### RideService
- `createRide(data)`: Create new ride request
- `getRide(id, riderId)`: Get ride with driver details
- `cancelRide(id, riderId)`: Cancel ride
- `completeRide(id, riderId)`: Mark ride complete

### MatchingService
- `assignDriver(rideId)`: Find and assign available driver
- Uses geographic proximity and availability

### AdService
- `createSession(riderId, percent)`: Start ad session
- `recordPlayback(sessionId, event, timestamp)`: Track playback
- `completeSession(sessionId)`: Complete ad and issue token

### DiscountService
- `validateToken(tokenId, riderId, opts)`: Validate token for use
- `redeemToken(tokenId, rideId, opts)`: Apply token to ride

### PricingService
- `estimate(pickup, dest, opts)`: Calculate base fare
- `applyDiscount(amount, percent)`: Apply discount percentage

## Authentication
- JWT-based authentication using `jsonwebtoken`
- `AuthService.required`: Middleware for protected routes
- `AuthService.optional`: Middleware that allows both auth and anon
- Token contains: `{ sub: userId, role: 'rider' }`

## Development Modes

### Memory Mode (RB_DATA_MODE=memory)
- Uses in-memory Maps instead of PostgreSQL
- Seeded with test data (rider, driver, vehicle)
- Useful for testing and development
- Repositories auto-detect mode and switch implementations

### Database Mode (default)
- Uses PostgreSQL via Prisma
- Requires DATABASE_URL environment variable
- Supports full database features (PostGIS for geography)

## Request/Response Validation
- Uses **Zod** for schema validation
- Validates all incoming request bodies
- Type-safe parsing with automatic error handling

## Error Handling
- Global error handler in `server/errorHandler.ts`
- Supports custom error status codes via `error.status`
- Proper HTTP status codes (400, 401, 403, 404, 500)

## Testing
- Test files in `tests/`
- Uses Node.js built-in test runner
- Tests run in memory mode by default
- Test command: `RB_DATA_MODE=memory JWT_SECRET=test-secret node --test`

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing/verification
- `RB_DATA_MODE`: Set to 'memory' for in-memory mode
- `PORT`: Server port (default: 3000)

## Dependencies
- **express**: Web framework
- **@prisma/client**: Database ORM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **zod**: Schema validation
- **cors**: CORS support
- **dotenv**: Environment variables
- **express-async-errors**: Automatic async error handling

## User Story Implementation

### User Story #1: Core Ride Booking ✅
- **Quote**: POST /quotes (QuoteService)
- **Create Ride**: POST /rides (RideService)
- **Driver Matching**: Auto-triggered (MatchingService)
- **Track Ride**: GET /rides/:id
- **Payment**: POST /payments/intents, POST /payments/intents/:id/confirm
- **Complete**: POST /rides/:id/complete

### User Story #3: Advertisement Discount ✅
- **Check Eligibility**: GET /ads/eligibility
- **Create Session**: POST /ads/sessions
- **Track Playback**: POST /ads/playback
- **Complete Ad**: POST /ads/complete (issues token)
- **Apply to Quote**: POST /quotes with tokenId
- **Redeem on Ride**: POST /ads/token/redeem

## Notes
- Backend supports both user stories with clear API boundaries
- Ad discount system is independent and optional
- Token-based discount flow integrates with quote and ride creation
- All repositories support both memory and database modes
- Geography support via PostGIS (Unsupported type in schema for lat/lng)
