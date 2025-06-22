'use client';

import { useState, useEffect } from 'react';
import { ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AnalysisResult, ThreatLevel } from './ThreatAnalysis';
import { useLanguage } from '../contexts/LanguageContext';

interface HistoryPanelProps {
  history: AnalysisResult[];
  onSelectHistory: (result: AnalysisResult) => void;
  onClearHistory: () => void;
}

export default function HistoryPanel({ 
  history, 
  onSelectHistory, 
  onClearHistory 
}: HistoryPanelProps) {
  const { t } = useLanguage();
  
  const getThreatBadgeClass = (level: ThreatLevel) => {
    switch (level) {
      case 'safe': return 'bg-green-500/20 text-green-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'high': return 'bg-red-500/20 text-red-500';
      default: return 'bg-green-500/20 text-green-500';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Pastikan bahwa teks yang ditampilkan bukan berupa JSON string
  const formatText = (text: string) => {
    try {
      // Periksa apakah string adalah JSON
      if (text && typeof text === 'string' && text.trim().startsWith('{') && text.trim().endsWith('}')) {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null) {
          // Jika object JSON, coba gunakan properti text atau content
          return parsed.text || parsed.content || JSON.stringify(parsed).substring(0, 100);
        }
      }
      return text;
    } catch (e) {
      // Bukan JSON valid, gunakan string aslinya
      return text;
    }
  };
  
  // Pastikan properti bahwa item sejarah valid
  const formatHistoryItem = (item: AnalysisResult): AnalysisResult => {
    return {
      ...item,
      text: formatText(item.text),
      recommendations: Array.isArray(item.recommendations) 
        ? item.recommendations 
        : typeof item.recommendations === 'string'
          ? [item.recommendations]
          : ['Tetap berhati-hati dengan konten online']
    };
  };

  if (history.length === 0) {
    return (
      <div className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700 h-full">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">{t('scanHistory')}</h2>
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center h-[calc(100%-4rem)]">
          <p className="text-slate-400 text-center">
            {t('noHistory')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700 h-full">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">{t('scanHistory')}</h2>
        </div>
        <button 
          onClick={onClearHistory}
          className="text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md flex items-center space-x-1"
        >
          <TrashIcon className="h-4 w-4" />
          <span>{t('deleteAll')}</span>
        </button>
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-4rem)]">
        <div className="p-2">
          {history.map((originalItem, index) => {
            const item = formatHistoryItem(originalItem);
            return (
              <div 
                key={index} 
                onClick={() => onSelectHistory(originalItem)}
                className="p-3 rounded-lg mb-2 bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getThreatBadgeClass(item.threatLevel)}`}>
                      {getThreatLabel(item.threatLevel)}
                    </span>
                    <span className="text-slate-300 text-sm">{formatDate(item.timestamp)}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{item.confidence}% {t('confidence')}</span>
                </div>
                
                <div className="bg-slate-800 rounded p-2 max-h-16 overflow-hidden">
                  <p className="text-slate-300 text-sm line-clamp-2">
                    {item.text || t('noText')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 