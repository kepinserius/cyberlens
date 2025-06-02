export interface CameraOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
}

export const cameraService = {
  videoStream: null as MediaStream | null,
  videoElement: null as HTMLVideoElement | null,
  
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
        facingMode: options.facingMode || 'environment' // Use back camera by default
      };
      
      // Close any existing stream
      this.stopCamera();
      
      // Request camera access with proper error handling
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOptions as MediaTrackConstraints,
          audio: false
        });
      } catch (err) {
        console.error('Camera access error:', err);
        // Mencoba dengan fallback options jika kamera utama gagal
        if (cameraOptions.facingMode === 'environment') {
          // Coba kamera depan jika kamera belakang gagal
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' } as MediaTrackConstraints,
            audio: false
          });
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
      
      // Tunggu hingga video siap untuk dimainkan
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve()).catch(e => {
            console.error('Error playing video:', e);
            resolve();
          });
        };
      });
      
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
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  },
  
  /**
   * Capture a frame from the video stream as a base64 encoded JPEG
   */
  captureFrame(): string {
    if (!this.videoElement) {
      throw new Error('Camera not initialized. Call initCamera() first.');
    }
    
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set canvas dimensions to match video
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      
      // Draw the current video frame to the canvas
      context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
      
      // Get base64 encoded JPEG
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
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
      // Coba untuk mendapatkan izin kamera terlebih dahulu
      // Ini penting karena beberapa browser tidak akan mengembalikan label kamera tanpa izin
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (error) {
        console.warn('Could not get camera permission for device enumeration:', error);
      }
      
      // Dapatkan daftar perangkat
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Jika tidak ada label kamera, tambahkan label default
      return videoDevices.map((device, index) => {
        if (!device.label) {
          return {
            ...device,
            label: `Camera ${index + 1}`
          };
        }
        return device;
      });
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
      
      // Request access to the specific camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      
      // Create and configure video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      
      // Tunggu hingga video siap
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve()).catch(e => {
            console.error('Error playing video:', e);
            resolve();
          });
        };
      });
      
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