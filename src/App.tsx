'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Camera, Shield, History, Settings, Eye, Scan, StopCircle, PlayCircle, Info, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import CameraComponent from './components/Camera'
import AnalysisResults from './components/AnalysisResults'
import ScanHistory from './components/ScanHistory'
import AdminPanel from './components/AdminPanel'
import ThemeSwitcher from './components/ThemeSwitcher'
import LanguageSwitcher from './components/LanguageSwitcher'
import Notifications from './components/Notifications'

// Mock types for the application
interface AnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown'
  confidenceScore: number
  summary: string
  recommendations: string[]
  timestamp: string
}

interface ScanHistoryItem {
  id: string
  timestamp: string
  image: string
  result: AnalysisResult
}

export default function CyberLensApp() {
  // Component state
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false)
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)

  // Mock functions for demonstration
  const addNotification = (message: string, type: 'info' | 'success' | 'error', duration?: number) => {
    console.log(`${type.toUpperCase()}: ${message}`)
  }

  const t = (key: string) => {
    const translations: Record<string, string> = {
      'app.name': 'CyberLens',
      'app.footer': 'Advanced Threat Detection System',
      'action.hideHistory': 'Hide History',
      'action.showHistory': 'Show History',
      'action.stopScanning': 'Stop Scanning',
      'action.startScanning': 'Start Scanning',
      'scan.stopped': 'Scanning stopped',
      'scan.started': 'Scanning started',
      'analysis.analyzing': 'Analyzing threat...',
      'analysis.completed': 'Analysis completed',
      'analysis.error': 'Analysis failed'
    }
    return translations[key] || key
  }

  // Load scan history from storage
  const loadScanHistory = useCallback(() => {
    // Mock data for demonstration
    const mockHistory: ScanHistoryItem[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        image: '/placeholder.svg?height=100&width=100',
        result: {
          riskLevel: 'low',
          confidenceScore: 85,
          summary: 'No threats detected',
          recommendations: ['Continue monitoring'],
          timestamp: new Date().toISOString()
        }
      }
    ]
    setScanHistory(mockHistory)
  }, [])

  // Load scan history on component mount
  useEffect(() => {
    loadScanHistory()
  }, [loadScanHistory])

  // Add keyboard shortcut for admin panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        setShowAdminPanel(prev => !prev)
        if (!showAdminPanel) {
          addNotification('Admin panel opened', 'info')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAdminPanel])

  // Toggle scanning state
  const toggleScanning = () => {
    const newScanningState = !isScanning
    setIsScanning(newScanningState)
    
    if (!newScanningState) {
      setAnalysisResult(null)
      addNotification(t('scan.stopped'), 'info')
    } else {
      addNotification(t('scan.started'), 'info')
    }
  }

  // Toggle history visibility
  const toggleHistory = () => {
    setShowHistory(!showHistory)
  }

  // Handle image capture from camera
  const handleCapture = async (imageData: string) => {
    try {
      setIsAnalyzing(true)
      addNotification(t('analysis.analyzing'), 'info')
      
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock analysis result
      const mockResult: AnalysisResult = {
        riskLevel: 'medium',
        confidenceScore: 78,
        summary: 'Potential security vulnerability detected',
        recommendations: [
          'Update security protocols',
          'Monitor network traffic',
          'Review access permissions'
        ],
        timestamp: new Date().toISOString()
      }
      
      setAnalysisResult(mockResult)
      addNotification(t('analysis.completed'), 'success')
      
      // Add to history
      const newScan: ScanHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        image: imageData,
        result: mockResult
      }
      setScanHistory(prev => [newScan, ...prev])
      
    } catch (error) {
      console.error('Error analyzing image:', error)
      addNotification(t('analysis.error'), 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('app.name')}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Advanced Threat Detection</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
              
              <Button
                onClick={toggleHistory}
                variant="outline"
                size="sm"
                className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300"
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? t('action.hideHistory') : t('action.showHistory')}
              </Button>
              
              <Button
                onClick={toggleScanning}
                size="sm"
                className={`transition-all duration-300 shadow-lg ${
                  isScanning 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-red-500/25' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/25'
                }`}
              >
                {isScanning ? (
                  <>
                    <StopCircle className="h-4 w-4 mr-2" />
                    {t('action.stopScanning')}
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {t('action.startScanning')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Camera Section */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl font-semibold text-slate-800 dark:text-slate-200">
                <div className="relative mr-3">
                  <div className="absolute inset-0 bg-blue-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>
                Camera Preview
                {isScanning && (
                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-pulse">
                    <Scan className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CameraComponent onCapture={handleCapture} isScanning={isScanning} />
            </CardContent>
          </Card>
          
          {/* Analysis Section */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl font-semibold text-slate-800 dark:text-slate-200">
                <div className="relative mr-3">
                  <div className="absolute inset-0 bg-indigo-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
                Threat Analysis
                {isAnalyzing && (
                  <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">
                    <Zap className="h-3 w-3 mr-1" />
                    Analyzing
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnalysisResults result={analysisResult} isLoading={isAnalyzing} />
            </CardContent>
          </Card>
        </div>
        
        {/* History Section */}
        {showHistory && (
          <Card className="mt-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-slate-800 dark:text-slate-200">
                <div className="relative mr-3">
                  <div className="absolute inset-0 bg-amber-500 rounded-lg blur opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-lg">
                    <History className="h-5 w-5 text-white" />
                  </div>
                </div>
                Scan History
                <Badge variant="outline" className="ml-auto">
                  {scanHistory.length} scans
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScanHistory 
                history={scanHistory} 
                onHistoryUpdated={loadScanHistory} 
              />
            </CardContent>
          </Card>
        )}
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-700/50 text-slate-300">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Info className="h-4 w-4 mr-2 text-blue-400" />
              <span className="text-sm">
                CyberLens v2.0.0 - Advanced Threat Detection System
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="md:hidden flex items-center space-x-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-400" />
                <span className="text-sm">
                  {t('app.footer')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {/* Notifications */}
      <Notifications />
    </div>
  )
}
