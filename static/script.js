let html5QrCode = null;
let lastScannedCode = null;
let lastScanTime = 0;
const SCAN_COOLDOWN = 3000; // 3 seconds cooldown
let isScanning = false;
let qrBoxSize = 250; // Default QR box size

// Initialize camera and QR scanner
async function initCamera() {
    // Show loading status
    showStatus('info', '⏳ Đang khởi động camera...');
    
    try {
        // Check if Html5Qrcode is available
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Thư viện html5-qrcode chưa được tải');
        }
        
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        
        if (!devices || devices.length === 0) {
            throw new Error('Không tìm thấy camera. Vui lòng kiểm tra camera của bạn.');
        }
        
        console.log('Found cameras:', devices);
        
        // Prefer back camera if available
        let cameraId = devices[0].id;
        
        for (let device of devices) {
            const label = device.label || '';
            console.log('Camera:', label);
            if (label.toLowerCase().includes('back')) {
                cameraId = device.id;
                break;
            }
        }
        
        console.log('Using camera:', cameraId);
        
        // Start scanning with config
        const config = {
            fps: 10,
            qrbox: { width: qrBoxSize, height: qrBoxSize },
            aspectRatio: 1.0
        };
        
        await html5QrCode.start(
            cameraId,
            config,
            (decodedText, decodedResult) => {
                // Handle successful scan
                console.log('QR detected:', decodedText);
                handleQRCode(decodedText);
            },
            (errorMessage) => {
                // Scan error - ignore (happens frequently when no QR in view)
            }
        );
        
        isScanning = true;
        console.log('Camera started successfully');
        showStatus('success', '✅ Camera đã sẵn sàng! Quét mã QR để check-in');
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
            document.getElementById('status-message').innerHTML = '';
        }, 3000);
        
    } catch (err) {
        console.error('Camera initialization error:', err);
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
        
        // Show troubleshooting tips
        const statusContainer = document.getElementById('status-message');
        const currentUrl = window.location.href;
        const isSecure = window.location.protocol === 'https:' || 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
        
        let tips = `
            <div style="margin-top: 10px; font-size: 0.9rem;">
                <strong>Hướng dẫn khắc phục:</strong><br>`;
        
        if (!isSecure) {
            tips += `
                <div style="color: #dc3545; font-weight: bold; margin: 10px 0;">
                    ⚠️ QUAN TRỌNG: Bạn đang truy cập từ địa chỉ không an toàn!<br>
                    Vui lòng truy cập từ: <strong>http://localhost:5000</strong>
                </div>`;
        }
        
        tips += `
                1. Truy cập từ <strong>http://localhost:5000</strong> (không phải IP khác)<br>
                2. Cho phép trình duyệt truy cập camera<br>
                3. Kiểm tra camera có hoạt động không<br>
                4. Thử trình duyệt khác (Chrome/Edge khuyến nghị)<br>
                5. Đảm bảo không có ứng dụng khác đang dùng camera
            </div>
        `;
        
        statusContainer.innerHTML += tips;
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
    
    // Show scanning status
    showStatus('info', '🔍 Đang xử lý...');
    
    try {
        const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ qr_code: qrCode })
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
