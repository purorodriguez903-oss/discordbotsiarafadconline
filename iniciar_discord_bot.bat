@echo off
cd /d "%~dp0"
title Rafa Discord 24/7 Voice Bot
color 0a

echo ====================================================
echo      INICIANDO RAFA DISCORD 24/7 VOICE BOT
echo ====================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js en el sistema.
    pause
    exit /b
)

echo Directorio de trabajo: %cd%
echo Conectando a canal de voz 24/7...
echo.

node index.js

pause
