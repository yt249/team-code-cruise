#!/bin/bash

# Start Development Environment
# Runs both frontend and backend with full logging

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log file paths
BACKEND_LOG="logs/backend-$(date +%Y%m%d-%H%M%S).log"
FRONTEND_LOG="logs/frontend-$(date +%Y%m%d-%H%M%S).log"

# Create logs directory if it doesn't exist
mkdir -p logs

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"

  # Kill all child processes
  if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${RED}Stopping backend (PID: $BACKEND_PID)${NC}"
    kill $BACKEND_PID 2>/dev/null || true
  fi

  if [ ! -z "$FRONTEND_PID" ]; then
    echo -e "${RED}Stopping frontend (PID: $FRONTEND_PID)${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
  fi

  echo -e "${GREEN}Shutdown complete${NC}"
  exit 0
}

# Set up trap to catch Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Print header
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════╗"
echo "║     CodeCruise Development Environment             ║"
echo "║     Frontend + Backend + Logging                   ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}Error: pnpm is not installed${NC}"
  echo "Install with: npm install -g pnpm"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Dependencies OK${NC}\n"

# Start Backend
echo -e "${MAGENTA}Starting Backend...${NC}"
echo -e "${CYAN}Backend logs: $BACKEND_LOG${NC}"

cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing backend dependencies...${NC}"
  pnpm install
fi

# Start backend in background with logging
pnpm run dev:memory > "../$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${CYAN}  URL: http://localhost:3000${NC}\n"

cd ..

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:3000/login > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is ready!${NC}\n"
    break
  fi

  if [ $i -eq 30 ]; then
    echo -e "${RED}Error: Backend failed to start${NC}"
    echo -e "${YELLOW}Check logs: $BACKEND_LOG${NC}"
    cleanup
  fi

  sleep 1
done

# Start Frontend
echo -e "${MAGENTA}Starting Frontend...${NC}"
echo -e "${CYAN}Frontend logs: $FRONTEND_LOG${NC}"

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing frontend dependencies...${NC}"
  npm install
fi

# Start frontend in background with logging
npm run dev > "../$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${CYAN}  URL: http://localhost:5173${NC}\n"

cd ..

# Print status
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════╗"
echo "║              🚀 Services Running                   ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║  Backend:  http://localhost:3000                   ║"
echo "║  Frontend: http://localhost:5173                   ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║  Backend Log:  $BACKEND_LOG"
echo "║  Frontend Log: $FRONTEND_LOG"
echo "╠════════════════════════════════════════════════════╣"
echo "║  Press Ctrl+C to stop all services                 ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Show live backend logs
echo -e "${CYAN}Showing live backend activity...${NC}"
echo -e "${YELLOW}(Frontend logs are in $FRONTEND_LOG)${NC}\n"

# Tail backend logs
tail -f "$BACKEND_LOG" &
TAIL_PID=$!

# Wait for user interrupt
wait $TAIL_PID
