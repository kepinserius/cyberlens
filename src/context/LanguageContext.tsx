import React, { createContext, useState, useContext } from 'react';

// Available languages
export type Language = 'en' | 'id';

// Translations interface
export interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

// Context type
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Base translations
const translations: Translations = {
  // App and general UI
  'app.name': {
    en: 'CyberLens',
    id: 'CyberLens',
  },
  'app.tagline': {
    en: 'AI-powered screen security scanner',
    id: 'Pemindai keamanan layar dengan AI',
  },
  'app.footer': {
    en: 'Running in Kiosk Mode',
    id: 'Berjalan dalam Mode Kios',
  },
  
  // Actions and buttons
  'action.startScanning': {
    en: 'Start Scanning',
    id: 'Mulai Pemindaian',
  },
  'action.stopScanning': {
    en: 'Stop Scanning',
    id: 'Hentikan Pemindaian',
  },
  'action.showHistory': {
    en: 'Show History',
    id: 'Tampilkan Riwayat',
  },
  'action.hideHistory': {
    en: 'Hide History',
    id: 'Sembunyikan Riwayat',
  },
  'action.captureNow': {
    en: 'Capture Now',
    id: 'Ambil Gambar',
  },
  'action.clearAll': {
    en: 'Clear All',
    id: 'Hapus Semua',
  },
  'action.close': {
    en: 'Close',
    id: 'Tutup',
  },
  'action.tryAgain': {
    en: 'Try Again',
    id: 'Coba Lagi',
  },
  
  // Section titles
  'section.cameraPreview': {
    en: 'Camera Preview',
    id: 'Pratinjau Kamera',
  },
  'section.threatAnalysis': {
    en: 'Threat Analysis',
    id: 'Analisis Ancaman',
  },
  'section.scanHistory': {
    en: 'Scan History',
    id: 'Riwayat Pemindaian',
  },
  'section.analysisDetails': {
    en: 'Analysis Details',
    id: 'Detail Analisis',
  },
  'section.recommendations': {
    en: 'Recommendations',
    id: 'Rekomendasi',
  },
  
  // Camera messages
  'camera.initializing': {
    en: 'Initializing camera...',
    id: 'Memulai kamera...',
  },
  'camera.connecting': {
    en: 'Connecting to camera...',
    id: 'Menghubungkan ke kamera...',
  },
  'camera.noDevices': {
    en: 'No camera devices found. Please connect a camera and try again.',
    id: 'Tidak ada perangkat kamera ditemukan. Silakan hubungkan kamera dan coba lagi.',
  },
  'camera.permissionError': {
    en: 'Failed to initialize camera. Please check permissions.',
    id: 'Gagal memulai kamera. Silakan periksa izin.',
  },
  'camera.connectionPrompt': {
    en: 'Please make sure your camera is connected and working properly',
    id: 'Pastikan kamera Anda terhubung dan berfungsi dengan baik',
  },
  'camera.selectCamera': {
    en: 'Select camera',
    id: 'Pilih kamera',
  },
  
  // Analysis status
  'analysis.analyzing': {
    en: 'Analyzing image for potential threats...',
    id: 'Menganalisis gambar untuk potensi ancaman...',
  },
  'analysis.capturePrompt': {
    en: 'Capture an image to analyze for threats',
    id: 'Ambil gambar untuk menganalisis ancaman',
  },
  'analysis.positionPrompt': {
    en: 'Position the camera to capture the screen you want to check',
    id: 'Posisikan kamera untuk mengambil gambar layar yang ingin Anda periksa',
  },
  'analysis.detectedHigh': {
    en: 'High Risk Detected',
    id: 'Risiko Tinggi Terdeteksi',
  },
  'analysis.detectedMedium': {
    en: 'Medium Risk Detected',
    id: 'Risiko Menengah Terdeteksi',
  },
  'analysis.detectedLow': {
    en: 'Low Risk Detected',
    id: 'Risiko Rendah Terdeteksi',
  },
  'analysis.detectedSafe': {
    en: 'Safe Content',
    id: 'Konten Aman',
  },
  'analysis.confidence': {
    en: 'Confidence',
    id: 'Keyakinan',
  },
  
  // History
  'history.noHistory': {
    en: 'No scan history available',
    id: 'Tidak ada riwayat pemindaian tersedia',
  },
  'history.futureReference': {
    en: 'Past scans will appear here for future reference',
    id: 'Pemindaian sebelumnya akan muncul di sini untuk referensi masa depan',
  },
  'history.scansRecorded': {
    en: 'Scans Recorded',
    id: 'Pemindaian Direkam',
  },
  'history.scan': {
    en: 'Scan',
    id: 'Pemindaian',
  },
  'history.scans': {
    en: 'Scans',
    id: 'Pemindaian',
  },
  'history.scanDetails': {
    en: 'Scan Details',
    id: 'Detail Pemindaian',
  },
  'history.dateTime': {
    en: 'Date & Time',
    id: 'Tanggal & Waktu',
  },
  'history.riskLevel': {
    en: 'Risk Level',
    id: 'Tingkat Risiko',
  },
  'history.summary': {
    en: 'Summary',
    id: 'Ringkasan',
  },
  'history.actions': {
    en: 'Actions',
    id: 'Tindakan',
  },
  'history.clearConfirm': {
    en: 'Are you sure you want to clear all scan history? This action cannot be undone.',
    id: 'Apakah Anda yakin ingin menghapus semua riwayat pemindaian? Tindakan ini tidak dapat dibatalkan.',
  },
  'history.completed': {
    en: 'Analysis completed:',
    id: 'Analisis selesai:',
  },
  
  // Admin panel
  'admin.title': {
    en: 'Administrator Panel',
    id: 'Panel Administrator',
  },
  'admin.settings': {
    en: 'Settings',
    id: 'Pengaturan',
  },
  'admin.statistics': {
    en: 'Statistics',
    id: 'Statistik',
  },
  'admin.apiSettings': {
    en: 'API Settings',
    id: 'Pengaturan API',
  },
  'admin.appearance': {
    en: 'Appearance',
    id: 'Tampilan',
  },
  'admin.language': {
    en: 'Language',
    id: 'Bahasa',
  },
  'admin.systemInfo': {
    en: 'System Info',
    id: 'Info Sistem',
  },
  'admin.update': {
    en: 'Update',
    id: 'Pembaruan',
  },
  'admin.appName': {
    en: 'Application Name',
    id: 'Nama Aplikasi',
  },
  'admin.version': {
    en: 'Version',
    id: 'Versi',
  },
  'admin.platform': {
    en: 'Platform',
    id: 'Platform',
  },
  'admin.browser': {
    en: 'Browser',
    id: 'Browser',
  },
  'admin.aiProvider': {
    en: 'AI Provider',
    id: 'Penyedia AI',
  },
  'admin.maintenanceMode': {
    en: 'Maintenance Mode',
    id: 'Mode Pemeliharaan',
  },
  'admin.enabled': {
    en: 'Enabled',
    id: 'Diaktifkan',
  },
  'admin.aiServiceProvider': {
    en: 'AI Service Provider',
    id: 'Penyedia Layanan AI',
  },
  'admin.deepseekApiKey': {
    en: 'DeepSeek API Key',
    id: 'Kunci API DeepSeek',
  },
  'admin.openaiApiKey': {
    en: 'OpenAI API Key',
    id: 'Kunci API OpenAI',
  },
  'admin.enterDeepseekApiKey': {
    en: 'Enter DeepSeek API key',
    id: 'Masukkan kunci API DeepSeek',
  },
  'admin.enterOpenaiApiKey': {
    en: 'Enter OpenAI API key',
    id: 'Masukkan kunci API OpenAI',
  },
  'admin.saveSettings': {
    en: 'Save Settings',
    id: 'Simpan Pengaturan',
  },
  'admin.systemUpdate': {
    en: 'System Update',
    id: 'Pembaruan Sistem',
  },
  'admin.currentVersion': {
    en: 'Current Version',
    id: 'Versi Saat Ini',
  },
  'admin.latestVersion': {
    en: 'Latest Version',
    id: 'Versi Terbaru',
  },
  'admin.checking': {
    en: 'Checking...',
    id: 'Memeriksa...',
  },
  'admin.unknown': {
    en: 'Unknown',
    id: 'Tidak Diketahui',
  },
  'admin.newVersionAvailable': {
    en: 'A new version is available! Update now to get the latest features and security fixes.',
    id: 'Versi baru tersedia! Perbarui sekarang untuk mendapatkan fitur terbaru dan perbaikan keamanan.',
  },
  'admin.checkForUpdates': {
    en: 'Check for Updates',
    id: 'Periksa Pembaruan',
  },
  'admin.updateSystem': {
    en: 'Update System',
    id: 'Perbarui Sistem',
  },
  'admin.updating': {
    en: 'Updating...',
    id: 'Memperbarui...',
  },
  'admin.checkingForUpdates': {
    en: 'Checking for updates...',
    id: 'Memeriksa pembaruan...',
  },
  'admin.selectTheme': {
    en: 'Select Theme',
    id: 'Pilih Tema',
  },
  'admin.selectLanguage': {
    en: 'Select Language',
    id: 'Pilih Bahasa',
  },
  'admin.panelOpened': {
    en: 'Administrator panel opened',
    id: 'Panel administrator dibuka',
  },
  
  // Theme
  'theme.switchToLight': {
    en: 'Switch to Light Mode',
    id: 'Beralih ke Mode Terang',
  },
  'theme.switchToDark': {
    en: 'Switch to Dark Mode',
    id: 'Beralih ke Mode Gelap',
  },
  'theme.light': {
    en: 'Light Mode',
    id: 'Mode Terang',
  },
  'theme.dark': {
    en: 'Dark Mode',
    id: 'Mode Gelap',
  },
  'theme.system': {
    en: 'System Default',
    id: 'Default Sistem',
  },
  
  // Camera messages
  'camera.initialized': {
    en: 'Camera initialized successfully',
    id: 'Kamera berhasil diinisialisasi',
  },
  'camera.initError': {
    en: 'Failed to initialize camera',
    id: 'Gagal menginisialisasi kamera',
  },
  
  // Scan messages
  'scan.started': {
    en: 'Scanning started',
    id: 'Pemindaian dimulai',
  },
  'scan.stopped': {
    en: 'Scanning stopped',
    id: 'Pemindaian dihentikan',
  },
  'scan.error': {
    en: 'Error during scan',
    id: 'Kesalahan saat pemindaian',
  },
  'scan.processing': {
    en: 'Processing scan',
    id: 'Memproses pemindaian',
  },
  
  // Analysis messages
  'analysis.highRiskDetected': {
    en: 'High risk threat detected!',
    id: 'Ancaman risiko tinggi terdeteksi!',
  },
  'analysis.mediumRiskDetected': {
    en: 'Medium risk threat detected',
    id: 'Ancaman risiko menengah terdeteksi',
  },
  'analysis.lowRiskDetected': {
    en: 'Low risk threat detected',
    id: 'Ancaman risiko rendah terdeteksi',
  },
  'analysis.noRiskDetected': {
    en: 'No threats detected',
    id: 'Tidak ada ancaman terdeteksi',
  },
  'analysis.error': {
    en: 'Error analyzing image',
    id: 'Kesalahan menganalisis gambar',
  },
  
  // Language
  'language.select': {
    en: 'Select language',
    id: 'Pilih bahasa',
  },
  
  // Risk levels
  'risk.high': {
    en: 'High',
    id: 'Tinggi',
  },
  'risk.medium': {
    en: 'Medium',
    id: 'Menengah',
  },
  'risk.low': {
    en: 'Low',
    id: 'Rendah',
  },
  'risk.safe': {
    en: 'Safe',
    id: 'Aman',
  },
};

// Create context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

// Language provider component
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get initial language from localStorage or browser, default to English
  const getInitialLanguage = (): Language => {
    const savedLanguage = localStorage.getItem('language') as Language | null;
    
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'id')) {
      return savedLanguage;
    }
    
    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'id') {
      return 'id';
    }
    
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage());

  // Save language preference to localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    
    // Fallback to English or the key itself if translation not found
    return translations[key]?.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext; 