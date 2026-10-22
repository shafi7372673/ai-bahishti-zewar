@echo off
chcp 65001 >nul
title AI Bahishti Zewar - Direct Live Launcher
cd /d "%~dp0"
cls
echo ======================================================================
echo             AI Bahishti Zewar - Direct Live Launcher
echo             بہشتی زیور AI کو براہِ راست انٹرنیٹ پر لائیو کرنا
echo ======================================================================
echo.
echo  1. Local Server shuru kiya ja raha hai...
start /b "" node server.js
timeout /t 3 /nobreak >nul

echo.
echo  2. Internet par Public Live Link banaya ja raha hai...
echo.
echo ======================================================================
echo  Neeche diye gaye Live URL ko kisi bhi mobile ya browser mein kholein:
echo ======================================================================
echo.

call npx --yes localtunnel --port 3000
pause
