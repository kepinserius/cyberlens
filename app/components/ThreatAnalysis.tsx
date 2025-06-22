'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../contexts/LanguageContext';

export type ThreatLevel = 'safe' | 'medium' | 'high';

export interface AnalysisResult {
  text: string;
  threatLevel: ThreatLevel;
  confidence: number;
  threatType?: string;
  recommendations: string[];
  analysis?: string;
  timestamp: string;
}

interface ThreatAnalysisProps {
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
}

export default function ThreatAnalysis({ analysisResult, isAnalyzing }: ThreatAnalysisProps) {
  const [animation, setAnimation] = useState(false);
  const { t, language } = useLanguage();
  
  useEffect(() => {
    if (analysisResult) {
      setAnimation(true);
      const timer = setTimeout(() => setAnimation(false), 800);
      return () => clearTimeout(timer);
    }
  }, [analysisResult]);

  if (isAnalyzing) {
    return (
      <div className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700 h-full">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">{t('threatAnalysis')}</h2>
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center h-[calc(100%-4rem)]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300 text-lg">{t('analyzingText')}</p>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700 h-full">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">{t('threatAnalysis')}</h2>
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center h-[calc(100%-4rem)]">
          <p className="text-slate-400 text-lg">{t('captureToAnalyze')}</p>
        </div>
      </div>
    );
  }

  // Pastikan recommendations adalah array
  const safeRecommendations = Array.isArray(analysisResult.recommendations) 
    ? analysisResult.recommendations 
    : typeof analysisResult.recommendations === 'string'
      ? [analysisResult.recommendations]
      : ['Tetap berhati-hati dengan konten online', 'Selalu verifikasi pengirim atau sumber informasi'];

  // Pastikan analisis bukan JSON string
  let analysisText = analysisResult.analysis || '';
  if (analysisText && typeof analysisText === 'string') {
    try {
      // Periksa apakah string adalah JSON
      if (analysisText.trim().startsWith('{') && analysisText.trim().endsWith('}')) {
        const parsed = JSON.parse(analysisText);
        if (typeof parsed === 'object' && parsed !== null) {
          analysisText = parsed.analysis || parsed.description || analysisText;
        }
      }
    } catch (e) {
      // Bukan JSON valid, gunakan string aslinya
    }
  }

  // Dapatkan properti yang telah divalidasi
  const { threatLevel, confidence, text, threatType } = analysisResult;

  const getThreatColor = (level: ThreatLevel) => {
    switch (level) {
      case 'safe': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-green-500';
    }
  };

  const getThreatBgColor = (level: ThreatLevel) => {
    switch (level) {
      case 'safe': return 'bg-green-500/10 border-green-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'high': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-green-500/10 border-green-500/30';
    }
  };

  const getThreatIcon = (level: ThreatLevel) => {
    switch (level) {
      case 'safe': 
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'medium': 
        return <ExclamationCircleIcon className="h-8 w-8 text-yellow-500" />;
      case 'high': 
        return <ExclamationCircleIcon className="h-8 w-8 text-red-500" />;
      default: 
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
    }
  };

  const getThreatLabel = (level: ThreatLevel) => {
    switch (level) {
      case 'safe': return t('safe');
      case 'medium': return t('warning');
      case 'high': return t('danger');
      default: return t('safe');
    }
  };

  return (
    <div className={`rounded-lg overflow-hidden bg-slate-800 border border-slate-700 h-full ${animation ? 'animate-pulse' : ''}`}>
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center">
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">{t('threatAnalysis')}</h2>
        </div>
      </div>
      
      <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
        <div className={`p-4 rounded-lg border ${getThreatBgColor(threatLevel)} flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            {getThreatIcon(threatLevel)}
            <div>
              <h3 className={`font-semibold text-lg ${getThreatColor(threatLevel)}`}>
                {getThreatLabel(threatLevel)}
              </h3>
              <p className="text-slate-300 text-sm">
                {t('threatAssessmentComplete')}
              </p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-full px-3 py-1 text-sm font-medium">
            {confidence}% {t('confidence')}
          </div>
        </div>
        
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            {t('confidenceScore')}
          </h3>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${threatLevel === 'safe' ? 'bg-green-500' : threatLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>{confidence}%</span>
            <span>100%</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
              {t('analysisSummary')}
            </h3>
            <p className="text-slate-300">
              {analysisText || (threatLevel === 'safe' 
                ? t('noThreatDetected')
                : t('threatDetected').replace('{threat}', threatType || t('threatType')))}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
              {t('extractedText')}
            </h3>
            <div className="bg-slate-900 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-slate-300 whitespace-pre-wrap break-words">
                {text || t('noTextDetected')}
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
              {t('recommendations')}
            </h3>
            <ul className="space-y-2">
              {safeRecommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {threatType && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                {t('threatType')}
              </h3>
              <div className={`inline-block px-3 py-1 rounded-full text-sm ${getThreatColor(threatLevel)}`}>
                {threatType}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 