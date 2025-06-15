# CyberLens

CyberLens adalah aplikasi berbasis web yang dirancang untuk perangkat keras Orange Pi, menggunakan kecerdasan buatan (AI) untuk memindai layar dan mendeteksi potensi penipuan, upaya phishing, dan ancaman keamanan.

## Fitur Utama

- 📸 **Live Camera Preview**: Menampilkan feed langsung dari kamera yang terhubung
- 🧠 **Analisis AI**: Menganalisis gambar menggunakan API DeepSeek atau OpenAI Vision
- ⚠️ **Indikator Risiko**: Menunjukkan tingkat risiko potensial dari konten yang dipindai
- 🧾 **Rekomendasi**: Memberikan langkah-langkah yang dapat diambil berdasarkan analisis
- 🕘 **Riwayat Pemindaian**: Menyimpan hasil pemindaian untuk referensi di masa mendatang
- 🔒 **Mode Kiosk**: Berjalan dalam lingkungan kiosk khusus
- 🧰 **Panel Admin**: Kontrol admin dapat diakses melalui pintasan keyboard (Ctrl+Alt+A)

## Persyaratan Perangkat Keras

- Board Orange Pi (4, 5, atau yang serupa) dengan OS Armbian
- Webcam USB atau kamera yang kompatibel
- Koneksi internet untuk akses API
- Monitor dengan input HDMI
- Keyboard dan mouse untuk konfigurasi awal

## Panduan Instalasi Lengkap

### 1. Persiapan Orange Pi

