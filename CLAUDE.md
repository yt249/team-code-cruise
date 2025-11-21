# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CodeCruise** (team-code-cruise) is a full-stack ride-sharing application with a React frontend and Node.js/TypeScript backend. The application features authentication, real-time ride booking with automatic driver assignment, advertisement-based discounts, and payment processing.

## Scope

- **Full-Stack Application**: React frontend + Node.js/TypeScript backend
- **Real Backend Integration**: All services integrated with actual API endpoints
- **User Stories Implemented**: User Story #1 (Core Ride Booking) and User Story #3 (Advertisement Discount)
- **User Story #2 Discarded**: Price trends analytics feature is NOT included
- **Development Database**: In-memory database for development, PostgreSQL for production

## Project Structure

```
team-code-cruise/
├── frontend/                 # React application (Vite)
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── booking/      # Ride booking UI (NewBookingUI.jsx)
│   │   │   ├── tracking/     # Driver tracking (DriverTrackingUI.jsx)
│   │   │   ├── payment/      # Payment UI (PaymentUI.jsx, PaymentConfirmation.jsx)
│   │   │   ├── ad/           # Advertisement discount (AdDiscountUI.jsx)
│   │   │   ├── Landing/      # Login and landing pages
│   │   │   ├── Map/          # Map display component
│   │   │   └── TripCompleted/
│   │   ├── context/          # State management (Auth, Booking, Ad)
│   │   │   ├── AuthContext.jsx
│   │   │   ├── BookingContext.jsx
│   │   │   └── AdContext.jsx
│   │   ├── services/         # Backend API integration
│   │   │   ├── rideService.js
│   │   │   ├── advertisementService.js
│   │   │   └── authService.js (implicit via context)
│   │   ├── utils/            # Helper functions
│   │   └── App.jsx
│   ├── tests/                # Jest unit tests
│   ├── .env.development      # Frontend environment config
│   └── package.json
│
├── backend/                  # Node.js/TypeScript API
│   ├── src/
│   │   ├── web/              # API controllers (routes)
│   │   │   ├── auth.controller.ts
│   │   │   ├── quote.controller.ts
│   │   │   ├── ride.controller.ts
│   │   │   ├── payment.controller.ts
│   │   │   └── ad.controller.ts
│   │   ├── core/             # Business logic services
│   │   │   ├── ride.service.ts
│   │   │   ├── quote.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── matching.service.ts
│   │   │   └── ride-timeout.service.ts
│   │   ├── ad/               # Advertisement services
│   │   │   ├── ad.service.ts
│   │   │   ├── eligibility.service.ts
│   │   │   └── discount.service.ts
│   │   ├── shared/           # Shared utilities
│   │   │   ├── auth.service.ts
│   │   │   ├── pricing.service.ts
│   │   │   ├── location.service.ts
│   │   │   ├── rating.service.ts
│   │   │   └── eventBus.ts
│   │   ├── repo/             # Data repositories (DB access)
│   │   ├── workbench/        # Development utilities
│   │   │   ├── memoryDb.ts   # In-memory database
│   │   │   └── runtimeConfig.ts
│   │   ├── server/
│   │   │   ├── app.ts        # Express app setup
│   │   │   └── errorHandler.ts
│   │   └── index.ts          # Entry point
│   ├── tests/                # Jest unit tests
│   ├── .env                  # Backend environment config
│   └── package.json
│
├── database/                 # Database schema
│   └── prisma/
│       └── schema.prisma     # Prisma ORM schema
│
├── docs/                     # Documentation and specs
│   ├── UI-mockups-screenshots/
│   ├── user-story-1/
│   └── user-story-3/
│
├── logs/                     # Development logs (gitignored)
├── start-dev.sh              # Automated startup script
├── CLAUDE.md                 # This file
├── README.md                 # Main project documentation
├── INTEGRATION_COMPLETE.md   # Frontend-backend integration details
└── INTEGRATION_README.md     # API integration guide
```

## Backend Architecture

### Service Layer Pattern

The backend follows a layered architecture:
- **Controllers** (`web/`) - HTTP request/response handling, input validation
- **Services** (`core/`, `ad/`, `shared/`) - Business logic
- **Repositories** (`repo/`) - Database access abstraction
- **Workbench** (`workbench/`) - Development utilities (in-memory DB, config)

### Key Services

**Core Services**:
- `QuoteService` - Fare calculation and quote management
- `RideService` - Ride creation, state management, completion
- `MatchingService` - Automatic driver assignment (finds nearest available driver)
- `PaymentService` - Payment intent creation and confirmation
- `RideTimeoutService` - Monitors and cancels expired rides

