// Define threat interface
export interface Threat {
  type: string;
  description: string;
  confidence: number;
}

// Define analysis result interface
export interface AnalysisResult {
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'unknown';
  confidenceScore: number;
  summary: string;
  details?: string[];
  threats?: Threat[];
  recommendations: string[];
  timestamp: number | string;
}

// Define scan history item interface
export interface ScanHistoryItem {
  id: string;
  imageData: string;
  result: AnalysisResult;
  timestamp: number;
}

// Define window with Node.js require for Electron
declare global {
  interface Window {
    require?: (module: string) => any;
  }
}