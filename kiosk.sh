#!/bin/bash

# CyberLens Kiosk Mode Launcher
# This script sets up and runs CyberLens in kiosk mode on Orange Pi

# Configuration
CYBERLENS_DIR="/home/orangepi/cyberlens"
LOG_FILE="/home/orangepi/cyberlens/kiosk.log"
PORT=3000

# Security Configuration
SECURE_MODE=true  # Set ke false untuk mode debug
DISABLE_DEV_TOOLS=true  # Nonaktifkan dev tools di browser
DISABLE_CONTEXT_MENU=true  # Nonaktifkan menu klik kanan
RESTRICT_FILE_ACCESS=true  # Batasi akses file di browser
DISABLE_PRINTING=true  # Nonaktifkan printing di browser

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create log file if it doesn't exist
touch "$LOG_FILE"
log "Starting CyberLens Kiosk Mode..."

# Security check function
security_check() {
  log "Performing security checks..."
  
  # Check user permissions
  if [ "$(id -u)" = "0" ]; then
    log "WARNING: Running as root is not recommended. Consider running as regular user."
  fi
  
  # Verify file permissions
  chmod 700 "$CYBERLENS_DIR/update.sh" "$CYBERLENS_DIR/setup-cron.sh" "$CYBERLENS_DIR/kiosk.sh"
  chmod 600 "$CYBERLENS_DIR/.env.local" 2>/dev/null
  
  # Verify build directory integrity
  if [ -d "build" ]; then
    BUILD_FILES_COUNT=$(find build -type f | wc -l)
    if [ "$BUILD_FILES_COUNT" -lt 10 ]; then
      log "WARNING: Build directory seems incomplete. Consider rebuilding the application."
    fi
  fi
  
  log "Security checks completed."
}

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

# Perform security checks
if [ "$SECURE_MODE" = true ]; then
  security_check
fi

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

# Construct Chrome flags based on security settings
CHROME_FLAGS="--kiosk --disable-restore-session-state --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI"

if [ "$DISABLE_DEV_TOOLS" = true ]; then
  CHROME_FLAGS="$CHROME_FLAGS --disable-dev-tools --disable-dev-shm-usage"
fi

if [ "$DISABLE_CONTEXT_MENU" = true ]; then
  CHROME_FLAGS="$CHROME_FLAGS --disable-contextual-search --disable-hang-monitor"
fi

if [ "$RESTRICT_FILE_ACCESS" = true ]; then
  CHROME_FLAGS="$CHROME_FLAGS --disable-file-system"
fi

if [ "$DISABLE_PRINTING" = true ]; then
  CHROME_FLAGS="$CHROME_FLAGS --disable-print-preview"
fi

# Start Chromium in kiosk mode with security flags
log "Starting Chromium in kiosk mode with security flags..."
DISPLAY=:0 chromium-browser $CHROME_FLAGS --app=http://localhost:$PORT &
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