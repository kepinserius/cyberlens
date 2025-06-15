export interface CameraOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  frameRate?: number;
}

export const cameraService = {
  videoStream: null as MediaStream | null,
  videoElement: null as HTMLVideoElement | null,
  lastFrameTime: 0,
  minFrameInterval: 200, // Minimal interval antara frames (ms) untuk mencegah overhead
  
  /**
   * Check browser support and compatibility issues
   * @returns Object with support information
   */
  checkBrowserSupport(): { 
    isLinux: boolean; 
    isChrome: boolean; 
    isFirefox: boolean;
    hasMediaDevices: boolean;
    hasGetUserMedia: boolean;
    recommendedBrowser: string;
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    const isLinux = userAgent.includes('linux');
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
    const isFirefox = userAgent.includes('firefox');
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    // Use type assertion for deprecated methods
    const nav = navigator as any;
    const hasGetUserMedia = !!(nav.getUserMedia || nav.webkitGetUserMedia || 
                            nav.mozGetUserMedia || nav.msGetUserMedia);
    
    // Determine recommended browser based on OS
    let recommendedBrowser = "Chrome";
    if (isLinux) {
      recommendedBrowser = "Firefox"; // Firefox often works better with cameras on Linux
    }
    
    return {
      isLinux,
      isChrome,
      isFirefox,
      hasMediaDevices,
      hasGetUserMedia,
      recommendedBrowser
    };
  },
  
  /**
   * Initialize the camera and return a video element
   * @param options Camera options for constraints
   */
  async initCamera(options: CameraOptions = {}): Promise<HTMLVideoElement> {
    try {
      console.log("CameraService: Initializing camera with options:", options);
      
      // Check browser support
      const browserSupport = this.checkBrowserSupport();
      console.log("CameraService: Browser support info:", browserSupport);
      
      // Special handling for Linux
      if (browserSupport.isLinux) {
        console.log("CameraService: Linux system detected, using specialized camera initialization");
        
        // Make sure to release any existing camera resources
        this.stopCamera();
        
        // Try with Linux-specific approach
        try {
          // Try with absolute minimal constraints first
          console.log("CameraService: Using Linux-specific minimal constraints");
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true, // Just use {video: true} for Linux
            audio: false
          });
          
          console.log("CameraService: Successfully obtained Linux camera stream");
          
          // Create and configure video element with all possible compatibility attributes
          const video = document.createElement('video');
          
          // Set all possible attributes for maximum compatibility
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('autoplay', 'true');
          video.muted = true;
          video.volume = 0;
          video.autoplay = true;
          video.playsInline = true;
          
          // Set the stream as source
          video.srcObject = stream;
          
          // Force a play attempt immediately
          try {
            await video.play();
            console.log("CameraService: Linux video.play() successful");
          } catch (playErr) {
            console.warn("CameraService: Linux play attempt failed, will retry:", playErr);
          }
          
          // Store references
          this.videoStream = stream;
          this.videoElement = video;
          
          return video;
        } catch (err) {
          console.error("CameraService: Linux-specific camera approach failed:", err);
          
          // Provide more helpful error message for Linux users
          if (browserSupport.isChrome && browserSupport.recommendedBrowser === "Firefox") {
            throw new Error("Camera access failed on Linux. Try using Firefox browser instead, or check if your camera is properly connected and enabled in your system settings.");
          }
          // Fall through to standard approach
        }
      }
      
      // Default options - optimized for lower resolution to prevent resource allocation issues
      const defaultOptions: CameraOptions = {
        width: options.width || 640, // Reduced from 1280 to 640 for better compatibility
        height: options.height || 480, // Reduced from 720 to 480 for better compatibility
        frameRate: options.frameRate || 15, // Reduced from 30 to 15 for better compatibility
        facingMode: options.facingMode || 'environment' // Use back camera by default
      };
      
      // Make sure to release any existing camera resources
      this.stopCamera();
      
      // Force garbage collection if available (might help with resource allocation)
      if (typeof window.gc === 'function') {
        try {
          window.gc();
          console.log("CameraService: Forced garbage collection");
        } catch (e) {
          console.log("CameraService: Garbage collection not available");
        }
      }
      
      // Request camera access with proper error handling and timeout
      let stream;
      try {
        console.log("CameraService: Requesting user media with constraints:", defaultOptions);
        
        // First try to enumerate devices to check if cameras exist
        const devices = await this.getAvailableCameras();
        if (devices.length === 0) {
          throw new Error("No camera devices detected on this system");
        }
        
        console.log(`CameraService: Found ${devices.length} camera devices before requesting access`);
        
        // Try with lowest possible resolution first to avoid resource allocation issues
        const lowResConstraints = {
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 15 }
          },
          audio: false
        };
        
        console.log("CameraService: Trying with minimal resolution first:", lowResConstraints);
        
        const timeoutPromise = new Promise<MediaStream>((_, reject) => {
          setTimeout(() => reject(new Error("Camera access timed out after 10 seconds")), 10000);
        });
        
        try {
          // First try with minimal constraints
          stream = await Promise.race([
            navigator.mediaDevices.getUserMedia(lowResConstraints),
            timeoutPromise
          ]);
          console.log("CameraService: Successfully obtained camera stream with minimal resolution");
        } catch (lowResError) {
          console.warn("CameraService: Failed with minimal resolution, trying user-specified resolution");
          
          // If minimal resolution fails, try with user-specified resolution
          // Try with specific device ID if available
          if (devices.length > 0 && !defaultOptions.facingMode) {
            console.log(`CameraService: Trying first available camera: ${devices[0].label}`);
            
            const streamPromise = navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: devices[0].deviceId },
                width: { ideal: defaultOptions.width || 640 },
                height: { ideal: defaultOptions.height || 480 },
                frameRate: { ideal: defaultOptions.frameRate || 15 }
              } as MediaTrackConstraints,
              audio: false
            });
            
            stream = await Promise.race([streamPromise, timeoutPromise]);
            console.log(`CameraService: Successfully obtained camera stream for device: ${devices[0].label}`);
          } else {
            // Try with facingMode constraint
            const streamPromise = navigator.mediaDevices.getUserMedia({
              video: defaultOptions as MediaTrackConstraints,
              audio: false
            });
            
            stream = await Promise.race([streamPromise, timeoutPromise]);
            console.log("CameraService: Successfully obtained camera stream with facingMode");
          }
        }
      } catch (err) {
        console.error('CameraService: Camera access error:', err);
        
        // Check if the error is related to resource allocation
        const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
        if (errorMessage.includes('failed to allocate') || errorMessage.includes('overconstrained')) {
          console.log("CameraService: Resource allocation error detected, trying with absolute minimal constraints");
          
          try {
            // Try with absolute minimal constraints as last resort
            stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                width: { exact: 160 }, // Extremely low resolution
                height: { exact: 120 },
                frameRate: { exact: 10 }
              },
              audio: false
            });
            console.log("CameraService: Minimal constraints successful");
          } catch (minError) {
            // If that still fails, try with just {video: true}
            console.log("CameraService: Trying with {video: true} as last resort");
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            console.log("CameraService: Basic video constraint successful");
          }
        } else if (defaultOptions.facingMode === 'environment') {
          // Try fallback to front camera if back camera fails
          try {
            console.log("CameraService: Trying fallback to front camera");
            stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                facingMode: 'user',
                width: { ideal: 320 },
                height: { ideal: 240 },
                frameRate: { ideal: 15 }
              } as MediaTrackConstraints,
              audio: false
            });
            console.log("CameraService: Front camera fallback successful");
          } catch (frontErr) {
            console.error('CameraService: Front camera fallback failed:', frontErr);
            
            // Try with absolute minimal constraints as last resort
            try {
              console.log("CameraService: Attempting with minimal constraints");
          stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            audio: false
          });
              console.log("CameraService: Minimal constraints successful");
            } catch (minErr) {
              console.error('CameraService: Even minimal constraints failed:', minErr);
              throw new Error("Could not access any camera on this device. Please check permissions and try a different browser.");
            }
          }
        } else {
          // Re-throw error if we've tried all options
          throw err;
        }
      }
      
      // Create and configure video element
      console.log("CameraService: Creating video element");
      const video = document.createElement('video');
      
      // Try to fix common browser/Chrome issues
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('controls', 'false');
      video.muted = true;
      video.volume = 0;
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.height = 'auto';
      
      // Set the stream as source
      try {
        video.srcObject = stream;
        console.log("CameraService: Set stream as video source");
      } catch (streamErr) {
        console.error("CameraService: Error setting srcObject:", streamErr);
        // Fallback for older browsers
        try {
          // @ts-ignore - For very old browsers that don't support srcObject
          video.src = URL.createObjectURL(stream);
          console.log("CameraService: Used URL.createObjectURL fallback");
        } catch (urlErr) {
          console.error("CameraService: Fallback also failed:", urlErr);
          throw new Error("Browser cannot display camera stream");
        }
      }
      
      // Force a play attempt immediately
      try {
        await video.play();
        console.log("CameraService: Initial video.play() successful");
      } catch (playErr) {
        console.warn("CameraService: Initial play attempt failed (may succeed later):", playErr);
      }
      
      // Tunggu hingga video siap untuk dimainkan dengan timeout
      console.log("CameraService: Waiting for video to be ready...");
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          const loadTimeout = setTimeout(() => {
            reject(new Error('Video loading timeout after 10 seconds'));
          }, 10000);
          
          // Set up multiple event handlers to increase chances of success
          const handleVideoReady = () => {
            clearTimeout(loadTimeout);
            
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              console.warn("CameraService: Video dimensions still zero despite 'loadedmetadata'");
              // We'll still continue, the play() attempt below might fix it
            } else {
              console.log(`CameraService: Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
            }
            
            video.play()
              .then(() => {
                console.log("CameraService: Video playing after metadata loaded");
                resolve();
              })
              .catch(e => {
                console.error('CameraService: Error playing video after metadata:', e);
                reject(e);
              });
          };
          
          video.onloadedmetadata = handleVideoReady;
          video.onloadeddata = () => {
            console.log("CameraService: onloadeddata fired");
            if (!video.onloadedmetadata) handleVideoReady();
          };
          
          // Catch successful play events that might happen before metadata loaded
          video.onplaying = () => {
            console.log("CameraService: onplaying fired");
            clearTimeout(loadTimeout);
            resolve();
          };
        }),
        // Fallback timeout
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Video element loading timeout')), 15000)
        )
      ]);
      
      // Verifikasi stream berfungsi dengan baik
      if (stream.getVideoTracks().length === 0) {
        throw new Error('No video tracks available in the stream');
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      console.log(`CameraService: Video track: ${videoTrack.label}, state: ${videoTrack.readyState}`);
      
      if (videoTrack.readyState !== 'live') {
        console.warn(`CameraService: Video track not live, current state: ${videoTrack.readyState}`);
      }
      
      // Check if we actually have video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("CameraService: Video dimensions still zero after all initialization");
        
        // Try one more time to get dimensions after a short delay
      await new Promise<void>((resolve) => {
          setTimeout(async () => {
            try {
              await video.play();
              console.log(`CameraService: After delay - dimensions: ${video.videoWidth}x${video.videoHeight}`);
            } catch (e) {
              console.error("CameraService: Final play attempt failed:", e);
            }
            resolve();
          }, 1000);
        });
      }
      
      // Tambahkan handler untuk track ended
      videoTrack.onended = () => {
        console.warn('CameraService: Video track ended unexpectedly');
        // Opsional: bisa otomatis restart kamera jika track terputus
      };
      
      // Verify we have valid dimensions before returning
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("CameraService: Returning video element with zero dimensions - may cause issues");
      } else {
        console.log(`CameraService: Final video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      }
      
      // Store references
      this.videoStream = stream;
      this.videoElement = video;
      
      // Return the video element
      return video;
    } catch (error) {
      console.error('CameraService: Camera initialization error:', error);
      throw new Error('Failed to initialize camera: ' + (error instanceof Error ? error.message : String(error)));
    }
  },
  
  /**
   * Stop the camera stream
   */
  stopCamera(): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log(`CameraService: Stopped track: ${track.label}`);
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
      this.videoStream = null;
    }
    
    if (this.videoElement) {
      try {
        if (this.videoElement.srcObject) {
      this.videoElement.srcObject = null;
        }
        this.videoElement.onloadedmetadata = null;
        this.videoElement.onloadeddata = null;
        this.videoElement.onplaying = null;
        this.videoElement.pause();
        
        // Remove from DOM if it's attached
        if (this.videoElement.parentNode) {
          this.videoElement.parentNode.removeChild(this.videoElement);
        }
      } catch (e) {
        console.error('Error cleaning up video element:', e);
      }
      this.videoElement = null;
    }
    
    // Force garbage collection if available
    if (typeof window.gc === 'function') {
      try {
        window.gc();
      } catch (e) {
        // Ignore errors
      }
    }
  },
  
  /**
   * Capture a frame from the video stream as a base64 encoded JPEG
   */
  captureFrame(): string {
    // Throttle frame capture untuk menghindari overhead pada perangkat dengan performa rendah
    const now = Date.now();
    if (now - this.lastFrameTime < this.minFrameInterval) {
      console.debug('Frame capture throttled');
    }
    this.lastFrameTime = now;
    
    if (!this.videoElement) {
      throw new Error('Camera not initialized. Call initCamera() first.');
    }
    
    // Verifikasi video stream berjalan dengan baik
    if (!this.videoElement.videoWidth || !this.videoElement.videoHeight) {
      throw new Error('Video dimensions not available. Stream may not be ready.');
    }
    
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set canvas dimensions to match video
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      
      // Draw the current video frame to the canvas
      context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
      
      // Periksa jika canvas berisi data
      try {
        // Test if we can access pixel data - will throw if canvas is empty/corrupt
        const testData = context.getImageData(0, 0, 1, 1);
        if (!testData || !testData.data || testData.data.length === 0) {
          throw new Error('Canvas contains no image data');
        }
      } catch (pixelError) {
        console.error('Error accessing pixel data:', pixelError);
        throw new Error('Failed to capture valid image data from camera');
      }
      
      // Get base64 encoded JPEG with quality 80% for better performance
      // Reduce quality to 70% to avoid memory issues
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      // Verify that we got valid image data (should start with data:image/jpeg)
      if (!imageData || !imageData.startsWith('data:image/jpeg')) {
        throw new Error('Invalid image data format');
      }
      
      // Return the base64 string
      return imageData;
    } catch (error) {
      console.error('Frame capture error:', error);
      throw new Error('Failed to capture frame from camera');
    }
  },
  
  /**
   * Get a list of available camera devices
   */
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      // Check browser support
      const browserSupport = this.checkBrowserSupport();
      
      // Force device refresh by requesting permission first
      try {
        console.log("CameraService: Requesting camera permission to refresh device list");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
        console.log("CameraService: Successfully got camera permission for device refresh");
      } catch (error) {
        console.warn('CameraService: Could not get camera permission for device refresh:', error);
      }
      
      // Wait a moment for devices to be recognized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get all media devices after permission is granted
      console.log("CameraService: Enumerating all media devices after permission");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log(`CameraService: Found ${videoDevices.length} raw camera devices:`, 
        videoDevices.map(d => ({ id: d.deviceId, label: d.label })));
      
      // On Linux, try a different approach first
      if (browserSupport.isLinux && videoDevices.length === 0) {
        console.log("CameraService: Linux system detected with no cameras, using specialized camera detection");
        
        // Create a fake camera device for Linux systems
        const fakeCamera = {
          deviceId: "default-camera",
          groupId: "default",
          kind: "videoinput" as MediaDeviceKind,
          label: "Default Camera",
          toJSON: () => { return {} }
        };
        
        return [fakeCamera];
      }
      
      // Add labels to devices without labels
      const labeledDevices = videoDevices.map((device, index) => {
        if (!device.label) {
          // Clone the device and add a label
          return {
            deviceId: device.deviceId,
            groupId: device.groupId,
            kind: device.kind,
            label: `Camera ${index + 1}`,
            toJSON: device.toJSON
          };
        }
        return device;
      });
      
      // Log found camera devices for debugging
      console.log(`CameraService: Found ${labeledDevices.length} labeled camera devices:`, 
        labeledDevices.map(d => d.label));
      
      // If no cameras detected, add a default camera
      if (labeledDevices.length === 0) {
        console.log("CameraService: No cameras detected - adding a default camera");
        
        // Create a fake camera device
        const fakeCamera = {
          deviceId: "default-camera",
          groupId: "default",
          kind: "videoinput" as MediaDeviceKind,
          label: "Default Camera",
          toJSON: () => { return {} }
        };
        
        return [fakeCamera];
      }
      
      return labeledDevices;
    } catch (error) {
      console.error('CameraService: Error getting camera devices:', error);
      
      // Return a default camera as fallback
      const fakeCamera = {
        deviceId: "default-camera",
        groupId: "default",
        kind: "videoinput" as MediaDeviceKind,
        label: "Default Camera",
        toJSON: () => { return {} }
      };
      
      return [fakeCamera];
    }
  },
  
  /**
   * Force refresh of available camera devices
   * Useful when connecting/disconnecting external cameras
   */
  async refreshCameraDevices(): Promise<MediaDeviceInfo[]> {
    console.log("CameraService: Forcing camera device refresh");
    
    try {
      // First request permission to trigger device detection
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(track => track.stop());
      
      // Wait a moment for devices to be recognized
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then enumerate devices
      return this.getAvailableCameras();
    } catch (error) {
      console.error("CameraService: Error refreshing camera devices:", error);
      return this.getAvailableCameras(); // Fall back to normal detection
    }
  },
  
  /**
   * Switch to a specific camera by deviceId
   * @param deviceId The ID of the camera device to use
   */
  async switchCamera(deviceId: string): Promise<HTMLVideoElement> {
    try {
      console.log(`CameraService: Switching to camera with ID: ${deviceId}`);
      
      // Close existing stream
      this.stopCamera();
      
      // Handle special case for default camera
      if (deviceId === "default-camera") {
        console.log("CameraService: Using default camera handling for Linux");
        
        // Try different approaches for Linux systems
        const isLinux = navigator.userAgent.toLowerCase().includes('linux');
        if (isLinux) {
          console.log("CameraService: Detected Linux system, using special handling");
          
          // Try with specific Linux-friendly constraints
          try {
            // First try with very basic constraints
            console.log("CameraService: Trying Linux-specific basic video constraint");
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                frameRate: { max: 15 }
              },
              audio: false
            });
            
            if (stream) {
              console.log("CameraService: Successfully accessed Linux camera with basic constraints");
              
              // Create and configure video element
              const video = document.createElement('video');
              video.setAttribute('playsinline', 'true');
              video.setAttribute('webkit-playsinline', 'true');
              video.setAttribute('muted', 'true');
              video.setAttribute('autoplay', 'true');
              video.muted = true;
              video.autoplay = true;
              video.playsInline = true;
              
              video.srcObject = stream;
              
              try {
                await video.play();
                console.log("CameraService: Linux camera video playing");
              } catch (playErr) {
                console.warn("CameraService: Initial play failed, will retry:", playErr);
              }
              
              // Store references
              this.videoStream = stream;
              this.videoElement = video;
              
              return video;
            }
          } catch (err) {
            console.warn("CameraService: Linux basic camera access failed:", err);
          }
        }
        
        // Try different resolutions that might work
        const resolutions = [
          { width: 320, height: 240 },
          { width: 640, height: 480 },
          { width: 160, height: 120 }
        ];
        
        let stream = null;
        let error = null;
        
        // Try each resolution until one works
        for (const resolution of resolutions) {
          try {
            console.log(`CameraService: Trying camera with resolution ${resolution.width}x${resolution.height}`);
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: resolution.width },
                height: { ideal: resolution.height },
                frameRate: { ideal: 15 }
              },
              audio: false
            });
            
            console.log(`CameraService: Successfully accessed camera at ${resolution.width}x${resolution.height}`);
            break;
          } catch (err) {
            error = err;
            console.warn(`CameraService: Failed with resolution ${resolution.width}x${resolution.height}:`, err);
          }
        }
        
        // If all resolutions fail, try with {video: true}
        if (!stream) {
          try {
            console.log("CameraService: Trying with {video: true} as last resort");
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            console.log("CameraService: Successfully accessed camera with basic constraints");
          } catch (basicErr) {
            console.error("CameraService: All camera access attempts failed");
            throw error || basicErr || new Error("Could not access camera");
          }
        }
        
        // Create and configure video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        
        // Wait for video to be ready
        await video.play();
        
        // Store references
        this.videoStream = stream;
        this.videoElement = video;
        
        return video;
      }
      
      // Normal camera switching for standard devices
      // Request access to the specific camera with timeout
      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: deviceId },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        },
        audio: false
      });
      
      const timeoutPromise = new Promise<MediaStream>((_, reject) => {
        setTimeout(() => reject(new Error('Camera switch timed out')), 10000);
      });
      
      const stream = await Promise.race([streamPromise, timeoutPromise]);
      
      // Create and configure video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      
      // Tunggu hingga video siap dengan timeout
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          const loadTimeout = setTimeout(() => {
            reject(new Error('Video loading timeout'));
          }, 10000);
          
        video.onloadedmetadata = () => {
            clearTimeout(loadTimeout);
            video.play()
              .then(() => resolve())
              .catch(e => {
            console.error('Error playing video:', e);
                reject(e);
          });
        };
        }),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Overall timeout switching camera')), 15000)
        )
      ]);
      
      // Store references
      this.videoStream = stream;
      this.videoElement = video;
      
      return video;
    } catch (error) {
      console.error('Camera switch error:', error);
      throw new Error('Failed to switch camera');
    }
  }
}; 