'use client';

import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../config';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  
  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id');
  };
  
  return (
    <button
      onClick={toggleLanguage}
      className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md flex items-center space-x-2"
      title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
    >
      <GlobeAltIcon className="h-5 w-5" />
      <span>{language === 'id' ? 'EN' : 'ID'}</span>
    </button>
  );
}