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
If you want to hit the deployed backend instead, set:
```env
VITE_API_BASE_URL=https://97lrpz7c1e.execute-api.us-east-2.amazonaws.com/prod
```
and run `npm run dev` in `frontend` (no local backend needed).

---

## 🧪 Testing

### Unit Tests (Jest)

- Backend
  - Run: `cd backend && npm test`
  - Watch: `cd backend && npm run test:watch`
  - Coverage (local, optional): `cd backend && npm run test:ci`

- Frontend
  - Run: `cd frontend && npm test`
  - Watch: `cd frontend && npm run test:watch`
  - Coverage (local, optional): `cd frontend && npm run test:ci`

Notes
- Jest is configured with SWC; no Babel/ts-jest required.
- Frontend tests default to the Node environment for fast, logic-focused tests. Use `/** @jest-environment jsdom */` at the top of a test file if you need a DOM.
- Coverage runs in CI by default; local runs skip coverage for speed. Coverage reports are ignored in git.

#### Run Tests Only (Fresh Clone)

If you just cloned the repo and only want to run unit tests (no app startup):

- Requirements
  - Node.js 20.x (recommended)
  - npm (bundled with Node)

- Frontend tests
  1. `cd frontend`
  2. `npm install`
     - Installs test tooling: Jest, @swc/jest, @swc/core, identity-obj-proxy, ESLint
     - No Babel needed; SWC handles JS/JSX
  3. `npm test`
     - Runs ESLint first (via `pretest`), then Jest
  4. (Optional) `npm run test:ci` for coverage output

- Backend tests
  1. `cd backend`
  2. `npm install`
     - Installs test tooling: Jest, @swc/jest, @swc/core, TypeScript, @types/jest
  3. (Optional, only if you see Prisma type errors) `npm run prisma:gen`
     - Generates `@prisma/client` for any code paths that import it
  4. `npm test`
     - Compiles TypeScript (via `pretest`) and runs Jest
  5. (Optional) `npm run test:ci` for coverage output

Notes
- Tests do not require the backend server to be running—HTTP calls are mocked.
- If you need to point tests at a custom backend URL, set `VITE_API_BASE_URL` in the environment when running tests (defaults to `http://localhost:3000`).
- No global installs are needed; all tooling is pulled from local `devDependencies`.

### Manual Testing Flow

1. Start services: `./start-dev.sh`
2. Open frontend: http://localhost:5173
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
