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
      // Default options
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
        const streamPromise = navigator.mediaDevices.getUserMedia({
          video: cameraOptions as MediaTrackConstraints,
          audio: false
        });
        
        // Tambahkan timeout untuk mencegah hanging pada perangkat Orange Pi
        const timeoutPromise = new Promise<MediaStream>((_, reject) => {
          setTimeout(() => reject(new Error("Camera access timed out after 10 seconds")), 10000);
        });
        
        stream = await Promise.race([streamPromise, timeoutPromise]);
      } catch (err) {
        console.error('Camera access error:', err);
        // Mencoba dengan fallback options jika kamera utama gagal
        if (cameraOptions.facingMode === 'environment') {
          try {
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
          } catch (frontErr) {
            console.error('Front camera fallback failed:', frontErr);
            // Coba dengan constraints minimal sebagai upaya terakhir
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        } else {
          // Re-throw error jika sudah mencoba semua opsi
          throw err;
        }
      }
      
      // Create and configure video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true; // Important for iOS
      video.muted = true; // Ensure muted for autoplay
      
      // Tunggu hingga video siap untuk dimainkan dengan timeout
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          const loadTimeout = setTimeout(() => {
            reject(new Error('Video loading timeout after 10 seconds'));
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
      if (videoTrack.readyState !== 'live') {
        throw new Error(`Video track not live, current state: ${videoTrack.readyState}`);
      }
      
      // Tambahkan handler untuk track ended
      videoTrack.onended = () => {
        console.warn('Video track ended unexpectedly');
        // Opsional: bisa otomatis restart kamera jika track terputus
      };
      
      // Store references
      this.videoStream = stream;
      this.videoElement = video;
      
      // Return the video element
      return video;
    } catch (error) {
      console.error('Camera initialization error:', error);
      throw new Error('Failed to initialize camera. Please check camera permissions.');
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
        const permissionPromise = navigator.mediaDevices.getUserMedia({ video: true });
        const timeoutPromise = new Promise<MediaStream>((_, reject) => {
          setTimeout(() => reject(new Error('Permission request timed out')), 5000);
        });
        
        await Promise.race([permissionPromise, timeoutPromise]);
      } catch (error) {
        console.warn('Could not get camera permission for device enumeration:', error);
      }
      
      // Dapatkan daftar perangkat
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
      console.log(`Found ${labeledDevices.length} camera devices:`, 
        labeledDevices.map(d => d.label));
      
      return labeledDevices;
    } catch (error) {
      console.error('Error getting camera devices:', error);
      return [];
    }
  },
  
  /**
   * Switch to a specific camera by deviceId
   * @param deviceId The ID of the camera device to use
   */
  async switchCamera(deviceId: string): Promise<HTMLVideoElement> {
    try {
      // Close existing stream
      this.stopCamera();
      
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