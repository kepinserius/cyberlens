// Configuration for CyberLens
export const config = {
  // API Configuration
  api: {
    // PENTING: Ganti dengan API key DeepSeek yang valid
    // Dapatkan API key di: https://platform.deepseek.com/api-keys
    deepseekApiKey: process.env.REACT_APP_DEEPSEEK_API_KEY || 'sk-aa7f7d4aa02946aca25ab8dd7c30ff75',
    deepseekEndpoint: 'https://api.deepseek.com/v1/chat/completions',
  },
  
  // Legacy API keys (for backward compatibility)
  apiKeys: {
    // PENTING: Ganti dengan API key DeepSeek yang valid
    // Dapatkan API key di: https://platform.deepseek.com/api-keys
    deepseek: process.env.REACT_APP_DEEPSEEK_API_KEY || 'sk-aa7f7d4aa02946aca25ab8dd7c30ff75',
    openai: process.env.REACT_APP_OPENAI_API_KEY || '',
  },
  
  // AI Service to use (can be 'deepseek' or 'openai')
  defaultAIService: 'deepseek',
  
  // Camera settings
  camera: {
    captureInterval: 3000, // milliseconds between captures
  },
  
  // Analysis settings
  analysis: {
    confidence: {
      low: 0.5,
      medium: 0.7,
      high: 0.9,
    },
  },
  
  // OCR settings
  ocr: {
    enabled: true,
    useAsBackup: true,
    languages: 'ind+eng',
    enhancedProcessing: true,
    minConfidence: 0.3,
    createVariations: true
  },
  
  // Application settings
  application: {
    name: 'CyberLens',
    version: '1.0.0',
    updateCheckInterval: 3600000, // 1 hour in ms
    historyLimit: 100, // Maximum number of history items to store
    useMockData: false, // Menggunakan API (dengan OCR sebagai fallback)
  },
} 