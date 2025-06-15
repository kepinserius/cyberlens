#!/bin/bash

# Script to fix camera issues on Orange Pi devices
# This script helps identify and fix common camera issues on Orange Pi devices

echo "CyberLens Camera Diagnostics Tool for Orange Pi"
echo "==============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root (with sudo)"
  exit 1
fi

# Check if we're running on an Orange Pi device
is_orange_pi=false
if grep -q "Orange Pi" /proc/cpuinfo || grep -q "sun" /proc/cpuinfo; then
  echo "✓ Detected Orange Pi device"
  is_orange_pi=true
else
  echo "⚠ This doesn't appear to be an Orange Pi device"
  read -p "Continue anyway? (y/n): " continue_anyway
  if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

# Check for camera modules
echo -e "\nChecking for camera modules..."
if lsmod | grep -q "^videobuf\|^uvcvideo\|^v4l2"; then
  echo "✓ Camera modules detected"
  lsmod | grep -E "^videobuf|^uvcvideo|^v4l2|^sun"
else
  echo "✗ No camera modules detected"
  echo "Attempting to load camera modules..."
  
  # Try to load common camera modules
  modprobe uvcvideo
  modprobe videobuf2_core
  modprobe videobuf2_v4l2
  modprobe videobuf2_memops
  modprobe videobuf2_vmalloc
  
  # Check for Orange Pi specific modules
  if [ "$is_orange_pi" = true ]; then
    modprobe vfe_v4l2
    modprobe gc2035
    modprobe sunxi_csi
    modprobe sunxi_isp
  fi
  
  # Check if modules loaded successfully
  if lsmod | grep -q "^videobuf\|^uvcvideo\|^v4l2"; then
    echo "✓ Camera modules loaded successfully"
  else
    echo "✗ Failed to load camera modules"
  fi
fi

# Check for video devices
echo -e "\nChecking for video devices..."
if [ -e /dev/video0 ]; then
  echo "✓ Video device found"
  ls -l /dev/video*
else
  echo "✗ No video devices found"
  
  # Check if the video group exists
  if grep -q "^video:" /etc/group; then
    echo "✓ Video group exists"
  else
    echo "Creating video group..."
    groupadd video
  fi
  
  # Try to create device node manually
  echo "Attempting to create video device node..."
  mknod /dev/video0 c 81 0
  chmod 666 /dev/video0
  
  if [ -e /dev/video0 ]; then
    echo "✓ Created video device node"
  else
    echo "✗ Failed to create video device node"
  fi
fi

# Check permissions
echo -e "\nChecking permissions..."
if [ -e /dev/video0 ]; then
  echo "Current permissions for video devices:"
  ls -l /dev/video*
  
  echo "Setting correct permissions..."
  chmod 666 /dev/video*
  
  # Add current user to video group
  current_user=$(logname || echo $SUDO_USER)
  if [ ! -z "$current_user" ]; then
    usermod -a -G video "$current_user"
    echo "✓ Added user $current_user to video group"
  fi
fi

# Check for v4l-utils
echo -e "\nChecking for v4l-utils..."
if command -v v4l2-ctl &> /dev/null; then
  echo "✓ v4l2-ctl found"
  
  echo -e "\nDetected cameras:"
  v4l2-ctl --list-devices
  
  echo -e "\nSupported formats for /dev/video0:"
  v4l2-ctl --device /dev/video0 --list-formats-ext || echo "✗ Failed to get camera formats"
else
  echo "✗ v4l2-ctl not found"
  echo "Installing v4l-utils..."
  apt-get update && apt-get install -y v4l-utils
  
  if command -v v4l2-ctl &> /dev/null; then
    echo "✓ v4l-utils installed successfully"
    echo -e "\nDetected cameras:"
    v4l2-ctl --list-devices
  else
    echo "✗ Failed to install v4l-utils"
  fi
fi

# Test camera capture
echo -e "\nTesting camera capture..."
if command -v ffmpeg &> /dev/null; then
  echo "Using ffmpeg to test camera capture (will capture a single frame)..."
  ffmpeg -f v4l2 -i /dev/video0 -frames:v 1 -y /tmp/camera_test.jpg
  
  if [ -f /tmp/camera_test.jpg ]; then
    echo "✓ Camera capture successful - saved to /tmp/camera_test.jpg"
    # Check file size to ensure it's not empty
    file_size=$(stat -c%s "/tmp/camera_test.jpg")
    if [ "$file_size" -gt 1000 ]; then
      echo "✓ Image appears to be valid (size: $file_size bytes)"
    else
      echo "⚠ Image file is suspiciously small, camera might not be working correctly"
    fi
  else
    echo "✗ Camera capture failed"
  fi
else
  echo "ffmpeg not found, skipping capture test"
  echo "Consider installing ffmpeg: apt-get install ffmpeg"
fi

# Browser compatibility check
echo -e "\nChecking browser compatibility..."
if command -v chromium-browser &> /dev/null || command -v chromium &> /dev/null; then
  echo "✓ Chromium browser detected"
  echo "Chromium generally has good compatibility with camera APIs"
