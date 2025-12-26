@echo off
title Check-in App Server
cd /d "%~dp0"

echo ============================================================
echo        KHOI DONG SERVER CHECK-IN
echo ============================================================
echo.
echo Dang khoi dong server...
echo.

REM Start the Flask server in background
start /B python web_app.py

REM Wait 3 seconds for server to start
timeout /t 3 /nobreak >nul

echo Server da khoi dong!
echo.
echo Mo trinh duyet...
start http://127.0.0.1:5000/

echo.
echo ============================================================
echo Server dang chay tai: http://127.0.0.1:5000/
echo.
echo Chon khu vuc tren trinh duyet de bat dau
echo.
echo Nhan Ctrl+C de dung server
echo ============================================================
echo.

REM Keep the window open and server running
python web_app.py
