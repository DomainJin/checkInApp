// USB HID Scanner Input Handler
let lastScannedCode = null;
let lastScanTime = 0;
const SCAN_COOLDOWN = 3000; // 3 seconds cooldown
let scanBuffer = '';
let scanTimeout = null;
const SCAN_TIMEOUT_MS = 100; // Time to wait for complete scan
let isFocused = true;

// Function to focus scanner (can be called from HTML button)
window.focusScanner = function() {
    const scannerInput = document.getElementById('scanner-input');
    scannerInput.focus();
    checkFocusStatus();
}

// Check and update focus status
function checkFocusStatus() {
    const scannerInput = document.getElementById('scanner-input');
    const focusWarning = document.getElementById('focus-warning');
    
    if (document.activeElement === scannerInput || document.hasFocus()) {
        isFocused = true;
        if (focusWarning) focusWarning.style.display = 'none';
        console.log('✅ Scanner is focused and ready');
    } else {
        isFocused = false;
        if (focusWarning) focusWarning.style.display = 'block';
        console.log('⚠️ Scanner lost focus');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== USB HID Scanner Mode Initialized ===');
    
    // Focus on hidden input to capture scanner data
    const scannerInput = document.getElementById('scanner-input');
    scannerInput.focus();
    
    // Keep focus on input field
    document.addEventListener('click', () => {
        scannerInput.focus();
        checkFocusStatus();
    });
    
    // Click on warning banner to refocus
    const focusWarning = document.getElementById('focus-warning');
    if (focusWarning) {
        focusWarning.addEventListener('click', () => {
            scannerInput.focus();
            checkFocusStatus();
        });
    }
    
    // Prevent losing focus
    scannerInput.addEventListener('blur', () => {
        setTimeout(() => {
            scannerInput.focus();
            checkFocusStatus();
        }, 100);
    });
    
    // Auto-focus when window becomes active (user returns to this tab)
    window.addEventListener('focus', () => {
        console.log('Window gained focus - refocusing scanner input');
        scannerInput.focus();
        checkFocusStatus();
    });
    
    // Auto-focus when tab becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Tab became visible - refocusing scanner input');
            setTimeout(() => {
                scannerInput.focus();
                checkFocusStatus();
            }, 100);
        } else {
            checkFocusStatus();
        }
    });
    
    // Periodically check focus status
    setInterval(checkFocusStatus, 1000);
    
    // Listen for keyboard input (from USB HID scanner)
    document.addEventListener('keydown', handleScannerInput);
    
    // Load initial statistics
    updateStatistics();
    loadRecentCheckins();
    
    // Update statistics every 5 seconds
    setInterval(updateStatistics, 5000);
    
    // Show ready message
    showStatus('info', '✅ Sẵn sàng nhận dữ liệu từ bộ đọc USB. Hãy quét mã!');
});

// Handle scanner input (keyboard events)
function handleScannerInput(event) {
    const scannerInput = document.getElementById('scanner-input');
    const previewElement = document.getElementById('scanner-preview');
    
    // Ignore special keys (F1-F12, Ctrl, Alt, Shift, etc.)
    if (event.key.startsWith('F') || 
        event.key === 'Control' || 
        event.key === 'Alt' || 
        event.key === 'Shift' ||
        event.key === 'Meta' ||
        event.key === 'Escape' ||
        event.key === 'Tab') {
        return; // Let browser handle these keys normally
    }
    
    // Enter key indicates end of scan
    if (event.key === 'Enter') {
        event.preventDefault();
        
        // Get the complete scanned code
        const scannedCode = scannerInput.value.trim();
        
        // Clear input for next scan
        scannerInput.value = '';
        
        // Process the scanned code if not empty
        if (scannedCode) {
            console.log('Scanned code:', scannedCode);
            previewElement.innerHTML = `<span style="color: #90EE90;">📋 ${scannedCode}</span>`;
            
            // Process check-in
            processCheckin(scannedCode);
        }
        
        return;
    }
    
    // Show preview of current input
    setTimeout(() => {
        const currentValue = scannerInput.value.trim();
        if (currentValue) {
            previewElement.innerHTML = `<span style="color: #FFD700;">⌨️ ${currentValue}</span>`;
        } else {
            previewElement.innerHTML = '<span style="opacity: 0.7;">Chờ quét mã...</span>';
        }
    }, 10);
}

// Process check-in
async function processCheckin(code) {
    try {
        // Check cooldown to prevent duplicate scans
        const currentTime = Date.now();
        if (code === lastScannedCode && (currentTime - lastScanTime) < SCAN_COOLDOWN) {
            console.log('Duplicate scan detected (cooldown active)');
            showStatus('warning', `⏳ Vui lòng đợi ${Math.ceil((SCAN_COOLDOWN - (currentTime - lastScanTime)) / 1000)}s trước khi quét lại`);
            return;
        }
        
        // Update last scan info
        lastScannedCode = code;
        lastScanTime = currentTime;
        
        // Show processing status
        showStatus('info', `⏳ Đang xử lý mã: ${code}...`);
        
        // Send check-in request to server
        const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Success
            showStatus('success', `✅ ${result.message}`, 5000);
            playSuccessSound();
            
            // Update statistics and recent list
            updateStatistics();
            loadRecentCheckins();
        } else {
            // Error or already checked in
            showStatus('error', `❌ ${result.message}`, 5000);
            playErrorSound();
        }
        
    } catch (error) {
        console.error('Check-in error:', error);
        showStatus('error', `❌ Lỗi kết nối: ${error.message}`, 5000);
        playErrorSound();
    }
}

// Show status message
function showStatus(type, message, duration = 3000) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    // Auto hide after duration
    if (duration > 0) {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, duration);
    }
}

// Update statistics
async function updateStatistics() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('stat-total').textContent = stats.total || 0;
        document.getElementById('stat-checked').textContent = stats.checked_in || 0;
        document.getElementById('stat-pending').textContent = stats.pending || 0;
        
        const percentage = stats.total > 0 
            ? ((stats.checked_in / stats.total) * 100).toFixed(1) 
            : '0.0';
        document.getElementById('stat-percentage').textContent = percentage + '%';
        
    } catch (error) {
        console.error('Failed to update statistics:', error);
    }
}

// Load recent check-ins
async function loadRecentCheckins() {
    try {
        const response = await fetch('/api/recent');
        const data = await response.json();
        
        const recentList = document.getElementById('recent-list');
        
        if (data.recent && data.recent.length > 0) {
            recentList.innerHTML = data.recent.map(item => `
                <div class="recent-item">
                    <div class="recent-info">
                        <div class="recent-code">${item.code}</div>
                        <div class="recent-name">${item.name || 'Không có tên'}</div>
                    </div>
                    <div class="recent-time">${item.time}</div>
                </div>
            `).join('');
        } else {
            recentList.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Chưa có check-in nào</div>';
        }
        
    } catch (error) {
        console.error('Failed to load recent check-ins:', error);
    }
}

// Play success sound
function playSuccessSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIHGS57+ehVRkCNIzS79qALAgTYLDp6qVVFAk9md7yt2ohBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp6qVVFApGn+DyvmwhBSl+zfHaizsIFWG56OyiVBgKMojQ79mALAgSXrDp');
        audio.volume = 0.3;
        audio.play();
    } catch (e) {
        // Ignore audio errors
    }
}

// Play error sound
function playErrorSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==');
        audio.volume = 0.2;
        audio.play();
    } catch (e) {
        // Ignore audio errors
    }
}

// Error handler
function showError(message) {
    showStatus('error', '❌ ' + message, 0);
}

console.log('✅ Script-scanner.js loaded successfully');
