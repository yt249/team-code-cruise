# Frontend-Backend Integration Plan

## Overview

This document outlines the integration plan for connecting the React frontend with the Node.js/TypeScript backend. The frontend currently uses mock services that simulate backend behavior. This integration will replace those mocks with real API calls to the backend.

---

## Current State Analysis

### Frontend Architecture
- **Framework**: React 19 with Context API
- **Mock Services**:
  - `mockBookingService.js` - Simulates booking/ride APIs
  - `mockAdService.js` - Simulates ad/discount APIs
- **State Management**:
  - `BookingContext.jsx` - Manages booking, quotes, trips, drivers
  - `AdContext.jsx` - Manages ad sessions and discounts
- **Data Flow**: UI Components → Contexts → Mock Services → Static Data

### Backend Architecture
- **Framework**: Node.js/Express with TypeScript
- **API Base URL**: `http://localhost:3000` (default)
- **Authentication**: JWT Bearer tokens
- **Mode Support**: PostgreSQL database or in-memory mode

---

## Integration Requirements

### 1. Authentication System

**Current**: Frontend has no authentication
**Required**: Implement JWT-based auth to access backend APIs

#### Implementation Steps:

1. **Create Auth Service** (`frontend/src/services/authService.js`)
   - Login function (POST /login)
   - Token storage (localStorage/sessionStorage)
   - Token retrieval
   - Logout function

2. **Create Auth Context** (`frontend/src/context/AuthContext.jsx`)
   - Login state management
   - User profile state
   - Auto-login on app load (check for existing token)
   - Token refresh logic

3. **Add Login UI Component** (`frontend/src/components/auth/LoginPage.jsx`)
   - Email + Password form
   - Error handling
   - Redirect after login

#### API Mapping:
| Frontend Function | Backend Endpoint | Method | Auth Required |
|-------------------|------------------|--------|---------------|
| `login(email, password)` | `/login` | POST | No |
| `getProfile()` | `/me` | GET | Yes |

#### Test Credentials (Memory Mode):
- Email: `rider@example.com`
- Password: `ride1234`

---

### 2. Booking/Ride Integration

**Current**: `mockBookingService.js` with simulated data
**Required**: Real API calls to backend

#### Create New Service (`frontend/src/services/rideService.js`)

```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const rideService = {
  async getQuote(pickup, dropoff, tokenId = null) {
    const response = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Auth is optional for quotes
      },
      body: JSON.stringify({
        pickup: { lat: pickup.lat, lon: pickup.lng },
        dest: { lat: dropoff.lat, lon: dropoff.lng },
        tokenId
      })
    });
    return response.json();
  },

  async createRide(pickup, dropoff, quoteId, tokenId = null) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pickup: { lat: pickup.lat, lon: pickup.lng },
        dest: { lat: dropoff.lat, lon: dropoff.lng },
        quoteId,
        tokenId
      })
    });
    return response.json();
  },

  async getRide(rideId) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides/${rideId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  async cancelRide(rideId) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  async completeRide(rideId) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/rides/${rideId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  }
};
```

#### Data Model Mapping

| Frontend Model | Backend Model | Mapping Notes |
|----------------|---------------|---------------|
| `quote.pickup` | `{ lat, lon }` | Frontend uses `lng`, backend uses `lon` |
| `quote.dropoff` | `{ lat, lon }` | Same as above |
| `quote.fare` | `amount` (cents) | Backend uses cents, frontend may need to divide by 100 |
| `quote.distance` | Not in response | Frontend calculates or fetetes from route |
| `quote.eta` | `etaMinutes` | Direct mapping |
| `booking.status` | `ride.status` | Backend: REQUESTED, MATCHING, DRIVER_ASSIGNED, etc. |
| `booking.driver` | `ride.driver` | Nested object with name, vehicle, rating |
| `booking.baseFare` | `ride.fareAmount` | Backend amount is final (with discount applied) |
| `booking.finalFare` | `ride.discountedAmount or fareAmount` | Use discountedAmount if present |

#### Status Mapping
| Frontend Status | Backend RideStatus |
|----------------|-------------------|
| "Requested" | REQUESTED |
| "DriverAssigned" | DRIVER_ASSIGNED |
| "DriverEnRoute" | DRIVER_EN_ROUTE |
| "InProgress" | IN_RIDE |
| "Completed" | COMPLETED |
| "Cancelled" | CANCELLED |

