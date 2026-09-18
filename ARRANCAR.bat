@echo off
REM ============================================================
REM  Radar Balcarce - arranca todo
REM  Doble clic en este archivo y listo. Se abren dos ventanas
REM  negras: son los servidores. NO las cierres mientras uses
REM  el panel o la web (si las cerras, se apagan).
REM ============================================================

cd /d "%~dp0"

echo.
echo   Levantando Radar Balcarce...
echo.

REM El panel: busca noticias solo cada 10 minutos.
start "Radar Balcarce - PANEL" cmd /k "node panel/servidor.mjs"

REM La web publica. Antes regenera los datos con lo que decidiste
REM en el panel, para que la portada muestre lo ultimo.
start "Radar Balcarce - WEB" cmd /k "cd web && npm run datos && npm start"

REM Un respiro para que ambos terminen de levantar antes de abrir
REM el navegador.
timeout /t 18 /nobreak >nul

start "" http://localhost:4321
start "" http://localhost:3000

echo.
echo   Listo. Se abrieron en el navegador:
echo     PANEL (para decidir que se publica):  http://localhost:4321
echo     WEB   (lo que ve la gente):           http://localhost:3000
echo.
echo   Para apagar todo: cerra las dos ventanas negras.
echo.
pause
