@echo off
title PlagiaLens AI Launcher

echo =======================================================
echo              Starting PlagiaLens AI
echo =======================================================

:: Set working directories
set ROOT_DIR=%~dp0
set SERVER_DIR=%ROOT_DIR%server
set CLIENT_DIR=%ROOT_DIR%client

:: Start Flask Backend
echo [1/2] Starting Flask Backend (Port 5000)...
start "PlagiaLens AI - Flask Backend" cmd /k "cd /d "%SERVER_DIR%" && call venv\Scripts\activate && pip install -r requirements.txt && python app.py"

:: Start React Frontend
echo [2/2] Starting React/Vite Frontend (Port 5173)...
start "PlagiaLens AI - Vite Frontend" cmd /k "cd /d "%CLIENT_DIR%" && npm install && npm run dev"

echo =======================================================
echo  PlagiaLens AI is launching!
echo  - Backend: http://localhost:5000
echo  - Frontend: http://localhost:5173
echo =======================================================
pause
