# Running CodeCruise Locally

## ✅ Yes, You Can Run Locally!

The project supports both **local development** and **AWS Lambda** deployment.

---

## 🚀 Quick Start (Recommended)

### Option 1: Use the Start Script
```bash
./start-dev.sh
```

This automatically starts:
- **Backend** on `http://localhost:3000` (port 3000)
- **Frontend** on `http://localhost:5173` (port 5173)
- Logs to `logs/` directory

**Login:**
- Email: `rider@example.com`
- Password: `ride1234`

---

## 🔧 Manual Start (Step by Step)

### 1. Start Backend

**Terminal 1:**
```bash
cd backend
npm install              # First time only
npm run dev:memory       # Uses in-memory database
```

**Backend will start on:** `http://localhost:3000`

**What it includes:**
- All API endpoints (/login, /quotes, /rides, /ads, etc.)
- In-memory database with pre-seeded data:
  - 1 rider: `rider@example.com` / `ride1234`
  - 5 drivers with vehicles in Pittsburgh
- Driver locations automatically initialized
- Ad cooldown: 15 seconds

---

### 2. Start Frontend

**Terminal 2:**
```bash
cd frontend
npm install              # First time only
npm run dev              # Starts Vite dev server
```

**Frontend will start on:** `http://localhost:5173`

---

## 🔄 Switching Between Local and AWS

### Point Frontend to Local Backend

Edit `frontend/.env.development`:
```env
VITE_API_BASE_URL=http://localhost:3000
```

Then restart frontend:
```bash
cd frontend
npm run dev
```

### Point Frontend to AWS Backend

Edit `frontend/.env.development`:
```env
VITE_API_BASE_URL=https://97lrpz7c1e.execute-api.us-east-2.amazonaws.com/prod
```

---

## 📊 Local vs AWS Comparison

| Feature | Local | AWS Lambda |
|---------|-------|------------|
| Backend | Express server | Lambda functions |
| Database | In-memory | PostgreSQL RDS |
| Driver locations | Auto-initialized | Auto-initialized on cold start |
| Ad cooldown | 15 seconds | 15 seconds |
| Auto-reset on login | ❌ Not needed (memory resets on restart) | ✅ Yes (via endpoint) |
| Data persistence | ❌ Resets on restart | ✅ Persistent |
| Startup time | Fast | Cold start (~2-3s) |

---

## 🧪 Testing Locally

### Full Local Setup (Recommended for Development)

1. **Start both services:**
   ```bash
   ./start-dev.sh
   ```

2. **Open browser:** `http://localhost:5173`

3. **Login:** `rider@example.com` / `ride1234`

4. **Test features:**
   - ✅ Fare quotes
   - ✅ Ride booking (5 drivers available)
   - ✅ Ad discounts (15s cooldown)
   - ✅ Driver tracking
   - ✅ Trip completion

5. **Reset data:** Just restart the backend (Ctrl+C, then `npm run dev:memory`)

---

## 🛠 Local Development Commands

### Backend

```bash
cd backend

# Development with in-memory database
npm run dev:memory

# Development with PostgreSQL (requires DATABASE_URL in .env)
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Run built code
npm start
```

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🗄️ Using PostgreSQL Locally (Optional)

If you want to use PostgreSQL instead of in-memory database:

### 1. Set up local PostgreSQL
```bash
# Install PostgreSQL with PostGIS
brew install postgresql postgis  # macOS
# or
apt-get install postgresql postgis  # Linux

# Start PostgreSQL
brew services start postgresql
```

### 2. Create database
```bash
createdb codecruise
psql codecruise -c "CREATE EXTENSION postgis;"
```

### 3. Configure backend
Edit `backend/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/codecruise
# Remove or comment out:
# RB_DATA_MODE=memory
```

### 4. Run migrations
```bash
cd backend
npm run prisma:migrate
```

### 5. Seed data
```bash
node ../seed-drivers.js
```

### 6. Start backend
```bash
npm run dev
```

---

## 🐛 Troubleshooting Local Setup

### Backend won't start
- **Port 3000 in use?** Kill process: `lsof -ti:3000 | xargs kill`
- **Dependencies missing?** Run `npm install` in backend/
- **TypeScript errors?** Run `npm run prisma:gen`

### Frontend won't start
- **Port 5173 in use?** Kill process: `lsof -ti:5173 | xargs kill`
- **Dependencies missing?** Run `npm install` in frontend/
- **Vite cache issues?** Delete `node_modules/.vite` and restart

### API calls failing
- **Check backend is running:** Visit `http://localhost:3000/me` (should return 401)
- **Check `.env.development`:** Should have `VITE_API_BASE_URL=http://localhost:3000`
- **CORS errors?** Make sure backend is on port 3000

### No drivers available
- **Memory mode:** Restart backend to reset drivers
- **PostgreSQL mode:** Run `node seed-drivers.js`

---

## 💡 Tips for Local Development

1. **Use memory mode** for faster iteration (no database setup needed)
2. **Keep both terminals visible** to see logs in real-time
3. **Use the start script** (`./start-dev.sh`) to avoid managing terminals
4. **Restart backend** to reset all test data instantly
5. **Check logs/** directory if using start script

---

## 🌐 Hybrid Setup (Local Frontend + AWS Backend)

You can develop frontend locally while using AWS backend:

```bash
# Frontend .env.development
VITE_API_BASE_URL=https://97lrpz7c1e.execute-api.us-east-2.amazonaws.com/prod
```

```bash
cd frontend
npm run dev
```

**Benefits:**
- Test with real database
- No backend setup needed
- Auto-reset on login works

---

## Current Configuration

**Your setup is currently configured for:**
- Frontend: Local (`localhost:5173`)
- Backend: AWS Lambda (deployed)

**To switch to fully local:**
1. Update `frontend/.env.development` to `http://localhost:3000`
2. Start backend: `cd backend && npm run dev:memory`
3. Restart frontend: `cd frontend && npm run dev`

