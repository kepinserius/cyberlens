#!/bin/bash

# Script pengamanan API key untuk CyberLens
# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Memulai setup keamanan API key CyberLens..."

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   log "Script ini harus dijalankan sebagai root. Gunakan sudo."
   exit 1
fi

# Konstanta
API_KEY=$1
DEVICE_ID=$(cat /proc/cpuinfo | grep Serial | cut -d ' ' -f 2)
CYBERLENS_DIR="/home/orangepi/cyberlens"
HARDWARE_KEY=$(dmidecode -s system-uuid)
ENCRYPTED_ENV_DIR="/etc/cyberlens"
LICENSE_FILE="/etc/cyberlens/license.dat"

# Periksa argumen
if [ -z "$API_KEY" ]; then
  log "API key tidak diberikan. Gunakan: $0 <api_key>"
  exit 1
fi

# Buat direktori terenkripsi untuk menyimpan API key
mkdir -p "$ENCRYPTED_ENV_DIR"
chmod 700 "$ENCRYPTED_ENV_DIR"

# Enkripsi API key dengan hardware ID sebagai seed
log "Mengenkripsi API key dengan hardware ID..."
ENCRYPTED_KEY=$(echo "$API_KEY" | openssl enc -aes-256-cbc -a -salt -pbkdf2 -pass pass:"$HARDWARE_KEY$DEVICE_ID")

# Buat file lisensi terenkripsi
cat > "$LICENSE_FILE" << EOL
ENCRYPTED_KEY=$ENCRYPTED_KEY
DEVICE_ID=$DEVICE_ID
HARDWARE_ID=$HARDWARE_KEY
ACTIVATION_DATE=$(date +%s)
EOL

chmod 600 "$LICENSE_FILE"

# Buat script untuk memuat API key dengan aman
cat > "$CYBERLENS_DIR/load-api-key.sh" << EOL
#!/bin/bash

# Script untuk memuat API key dari file lisensi terenkripsi
# PERINGATAN: Jangan mengedit file ini atau mencoba mengekstrak API key secara langsung

if [ ! -f "$LICENSE_FILE" ]; then
  echo "ERROR: File lisensi tidak ditemukan"
  exit 1
fi

# Verifikasi hardware ID
CURRENT_DEVICE_ID=\$(cat /proc/cpuinfo | grep Serial | cut -d ' ' -f 2)
CURRENT_HARDWARE_KEY=\$(dmidecode -s system-uuid)

source "$LICENSE_FILE"

if [ "\$CURRENT_DEVICE_ID" != "\$DEVICE_ID" ] || [ "\$CURRENT_HARDWARE_KEY" != "\$HARDWARE_ID" ]; then
  echo "ERROR: Hardware signature tidak cocok. Perangkat ini tidak berlisensi."
  exit 2
fi

# Dekripsi API key dengan hardware ID
API_KEY=\$(echo "\$ENCRYPTED_KEY" | openssl enc -aes-256-cbc -a -d -salt -pbkdf2 -pass pass:"\$CURRENT_HARDWARE_KEY\$CURRENT_DEVICE_ID")

# Export API key ke environment
export REACT_APP_DEEPSEEK_API_KEY="\$API_KEY"
EOL

chmod 700 "$CYBERLENS_DIR/load-api-key.sh"
chown orangepi:orangepi "$CYBERLENS_DIR/load-api-key.sh"

# Modifikasi kiosk.sh untuk menggunakan API key terenkripsi
cp "$CYBERLENS_DIR/kiosk.sh" "$CYBERLENS_DIR/kiosk.sh.bak"

cat > "$CYBERLENS_DIR/kiosk.sh" << EOL
#!/bin/bash

# CyberLens Kiosk Mode Launcher with API Key Protection
# This script sets up and runs CyberLens in kiosk mode on Orange Pi

# Load encrypted API key
if [ -f "$CYBERLENS_DIR/load-api-key.sh" ]; then
  source "$CYBERLENS_DIR/load-api-key.sh"
  if [ \$? -ne 0 ]; then
    echo "ERROR: Gagal memuat API key terenkripsi. Perangkat mungkin tidak berlisensi."
    exit 1
  fi
fi

# Include original kiosk script
source "$CYBERLENS_DIR/kiosk.sh.bak"
EOL

chmod 700 "$CYBERLENS_DIR/kiosk.sh"
chown orangepi:orangepi "$CYBERLENS_DIR/kiosk.sh"

# Tambahkan mekanisme pemeriksaan penggunaan API
cat > "$CYBERLENS_DIR/api-usage-monitor.sh" << EOL
#!/bin/bash

# Monitor penggunaan API
# Script ini akan memantau dan membatasi penggunaan API

USAGE_LOG="/etc/cyberlens/api-usage.log"
USAGE_LIMIT=1000  # Batas penggunaan harian
CURRENT_USAGE=\$(grep "\$(date +%Y-%m-%d)" "\$USAGE_LOG" | wc -l)

if [ \$CURRENT_USAGE -gt \$USAGE_LIMIT ]; then
  echo "WARNING: Batas penggunaan API harian terlampaui (\$CURRENT_USAGE/\$USAGE_LIMIT)"
  echo "\$(date '+%Y-%m-%d %H:%M:%S') - LIMIT_EXCEEDED - \$CURRENT_USAGE" >> "\$USAGE_LOG"
  exit 1
fi

echo "\$(date '+%Y-%m-%d %H:%M:%S') - API_CALL" >> "\$USAGE_LOG"
exit 0
EOL

chmod 700 "$CYBERLENS_DIR/api-usage-monitor.sh"
chown orangepi:orangepi "$CYBERLENS_DIR/api-usage-monitor.sh"

# Buat cron job untuk sinkronisasi penggunaan API (opsional jika memiliki server sentral)
# crontab -l | { cat; echo "0 0 * * * $CYBERLENS_DIR/api-usage-sync.sh"; } | crontab -

log "Setup keamanan API key selesai."
log "API key telah diamankan dengan pengikatan ke hardware ID perangkat ini."
log "PENTING: Simpan backup dari file lisensi di $LICENSE_FILE"
exit 0 