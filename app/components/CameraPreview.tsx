'use client';

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Webcam from 'react-webcam';
import { CameraIcon, ArrowPathIcon, ShieldExclamationIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { IMAGE_PROCESSING_CONFIG } from '../config';
import { useLanguage } from '../contexts/LanguageContext';

interface CameraPreviewProps {
  onCapture: (imageSrc: string) => void;
  isScanning: boolean;
}

interface CameraPreviewRef {
  captureImage: () => void;
}

const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewProps>(
  function CameraPreview({ onCapture, isScanning }, ref) {
    const webcamRef = useRef<Webcam>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [isMirror, setIsMirror] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const { t } = useLanguage();

    // Inisialisasi kamera dan permintaan izin
    useEffect(() => {
      let mounted = true;
      let timeoutId: NodeJS.Timeout | null = null;

      const initializeCamera = async () => {
        setIsInitializing(true);
        
        try {
          // Cek apakah browser mendukung getUserMedia
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser Anda tidak mendukung akses kamera. Gunakan browser modern seperti Chrome, Firefox, atau Edge.');
          }

          // Minta izin kamera terlebih dahulu dengan timeout
          const permissionPromise = navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: IMAGE_PROCESSING_CONFIG.maxWidth },
              height: { ideal: IMAGE_PROCESSING_CONFIG.maxHeight },
              facingMode: "environment" 
            } 
          });
          
          // Set timeout untuk permintaan izin
          const timeoutPromise = new Promise<MediaStream>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('Timeout requesting camera permission'));
            }, 10000); // 10 detik timeout
          });
          
          // Race antara permintaan izin dan timeout
          await Promise.race([permissionPromise, timeoutPromise]);
          
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // Dapatkan daftar perangkat kamera
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          if (mounted) {
            if (videoDevices.length === 0) {
              throw new Error('Tidak ada kamera yang terdeteksi pada perangkat Anda.');
            }
            
            // Pilih kamera belakang secara default jika tersedia
            const backCamera = videoDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('belakang')
            );
            
            setDevices(videoDevices);
            setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
            setPermissionDenied(false);
            setRetryCount(0);
          }
        } catch (error) {
          console.error('Error initializing camera:', error);
          
          if (mounted) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
              setPermissionDenied(true);
              setCameraError('Izin kamera ditolak. Silakan berikan izin kamera melalui pengaturan browser Anda.');
            } else if (error instanceof DOMException && error.name === 'NotReadableError') {
              setCameraError('Kamera tidak dapat diakses. Mungkin sedang digunakan oleh aplikasi lain.');
              
              // Retry automatically after a delay
              if (retryCount < 3) {
                const newRetryCount = retryCount + 1;
                setRetryCount(newRetryCount);
                
                setTimeout(() => {
                  if (mounted) {
                    console.log(`Auto-retrying camera initialization (attempt ${newRetryCount})...`);
                    initializeCamera();
                  }
                }, 2000);
              }
            } else {
              setCameraError(`Gagal mengakses kamera: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`);
            }
          }
        } finally {
          if (mounted) {
            setIsInitializing(false);
          }
        }
      };

      initializeCamera();

      return () => {
        mounted = false;
        if (timeoutId) clearTimeout(timeoutId);
        
        // Hentikan stream kamera saat komponen unmount
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
          const stream = webcamRef.current.video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }, [retryCount]);

    const handleUserMedia = () => {
      console.log("Kamera berhasil diinisialisasi");
      setIsCameraReady(true);
      setCameraError(null);
    };

    const handleUserMediaError = (error: string | DOMException) => {
      console.error('Error accessing webcam:', error);
      
      let errorMessage = 'Tidak dapat mengakses kamera.';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setPermissionDenied(true);
          errorMessage = 'Izin kamera ditolak. Silakan berikan izin kamera melalui pengaturan browser Anda.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Tidak ada kamera yang terdeteksi pada perangkat Anda.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Kamera Anda mungkin sedang digunakan oleh aplikasi lain.';
          
          // Auto retry for NotReadableError
          if (retryCount < 3) {
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);
            
            setTimeout(() => {
              console.log(`Auto-retrying after NotReadableError (attempt ${newRetryCount})...`);
              refreshCamera();
            }, 2000);
          }
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setCameraError(errorMessage);
      setIsCameraReady(false);
    };

    const captureImage = () => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          console.log("Image captured successfully");
          onCapture(imageSrc);
        } else {
          console.error('Failed to capture image');
          setCameraError('Gagal mengambil gambar. Silakan coba lagi.');
        }
      } else {
        console.error('Webcam not ready for capture');
        setCameraError('Kamera belum siap. Silakan tunggu sebentar dan coba lagi.');
      }
    };

    // Ekspos fungsi captureImage ke parent component
    useImperativeHandle(ref, () => ({
      captureImage
    }));

    const refreshCamera = () => {
      if (webcamRef.current) {
        const track = webcamRef.current.video?.srcObject as MediaStream;
        if (track) {
          track.getTracks().forEach(t => t.stop());
        }
        setIsCameraReady(false);
        setCameraError(null);
        setPermissionDenied(false);
        
        // Re-initialize camera
        setIsInitializing(true);
        setTimeout(() => {
          setIsInitializing(false);
        }, 500);
      }
    };

    const requestCameraPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setPermissionDenied(false);
        setCameraError(null);
        refreshCamera();
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setCameraError('Izin kamera masih ditolak. Silakan ubah pengaturan izin di browser Anda.');
        } else {
          setCameraError(`Gagal mengakses kamera: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`);
        }
      }
    };

    const getVideoConstraints = () => {
      return {
        width: { ideal: IMAGE_PROCESSING_CONFIG.maxWidth },
        height: { ideal: IMAGE_PROCESSING_CONFIG.maxHeight },
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        facingMode: !selectedDeviceId ? "environment" : undefined
      };
    };

    const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDeviceId(e.target.value);
    };

    const toggleMirror = () => {
      setIsMirror(!isMirror);
    };

    return (
      <div className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${isCameraReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <h2 className="text-xl font-semibold text-white">{t('cameraPreview')}</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {devices.length > 1 && (
              <select 
                value={selectedDeviceId} 
                onChange={handleDeviceChange}
                className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            )}
            
            <button 
              onClick={toggleMirror}
              className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded"
              title="Toggle mirror mode"
            >
              <ArrowsRightLeftIcon className="h-5 w-5" />
            </button>
            
            <button 
              onClick={refreshCamera}
              className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded"
              title="Refresh camera"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div 
          ref={containerRef} 
          className="camera-container relative bg-slate-900"
          style={{ aspectRatio: '4/3' }}
        >
          {isInitializing ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-slate-300">Initializing camera...</p>
              </div>
            </div>
          ) : permissionDenied ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <ShieldExclamationIcon className="h-16 w-16 text-amber-500" />
                <h3 className="text-lg font-medium text-white">{t('cameraPermissionRequired')}</h3>
                <p className="text-slate-300">
                  {t('cameraPermissionText')}
                </p>
                <button
                  onClick={requestCameraPermission}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  {t('requestPermission')}
                </button>
              </div>
            </div>
          ) : cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <ShieldExclamationIcon className="h-16 w-16 text-red-500" />
                <h3 className="text-lg font-medium text-white">{t('cameraError')}</h3>
                <p className="text-slate-300">{cameraError}</p>
                <button
                  onClick={refreshCamera}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  {t('tryAgain')}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={isMirror}
                screenshotFormat="image/jpeg"
                screenshotQuality={IMAGE_PROCESSING_CONFIG.jpegQuality}
                videoConstraints={getVideoConstraints()}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                className="w-full h-full object-cover"
              />
              
              {isCameraReady && !isScanning && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <button
                    onClick={captureImage}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
                    disabled={isScanning}
                    aria-label="Capture image"
                  >
                    <CameraIcon className="h-8 w-8" />
                  </button>
                </div>
              )}
              
              {isScanning && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-white">{t('processingImage')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <p className="text-sm text-slate-400">
            {t('cameraInstructions')}
          </p>
        </div>
      </div>
    );
  }
);

export default CameraPreview; 