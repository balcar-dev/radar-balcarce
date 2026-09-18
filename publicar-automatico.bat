@echo off
REM ============================================================
REM  Lo mismo que PUBLICAR.bat pero sin ventanas ni "presione una
REM  tecla": esto lo corre solo el Programador de tareas de
REM  Windows cada dos horas.
REM
REM  No lo abras a mano: para eso esta PUBLICAR.bat, que te
REM  muestra lo que va pasando. Este escribe todo en
REM  panel\datos\publicaciones.log.
REM ============================================================

cd /d "%~dp0"

echo.
echo ===== %date% %time% =====

cd web
call npm run datos || exit /b 1
call npm run build || exit /b 1

cd ..
git add web/data/portada.json
git diff --cached --quiet || (
  git commit -m "Datos de la portada al %date% %time:~0,5%"
  git push origin main
)

cd web
call npx --no-install vercel --prod --yes || exit /b 1

echo ----- publicado -----
exit /b 0
