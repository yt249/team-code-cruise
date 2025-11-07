# CodeCruise - Ride Sharing Application

A full-stack ride-sharing application with React frontend and Node.js/TypeScript backend featuring authentication, real-time ride booking, advertisement-based discounts, and payment processing.

---

## 🚀 Quick Start

### Automated Startup (Recommended)

Start both frontend and backend with one command:

```bash
./start-dev.sh
```

This will:
- ✅ Start backend on **http://localhost:3000**
- ✅ Start frontend on **http://localhost:5173**
- ✅ Log all activity to `logs/` directory
- ✅ Show live backend logs in terminal

**Login Credentials:**
- Email: `rider@example.com`
- Password: `ride1234`

For more options, see [START_GUIDE.md](START_GUIDE.md)

---

## 📁 Project Structure

```
team-code-cruise/
├── frontend/              # React application (Vite)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── context/       # State management (Auth, Booking, Ad)
│   │   ├── services/      # API integration
│   │   └── App.jsx
│   ├── .env.development   # Frontend config
│   └── package.json
│
├── backend/               # Node.js/TypeScript API
│   ├── src/
│   │   ├── web/          # API controllers
│   │   ├── core/         # Business logic
│   │   ├── ad/           # Advertisement services
│   │   ├── repo/         # Data repositories
│   │   ├── shared/       # Shared utilities
│   │   └── workbench/    # Dev utilities (memory DB)
│   ├── .env              # Backend config
│   └── package.json
│
├── database/             # Database schema
│   └── prisma/
│       └── schema.prisma
│
├── docs/                 # Documentation & specs
├── logs/                 # Development logs
│
├── start-dev.sh          # Startup script with logging
├── start-dev-simple.sh   # Simple startup script
├── START_GUIDE.md        # Detailed startup guide
├── INTEGRATION_README.md # API integration guide
└── INTEGRATION_COMPLETE.md # Integration details
```

---

## ✨ Features

### ✅ Implemented

1. **Authentication**
   - JWT-based login system
   - Session persistence
   - Auto-login on app reload

2. **Ride Booking**
   - Real-time fare quotes
   - Automatic driver assignment
   - Ride tracking and management
   - Payment processing

3. **Advertisement Discounts**
   - Ad eligibility checking
   - Video ad playback tracking
   - 10-15% discount tokens
   - Cooldown and daily limits

4. **Payment Processing**
   - Payment intent creation
   - Multiple payment methods
   - Transaction confirmation

### 🚧 In Progress

- UI component updates for new API structure
- End-to-end testing
- Error state handling polish

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **React Context API** - State management
- **CSS** - Styling

### Backend
- **Node.js** - Runtime
- **TypeScript** - Language
- **Express** - Web framework
- **Prisma** - ORM
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Database
- **PostgreSQL** (production)
- **In-Memory DB** (development)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [START_GUIDE.md](START_GUIDE.md) | How to run the development environment |
| [INTEGRATION_README.md](INTEGRATION_README.md) | API endpoints and integration guide |
| [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md) | Complete integration details and examples |
| [CLAUDE.md](CLAUDE.md) | Project overview and guidelines for AI assistance |

---

## 🔧 Development

### Prerequisites

- Node.js 16+
- pnpm (for backend)
- npm (for frontend)

### Installation

**Backend:**
```bash
cd backend
pnpm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Running Services

**Option 1 - Automated (Recommended):**
```bash
./start-dev.sh
```

**Option 2 - Manual:**
```bash
# Terminal 1 - Backend
cd backend
pnpm run dev:memory

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Environment Configuration

**Backend (.env):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/rb
JWT_SECRET=dev-secret-1234
RB_DATA_MODE=memory   # Use memory mode for development
PORT=3000
```

**Frontend (.env.development):**
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🧪 Testing

### Backend Unit Tests (Manual)

Run the backend test suite locally using Jest. These tests cover ride lifecycle logic, discount flows, and helper utilities.

#### Prerequisites

- **Node.js v20** (matches CI); install from [nodejs.org](https://nodejs.org)
- **npm 10+** (bundled with Node 20)
- **Prisma CLI** (installed automatically via `npm install`)

> The backend uses Jest, ts-jest, Prisma Client, and in-memory data stores. No PostgreSQL instance is required for tests.

#### Setup

```bash
cd backend
npm install        # installs dependencies listed in backend/package.json
npm run prisma:gen # generates @prisma/client types used in tests
```

- `npm install` fetches runtime libs (Express, Prisma) and dev tooling (Jest, ts-jest).
- `npm run prisma:gen` ensures `@prisma/client` enums (e.g., `RideStatus`) exist before running tests.

#### Running Tests

```bash
cd backend
npm test           # runs Jest with RB_DATA_MODE=memory, JWT_SECRET=test-secret
```

The backend `test` script automatically sets the required environment variables:

- `RB_DATA_MODE=memory` – use the in-memory store instead of PostgreSQL
- `JWT_SECRET=test-secret` – satisfies JWT validation during tests
- `TMPDIR=./.tmp` – ensures Jest can create temporary files inside the repo

To view per-test output or coverage:

```bash
# Verbose mode (prints every test)
npm test -- --verbose