**Advertisement Services**:
- `AdService` - Ad session lifecycle, playback tracking
- `EligibilityService` - Checks cooldown and daily ad limits
- `DiscountService` - Generates and validates discount tokens

**Shared Services**:
- `AuthService` - JWT authentication and user management
- `PricingService` - Fare calculation logic (base fare, distance, surge)
- `LocationService` - Distance calculations using Haversine formula
- `RatingService` - Driver rating management

### Event System

The backend uses an event bus (`shared/eventBus.ts`) for decoupled communication between services:
- `RideCreated` - Emitted when a new ride is created
- `RideCompleted` - Emitted when a ride is completed
- `DriverAssigned` - Emitted when a driver is matched to a ride

### Data Flow Example

**Creating a ride with discount**:
1. Frontend calls `POST /quotes` with pickup/dropoff coordinates (and optional tokenId)
2. `QuoteController` → `QuoteService.createQuote()`
3. `PricingService` calculates base fare
4. If tokenId provided, `DiscountService.validateToken()` applies discount
5. Quote returned to frontend
6. User requests ride: `POST /rides` with quoteId and tokenId
7. `RideController` → `RideService.createRide()`
8. `MatchingService.assignDriver()` finds nearest available driver
9. Ride created with status `ACCEPTED`, driver auto-assigned
10. Frontend polls `GET /rides/:id` for updates

### Database Modes

**Development (Memory Mode)**:
- Set `RB_DATA_MODE=memory` in backend `.env`
- In-memory database with pre-seeded data (1 rider, 5 drivers)
- Fast startup, no database setup required
- Data resets on server restart

**Production (PostgreSQL)**:
- Remove `RB_DATA_MODE=memory` from `.env`
- Requires PostgreSQL with PostGIS extension
- Run `pnpm run prisma:migrate` to apply schema
- Persistent data storage

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **React Context API** - State management (AuthContext, BookingContext, AdContext)
- **CSS** - Styling (plain CSS, no preprocessors)
- **uuid** - Unique ID generation
- **Jest + @swc/jest** - Unit testing

### Backend
- **Node.js** - Runtime environment
- **TypeScript** - Primary language
- **Express** - Web framework
- **Prisma** - ORM for database access
- **JWT (jsonwebtoken)** - Authentication
- **bcryptjs** - Password hashing
- **Zod** - Runtime type validation
- **Jest + @swc/jest** - Unit testing
- **tsx** - TypeScript execution for development

### Database
- **PostgreSQL + PostGIS** - Production database
- **In-Memory Database** - Development mode (workbench/memoryDb.ts)

### Package Managers
- **pnpm** - Backend package management
- **npm** - Frontend package management

## Running the Application

### Quick Start (Recommended)

Use the automated startup script:
```bash
./start-dev.sh
```

This starts both backend (port 3000) and frontend (port 5173) with logging to `logs/` directory.

**Default Login Credentials**:
- Email: `rider@example.com`
- Password: `ride1234`

### Manual Startup

**Backend** (Terminal 1):
```bash
cd backend
pnpm install                # First time only
pnpm run dev:memory        # Starts with in-memory database
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm install                # First time only
npm run dev                # Starts Vite dev server
```

### Running Tests

**Backend Tests**:
```bash
cd backend
npm test                   # Run once with lint
npm run test:watch        # Watch mode (no lint)
npm run test:ci           # With coverage (CI)
```

**Frontend Tests**:
```bash
cd frontend
npm test                   # Run once with lint
npm run test:watch        # Watch mode (no lint)
npm run test:ci           # With coverage (CI)
```

**Important**: Backend tests require TypeScript compilation (`pretest` script handles this). If you see Prisma type errors, run `npm run prisma:gen` once.

### Building for Production

**Backend**:
```bash
cd backend
pnpm run build            # Compiles TypeScript to dist/
pnpm start                # Runs compiled code
```

**Frontend**:
```bash
cd frontend
npm run build             # Creates production bundle in dist/
npm run preview           # Preview production build
```

### Linting

**Backend**:
```bash
cd backend
npm run lint
```

**Frontend**:
```bash
cd frontend
npm run lint
```

### Database Commands (Backend)

```bash
cd backend
pnpm run prisma:gen       # Generate Prisma client
pnpm run prisma:push      # Push schema changes to DB (dev)
pnpm run prisma:migrate   # Create and apply migrations (production)
```

## API Endpoints

### Authentication
- `POST /login` - User login (returns JWT token)
- `GET /me` - Get current user profile (requires auth)

