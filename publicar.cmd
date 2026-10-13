@echo off
chcp 65001 >nul
title Publicar TutorApp en internet
cd /d "%~dp0"

echo ==========================================
echo    PUBLICAR TUTORAPP EN INTERNET
echo ==========================================
echo.
echo [1/2] Compilando la version final...
call npx --yes vite build --mode development
if errorlevel 1 goto error

echo.
echo [2/2] Subiendo a Cloudflare Pages...
call npx --yes wrangler@3 pages deploy dist --project-name=tutorapp --branch=main --commit-dirty=true
if errorlevel 1 goto error

echo.
echo ==========================================
echo    LISTO! Tu app ya esta actualizada en:
echo    https://tutorapp-9z3.pages.dev
echo ==========================================
pause
exit /b 0

:error
echo.
echo *** HUBO UN ERROR: la app NO se actualizo. ***
pause
exit /b 1
