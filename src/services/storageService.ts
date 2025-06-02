import { AnalysisResult, ScanHistoryItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

// LocalStorage Keys
const SCAN_HISTORY_KEY = 'scanHistory';

// Storage Service for managing scan history
class StorageService {
  // Save a new scan to history
  saveScan(imageData: string, result: AnalysisResult): ScanHistoryItem {
    // Pastikan imageData adalah format data URL lengkap
    let processedImageData = imageData;
    if (!imageData.startsWith('data:image')) {
      processedImageData = `data:image/jpeg;base64,${imageData}`;
    }
    
    const scanItem: ScanHistoryItem = {
      id: uuidv4(),
      imageData: processedImageData,
      result,
      timestamp: Date.now()
    };
    
    // Get existing history
    const history = this.getScanHistory();
    
    // Add new scan to history
    history.unshift(scanItem);
    
    // Store updated history in localStorage
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
    
    return scanItem;
  }
  
  // Get all scan history
  getScanHistory(): ScanHistoryItem[] {
    const historyData = localStorage.getItem(SCAN_HISTORY_KEY);
    if (!historyData) return [];
    
    try {
      return JSON.parse(historyData);
    } catch (error) {
      console.error('Error parsing scan history:', error);
      return [];
    }
  }
  
  // Delete a specific scan from history
  deleteScan(id: string): boolean {
    const history = this.getScanHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updatedHistory));
    return true;
  }
  
  // Clear all scan history
  clearHistory(): boolean {
    localStorage.removeItem(SCAN_HISTORY_KEY);
    return true;
  }
}

export const storageService = new StorageService(); 