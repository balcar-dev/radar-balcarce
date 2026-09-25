@echo off
REM ============================================================
REM  Radar Balcarce - arranca el panel
REM  Doble clic en este archivo y listo. Se abre una ventana
REM  negra: es el panel. NO la cierres mientras lo uses (si la
REM  cerras, se apaga).
REM
REM  La web NO corre en esta PC: la arma GitHub y la sirve
REM  Cloudflare Pages, con la PC prendida o apagada.
REM ============================================================

cd /d "%~dp0"

echo.
echo   Levantando el panel de Radar Balcarce...
echo.

REM El panel busca noticias cada 10 minutos y sube a GitHub lo que se
REM decide en el. No regenera ni publica la web.
start "Radar Balcarce - PANEL" cmd /k "node panel/servidor.mjs"

REM Un respiro para que termine de levantar antes de abrir el navegador.
timeout /t 5 /nobreak >nul

start "" http://localhost:4321

echo.
echo   Listo. Se abrio en el navegador:
echo     PANEL (para decidir que se publica):  http://localhost:4321
echo.
echo   Para apagarlo: cerra la ventana negra del panel.
echo.
pause
