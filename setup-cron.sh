#!/bin/bash

# CyberLens Cron Setup Script
# This script sets up a cron job to automatically check for updates

# Configuration
CYBERLENS_DIR="/home/orangepi/cyberlens"
CRON_SCHEDULE="0 3 * * *"  # Run at 3 AM daily

echo "Setting up CyberLens automatic update cron job..."

# Check if we have the correct directory
if [ ! -d "$CYBERLENS_DIR" ]; then
  echo "ERROR: Directory $CYBERLENS_DIR not found!"
  exit 1
fi

# Check if update script exists
if [ ! -f "$CYBERLENS_DIR/update.sh" ]; then
  echo "ERROR: Update script not found at $CYBERLENS_DIR/update.sh"
  exit 1
fi

# Make sure update script is executable
chmod +x "$CYBERLENS_DIR/update.sh"
echo "Made update script executable"

# Create a temporary file with the cron job
TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Check if cron job already exists
if grep -q "$CYBERLENS_DIR/update.sh" "$TEMP_CRON"; then
  echo "Cron job already exists. Skipping..."
else
  # Add the cron job
  echo "$CRON_SCHEDULE cd $CYBERLENS_DIR && bash update.sh >> $CYBERLENS_DIR/cron.log 2>&1" >> "$TEMP_CRON"
  crontab "$TEMP_CRON"
  echo "Cron job added successfully"
fi

# Clean up
rm "$TEMP_CRON"

echo "CyberLens automatic update cron job setup complete!"
echo "The system will check for updates at 3:00 AM daily."
exit 0 