@echo off
chcp 65001 >nul
echo ============================================================
echo Check-In App - Build Portable Package
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

REM Install PyInstaller
echo Đang cài đặt PyInstaller...
python -m pip install --upgrade pip
python -m pip install pyinstaller

REM Install dependencies
echo.
echo Đang cài đặt dependencies...
python -m pip install -r requirements.txt

REM Build with PyInstaller - ONEDIR mode for easier distribution
echo.
echo ============================================================
echo Đang build ứng dụng (Portable Mode)...
echo ============================================================
echo.

pyinstaller --clean --noconfirm ^
    --name=CheckInApp ^
    --onedir ^
    --noconsole ^
    --add-data="templates;templates" ^
    --add-data="static;static" ^
    --add-data="requirements.txt;." ^
    --hidden-import=pyzbar ^
    --hidden-import=pyzbar.pyzbar ^
    --hidden-import=cv2 ^
    --hidden-import=pandas ^
    --hidden-import=openpyxl ^
    --hidden-import=flask ^
    --hidden-import=msoffcrypto ^
    --collect-all=pyzbar ^
    --collect-all=cv2 ^
    web_app.py

if errorlevel 1 (
    echo.
    echo ❌ Lỗi khi build
    pause
    exit /b 1
)

REM Copy additional files to dist folder
echo.
echo Đang sao chép các file bổ sung...
copy README.md dist\CheckInApp\ >nul 2>&1
copy SHORTCUT_GUIDE.md dist\CheckInApp\ >nul 2>&1
copy WEB_GUIDE.md dist\CheckInApp\ >nul 2>&1

REM Create run script in dist folder
echo @echo off > dist\CheckInApp\Run_CheckIn.bat
echo echo Starting Check-In Application... >> dist\CheckInApp\Run_CheckIn.bat
echo echo. >> dist\CheckInApp\Run_CheckIn.bat
echo echo Browser se tu dong mo tai: http://localhost:5000 >> dist\CheckInApp\Run_CheckIn.bat
echo echo. >> dist\CheckInApp\Run_CheckIn.bat
echo start http://localhost:5000 >> dist\CheckInApp\Run_CheckIn.bat
echo CheckInApp.exe >> dist\CheckInApp\Run_CheckIn.bat

echo.
echo ============================================================
echo BUILD HOÀN TẤT!
echo ============================================================
echo.
echo Thư mục ứng dụng: dist\CheckInApp\
echo File chạy: dist\CheckInApp\CheckInApp.exe
echo Hoặc: dist\CheckInApp\Run_CheckIn.bat
echo.
echo LƯU Ý:
echo - Toàn bộ thư mục dist\CheckInApp có thể sao chép sang máy khác
echo - Đặt file source.xlsx vào thư mục dist\CheckInApp
echo - Ứng dụng tương thích với Windows 7/8/10/11 (32-bit và 64-bit)
echo.
echo ============================================================
pause
