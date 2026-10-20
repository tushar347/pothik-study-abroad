@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto failed
)
call npm run check
if errorlevel 1 goto failed
call npm test
if errorlevel 1 goto failed
call npm start
goto end
:failed
echo.
echo Setup failed. Read README.md and check the error above.
pause
:end
