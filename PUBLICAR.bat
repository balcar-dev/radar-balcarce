@echo off
REM ============================================================
REM  Radar Balcarce - publicar la web
REM
REM  Doble clic cuando quieras que lo que decidiste en el panel
REM  se vea en radar-balcarce.vercel.app.
REM
REM  Que hace, en orden:
REM    1. Regenera web/data/portada.json con lo que hay en el panel.
REM    2. Compila el sitio para verificar que no quedo roto.
REM    3. Guarda los datos en el repositorio (GitHub).
REM    4. Sube el sitio a Vercel.
REM
REM  El paso 3 y el 4 estan separados a proposito: mientras el
REM  repo de GitHub no este conectado a Vercel, el que publica de
REM  verdad es el paso 4. Cuando lo conectes, el paso 3 alcanza y
REM  el 4 pasa a ser opcional.
REM ============================================================

cd /d "%~dp0"

echo.
echo   [1/4] Generando los datos desde el panel...
cd web
call npm run datos
if errorlevel 1 goto :error

echo.
echo   [2/4] Compilando el sitio...
call npm run build
if errorlevel 1 goto :error

echo.
echo   [3/4] Guardando en GitHub...
cd ..
git add web/data/portada.json
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Datos de la portada al %date% %time:~0,5%"
  git push origin main
) else (
  echo        (sin cambios en los datos, no hay nada que guardar^)
)

echo.
echo   [4/4] Subiendo a Vercel...
cd web
call npx vercel --prod --yes
if errorlevel 1 goto :error

echo.
echo   Listo. El sitio quedo publicado en:
echo     https://radar-balcarce.vercel.app
echo.
pause
exit /b 0

:error
echo.
echo   ALGO FALLO. Mira el mensaje de arriba: la linea que dice
echo   "error" o "Error" explica que paso. No se publico nada.
echo.
pause
exit /b 1