1. **Unduh dan Pasang Armbian**:
   - Unduh image Armbian terbaru untuk model Orange Pi Anda dari [situs resmi Armbian](https://www.armbian.com/download/)
   - Flash image ke kartu microSD menggunakan [Etcher](https://www.balena.io/etcher/) atau alat serupa
   - Masukkan kartu microSD ke Orange Pi dan hidupkan

2. **Konfigurasi Awal Armbian**:
   - Login menggunakan kredensial default (biasanya username: `root`, password: `1234`)
   - Ikuti panduan konfigurasi awal untuk membuat pengguna baru
   - Pilih 'orangepi' sebagai username untuk konsistensi dengan script

3. **Hubungkan Periferal**:
   - Sambungkan webcam USB ke port USB Orange Pi
   - Sambungkan monitor melalui kabel HDMI
   - Sambungkan keyboard dan mouse
   - Sambungkan ke internet melalui Ethernet atau Wi-Fi

### 2. Persiapan Sistem

Buka terminal dan jalankan perintah berikut:

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Instal paket yang diperlukan
sudo apt install -y git nodejs npm chromium-browser xorg

# Instal package serve secara global
sudo npm install -g serve
```

### 3. Instalasi CyberLens

```bash
# Klon repositori
git clone https://github.com/kepinserius/cyberlens.git /home/orangepi/cyberlens

# Berpindah ke direktori proyek
cd /home/orangepi/cyberlens

# Berikan izin eksekusi pada script
chmod +x kiosk.sh update.sh setup-cron.sh
```

### 4. Konfigurasi API

Anda perlu mendapatkan API key dari:
- [DeepSeek AI](https://platform.deepseek.ai) 

Buat file konfigurasi lingkungan:

```bash
# Buat file environment
cat > .env.local << EOL
REACT_APP_DEEPSEEK_API_KEY=your_deepseek_api_key
REACT_APP_OPENAI_API_KEY=your_openai_api_key
EOL

# Edit file untuk memasukkan API key Anda
nano .env.local
```

### 5. Build Aplikasi

```bash
# Instal dependensi
npm install

# Build aplikasi
npm run build
```

### 6. Konfigurasi Autostart dan Pembaruan Otomatis

```bash
# Setup cron job untuk pembaruan otomatis
./setup-cron.sh

# Setup autostart
mkdir -p /home/orangepi/.config/autostart
cat > /home/orangepi/.config/autostart/cyberlens.desktop << EOL
[Desktop Entry]
Type=Application
Name=CyberLens
Exec=/home/orangepi/cyberlens/kiosk.sh
Terminal=false
X-GNOME-Autostart-enabled=true
EOL
```

### 7. Pengujian Manual

Sebelum me-reboot sistem, Anda dapat menguji aplikasi secara manual:

```bash
# Jalankan aplikasi dalam mode kiosk
/home/orangepi/cyberlens/kiosk.sh
```

### 8. Menyelesaikan Instalasi

```bash
# Reboot sistem untuk menerapkan semua perubahan
sudo reboot
```

## Panduan Penggunaan

Setelah reboot, aplikasi akan secara otomatis dimulai dalam mode kiosk. Aplikasi akan:

1. Menampilkan feed kamera langsung
2. Mengaktifkan pemindaian dengan tombol "Start Scanning"
3. Menganalisis gambar yang ditangkap dengan AI
4. Menampilkan hasil analisis dengan tingkat risiko dan rekomendasi

### Panel Admin

Akses panel admin dengan pintasan keyboard: `Ctrl+Alt+A`

Dari panel admin, Anda dapat:
- Melihat informasi sistem
- Mengkonfigurasi pengaturan API
- Memeriksa dan menginstal pembaruan

## Pemeliharaan

### Pembaruan Manual

```bash
cd /home/orangepi/cyberlens
./update.sh
```

### Pembaruan Otomatis

Sistem dikonfigurasi untuk memeriksa pembaruan setiap hari pada pukul 3:00 pagi. Log pembaruan disimpan di `/home/orangepi/cyberlens/update.log`.

## Pemecahan Masalah

- **Kamera tidak berfungsi**:
  - Periksa apakah kamera terhubung dengan benar
  - Jalankan `lsusb` untuk memastikan kamera terdeteksi
  - Periksa izin dengan `ls -la /dev/video*`

- **Layar tampak membeku**:
  - Restart perangkat dengan `sudo reboot`
  - Jika masalah berlanjut, periksa log di `/home/orangepi/cyberlens/kiosk.log`

- **Error API**:
  - Verifikasi API key Anda di panel admin
  - Periksa koneksi internet dengan `ping google.com`

- **Masalah mode kiosk**:
  - Jika aplikasi tidak dimulai otomatis, jalankan `systemctl --user status cyberlens`
  - Periksa log sesi dengan `journalctl --user`

## Spesifikasi Monitor yang Direkomendasikan

- **Ukuran**: 7-10 inci (portabel) atau 15-24 inci (tetap)
- **Resolusi**: Minimal 1280x720 (HD), direkomendasikan 1920x1080 (Full HD)
- **Koneksi**: HDMI (pastikan kompatibel dengan port HDMI di Orange Pi Anda)
- **Touchscreen**: Opsional, bermanfaat untuk interaksi tanpa keyboard
- **Mount**: Pertimbangkan penggunaan mounting bracket untuk instalasi permanen

## Optimasi Kinerja

Untuk kinerja optimal pada perangkat Orange Pi:

1. **Pengaturan CPU Governor**:
   ```bash
   sudo apt install cpufrequtils
   sudo cpufreq-set -g performance
   ```

2. **Mengurangi Beban Visual**:
   Pada sistem dengan RAM terbatas, nonaktifkan efek visual:
   ```bash
   sudo apt install xfce4-settings
   xfce4-settings-manager
   ```
   Lalu kurangi efek visual melalui antarmuka.

3. **Penggunaan Memori Swap**:
   ```bash
   sudo fallocate -l 1G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## Kontak dan Dukungan

Untuk dukungan teknis atau pertanyaan lebih lanjut, hubungi:
- Email: kevingw23@gmail.com

## Lisensi

Copyright © 2025 Your Company. Hak cipta dilindungi undang-undang.

## Camera Troubleshooting

If you're experiencing issues with camera detection or display, especially on Orange Pi devices:

1. Run the camera diagnostics script:
   ```
   sudo ./scripts/fix-camera.sh
   ```

2. This script will:
   - Check for camera modules and load them if necessary
   - Verify video device permissions
   - Test camera functionality
   - Create a test page for browser compatibility

3. Common camera issues on Orange Pi:
   - Missing kernel modules - the script will attempt to load them
   - Permission issues - the script will fix permissions
   - Browser compatibility - use Chromium for best results
   - CSI camera connection - ensure ribbon cables are properly seated

4. If camera works in the test page but not in the application:
   - Check browser permissions
   - Try different camera resolutions in the application settings
   - Restart the browser after connecting the camera
