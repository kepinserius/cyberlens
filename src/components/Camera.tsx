"use client"

import { useRef, useEffect, useState } from "react"
import { Camera, CameraIcon as Capture, AlertCircle, RotateCcw, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface CameraProps {
  onCapture: (imageData: string) => void
  isScanning: boolean
}

// Mock camera service for demonstration
const cameraService = {
  videoElement: null as HTMLVideoElement | null,
  videoStream: null as MediaStream | null,

  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter((device) => device.kind === "videoinput")
    } catch (error) {
      console.error("Error getting camera devices:", error)
      return []
    }
  },

  captureFrame(): string {
    if (!this.videoElement) {
      throw new Error("Video element not available")
    }

    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Canvas context not available")
    }

    canvas.width = this.videoElement.videoWidth
    canvas.height = this.videoElement.videoHeight
    context.drawImage(this.videoElement, 0, 0)

    return canvas.toDataURL("image/jpeg", 0.8)
  },
}

export default function CameraComponent({ onCapture, isScanning }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Request camera permission and get available cameras
  const requestCameraPermission = async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true })

      // Get available cameras after permission is granted
      const devices = await cameraService.getAvailableCameras()
      setCameraDevices(devices)

      if (devices.length > 0) {
        setSelectedDeviceId(devices[0].deviceId)
        setHasPermission(true)
        return devices
      } else {
        setError("No camera devices found. Please connect a camera and try again.")
        return []
      }
    } catch (err) {
      console.error("Camera permission error:", err)
      setHasPermission(false)
      setError("Failed to initialize camera. Please check permissions.")
      return []
    }
  }

  // Stop camera stream
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  // Start camera with specific device
  const startCamera = async (deviceId?: string) => {
    try {
      setError(null)
      setIsRetrying(true)

      // Stop any existing stream
      stopCameraStream()

      // Camera options
      const cameraOptions: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "environment",
      }

      // Use specific device if provided
      if (deviceId) {
        delete cameraOptions.facingMode
        cameraOptions.deviceId = { exact: deviceId }
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOptions,
          audio: false,
        })
      } catch (err) {
        // Fallback to front camera if back camera fails
        if (!deviceId) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
          })
        } else {
          throw err
        }
      }

      // Store stream reference
      streamRef.current = stream

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // Update camera service
        cameraService.videoElement = videoRef.current
        cameraService.videoStream = stream

        setIsCameraActive(true)
      }
    } catch (err) {
      console.error("Camera initialization error:", err)
      setError("Failed to initialize camera. Please check permissions.")
    } finally {
      setIsRetrying(false)
    }
  }

  // Initialize camera on mount
  useEffect(() => {
    const initCamera = async () => {
      const devices = await requestCameraPermission()
      if (devices.length > 0) {
        await startCamera()
      }
    }

    initCamera()

    // Cleanup on unmount
    return () => {
      stopCameraStream()
    }
  }, [])

  // Handle camera device change
  const handleCameraChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    await startCamera(deviceId)
  }

  // Handle retry
  const handleRetry = async () => {
    setIsCameraActive(false)
    setIsRetrying(true)
    setError(null)

    const devices = await requestCameraPermission()
    if (devices.length > 0) {
      await startCamera(selectedDeviceId || undefined)
    }
  }

  // Handle manual capture with countdown
  const handleCaptureClick = () => {
    if (!isCameraActive) return

    try {
      setCountdown(3)

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval)

            if (prev === 1) {
              try {
                const imageData = cameraService.captureFrame()
                onCapture(imageData)
              } catch (err) {
                setError("Failed to capture image")
                console.error("Image capture error:", err)
              }
            }

            return null
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError("Failed to capture image")
      console.error("Image capture error:", err)
    }
  }

  // Auto-capture when scanning
  useEffect(() => {
    if (!isScanning || !isCameraActive) return

    const captureInterval = setInterval(() => {
      try {
        const imageData = cameraService.captureFrame()
        onCapture(imageData)
      } catch (err) {
        console.error("Auto-capture error:", err)
      }
    }, 3000) // Capture every 3 seconds

    return () => {
      clearInterval(captureInterval)
    }
  }, [isScanning, isCameraActive, onCapture])

  // Error state
  if (hasPermission === false) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Camera Access Denied</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <Button
            onClick={handleRetry}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Camera View */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {/* Video Element */}
        {isCameraActive && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}

        {/* Loading State */}
        {!isCameraActive && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-full">
                {isRetrying ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {isRetrying ? "Connecting to Camera" : "Initializing Camera"}
            </h3>
            <p className="text-slate-300">Please wait while we set up your camera</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-400 mb-2">Camera Error</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={handleRetry} variant="outline" className="border-red-400 text-red-400 hover:bg-red-950/20">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Scanning Overlay */}
        {isScanning && isCameraActive && (
          <>
            {/* Corner Brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-green-400 animate-pulse"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-green-400 animate-pulse"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-green-400 animate-pulse"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-green-400 animate-pulse"></div>

            {/* Scanning Line */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan"></div>

            {/* Status Indicator */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-green-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                AUTO SCANNING
              </div>
            </div>
          </>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-full h-24 w-24 flex items-center justify-center text-4xl font-bold text-blue-600 animate-pulse shadow-2xl">
              {countdown}
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="flex items-center space-x-4 p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg">
        {/* Camera Selector */}
        <div className="flex-1">
          <Select value={selectedDeviceId} onValueChange={handleCameraChange} disabled={cameraDevices.length === 0}>
            <SelectTrigger className="bg-white/70 dark:bg-slate-700/70">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {cameraDevices.map((device, index) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Manual Capture Button */}
        <Button
          onClick={handleCaptureClick}
          disabled={!isCameraActive}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg"
        >
          <Capture className="h-4 w-4 mr-2" />
          Capture Now
        </Button>
      </div>
    </div>
  )
}
