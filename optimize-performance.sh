#!/bin/bash

# CyberLens Performance Optimization Script for Orange Pi
# Script ini mengoptimalkan performa Orange Pi untuk aplikasi CyberLens

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting CyberLens performance optimization..."

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   log "This script must be run as root. Please use sudo."
   exit 1
fi

# 1. Install needed utilities
log "Installing performance utilities..."
apt update
apt install -y cpufrequtils zram-config preload

# 2. Configure CPU Governor for performance
log "Setting CPU governor to performance mode..."
if command -v cpufreq-set &> /dev/null; then
  CPU_COUNT=$(grep -c processor /proc/cpuinfo)
  for i in $(seq 0 $((CPU_COUNT-1))); do
    cpufreq-set -c $i -g performance
  done
  log "CPU governor set to performance mode."
else
  log "cpufreq-set not found. Please install cpufrequtils."
fi

# 3. Setup zram for better memory management
log "Configuring zram for better memory usage..."
if [ -f /etc/default/zramswap ]; then
  # Set zram to use 50% of RAM
  sed -i 's/^PERCENTAGE=.*/PERCENTAGE=50/' /etc/default/zramswap
  systemctl restart zramswap
  log "ZRAM configured to use 50% of available RAM."
fi

# 4. Configure swappiness
log "Optimizing swappiness..."
echo "vm.swappiness=10" > /etc/sysctl.d/99-swappiness.conf
sysctl -p /etc/sysctl.d/99-swappiness.conf
log "Swappiness set to 10 for better performance."

# 5. Disable unnecessary services
log "Disabling unnecessary background services..."
SERVICES_TO_DISABLE=(
  "bluetooth.service"
  "cups.service"
  "cups-browsed.service"
  "ModemManager.service"
  "wpa_supplicant.service"
  "avahi-daemon.service"
  "snapd.service"
)

for service in "${SERVICES_TO_DISABLE[@]}"; do
  if systemctl is-active --quiet "$service"; then
    systemctl stop "$service"
    systemctl disable "$service"
    log "Disabled $service"
  fi
done

# 6. Optimize filesystem
log "Optimizing filesystem..."
if ! grep -q "noatime" /etc/fstab; then
  # Add noatime option to root filesystem to reduce disk I/O
  sed -i 's/\(.*\)\( \/ .*\)/\1,noatime\2/' /etc/fstab
  log "Added noatime option to fstab to reduce disk I/O."
fi

# 7. Configure low-latency network settings
log "Optimizing network settings..."
cat > /etc/sysctl.d/99-network-performance.conf << EOL
# Increase system IP port limits
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
EOL
sysctl -p /etc/sysctl.d/99-network-performance.conf
log "Network settings optimized."

# 8. Setup preload to speed up frequently used applications
if [ -f /etc/preload.conf ]; then
  log "Configuring preload for faster application startup..."
  sed -i 's/sortstrategy = 3/sortstrategy = 1/' /etc/preload.conf
  systemctl enable preload
  systemctl restart preload
  log "Preload configured and started."
fi

# 9. Optimize Chromium for low-resource environments
log "Optimizing Chromium for low-resource environments..."
USER_HOME="/home/orangepi"
CHROME_CONFIG_DIR="$USER_HOME/.config/chromium/Default"

mkdir -p "$CHROME_CONFIG_DIR"
cat > "$CHROME_CONFIG_DIR/Preferences" << EOL
{
  "browser": {
    "hardware_acceleration_mode_previous": true,
    "enable_spellchecking": false
  },
  "bookmark_bar": {
    "show_on_all_tabs": false
  },
  "profile": {
    "default_content_setting_values": {
      "images": 1,
      "notifications": 2,
      "plugins": 2
    }
  }
}
EOL
chown -R orangepi:orangepi "$USER_HOME/.config/chromium"
log "Chromium optimized for low resource usage."

# 10. Setup low-memory killer configuration
log "Configuring low-memory killer settings..."
echo "vm.oom_kill_allocating_task=1" >> /etc/sysctl.d/99-memory-performance.conf
sysctl -p /etc/sysctl.d/99-memory-performance.conf
log "Low-memory killer configured."

log "Performance optimization completed successfully."
log "Please reboot the system to apply all changes."
exit 0 