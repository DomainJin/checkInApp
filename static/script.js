let html5QrCode = null;
let lastScannedCode = null;
let lastScanTime = 0;
const SCAN_COOLDOWN = 3000; // 3 seconds cooldown
let isScanning = false;
let qrBoxSize = 250; // Default QR box size
let useOpenCVMode = false; // Toggle for OpenCV backend mode

// Initialize camera and QR scanner
async function initCamera() {
    // Show loading status
    showStatus('info', '⏳ Đang khởi động camera...');
    
    console.log('=== STARTING CAMERA INITIALIZATION ===');
    console.log('Browser:', navigator.userAgent);
    console.log('HTTPS:', window.location.protocol === 'https:');
    console.log('Localhost:', window.location.hostname === 'localhost');
    
    try {
        // Check if Html5Qrcode is available
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Thư viện html5-qrcode chưa được tải');
        }
        
        console.log('Html5Qrcode library loaded');
        
        // Stop existing instance if any
        if (html5QrCode) {
            try {
                await html5QrCode.stop();
                console.log('Stopped previous camera instance');
            } catch (e) {
                console.log('No previous instance to stop');
            }
        }
        
        html5QrCode = new Html5Qrcode("qr-reader");
        console.log('Html5Qrcode instance created');
        
        // Get available cameras
        console.log('Requesting camera permissions...');
        const devices = await Html5Qrcode.getCameras();
        
        if (!devices || devices.length === 0) {
            throw new Error('Không tìm thấy camera. Vui lòng kiểm tra camera của bạn.');
        }
        
        console.log('=== AVAILABLE CAMERAS ===');
        console.log('Total cameras found:', devices.length);
        devices.forEach((device, index) => {
            console.log(`Camera ${index}:`, device.label || device.id);
            console.log('  - ID:', device.id);
            console.log('  - Label:', device.label);
        });
        
        // Get camera index from data attribute
        const qrReaderElement = document.getElementById('qr-reader');
        const cameraIndex = parseInt(qrReaderElement.dataset.cameraIndex || '0');
        console.log('Requested camera index:', cameraIndex);
        
        // Use camera by index (0 = first camera, 1 = second camera, etc.)
        let selectedCameraIndex = cameraIndex;
        if (selectedCameraIndex >= devices.length) {
            console.warn(`Camera index ${selectedCameraIndex} not found, using first camera`);
            selectedCameraIndex = 0;
        }
        
        const cameraId = devices[selectedCameraIndex].id;
        console.log(`=== USING CAMERA ${selectedCameraIndex} ===`);
        console.log('Camera ID:', cameraId);
        console.log('Camera Label:', devices[selectedCameraIndex].label || 'Unknown');
        
        // Try multiple configurations for better compatibility
        const configs = [
            // Config 1: Standard
            {
                fps: 10,
                qrbox: { width: qrBoxSize, height: qrBoxSize },
                aspectRatio: 1.0
            },
            // Config 2: Lower FPS for slower cameras
            {
                fps: 5,
                qrbox: { width: qrBoxSize, height: qrBoxSize },
                aspectRatio: 1.0,
                videoConstraints: {
                    facingMode: "environment"
                }
            },
            // Config 3: Specific resolution
            {
                fps: 10,
                qrbox: { width: qrBoxSize, height: qrBoxSize },
                videoConstraints: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            },
            // Config 4: Minimal config
            {
                fps: 10,
                qrbox: qrBoxSize
            }
        ];
        
        console.log('=== TRYING CAMERA CONFIGS ===');
        console.log('Total configs to try:', configs.length);
        
        // Try each config until one works
        let started = false;
        for (let i = 0; i < configs.length; i++) {
            try {
                console.log(`\n--- Config ${i + 1}/${configs.length} ---`);
                console.log('Config details:', JSON.stringify(configs[i], null, 2));
                
                await html5QrCode.start(
                    cameraId,
                    configs[i],
                    (decodedText, decodedResult) => {
                        // Handle successful scan
                        console.log('QR detected:', decodedText);
                        handleQRCode(decodedText);
                    },
                    (errorMessage) => {
                        // Scan error - ignore (happens frequently when no QR in view)
                    }
                );
                started = true;
                console.log(`✅ SUCCESS! Camera started with config ${i + 1}`);
                break;
            } catch (configError) {
                console.error(`❌ Config ${i + 1} failed:`, configError);
                console.error('Error name:', configError.name);
                console.error('Error message:', configError.message);
                if (i === configs.length - 1) {
                    throw configError;
                }
                console.log(`Trying next config...`);
            }
        }
        
        if (!started) {
            throw new Error('Không thể khởi động camera với bất kỳ cấu hình nào');
        }
        
        isScanning = true;
        console.log('=== CAMERA READY ===');
        console.log('isScanning:', isScanning);
        showStatus('success', '✅ Camera đã sẵn sàng! Quét mã QR để check-in');
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
            const statusMsg = document.getElementById('status-message');
            if (statusMsg && statusMsg.textContent.includes('sẵn sàng')) {
                statusMsg.innerHTML = '';
            }
        }, 3000);
        
    } catch (err) {
        console.error('=== CAMERA INITIALIZATION FAILED ===');
        console.error('Error:', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Stack:', err.stack);
        isScanning = false;
        
        let errorMsg = '❌ Lỗi khi khởi động camera';
        
        if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
            errorMsg = '❌ Vui lòng cho phép truy cập camera trong trình duyệt';
        } else if (err.name === 'NotFoundError') {
            errorMsg = '❌ Không tìm thấy camera. Vui lòng kiểm tra kết nối camera.';
        } else if (err.name === 'NotSupportedError' || (err.message && err.message.includes('secure context'))) {
            errorMsg = '❌ Camera chỉ hoạt động trên HTTPS hoặc localhost';
        } else if (err.message) {
            errorMsg = '❌ ' + err.message;
        }
        
        showStatus('error', errorMsg);
        
        // Show OpenCV fallback option
        const statusContainer = document.getElementById('status-message');
        statusContainer.innerHTML += `
            <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong>💡 Giải pháp:</strong><br>
                <button onclick="initCamera()" style="margin: 10px 5px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🔄 Thử lại
                </button>
                <button onclick="switchToOpenCVMode()" style="margin: 10px 5px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    📹 Chuyển sang OpenCV
                </button>
            </div>
        `;
    }
}

