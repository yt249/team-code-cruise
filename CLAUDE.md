# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**team-code-cruise** is a frontend-only ride-sharing application built with React. The project uses mock data to simulate backend behavior and focuses on implementing two core user stories with realistic UI interactions.

## Scope

- **Frontend Only**: React application with no backend implementation
- **Mock Data**: All backend behavior simulated with mock data and functions
- **User Stories Implemented**: User Story #1 (Core Ride Booking) and User Story #3 (Advertisement Discount)
- **User Story #2 Discarded**: Price trends analytics feature is NOT included

## Project Structure

Planned structure for the React application:

```
team-code-cruise/
├── src/
│   ├── components/
│   │   ├── booking/          # User Story #1: Booking components
│   │   │   ├── BookingUI.jsx
│   │   │   ├── DriverTrackingUI.jsx
│   │   │   └── PaymentUI.jsx
│   │   └── ad/               # User Story #3: Ad discount components
│   │       └── AdDiscountUI.jsx
│   ├── services/             # Mock services (simulated backend)
│   │   ├── mockBookingService.js
│   │   ├── mockAdService.js
│   │   ├── mockGeocodingService.js
│   │   └── mockDriverService.js
│   ├── data/                 # Mock data files
│   │   ├── mockDrivers.js
│   │   ├── mockAds.js
│   │   └── mockRoutes.js
│   ├── utils/                # Utility functions
│   ├── context/              # React Context for state management
│   └── App.jsx               # Main app component
├── docs/                     # Documentation and specs
│   ├── UI-mockups-screenshots/
│   ├── user-story-1/
│   └── user-story-3/
└── CLAUDE.md                 # This file
```

## User Stories

### User Story #1: Core Ride Booking (Label Prefix: RB)

**Feature**: Rider-side booking experience

**Key Components**:
- `BookingUI` (RB1.1) - Pickup/destination entry, fare quotes, ride request
- `DriverTrackingUI` (RB1.2) - Live driver tracking simulation, ETA display
- `PaymentUI` (RB1.3) - Payment method selection, receipts
- `SessionManager` (RB1.4) - Session state management

**Mock Services Needed**:
- Mock geocoding (convert "here" and "there" to coordinates)
- Mock fare calculation (base fare + distance + surge)
- Mock driver dispatch (simulated matching)
- Mock real-time location updates (simulate driver movement)
- Mock payment processing

**UI Flow** (see `docs/UI-mockups-screenshots/`):
1. **Initial status** - Enter pickup ("here") and destination ("there")
2. **Request ride** - Show fare quote, "Request Ride" button
3. **Finding driver** - Loading state with cancel option
4. **Driver on the way** - Map with route, driver location, ETA
5. **Trip completion** - Arrive at destination

**State Machine**:
- **Booking**: Idle → QuoteOnly → Requested → DriverAssigned → Cancelled/Completed
- **Trip**: DriverEnRoute → ArrivedAtPickup → InTrip → Completed

**Data Structures**:
```javascript
Booking: {
  id: UUID,
  rider_id: UUID,
  pickup: { lat, lng, address },
  dropoff: { lat, lng, address },
  quote_id: UUID,
  status: 'Quoted' | 'Requested' | 'Assigned' | 'Completed',
  created_at: Timestamp
}

Trip: {
  id: UUID,
  booking_id: UUID,
  driver_id: UUID,
  driver: { name, rating, vehicle, phone },
  state: 'DriverEnRoute' | 'Arrived' | 'InTrip' | 'Completed',
  start_time: Timestamp,
  end_time: Timestamp
}
```

### User Story #3: Advertisement Discount (Label Prefix: AD)

**Feature**: Optional ad viewing for ride discount (10-15%)

**Key Components**:
- `AdDiscountUI` (SA1.1) - Ad offer modal, video player, discount application
- Mock `AdService` (SA2.1) - Ad session management, verification
- Mock `DiscountPolicy` (SA2.3) - Calculate discount percentage

**Integration with User Story #1**:
- Ad offer appears AFTER fare quote but BEFORE ride request
- User can choose to watch ad or skip
- If ad completed → apply discount to fare
- If skipped → proceed with original fare

**UI Flow** (see `docs/UI-mockups-screenshots/ad discount offer.png`):
1. User sees fare quote
2. Optional modal appears: "Save on your ride! Watch a 30-second ad to reduce your fare by $4.50"
3. User choices:
   - "Watch Ad" → Play 30-60 second video
   - "Skip" → Continue with original fare
4. If ad completed → Show updated fare with discount
5. Proceed to booking

**State Machine**:
- **AdSession**: Idle → Offered → Playing → Completed/Skipped/Expired
- **Booking**: QuoteOnly → DiscountApplied → Booked (or skip discount)