elif command -v firefox &> /dev/null; then
  echo "✓ Firefox browser detected"
  echo "Firefox generally has good compatibility with camera APIs"
else
  echo "⚠ No supported browser detected"
  echo "Consider installing Chromium: apt-get install chromium-browser"
fi

# Create browser test page
echo -e "\nCreating camera test page..."
cat > /tmp/camera-test.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Orange Pi Camera Test</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    video { width: 100%; background: #000; }
    .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
    .info { background: #d1ecf1; color: #0c5460; }
    button { padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #0069d9; }
    #log { height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border: 1px solid #ddd; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Orange Pi Camera Test</h1>
  <div id="statusMessage" class="status info">Initializing camera test...</div>
  
  <div>
    <button id="startButton">Start Camera</button>
    <button id="captureButton" disabled>Capture Image</button>
  </div>
  
  <h2>Camera Preview</h2>
  <video id="video" autoplay playsinline></video>
  
  <h2>Captured Image</h2>
  <img id="capturedImage" style="max-width: 100%; display: none;">
  
  <h2>Debug Log</h2>
  <div id="log"></div>
  
  <script>
    const videoElement = document.getElementById('video');
    const captureButton = document.getElementById('captureButton');
    const startButton = document.getElementById('startButton');
    const statusMessage = document.getElementById('statusMessage');
    const capturedImage = document.getElementById('capturedImage');
    const logElement = document.getElementById('log');
    
    let stream = null;
    
    function log(message) {
      console.log(message);
      const entry = document.createElement('div');
      entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
      logElement.appendChild(entry);
      logElement.scrollTop = logElement.scrollHeight;
    }
    
    function setStatus(message, type) {
      statusMessage.textContent = message;
      statusMessage.className = `status ${type}`;
    }
    
    startButton.addEventListener('click', async () => {
      try {
        setStatus('Requesting camera access...', 'info');
        log('Requesting camera access...');
        
        // Try different constraints in sequence
        const constraints = [
          { video: { width: 640, height: 480 } },
          { video: { width: 320, height: 240 } },
          { video: { facingMode: 'environment' } },
          { video: true }
        ];
        
        let success = false;
        let error = null;
        
        for (const constraint of constraints) {
          try {
            log(`Trying constraint: ${JSON.stringify(constraint)}`);
            stream = await navigator.mediaDevices.getUserMedia(constraint);
            log('Camera access granted!');
            success = true;
            break;
          } catch (err) {
            error = err;
            log(`Failed with constraint: ${JSON.stringify(constraint)}, Error: ${err.message}`);
          }
        }
        
        if (!success) {
          throw error || new Error('Failed to access camera with all constraints');
        }
        
        videoElement.srcObject = stream;
        captureButton.disabled = false;
        startButton.disabled = true;
        
        const videoTrack = stream.getVideoTracks()[0];
        log(`Using camera: ${videoTrack.label}`);
        log(`Track settings: ${JSON.stringify(videoTrack.getSettings())}`);
        
        setStatus(`Camera active: ${videoTrack.label}`, 'success');
      } catch (err) {
        log(`Error: ${err.message}`);
        setStatus(`Camera error: ${err.message}`, 'error');
      }
    });
    
    captureButton.addEventListener('click', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        log(`Capturing image (${canvas.width}x${canvas.height})`);
        
        const context = canvas.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        capturedImage.src = imageDataUrl;
        capturedImage.style.display = 'block';
        
        log('Image captured successfully');
        setStatus('Image captured successfully', 'success');
      } catch (err) {
        log(`Capture error: ${err.message}`);
        setStatus(`Capture error: ${err.message}`, 'error');
      }
    });
    
    log('Camera test page loaded');
    setStatus('Click "Start Camera" to begin testing', 'info');
  </script>
</body>
</html>
EOF

echo "Created camera test page at /tmp/camera-test.html"
echo "To test the camera in a browser, run: chromium-browser /tmp/camera-test.html"

# Summary and recommendations
echo -e "\nDiagnostics Summary:"
echo "======================="

if [ "$is_orange_pi" = true ]; then
  echo "1. This is an Orange Pi device"
else
  echo "1. This is NOT an Orange Pi device"
fi

if [ -e /dev/video0 ]; then
  echo "2. Camera device is available at /dev/video0"
else
  echo "2. No camera device was found"
fi

if lsmod | grep -q "^videobuf\|^uvcvideo\|^v4l2"; then
  echo "3. Camera modules are loaded"
else
  echo "3. Camera modules are NOT loaded"
fi

echo -e "\nRecommendations:"
echo "1. If the camera is not detected, try rebooting the device"
echo "2. Make sure the camera is properly connected to the Orange Pi"
echo "3. For CSI cameras, check the ribbon cable connection"
echo "4. For USB cameras, try a different USB port"
echo "5. Open the browser test page to verify camera works in the browser"
echo "6. If camera works in test but not in CyberLens, check browser permissions"

echo -e "\nDone!" 