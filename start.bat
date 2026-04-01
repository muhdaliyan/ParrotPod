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

echo.
echo  ========================================
echo   Starting all services in one terminal!
echo.
echo   Frontend    ->  http://localhost:3000
echo   Backend     ->  http://localhost:8000
echo   API Docs    ->  http://localhost:8000/docs
echo  ========================================
echo.
echo  Press Ctrl+C to stop all services.
echo.

REM Give the backend/frontend a moment to start before launching the browser
start "" "http://localhost:3000"

npx concurrently -k -n "BACKEND,FRONTEND,VOICE" -c "blue,green,magenta" ^
    "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload" ^
    "cd /d %~dp0frontend && npm run dev" ^
    "cd /d %~dp0backend && call venv\Scripts\activate && python voice_agent.py dev"
