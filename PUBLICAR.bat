@echo off
REM ============================================================
REM  Radar Balcarce - publicar la web
REM
REM  Doble clic cuando quieras que lo que decidiste en el panel
REM  se vea en la web publica.
REM
REM  Que hace, en orden:
REM    1. Regenera web/data/portada.json con lo que hay en el panel.
REM    2. Compila el sitio para verificar que no quedo roto.
REM    3. Lo guarda en GitHub (respaldo del historial).
REM    4. Lo publica en Vercel.
REM
REM  La consola de esta PC esta autenticada en la cuenta de Vercel
REM  del medio (radarbalcarce@gmail.com), asi que el paso 4 publica
REM  donde corresponde. El dia que el repositorio quede conectado a
REM  Vercel, el push del paso 3 va a alcanzar y el 4 sobra.
REM ============================================================

cd /d "%~dp0"

echo.
echo   [1/4] Generando los datos desde el panel...
cd web
call npm run datos
if errorlevel 1 goto :error

echo.
echo   [2/4] Compilando el sitio para ver que no quedo roto...
call npm run build
if errorlevel 1 goto :error

echo.
echo   [3/4] Guardando en GitHub...
cd ..
REM Vercel valida la firma del commit contra GitHub antes de publicar, asi
REM que el mail tiene que ser uno que GitHub reconozca: el interno de la
REM cuenta balcar-dev. Con cualquier otro el deploy queda BLOCKED.
git config user.name "Radar Balcarce"
git config user.email "272334999+balcar-dev@users.noreply.github.com"
git add web/data/portada.json
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Datos de la portada al %date% %time:~0,5%"
  git push origin main
  if errorlevel 1 goto :error
) else (
  echo        Sin cambios en los datos que guardar.
)

echo.
echo   [4/4] Publicando en Vercel...
cd web
call npx --no-install vercel --prod --yes
if errorlevel 1 goto :error

echo.
echo   Listo. Ya se ve en:
echo     https://radar-balcarce-six.vercel.app
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
