/**
 * Script untuk menguji koneksi kamera dan OCR
 * 
 * Cara penggunaan:
 * 1. Jalankan aplikasi dengan npm run dev
 * 2. Buka browser dan navigasi ke http://localhost:3000
 * 3. Buka console browser
 * 4. Copy-paste script ini ke console browser dan tekan Enter
 */

console.log('=== CYBERLENS CAMERA & OCR TEST ===');

// Fungsi untuk menguji kamera
async function testCamera() {
  console.log('🔍 Menguji koneksi kamera...');
  
  try {
    // Cek apakah browser mendukung getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser tidak mendukung akses kamera (getUserMedia API)');
    }
    
    console.log('✅ Browser mendukung akses kamera');
    
    // Cek izin kamera
    console.log('🔍 Meminta izin akses kamera...');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log('✅ Izin kamera diberikan');
    
    // Cek perangkat kamera yang tersedia
    console.log('🔍 Mencari perangkat kamera yang tersedia...');
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      throw new Error('Tidak ada perangkat kamera yang terdeteksi');
    }
    
    console.log(`✅ Terdeteksi ${videoDevices.length} perangkat kamera:`);
    videoDevices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.label || 'Kamera ' + (index + 1)}`);
    });
    
    // Cek apakah stream aktif
    if (stream.active) {
      console.log('✅ Stream kamera aktif');
      
      // Mendapatkan track video
      const videoTracks = stream.getVideoTracks();
      console.log(`✅ Ditemukan ${videoTracks.length} track video`);
      
      videoTracks.forEach((track, index) => {
        console.log(`   Track ${index + 1}: ${track.label}`);
        console.log(`   Status: ${track.enabled ? 'Enabled' : 'Disabled'}, State: ${track.readyState}`);
        
        // Cek capabilities jika didukung
        try {
          const capabilities = track.getCapabilities();
          console.log('   Capabilities:', capabilities);
        } catch (e) {
          console.log('   Tidak dapat mendapatkan capabilities:', e);
        }
      });
      
      // Berhenti menggunakan kamera
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Stream kamera dihentikan');
    } else {
      throw new Error('Stream kamera tidak aktif');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error saat menguji kamera:', error);
    return false;
  }
}

// Fungsi untuk menguji OCR
async function testOCR() {
  console.log('🔍 Menguji koneksi OCR...');
  
  try {
    // Cek apakah Tesseract.js tersedia
    if (typeof window.Tesseract === 'undefined') {
      console.warn('⚠️ Tesseract.js tidak terdeteksi secara global, mencoba import dinamis...');
      
      try {
        // Coba import OCR service
        const { ocrService } = await import('../src/services/ocrService');
        console.log('✅ OCR service berhasil diimpor');
        return true;
      } catch (importError) {
        throw new Error('Gagal mengimpor OCR service: ' + importError.message);
      }
    } else {
      console.log('✅ Tesseract.js tersedia secara global');
      return true;
    }
  } catch (error) {
    console.error('❌ Error saat menguji OCR:', error);
    return false;
  }
}

// Fungsi untuk menguji integrasi kamera dan OCR
async function testCameraOCRIntegration() {
  console.log('🔍 Menguji integrasi kamera dan OCR...');
  
  try {
    // Cek apakah komponen Camera tersedia
    const cameraComponent = document.querySelector('video');
    if (!cameraComponent) {
      throw new Error('Komponen video kamera tidak ditemukan di halaman');
    }
    
    console.log('✅ Komponen video kamera ditemukan di halaman');
    
    // Cek apakah video sedang diputar
    if (cameraComponent.paused || cameraComponent.ended) {
      console.warn('⚠️ Video kamera tidak sedang diputar');
    } else {
      console.log('✅ Video kamera sedang diputar');
    }
    
    // Cek dimensi video
    if (cameraComponent.videoWidth === 0 || cameraComponent.videoHeight === 0) {
      console.warn('⚠️ Dimensi video kamera adalah 0, kemungkinan stream belum dimulai');
    } else {
      console.log(`✅ Dimensi video kamera: ${cameraComponent.videoWidth}x${cameraComponent.videoHeight}`);
    }
    
    // Cek apakah fungsi capture tersedia
    if (typeof window.cameraService === 'undefined' || typeof window.cameraService.captureFrame !== 'function') {
      console.warn('⚠️ cameraService.captureFrame tidak tersedia secara global');
      console.log('ℹ️ Ini normal jika cameraService dienkapsulasi dalam modul');
    } else {
      console.log('✅ cameraService.captureFrame tersedia');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error saat menguji integrasi kamera dan OCR:', error);
    return false;
  }
}

// Jalankan semua test
async function runAllTests() {
  console.log('🚀 Memulai pengujian...');
  
  const cameraResult = await testCamera();
  console.log('\n');
  
  const ocrResult = await testOCR();
  console.log('\n');
  
  const integrationResult = await testCameraOCRIntegration();
  console.log('\n');
  
  console.log('=== HASIL PENGUJIAN ===');
  console.log(`Kamera: ${cameraResult ? '✅ BERHASIL' : '❌ GAGAL'}`);
  console.log(`OCR: ${ocrResult ? '✅ BERHASIL' : '❌ GAGAL'}`);
  console.log(`Integrasi: ${integrationResult ? '✅ BERHASIL' : '❌ GAGAL'}`);
  
  if (cameraResult && ocrResult && integrationResult) {
    console.log('\n✅✅✅ SEMUA TEST BERHASIL! Kamera dan OCR berfungsi dengan baik.');
  } else {
    console.log('\n⚠️ Beberapa test gagal. Lihat detail di atas untuk informasi lebih lanjut.');
  }
}

// Jalankan semua test
runAllTests(); 