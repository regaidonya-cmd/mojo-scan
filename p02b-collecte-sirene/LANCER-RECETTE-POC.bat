@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title MOJO SALES - Recette P0.2B - Diagnostiqueurs Villeneuve-Saint-Georges

echo ============================================================
echo   MOJO SALES - Recette P0.2B
echo   Collecte SIRENE - Diagnostiqueurs immobiliers
echo   Zone : Villeneuve-Saint-Georges, rayon 20 km
echo ============================================================
echo.

REM --- 1. Verification que Node.js est installe ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe ou n'est pas accessible.
    echo.
    echo Ce script a besoin de Node.js version 18 ou superieure.
    echo Installez-le depuis : https://nodejs.org ^(bouton "LTS"^)
    echo Puis relancez ce fichier.
    echo.
    pause
    exit /b 1
)

REM --- 2. Verification de la version (>= 18) ---
for /f "tokens=1 delims=v." %%v in ('node -v') do set NODE_MAJOR=%%v
if "%NODE_MAJOR%"=="" (
    for /f "delims=v" %%v in ('node -v') do set NODE_FULL=%%v
    for /f "tokens=1 delims=." %%a in ("!NODE_FULL!") do set NODE_MAJOR=%%a
)

if !NODE_MAJOR! LSS 18 (
    echo [ERREUR] Version de Node.js trop ancienne : v!NODE_MAJOR! detectee, 18 minimum requis.
    echo.
    echo Merci de mettre a jour Node.js depuis : https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detecte ^(version !NODE_MAJOR!^)
echo.

REM --- 3. Parametres POC preconfigures (modifiables ici si besoin, sans toucher au code) ---
set CENTER_LAT=48.7333
set CENTER_LONG=2.4333
set RADIUS_KM=20
set ACTIVITE_CODES=71.20B
set ACTIVITE_NOMENCLATURE=naf2008
set MAX_PAGES=40
set THROTTLE_MS=250
set RECETTE_NOM=poc_diagnostiqueurs_villeneuve_saint_georges

echo Parametres de la recette :
echo   Centre     : %CENTER_LAT%, %CENTER_LONG% (Villeneuve-Saint-Georges)
echo   Rayon      : %RADIUS_KM% km
echo   Activite   : %ACTIVITE_CODES% (nomenclature %ACTIVITE_NOMENCLATURE%)
echo   Plafond    : %MAX_PAGES% pages maximum
echo.
echo Aucune cle API necessaire. Aucun service payant. Aucune ecriture en base.
echo ------------------------------------------------------------
echo.

REM --- 4. Lancement de la collecte ---
cd /d "%~dp0"
node index.js

if errorlevel 1 (
    echo.
    echo ============================================================
    echo   La collecte s'est arretee avec une erreur.
    echo   Copiez le message ci-dessus et transmettez-le pour analyse.
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   TERMINE
echo.
echo   Le rapport a ete enregistre dans le dossier "output" a cote
echo   de ce fichier, avec un nom du type :
echo   rapport-p02b-^<horodatage^>.json
echo.
echo   >>> Transmettez ce fichier .json, c'est le seul necessaire. ^<^<^<
echo ============================================================
echo.
pause
