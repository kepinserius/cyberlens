import { AnalysisResult, ScanHistoryItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

// LocalStorage Keys
const SCAN_HISTORY_KEY = 'scanHistory';

// Kunci enkripsi sederhana (dalam implementasi nyata, ini harus lebih aman)
const ENCRYPTION_KEY = 'cyberlens-secure-key-2025';

/**
 * Enkripsi string sederhana menggunakan XOR dengan kunci
 * @param text Text yang akan dienkripsi
 * @returns Text terenkripsi
 */
const encryptData = (text: string): string => {
  if (!text) return text;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  
  // Konversi ke base64 untuk penyimpanan yang aman
  return btoa(result);
};

/**
 * Dekripsi string yang dienkripsi dengan metode XOR
 * @param encryptedText Text terenkripsi dalam format base64
 * @returns Text yang didekripsi
 */
const decryptData = (encryptedText: string): string => {
  if (!encryptedText) return encryptedText;
  
  try {
    // Konversi dari base64
    const text = atob(encryptedText);
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  } catch (error) {
    console.error('Error decrypting data:', error);
    return ''; // Kembalikan string kosong jika dekripsi gagal
  }
};

/**
 * Menyimpan data ke local storage dengan enkripsi opsional
 */
const saveData = (key: string, data: any, encrypt: boolean = false): void => {
  try {
    const stringData = JSON.stringify(data);
    const valueToStore = encrypt ? encryptData(stringData) : stringData;
    localStorage.setItem(key, valueToStore);
  } catch (error) {
    console.error(`Error saving data to key ${key}:`, error);
  }
};

/**
 * Mengambil data dari local storage dengan dekripsi opsional
 */
const getData = (key: string, isEncrypted: boolean = false): any => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const valueToReturn = isEncrypted ? decryptData(data) : data;
    return JSON.parse(valueToReturn);
  } catch (error) {
    console.error(`Error retrieving data from key ${key}:`, error);
    return null;
  }
};

/**
 * Menghapus data dari local storage
 */
const removeData = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
  }
};

// Storage Service for managing scan history
export class StorageService {
  // Add a new scan to history
  addScan(scanItem: any): boolean {
    try {
      // Get current history
      let history = this.getScanHistory();
      
      // Add new scan at the beginning
      history = [scanItem, ...history];
      
      // Limit history size if needed
      const maxHistorySize = 100;
      if (history.length > maxHistorySize) {
        history = history.slice(0, maxHistorySize);
      }
      
      // Store updated history securely
      this.saveScanHistory(history);
      
      return true;
    } catch (error) {
      console.error('Error adding scan to history:', error);
      return false;
    }
  }
  
  // Get all scan history
  getScanHistory(): any[] {
    try {
      const historyData = localStorage.getItem(SCAN_HISTORY_KEY);
      if (!historyData) return [];
      
      // Check if data is encrypted (starts with specific pattern after base64 decode)
      const isEncrypted = historyData.startsWith('eyJ') || historyData.length > 100;
      
      try {
        if (isEncrypted) {
          return JSON.parse(decryptData(historyData));
        } else {
          // Backward compatibility with non-encrypted data
          return JSON.parse(historyData);
        }
      } catch (error) {
        console.error('Error parsing scan history:', error);
        return [];
      }
    } catch (error) {
      console.error('Error retrieving scan history:', error);
      return [];
    }
  }
  
  // Delete a scan from history
  deleteScan(id: string): boolean {
    const history = this.getScanHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    
    this.saveScanHistory(updatedHistory);
    return true;
  }
  
  // Clear all scan history
  clearHistory(): boolean {
    localStorage.removeItem(SCAN_HISTORY_KEY);
    return true;
  }
  
  // Save scan history with encryption
  saveScanHistory(history: any[]): void {
    try {
      const historyJSON = JSON.stringify(history);
      const encryptedHistory = encryptData(historyJSON);
      localStorage.setItem(SCAN_HISTORY_KEY, encryptedHistory);
    } catch (error) {
      console.error('Error saving scan history:', error);
    }
  }
  
  // Secure save for any sensitive data
  saveSecureData(key: string, data: any): boolean {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedData = encryptData(jsonData);
      localStorage.setItem(key, encryptedData);
      return true;
    } catch (error) {
      console.error(`Error saving secure data for key ${key}:`, error);
      return false;
    }
  }
  
  // Get secure data
  getSecureData(key: string): any {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return null;
      
      const decryptedData = decryptData(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error(`Error retrieving secure data for key ${key}:`, error);
      return null;
    }
  }
}

export const storageService = new StorageService(); 