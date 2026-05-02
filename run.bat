@echo off
echo ============================================
echo   FinPilot - Starting Development Servers
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking dependencies...
echo.

if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    call npm install
    if errorlevel 1 (
        echo Failed to install server dependencies!
        pause
        exit /b 1
    )
    cd ..
    echo Server dependencies installed.
    echo.
) else (
    echo Server dependencies already installed.
    echo.
)

if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client
    call npm install
    if errorlevel 1 (
        echo Failed to install client dependencies!
        pause
        exit /b 1
    )
    cd ..
    echo Client dependencies installed.
    echo.
) else (
    echo Client dependencies already installed.
    echo.
)

echo [2/3] Checking environment files...
echo.

if not exist "server\.env" (
    echo WARNING: server\.env not found! Using .env.example as template.
    echo Please edit server\.env with your actual credentials.
    copy "server\.env.example" "server\.env"
    echo.
)

if not exist "client\.env" (
    echo WARNING: client\.env not found! Using .env.example as template.
    copy "client\.env.example" "client\.env"
    echo.
)

echo [3/3] Starting servers...
echo.
echo Server will run on http://localhost:5000
echo Client will run on http://localhost:5173
echo.
echo Press Ctrl+C to stop all servers.
echo ============================================
echo.

start cmd /k "title FinPilot Server && cd server && npm run dev"
timeout /t 3 /nobreak > nul
start cmd /k "title FinPilot Client && cd client && npm run dev"

echo.
echo Both servers are starting in separate windows!
echo Server:  http://localhost:5000
echo Client:  http://localhost:5173
