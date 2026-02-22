#!/bin/bash

# Kill any existing processes on these ports to prevent "Address already in use" errors
echo "Stopping any existing game servers..."
kill $(lsof -t -i:8000 2>/dev/null) 2>/dev/null || true
kill $(lsof -t -i:5173 2>/dev/null) 2>/dev/null || true

echo "Starting FastAPI Backend Engine in the background..."
# Assuming no venv based on your Python setup, or adjust if you use one
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting React Frontend UI..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================================================"
echo "🏎️  F1 Team Principal Simulator is LIVE! 🏎️"
echo "================================================================"
echo "Dashboard:  http://localhost:5173"
echo "API Server: http://localhost:8000"
echo ""
echo "Press [CTRL+C] to cleanly stop both servers."
echo "================================================================"

# Wait for user to press Ctrl+C, then kill both child processes
trap "echo 'Shutting down game servers...'; kill -term $BACKEND_PID $FRONTEND_PID; exit" INT
wait
