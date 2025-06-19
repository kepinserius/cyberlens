import { AnalysisResult, Threat } from '../types';
import { config } from '../config';
import { ocrService } from './ocrService';

const MOCK_ANALYSIS_DELAY = 1500; // Milliseconds for mock analysis in development

// Mock data for different risk levels
const mockResults: { [key: string]: AnalysisResult } = {
  high: {
    riskLevel: 'high',
    confidenceScore: 0.92,
    threats: [
      {
        type: 'phishing',
        description: 'This appears to be a phishing attempt mimicking a banking login page.',
        confidence: 0.94
      },
      {
        type: 'data-theft',
        description: 'The page is attempting to collect sensitive information.',
        confidence: 0.89
      }
    ],
    summary: 'High risk phishing page detected. The page is designed to mimic a legitimate banking website to steal credentials.',
    recommendations: [
      'Close this page immediately',
      'Do not enter any personal information',
      'Report this to your IT department',
      'Check your accounts for unauthorized activity'
    ],
    timestamp: new Date().toISOString()
  },
  medium: {
    riskLevel: 'medium',
    confidenceScore: 0.78,
    threats: [
      {
        type: 'suspicious-url',
        description: 'The URL of this page does not match the claimed organization.',
        confidence: 0.82
      },
      {
        type: 'insecure-connection',
        description: 'This page is not using a secure connection.',
        confidence: 0.75
      }
    ],
    summary: 'Medium risk security issues detected. The page has some suspicious elements that could indicate a security issue.',
    recommendations: [
      'Verify the website URL carefully',
      'Check for HTTPS security',
      'Be cautious about entering personal information',
      'Consider using a password manager to avoid auto-filling credentials'
    ],
    timestamp: new Date().toISOString()
  },
  low: {
    riskLevel: 'low',
    confidenceScore: 0.65,
    threats: [
      {
        type: 'cookie-tracking',
        description: 'This site uses extensive tracking cookies.',
        confidence: 0.68
      }
    ],
    summary: 'Low risk issues detected. The page appears legitimate but has some privacy concerns.',
    recommendations: [
      'Consider using privacy protection tools',
      'Review your browser privacy settings',
      'Be mindful of what information you share'
    ],
    timestamp: new Date().toISOString()
  },
  safe: {
    riskLevel: 'safe',
    confidenceScore: 0.95,
    threats: [],
    summary: 'No security threats detected. This page appears to be safe.',
    recommendations: [
      'Continue with normal precautions',
      'Always maintain good security practices'
    ],
    timestamp: new Date().toISOString()
  }
};

// Randomly select a risk level, but weight towards 'safe' in development
const getRandomRiskLevel = (): string => {
  const rand = Math.random();
  if (rand < 0.1) return 'high';
  if (rand < 0.25) return 'medium';
  if (rand < 0.4) return 'low';
  return 'safe';
};

// Menambahkan sistem cache untuk hasil analisis
const analysisCache = new Map<string, {result: AnalysisResult, timestamp: number}>();
const CACHE_EXPIRY_TIME = 1000 * 60 * 30; // 30 menit

// Fungsi untuk membuat hash sederhana dari gambar untuk digunakan sebagai kunci cache
const generateImageHash = (imageData: string): string => {
  // Ambil sampel dari gambar untuk membuat hash sederhana
  // Ini lebih efisien daripada menggunakan seluruh imageData
  const sampleSize = 100;
  let hash = '';
  
  if (imageData.startsWith('data:image')) {
    const base64Data = imageData.split(',')[1];
    const length = base64Data.length;
    // Ambil sampel dari awal, tengah, dan akhir gambar
    const step = Math.floor(length / sampleSize);
    for (let i = 0; i < sampleSize; i++) {
      hash += base64Data[i * step % length];
    }
  } else {
    const length = imageData.length;
    const step = Math.floor(length / sampleSize);
    for (let i = 0; i < sampleSize; i++) {
      hash += imageData[i * step % length];
    }
  }
  
  return hash;
};

/**
 * Save a screenshot to the filesystem (only in Electron/Node environment)
 * In browser environment, this will just download the image
 */
