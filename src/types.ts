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
  threats: Threat[];
  summary: string;
  recommendations: string[];
  details?: string[];
  timestamp: string;
  rawAnalysis?: string;
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

// Camera configuration options
export interface CameraOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  frameRate?: number;
  mirrored?: boolean;
}

// Configuration for external API services
export interface ApiConfig {
  endpoint: string;
  apiKey: string;
}

// Camera device classification
export enum CameraType {
  UNKNOWN = 'unknown',
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  VIRTUAL = 'virtual'
}