@echo off
chcp 65001 >nul
title Check-In App - Fast Build
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║        CHECK-IN APP - BUILD CÔNG CỤ NHANH                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [X] Lỗi: Python chưa được cài đặt!
    echo.
    echo Vui lòng tải và cài đặt Python từ:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [✓] Python: OK
echo.

REM Install dependencies
echo ────────────────────────────────────────────────────────────
echo Bước 1/3: Cài đặt dependencies...
echo ────────────────────────────────────────────────────────────
echo.
python -m pip install --upgrade pip --quiet
python -m pip install pyinstaller --quiet
python -m pip install -r requirements.txt --quiet

if errorlevel 1 (
    echo [X] Lỗi khi cài đặt dependencies
    pause
    exit /b 1
)

echo [✓] Dependencies: OK
echo.

REM Clean old build
echo ────────────────────────────────────────────────────────────
echo Bước 2/3: Dọn dẹp build cũ...
echo ────────────────────────────────────────────────────────────
echo.
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist CheckInApp.spec del /q CheckInApp.spec
echo [✓] Dọn dẹp: OK
echo.

REM Build
echo ────────────────────────────────────────────────────────────
echo Bước 3/3: Build ứng dụng...
echo ────────────────────────────────────────────────────────────
echo.

pyinstaller --clean --noconfirm ^
    --name=CheckInApp ^
    --onefile ^
    --noconsole ^
    --add-data="templates;templates" ^
    --add-data="static;static" ^
    --hidden-import=pyzbar ^
    --hidden-import=pyzbar.pyzbar ^
    --hidden-import=cv2 ^
    --hidden-import=pandas ^
    --hidden-import=openpyxl ^
    --hidden-import=flask ^
    --hidden-import=msoffcrypto ^
    --hidden-import=jinja2 ^
    --hidden-import=werkzeug ^
    --hidden-import=numpy ^
    --collect-all=pyzbar ^
    --collect-all=cv2 ^
    web_app.py

if errorlevel 1 (
    echo.
    echo [X] Lỗi khi build
    echo.
    pause
    exit /b 1
)

echo.
echo [✓] Build: OK
echo.

REM Create package
echo ────────────────────────────────────────────────────────────
echo Tạo package triển khai...
echo ────────────────────────────────────────────────────────────
echo.

if not exist dist\CheckInApp_Package mkdir dist\CheckInApp_Package
copy dist\CheckInApp.exe dist\CheckInApp_Package\ >nul
copy README.md dist\CheckInApp_Package\ >nul 2>&1
copy HUONG_DAN_BUILD.md dist\CheckInApp_Package\ >nul 2>&1

REM Create run script
(
echo @echo off
echo chcp 65001 ^>nul
echo title Check-In Application
echo cls
echo echo ════════════════════════════════════════════════════════
echo echo    CHECK-IN APPLICATION
echo echo ════════════════════════════════════════════════════════
echo echo.
echo echo Đang khởi động ứng dụng...
echo echo Trình duyệt sẽ tự động mở tại: http://localhost:5000
echo echo.
echo echo Nhấn Ctrl+C để dừng ứng dụng
echo echo ════════════════════════════════════════════════════════
echo echo.
echo timeout /t 2 /nobreak ^>nul
echo start http://localhost:5000
echo CheckInApp.exe
) > dist\CheckInApp_Package\Run_CheckIn.bat

REM Create README
(
echo # CHECK-IN APPLICATION
echo.
echo ## Cách sử dụng
echo.
echo 1. Đặt file source.xlsx vào thư mục này
echo 2. Chạy file Run_CheckIn.bat hoặc CheckInApp.exe
echo 3. Trình duyệt sẽ tự động mở tại http://localhost:5000
echo.
echo ## Yêu cầu
echo.
echo - Windows 7 trở lên
echo - File source.xlsx ^(dữ liệu check-in^)
echo.
echo ## Lưu ý
echo.
echo - Lần chạy đầu tiên có thể hơi lâu
echo - Đảm bảo port 5000 không bị chiếm dụng
echo - Nếu có lỗi, chạy CheckInApp.exe trực tiếp để xem log
echo.
echo ## Hỗ trợ
echo.
echo Tài liệu chi tiết: HUONG_DAN_BUILD.md
) > dist\CheckInApp_Package\README.txt

echo [✓] Package: OK
echo.

REM Success message
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    BUILD THÀNH CÔNG!                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │ File build:                                                │
echo │   • dist\CheckInApp.exe                                    │
echo │                                                            │
echo │ Package triển khai:                                        │
echo │   • dist\CheckInApp_Package\                               │
echo │     - CheckInApp.exe                                       │
echo │     - Run_CheckIn.bat                                      │
echo │     - README.txt                                           │
echo └────────────────────────────────────────────────────────────┘
echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │ HƯỚNG DẪN TRIỂN KHAI:                                      │
echo │                                                            │
echo │ 1. Sao chép thư mục CheckInApp_Package sang máy đích      │
echo │ 2. Đặt file source.xlsx vào thư mục CheckInApp_Package    │
echo │ 3. Chạy Run_CheckIn.bat                                    │
echo │                                                            │
echo │ ✓ Tương thích: Windows 7/8/10/11 (32-bit và 64-bit)       │
echo │ ✓ Không cần cài Python trên máy đích                      │
echo │ ✓ Chạy standalone hoàn toàn                                │
echo └────────────────────────────────────────────────────────────┘
echo.
pause
