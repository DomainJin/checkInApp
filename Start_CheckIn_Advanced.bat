@echo off
title Check-in App Server
cd /d "%~dp0"

echo ============================================================
echo        CHECK-IN APP - SERVER
echo ============================================================
echo.
echo Dang khoi dong server...
echo.

REM Start the Flask server
start /B python web_app.py

REM Wait for server to start
timeout /t 4 /nobreak >nul

echo Server da khoi dong!
echo.
echo Mo trinh duyet...
start "" "http://127.0.0.1:5000/"

echo.
echo ============================================================
echo        SERVER DANG CHAY
echo ============================================================
echo.
echo Truy cap tai: http://127.0.0.1:5000/
echo.
echo Chon khu vuc tren trinh duyet de bat dau check-in
echo.
echo Nhan Ctrl+C de dung server
echo ============================================================
echo.

REM Keep the server running
python web_app.py
