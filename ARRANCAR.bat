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

REM La web publica. Primero regenera los datos con lo que decidiste
REM en el panel, y despues arranca el servidor.
REM
REM OJO con el segundo comando: arranca Next DIRECTO con node, no con
REM "npm start". Con npm de por medio queda una cadena cmd -> npm -> node,
REM y si el npm del medio pierde la consola se lleva puesto al servidor:
REM arrancaba bien y se moria a los segundos. Asi es estable.
start "Radar Balcarce - WEB" cmd /k "cd web && npm run datos && node node_modules/next/dist/bin/next start"

REM Un respiro para que ambos terminen de levantar antes de abrir
REM el navegador.
timeout /t 20 /nobreak >nul

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
