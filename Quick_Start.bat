@echo off
cd /d "%~dp0"

REM Start server silently
start /B pythonw web_app.py

REM Wait for server
timeout /t 3 /nobreak >nul

REM Open browser
start http://127.0.0.1:5000/

exit
