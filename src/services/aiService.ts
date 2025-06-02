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
    
    // Log mode yang digunakan
    console.log("Mode aplikasi:", config.application.useMockData ? "Mock Data" : "API DeepSeek");
    
    // Selalu gunakan DeepSeek API jika konfigurasi tidak menggunakan mock data
    if (!config.application.useMockData) {
      try {
        return await analyzeWithDeepSeek(processedImageData);
      } catch (error) {
        console.error('Error dalam DeepSeek API:', error);
        
        // Hanya gunakan OCR sebagai fallback jika OCR diaktifkan dan dikonfigurasi sebagai backup
        if (config.ocr?.enabled !== false && config.ocr?.useAsBackup !== false) {
          console.log('Mencoba OCR sebagai alternatif...');
          return await ocrService.analyzeImageWithOCR(processedImageData);
        } else {
          console.log('OCR tidak diaktifkan sebagai fallback, melempar error asli');
          throw error; // Lempar kembali error karena OCR tidak diaktifkan
        }
      }
    }
    
    // Hanya gunakan mock data jika dikonfigurasi untuk menggunakan mock data
    await new Promise(resolve => setTimeout(resolve, MOCK_ANALYSIS_DELAY));
    const riskLevel = getRandomRiskLevel();
    const result = { ...mockResults[riskLevel], timestamp: new Date().toISOString() };
    
    console.log("Menggunakan mock data dengan risk level:", riskLevel);
    
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
    
    // Format data yang benar untuk DeepSeek API
    const requestBody = {
      model: "deepseek-chat", // Mengubah dari "deepseek-vision" ke "deepseek-chat" (model yang valid)
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this screenshot for security threats, phishing attempts, or other potential risks. Identify any suspicious elements, misleading interfaces, or signs of fraud. Respond in Indonesian language."
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
    // DeepSeek API mengembalikan respons dengan format serupa OpenAI API
    const aiContent = data.choices?.[0]?.message?.content || '';
    console.log("AI content:", aiContent.substring(0, 300) + "...");
    
    // Tentukan risk level berdasarkan analisis AI
    let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    let confidenceScore = 0.5;
    let threats: Threat[] = [];
    let summary = '';
    let recommendations: string[] = [];
    
    // Parse respons teks dari DeepSeek untuk ekstrak informasi yang diperlukan
    if (aiContent.toLowerCase().includes('high risk') || aiContent.toLowerCase().includes('risiko tinggi')) {
      riskLevel = 'high';
      confidenceScore = 0.9;
    } else if (aiContent.toLowerCase().includes('medium risk') || aiContent.toLowerCase().includes('risiko sedang')) {
      riskLevel = 'medium';
      confidenceScore = 0.7;
    } else if (aiContent.toLowerCase().includes('low risk') || aiContent.toLowerCase().includes('risiko rendah')) {
      riskLevel = 'low';
      confidenceScore = 0.5;
    } else {
      riskLevel = 'safe';
      confidenceScore = 0.95;
    }
    
    // Ekstrak summary dari respons
    summary = aiContent.split('\n')[0] || 'Analisis selesai.';
    
    // Ekstrak recommendations
    const recLines = aiContent.match(/recommendations?:([^\n]*(?:\n(?!threats?:|summary:)[^\n]*)*)/i);
    if (recLines && recLines[1]) {
      recommendations = recLines[1].split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('-'));
    } else {
      recommendations = ['Tidak ada rekomendasi spesifik.'];
    }
    
    // Ekstrak threats
    const threatLines = aiContent.match(/threats?:([^\n]*(?:\n(?!recommendations?:|summary:)[^\n]*)*)/i);
    if (threatLines && threatLines[1]) {
      threats = threatLines[1].split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('-'))
        .map((description: string) => ({
          type: 'security',
          description,
          confidence: confidenceScore
        }));
    }
    
    return {
      riskLevel,
      confidenceScore,
      threats,
      summary,
      recommendations: recommendations.length ? recommendations : ['Tidak ada rekomendasi spesifik.'],
      timestamp: new Date().toISOString()
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