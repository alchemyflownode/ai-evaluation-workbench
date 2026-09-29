@echo off
REM ===========================================================================
REM  AI Evaluation Workbench  -  easy start (Windows)
REM  Local-first. Offline. No network calls.
REM
REM  Double-click this file for an interactive menu.
REM  Or pass one argument and it runs once, then exits with a real exit code:
REM      start.bat dev        start the app       -> http://localhost:5178
REM      start.bat build      build, then preview the production bundle
REM      start.bat verify     typecheck + offline scan
REM      start.bat witness    rebuild dist, then run the browser witness
REM      start.bat install    install / repair dependencies
REM  With an argument it never pauses, so scripts can consume it safely.
REM ===========================================================================
setlocal EnableExtensions
title AI Evaluation Workbench  -  launcher

REM --- always operate from this file's own folder (path contains spaces) ------
pushd "%~dp0"
if errorlevel 1 (
  echo [x] Could not open the app folder:
  echo     %~dp0
  echo.
  pause
  exit /b 1
)

REM --- arguments --------------------------------------------------------------
set "ARG="
if not "%~1"=="" set "ARG=%~1"

if defined ARG goto dispatch
goto menu


REM ===========================================================================
REM  INTERACTIVE MENU
REM ===========================================================================
:menu
cls
echo ===========================================================================
echo   AI EVALUATION WORKBENCH          version 0.1 - MVP - local-first
echo ===========================================================================
echo.
echo   Folder : %CD%
call :reportnode
call :reportdeps
echo.
echo ---------------------------------------------------------------------------
echo   [1]  Start the app            dev server  ->  http://localhost:5178
echo   [2]  Build and preview        production bundle in dist\
echo   [3]  Verify                   typecheck + offline network scan
echo   [4]  Browser witness          rebuild dist, then run witness\witness.mjs
echo   [5]  Install / repair deps    npm install
echo   [6]  Exit
echo ---------------------------------------------------------------------------
echo.
echo   Press Enter on its own to start the app.
echo.
set "CHOICE="
set /p "CHOICE=  Select 1-6: "
if not defined CHOICE set "CHOICE=1"

if "%CHOICE%"=="1" goto act_dev
if "%CHOICE%"=="2" goto act_build
if "%CHOICE%"=="3" goto act_verify
if "%CHOICE%"=="4" goto act_witness
if "%CHOICE%"=="5" goto act_install
if "%CHOICE%"=="6" goto act_exit
goto act_bad


:dispatch
if /i "%ARG%"=="dev"     goto act_dev
if /i "%ARG%"=="start"   goto act_dev
if /i "%ARG%"=="app"     goto act_dev
if /i "%ARG%"=="build"   goto act_build
if /i "%ARG%"=="preview" goto act_build
if /i "%ARG%"=="verify"  goto act_verify
if /i "%ARG%"=="check"   goto act_verify
if /i "%ARG%"=="witness" goto act_witness
if /i "%ARG%"=="install" goto act_install
if /i "%ARG%"=="deps"    goto act_install
if /i "%ARG%"=="menu"    goto menu
if /i "%ARG%"=="help"    goto act_help
echo [x] Unknown argument: %ARG%
goto act_help


REM ===========================================================================
REM  ACTIONS   (fall through to :finish, which knows interactive vs scripted)
REM ===========================================================================

:act_dev
echo.
echo [*] Starting the development server...
echo     Vite opens your browser at http://localhost:5178
echo     The app seeds itself with SYNTHETIC demo data only.
echo     Press Ctrl+C in this window to stop.
echo.
call npm run dev
set "RC=%ERRORLEVEL%"
goto finish

:act_build
echo.
echo [*] Building: typecheck then production bundle...
echo.
call npm run build
if errorlevel 1 (
  set "RC=1"
  echo.
  echo [x] Build failed. Nothing was served.
  goto finish
)
echo.
echo [*] Build OK. Serving the production bundle with "vite preview".
echo     Press Ctrl+C in this window to stop.
echo.
call npm run preview
set "RC=%ERRORLEVEL%"
goto finish

:act_verify
echo.
echo [*] Verifying: strict typecheck + offline network scan...
echo.
call npm run verify
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
  echo [OK] VERIFY PASSED. Typecheck clean and no network calls found.
) else (
  echo [x] VERIFY FAILED - see the output above. exit code %RC%
)
goto finish

:act_witness
echo.
if not exist "dist\index.html" (
  echo [*] dist\index.html is missing - building it first...
  call npm run build
  if errorlevel 1 (
    set "RC=1"
    echo [x] Build failed - the witness needs dist\.
    goto finish
  )
) else (
  echo [*] Rebuilding dist so the witness measures current code...
  call npm run build
  if errorlevel 1 (
    set "RC=1"
    echo [x] Build failed - the witness needs dist\.
    goto finish
  )
)
echo.
echo [*] Running the observation-only browser witness...
echo     Evidence is written to witness\witness-report.json plus state-*.png
echo.
node "witness\witness.mjs"
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
  echo [OK] WITNESS VERIFIED - every check passed.
) else (
  echo [!] Witness reported failures - that is a finding, not a crash.
  echo     Open witness\witness-report.json and read the "failed" array.
)
echo.
echo     If Chromium is missing, run:  npx playwright install chromium
goto finish

:act_install
echo.
echo [*] Installing dependencies into this folder...
echo     This is a standalone app; dependencies install into this folder.
echo.
call npm install
set "RC=%ERRORLEVEL%"
if "%RC%"=="0" (echo [OK] Dependencies ready.) else (echo [x] npm install failed. exit code %RC%)
goto finish

:act_bad
echo [x] That is not one of the options.
goto finish

:act_help
echo.
echo Usage:
echo   start.bat             interactive menu
echo   start.bat dev         start the app on http://localhost:5178
echo   start.bat build       build, then preview the production bundle
echo   start.bat verify      strict typecheck + offline network scan
echo   start.bat witness     rebuild dist, then run the browser witness
echo   start.bat install     install / repair dependencies
echo.
set "RC=0"
if defined ARG goto finish
goto finish


REM ===========================================================================
REM  EXIT PATHS   (interactive: pause and loop back. scripted: hard exit code.)
REM ===========================================================================
:finish
echo.
echo ---------------------------------------------------------------------------
if defined ARG (
  popd
  endlocal & exit /b %RC%
)
pause
goto menu

:act_exit
popd
endlocal & exit /b 0


REM ===========================================================================
REM  HELPERS
REM ===========================================================================
:reportnode
set "NODEV=not found"
where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js:  NOT FOUND  -- install Node LTS from nodejs.org, then re-run
) else (
  for /f "delims=" %%v in ('node --version 2^>nul') do set "NODEV=%%v"
  echo   Node.js:  %NODEV%
)
exit /b 0

:reportdeps
if exist "node_modules\vite" (
  echo   Deps   :  local node_modules
  exit /b 0
)
if exist "..\node_modules\vite" (
  echo   Deps   :  parent-folder node_modules
  exit /b 0
)
echo   Deps   :  MISSING  -- choose [5] Install / repair deps, or npm will fetch them
exit /b 0
