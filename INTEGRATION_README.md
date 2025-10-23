# Frontend-Backend Integration Guide

## Overview

This guide provides step-by-step instructions for running the integrated CodeCruise ride-sharing application with both frontend (React) and backend (Node.js/TypeScript) working together.

---

## Quick Start

### Prerequisites
- Node.js (v16+)
- pnpm (for backend)
- npm (for frontend)

### 1. Start the Backend

```bash
cd backend
pnpm install
pnpm run dev:memory
```

The backend will start on **http://localhost:3000**

**Note**: Using `dev:memory` runs the backend with an in-memory database (no PostgreSQL required).

### 2. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:5173**

### 3. Login

Open http://localhost:5173 in your browser. You'll see the login page.

**Demo Credentials:**
- Email: `rider@example.com`
- Password: `ride1234`

---

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│   Frontend (React)  │  HTTP   │  Backend (Node.js)   │
│   localhost:5173    │ ◄─────► │   localhost:3000     │
│                     │  JWT    │                      │
│  - Login Page       │         │  - Auth API          │
│  - Booking UI       │         │  - Ride API          │
│  - Ad Discount UI   │         │  - Ad API            │
│  - Payment UI       │         │  - Payment API       │
└─────────────────────┘         └──────────────────────┘
```

---

## Features Implemented

### ✅ Phase 1: Authentication
- JWT-based login system
- Token persistence in localStorage
- Auto-login on app load
- Session expiry handling
- Login page with demo credentials

### ✅ Phase 2: API Services
- **rideService.js**: Quote generation, ride creation, ride management
- **adService.js**: Ad eligibility, session management, playback tracking
- **paymentService.js**: Payment intent creation and confirmation

### 🚧 Phase 3-5: In Progress
- Context integration (BookingContext, AdContext)
- Full end-to-end flow testing
- Error handling polish

---

## API Endpoints Available

### Authentication
```
POST /login          - User login (returns JWT)
GET  /me             - Get current user profile
```

### Quotes
```
POST /quotes         - Get fare quote (optional auth)
                      Body: { pickup, dest, tokenId? }
```

### Rides
```
POST   /rides        - Create ride (auto-assigns driver)
GET    /rides/:id    - Get ride details
POST   /rides/:id/cancel    - Cancel ride
POST   /rides/:id/complete  - Complete ride
```

### Ads
```
GET  /ads/eligibility           - Check if eligible for ads
POST /ads/sessions              - Create ad session
POST /ads/playback              - Record playback event
POST /ads/complete              - Complete ad, get token
```

### Payments
```
POST /payments/intents          - Create payment intent
POST /payments/confirm          - Confirm payment
```

---

## Data Flow

### Full User Journey

```
1. User opens app → Auto-login if token exists
2. User logs in → JWT token stored
3. User enters pickup/destination
4. GET /quotes → Fare quote
5. [Optional] GET /ads/eligibility → Check eligibility
6. [Optional] POST /ads/sessions → Start ad session
7. [Optional] POST /ads/playback → Track ad viewing
8. [Optional] POST /ads/complete → Get discount token
9. POST /quotes (with tokenId) → Discounted quote
10. POST /rides → Create ride (auto-assigns driver)
11. Poll GET /rides/:id → Status updates
12. POST /rides/:id/complete → Mark complete
13. POST /payments/intents → Create payment
14. POST /payments/confirm → Confirm payment
```

---

## Configuration

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/rb
JWT_SECRET=dev-secret-1234
RB_DATA_MODE=memory   # Use memory mode for development
PORT=3000
```

### Frontend (.env.development)
```
VITE_API_BASE_URL=http://localhost:3000
```

---

## Development Mode (Memory Database)

The backend supports an in-memory mode perfect for development:

```bash
cd backend
pnpm run dev:memory
```

**Pre-seeded Data:**
- **Rider**: rider@example.com / ride1234
- **5 Drivers**: Various ratings, vehicles
- **Mock locations**: "here" and "there"

---

## Testing the Integration

### 1. Test Authentication
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rider@example.com","password":"ride1234"}'
```

Expected response:
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5..."}
```

### 2. Test Quote (No Auth)
```bash
curl -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{"pickup":{"lat":40.7580,"lon":-73.9855},"dest":{"lat":40.7829,"lon":-73.9654}}'
```

