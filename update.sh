#!/bin/bash

# CyberLens Update Script
# This script pulls the latest version from GitHub and rebuilds the application

# Configuration
CYBERLENS_DIR="/home/orangepi/cyberlens"
LOG_FILE="/home/orangepi/cyberlens/update.log"
GITHUB_REPO="https://github.com/yourusername/cyberlens.git"
BRANCH="main"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create log file if it doesn't exist
touch "$LOG_FILE"
log "Starting CyberLens update process..."

# Navigate to app directory
cd "$CYBERLENS_DIR" || {
  log "ERROR: Could not navigate to $CYBERLENS_DIR"
  exit 1
}

# Check if it's a git repository
if [ ! -d ".git" ]; then
  log "Not a git repository. Initializing..."
  git init
  git remote add origin "$GITHUB_REPO"
  log "Git repository initialized"
fi

# Save current version before update
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' src/config.ts | cut -d'"' -f4)
log "Current version: $CURRENT_VERSION"

# Pull latest changes
log "Pulling latest changes from $BRANCH branch..."
git fetch origin "$BRANCH"
git reset --hard origin/"$BRANCH"
log "Latest changes pulled successfully"

# Check if version changed
NEW_VERSION=$(grep -o '"version": "[^"]*"' src/config.ts | cut -d'"' -f4)
log "New version: $NEW_VERSION"

if [ "$CURRENT_VERSION" == "$NEW_VERSION" ]; then
  log "No version change detected. Skipping rebuild."
  exit 0
fi

# Install dependencies
log "Installing dependencies..."
npm install
log "Dependencies installed"

# Build the application
log "Building the application..."
npm run build
BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
  log "Build completed successfully"
  
  # Update last update timestamp
  TIMESTAMP=$(date +%s)
  echo "$TIMESTAMP" > last_update.txt
  
  log "Update completed successfully. New version: $NEW_VERSION"
  exit 0
else
  log "ERROR: Build failed with exit code $BUILD_RESULT"
  exit 1
fi 