**Data Structures**:
```javascript
AdSession: {
  id: UUID,
  rider_id: UUID,
  status: 'Idle' | 'Offered' | 'Playing' | 'Completed' | 'Skipped' | 'Expired',
  discount_pct: number | null,  // 10-15%
  ad_token: string,
  completed_at: Timestamp | null,
  ttl_sec: number  // Time-to-live for session
}

Discount: {
  session_id: UUID,
  booking_id: UUID,
  percentage: number,  // 10-15
  amount: number,      // Dollar amount saved
  applied_at: Timestamp
}
```

**Mock Ad Requirements**:
- Simulate 30-60 second video playback
- Track playback events (play, pause, complete, skip)
- Verify completion before issuing discount
- Handle edge cases: user closes app, timer expires, network interruption

## Technology Stack

### Core Technologies
- **React 18+** - Frontend framework
- **JavaScript or TypeScript** - Primary language (choose one)
- **CSS Modules or Styled Components** - Component styling
- **React Router** - Navigation (if needed for multiple views)

### Recommended Libraries
- **Leaflet** or **React-Leaflet** - For map display (or use static map images)
- **React Player** - For ad video playback (User Story #3)
- **date-fns** or **dayjs** - Date manipulation
- **uuid** - Generate unique IDs
- **Recharts** or **Chart.js** - NOT NEEDED (User Story #2 discarded)

### Development Tools
- **Vite** or **Create React App** - Build tool
- **ESLint + Prettier** - Code quality
- **React DevTools** - Debugging

## Development Workflow

### CRITICAL: Avoiding Concurrency Errors

**To prevent "400 tool use concurrency issues"**:
- Do NOT call multiple tools in parallel if one depends on another's output
- Do NOT try to read/write the same file concurrently
- Run independent operations in parallel, but sequential operations must wait
- When in doubt, run operations sequentially

### Task-Based Development

**IMPORTANT**: Break work into small, discussable tasks:
1. Use TodoWrite tool to track all tasks and subtasks
2. Discuss approach before implementing large changes
3. Complete one component at a time
4. Test with mock data before moving forward
5. Always wait for user confirmation before proceeding to next major task

### Recommended Development Sequence

1. **Setup Phase**:
   - Initialize React project (Vite recommended)
   - Set up project structure
   - Create basic routing if needed
   - Set up state management (React Context)

2. **User Story #1 - Core Booking** (implement first):
   - Create BookingUI component (pickup/destination inputs)
   - Add mock geocoding service
   - Implement fare quote calculation
   - Add "Request Ride" button and flow
   - Create DriverTrackingUI with simulated driver location
   - Implement booking state machine
   - Add mock payment flow
   - Create PaymentUI component

3. **User Story #3 - Ad Discount** (implement second, integrates with #1):
   - Create AdDiscountUI component
   - Implement ad offer modal (appears after fare quote)
   - Add mock video player with playback controls
   - Create ad session state management
   - Implement discount calculation logic
   - Integrate with booking flow (apply discount to fare)
   - Handle edge cases (skip, expire, complete)

## Mock Data Guidelines

### Realistic Mock Data

**For User Story #1**:
- At least 5-10 mock drivers with names, ratings, vehicles
- Mock routes with realistic distances and times
- Surge pricing simulation (higher prices during "rush hours")
- Base fare: $10, per-mile rate: $2.50

**For User Story #3**:
- Mock ad videos (can use placeholder URLs or timer simulation)
- Ad metadata: duration (30-60s), advertiser, discount percentage
- Generate 3-5 different mock ads to rotate

### Mock Service Behavior

- Add realistic delays (setTimeout) to simulate network requests (500-1500ms)
- Include loading states for all async operations
- Simulate occasional errors (5% failure rate) for testing error handling
- Make mock data deterministic for easier testing

### Example Mock Service Pattern

```javascript
// Mock ad service with simulated delay
export const mockAdService = {
  async startAdSession(riderId) {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      id: generateUUID(),
      rider_id: riderId,
      status: 'Offered',
      ad_token: 'mock_ad_token_' + Date.now(),
      discount_pct: Math.floor(Math.random() * 6) + 10, // 10-15%
      ttl_sec: 300 // 5 minutes
    };
  },

  async recordAdEvent(sessionId, event) {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`Ad event: ${event} for session ${sessionId}`);
  },

  async finalizeDiscount(sessionId) {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock verification
    return {
      percentage: 12,
      amount: 4.50,
      expiresAt: Date.now() + 600000 // 10 minutes
    };
  }
};
```

## State Management

For a frontend-only app:
- **React Context + Hooks** - Recommended for this project
- Create separate contexts for:
  - `BookingContext` - Booking and trip state
  - `AdContext` - Ad session and discount state
  - `UserContext` - Mock user session

Example structure:
```javascript
// BookingContext
const BookingContext = createContext();

export function BookingProvider({ children }) {
  const [booking, setBooking] = useState(null);
  const [trip, setTrip] = useState(null);
  const [driver, setDriver] = useState(null);

  // Methods to update state
  const createBooking = async (pickup, dropoff) => { /* ... */ };
  const requestRide = async (bookingId) => { /* ... */ };

  return (
    <BookingContext.Provider value={{
      booking, trip, driver,
      createBooking, requestRide
    }}>
      {children}
    </BookingContext.Provider>
  );
}
```

## UI Mockups Reference

All UI mockups are in `docs/UI-mockups-screenshots/`:
- `Initial status.png` - Starting state with pickup/destination
- `finding driver.png` - Loading/searching state
- `driver on the way.png` - Active ride tracking with map
- `ad discount offer.png` - **USER STORY #3** - Ad offer modal
- `arrive with ad discount.png` - **USER STORY #3** - Completion with discount
- `error page.png` - Error handling

**Match these designs as closely as possible.**

## Development Specifications

### User Story #1 Spec
- Full documentation: `docs/user-story-1/User Story #1 Dev Spec.pdf`
- Focus on frontend components and mock services only
- Ignore backend architecture details (BookingService, DispatchService are mocked)

### User Story #3 Spec
- Full documentation: `docs/user-story-3/User Story #3 Dev Spec.pdf`
- Implement AdDiscountUI component
- **Key requirement**: Ad must be optional and not block booking
- Integrate with booking flow from User Story #1

### User Story #2 - DISCARDED
- `docs/user-story-2/` contains analytics/price trends spec
- **DO NOT IMPLEMENT** - This feature is out of scope

## Running the Project

Once set up, typical commands will be:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Key Considerations

### No Backend
- Everything runs in the browser
- All data is mock/simulated
- No actual API calls
- No real database
- No real ad network integration

### Focus Areas
1. **UI/UX**: Match the mockup designs closely
2. **State Management**: Handle booking, trip, and ad session states correctly
3. **Mock Realism**: Make simulated behavior feel realistic
4. **Integration**: User Story #3 must integrate smoothly with User Story #1
5. **Code Quality**: Clean, maintainable React code

### Out of Scope
- Real backend services
- Actual payment processing
- Real geolocation/mapping APIs (use mocks or static data)
- User authentication (simulate with mock session)
- Database integration
- Real-time WebSocket connections (simulate with setInterval)
- Real ad network integration (mock video playback)
- **User Story #2** (Price trends analytics)

## Working with Claude Code

When implementing features:
1. **Read the relevant dev spec section first** from PDFs in docs/
2. **Create a task list using TodoWrite** before starting work
3. **Implement User Story #1 completely first**, then User Story #3
4. **Start with mock data** - create realistic mock data files first
5. **Test each piece** before moving to the next
6. **Be mindful of concurrency** - avoid parallel tool calls with dependencies
7. **Ask before making large architectural decisions**
8. **Discuss integration points** between User Story #1 and #3

## Code Style Guidelines

- Use functional components with hooks (no class components)
- Keep components small and focused (under 300 lines)
- Extract reusable logic into custom hooks
- Use prop-types or TypeScript for type checking
- Add JSDoc comments for complex functions
- Follow consistent naming conventions (camelCase for functions/variables)

## Testing Approach

For this mock app:
- Manual testing is primary approach
- Focus on visual testing against UI mockups
- Test all state transitions:
  - Booking lifecycle states
  - Trip lifecycle states
  - Ad session states
- Verify ad discount integration with booking flow
- Test edge cases (skip ad, ad timeout, cancel booking)

## Current Status

**Project Phase**: Initialization - No code written yet

**Next Steps**:
1. Choose React setup (Vite recommended)
2. Create project structure
3. Set up React Context for state management
4. Create mock data files
5. Implement User Story #1 components (booking flow)
6. Implement User Story #3 components (ad discount)
7. Integrate User Story #3 with User Story #1

## Integration Notes: User Story #1 + User Story #3

**Critical Integration Points**:

1. **After Fare Quote, Before Ride Request**:
   - BookingUI shows fare quote
   - AdDiscountUI modal appears (if eligible)
   - User watches ad OR skips
   - Fare updates with discount OR stays the same
   - User confirms and requests ride

2. **State Flow**:
   ```
   Idle → Get Quote → [Ad Offer] → Apply Discount? → Request Ride → Track Driver
   ```

3. **Shared State**:
   - Booking context needs to know about active ad session
   - Ad context needs to update booking fare when discount applied

4. **UI Considerations**:
   - Ad modal should not block user from skipping
   - Clear visual indication of discount applied
   - Show original fare and discounted fare side-by-side

## References

- UI Mockups: `docs/UI-mockups-screenshots/`
- User Story #1 Spec: `docs/user-story-1/User Story #1 Dev Spec.pdf`
- User Story #3 Spec: `docs/user-story-3/User Story #3 Dev Spec.pdf`
- ~~User Story #2 Spec~~: DISCARDED - Do not implement
- Main branch: `main`