### 3. Test Quote (With Auth)
```bash
TOKEN="your-token-here"
curl -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pickup":{"lat":40.7580,"lon":-73.9855},"dest":{"lat":40.7829,"lon":-73.9654}}'
```

### 4. Test Ad Eligibility
```bash
curl http://localhost:3000/ads/eligibility \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Backend won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Ensure dependencies are installed: `pnpm install`
- Check JWT_SECRET is set in .env

### Frontend won't connect
- Verify backend is running: `curl http://localhost:3000/login`
- Check VITE_API_BASE_URL in frontend/.env.development
- Clear browser localStorage and refresh

### Login fails
- Verify backend is in memory mode: `RB_DATA_MODE=memory`
- Check credentials: rider@example.com / ride1234
- Check browser console for errors

### CORS errors
- Backend has CORS enabled by default
- Ensure frontend is on localhost:5173
- Check backend cors() configuration

---

## Project Structure

```
team-code-cruise/
├── backend/                    # Node.js/TypeScript API
│   ├── src/
│   │   ├── ad/                # Ad services
│   │   ├── core/              # Core business logic
│   │   ├── repo/              # Data repositories
│   │   ├── server/            # Express setup
│   │   ├── shared/            # Shared utilities
│   │   ├── web/               # API controllers
│   │   ├── workbench/         # Dev utilities (memory DB)
│   │   └── index.ts
│   ├── tests/
│   ├── package.json
│   └── .env
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── context/           # State management
│   │   │   ├── AuthContext.jsx
│   │   │   ├── BookingContext.jsx
│   │   │   └── AdContext.jsx
│   │   ├── services/          # API integration
│   │   │   ├── authService.js
│   │   │   ├── rideService.js
│   │   │   ├── adService.js
│   │   │   └── paymentService.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── .env.development
├── database/                   # Database schema
│   └── prisma/
│       └── schema.prisma
└── docs/                       # Documentation
```

---

## API Service Details

### rideService.js

**Data Transformations:**
- Coordinates: `{ lat, lng }` (frontend) ↔ `{ lat, lon }` (backend)
- Currency: dollars (frontend) ↔ cents (backend)
- Status: friendly names (frontend) ↔ enums (backend)

**Status Mapping:**
```javascript
REQUESTED → "Requested"
MATCHING → "Finding Driver"
DRIVER_ASSIGNED → "DriverAssigned"
DRIVER_EN_ROUTE → "DriverEnRoute"
IN_RIDE → "InProgress"
COMPLETED → "Completed"
CANCELLED → "Cancelled"
```

### adService.js

**Playback Events:**
- `start`: Ad playback begins
- `25%`: First quartile
- `50%`: Midpoint
- `75%`: Third quartile
- `complete`: Ad finished

**Eligibility:**
- Cooldown: 10 minutes between ads
- Daily cap: 5 ads per day
- Discount range: 10-15%

---

## Next Steps

### Remaining Integration Work

1. **Update BookingContext** to use rideService instead of mockBookingService
2. **Update AdContext** to use adService instead of mockAdService
3. **Implement payment flow** using paymentService
4. **End-to-end testing** of full user journey
5. **Error handling polish** across all components

### Estimated Time
- Context updates: 2-3 hours
- Testing & polish: 2-3 hours
- **Total: 4-6 hours**

---

## Production Deployment (Future)

### Backend
1. Switch to PostgreSQL: Remove `RB_DATA_MODE=memory`
2. Set proper JWT_SECRET
3. Configure DATABASE_URL with PostGIS
4. Run migrations: `pnpm run prisma:migrate`
5. Deploy to cloud (AWS/Heroku/Railway)

### Frontend
1. Update VITE_API_BASE_URL to production backend
2. Build: `npm run build`
3. Deploy to Vercel/Netlify/Cloudflare Pages

---

## Support

For issues or questions:
1. Check backend logs: Look at terminal running `pnpm run dev:memory`
2. Check frontend console: Open browser DevTools
3. Review API responses: Use browser Network tab
4. Test backend directly: Use curl commands above

---

## Summary

You now have a **fully integrated authentication system** with **comprehensive API services** ready to connect the React frontend to the Node.js backend. The backend runs in memory mode for easy development, and all API endpoints are documented and tested.

**Current Status:**
- ✅ Authentication: Complete
- ✅ API Services: Complete
- 🚧 Context Integration: Next step
- 🚧 End-to-end Testing: Next step

**Ready to proceed with Phase 3-5!**
