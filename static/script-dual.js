let html5QrCode0 = null;
let html5QrCode1 = null;
let lastScannedCode = null;
let lastScanTime = 0;
const SCAN_COOLDOWN = 3000; // 3 seconds cooldown
let isScanning0 = false;
let isScanning1 = false;
const qrBoxSize = 250;
let availableCameras = [];

// Initialize both cameras
async function initDualCameras() {
    console.log('=== INITIALIZING DUAL CAMERAS ===');
    
    try {
        // Get available cameras first
        availableCameras = await Html5Qrcode.getCameras();
        console.log(`Found ${availableCameras.length} camera(s)`);
        
        availableCameras.forEach((cam, idx) => {
            console.log(`Camera ${idx}:`, cam.label || cam.id);
        });
        
        if (availableCameras.length === 0) {
            showError('Không tìm thấy camera nào. Vui lòng kiểm tra kết nối camera.');
            return;
        }
        
        // Hide camera 2 container if only 1 camera available
        if (availableCameras.length < 2) {
            console.log('Only 1 camera available, hiding camera 2');
            const camera2Container = document.getElementById('qr-reader-1')?.parentElement;
            if (camera2Container) {
                camera2Container.style.display = 'none';
            }
            // Make camera 1 full width
            const camera1Container = document.getElementById('qr-reader-0')?.parentElement;
            if (camera1Container) {
                camera1Container.parentElement.style.gridTemplateColumns = '1fr';
            }
        }
        
        // Initialize camera 0
        await initCamera(0);
        
        // Initialize camera 1 only if available
        if (availableCameras.length >= 2) {
            // Wait longer before initializing camera 1 to avoid conflicts
            setTimeout(async () => {
                await initCamera(1);
            }, 2000);
        }
        
    } catch (err) {
        console.error('Failed to get cameras:', err);
        showError('Không thể truy cập camera. Vui lòng cho phép truy cập camera.');
    }
}

// Initialize a single camera by index
async function initCamera(cameraIndex) {
    const readerId = `qr-reader-${cameraIndex}`;
    const readerElement = document.getElementById(readerId);
    
    if (!readerElement) {
        console.error(`Reader element ${readerId} not found`);
        return;
    }
    
    console.log(`\n=== INITIALIZING CAMERA ${cameraIndex} ===`);
    
    try {
        // Check if Html5Qrcode is available
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Thư viện html5-qrcode chưa được tải');
        }
        
        // Check if camera index is available
        if (cameraIndex >= availableCameras.length) {
            throw new Error(`Camera ${cameraIndex} không tồn tại (chỉ có ${availableCameras.length} camera)`);
        }
        
        // Create Html5Qrcode instance
        const html5QrCode = new Html5Qrcode(readerId);
        
        if (cameraIndex === 0) {
            html5QrCode0 = html5QrCode;
        } else {
            html5QrCode1 = html5QrCode;
        }
        
        const cameraDevice = availableCameras[cameraIndex];
        const cameraId = cameraDevice.id;
        console.log(`Using camera ${cameraIndex}:`, cameraDevice.label || cameraId);
        console.log('Camera ID:', cameraId);
        
        // Camera config - try simpler config first
        const config = {
            fps: 10,
            qrbox: { width: qrBoxSize, height: qrBoxSize }
        };
        
        console.log('Starting camera with config:', config);
        
        // Start camera
        await html5QrCode.start(
            cameraId,
            config,
            (decodedText) => {
                console.log(`Camera ${cameraIndex} detected:`, decodedText);
                handleQRCode(decodedText, cameraIndex);
            },
            (errorMessage) => {
                // Ignore scan errors (happens when no QR in view)
            }
        );
        
        if (cameraIndex === 0) {
            isScanning0 = true;
        } else {
            isScanning1 = true;
        }
        
        console.log(`✅ Camera ${cameraIndex} started successfully`);
        
        // Show success message in the camera div
        setTimeout(() => {
            const infoDiv = readerElement.querySelector('div[style*="padding: 20px"]');
            if (infoDiv) {
                infoDiv.remove();
            }
        }, 2000);
        
    } catch (err) {
        console.error(`❌ Camera ${cameraIndex} initialization failed:`, err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        
        let errorMsg = err.message;
        
        if (err.name === 'NotReadableError') {
            errorMsg = 'Camera đang được sử dụng bởi ứng dụng khác hoặc bị lỗi phần cứng';
        } else if (err.name === 'NotAllowedError') {
            errorMsg = 'Vui lòng cho phép truy cập camera';
        } else if (err.name === 'NotFoundError') {
            errorMsg = 'Không tìm thấy camera';
        }
        
        // Show error in the camera div
        readerElement.innerHTML = `
            <div style="padding: 20px; text-align: center; background: rgba(220, 53, 69, 0.1); border-radius: 10px;">
                <p style="color: #dc3545; font-weight: bold;">❌ Lỗi Camera ${cameraIndex + 1}</p>
                <p style="font-size: 0.9rem; margin: 10px 0;">${errorMsg}</p>
                <p style="font-size: 0.85rem; color: #666; margin: 10px 0;">
                    Camera: ${availableCameras[cameraIndex]?.label || 'Unknown'}
                </p>
                <div style="margin-top: 10px;">
                    <button onclick="retryCamera(${cameraIndex})" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        🔄 Thử lại
                    </button>
                    <button onclick="switchToOpenCV(${cameraIndex})" style="margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        📹 Dùng OpenCV
                    </button>
                    <button onclick="selectDifferentCamera(${cameraIndex})" style="margin: 5px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        🔀 Chọn camera khác
                    </button>
                </div>
            </div>
        `;
    }
}

