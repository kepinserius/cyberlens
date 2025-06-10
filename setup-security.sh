#!/bin/bash

# CyberLens Security Setup
# Script ini meningkatkan keamanan pada Orange Pi untuk aplikasi CyberLens

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting CyberLens security setup..."

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   log "This script must be run as root. Please use sudo."
   exit 1
fi

USER_HOME="/home/orangepi"
CYBERLENS_DIR="$USER_HOME/cyberlens"

# 1. Secure file permissions
log "Setting secure file permissions..."
chmod 700 "$CYBERLENS_DIR"/*.sh
chmod 600 "$CYBERLENS_DIR"/.env* 2>/dev/null
chmod 644 "$CYBERLENS_DIR"/*.json
chmod 755 "$CYBERLENS_DIR"/build -R

# 2. Restrict access to application directory
log "Restricting access to application directory..."
chown -R orangepi:orangepi "$CYBERLENS_DIR"
# Make sure only the orangepi user can access the directory
chmod 750 "$CYBERLENS_DIR"

# 3. Setup firewall to only allow necessary connections
log "Setting up firewall..."
if command -v ufw &> /dev/null; then
  # Allow SSH only if needed
  ufw allow ssh
  # Allow localhost connections for the web server
  ufw allow from 127.0.0.1 to any port 3000
  # Enable the firewall
  ufw --force enable
  log "UFW firewall enabled."
else
  log "UFW not found. Please install it or use another firewall."
fi

# 4. Configure automatic security updates
log "Setting up automatic security updates..."
if command -v apt &> /dev/null; then
  apt update
  apt install -y unattended-upgrades apt-listchanges
  
  # Configure unattended-upgrades to automatically install security updates
  cat > /etc/apt/apt.conf.d/20auto-upgrades << EOL
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOL

  cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOL
Unattended-Upgrade::Allowed-Origins {
  "\${distro_id}:\${distro_codename}-security";
  "\${distro_id}ESM:\${distro_codename}";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::InstallOnShutdown "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOL

  log "Automatic security updates configured."
else
  log "APT not found. Please set up automatic updates manually."
fi

# 5. Disable unused services
log "Disabling unused services..."
systemctl disable bluetooth.service 2>/dev/null || true
systemctl disable avahi-daemon.service 2>/dev/null || true
systemctl disable cups.service 2>/dev/null || true
systemctl disable cups-browsed.service 2>/dev/null || true

# 6. Create a limited-permissions user account for the kiosk application if not already done
if ! id -u cyberlensk >/dev/null 2>&1; then
  log "Creating a limited-permissions user account for the kiosk application..."
  useradd -m -s /bin/bash cyberlensk
  # Set a random password for the user
  RANDOM_PASSWORD=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  echo "cyberlensk:$RANDOM_PASSWORD" | chpasswd
  # Add the user to the video group to access the camera
  usermod -a -G video cyberlensk
fi

# 7. Create a secure autostart script
log "Creating secure autostart for the orangepi user..."
mkdir -p "$USER_HOME/.config/autostart"
cat > "$USER_HOME/.config/autostart/cyberlens.desktop" << EOL
[Desktop Entry]
Type=Application
Name=CyberLens
Exec=/home/orangepi/cyberlens/kiosk.sh
Terminal=false
X-GNOME-Autostart-enabled=true
NoDisplay=true
EOL
chown orangepi:orangepi "$USER_HOME/.config/autostart/cyberlens.desktop"
chmod 644 "$USER_HOME/.config/autostart/cyberlens.desktop"

log "Security setup completed successfully."
log "Please reboot the system to apply all changes."
exit 0 