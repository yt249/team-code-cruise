# Frontend Services – Unit Test Specification

This document specifies unit tests for the following service modules:
- `frontend/src/services/advertisementService.js`
- `frontend/src/services/rideService.js`

Each section lists the functions present in the file and a table of tests (at least one per function). The intent is to reach ≥80% coverage by exercising happy paths, error branches, and key data transformations.

---

## advertisementService.js

Path: `frontend/src/services/advertisementService.js`

Functions
- `handleResponse(response)` – internal helper that maps HTTP errors to friendly `Error` messages; JSON-parses bodies; returns `response.json()` on success.
- `adService.checkEligibility()` – GETs `/ads/eligibility` with auth header; returns eligibility JSON.
- `adService.createSession(percent)` – POSTs `/ads/sessions` with `{ percent }`; returns normalized session shape for the frontend.
- `adService.recordPlayback(sessionId, event, timestamp = null)` – POSTs `/ads/playback` with sessionId/event and optional ISO timestamp.
- `adService.completeSession(sessionId)` – POSTs `/ads/complete` and returns normalized discount token.
- `adService.recordStart(sessionId)` – convenience wrapper for `recordPlayback(..., 'start', now)`.
- `adService.recordQuartile(sessionId, quartile)` – validates quartile in `['25%', '50%', '75%']` and calls `recordPlayback`.
- `adService.recordComplete(sessionId)` – convenience wrapper for `recordPlayback(..., 'complete', now)`.

Test Plan

| Purpose | Function | Inputs | Expected Result |
|---|---|---|---|
| Returns JSON on OK responses | handleResponse | Mock `Response` with `ok=true`, `json() => { a: 1 }` | Resolves to object `{ a: 1 }`. |
| Maps 401 to auth error | handleResponse | Mock `Response` with `ok=false`, `status=401` | Rejects with `Error('Session expired. Please log in again.')`. |
| Maps 409 with cooldownEndsAt | handleResponse | `ok=false`, `status=409`, body `{ cooldownEndsAt: '2025-01-01T00:00:00Z' }` | Rejects with message containing “Please wait until” and a localized time. |
| Maps 410 to session expired | handleResponse | `ok=false`, `status=410` | Rejects with `Error('This ad session has expired.')`. |
| Fallback error message | handleResponse | `ok=false`, `status=500`, body `{ error: 'X' }` | Rejects with `Error('X')`. |
| Requires auth token | checkEligibility | No token from `getAuthToken()` | Rejects with `Error('Authentication required')`. |
| Sends GET with auth; returns body | checkEligibility | Token present; mock fetch returns `{ isEligible: true }` | Resolves to `{ isEligible: true }` and request includes `Authorization: Bearer <token>`. |
| Creates session and normalizes fields | createSession | Token present; percent=15; server returns `{ sessionId, provider, percent, expiresAt }` | Resolves to `{ id: sessionId, sessionId, provider, percent:15, discountPercentage:15, expiresAt: msNumber, status:'Offered', createdAt: now≈ }`. |
| Records playback without timestamp | recordPlayback | `sessionId='s1', event='start'` | Sends POST `/ads/playback` with body `{ sessionId:'s1', event:'start' }`. |
| Records playback with timestamp | recordPlayback | `sessionId='s1', event='50%', timestamp=new Date('2025-01-01T00:00:00Z')` | Body includes `ts:'2025-01-01T00:00:00.000Z'`. |
| Completes session and normalizes token | completeSession | Token present; server returns `{ tokenId, expiresAt }` | Resolves to `{ tokenId, id: tokenId, expiresAt: msNumber, createdAt: now≈ }`. |
| recordStart calls recordPlayback('start') | recordStart | `sessionId='s1'`; spy on `recordPlayback` | Called once with `('s1','start', Date)` and resolves fetch result. |
| recordQuartile validates and calls playback | recordQuartile | `sessionId='s', quartile='25%'` | Calls `recordPlayback('s','25%', Date)` and resolves fetch result. |
| recordQuartile rejects on invalid quartile | recordQuartile | `sessionId='s', quartile='10%'` | Rejects with `Error('Invalid quartile: 10%')`. |
| recordComplete calls recordPlayback('complete') | recordComplete | `sessionId='s1'`; spy on `recordPlayback` | Called once with `('s1','complete', Date)` and resolves fetch result. |

Coverage notes: The above covers OK flow and 4 distinct error branches in `handleResponse`, plus all service methods and validation paths, exceeding 80% branch/function coverage.

---

## rideService.js

Path: `frontend/src/services/rideService.js`