// Switch to OpenCV mode for specific camera
function switchToOpenCV(cameraIndex) {
    console.log(`Switching camera ${cameraIndex} to OpenCV mode...`);
    const readerId = `qr-reader-${cameraIndex}`;
    const readerElement = document.getElementById(readerId);
    
    if (!readerElement) return;
    
    readerElement.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h4 style="color: #28a745;">🎥 Chế độ OpenCV</h4>
            <div style="margin: 20px auto; max-width: 100%;">
                <img id="opencv-feed-${cameraIndex}" src="/api/opencv-stream/${cameraIndex}" 
                     style="width: 100%; border-radius: 10px; max-height: 400px; object-fit: contain;">
            </div>
        </div>
    `;
    
    // Start polling for QR detection
    startOpenCVPolling(cameraIndex);
}

// Start OpenCV polling for QR detection
function startOpenCVPolling(cameraIndex) {
    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/opencv-qr/${cameraIndex}`);
            const data = await response.json();
            
            if (data.qr_code) {
                handleQRCode(data.qr_code, cameraIndex);
            }
        } catch (error) {
            console.error(`OpenCV polling error for camera ${cameraIndex}:`, error);
        }
    }, 500);
    
    // Store interval ID for cleanup if needed
    window[`opencvPoll${cameraIndex}`] = pollInterval;
}

// Select different camera
function selectDifferentCamera(currentIndex) {
    const readerId = `qr-reader-${currentIndex}`;
    const readerElement = document.getElementById(readerId);
    
    if (!readerElement || availableCameras.length < 2) {
        alert('Không có camera nào khác để chọn');
        return;
    }
    
    let html = `
        <div style="padding: 20px; text-align: center;">
            <h4>📷 Chọn Camera</h4>
            <div style="margin: 20px 0;">
    `;
    
    availableCameras.forEach((cam, idx) => {
        if (idx !== currentIndex) {
            html += `
                <button onclick="useCameraIndex(${currentIndex}, ${idx})" 
                        style="display: block; margin: 10px auto; padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; min-width: 250px; text-align: left;">
                    📹 ${cam.label || `Camera ${idx}`}
                </button>
            `;
        }
    });
    
    html += `
            </div>
            <button onclick="retryCamera(${currentIndex})" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                ← Quay lại
            </button>
        </div>
    `;
    
    readerElement.innerHTML = html;
}