// Switch to OpenCV backend mode
function switchToOpenCVMode() {
    useOpenCVMode = true;
    const qrReaderElement = document.getElementById('qr-reader');
    qrReaderElement.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>🎥 Chế độ OpenCV (Backend Camera)</h3>
            <div id="opencv-stream" style="margin: 20px auto; max-width: 640px;">
                <img id="camera-feed" src="" style="width: 100%; border-radius: 10px; display: none;">
                <p>Đang khởi động camera...</p>
            </div>
        </div>
    `;
    
    showStatus('info', '🔄 Đang chuyển sang chế độ OpenCV...');
    startOpenCVStream();
}

// Start OpenCV camera stream
function startOpenCVStream() {
    const qrReaderElement = document.getElementById('qr-reader');
    const cameraIndex = parseInt(qrReaderElement.dataset.cameraIndex || '0');
    const cameraFeed = document.getElementById('camera-feed');
    const streamUrl = `/api/opencv-stream/${cameraIndex}`;
    
    // Start streaming
    cameraFeed.src = streamUrl;
    cameraFeed.style.display = 'block';
    cameraFeed.nextElementSibling.style.display = 'none';
    
    isScanning = true;
    showStatus('success', '✅ Camera OpenCV đã sẵn sàng! Quét mã QR để check-in');
    
    // Poll for QR detection from backend
    setInterval(checkOpenCVDetection, 500);
}

// Check for QR code detection from OpenCV backend
async function checkOpenCVDetection() {
    if (!useOpenCVMode || !isScanning) return;
    
    try {
        const qrReaderElement = document.getElementById('qr-reader');
        const cameraIndex = parseInt(qrReaderElement.dataset.cameraIndex || '0');
        
        const response = await fetch(`/api/opencv-qr/${cameraIndex}`);
        const data = await response.json();
        
        if (data.qr_code) {
            handleQRCode(data.qr_code);
        }
    } catch (error) {
        // Ignore polling errors
    }
}

// Handle QR code scan
async function handleQRCode(qrCode) {
    console.log('handleQRCode called with:', qrCode);
    
    const currentTime = Date.now();
    
    // Prevent duplicate scans within cooldown period
    if (qrCode === lastScannedCode && (currentTime - lastScanTime) < SCAN_COOLDOWN) {
        console.log('Cooldown active, skipping...');
        return;
    }
    
    lastScannedCode = qrCode;
    lastScanTime = currentTime;
    
    console.log('Processing QR Code:', qrCode);
    
    // Get camera index from qr-reader element
    const qrReaderElement = document.getElementById('qr-reader');
    const cameraIndex = parseInt(qrReaderElement.dataset.cameraIndex || '0');
    
    // Show scanning status
    showStatus('info', '🔍 Đang xử lý...');
    
    try {
        const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                qr_code: qrCode,
                camera_index: cameraIndex 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('success', result.message, result);
            addRecentCheckin(result);
        } else {
            showStatus('error', result.message, result);
        }
        
        // Update statistics
        updateStatistics();
        
    } catch (error) {
        console.error('Check-in error:', error);
        showStatus('error', '❌ Lỗi kết nối server');
    }
}

// Show status message
function showStatus(type, message, details = null) {
    const statusContainer = document.getElementById('status-message');
    statusContainer.className = 'status-message';
    
    if (type === 'success') {
        statusContainer.classList.add('status-success');
    } else if (type === 'error') {
        statusContainer.classList.add('status-error');
    } else if (type === 'warning') {
        statusContainer.classList.add('status-warning');
    } else if (type === 'info') {
        statusContainer.classList.add('status-info');
    }
    
    let html = `<div><strong>${message}</strong></div>`;
    
    if (details) {
        html += '<div class="status-info">';
        if (details.employee_id) html += `Mã NV: ${details.employee_id}<br>`;
        if (details.name) html += `Tên: ${details.name}<br>`;
        if (details.area) html += `Khu vực: ${details.area}<br>`;
        if (details.time) html += `Thời gian: ${details.time}`;
        html += '</div>';
    }
    
    statusContainer.innerHTML = html;
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusContainer.style.opacity = '0';
            setTimeout(() => {
                statusContainer.innerHTML = '';
                statusContainer.style.opacity = '1';
            }, 500);
        }, 5000);
    }
}

// Add to recent check-ins list
function addRecentCheckin(data) {
    const recentList = document.getElementById('recent-list');
    
    const item = document.createElement('div');
    item.className = 'checkin-item';
    if (!data.success) {
        item.classList.add('duplicate');
    }
    
    item.innerHTML = `
        <div class="checkin-item-name">${data.name || 'N/A'}</div>
        <div class="checkin-item-details">
            Mã NV: ${data.employee_id || 'N/A'} | 
            Khu vực: ${data.area || 'N/A'} | 
            ${data.time || ''}
        </div>
    `;
    
    // Add to top of list
    recentList.insertBefore(item, recentList.firstChild);
    
    // Keep only last 10 items
    while (recentList.children.length > 10) {
        recentList.removeChild(recentList.lastChild);
    }
}

// Update statistics
async function updateStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const stats = await response.json();
        
        document.getElementById('stat-total').textContent = stats.total || '-';
        document.getElementById('stat-checked').textContent = stats.checked_in || '-';
        document.getElementById('stat-pending').textContent = stats.not_checked_in || '-';
        document.getElementById('stat-percentage').textContent = (stats.percentage || 0) + '%';
        
    } catch (error) {
        console.error('Statistics error:', error);
    }
}

// Handle QR box size change
function handleQRSizeChange() {
    const slider = document.getElementById('qr-size');
    const valueDisplay = document.getElementById('qr-size-value');
    
    if (!slider || !valueDisplay) return;
    
    slider.addEventListener('input', async (e) => {
        const newSize = parseInt(e.target.value);
        qrBoxSize = newSize;
        valueDisplay.textContent = newSize + 'px';
        
        // Restart camera with new size if already running
        if (html5QrCode && isScanning) {
            try {
                await html5QrCode.stop();
                isScanning = false;
                
                // Wait a bit before restarting
                setTimeout(() => {
                    initCamera();
                }, 500);
            } catch (err) {
                console.error('Error restarting camera:', err);
            }
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    updateStatistics();
    handleQRSizeChange();
    
    // Update statistics every 10 seconds
    setInterval(updateStatistics, 10000);
});
