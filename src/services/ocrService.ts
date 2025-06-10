import { createWorker, createScheduler, PSM, OEM } from 'tesseract.js';
import { AnalysisResult, Threat } from '../types';
import { imageProcessingService } from './imageProcessingService';
import { config } from '../config';

// Analisis sederhana teks untuk mendeteksi ancaman
const analyzeTextForThreats = (text: string): AnalysisResult => {
  // Membuat lowercase untuk mempermudah deteksi
  const lowerText = text.toLowerCase();
  
  // Kata kunci yang mungkin mengindikasikan phishing atau penipuan
  const phishingKeywords = [
    'password', 'kata sandi', 'login', 'masuk', 'credit card', 'kartu kredit',
    'bank', 'account', 'akun', 'verify', 'verifikasi', 'confirm', 'konfirmasi',
    'urgent', 'segera', 'limited time', 'waktu terbatas', 'free', 'gratis',
    'winner', 'pemenang', 'won', 'menang', 'click here', 'klik disini',
    'congratulation', 'selamat', 'hadiah', 'prize', 'jackpot', 'lucky',
    'beruntung', 'exclusive', 'eksklusif', 'limited offer', 'penawaran terbatas',
    // Tambahan kata kunci khusus bahasa Indonesia
    'jangan dibagikan', 'rahasia', 'otp', 'kode otp', 'kode verifikasi',
    'kode rahasia', 'pin atm', 'nomor rekening', 'transfer segera', 'darurat',
    'butuh bantuan', 'tolong kirim', 'promo terbatas', 'diskon besar',
    'kesempatan terakhir', 'hanya hari ini', 'batas waktu', 'jumlah terbatas',
    'buruan', 'cepat', 'daftarkan', 'unduh sekarang', 'konfirmasi data',
    'informasi rahasia', 'informasi pribadi', 'login segera', 'reset password',
    'peringatan keamanan', 'masalah akun', 'verifikasi akun', 'validasi data'
  ];
  
  // Kata kunci yang mungkin mengindikasikan malware
  const malwareKeywords = [
    'download', 'unduh', 'install', 'pasang', 'exe', 'setup', 'update',
    'pembaruan', 'activate', 'aktivasi', 'crack', 'keygen', 'serial', 'patch',
    'virus', 'malware', 'trojan', 'worm', 'ransomware', 'hack', 'hacker',
    'vulnerability', 'kerentanan', 'exploit', 'spyware', 'adware',
    // Tambahan kata kunci malware untuk bahasa Indonesia
    'akses penuh', 'akses root', 'aplikasi terlarang', 'bypass', 'buka kunci',
    'sistem palsu', 'pembaruan palsu', 'aplikasi palsu', 'perangkat lunak bajakan',
    'perbaiki virus', 'hapus virus', 'keamanan terdeteksi', 'peringatan sistem',
    'sistem terinfeksi', 'komputer terinfeksi', 'perangkat terinfeksi',
    'izinkan akses', 'izinkan notifikasi', 'izinkan pemberitahuan',
    'versi terbaru', 'versi pro', 'versi premium', 'versi penuh',
    'akses terbatas', 'aplikasi berbahaya', 'tidak terdeteksi antivirus'
  ];
  
  // Kata kunci untuk transaksi keuangan
  const financialKeywords = [
    'transfer', 'payment', 'pembayaran', 'wallet', 'dompet', 'bitcoin', 'crypto',
    'kripto', 'atm', 'bank', 'dana', 'gopay', 'ovo', 'pulsa', 'bca', 'bni', 'bri', 'mandiri',
    'kartu debit', 'debit card', 'credit card', 'kartu kredit', 'cvv', 'pin', 'expiry',
    'kadaluarsa', 'balance', 'saldo', 'withdraw', 'tarik', 'deposit', 'setor',
    // Tambahan kata kunci keuangan untuk Indonesia
    'e-banking', 'm-banking', 'internet banking', 'mobile banking', 'rekening',
    'virtual account', 'va', 'kode pembayaran', 'batas transfer', 'limit harian',
    'dompet digital', 'e-wallet', 'shopeepay', 'linkaja', 'jenius', 'octo', 'cimb',
    'permata', 'panin', 'btpn', 'jago', 'blu', 'flip', 'bibit', 'bareksa', 'akulaku',
    'kredivo', 'home credit', 'pinjol', 'pinjaman online', 'cicilan', 'tenor',
    'bunga', 'bunga 0%', 'cashback', 'kode promo', 'kode voucher', 'point reward',
    'tabungan', 'deposito', 'giro', 'bunga harian', 'cek saldo', 'mutasi rekening',
    'bukti transfer', 'kode unik', 'nomor referensi'
  ];
  
  // Menghitung jumlah kata kunci yang terdeteksi
  let phishingCount = 0;
  let malwareCount = 0;
  let financialCount = 0;
  
  // Periksa kata kunci phishing
  phishingKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      phishingCount++;
      console.log(`Phishing keyword found: ${keyword}`);
    }
  });
  
  // Periksa kata kunci malware
  malwareKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      malwareCount++;
      console.log(`Malware keyword found: ${keyword}`);
    }
  });
  
  // Periksa kata kunci keuangan
  financialKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      financialCount++;
      console.log(`Financial keyword found: ${keyword}`);
    }
  });
  
  // Tentukan tingkat risiko berdasarkan jumlah kata kunci
  let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'unknown' = 'safe';
  let confidenceScore = 0.95;
  let threats: Threat[] = [];
  let recommendations: string[] = [];
  let summary = '';
  
  // Tingkat risiko berdasarkan jumlah kata kunci yang terdeteksi
  if (phishingCount >= 3 || (phishingCount >= 2 && financialCount >= 2)) {
    riskLevel = 'high';
    confidenceScore = 0.9;
    
    summary = 'Terdeteksi risiko phishing tinggi pada gambar.';
    
    threats.push({
      type: 'phishing',
      description: `Terdeteksi ${phishingCount} kata kunci phishing dan ${financialCount} kata kunci finansial.`,
      confidence: 0.9
    });
    
    recommendations = [
      'Jangan memberikan informasi pribadi atau finansial',
      'Verifikasi keaslian situs web atau pengirim',
      'Hindari mengklik tautan langsung dari gambar ini',
      'Jika ini terkait transaksi finansial, hubungi institusi resmi melalui kontak yang terverifikasi'
    ];
  } else if (malwareCount >= 2 || (phishingCount >= 1 && malwareCount >= 1)) {
    riskLevel = 'medium';
    confidenceScore = 0.7;
    
    summary = 'Terdeteksi risiko malware sedang pada gambar.';
    
    threats.push({
      type: 'malware',
      description: `Terdeteksi ${malwareCount} kata kunci malware.`,
      confidence: 0.7
    });
    
    recommendations = [
      'Hindari mengunduh atau menginstal apa pun yang diminta',
      'Perhatikan ekstensi file yang akan diunduh',
      'Pastikan memiliki antivirus yang aktif dan terbarui',
      'Verifikasi keaslian pengirim sebelum mengunduh apa pun'
    ];
  } else if (phishingCount >= 1 || financialCount >= 1) {
    riskLevel = 'low';
    confidenceScore = 0.5;
    
    summary = 'Terdeteksi risiko rendah pada gambar.';
    
    if (phishingCount >= 1) {
      threats.push({
        type: 'suspicious-content',
        description: `Terdeteksi ${phishingCount} kata kunci yang mencurigakan.`,
        confidence: 0.5
      });
    }
    
    recommendations = [
      'Berhati-hati dengan informasi yang diminta',
      'Verifikasi identitas pengirim sebelum merespons',
      'Jangan memberikan informasi pribadi atau finansial tanpa verifikasi'
    ];
  } else {
    summary = 'Tidak terdeteksi risiko keamanan pada teks yang diekstrak.';
    recommendations = [
      'Tetap berhati-hati dengan konten online',
      'Selalu verifikasi pengirim atau sumber informasi'
    ];
  }

  // Menambahkan teks yang diekstrak sebagai bagian dari analisis
  const details = [
    'Teks yang diekstrak dari gambar:',
    text
  ];
  
  return {
    riskLevel,
    confidenceScore,
    threats,
    summary,
    recommendations,
    details,
    timestamp: new Date().toISOString()
  };
};