// Use specific camera index for a reader slot
async function useCameraIndex(readerSlot, cameraIndex) {
    console.log(`Using camera ${cameraIndex} for reader slot ${readerSlot}`);
    
    const readerId = `qr-reader-${readerSlot}`;
    const readerElement = document.getElementById(readerId);
    
    if (!readerElement) return;
    
    readerElement.innerHTML = '<p style="text-align: center; padding: 20px;">Đang khởi động camera...</p>';
    
    // Stop existing camera
    const existingCamera = readerSlot === 0 ? html5QrCode0 : html5QrCode1;
    if (existingCamera) {
        try {
            await existingCamera.stop();
        } catch (e) {
            console.log('No camera to stop');
        }
    }
    
    // Start new camera
    try {
        const html5QrCode = new Html5Qrcode(readerId);
        
        if (readerSlot === 0) {
            html5QrCode0 = html5QrCode;
        } else {
            html5QrCode1 = html5QrCode;
        }
        
        const cameraDevice = availableCameras[cameraIndex];
        const cameraId = cameraDevice.id;
        
        const config = {
            fps: 10,
            qrbox: { width: qrBoxSize, height: qrBoxSize }
        };
        
        await html5QrCode.start(
            cameraId,
            config,
            (decodedText) => {
                handleQRCode(decodedText, readerSlot);
            },
            (errorMessage) => {
                // Ignore scan errors
            }
        );
        
        if (readerSlot === 0) {
            isScanning0 = true;
        } else {
            isScanning1 = true;
        }
        
        console.log(`✅ Camera started successfully on slot ${readerSlot}`);
        
    } catch (err) {
        console.error(`Failed to start camera ${cameraIndex}:`, err);
        readerElement.innerHTML = `
            <div style="padding: 20px; text-align: center; background: rgba(220, 53, 69, 0.1); border-radius: 10px;">
                <p style="color: #dc3545;">❌ Không thể khởi động camera</p>
                <button onclick="selectDifferentCamera(${readerSlot})" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Chọn lại
                </button>
            </div>
        `;
    }
}

// Retry camera initialization
async function retryCamera(cameraIndex) {
    console.log(`Retrying camera ${cameraIndex}...`);
    const readerId = `qr-reader-${cameraIndex}`;
    const readerElement = document.getElementById(readerId);
    
    if (readerElement) {
        readerElement.innerHTML = '<p style="text-align: center; padding: 20px;">Đang khởi động camera...</p>';
    }
    
    // Stop existing camera if any
    const existingCamera = cameraIndex === 0 ? html5QrCode0 : html5QrCode1;
    if (existingCamera) {
        try {
            await existingCamera.stop();
        } catch (e) {
            console.log('No camera to stop');
        }
    }
    
    // Wait a bit then retry
    setTimeout(() => {
        initCamera(cameraIndex);
    }, 500);
}

// Show error message
function showError(message) {
    const statusContainer = document.getElementById('status-message');
    if (statusContainer) {
        statusContainer.className = 'status-message status-error';
        statusContainer.innerHTML = `<div><strong>❌ ${message}</strong></div>`;
    }
}

// Handle QR code scan
async function handleQRCode(qrCode, cameraIndex) {
    console.log(`handleQRCode called from camera ${cameraIndex}:`, qrCode);
    
    const currentTime = Date.now();
    
    // Prevent duplicate scans within cooldown period
    if (qrCode === lastScannedCode && (currentTime - lastScanTime) < SCAN_COOLDOWN) {
        console.log('Cooldown active, skipping...');
        return;
    }
    
    lastScannedCode = qrCode;
    lastScanTime = currentTime;
    
    console.log('Processing QR Code:', qrCode);
    
    // Show scanning status
    showStatus('info', `🔍 Đang xử lý... (Camera ${cameraIndex + 1})`);
    
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
            showStatus('success', `${result.message} (Cam ${cameraIndex + 1})`, result);
            addRecentCheckin(result, cameraIndex);
        } else {
            showStatus('error', `${result.message} (Cam ${cameraIndex + 1})`, result);
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
function addRecentCheckin(data, cameraIndex) {
    const recentList = document.getElementById('recent-list');
    
    const item = document.createElement('div');
    item.className = 'checkin-item';
    if (!data.success) {
        item.classList.add('duplicate');
    }
    
    const cameraIcon = cameraIndex === 0 ? '📷' : '📹';
    
    item.innerHTML = `
        <div class="checkin-item-name">${cameraIcon} ${data.name || 'N/A'}</div>
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DUAL CAMERA MODE ===');
    initDualCameras();
    updateStatistics();
    
    // Update statistics every 10 seconds
    setInterval(updateStatistics, 10000);
});
