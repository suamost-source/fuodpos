@echo off
if "%1" == "min" goto :minimized
start "" /min "%~dpnx0" min
exit
:minimized
echo Starting development server...
npm run dev
pause