"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Camera, CameraIcon as Capture, AlertCircle, RotateCcw, Loader2, RefreshCw } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { cameraService } from "../services/cameraService"

interface CameraProps {
  onCapture: (imageData: string) => void
  isScanning: boolean
}

export default function CameraComponent({ onCapture, isScanning }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const initAttemptRef = useRef<number>(0) // Track initialization attempts
  const maxInitAttempts = 3 // Maximum number of initialization attempts

  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Request camera permission and get available cameras
  const requestCameraPermission = async () => {
    try {
      setIsRetrying(true)
      console.log("Requesting camera permission...")
      
      // Get available cameras using the cameraService with priority for external cameras
      const devices = await cameraService.getAvailableCamerasWithPriority()
      console.log(`Found ${devices.length} camera devices:`, devices.map(d => d.label))
      setCameraDevices(devices)

      if (devices.length > 0) {
        // Select the first camera by default
        // Ensure we have a valid deviceId
        const validDeviceId = devices[0].deviceId || "default"
        setSelectedDeviceId(validDeviceId)
        setHasPermission(true)
        return devices
      } else {
        setError("No camera devices found. Please connect a camera and try again.")
        setHasPermission(false)
        // Set a default device ID to prevent empty string value
        setSelectedDeviceId("default")
        return []
      }
    } catch (err) {
      console.error("Camera permission error:", err)
      setHasPermission(false)
      const errorMsg = err instanceof Error ? err.message : "Failed to initialize camera"
      setError(`Camera error: ${errorMsg}. Please check connections and permissions.`)
      // Set a default device ID to prevent empty string value
      setSelectedDeviceId("default")
      return []
    } finally {
      setIsRetrying(false)
    }
  }

  // Stop camera stream
  const stopCameraStream = useCallback(() => {
    // Use cameraService to stop the camera properly
    cameraService.stopCamera()
    
    // Also clean up our local references
    if (streamRef.current) {
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsCameraActive(false)
  }, [])

  // Start camera with specific device
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setError(null)
      setIsRetrying(true)
      
      console.log("Starting camera initialization...");

      // Stop any existing stream
      stopCameraStream()

      // Use cameraService to initialize the camera
      await cameraService.initCamera({
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: deviceId ? undefined : 'environment'
      });
      
      // If a specific device was requested, switch to it
      if (deviceId) {
        try {
          console.log(`Switching to specific camera device: ${deviceId}`);
          await cameraService.switchCamera(deviceId);
        } catch (switchErr) {
          console.error("Error switching camera:", switchErr);
          // Continue with the default camera if switch fails
        }
      }
      
      // Attach the video element to our UI
      if (videoRef.current && cameraService.videoElement) {
        // Replace the existing video element's srcObject
        videoRef.current.srcObject = cameraService.videoElement.srcObject;
        
        // Set up event handlers
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current!.play();
            console.log("Video playing successfully in UI component");
            setIsCameraActive(true);
            // Reset init attempts on success
            initAttemptRef.current = 0;
          } catch (playErr) {
            console.error("Error playing video in UI:", playErr);
            setError("Failed to display camera feed. Please try again.");
          }
        };
      } else {
        // Fallback: create a container and append the video from cameraService
        const container = document.createElement('div');
        container.className = 'video-container';
        container.style.width = '100%';
        container.style.height = '100%';
        
        if (videoRef.current && videoRef.current.parentNode && cameraService.videoElement) {
          videoRef.current.parentNode.appendChild(cameraService.videoElement);
          videoRef.current.parentNode.removeChild(videoRef.current);
          setIsCameraActive(true);
        }
      }
      
      // Store stream reference
      streamRef.current = cameraService.videoStream;
      setIsCameraActive(true);
      
    } catch (err) {
      console.error("Camera initialization error:", err)
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      setError(`Camera error: ${errorMsg}. Try reconnecting your camera.`)
      
      // Increment attempt counter and try again if under max attempts
      initAttemptRef.current += 1
      if (initAttemptRef.current < maxInitAttempts) {
        setTimeout(() => {
          console.log(`Retrying camera initialization (attempt ${initAttemptRef.current + 1}/${maxInitAttempts})`)
          startCamera(deviceId)
        }, 2000) // Wait 2 seconds before retry
      }
    } finally {
      setIsRetrying(false)
    }
  }, [stopCameraStream])

  // Handle camera device change
  const handleCameraChange = useCallback(async (deviceId: string) => {
    if (!deviceId) {
      console.error("Empty deviceId provided to handleCameraChange");
      return;
    }
    
    try {
      console.log(`Switching to camera with ID: ${deviceId}`);
      setError(null);
      setIsRetrying(true);
      
      // Completely stop current camera and stream first
      stopCameraStream();
      
      // Force any active video element to stop
      if (videoRef.current) {
        videoRef.current.pause();
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => {
              track.enabled = false;
              track.stop();
            });
          }
          videoRef.current.srcObject = null;
        }
      }
      
      // Update selected device ID
      setSelectedDeviceId(deviceId);
      
      // Force a small delay to ensure clean switch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Directly use switchCamera from cameraService instead of startCamera
      const video = await cameraService.switchCamera(deviceId);
      
      // Update video reference
      if (videoRef.current) {
        // Make sure old srcObject is cleared
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          if (oldStream) {
            oldStream.getTracks().forEach(track => {
              track.enabled = false;
              track.stop();
            });
          }
        }
        
        // Set new srcObject
        videoRef.current.srcObject = video.srcObject;
        
        try {
          await videoRef.current.play();
          console.log("Video playing after camera switch");
        } catch (err) {
          console.error("Error playing video after camera switch:", err);
        }
      }
      
      // Update stream reference and status
      streamRef.current = cameraService.videoStream;
      setIsCameraActive(true);
      console.log(`Successfully switched to camera: ${deviceId}`);
      
      // Verify which camera is active
      if (cameraService.videoStream) {
        const tracks = cameraService.videoStream.getVideoTracks();
        tracks.forEach(track => {
          console.log(`Active video track: ${track.label}, enabled: ${track.enabled}, state: ${track.readyState}`);
        });
      }
    } catch (err) {
      console.error("Error switching camera:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to switch camera: ${errorMsg}`);
      
      // Try to recover by restarting with default camera
      await startCamera();
    } finally {
      setIsRetrying(false);
    }
  }, [stopCameraStream, startCamera]);

  // Refresh camera devices list (useful for detecting newly connected cameras)
  const refreshCameraDevices = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      console.log("Refreshing camera devices list...")
      
      // First stop any active camera
      stopCameraStream();
      
      // Wait a moment for resources to be released
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use the new refreshCameraDevices method with priority for external cameras
      await cameraService.refreshCameraDevices()
      const devices = await cameraService.getAvailableCamerasWithPriority()
      console.log(`After refresh: Found ${devices.length} camera devices:`, devices.map(d => d.label))
      setCameraDevices(devices)
      
      if (devices.length > 0) {
        // Find external camera if available
        const externalCamera = devices.find(device => cameraService.isExternalCamera(device));
        
        // Check if we should switch to an external camera
        if (externalCamera && !devices.find(d => d.deviceId === selectedDeviceId && cameraService.isExternalCamera(d))) {
          console.log("External camera detected, switching to it automatically");
          const validDeviceId = externalCamera.deviceId;
          
          // Use cameraService.switchCamera directly instead of handleCameraChange
          try {
            // Stop current camera first
            stopCameraStream();
            
            // Force a small delay to ensure clean switch
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Update selected device ID before switching
            setSelectedDeviceId(validDeviceId);
            
            // Switch camera
            console.log(`Directly switching to external camera: ${validDeviceId}`);
            const video = await cameraService.switchCamera(validDeviceId);
            
            // Update video reference
            if (videoRef.current) {
              // Make sure old srcObject is cleared
              if (videoRef.current.srcObject) {
                const oldStream = videoRef.current.srcObject as MediaStream;
                if (oldStream) {
                  oldStream.getTracks().forEach(track => {
                    track.enabled = false;
                    track.stop();
                  });
                }
                videoRef.current.srcObject = null;
              }
              
              // Set new srcObject
              videoRef.current.srcObject = video.srcObject;
              await videoRef.current.play();
            }
            
            // Update stream reference and status
            streamRef.current = cameraService.videoStream;
            setIsCameraActive(true);
            console.log(`Successfully switched to external camera: ${validDeviceId}`);
            
            // Verify active tracks
            if (cameraService.videoStream) {
              const tracks = cameraService.videoStream.getVideoTracks();
              tracks.forEach(track => {
                console.log(`Active video track: ${track.label}, enabled: ${track.enabled}, state: ${track.readyState}`);
              });
            }
          } catch (err) {
            console.error("Error switching to external camera:", err);
            await startCamera(); // Fallback to default camera
          }
          return;
        }
        
        // Keep current camera if it still exists in the list
        const currentDeviceExists = devices.some(device => device.deviceId === selectedDeviceId)
        if (!currentDeviceExists) {
          // Switch to the first camera if current one is no longer available
          const validDeviceId = devices[0].deviceId || "default"
          setSelectedDeviceId(validDeviceId)
          await startCamera(validDeviceId)
        } else {
          // Restart current camera to ensure clean state
          await startCamera(selectedDeviceId);
        }
        setHasPermission(true)
      } else {
        setError("No camera devices found after refresh. Please connect a camera and try again.")
      }
    } catch (err) {
      console.error("Camera refresh error:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to refresh camera list"
      setError(`Camera refresh error: ${errorMsg}`)
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedDeviceId, startCamera, stopCameraStream]);

  // Initialize camera on mount and set up device change listener
  useEffect(() => {
    const initCamera = async () => {
      const devices = await requestCameraPermission()
      if (devices.length > 0) {
        // Find external camera if available
        const externalCamera = devices.find(device => cameraService.isExternalCamera(device));
        
        // Ensure we have a valid deviceId - prioritize external camera if available
        const validDeviceId = externalCamera?.deviceId || devices[0].deviceId || "default";
        
        setSelectedDeviceId(validDeviceId)
        console.log(`Initial camera setup with device ID: ${validDeviceId}${externalCamera ? ' (external camera)' : ''}`);
        await startCamera(validDeviceId)
      }
    }

    initCamera()

    // Set up device change listener to detect when cameras are connected/disconnected
    const handleDeviceChange = async () => {
      console.log("Device change detected - a camera may have been connected or disconnected");
      await refreshCameraDevices();
    };

    // Add event listener for device changes
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    // Cleanup on unmount
    return () => {
      stopCameraStream()
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
  }, [startCamera, stopCameraStream, refreshCameraDevices])

  // Handle retry
  const handleRetry = async () => {
    setIsCameraActive(false)
    setIsRetrying(true)
    setError(null)

    const devices = await requestCameraPermission()
    if (devices.length > 0) {
      await startCamera(selectedDeviceId || devices[0].deviceId)
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

    let captureAttempts = 0
    const maxCaptureAttempts = 3
    const captureDelayMs = 3000 // 3 seconds between captures

    const captureInterval = setInterval(() => {
      try {
        // Check if video element and stream are valid using cameraService
        if (!cameraService.videoElement || !cameraService.videoStream || 
            !cameraService.videoElement.videoWidth || 
            !cameraService.videoElement.videoHeight) {
          
          captureAttempts++;
          console.warn(`Camera stream not ready for capture (attempt ${captureAttempts}/${maxCaptureAttempts})`)
          
          // If we've tried too many times, restart the camera
          if (captureAttempts >= maxCaptureAttempts) {
            console.error("Max capture attempts reached, restarting camera")
            captureAttempts = 0
            startCamera(selectedDeviceId)
          }
          return
        }
        
        // Reset capture attempts counter on success
        captureAttempts = 0
        
        // Attempt to capture the frame
        const imageData = cameraService.captureFrame()
        onCapture(imageData)
      } catch (err) {
        console.error("Auto-capture error:", err)
        
        captureAttempts++;
        if (captureAttempts >= maxCaptureAttempts) {
          console.error("Max capture error attempts reached, restarting camera")
          captureAttempts = 0
          startCamera(selectedDeviceId)
        }
      }
    }, captureDelayMs)

    return () => {
      clearInterval(captureInterval)
    }
  }, [isScanning, isCameraActive, onCapture, startCamera, selectedDeviceId])

  // Error state
  if (hasPermission === false) {
    // Check if we're on Linux to provide more specific guidance
    const isLinux = navigator.userAgent.toLowerCase().includes('linux');
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    
    let errorMessage = error;
    let helpText = "Try reconnecting your camera or check browser permissions.";
    
    if (isLinux && !isFirefox && error?.includes("Could not access any camera")) {
      errorMessage = "Camera access failed on Linux";
      helpText = "Linux often works better with Firefox browser for camera access. Try switching browsers or check if your camera is enabled in system settings.";
    }
    
    return (
      <Card className="aspect-video flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Camera Access Denied</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{errorMessage}</p>
          <p className="text-red-600 dark:text-red-300 mb-4 text-sm">{helpText}</p>
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
        {isCameraActive && (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover" 
            onLoadedMetadata={() => console.log("Video element onLoadedMetadata event fired")}
            onPlaying={() => console.log("Video element onPlaying event fired")}
            onError={(e) => console.error("Video element error event:", e)}
          />
        )}

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
            {/* Corner Brackets - Reduced animation intensity */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-green-400 opacity-80"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-green-400 opacity-80"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-green-400 opacity-80"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-green-400 opacity-80"></div>

            {/* Scanning Line - Optimized for Orange Pi */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan transform translateZ(0)"></div>

            {/* Status Indicator - Simplified for performance */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
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
        <div className="flex-1 flex items-center space-x-2">
          <div className="flex-1">
            <Select 
              value={selectedDeviceId || "default"} 
              onValueChange={handleCameraChange} 
              disabled={cameraDevices.length === 0 || isRefreshing}
            >
              <SelectTrigger className="bg-white/70 dark:bg-slate-700/70">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                {cameraDevices.length > 0 ? (
                  cameraDevices.map((device, index) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {cameraService.isExternalCamera(device) ? (
                        <span className="flex items-center">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {device.label || `External Camera ${index + 1}`}
                        </span>
                      ) : (
                        <span>{device.label || `Camera ${index + 1}`}</span>
                      )}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="default">No cameras available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Refresh Button */}
          <Button 
            onClick={refreshCameraDevices} 
            variant="outline" 
            size="icon" 
            className="flex-shrink-0"
            disabled={isRefreshing}
            title="Refresh camera list to detect external cameras"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
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
      
      {/* Camera Status and Help */}
      <div className="text-xs text-slate-600 dark:text-slate-400 px-1 mt-2">
        {cameraDevices.length > 1 ? (
          <p>
            <span className="font-medium text-green-600 dark:text-green-400">✓</span> {cameraDevices.length} cameras detected. 
            Use the dropdown to switch between them.
          </p>
        ) : cameraDevices.length === 1 ? (
          <p>
            Only one camera detected. If you have an external camera, connect it and click the refresh button.
          </p>
        ) : (
          <p>
            No cameras detected. Connect a camera and click the refresh button.
          </p>
        )}
      </div>
    </div>
  )
}