const saveScreenshot = (imageData: string, filename: string = `screenshot-${Date.now()}.png`): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if we're in Electron/Node environment
      if (window.require) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          const app = window.require('@electron/remote').app;
          
          // Create screenshots directory if it doesn't exist
          const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
          if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
          }
          
          // Save the image
          const filePath = path.join(screenshotsDir, filename);
          const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
          
          fs.writeFile(filePath, base64Data, 'base64', (err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(filePath);
            }
          });
        } catch (error) {
          // Fallback to browser download if Electron modules aren't available
          downloadScreenshot(imageData, filename);
          resolve(filename);
        }
      } else {
        // Browser environment - trigger download
        downloadScreenshot(imageData, filename);
        resolve(filename);
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Download a screenshot in browser environment
 */
const downloadScreenshot = (imageData: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = filename;
  link.click();
};

/**
 * Analyze an image for security threats
 */
const analyzeImage = async (imageData: string): Promise<AnalysisResult> => {
  try {
    // Memastikan imageData adalah base64 tanpa prefix jika format data URL
    let processedImageData = imageData;
    if (imageData.startsWith('data:image')) {
      processedImageData = imageData.split(',')[1];
    }
    
    // Generate image hash untuk caching
    const imageHash = generateImageHash(imageData);
    
    // Cek apakah hasil sudah ada di cache dan masih valid
    const cachedData = analysisCache.get(imageHash);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_EXPIRY_TIME)) {
      console.log("Menggunakan hasil analisis dari cache");
      return cachedData.result;
    }
    
    // Log mode yang digunakan
    console.log("Mode aplikasi:", config.application.useMockData ? "Mock Data" : "API DeepSeek");
    
    // Proses analisis seperti biasa
    let result: AnalysisResult;
    
    // Selalu gunakan DeepSeek API jika konfigurasi tidak menggunakan mock data
    if (!config.application.useMockData) {
      try {
        console.log("Mencoba menganalisis gambar dengan DeepSeek API...");
        result = await analyzeWithDeepSeek(processedImageData);
        console.log("Analisis DeepSeek berhasil dengan risk level:", result.riskLevel);
      } catch (error) {
        console.error('Error dalam DeepSeek API:', error);
        
        // Hanya gunakan OCR sebagai fallback jika OCR diaktifkan dan dikonfigurasi sebagai backup
        if (config.ocr?.enabled !== false && config.ocr?.useAsBackup !== false) {
          console.log('Mencoba OCR sebagai alternatif karena DeepSeek API gagal...');
          try {
            // Tambah timeout untuk OCR agar tidak menggantung aplikasi
            const ocrPromise = ocrService.analyzeImageWithOCR(processedImageData);
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('OCR timeout')), 30000); // 30 detik timeout
            });
            
            result = await Promise.race([ocrPromise, timeoutPromise]) as AnalysisResult;
            console.log("Analisis OCR berhasil dengan risk level:", result.riskLevel);
            
            // Tambahkan penanda bahwa ini hasil OCR
            result.summary = `[OCR Analysis] ${result.summary}`;
          } catch (ocrError) {
            console.error('Error dalam OCR fallback:', ocrError);
            throw new Error(`Analisis gagal - DeepSeek API: ${error}. OCR: ${ocrError}`);
          }
        } else {
          console.log('OCR tidak diaktifkan sebagai fallback, melempar error asli');
          throw error; // Lempar kembali error karena OCR tidak diaktifkan
        }
      }
    } else {
      // Hanya gunakan mock data jika dikonfigurasi untuk menggunakan mock data
      await new Promise(resolve => setTimeout(resolve, MOCK_ANALYSIS_DELAY));
      const riskLevel = getRandomRiskLevel();
      result = { ...mockResults[riskLevel], timestamp: new Date().toISOString() };
    
      console.log("Menggunakan mock data dengan risk level:", riskLevel);
    }
    
    // Simpan hasil ke cache
    analysisCache.set(imageHash, {
      result,
      timestamp: now
    });
    
    return result;
  } catch (error) {
    console.error('Error in AI analysis:', error);
    throw error;
  }
};

/**
 * Analyze an image using DeepSeek Vision API
 */