---

### 3. Advertisement/Discount Integration

**Current**: `mockAdService.js` with random ads
**Required**: Real ad session and token flow

#### Create New Service (`frontend/src/services/adService.js`)

```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const adService = {
  async checkEligibility() {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/ads/eligibility`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  async createSession(percent) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/ads/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ percent })
    });
    return response.json();
  },

  async recordPlayback(sessionId, event, timestamp = null) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/ads/playback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sessionId,
        event, // 'start' | '25%' | '50%' | '75%' | 'complete'
        ts: timestamp?.toISOString()
      })
    });
    return response.json();
  },

  async completeSession(sessionId) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/ads/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId })
    });
    return response.json();
  }
};
```

#### Data Model Mapping

| Frontend Model | Backend Model | Mapping Notes |
|----------------|---------------|---------------|
| `adSession.id` | `sessionId` | Direct mapping |
| `adSession.ad` | Not in backend | Frontend constructs ad object |
| `adSession.discountPercentage` | `percent` | 10-15 |
| `adSession.status` | Backend doesn't return | Frontend tracks locally |
| `discount.tokenId` | `tokenId` | Returned from /ads/complete |
| `discount.expiresAt` | `expiresAt` (ISO string) | Direct mapping |
| `discount.percentage` | Stored with token | Frontend must remember from session |

---

### 4. Payment Integration

**Current**: No payment implementation in frontend
**Required**: Payment intent creation and confirmation

#### Create New Service (`frontend/src/services/paymentService.js`)

```javascript
export const paymentService = {
  async createPaymentIntent(rideId) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/payments/intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rideId })
    });
    return response.json();
  },

  async confirmPayment(intentId, method) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ intentId, method })
    });
    return response.json();
  }
};
```

---

## Integration Flow

### Full User Journey (with Backend Integration)

```
1. User opens app
   ↓
2. Check for auth token → If none, show Login page
   ↓
3. User logs in (POST /login) → Store JWT token
   ↓
4. User enters pickup ("here") and destination ("there")
   ↓
5. Frontend calls POST /quotes → Get fare quote
   ↓
6. (Optional) Check ad eligibility (GET /ads/eligibility)
   ↓
7. (Optional) Create ad session (POST /ads/sessions)
   ↓
8. (Optional) Play ad → Record quartile events (POST /ads/playback)
   ↓
9. (Optional) Complete ad (POST /ads/complete) → Get discount token
   ↓
10. User confirms booking
    ↓
11. Frontend calls POST /quotes again WITH tokenId (if discount applied)
    ↓
12. Frontend calls POST /rides WITH quoteId and tokenId
    ↓
13. Backend auto-assigns driver (MatchingService)
    ↓
14. Frontend polls GET /rides/:id for status updates
    ↓
15. Display driver info, ETA, route
    ↓
16. When trip completes → POST /rides/:id/complete
    ↓
17. Create payment intent (POST /payments/intents)
    ↓
18. User selects payment method
    ↓
19. Confirm payment (POST /payments/confirm)
    ↓
20. Show receipt
```

---

## Configuration & Environment

### Frontend Environment Variables

Create `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

Create `frontend/.env.production`:
```
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### Backend Environment Variables

Ensure `backend/.env`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/rb?schema=public"
JWT_SECRET="dev-secret-1234"
RB_DATA_MODE=memory  # Use memory mode for development
PORT=3000
```

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid JWT | Redirect to login |
| 403 Forbidden | Token valid but insufficient permissions | Show error message |
| 404 Not Found | Resource doesn't exist | Handle gracefully |
| 409 Conflict | Ad eligibility cooldown active | Show cooldown timer |
| 410 Gone | Token/session expired | Clear local state, restart flow |
| 422 Unprocessable | Invalid playback sequence | Re-sync ad session |
| 500 Server Error | Backend issue | Show retry option |

### Example Error Handler

```javascript
async function handleApiResponse(response) {
  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 401:
        // Clear auth and redirect to login
        clearAuthToken();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');

      case 409:
        // Ad cooldown
        if (error.cooldownEndsAt) {
          throw new Error(`Please wait until ${new Date(error.cooldownEndsAt).toLocaleTimeString()}`);
        }
        throw new Error(error.message || 'Conflict');

      case 410:
        throw new Error('This session has expired. Please start over.');

      default:
        throw new Error(error.message || `Error: ${response.status}`);
    }
  }

  return response.json();
}
```