### Quotes & Rides
- `POST /quotes` - Get fare quote (optional tokenId for discount)
- `POST /rides` - Create ride (auto-assigns nearest driver)
- `GET /rides/:id` - Get ride details
- `POST /rides/:id/complete` - Mark ride as complete
- `POST /rides/:id/cancel` - Cancel ride

### Advertisements
- `GET /ads/eligibility` - Check if user can watch ads (cooldown, daily limit)
- `POST /ads/sessions` - Create ad session (specify discount percentage)
- `POST /ads/playback` - Track playback events (start, q1, q2, q3, complete)
- `POST /ads/complete` - Finalize ad, get discount tokenId

### Payments
- `POST /payments/intents` - Create payment intent for a ride
- `POST /payments/confirm` - Confirm payment with method

**Full API documentation**: See `INTEGRATION_README.md` and `INTEGRATION_COMPLETE.md`

## Frontend State Management

The frontend uses React Context API for state management with three main contexts:

### AuthContext (`frontend/src/context/AuthContext.jsx`)
Manages user authentication and session persistence:
- Stores JWT token and user info
- Handles login/logout
- Auto-login on app reload (from localStorage)
- Provides authenticated API request wrapper

**Key Methods**:
- `login(email, password)` - Authenticate user
- `logout()` - Clear session
- `isAuthenticated` - Boolean auth state

### BookingContext (`frontend/src/context/BookingContext.jsx`)
Manages ride booking flow and state:
- Quote creation and management
- Ride request and driver assignment
- Trip state tracking
- Payment processing

**Key Methods**:
- `getFareQuote(pickup, dropoff, tokenId?)` - Get quote with optional discount
- `requestRide(pickup, dropoff, quoteId, tokenId?)` - Create ride, auto-assigns driver
- `completeRide()` - Mark ride complete
- `cancelRide()` - Cancel active ride
- `createPayment(rideId)` - Create payment intent
- `confirmPayment(intentId, method)` - Confirm payment
- `updateTripState(state)` - Update trip progress

**State**:
- `quote` - Current fare quote
- `ride` - Active ride details
- `driver` - Assigned driver info
- `tripState` - Current trip state (DriverEnRoute, Arrived, InTrip, Completed)

### AdContext (`frontend/src/context/AdContext.jsx`)
Manages advertisement viewing and discount flow:
- Ad eligibility checking (cooldown, daily limits)
- Ad session lifecycle
- Playback event tracking
- Discount token management

**Key Methods**:
- `checkEligibility()` - Check if user can watch ads
- `startAdSession(percent)` - Create ad session (10-15% discount)
- `playAd()` - Start ad playback
- `updateAdProgress(progress)` - Auto-tracks quartiles (25%, 50%, 75%)
- `completeAd()` - Finalize ad, receive discount tokenId
- `skipAd()` - User skips ad

**State**:
- `isEligible` - Can user watch ads now?
- `cooldownEndsAt` - When can user watch next ad?
- `discountToken` - `{ tokenId, expiresAt }` for use in ride booking
- `adSession` - Current ad session details

## Key Implementation Details

### Frontend-Backend Integration

**Ride Booking Flow**:
1. User enters pickup/dropoff coordinates (lat/lng required, not "here"/"there")
2. `BookingContext.getFareQuote()` → `POST /quotes`
3. Optional: User watches ad, gets discount token
4. User requests ride with `requestRide()` → `POST /rides`
5. Backend auto-assigns nearest available driver (instant, no "finding driver" animation)
6. Frontend polls `GET /rides/:id` for updates (or can manually update tripState)
7. User completes trip → `POST /rides/:id/complete`
8. Create payment → `POST /payments/intents`
9. Confirm payment → `POST /payments/confirm`

**Advertisement Flow**:
1. Check eligibility → `GET /ads/eligibility` (verifies cooldown, daily limit)
2. If eligible, start session → `POST /ads/sessions` with discount percent (10-15)
3. Play ad → `POST /ads/playback` with event "start"
4. Auto-track progress → Frontend calls `POST /ads/playback` at 25%, 50%, 75%, 100%
5. Complete ad → `POST /ads/complete` returns `{ tokenId, expiresAt }`
6. Use tokenId in quote and ride creation for discount

**Authentication**:
- All API requests (except `/login`) require JWT token in `Authorization: Bearer <token>` header
- AuthContext manages token storage (localStorage) and auto-login
- Token expires after 24 hours (configurable via JWT_SECRET)

### Important Differences from Original Plan

**Driver Assignment**:
- Original: Manual "finding driver" step with animation
- Actual: Instant auto-assignment when ride is created via backend

**Driver Location**:
- Original: Animated movement from driver → pickup → destination
- Actual: Static location from backend (no real-time tracking)

