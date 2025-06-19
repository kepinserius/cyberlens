import { createWorker, createScheduler, PSM, OEM } from 'tesseract.js';
import { AnalysisResult, Threat } from '../types';
import { imageProcessingService } from './imageProcessingService';
import { config } from '../config';

// Analisis sederhana teks untuk mendeteksi ancaman
const analyzeTextForThreats = (text: string): AnalysisResult => {
  console.log("OCR: Analyzing extracted text for threats...");
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
    'peringatan keamanan', 'masalah akun', 'verifikasi akun', 'validasi data',
    // Tambahan kata kunci penipuan populer di Indonesia
    'undian', 'whatsapp', 'wa', 'telp', 'hubungi', 'call', 'telepon',
    'kirim uang', 'kirim pulsa', 'dana darurat', 'pinjaman', 'lelang',
    'murah', 'dijual cepat', 'kecelakaan', 'sakit', 'rumah sakit',
    'polisi', 'ditangkap', 'dipenjara', 'diproses hukum', 'denda',
    'pajak', 'tunggakan', 'kena sanksi', 'investasi cepat', 'investasi mudah',
    'hasil cepat', 'keuntungan pasti', 'untung besar', 'kripto', 'bitcoin',
    'airdrop', 'emas murah', 'ikut saya', 'minimal deposit', 'deposit murah',
    'jutaan rupiah', 'penghasilan pasif', 'uang melimpah', 'pengundian'
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
    'akses terbatas', 'aplikasi berbahaya', 'tidak terdeteksi antivirus',
    // Tambahan kata kunci umum untuk aplikasi berbahaya di Indonesia
    'apk mod', 'mod apk', 'aplikasi mod', 'hack pulsa', 'bobol wifi',
    'sadap wa', 'sadap whatsapp', 'lacak lokasi', 'intip chat',
    'bobol password', 'login tanpa password', 'curi data', 'kunci layar',
    'aplikasi terlarang', 'tools hacker', 'tools hack', 'script hack'
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
  
  // Deteksi dan log kata kunci phishing yang ditemukan
  const detectedPhishingWords: string[] = [];
  phishingKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      phishingCount++;
      detectedPhishingWords.push(keyword);
      console.log(`OCR: Phishing keyword found: "${keyword}"`);
    }
  });
  
  // Deteksi dan log kata kunci malware yang ditemukan
  const detectedMalwareWords: string[] = [];
  malwareKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      malwareCount++;
      detectedMalwareWords.push(keyword);
      console.log(`OCR: Malware keyword found: "${keyword}"`);
    }
  });
  
  // Deteksi dan log kata kunci keuangan yang ditemukan
  const detectedFinancialWords: string[] = [];
  financialKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      financialCount++;
      detectedFinancialWords.push(keyword);
      console.log(`OCR: Financial keyword found: "${keyword}"`);
    }
  });
  
  // Ringkasan jumlah keyword yang ditemukan
  console.log(`OCR: Total phishing keywords found: ${phishingCount}, malware: ${malwareCount}, financial: ${financialCount}`);
  
  // Tentukan tingkat risiko berdasarkan jumlah kata kunci
  let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'unknown' = 'safe';
  let confidenceScore = 0.70; // Turunkan confidence default dari 0.95 agar tidak terlalu percaya diri
  let threats: Threat[] = [];
  let recommendations: string[] = [];
  let summary = '';
  
  // Tingkat risiko berdasarkan jumlah kata kunci yang terdeteksi
  // Membuat logika lebih sensitif (terutama untuk mendeteksi penipuan)
  if (phishingCount >= 2 || (phishingCount >= 1 && financialCount >= 1)) {
    // Merendahkan threshold untuk penipuan
    riskLevel = 'high';
    confidenceScore = 0.85;
    
    summary = 'Terdeteksi risiko phishing tinggi pada gambar.';
    
    threats.push({
      type: 'phishing',
      description: `Terdeteksi ${phishingCount} kata kunci phishing dan ${financialCount} kata kunci finansial: ${[...detectedPhishingWords, ...detectedFinancialWords].join(', ')}`,
      confidence: 0.85
    });
    
    recommendations = [
      'Jangan memberikan informasi pribadi atau finansial',
      'Verifikasi keaslian situs web atau pengirim',
      'Hindari mengklik tautan langsung dari gambar ini',
      'Jika ini terkait transaksi finansial, hubungi institusi resmi melalui kontak yang terverifikasi'
    ];
  } else if (malwareCount >= 1 || (phishingCount >= 1 && malwareCount >= 0)) {
    // Merendahkan threshold untuk penipuan malware
    riskLevel = 'medium';
    confidenceScore = 0.70;
    
    summary = 'Terdeteksi risiko keamanan sedang pada gambar.';
    
    threats.push({
      type: 'security',
      description: `Terdeteksi ${malwareCount} kata kunci keamanan dan ${phishingCount} kata kunci mencurigakan: ${[...detectedMalwareWords, ...detectedPhishingWords].join(', ')}`,
      confidence: 0.70
    });
    
    recommendations = [
      'Hindari mengunduh atau menginstal apa pun yang diminta',
      'Perhatikan ekstensi file yang akan diunduh',
      'Pastikan memiliki antivirus yang aktif dan terbarui',
      'Verifikasi keaslian pengirim sebelum mengunduh apa pun'
    ];
  } else if (financialCount >= 1 || phishingCount >= 1) {
    riskLevel = 'low';
    confidenceScore = 0.60;
    
    summary = 'Terdeteksi beberapa indikasi yang mencurigakan pada gambar.';
    
    threats.push({
      type: 'suspicious-content',
      description: `Terdeteksi ${financialCount} kata kunci keuangan dan ${phishingCount} kata kunci mencurigakan: ${[...detectedFinancialWords, ...detectedPhishingWords].join(', ')}`,
      confidence: 0.60
    });
    
    recommendations = [
      'Berhati-hati dengan informasi yang diminta',
      'Verifikasi identitas pengirim sebelum merespons',
      'Jangan memberikan informasi pribadi atau finansial tanpa verifikasi'
    ];
  } else {
    summary = 'Tidak terdeteksi risiko keamanan signifikan pada teks yang diekstrak.';
    recommendations = [
      'Tetap berhati-hati dengan konten online',
      'Selalu verifikasi pengirim atau sumber informasi'
    ];
  }

  console.log(`OCR: Analysis result - Risk level: ${riskLevel}, Confidence: ${confidenceScore.toFixed(2)}`);

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
    timestamp: new Date().toISOString(),
    rawAnalysis: text // Tampilkan teks OCR mentah untuk debugging
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