---

## Testing Strategy

### Step 1: Backend in Memory Mode
1. Start backend with `cd backend && pnpm run dev:memory`
2. Verify backend is running at http://localhost:3000
3. Test login with curl:
   ```bash
   curl -X POST http://localhost:3000/login \
     -H "Content-Type: application/json" \
     -d '{"email":"rider@example.com","password":"ride1234"}'
   ```

### Step 2: Frontend Integration Testing
1. Start frontend with `cd frontend && npm run dev`
2. Test login flow
3. Test quote generation (no auth)
4. Test quote generation (with auth + tokenId)
5. Test ride creation
6. Test ad flow
7. Test payment flow

### Step 3: End-to-End Testing
1. Complete full user journey
2. Test error scenarios
3. Test with network throttling
4. Test concurrent requests

---

## Migration Checklist

### Phase 1: Authentication (1-2 hours)
- [ ] Create `authService.js`
- [ ] Create `AuthContext.jsx`
- [ ] Create `LoginPage.jsx`
- [ ] Add login route
- [ ] Test login flow
- [ ] Add token persistence
- [ ] Add auto-login on app load

### Phase 2: Booking Integration (2-3 hours)
- [ ] Create `rideService.js`
- [ ] Update `BookingContext.jsx` to use real API
- [ ] Map frontend → backend data models
- [ ] Handle backend status enum
- [ ] Update UI components for new data structure
- [ ] Test quote → ride → complete flow
- [ ] Handle errors gracefully

### Phase 3: Ad Integration (1-2 hours)
- [ ] Create `adService.js`
- [ ] Update `AdContext.jsx` to use real API
- [ ] Implement eligibility check
- [ ] Implement quartile event tracking
- [ ] Get discount token from backend
- [ ] Apply token to quote
- [ ] Test full ad → discount → booking flow

### Phase 4: Payment Integration (1 hour)
- [ ] Create `paymentService.js`
- [ ] Add payment intent creation
- [ ] Add payment confirmation
- [ ] Update PaymentUI component
- [ ] Test payment flow

### Phase 5: Polish & Testing (2-3 hours)
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Add retry mechanisms
- [ ] Test all edge cases
- [ ] Test with backend database mode
- [ ] Performance testing
- [ ] Cross-browser testing

**Total Estimated Time: 7-11 hours**

---

## Breaking Changes

### 1. Location Coordinate Format
- **Frontend**: Uses `{ lat, lng }`
- **Backend**: Uses `{ lat, lon }`
- **Solution**: Add helper functions to convert

```javascript
const toBackendCoords = (location) => ({
  lat: location.lat,
  lon: location.lng || location.lon
});

const toFrontendCoords = (location) => ({
  lat: location.lat,
  lng: location.lon || location.lng
});
```

### 2. Fare Amount Format
- **Frontend**: Dollar amount (e.g., 15.50)
- **Backend**: Cents (e.g., 1550)
- **Solution**: Convert in API layer

```javascript
const toCents = (dollars) => Math.round(dollars * 100);
const toDollars = (cents) => cents / 100;
```

### 3. Status Enum Differences
- **Frontend**: String status ("Requested", "DriverAssigned")
- **Backend**: Enum (REQUESTED, DRIVER_ASSIGNED)
- **Solution**: Create status mapper

```javascript
const STATUS_MAP = {
  'REQUESTED': 'Requested',
  'MATCHING': 'Finding Driver',
  'DRIVER_ASSIGNED': 'DriverAssigned',
  'DRIVER_EN_ROUTE': 'DriverEnRoute',
  'IN_RIDE': 'InProgress',
  'COMPLETED': 'Completed',
  'CANCELLED': 'Cancelled'
};
```

---

## Summary

This integration plan provides a complete roadmap for connecting the React frontend to the Node.js/TypeScript backend. The key changes include:

1. **Adding authentication** with JWT tokens
2. **Replacing mock services** with real API calls
3. **Mapping data models** between frontend and backend formats
4. **Handling backend status enums** and error codes
5. **Testing thoroughly** at each integration phase

**Estimated Total Effort**: 7-11 hours for a complete integration

**Next Steps**:
1. Review this plan
2. Set up development environment (backend in memory mode)
3. Begin Phase 1 (Authentication)
4. Proceed sequentially through remaining phases