**Coordinates Required**:
- Original: Mock geocoding for "here" and "there"
- Actual: Frontend must provide `{ lat, lng }` coordinates directly

**Payment**:
- Original: Not specified in detail
- Actual: Two-step process (create intent, then confirm)

### Development Database (Memory Mode)

When backend runs with `RB_DATA_MODE=memory`:
- 1 pre-seeded rider: `rider@example.com` / `ride1234`
- 5 pre-seeded drivers across San Francisco:
  1. John Smith - Toyota Camry (ABC-123) - Downtown
  2. Maria Garcia - Honda Accord (XYZ-456) - Union Square
  3. David Chen - Ford Fusion (DEF-789) - Mission District
  4. Sarah Johnson - Chevrolet Malibu (GHI-012) - Financial District
  5. Michael Brown - Nissan Altima (JKL-345) - SOMA
- All data resets on server restart
- No persistent storage required

## Environment Configuration

### Backend `.env`
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/rb  # For production
JWT_SECRET=your-secret-key-here                         # Change in production
RB_DATA_MODE=memory                                     # Use memory mode for dev
PORT=3000                                               # Backend port
```

### Frontend `.env.development`
```env
VITE_API_BASE_URL=http://localhost:3000  # Backend API URL
```

## Code Style and Conventions

### Frontend (JavaScript/React)
- Use functional components with hooks (no class components)
- Keep components focused (prefer smaller, composable components)
- Use camelCase for functions and variables
- CSS classes use kebab-case
- Add JSDoc comments for complex logic

### Backend (TypeScript)
- Use TypeScript strict mode
- Services should be stateless where possible
- Use Zod for input validation at controller level
- Follow Express middleware pattern for auth
- Use async/await (no callbacks)
- Repository pattern for database access

## Testing

### Frontend Tests
- Located in `frontend/tests/`
- Use Jest with SWC (no Babel)
- Default to Node environment (use `/** @jest-environment jsdom */` for DOM tests)
- Mock external API calls
- Test service layer logic, not just components

### Backend Tests
- Located in `backend/tests/`
- Use Jest with SWC for TypeScript
- Tests run in memory mode (`RB_DATA_MODE=memory`)
- `pretest` script compiles TypeScript first
- Mock Prisma client for unit tests

## Documentation References

- **README.md**: Quick start guide, project overview, feature list
- **START_GUIDE.md**: Detailed startup instructions and troubleshooting
- **INTEGRATION_README.md**: API endpoint documentation
- **INTEGRATION_COMPLETE.md**: Frontend-backend integration details and data flow examples
- **docs/user-story-1/**: User Story #1 (Core Ride Booking) specification
- **docs/user-story-3/**: User Story #3 (Advertisement Discount) specification
- **docs/UI-mockups-screenshots/**: UI design mockups

## Common Development Tasks

### Adding a New API Endpoint
1. Create controller in `backend/src/web/` (handles HTTP request/response)
2. Implement business logic in service (`backend/src/core/` or `backend/src/ad/`)
3. Add route to `backend/src/server/app.ts`
4. Update frontend service (`frontend/src/services/`)
5. Update context if needed (`frontend/src/context/`)
6. Write tests for both backend and frontend

### Modifying Database Schema
1. Edit `database/prisma/schema.prisma`
2. Run `cd backend && pnpm run prisma:generate` to update Prisma client
3. For production: `pnpm run prisma:migrate` to create migration
4. For dev: `pnpm run prisma:push` to push schema changes
5. Update repositories in `backend/src/repo/`
6. Update memory database in `backend/src/workbench/memoryDb.ts` if using dev mode

### Adding a New Frontend Component
1. Create component in appropriate `frontend/src/components/` subdirectory
2. Use existing context hooks (`useAuth`, `useBooking`, `useAd`)
3. Follow existing CSS patterns in `frontend/src/index.css` or component CSS
4. Integrate with `frontend/src/App.jsx` routing if needed

## Project Status

**Integration: 95% Complete**

✅ Authentication with JWT
✅ Ride booking with auto-driver assignment
✅ Advertisement discounts with eligibility checking
✅ Payment processing (intent + confirmation)
✅ Backend tests with CI
✅ Frontend tests with CI
🚧 UI polish and error handling improvements
🚧 End-to-end integration testing

## Important Notes for AI Assistance

- This project evolved from frontend-only to full-stack
- Mock services (`mockBookingService.js`, `mockAdService.js`) still exist but are UNUSED
- All functionality now goes through real backend API
- Use `INTEGRATION_COMPLETE.md` for understanding data flow
- Memory mode (`RB_DATA_MODE=memory`) is recommended for development
- Tests do not require running backend server (HTTP calls are mocked in tests)
