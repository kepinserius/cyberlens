'use client';

import { useLanguage } from '../contexts/LanguageContext';
import { HeartIcon } from '@heroicons/react/24/solid';

export default function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-slate-800 border-t border-slate-700 py-4 px-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-400 text-sm mb-2 md:mb-0">
            © {new Date().getFullYear()} CyberLens - All rights reserved
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-slate-400 hover:text-white text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-slate-400 hover:text-white text-sm">
              Terms of Service
            </a>
          </div>
        </div>
        <p className="text-slate-500 text-xs mt-1">
          Aplikasi ini menggunakan teknologi OCR dan AI untuk mendeteksi ancaman keamanan
        </p>
      </div>
    </footer>
  );
} 