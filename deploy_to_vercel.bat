@echo off
title AI Bahishti Zewar - Vercel Deployer
cd /d "%~dp0"
cls
echo ============================================================
echo      AI Bahishti Zewar - Vercel par Live karne ka Tool
echo ============================================================
echo.
echo  Aap ke computer se theek shuda files Vercel par bheji ja rahi hain...
echo.
echo  Agar pehli baar chal raha hai to yeh aap se login poochega:
echo  (Browser khulega, wahan sirf "Continue with GitHub" ya Email par click karein)
echo.
echo ============================================================
echo.
call npx vercel --prod
echo.
echo ============================================================
echo  Kaam mukammal ho gaya! Kisi bhi key ko daba kar band kar dein.
echo ============================================================
pause
