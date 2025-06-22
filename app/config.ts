/**
 * Konfigurasi aplikasi CyberLens
 */

// DeepSeek API configuration
export const DEEPSEEK_API_KEY = 'sk-f8bf37ad31384aed9e032e498dfaa426';
export const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Tesseract OCR configuration
export const TESSERACT_CONFIG = {
  // Bahasa yang didukung
  languages: ['eng', 'ind'],
  
  // Parameter untuk meningkatkan akurasi OCR
  parameters: {
    tessedit_ocr_engine_mode: 1,     // LSTM only (more accurate but slower)
    tessedit_pageseg_mode: 6,        // Assume single uniform block of text
    preserve_interword_spaces: 1,
    tessjs_create_hocr: '0',         // Disable HOCR to improve performance
    tessjs_create_tsv: '0',          // Disable TSV to improve performance
    tessjs_create_box: '0',          // Disable box output to improve performance
    tessjs_create_unlv: '0',         // Disable UNLV output to improve performance
    tessjs_create_osd: '0',          // Disable OSD to improve performance
    tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?@#$%^&*()-_=+[]{}|<>/\\\'"`~ ',
  },
  
  // Timeouts
  timeouts: {
    initialization: 30000, // 30 seconds
    recognition: 15000,    // 15 seconds
  }
};

// Image processing configuration
export const IMAGE_PROCESSING_CONFIG = {
  maxWidth: 1024,
  maxHeight: 768,
  jpegQuality: 0.9,
  contrastThreshold: 120, // 0-255, higher means more black/white contrast
  processingMode: 'binarize', // 'text-enhance', 'binarize', 'adaptive', 'default'
};

// Application configuration
export const APP_CONFIG = {
  historyStorageKey: 'cyberlens_history',
  notificationDuration: 5000, // 5 seconds
  retryAttempts: 2,           // Number of retry attempts for OCR
  retryDelay: 1000,           // Delay between retry attempts in ms
  defaultLanguage: 'id',      // Default language (id = Indonesian, en = English)
};

// Language configuration
export type Language = 'id' | 'en';

export const LANGUAGE_CONFIG = {
  id: {
    // Header
    appTitle: 'CyberLens',
    appSubtitle: 'Deteksi Ancaman Canggih',
    scanNow: 'Pindai Sekarang',
    showHistory: 'Tampilkan Riwayat',
    hideHistory: 'Sembunyikan Riwayat',
    
    // Camera
    cameraPreview: 'Pratinjau Kamera',
    cameraPermissionRequired: 'Izin Kamera Diperlukan',
    cameraPermissionText: 'Mohon izinkan akses kamera untuk menggunakan fitur ini. CyberLens membutuhkan izin kamera untuk memindai dan menganalisis teks.',
    requestPermission: 'Minta Izin',
    cameraError: 'Kesalahan Kamera',
    tryAgain: 'Coba Lagi',
    processingImage: 'Memproses gambar...',
    cameraInstructions: 'Arahkan kamera ke teks yang ingin dianalisis, lalu tekan tombol untuk mengambil gambar.',
    
    // Threat Analysis
    threatAnalysis: 'Analisis Ancaman',
    analyzingText: 'Menganalisis teks...',
    captureToAnalyze: 'Ambil gambar untuk melakukan analisis ancaman',
    threatAssessmentComplete: 'Penilaian Ancaman Selesai',
    confidence: 'kepercayaan',
    confidenceScore: 'Skor Kepercayaan',
    analysisSummary: 'Ringkasan Analisis',
    extractedText: 'Teks Terekstrak',
    recommendations: 'Rekomendasi',
    threatType: 'Jenis Ancaman',
    safe: 'Aman',
    warning: 'Waspada',
    danger: 'Bahaya',
    noThreatDetected: 'Tidak terdeteksi risiko keamanan pada teks yang diekstrak.',
    threatDetected: 'Terdeteksi potensi {threat} pada teks yang diekstrak.',
    noTextDetected: 'Tidak ada teks yang terdeteksi',
    
    // History
    scanHistory: 'Riwayat Pemindaian',
    noHistory: 'Belum ada riwayat pemindaian',
    deleteAll: 'Hapus Semua',
    noText: 'Tidak ada teks',
    
    // Errors
    ocrError: 'Gagal mengekstrak teks dari gambar. Silakan coba lagi.',
    cameraAccessError: 'Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin.',
    analysisFailed: 'Gagal melakukan analisis. Silakan coba lagi.'
  },
  
  en: {
    // Header
    appTitle: 'CyberLens',
    appSubtitle: 'Advanced Threat Detection',
    scanNow: 'Scan Now',
    showHistory: 'Show History',
    hideHistory: 'Hide History',
    
    // Camera
    cameraPreview: 'Camera Preview',
    cameraPermissionRequired: 'Camera Permission Required',
    cameraPermissionText: 'Please allow camera access to use this feature. CyberLens needs camera permission to scan and analyze text.',
    requestPermission: 'Request Permission',
    cameraError: 'Camera Error',
    tryAgain: 'Try Again',
    processingImage: 'Processing image...',
    cameraInstructions: 'Point the camera at the text you want to analyze, then press the button to capture an image.',
    
    // Threat Analysis
    threatAnalysis: 'Threat Analysis',
    analyzingText: 'Analyzing text...',
    captureToAnalyze: 'Capture an image to perform threat analysis',
    threatAssessmentComplete: 'Threat Assessment Complete',
    confidence: 'confidence',
    confidenceScore: 'Confidence Score',
    analysisSummary: 'Analysis Summary',
    extractedText: 'Extracted Text',
    recommendations: 'Recommendations',
    threatType: 'Threat Type',
    safe: 'Safe',
    warning: 'Warning',
    danger: 'Danger',
    noThreatDetected: 'No security risks detected in the extracted text.',
    threatDetected: 'Detected potential {threat} in the extracted text.',
    noTextDetected: 'No text detected',
    
    // History
    scanHistory: 'Scan History',
    noHistory: 'No scan history yet',
    deleteAll: 'Delete All',
    noText: 'No text',
    
    // Errors
    ocrError: 'Failed to extract text from image. Please try again.',
    cameraAccessError: 'Could not access camera. Make sure you have granted permission.',
    analysisFailed: 'Analysis failed. Please try again.'
  }
};

// Default values
export const DEFAULT_VALUES = {
  safeRecommendations: [
    'Tetap berhati-hati dengan konten online',
    'Selalu verifikasi pengirim atau sumber informasi'
  ],
}; 