Functions
- `toBackendCoords(location)` – internal mapper `{ lat, lng|lon } → { lat, lon }`.
- `toFrontendCoords(location)` – internal mapper `{ lat, lon|lng } → { lat, lng }`.
- `toDollars(cents)` – internal converter cents → dollars (number).
- `STATUS_MAP` – enum map used for frontend statuses.
- `handleResponse(response)` – internal HTTP error mapping (401/403/404/409/410/default); returns `response.json()` on success.
- `rideService.getQuote(pickup, dropoff, tokenId?)` – POSTs `/quotes`; optional auth; transforms quote fields.
- `rideService.createRide(pickup, dropoff, quoteId, tokenId?)` – POSTs `/rides` with auth; transforms ride shape.
- `rideService.getRide(rideId)` – GETs `/rides/:id` with auth; transforms ride shape.
- `rideService.cancelRide(rideId)` – POSTs `/rides/:id/cancel` with auth; returns response JSON.
- `rideService.completeRide(rideId)` – POSTs `/rides/:id/complete` with auth; returns response JSON.

Test Plan

| Purpose | Function | Inputs | Expected Result |
|---|---|---|---|
| Maps frontend → backend coords (lng→lon) | toBackendCoords (via getQuote body) | pickup `{lat:1,lng:2}`, dropoff `{lat:3,lng:4}`; intercept fetch | Request body equals `{ pickup:{lat:1,lon:2}, dest:{lat:3,lon:4} }`. |
| Maps backend → frontend coords (lon→lng) | toFrontendCoords (via createRide result) | Server returns `pickup:{lat:1,lon:2}`, `dest:{lat:3,lon:4}` | Result has `pickup:{lat:1,lng:2}`, `dropoff:{lat:3,lng:4}`. |
| Converts cents to dollars in quote | toDollars (via getQuote result) | Server `amount: 1234` | `fare` and `baseFare` equal `12.34`. |
| STATUS_MAP mapping applied | createRide | Server `status:'DRIVER_EN_ROUTE'` | Result `status:'DriverEnRoute'`. |
| Returns JSON on OK responses | handleResponse | Mock `Response` with `ok=true` | Resolves to parsed JSON. |
| Maps 401 to auth error | handleResponse | `ok=false`, `status=401` | Rejects `Error('Session expired. Please log in again.')`. |
| Maps 403 to forbidden error | handleResponse | `ok=false`, `status=403` | Rejects `Error('You do not have permission to perform this action.')`. |
| Maps 404 to not found | handleResponse | `ok=false`, `status=404` | Rejects `Error('Resource not found.')`. |
| Maps 409 to conflict | handleResponse | `ok=false`, `status=409`, body `{ error:'E' }` | Rejects `Error('E')`. |
| Maps 410 to expired | handleResponse | `ok=false`, `status=410` | Rejects `Error('This resource has expired.')`. |
| getQuote without token sends optional auth if available | getQuote | With token from `getAuthToken()`; no tokenId | Request includes `Authorization` header; returns normalized quote fields. |
| getQuote with discount token requires auth | getQuote | No auth token but `tokenId='tk1'` | Rejects `Error('Authentication required to use discount token')`. |
| createRide requires auth | createRide | No auth token | Rejects `Error('Authentication required')`. |
| createRide adds tokenId when present | createRide | tokenId='tk1' | Request body includes `tokenId:'tk1'`. |
| createRide transforms monetary and driver fields | createRide | Server returns `{fareAmount, discountedAmount, driver{...}}` | Result: `baseFare=fareAmount/100`, `finalFare` uses discountedAmount if present, `driver.location` mapped to `{lng}`. |
| getRide requires auth | getRide | No auth token | Rejects `Error('Authentication required')`. |
| getRide transforms destination key | getRide | Server returns `{ destination:{lat,lon} }` | Result `dropoff:{lat,lng}`. |
| cancelRide requires auth | cancelRide | No auth token | Rejects `Error('Authentication required')`. |
| completeRide requires auth | completeRide | No auth token | Rejects `Error('Authentication required')`. |

Coverage notes: The above tests exercise all exported methods and all error branches in `handleResponse`, along with key transformation helpers through observable behavior. This should achieve ≥80% statement/branch/function coverage for the module.

---

## General Testing Notes

- Mock `global.fetch` to control responses and assert request shapes.
- Mock `getAuthToken` to simulate authenticated/unauthenticated flows.
- Use fixed `Date.now` or inject timestamps to assert time-based fields deterministically.
- Validate numeric transforms precisely (e.g., cents→dollars), allowing for floating-point rounding where appropriate.
- For convenience wrapper methods (`recordStart`, `recordQuartile`, `recordComplete`), use spies on `recordPlayback` to assert correct delegation.

