@echo off
title Dung Server Check-in

echo ============================================================
echo        DUNG SERVER CHECK-IN
echo ============================================================
echo.
echo Dang tim va dung cac process Python...
echo.

REM Kill all Python processes (be careful with this!)
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM pythonw.exe /T 2>nul

echo.
echo Da dung server!
echo.
pause