/**
 * Mengekstrak teks dari gambar menggunakan Tesseract OCR dengan konfigurasi lanjutan
 */
const extractTextFromImage = async (imageData: string): Promise<string> => {
  try {
    console.log('Memulai ekstraksi teks dengan Tesseract OCR...');
    
    // Memastikan imageData adalah base64 tanpa prefix jika format data URL
    let processedImageData = imageData;
    if (imageData.startsWith('data:image')) {
      processedImageData = imageData;
    } else {
      processedImageData = `data:image/jpeg;base64,${imageData}`;
    }
    
    // Cek apakah gambar memiliki teks yang signifikan
    const hasText = await imageProcessingService.hasSignificantText(processedImageData);
    if (!hasText) {
      console.log('Gambar tidak terdeteksi memiliki teks yang signifikan');
      return 'Tidak terdeteksi teks dalam gambar.';
    }
    
    // Tentukan apakah harus menggunakan pemrosesan lanjutan
    const useEnhancedProcessing = config.ocr?.enhancedProcessing !== false; 
    
    // Gunakan variasi gambar jika dikonfigurasi
    let imageVariations = [processedImageData];
    if (config.ocr?.createVariations !== false) {
      console.log('Membuat variasi gambar untuk meningkatkan akurasi OCR...');
      imageVariations = await imageProcessingService.createImageVariations(processedImageData);
      console.log(`${imageVariations.length} variasi gambar siap diproses`);
    } else if (useEnhancedProcessing) {
      // Jika tidak membuat variasi tapi tetap menggunakan enhanced processing
      console.log('Melakukan pra-pemrosesan gambar...');
      processedImageData = await imageProcessingService.preprocessImage(processedImageData);
      imageVariations = [processedImageData];
      console.log('Pra-pemrosesan selesai');
    }

    // Buat worker untuk OCR
    const worker = await createWorker();
    
    // Gunakan bahasa dari konfigurasi atau default ke ind+eng
    const languages = config.ocr?.languages || 'ind+eng';
    await worker.loadLanguage(languages);
    await worker.initialize(languages, OEM.LSTM_ONLY);
    
    // Konfigurasi khusus untuk Tesseract
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?@#$%^&*()-_+=[]{}|\\/<>\'"`~ áàäâãåéèëêíìïîóòöôõúùüûçñÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇÑ',
      tessjs_create_hocr: '0',
      tessjs_create_tsv: '0',
      tessjs_create_box: '0',
      tessjs_create_unlv: '0',
      tessjs_create_osd: '0'
    });
    
    console.log('Worker OCR siap, mulai mengenali teks...');
    
    // Proses setiap variasi gambar dan simpan hasilnya
    const results = [];
    
    // Tentukan jumlah variasi yang akan diproses
    const variationsToProcess = config.ocr?.createVariations !== false 
      ? imageVariations.length 
      : 1;
    
    for (let i = 0; i < variationsToProcess; i++) {
      console.log(`Memproses ${variationsToProcess > 1 ? 'variasi gambar' : 'gambar'} ${i+1}/${variationsToProcess}...`);
      const { data } = await worker.recognize(imageVariations[i]);
      results.push({
        text: data.text,
        confidence: data.confidence,
        variation: i
      });
      console.log(`Variasi ${i+1} selesai dengan confidence: ${data.confidence.toFixed(2)}`);
    }
    
    // Cleanup
    await worker.terminate();
    
    // Pilih hasil dengan confidence terbaik
    results.sort((a, b) => b.confidence - a.confidence);
    
    // Cek confidence minimum
    const minConfidence = config.ocr?.minConfidence || 0.3;
    if (results[0].confidence < minConfidence) {
      console.log(`Confidence OCR (${results[0].confidence.toFixed(2)}) di bawah minimum (${minConfidence})`);
      return 'Tidak dapat mengenali teks dengan kepastian yang cukup.';
    }
    
    console.log('Hasil OCR (diurutkan berdasarkan confidence):');
    results.forEach((result, index) => {
      console.log(`#${index+1}: ${result.variation !== undefined ? 'Variasi ' + (result.variation+1) : 'Gambar'}, Confidence: ${result.confidence.toFixed(2)}`);
    });
    
    // Pilih hasil terbaik
    let bestResult = results[0];
    
    // Tambahkan koreksi pasca-pemrosesan
    let extractedText = bestResult.text;
    
    // Koreksi pasca-pemrosesan 
    extractedText = extractedText
      .replace(/l\b/g, '1') // Perbaiki 'l' menjadi '1' di akhir kata
      .replace(/\bO\b/g, '0') // Perbaiki 'O' menjadi '0' jika berdiri sendiri
      .replace(/\bo\b/g, '0') // Perbaiki 'o' menjadi '0' jika berdiri sendiri
      .replace(/\bI\b/g, '1') // Perbaiki 'I' menjadi '1' jika berdiri sendiri
      .replace(/\bi\b/g, '1') // Perbaiki 'i' menjadi '1' jika berdiri sendiri
      .replace(/[^\S\r\n]+/g, ' ') // Normalisasi whitespace
      .replace(/\n{3,}/g, '\n\n'); // Mengurangi multiple newlines
    
    console.log(`Ekstraksi OCR selesai dengan confidence: ${bestResult.confidence.toFixed(2)}`);
    return extractedText;
  } catch (error) {
    console.error('Error dalam ekstraksi OCR:', error);
    
    // Fallback ke metode standar jika metode lanjutan gagal
    try {
      console.log('Mencoba metode OCR standar sebagai fallback...');
      const worker = await createWorker();
      
      // Gunakan bahasa dari konfigurasi atau default ke ind+eng
      const languages = config.ocr?.languages || 'ind+eng';
      await worker.loadLanguage(languages);
      await worker.initialize(languages);
      
      // Memastikan imageData adalah base64 tanpa prefix jika format data URL
      let processedImageData = imageData;
      if (imageData.startsWith('data:image')) {
        processedImageData = imageData;
      } else {
        processedImageData = `data:image/jpeg;base64,${imageData}`;
      }
      
      const { data } = await worker.recognize(processedImageData);
      console.log('Ekstraksi fallback selesai dengan confidence:', data.confidence);
      
      await worker.terminate();
      
      return data.text;
    } catch (fallbackError) {
      console.error('Error dalam ekstraksi OCR fallback:', fallbackError);
      throw error; // Lempar error asli
    }
  }
};

/**
 * Menganalisis gambar menggunakan OCR untuk mendeteksi ancaman keamanan
 */
const analyzeImageWithOCR = async (imageData: string): Promise<AnalysisResult> => {
  try {
    // Ekstrak teks dari gambar menggunakan Tesseract OCR yang ditingkatkan
    const extractedText = await extractTextFromImage(imageData);
    console.log('Teks terekstrak:', extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''));
    
    // Analisis teks untuk menemukan potensi ancaman
    const result = analyzeTextForThreats(extractedText);
    
    return result;
  } catch (error) {
    console.error('Error dalam analisis OCR:', error);
    throw error;
  }
};

export const ocrService = {
  analyzeImageWithOCR,
  extractTextFromImage
}; 