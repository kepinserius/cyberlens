'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Header from './components/Header';
import Footer from './components/Footer';
import Notification, { NotificationType } from './components/Notification';
import { recognizeText, terminateOCR } from './services/ocrService';
import { analyzeText } from './services/threatAnalysisService';
import { preprocessImageForOCR } from './utils/imageProcessing';
import { AnalysisResult } from './components/ThreatAnalysis';
import { APP_CONFIG } from './config';
import { useLanguage } from './contexts/LanguageContext';

// Import komponen dengan dynamic import untuk menghindari masalah SSR
const CameraPreview = dynamic(() => import('./components/CameraPreview'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 bg-blue-400 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-semibold text-white">Camera Preview</h2>
        </div>
      </div>
      <div className="camera-container flex items-center justify-center bg-slate-800">
        <div className="text-slate-400">Memuat komponen kamera...</div>
      </div>
    </div>
  )
});

const ThreatAnalysis = dynamic(() => import('./components/ThreatAnalysis'), {
  ssr: false
});

const HistoryPanel = dynamic(() => import('./components/HistoryPanel'), {
  ssr: false
});

export default function Home() {
  const { t } = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const cameraRef = useRef<{ captureImage: () => void } | null>(null);
  
  // Notifikasi
  const [notification, setNotification] = useState({
    type: 'success' as NotificationType,
    message: '',
    isVisible: false
  });

  // Load history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('cyberlens_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
    
    // Cleanup OCR worker when component unmounts
    return () => {
      terminateOCR();
    };
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cyberlens_history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }, [history]);

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({
      type,
      message,
      isVisible: true
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const handleCapture = async (imageSrc: string) => {
    try {
      setIsScanning(true);
      setIsAnalyzing(true);
      
      // Preprocess image to improve OCR accuracy
      const processedImage = await preprocessImageForOCR(imageSrc);
      console.log('Image preprocessed for OCR');
      
      // Extract text using OCR with retry logic
      let extractedText = '';
      let ocrSuccess = false;
      let ocrError = null;
      
      // Definisikan retry attempts jika APP_CONFIG tidak tersedia
      const retryAttempts = APP_CONFIG?.retryAttempts || 3;
      const retryDelay = APP_CONFIG?.retryDelay || 1000;
      
      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          console.log(`OCR attempt ${attempt}/${retryAttempts}`);
          extractedText = await recognizeText(processedImage);
          
          if (extractedText && extractedText.trim().length > 0) {
            ocrSuccess = true;
            break;
          } else {
            console.warn(`OCR attempt ${attempt} returned empty text`);
            if (attempt < retryAttempts) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        } catch (error) {
          console.error(`OCR attempt ${attempt} failed:`, error);
          ocrError = error;
          
          if (attempt < retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      if (!ocrSuccess) {
        if (ocrError) {
          throw ocrError;
        } else {
          throw new Error(t('ocrError'));
        }
      }
      
      console.log('Text extracted:', extractedText.substring(0, 100) + '...');
      
      // Analyze the extracted text
      const result = await analyzeText(extractedText);
      
      // Update state with the analysis result
      setAnalysisResult(result);
      
      // Add to history
      setHistory(prev => [result, ...prev]);
      
      showNotification('success', t('analysisFailed'));
      
    } catch (error) {
      console.error('Error processing image:', error);
      showNotification('error', error instanceof Error ? error.message : t('analysisFailed'));
    } finally {
      setIsScanning(false);
      setIsAnalyzing(false);
    }
  };

  const handleStartScanning = () => {
    if (cameraRef.current) {
      cameraRef.current.captureImage();
    } else {
      showNotification('error', t('cameraAccessError'));
    }
  };

  const handleSelectHistory = (result: AnalysisResult) => {
    setAnalysisResult(result);
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('cyberlens_history');
    showNotification('success', t('deleteAll'));
  };

  const handleToggleHistory = () => {
    setShowHistory(!showHistory);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      <Header 
        onToggleHistory={handleToggleHistory} 
        onStartScanning={handleStartScanning}
      />
      
      <main className="flex-grow p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Suspense fallback={<div>Loading camera...</div>}>
                <CameraPreview 
                  onCapture={handleCapture} 
                  isScanning={isScanning} 
                  ref={cameraRef}
                />
              </Suspense>
            </div>
            
            <div>
              <ThreatAnalysis analysisResult={analysisResult} isAnalyzing={isAnalyzing} />
            </div>
            
            {showHistory && (
              <div className="lg:col-span-3">
                <HistoryPanel 
                  history={history} 
                  onSelectHistory={handleSelectHistory} 
                  onClearHistory={handleClearHistory} 
                />
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      
      <Notification 
        type={notification.type}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={closeNotification}
      />
    </div>
  );
}
