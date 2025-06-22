'use client';

import { useState, useEffect } from 'react';
import { EyeIcon, CameraIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  onToggleHistory: () => void;
  onStartScanning: () => void;
}

export default function Header({ onToggleHistory, onStartScanning }: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const { t } = useLanguage();
  
  // Untuk memastikan rendering hanya terjadi di client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    onToggleHistory();
  };

  if (!mounted) return null;

  return (
    <header className="bg-slate-800 border-b border-slate-700 py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Image 
            src="/cyberlens-logo.svg" 
            alt="CyberLens Logo" 
            width={48} 
            height={48}
            priority
          />
          <div>
            <h1 className="text-2xl font-bold text-white">{t('appTitle')}</h1>
            <p className="text-sm text-slate-400">{t('appSubtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            
            <button
              onClick={toggleHistory}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md flex items-center space-x-2"
            >
              <span>{showHistory ? t('hideHistory') : t('showHistory')}</span>
            </button>
            
            <button
              onClick={onStartScanning}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md flex items-center space-x-2 scan-button"
            >
              <CameraIcon className="h-5 w-5" />
              <span>{t('scanNow')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 