@echo off
echo.
echo  ========================================
echo   PARROT POD - AI Voice Agent Builder
echo  ========================================
echo.

REM Check .env exists
if not exist "backend\.env" (
    echo  [!] backend\.env not found!
    echo  [!] Copy backend\.env.example to backend\.env and fill in your credentials.
    echo.
    pause
    exit /b 1
)

echo  [1/3] Starting Backend  (FastAPI on :8000)...
start "Parrot Pod - Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo  [2/3] Starting Frontend (Vite on :3000)...
start "Parrot Pod - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo  [3/3] Starting Voice Agent Worker...
start "Parrot Pod - Voice Worker" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python voice_agent.py dev"

echo.
echo  ========================================
echo   All services are starting!
echo.
echo   Frontend    ->  http://localhost:3000
echo   Backend     ->  http://localhost:8000
echo   API Docs    ->  http://localhost:8000/docs
echo  ========================================
echo.
echo  Three terminal windows opened.
echo  Close them all to stop all services.
echo.
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"
