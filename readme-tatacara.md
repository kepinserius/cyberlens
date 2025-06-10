# Panduan Implementasi CyberLens ke Orange Pi

## Pendahuluan

Dokumen ini menjelaskan langkah-langkah untuk mengimplementasikan aplikasi CyberLens ke perangkat Orange Pi. CyberLens adalah aplikasi berbasis web yang menggunakan kecerdasan buatan (AI) untuk memindai layar dan mendeteksi potensi penipuan, upaya phishing, dan ancaman keamanan.

## Persyaratan Perangkat Keras

- Board Orange Pi (4, 5, atau yang serupa) dengan OS Armbian terpasang
- Webcam USB atau kamera kompatibel
- Koneksi internet untuk akses API
- Monitor dengan input HDMI
- Keyboard dan mouse untuk konfigurasi awal

## Langkah-langkah Implementasi

### 1. Persiapan Orange Pi

1. **Pasang Armbian**:
   - Unduh image Armbian terbaru untuk model Orange Pi Anda dari [situs resmi Armbian](https://www.armbian.com/download/)
   - Flash image ke kartu microSD menggunakan Etcher atau alat serupa
   - Masukkan kartu microSD ke Orange Pi dan hidupkan

2. **Konfigurasi Awal**:
   - Login dengan kredensial default (biasanya username: `root`, password: `1234`)
   - Ikuti panduan konfigurasi awal untuk membuat pengguna `orangepi`
   - Hubungkan periferal (webcam, monitor, keyboard, mouse)
   - Hubungkan ke internet via Ethernet atau Wi-Fi

### 2. Instalasi Dependencies

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Instal paket yang diperlukan
sudo apt install -y git nodejs npm chromium-browser xorg ufw openssl dmidecode

# Instal package serve secara global
sudo npm install -g serve
```

### 3. Unduh dan Siapkan CyberLens

```bash
# Klon repositori
git clone https://github.com/kepinserius/cyberlens.git /home/orangepi/cyberlens

# Berpindah ke direktori proyek
cd /home/orangepi/cyberlens

# Berikan izin eksekusi pada script
chmod +x kiosk.sh update.sh setup-cron.sh setup-security.sh optimize-performance.sh secure-api-key.sh
```

### 4. Konfigurasi API dan Pengamanan

1. **Dapatkan API key** dari [DeepSeek AI](https://platform.deepseek.ai)

2. **Amankan API key dengan hardware binding**:
   ```bash
   # Gunakan script pengamanan API key
   sudo ./secure-api-key.sh YOUR_API_KEY_HERE
   ```
   Script ini akan mengamankan API key dengan:
   - Mengenkripsi API key menggunakan ID hardware perangkat
   - Membuat file lisensi terproteksi di lokasi aman
   - Memodifikasi script kiosk untuk memuat API key dengan aman
   - Membatasi akses ke file API key hanya untuk pengguna sistem

3. **Verifikasi pengamanan API key**:
   ```bash
   # Periksa bahwa file lisensi ada
   sudo ls -la /etc/cyberlens/license.dat
   
   # Periksa script load-api-key
   ls -la /home/orangepi/cyberlens/load-api-key.sh
   ```

### 5. Build Aplikasi

```bash
# Instal dependensi
npm install

# Build aplikasi
npm run build
```

### 6. Optimasi dan Keamanan

1. **Jalankan script optimasi performa**:
   ```bash
   sudo ./optimize-performance.sh
   ```

2. **Jalankan script keamanan**:
   ```bash
   sudo ./setup-security.sh
   ```

### 7. Konfigurasi Autostart dan Pembaruan Otomatis

```bash
# Setup cron job untuk pembaruan otomatis
./setup-cron.sh

# Pastikan konfigurasi autostart sudah benar
mkdir -p /home/orangepi/.config/autostart
cat > /home/orangepi/.config/autostart/cyberlens.desktop << EOL
[Desktop Entry]
Type=Application
Name=CyberLens
Exec=/home/orangepi/cyberlens/kiosk.sh
Terminal=false
X-GNOME-Autostart-enabled=true
NoDisplay=true
EOL
```

### 8. Uji Kiosk Mode

```bash
# Jalankan aplikasi dalam mode kiosk untuk pengujian
/home/orangepi/cyberlens/kiosk.sh
```

### 9. Restart Sistem

```bash
# Restart sistem untuk menerapkan semua perubahan
sudo reboot
```

## Pengamanan API Key untuk Distribusi Perangkat

Jika Anda berencana mendistribusikan atau menjual perangkat CyberLens, perlu langkah-langkah tambahan untuk mencegah penyalahgunaan API key:

### Sistem Pengamanan API Key

CyberLens menggunakan pendekatan berikut untuk mengamankan API key:

1. **Hardware Binding**: 
   - API key diikat ke ID hardware spesifik dari perangkat Orange Pi
   - Perangkat harus memiliki hardware ID yang cocok untuk menggunakan API key
   - Mencegah penggunaan API key pada perangkat lain

2. **Enkripsi Multi-layer**:
   - API key dienkripsi menggunakan algoritma AES-256 dengan salt
   - Kunci enkripsi dibuat dari kombinasi ID CPU dan ID sistem
   - File lisensi terenkripsi diletakkan di direktori terproteksi (/etc/cyberlens)

3. **Pemantauan Penggunaan**:
   - Script monitoring mencatat penggunaan API per hari
   - Batas penggunaan harian dapat dikonfigurasi
   - Penggunaan berlebihan akan dibatasi dan dicatat

4. **Proteksi dari Ekstraksi Manual**:
   - API key tidak disimpan dalam bentuk plaintext di mana pun
   - API key dimuat ke memori hanya saat runtime
   - Akses ke file lisensi dibatasi dengan izin sistem yang ketat

### Strategi Distribusi yang Aman

Saat mendistribusikan perangkat ke pelanggan:

1. **Pre-activation**: 
   - Aktifkan perangkat sebelum pengiriman dengan API key terenkripsi
   - Gunakan API key yang berbeda untuk setiap perangkat atau batch perangkat
   - Simpan catatan perangkat dan API key yang telah diaktifkan

2. **Batasan Penggunaan**:
   - Tetapkan batasan penggunaan API untuk setiap perangkat
   - Pantau penggunaan secara berkala dari server pusat (opsional)
   - Tetapkan masa berlaku lisensi (jika diperlukan)

3. **Perjanjian Pengguna**:
   - Buat perjanjian lisensi yang melarang ekstraksi atau penggunaan ulang API key
   - Jelaskan bahwa API key hanya untuk digunakan dengan perangkat CyberLens yang sah
   - Tetapkan konsekuensi hukum untuk pelanggaran

## Pemecahan Masalah

### Kamera Tidak Berfungsi
- Periksa koneksi kamera dengan `lsusb`
- Cek izin dengan `ls -la /dev/video*`
- Pastikan grup `video` memiliki akses ke kamera

### Aplikasi Tidak Berjalan
- Periksa log kiosk: `cat /home/orangepi/cyberlens/kiosk.log`
- Pastikan Chromium terpasang: `which chromium-browser`
- Periksa status autostart: `ls -la ~/.config/autostart/`

### Masalah API
- Verifikasi file lisensi: `sudo ls -la /etc/cyberlens/license.dat`
- Periksa log penggunaan API: `sudo cat /etc/cyberlens/api-usage.log`
- Verifikasi hardware ID tidak berubah: `dmidecode -s system-uuid`

## Monitoring dan Pemeliharaan

### Pembaruan Manual
```bash
cd /home/orangepi/cyberlens
./update.sh
```

### Memeriksa Log
```bash
# Log kiosk
cat /home/orangepi/cyberlens/kiosk.log

# Log sistem
journalctl --system | grep cyberlens

# Log penggunaan API
sudo cat /etc/cyberlens/api-usage.log
```

### Cadangkan Pengaturan
```bash
# Cadangkan file konfigurasi dan data
mkdir -p ~/cyberlens-backup
sudo cp -r /etc/cyberlens ~/cyberlens-backup/
```

## Fitur Keamanan

Aplikasi CyberLens telah dikonfigurasi dengan keamanan yang ditingkatkan:

- Firewall diaktifkan dengan UFW
- Pembaruan keamanan otomatis dikonfigurasi
- Mode kiosk aman dengan fitur devtools dinonaktifkan
- Izin file diatur dengan prinsip hak akses minimum
- Enkripsi data sensitif di penyimpanan lokal
- Pengikatan API key ke hardware perangkat

## Fitur Optimasi Performa

- CPU governor diatur ke mode performa
- ZRAM dikonfigurasi untuk manajemen memori yang lebih baik
- Swappiness dikurangi untuk respons yang lebih cepat
- Layanan tidak perlu dinonaktifkan
- Chromium dioptimalkan untuk lingkungan sumber daya rendah
- Caching hasil analisis AI

## Cara Menggunakan Aplikasi

Setelah instalasi berhasil, aplikasi akan berjalan secara otomatis setiap kali Orange Pi dinyalakan:

1. **Tampilan Utama**: Menampilkan feed kamera langsung
2. **Mulai Pemindaian**: Klik tombol "Start Scanning" untuk mengaktifkan pemindaian
3. **Hasil Analisis**: Lihat tingkat risiko dan rekomendasi dari hasil analisis
4. **Panel Admin**: Akses panel admin dengan menekan `Ctrl+Alt+A`
5. **Riwayat Pemindaian**: Lihat riwayat pemindaian dengan menekan tombol "Show History"

## Catatan Penting

- Jangan menjalankan aplikasi sebagai root
- Selalu pantau penggunaan CPU/memori dengan `htop`
- Backup file lisensi API key secara berkala
- Simpan catatan hardware ID dan API key untuk setiap perangkat yang didistribusikan
- Ganti API key jika dicurigai terkompromitasi

Dengan mengikuti panduan ini, aplikasi CyberLens seharusnya dapat berjalan dengan optimal dan aman pada perangkat Orange Pi Anda, dengan API key yang dilindungi dari penyalahgunaan. 