@echo off
chcp 65001 >nul
echo ============================================================
echo Check-In App - Build Executable Tool
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python chưa được cài đặt!
    echo Vui lòng cài đặt Python từ https://www.python.org/
    pause
    exit /b 1
)

echo ✓ Python đã được cài đặt
echo.

REM Upgrade pip
echo Đang nâng cấp pip...
python -m pip install --upgrade pip

REM Install required packages for building
echo.
echo Đang cài đặt các gói cần thiết...
python -m pip install pyinstaller

REM Install application dependencies
echo.
echo Đang cài đặt các thư viện của ứng dụng...
python -m pip install -r requirements.txt

REM Build the executable
echo.
echo ============================================================
echo Bước 1: Build file .exe với PyInstaller
echo ============================================================
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
    --collect-all=pyzbar ^
    web_app.py

if errorlevel 1 (
    echo.
    echo ❌ Lỗi khi build file .exe
    pause
    exit /b 1
)

echo.
echo ============================================================
echo BUILD HOÀN TẤT!
echo ============================================================
echo.
echo File thực thi: dist\CheckInApp.exe
echo.
echo LƯU Ý QUAN TRỌNG:
echo - File source.xlsx cần được đặt cùng thư mục với CheckInApp.exe
echo - Khi chạy lần đầu, ứng dụng sẽ tự động tải các gói cần thiết
echo - File .exe có thể chạy trên mọi máy Windows (32-bit/64-bit)
echo.
echo ============================================================
pause
