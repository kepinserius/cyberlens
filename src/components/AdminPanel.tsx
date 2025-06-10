"use client"

import { useState, useEffect } from "react"
import { X, Settings, Key, Palette, Monitor, Download, CheckCircle, AlertCircle, Loader2, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Switch } from "./ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Slider } from "./ui/slider"
import { Badge } from "./ui/badge"
import ThemeSwitcher from "./ThemeSwitcher"
import LanguageSwitcher from "./LanguageSwitcher"

interface AdminPanelProps {
  onClose: () => void
}

interface UpdateStatus {
  checking: boolean
  available: boolean
  currentVersion: string
  latestVersion: string
  error: string | null
}

// Mock config for demonstration
const mockConfig = {
  application: {
    name: "CyberLens",
    version: "2.0.0",
  },
  defaultAIService: "deepseek",
  apiKeys: {
    deepseek: "",
    openai: "",
  },
  ocr: {
    enabled: true,
    useAsBackup: true,
    enhancedProcessing: true,
    createVariations: true,
    languages: "ind+eng",
    minConfidence: 0.3,
  },
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState("system")
  const [deepseekApiKey, setDeepseekApiKey] = useState("")
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [selectedAIService, setSelectedAIService] = useState("deepseek")
  const [ocrSettings, setOcrSettings] = useState({ 
    enabled: true, 
    useAsBackup: true,
    enhancedProcessing: true,
    languages: "ind+eng",
    minConfidence: 0.3
  })
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    currentVersion: mockConfig.application.version,
    latestVersion: "",
    error: null,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Mock notification function
  const addNotification = (message: string, type: "success" | "error" | "info") => {
    console.log(`${type.toUpperCase()}: ${message}`)
  }

  // Check for updates
  const checkForUpdates = async () => {
    try {
      setUpdateStatus((prev) => ({ ...prev, checking: true, error: null }))

      // Simulate checking for updates
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockLatestVersion = "2.0.1"
      const hasUpdate = mockLatestVersion !== mockConfig.application.version

      setUpdateStatus({
        checking: false,
        available: hasUpdate,
        currentVersion: mockConfig.application.version,
        latestVersion: mockLatestVersion,
        error: null,
      })
    } catch (error) {
      setUpdateStatus((prev) => ({
        ...prev,
        checking: false,
        error: "Failed to check for updates. Please try again.",
      }))
    }
  }

  // Perform system update
  const performUpdate = async () => {
    try {
      setUpdateStatus((prev) => ({ ...prev, checking: true, error: null }))

      // Simulate update process
      await new Promise((resolve) => setTimeout(resolve, 3000))

      setUpdateStatus((prev) => ({
        ...prev,
        checking: false,
        available: false,
        currentVersion: prev.latestVersion,
        error: null,
      }))

      addNotification("System updated successfully!", "success")
    } catch (error) {
      setUpdateStatus((prev) => ({
        ...prev,
        checking: false,
        error: "Failed to update system. Please try again.",
      }))
    }
  }

  // Menambahkan fungsi validateApiKey untuk memeriksa kevalidan API key DeepSeek
  const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey || apiKey.trim() === '' || apiKey === 'sk-aa7f7d4aa02946aca25ab8dd7c30ff75') {
      return false;
    }
    
    try {
      const endpoint = 'https://api.deepseek.com/v1/chat/completions';
      
      // Kirim permintaan sederhana untuk validasi
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: "API key validation test"
            }
          ],
          max_tokens: 5
        })
      });
      
      if (response.status === 200 || response.status === 201) {
        return true;
      } else if (response.status === 401 || response.status === 403) {
        console.error('API key tidak valid:', await response.text());
        return false;
      } else {
        // API mungkin valid, tetapi ada masalah lain
        console.warn('Respons API tidak jelas:', response.status);
        return true;
      }
    } catch (error) {
      console.error('Error validasi API key:', error);
      return false;
    }
  };

  // Pada fungsi saveSettings, tambahkan validasi API key
  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Validasi API key DeepSeek jika diubah
      if (deepseekApiKey !== mockConfig.apiKeys.deepseek) {
        const isValid = await validateApiKey(deepseekApiKey);
        
        if (!isValid) {
          setErrorMessage('API key DeepSeek tidak valid. Pastikan Anda memasukkan API key yang benar.');
          setIsSaving(false);
          return;
        }
      }
      
      // Jika valid, simpan ke localStorage (gunakan storageService.saveSecureData jika sudah diimplementasikan)
      const newSettings = {
        ...mockConfig,
        apiKeys: {
          ...mockConfig.apiKeys,
          deepseek: deepseekApiKey,
        },
        ocr: {
          ...mockConfig.ocr,
          enabled: ocrSettings.enabled,
          useAsBackup: ocrSettings.useAsBackup,
        },
        lastValidated: new Date().toISOString()
      };
      
      localStorage.setItem('cyberlensSettings', JSON.stringify(newSettings));
      
      // Update konfigurasi aplikasi
      mockConfig.apiKeys.deepseek = deepseekApiKey;
      mockConfig.ocr.enabled = ocrSettings.enabled;
      mockConfig.ocr.useAsBackup = ocrSettings.useAsBackup;
      
      setSuccessMessage('Pengaturan berhasil disimpan!');
      
      // Auto-close message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage('Terjadi kesalahan saat menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    const loadedDeepseekKey = localStorage.getItem("deepseek_api_key")
    const loadedOpenaiKey = localStorage.getItem("openai_api_key")
    const loadedAIService = localStorage.getItem("selected_ai_service")
    const loadedOcrSettings = localStorage.getItem("ocr_settings")

    if (loadedDeepseekKey) setDeepseekApiKey(loadedDeepseekKey)
    if (loadedOpenaiKey) setOpenaiApiKey(loadedOpenaiKey)
    if (loadedAIService) setSelectedAIService(loadedAIService)
    if (loadedOcrSettings) {
      try {
        setOcrSettings(JSON.parse(loadedOcrSettings))
      } catch (error) {
        console.error("Error parsing OCR settings:", error)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center text-xl font-semibold">
            <Settings className="h-5 w-5 mr-2 text-blue-500" />
            Admin Panel
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="system" className="flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Key className="h-4 w-4 mr-2" />
                API Settings
              </TabsTrigger>
              <TabsTrigger value="update" className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Updates
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
            </TabsList>

            {/* System Information */}
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Application Name</p>
                      <p className="font-medium">{mockConfig.application.name}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Version</p>
                      <p className="font-medium">{mockConfig.application.version}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Platform</p>
                      <p className="font-medium">Web Application</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400">AI Provider</p>
                      <p className="font-medium capitalize">{selectedAIService}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400">OCR Status</p>
                      <div className="flex items-center">
                        <Badge variant={ocrSettings.enabled ? "default" : "secondary"}>
                          {ocrSettings.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Maintenance Mode</p>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Settings */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ai-service">AI Service Provider</Label>
                    <Select value={selectedAIService} onValueChange={setSelectedAIService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deepseek">DeepSeek Vision</SelectItem>
                        <SelectItem value="openai">OpenAI Vision</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="deepseek-api">DeepSeek API Key</Label>
                    <Input
                      id="deepseek-api"
                      type="password"
                      placeholder="sk-*******************"
                      value={deepseekApiKey}
                      onChange={(e) => setDeepseekApiKey(e.target.value)}
                    />
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Get your API key from:{" "}
                      <a
                        href="https://platform.deepseek.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        platform.deepseek.com/api-keys
                      </a>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="openai-api">OpenAI API Key</Label>
                    <Input
                      id="openai-api"
                      type="password"
                      placeholder="sk-*******************"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                    />
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Get your API key from:{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        platform.openai.com/api-keys
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* OCR Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">OCR Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ocr-enabled">Enable OCR</Label>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Enable optical character recognition</p>
                    </div>
                    <Switch
                      id="ocr-enabled"
                      checked={ocrSettings.enabled}
                      onCheckedChange={(checked) => setOcrSettings((prev) => ({ ...prev, enabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ocr-backup">Use as Backup</Label>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Use OCR when API fails</p>
                    </div>
                    <Switch
                      id="ocr-backup"
                      checked={ocrSettings.useAsBackup}
                      onCheckedChange={(checked) => setOcrSettings((prev) => ({ ...prev, useAsBackup: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enhanced-processing">Enhanced Processing</Label>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Use advanced image processing</p>
                    </div>
                    <Switch
                      id="enhanced-processing"
                      checked={ocrSettings.enhancedProcessing}
                      onCheckedChange={(checked) =>
                        setOcrSettings((prev) => ({ ...prev, enhancedProcessing: checked }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="ocr-language">OCR Language</Label>
                    <Select
                      value={ocrSettings.languages}
                      onValueChange={(value) => setOcrSettings((prev) => ({ ...prev, languages: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ind">Bahasa Indonesia</SelectItem>
                        <SelectItem value="eng">English</SelectItem>
                        <SelectItem value="ind+eng">Indonesian + English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="confidence">Minimum Confidence: {ocrSettings.minConfidence.toFixed(1)}</Label>
                    <Slider
                      id="confidence"
                      min={0.1}
                      max={0.9}
                      step={0.1}
                      value={[ocrSettings.minConfidence]}
                      onValueChange={([value]) => setOcrSettings((prev) => ({ ...prev, minConfidence: value }))}
                      className="mt-2"
                    />
                  </div>

                  <Button onClick={saveSettings} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Updates */}
            <TabsContent value="update" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Updates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Current Version</span>
                      <span className="font-medium">{updateStatus.currentVersion}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Latest Version</span>
                      <span className="font-medium">
                        {updateStatus.checking ? "Checking..." : updateStatus.latestVersion || "Unknown"}
                      </span>
                    </div>
                  </div>

                  {updateStatus.error && (
                    <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <span className="text-red-700 dark:text-red-300">{updateStatus.error}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {updateStatus.available && !updateStatus.checking && (
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-green-700 dark:text-green-300">New version available!</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex space-x-3">
                    {!updateStatus.checking ? (
                      <>
                        <Button onClick={checkForUpdates} variant="outline">
                          Check for Updates
                        </Button>
                        {updateStatus.available && <Button onClick={performUpdate}>Update System</Button>}
                      </>
                    ) : (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>{updateStatus.available ? "Updating..." : "Checking for updates..."}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appearance Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-sm mb-2 block">Theme</Label>
                    <div className="flex items-center space-x-3">
                      <ThemeSwitcher />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Toggle between light and dark mode
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">Language</Label>
                    <div className="flex items-center space-x-3">
                      <LanguageSwitcher />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Select your preferred language</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
