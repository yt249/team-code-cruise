# Development Startup Guide

## Quick Start

### Option 1: Automated Startup Script (Recommended)

Use the provided script to start both frontend and backend with logging:

```bash
./start-dev.sh
```

**Features:**
- ✅ Starts backend on http://localhost:3000
- ✅ Starts frontend on http://localhost:5173
- ✅ Logs all backend activity to `logs/backend-YYYYMMDD-HHMMSS.log`
- ✅ Logs frontend activity to `logs/frontend-YYYYMMDD-HHMMSS.log`
- ✅ Shows live backend logs in terminal
- ✅ Auto-installs dependencies if needed
- ✅ Waits for backend to be ready before starting frontend
- ✅ Graceful shutdown with Ctrl+C

**Output:**
```
╔════════════════════════════════════════════════════╗
║     CodeCruise Development Environment             ║
║     Frontend + Backend + Logging                   ║
╚════════════════════════════════════════════════════╝

✓ Backend started (PID: 12345)
  URL: http://localhost:3000

✓ Frontend started (PID: 12346)
  URL: http://localhost:5173

╔════════════════════════════════════════════════════╗
║              🚀 Services Running                   ║
╠════════════════════════════════════════════════════╣
║  Backend:  http://localhost:3000                   ║
║  Frontend: http://localhost:5173                   ║
╠════════════════════════════════════════════════════╣
║  Backend Log:  logs/backend-20251022-143022.log    ║
║  Frontend Log: logs/frontend-20251022-143022.log   ║
╠════════════════════════════════════════════════════╣
║  Press Ctrl+C to stop all services                 ║
╚════════════════════════════════════════════════════╝

Showing live backend activity...
```

---

### Option 2: Manual Startup (Two Terminals)

If you prefer manual control, run these in separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
pnpm install
pnpm run dev:memory | tee ../logs/backend.log
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev | tee ../logs/frontend.log
```

---

## Viewing Logs

### Live Logs

**Backend activity (when using start-dev.sh):**
- Automatically shown in terminal

**Frontend activity:**
```bash
tail -f logs/frontend-*.log
```

**Both logs side-by-side:**
```bash
# Terminal 1
tail -f logs/backend-*.log

# Terminal 2
tail -f logs/frontend-*.log
```

### Historical Logs

All logs are saved in the `logs/` directory with timestamps:

```bash
# List all logs
ls -lh logs/

# View specific log
cat logs/backend-20251022-143022.log

# Search logs
grep "ERROR" logs/backend-*.log
grep "POST /rides" logs/backend-*.log
```

---

## Troubleshooting

### Script won't run (Permission denied)

Make the script executable:
```bash
chmod +x start-dev.sh
```

### Port already in use

**Backend (port 3000):**
```bash
lsof -ti:3000 | xargs kill -9
```

**Frontend (port 5173):**
```bash
lsof -ti:5173 | xargs kill -9
```

### Dependencies not installed

The script auto-installs dependencies, but you can manually run:

```bash
# Backend
cd backend && pnpm install

# Frontend
cd frontend && npm install
```

### Backend won't start

Check the backend log file:
```bash
cat logs/backend-*.log
```

Common issues:
- Missing `.env` file in backend/
- Port 3000 already in use
- Node version incompatibility (requires Node 16+)

### Frontend won't connect to backend

1. Verify backend is running: `curl http://localhost:3000/login`
2. Check `frontend/.env.development` has:
   ```
   VITE_API_BASE_URL=http://localhost:3000
   ```
3. Clear browser cache and localStorage
4. Check frontend logs: `cat logs/frontend-*.log`

---

## Stopping Services

### When using start-dev.sh

Press **Ctrl+C** in the terminal running the script.

The script will gracefully shutdown both services.

### Manual shutdown

If services are stuck:

```bash
# Kill all Node processes (nuclear option)
pkill -f node

# Or kill specific processes
ps aux | grep node
kill <PID>
```

---

## Testing the Integration

Once both services are running:

1. **Open browser:** http://localhost:5173
2. **Login:**
   - Email: `rider@example.com`
   - Password: `ride1234`
3. **Watch backend logs** for authentication activity
4. **Test booking flow:**
   - Enter coordinates (e.g., pickup: `37.7749, -122.4194`)
   - Get quote
   - Request ride
   - Watch logs for driver assignment
5. **Test ad flow:**
   - Check eligibility
   - Start ad session
   - Watch logs for playback tracking

---

## Log Analysis

### Useful log searches

**All API requests:**
```bash
grep "POST\|GET\|PUT\|DELETE" logs/backend-*.log
```

**Authentication:**
```bash
grep "login\|JWT\|auth" logs/backend-*.log
```

**Ride operations:**
```bash
grep "ride\|quote\|driver" logs/backend-*.log
```

**Ad operations:**
```bash
grep "ad\|eligibility\|session" logs/backend-*.log
```

**Errors only:**
```bash
grep -i "error\|fail" logs/backend-*.log
```

**Last 50 lines:**
```bash
tail -n 50 logs/backend-*.log
```

---

## Environment Configuration

### Backend (.env)

Located at `backend/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/rb
JWT_SECRET=dev-secret-1234
RB_DATA_MODE=memory   # Use memory mode for development
PORT=3000
```

### Frontend (.env.development)

Located at `frontend/.env.development`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Production Mode

For production deployment (not memory mode):

1. Set up PostgreSQL database
2. Remove `RB_DATA_MODE=memory` from backend/.env
3. Run migrations: `cd backend && pnpm run prisma:migrate`
4. Build frontend: `cd frontend && npm run build`
5. Deploy to hosting platforms

---

## Quick Reference

| Task | Command |
|------|---------|
| Start both services | `./start-dev.sh` |
| View backend logs | `tail -f logs/backend-*.log` |
| View frontend logs | `tail -f logs/frontend-*.log` |
| Stop all services | Press Ctrl+C |
| Clean logs | `rm logs/*.log` |
| Check if backend is running | `curl http://localhost:3000/login` |
| Check if frontend is running | `curl http://localhost:5173` |

---

## Support

For issues:
1. Check logs in `logs/` directory
2. Review `INTEGRATION_README.md` for API documentation
3. Review `INTEGRATION_COMPLETE.md` for integration details
