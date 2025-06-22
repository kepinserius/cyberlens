import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { CameraIcon } from '@heroicons/react/24/solid';
import { IMAGE_PROCESSING_CONFIG } from '../config';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  isProcessing: boolean;
}

export default function CameraCapture({ onCapture, isProcessing }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoConstraints = {
    width: { ideal: IMAGE_PROCESSING_CONFIG.maxWidth },
    height: { ideal: IMAGE_PROCESSING_CONFIG.maxHeight },
    facingMode: "environment"
  };

  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
    setCameraError(null);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('Camera error:', error);
    setIsCameraReady(false);
    setCameraError(typeof error === 'string' ? error : 'Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin.');
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current && !isProcessing) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        onCapture(imageSrc);
      } else {
        console.error('Failed to capture image');
      }
    }
  }, [webcamRef, onCapture, isProcessing]);

  useEffect(() => {
    // Cleanup function
    return () => {
      // Stop any active streams when component unmounts
      if (webcamRef.current && webcamRef.current.video) {
        const stream = webcamRef.current.video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-gray-100 shadow-lg">
        {cameraError ? (
          <div className="flex h-64 items-center justify-center bg-red-50 p-4 text-center">
            <p className="text-red-600">{cameraError}</p>
          </div>
        ) : (
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-full object-cover"
              screenshotQuality={IMAGE_PROCESSING_CONFIG.jpegQuality}
            />
            
            {isCameraReady && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  onClick={capture}
                  disabled={isProcessing}
                  className={`flex items-center justify-center rounded-full bg-blue-600 p-3 text-white shadow-lg transition-all ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                  }`}
                  aria-label="Capture image"
                >
                  <CameraIcon className="h-8 w-8" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Arahkan kamera ke teks yang ingin dianalisis, lalu tekan tombol untuk mengambil gambar.
        </p>
      </div>
    </div>
  );
} 