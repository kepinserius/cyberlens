"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Camera, CameraIcon as Capture, AlertCircle, RotateCcw, Loader2, RefreshCw, FlipHorizontal } from "lucide-react"
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
  const [isMirrored, setIsMirrored] = useState(false)

  // Toggle camera mirroring
  const toggleMirror = useCallback(() => {
    setIsMirrored(prev => {
      const newValue = !prev;
      // Save preference to localStorage
      localStorage.setItem('camera_mirror_mode', newValue ? 'true' : 'false');
      
      // Update camera service mirror mode
      cameraService.setMirrorMode(newValue);
      
      // We'll apply the CSS transform in the render function instead of directly
      // manipulating the DOM to avoid potential issues
      
      return newValue;
    });
  }, []);

  // Load mirror preference on mount
  useEffect(() => {
    const savedMirrorMode = localStorage.getItem('camera_mirror_mode');
    if (savedMirrorMode === 'true') {
      setIsMirrored(true);
      // Update camera service mirror mode
      cameraService.setMirrorMode(true);
    }
  }, []);

  // Request camera permission and get available cameras
  const requestCameraPermission = useCallback(async () => {
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
  }, [])

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
        facingMode: deviceId ? undefined : 'environment',
        mirrored: isMirrored // Pass mirror mode to camera service
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
  }, [stopCameraStream, isMirrored])

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
      setIsRefreshing(true);
      console.log("Refreshing camera devices list...");
      
      // Use cameraService to refresh devices
      const devices = await cameraService.refreshCameraDevices();
      console.log(`Refreshed camera list: found ${devices.length} devices`);
      setCameraDevices(devices);
      
      // Check for external cameras
      const externalCamera = devices.find(device => cameraService.isExternalCamera(device));
      
      if (externalCamera) {
        console.log("External camera detected:", externalCamera.label);
        
        // If we're not already using this external camera, switch to it
        if (externalCamera.deviceId !== selectedDeviceId) {
          console.log("Switching to external camera");
          await handleCameraChange(externalCamera.deviceId);
        }
      }
      
      return devices;
    } catch (err) {
      console.error("Error refreshing camera devices:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to refresh camera list: ${errorMsg}`);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [handleCameraChange, selectedDeviceId]);

  // Initialize camera on component mount
  useEffect(() => {
    // Load mirror preference first
    const savedMirrorMode = localStorage.getItem('camera_mirror_mode') === 'true';
    setIsMirrored(savedMirrorMode);
    cameraService.setMirrorMode(savedMirrorMode);
    
    // Function to initialize camera
    const initializeCamera = async () => {
      try {
        console.log("Initializing camera...")
        
        // Get available camera devices
        const devices = await requestCameraPermission()
        
        // Automatically select external camera if available
        const externalCamera = devices.find(device => cameraService.isExternalCamera(device))
        if (externalCamera) {
          console.log("External camera detected, using it by default:", externalCamera.label)
          setSelectedDeviceId(externalCamera.deviceId)
          await startCamera(externalCamera.deviceId)
        } else if (devices.length > 0) {
          console.log("No external camera found, using first available camera")
          setSelectedDeviceId(devices[0].deviceId)
          await startCamera(devices[0].deviceId)
        }
      } catch (err) {
        console.error("Camera initialization error:", err)
      }
    }
    
    // Start initialization
    initializeCamera()
    
    // Set up device change listener to detect when cameras are connected/disconnected
    const handleDeviceChange = async () => {
      console.log("Device change detected - a camera may have been connected or disconnected");
      await refreshCameraDevices();
    };

    // Add event listener for device changes
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    // Clean up on unmount
    return () => {
      stopCameraStream()
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
  }, [startCamera, stopCameraStream, refreshCameraDevices, requestCameraPermission])

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

  // Capture image from video stream
  const captureImage = useCallback(() => {
    if (!videoRef.current) return
    
    try {
      // Use cameraService to capture frame with mirror mode
      const imageData = cameraService.captureFrame(isMirrored);
      
      // Pass the image data to the parent component
      onCapture(imageData);
    } catch (err) {
      console.error("Error capturing image:", err)
      setError("Failed to capture image. Please try again.")
    }
  }, [onCapture, isMirrored])

  // Handle capture button click
  const handleCaptureClick = useCallback(async () => {
    if (!isCameraActive || !videoRef.current) return
    
    // Start countdown if not already scanning
    if (!isScanning) {
      setCountdown(3)
      
      // Countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer)
            // Trigger capture after countdown
            captureImage()
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else {
      // If already scanning, capture immediately
      captureImage()
    }
  }, [isCameraActive, isScanning, captureImage])

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
        
        // Attempt to capture the frame with mirror mode
        const imageData = cameraService.captureFrame(isMirrored)
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
  }, [isScanning, isCameraActive, onCapture, startCamera, selectedDeviceId, isMirrored])

  // Retry camera connection
  const retryCamera = useCallback(async () => {
    try {
      setIsRetrying(true);
      await stopCameraStream();
      await startCamera(selectedDeviceId);
    } catch (error) {
      console.error("Error retrying camera connection:", error);
      setError("Failed to reconnect to camera. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  }, [stopCameraStream, startCamera]);

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
            className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
            style={{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
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
          
          {/* Mirror Toggle Button */}
          <Button
            onClick={toggleMirror}
            variant={isMirrored ? "default" : "outline"}
            size="icon"
            className="flex-shrink-0"
            title={isMirrored ? "Disable mirror mode" : "Enable mirror mode"}
          >
            <FlipHorizontal className="h-4 w-4" />
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
            {isMirrored && " Mirror mode is enabled."}
          </p>
        ) : cameraDevices.length === 1 ? (
          <p>
            Only one camera detected. If you have an external camera, connect it and click the refresh button.
            {isMirrored && " Mirror mode is enabled."}
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
