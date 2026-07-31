@echo off
title Smart Attendance System - Desktop Launcher
echo ========================================================
echo        Smart College Attendance - Starting App
echo ========================================================
echo.

cd /d "%~dp0"
set PATH=%PATH%;C:\Program Files\nodejs

echo Starting local attendance server...
start /b node_modules\.bin\next dev -H 0.0.0.0 -p 3000 > nul 2>&1

echo Server starting on http://localhost:3000
echo Opening app window...
timeout /t 3 > nul

start http://localhost:3000/login

echo App launched successfully! You can keep this window minimized.
