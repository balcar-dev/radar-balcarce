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
REM    3. Lo sube a GitHub.
REM
REM  Y ahi termina: Vercel esta conectado al repositorio, asi que
REM  el push dispara el deploy solo. No hace falta llamar a Vercel
REM  desde aca (ademas, la consola de esta PC quedo autenticada en
REM  una cuenta de Vercel distinta a la del medio).
REM ============================================================

cd /d "%~dp0"

echo.
echo   [1/3] Generando los datos desde el panel...
cd web
call npm run datos
if errorlevel 1 goto :error

echo.
echo   [2/3] Compilando el sitio para ver que no quedo roto...
call npm run build
if errorlevel 1 goto :error

echo.
echo   [3/3] Subiendo a GitHub...
cd ..
git add web/data/portada.json
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Datos de la portada al %date% %time:~0,5%"
  git push origin main
  if errorlevel 1 goto :error
  echo.
  echo   Listo. Vercel esta compilando: en un minuto se ve online.
) else (
  echo        Sin cambios en los datos: no habia nada nuevo que publicar.
)

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
