@echo off
title GasFlow LPG Station POS
echo ========================================================
echo        GASFLOW POS - LPG REFILLING STATION SYSTEM
echo ========================================================
echo.
echo Starting Station Server & Web Interface on Port 5000...
echo Station POS will be available at: http://localhost:5000
echo.
node server/index.js
pause