const analyzeWithDeepSeek = async (imageData: string): Promise<AnalysisResult> => {
  try {
    const apiKey = config.apiKeys.deepseek;
    const endpoint = 'https://api.deepseek.com/v1/chat/completions';
    
    console.log("Mengirim gambar ke DeepSeek API...");
    
    // Jika API key kosong atau hanya placeholder, tampilkan pesan error
    if (!apiKey || apiKey === '') {
      console.error("API key DeepSeek tidak valid atau belum dikonfigurasi");
      throw new Error(
        "API key DeepSeek tidak valid. Untuk menggunakan DeepSeek API: \n" +
        "1. Buat akun di https://platform.deepseek.com\n" +
        "2. Dapatkan API key dari https://platform.deepseek.com/api-keys\n" +
        "3. Tambahkan API key ke file .env dengan format: REACT_APP_DEEPSEEK_API_KEY=sk-your-api-key\n" +
        "4. Atau update langsung di file config.ts"
      );
    }
    
    // Format prompt yang lebih terstruktur untuk memfasilitasi ekstraksi informasi
    const promptText = `Analisis tangkapan layar ini untuk ancaman keamanan, upaya phishing, atau risiko potensial lainnya. 
Harap identifikasi elemen mencurigakan, antarmuka yang menyesatkan, atau tanda-tanda penipuan.

Berikan hasil analisis Anda dalam format yang terstruktur berikut:
1. RISIKO: [tinggi/sedang/rendah/aman]
2. THREATS: (daftar ancaman terdeteksi)
3. SUMMARY: (ringkasan analisis)
4. RECOMMENDATIONS: (rekomendasi untuk pengguna)

Untuk tingkat RISIKO, gunakan kriteria berikut:
- tinggi: Gambar berisi konten berbahaya yang jelas, seperti halaman phishing, virus, malware, atau penipuan.
- sedang: Gambar mencurigakan dan mungkin berbahaya, tetapi tidak sepenuhnya jelas.
- rendah: Gambar memiliki beberapa elemen mencurigakan, tetapi mungkin sah.
- aman: Gambar tidak menunjukkan ancaman yang terdeteksi.

Harap sangat skeptis dan proaktif dalam mengidentifikasi potensi ancaman. Jika Anda tidak yakin, selalu beri nilai risiko yang lebih tinggi.
Tulis jawaban dalam Bahasa Indonesia.`;

    // Format data yang benar untuk DeepSeek API
    const requestBody = {
      model: "deepseek-chat", // Model yang valid
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    };
    
    console.log("Request body prepared:", JSON.stringify(requestBody).substring(0, 100) + "...");
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log("Response status:", response.status);
    
    // Log headers satu per satu untuk menghindari masalah iterasi
    response.headers.forEach((value, name) => {
      console.log(`Header ${name}: ${value}`);
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek API error:', errorData);
      console.error('Status code:', response.status);
      console.error('API URL:', endpoint);
      console.error('API Key (first 5 chars):', apiKey.substring(0, 5) + '...');
      throw new Error(`API request failed with status ${response.status}: ${errorData}`);
    }
    
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data).substring(0, 300) + "...");
    
    // Parse the response from DeepSeek
    const aiContent = data.choices?.[0]?.message?.content || '';
    console.log("AI content:", aiContent.substring(0, 300) + "...");
    
    // Default values
    let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    let confidenceScore = 0.5;
    let threats: Threat[] = [];
    let summary = '';
    let recommendations: string[] = [];
    
    // Sistem deteksi risiko yang lebih komprehensif
    const lowerContent = aiContent.toLowerCase();
    
    // Deteksi tingkat risiko dari kata kunci yang lebih beragam
    const highRiskKeywords = ['risiko tinggi', 'high risk', 'berbahaya', 'phishing', 'penipuan', 'malware', 'scam', 
                            'virus', 'trojan', 'ransomware', 'pencurian data', 'berbahaya', 'jangan', 'data breach'];
    
    const mediumRiskKeywords = ['risiko sedang', 'medium risk', 'mencurigakan', 'suspicious', 'waspada', 
                               'hati-hati', 'verifikasi', 'tidak aman', 'peringatan', 'warning'];
    
    const lowRiskKeywords = ['risiko rendah', 'low risk', 'potensi', 'potential', 'kemungkinan', 'mungkin'];
    
    // Cek kemunculan kata kunci risiko tinggi
    const hasHighRisk = highRiskKeywords.some(keyword => lowerContent.includes(keyword));
    
    // Cek untuk kata 'RISIKO: tinggi' atau 'RISIKO:tinggi' eksplisit dalam API response
    const explicitHighRisk = /risiko:?\s*tinggi/i.test(aiContent);
    
    // Cek kemunculan kata kunci risiko sedang
    const hasMediumRisk = mediumRiskKeywords.some(keyword => lowerContent.includes(keyword));
    
    // Cek untuk kata 'RISIKO: sedang' atau 'RISIKO:sedang' eksplisit dalam API response  
    const explicitMediumRisk = /risiko:?\s*sedang/i.test(aiContent);
    
    // Cek kemunculan kata kunci risiko rendah
    const hasLowRisk = lowRiskKeywords.some(keyword => lowerContent.includes(keyword));
    
    // Cek untuk kata 'RISIKO: rendah' atau 'RISIKO:rendah' eksplisit dalam API response
    const explicitLowRisk = /risiko:?\s*rendah/i.test(aiContent);
    
    // Cek untuk kata 'RISIKO: aman' atau 'RISIKO:aman' eksplisit dalam API response
    const explicitSafe = /risiko:?\s*aman/i.test(aiContent);
    
    // Tentukan tingkat risiko berdasarkan kriteria di atas, dengan prioritas pada label eksplisit
    if (explicitHighRisk || (!explicitMediumRisk && !explicitLowRisk && !explicitSafe && hasHighRisk)) {
      riskLevel = 'high';
      confidenceScore = 0.9;
    } else if (explicitMediumRisk || (!explicitLowRisk && !explicitSafe && hasMediumRisk)) {
      riskLevel = 'medium';
      confidenceScore = 0.75;
    } else if (explicitLowRisk || (!explicitSafe && hasLowRisk)) {
      riskLevel = 'low';
      confidenceScore = 0.6;
    } else if (explicitSafe || (!hasHighRisk && !hasMediumRisk && !hasLowRisk)) {
      riskLevel = 'safe';
      confidenceScore = 0.85; // Diturunkan dari 0.95 untuk mengurangi overconfidence
    } else {
      // Jika tidak jelas, default ke low risk sebagai tindakan kehati-hatian
      riskLevel = 'low';
      confidenceScore = 0.5;
    }
    
    // Ekstrak summary dari respons dengan lebih agresif
    const summaryMatch = aiContent.match(/summary:?\s*(.*?)(?:\n|$)/i) || 
                         aiContent.match(/ringkasan:?\s*(.*?)(?:\n|$)/i);
    summary = summaryMatch ? summaryMatch[1].trim() : aiContent.split('\n')[0] || 'Analisis selesai.';
    
    // Ekstrak threats dengan regex yang lebih komprehensif
    const threatsRegex = /threats:?\s*([\s\S]*?)(?=recommendations|summary|$)/i;
    const threatMatches = aiContent.match(threatsRegex);
    
    if (threatMatches && threatMatches[1]) {
      // Pisahkan berdasarkan baris baru atau tanda hubung/bullet
      const threatLines = threatMatches[1].split(/\n|-|\*/).map((line: string) => line.trim()).filter(Boolean);
      
      threats = threatLines.map((threatText: string) => ({
        type: 'security',
        description: threatText,
        confidence: confidenceScore
      }));
    } else {
      // Jika tidak ada threats yang jelas disebutkan tapi risiko tidak aman,
      // maka ekstrasi potongan kalimat yang mungkin menjelaskan ancaman
      if (riskLevel !== 'safe') {
        // Cari kalimat yang berisi kata kunci yang mencurigakan
        const sentences = aiContent.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean);
        const suspiciousSentences = sentences.filter((sentence: string) => {
          const lowerSentence = sentence.toLowerCase();
          return highRiskKeywords.some(keyword => lowerSentence.includes(keyword)) || 
                 mediumRiskKeywords.some(keyword => lowerSentence.includes(keyword));
        });
        
        threats = suspiciousSentences.map((sentence: string) => ({
          type: 'security',
          description: sentence,
          confidence: confidenceScore * 0.9
        }));
      }
    }
    
    // Ekstrak recommendations dengan regex yang lebih komprehensif
    const recommendationsRegex = /recommendations:?\s*([\s\S]*?)(?=threats|summary|$)/i;
    const recMatches = aiContent.match(recommendationsRegex) || 
                       aiContent.match(/rekomendasi:?\s*([\s\S]*?)(?=threats|summary|$)/i);
    
    if (recMatches && recMatches[1]) {
      // Pisahkan berdasarkan baris baru atau tanda hubung/bullet
      const recLines = recMatches[1].split(/\n|-|\*/).map((line: string) => line.trim()).filter(Boolean);
      recommendations = recLines;
    } else {
      // Rekomendasi default berdasarkan tingkat risiko
      switch (riskLevel) {
        case 'high':
          recommendations = [
            'Segera tutup halaman/aplikasi ini',
            'Jangan memasukkan informasi pribadi atau keuangan',
            'Laporkan ke pihak berwenang atau tim IT',
            'Periksa perangkat Anda dengan antivirus'
          ];
          break;
        case 'medium':
          recommendations = [
            'Verifikasi sumber atau pengirim sebelum melanjutkan',
            'Periksa URL dan sertifikat keamanan',
            'Hindari memasukkan informasi pribadi',
            'Gunakan fitur keamanan browser seperti pendeteksi phishing'
          ];
          break;
        case 'low':
          recommendations = [
            'Berhati-hati dengan informasi yang Anda bagikan',
            'Verifikasi sumber informasi',
            'Pertimbangkan risiko sebelum melanjutkan'
          ];
          break;
        default:
          recommendations = ['Lanjutkan dengan tindakan pencegahan normal'];
          break;
      }
    }
    
    return {
      riskLevel,
      confidenceScore,
      threats,
      summary,
      recommendations: recommendations.length ? recommendations : ['Tidak ada rekomendasi spesifik.'],
      timestamp: new Date().toISOString(),
      rawAnalysis: aiContent // Menyimpan respon mentah untuk debugging
    };
  } catch (error) {
    console.error('Error in DeepSeek analysis:', error);
    throw error;
  }
};

export const aiService = {
  analyzeImage,
  saveScreenshot
}; 