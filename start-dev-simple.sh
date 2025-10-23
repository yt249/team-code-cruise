#!/bin/bash

# Simple Development Startup
# Runs both services with interleaved output (no separate log files)

set -e

echo "🚀 Starting CodeCruise Development Environment..."
echo ""

# Function to handle cleanup
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill 0
  exit
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "📦 Starting Backend (http://localhost:3000)..."
cd backend
pnpm install > /dev/null 2>&1 || echo "Backend dependencies already installed"
pnpm run dev:memory 2>&1 | sed 's/^/[BACKEND] /' &

cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "⚛️  Starting Frontend (http://localhost:5173)..."
cd frontend
npm install > /dev/null 2>&1 || echo "Frontend dependencies already installed"
npm run dev 2>&1 | sed 's/^/[FRONTEND] /' &

cd ..

echo ""
echo "✅ Services started!"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "   Login: rider@example.com / ride1234"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
wait
