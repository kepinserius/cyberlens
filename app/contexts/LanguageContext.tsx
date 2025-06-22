'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { APP_CONFIG, LANGUAGE_CONFIG, Language } from '../config';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(APP_CONFIG.defaultLanguage);
  
  // Load language from localStorage on component mount
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('cyberlens_language');
      if (savedLanguage && (savedLanguage === 'id' || savedLanguage === 'en')) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language settings:', error);
    }
  }, []);
  
  // Save language to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cyberlens_language', language);
    } catch (error) {
      console.error('Error saving language settings:', error);
    }
  }, [language]);
  
  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = LANGUAGE_CONFIG[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Fallback to the key if not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 