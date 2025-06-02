#!/bin/bash

# CyberLens Kiosk Mode Launcher
# This script sets up and runs CyberLens in kiosk mode on Orange Pi

# Configuration
CYBERLENS_DIR="/home/orangepi/cyberlens"
LOG_FILE="/home/orangepi/cyberlens/kiosk.log"
PORT=3000

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create log file if it doesn't exist
touch "$LOG_FILE"
log "Starting CyberLens Kiosk Mode..."

# Kill any existing Chrome instances
pkill -f chromium
log "Killed existing Chromium instances"

# Kill any existing server instances
pkill -f "serve -s build"
log "Killed existing server instances"

# Navigate to app directory
cd "$CYBERLENS_DIR" || {
  log "ERROR: Could not navigate to $CYBERLENS_DIR"
  exit 1
}

# Check for updates (optional)
if [ -f "update.sh" ]; then
  log "Checking for updates..."
  bash update.sh
  log "Update check completed"
fi

# Make sure build exists
if [ ! -d "build" ]; then
  log "ERROR: Build directory not found!"
  exit 1
fi

# Start the server
log "Starting server on port $PORT..."
npx serve -s build -l $PORT &
SERVER_PID=$!
log "Server started with PID: $SERVER_PID"

# Wait for server to start
sleep 5

# Start Chromium in kiosk mode
log "Starting Chromium in kiosk mode..."
DISPLAY=:0 chromium-browser --kiosk --disable-restore-session-state --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI --app=http://localhost:$PORT &
CHROMIUM_PID=$!
log "Chromium started with PID: $CHROMIUM_PID"

# Keep script running
log "Kiosk mode running. Press Ctrl+C to exit."
wait $CHROMIUM_PID
log "Chromium exited."

# Clean up
kill $SERVER_PID
log "Server stopped."
log "Kiosk mode exited."
exit 0 