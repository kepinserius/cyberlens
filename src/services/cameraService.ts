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
   * Initialize the camera and return a video element
   * @param options Camera options for constraints
   */
  async initCamera(options: CameraOptions = {}): Promise<HTMLVideoElement> {
    try {
      console.log("CameraService: Initializing camera with options:", options);
      
      // Default options - optimized for Orange Pi performance
      const cameraOptions: CameraOptions = {
        width: options.width || 1280,
        height: options.height || 720,
        frameRate: options.frameRate || 30,
        facingMode: options.facingMode || 'environment' // Use back camera by default
      };
      
      // Close any existing stream
      this.stopCamera();
      
      // Request camera access with proper error handling and timeout
      let stream;
      try {
        console.log("CameraService: Requesting user media with constraints:", cameraOptions);
        
        // First try to enumerate devices to check if cameras exist
        const devices = await this.getAvailableCameras();
        if (devices.length === 0) {
          throw new Error("No camera devices detected on this system");
        }
        
        console.log(`CameraService: Found ${devices.length} camera devices before requesting access`);
        
        // Try with specific device ID if available
        if (devices.length > 0 && !cameraOptions.facingMode) {
          console.log(`CameraService: Trying first available camera: ${devices[0].label}`);
          
          const streamPromise = navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: devices[0].deviceId },
              width: { ideal: cameraOptions.width || 1280 },
              height: { ideal: cameraOptions.height || 720 },
              frameRate: { ideal: cameraOptions.frameRate || 30, min: 10 }
            } as MediaTrackConstraints,
            audio: false
          });
          
          // Tambahkan timeout untuk mencegah hanging pada perangkat Orange Pi
          const timeoutPromise = new Promise<MediaStream>((_, reject) => {
            setTimeout(() => reject(new Error("Camera access timed out after 10 seconds")), 10000);
          });
          
          stream = await Promise.race([streamPromise, timeoutPromise]);
          console.log(`CameraService: Successfully obtained camera stream for device: ${devices[0].label}`);
        } else {
          // Try with facingMode constraint
          const streamPromise = navigator.mediaDevices.getUserMedia({
            video: cameraOptions as MediaTrackConstraints,
            audio: false
          });
          
          // Tambahkan timeout untuk mencegah hanging pada perangkat Orange Pi
          const timeoutPromise = new Promise<MediaStream>((_, reject) => {
            setTimeout(() => reject(new Error("Camera access timed out after 10 seconds")), 10000);
          });
          
          stream = await Promise.race([streamPromise, timeoutPromise]);
          console.log("CameraService: Successfully obtained camera stream with facingMode");
        }
      } catch (err) {
        console.error('CameraService: Camera access error:', err);
        // Mencoba dengan fallback options jika kamera utama gagal
        if (cameraOptions.facingMode === 'environment') {
          try {
            console.log("CameraService: Trying fallback to front camera");
            // Coba kamera depan jika kamera belakang gagal
            stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 15 }
              } as MediaTrackConstraints,
              audio: false
            });
            console.log("CameraService: Front camera fallback successful");
          } catch (frontErr) {
            console.error('CameraService: Front camera fallback failed:', frontErr);
            // Coba dengan constraints minimal sebagai upaya terakhir
            console.log("CameraService: Attempting with minimal constraints");
            try {
              // Try with just { video: true } - most basic constraint
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
              });
              console.log("CameraService: Minimal constraints successful");
            } catch (minErr) {
              console.error('CameraService: Even minimal constraints failed:', minErr);
              
              // Special handling for Orange Pi - try with specific resolutions known to work
              try {
                console.log("CameraService: Trying Orange Pi specific settings (320x240)");
                stream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    width: { exact: 320 },
                    height: { exact: 240 },
                    frameRate: { ideal: 15 }
                  },
                  audio: false
                });
                console.log("CameraService: Orange Pi specific settings successful");
              } catch (orangePiErr) {
                console.error('CameraService: Orange Pi specific settings failed:', orangePiErr);
                throw new Error("Could not access any camera on this device");
              }
            }
          }
        } else {
          // Re-throw error jika sudah mencoba semua opsi
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
      video.muted = true;
      video.volume = 0;
      video.autoplay = true;
      video.playsInline = true;
      
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
      } catch (e) {
        console.error('Error cleaning up video element:', e);
      }
      this.videoElement = null;
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
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
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
      // Coba untuk mendapatkan izin kamera terlebih dahulu dengan timeout
      try {
        console.log("CameraService: Requesting camera permission for enumeration");
        
        // Try with minimal constraints first
        const permissionPromise = navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false
        });
        
        const timeoutPromise = new Promise<MediaStream>((_, reject) => {
          setTimeout(() => reject(new Error('Permission request timed out')), 5000);
        });
        
        const stream = await Promise.race([permissionPromise, timeoutPromise]);
        
        // Immediately stop the stream after getting permission
        stream.getTracks().forEach(track => track.stop());
        console.log("CameraService: Successfully got camera permission for enumeration");
      } catch (error) {
        console.warn('CameraService: Could not get camera permission for device enumeration:', error);
        // Continue anyway - we might still get device info
      }
      
      // Dapatkan daftar perangkat
      console.log("CameraService: Enumerating media devices");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Jika tidak ada label kamera, tambahkan label default
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
      
      // Log temuan perangkat kamera untuk debugging
      console.log(`CameraService: Found ${labeledDevices.length} camera devices:`, 
        labeledDevices.map(d => d.label));
      
      // Special handling for Orange Pi - add a fake camera if none detected but we're on Linux
      if (labeledDevices.length === 0) {
        try {
          const userAgent = navigator.userAgent.toLowerCase();
          if (userAgent.includes('linux')) {
            console.log("CameraService: No cameras detected but running on Linux - might be Orange Pi camera issue");
            
            // Create a fake camera device for Orange Pi
            const fakeCamera = {
              deviceId: "orange-pi-camera",
              groupId: "orange-pi",
              kind: "videoinput" as MediaDeviceKind,
              label: "Orange Pi Camera",
              toJSON: () => { return {} }
            };
            
            return [fakeCamera];
          }
        } catch (e) {
          console.error("CameraService: Error in Orange Pi camera detection:", e);
        }
      }
      
      return labeledDevices;
    } catch (error) {
      console.error('CameraService: Error getting camera devices:', error);
      return [];
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
      
      // Handle special case for Orange Pi camera
      if (deviceId === "orange-pi-camera") {
        console.log("CameraService: Using special handling for Orange Pi camera");
        
        // Try different resolutions that might work on Orange Pi
        const resolutions = [
          { width: 640, height: 480 },
          { width: 320, height: 240 },
          { width: 1280, height: 720 }
        ];
        
        let stream = null;
        let error = null;
        
        // Try each resolution until one works
        for (const resolution of resolutions) {
          try {
            console.log(`CameraService: Trying Orange Pi camera with resolution ${resolution.width}x${resolution.height}`);
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: resolution.width },
                height: { ideal: resolution.height },
                frameRate: { ideal: 15 }
              },
              audio: false
            });
            
            console.log(`CameraService: Successfully accessed Orange Pi camera at ${resolution.width}x${resolution.height}`);
            break;
          } catch (err) {
            error = err;
            console.warn(`CameraService: Failed with resolution ${resolution.width}x${resolution.height}:`, err);
          }
        }
        
        if (!stream) {
          console.error("CameraService: All Orange Pi camera resolutions failed");
          throw error || new Error("Could not access Orange Pi camera");
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, min: 10 }
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