# Coverage report
npm test -- --coverage
```

The Jest suite lives in `backend/tests/rideService.spec.ts` and `backend/tests/discountService.spec.ts`. Coverage reports are written to `backend/coverage/`.

3. Login with `rider@example.com` / `ride1234`
4. Test ride booking:
   - Enter pickup coordinates: `{ lat: 37.7749, lng: -122.4194 }`
   - Enter dropoff coordinates: `{ lat: 37.7849, lng: -122.4094 }`
   - Get quote → Request ride → Complete ride → Pay
5. Test ad flow:
   - Check eligibility → Watch ad → Get discount → Use in booking

### Viewing Logs

**Live backend activity:**
```bash
tail -f logs/backend-*.log
```

**Search for errors:**
```bash
grep -i error logs/backend-*.log
```

**View all API requests:**
```bash
grep "POST\|GET" logs/backend-*.log
```

---

## 📊 API Endpoints

### Authentication
- `POST /login` - User login
- `GET /me` - Get current user

### Quotes & Rides
- `POST /quotes` - Get fare quote
- `POST /rides` - Create ride (auto-assigns driver)
- `GET /rides/:id` - Get ride details
- `POST /rides/:id/complete` - Complete ride
- `POST /rides/:id/cancel` - Cancel ride

### Advertisements
- `GET /ads/eligibility` - Check eligibility
- `POST /ads/sessions` - Create ad session
- `POST /ads/playback` - Track playback
- `POST /ads/complete` - Complete ad, get token

### Payments
- `POST /payments/intents` - Create payment intent
- `POST /payments/confirm` - Confirm payment

Full API documentation: [INTEGRATION_README.md](INTEGRATION_README.md)

---

## 🗄️ Database

### Development (Memory Mode)

Backend runs with in-memory database:
```bash
pnpm run dev:memory
```

**Pre-seeded data:**
- 1 Rider: rider@example.com / ride1234
- 5 Drivers: John Smith, Maria Garcia, David Chen, Sarah Johnson, Michael Brown

### Production (PostgreSQL)

1. Set up PostgreSQL with PostGIS
2. Remove `RB_DATA_MODE=memory` from `.env`
3. Run migrations:
   ```bash
   cd backend
   pnpm run prisma:migrate
   ```

---

## 🚢 Deployment

### Backend

1. Update environment variables
2. Build: `pnpm run build`
3. Deploy to cloud platform (AWS, Heroku, Railway)

### Frontend

1. Update `VITE_API_BASE_URL` to production backend
2. Build: `npm run build`
3. Deploy to Vercel, Netlify, or Cloudflare Pages

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3000 is available: `lsof -i :3000`
- Verify `.env` file exists
- Check logs: `cat logs/backend-*.log`

### Frontend can't connect
- Verify backend is running: `curl http://localhost:3000/login`
- Check `frontend/.env.development`
- Clear browser cache and localStorage

### Login fails
- Ensure backend is in memory mode: `RB_DATA_MODE=memory`
- Use correct credentials: rider@example.com / ride1234

See [START_GUIDE.md](START_GUIDE.md) for more troubleshooting.

---

## 📝 Development Status

**Integration: 95% Complete**

✅ Authentication
✅ Ride Booking
✅ Advertisement Discounts
✅ Payment Processing
✅ Backend Seeding (5 drivers)
🚧 UI Component Updates
🚧 End-to-End Testing

---

## 🤝 Contributing

This is a course project. For development guidelines, see [CLAUDE.md](CLAUDE.md).

---

## 📄 License

Educational project for CMU AI Tools course.

---

## 🔗 Quick Links

- [Startup Guide](START_GUIDE.md)
- [API Integration Guide](INTEGRATION_README.md)
- [Integration Details](INTEGRATION_COMPLETE.md)
- [Project Guidelines](CLAUDE.md)
