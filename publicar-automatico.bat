@echo off
REM ============================================================
REM  Lo mismo que PUBLICAR.bat pero sin ventanas ni "presione una
REM  tecla": esto lo corre solo el Programador de tareas de
REM  Windows cada dos horas.
REM
REM  No lo abras a mano: para eso esta PUBLICAR.bat, que te
REM  muestra lo que va pasando. Este escribe todo en
REM  panel\datos\publicaciones.log, que es donde hay que mirar
REM  cuando algo no se publico.
REM ============================================================

cd /d "%~dp0"
set LOG=%~dp0panel\datos\publicaciones.log

call :correr >> "%LOG%" 2>&1
set RESULTADO=%ERRORLEVEL%
exit /b %RESULTADO%

REM ------------------------------------------------------------

:correr
echo.
echo ===== %date% %time% =====

cd /d "%~dp0web"
call npm run datos
if errorlevel 1 ( echo FALLO: no se pudieron generar los datos & exit /b 1 )

call npm run build
if errorlevel 1 ( echo FALLO: no compilo el sitio & exit /b 1 )

REM Guardar en GitHub es un respaldo, no la publicacion: si falla
REM (por ejemplo porque alguien subio algo desde otro lado y hay
REM que hacer merge) NO se corta, porque el deploy de abajo es el
REM que pone el sitio online y ese tiene que salir igual.
cd /d "%~dp0"
REM Vercel lee la firma del commit y bloquea el deploy si el mail no se
REM puede asociar a una cuenta suya. Por eso se firma siempre con el mail
REM del medio, que es el de la cuenta de Vercel.
git config user.name "Radar Balcarce"
git config user.email "radarbalcarce@gmail.com"
git add web/data/portada.json
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Datos de la portada al %date% %time:~0,5%"
  git push origin main
  if errorlevel 1 echo AVISO: no se pudo subir a GitHub. Se publica igual.
) else (
  echo Sin cambios en los datos que guardar.
)

cd /d "%~dp0web"
call npx --no-install vercel --prod --yes
if errorlevel 1 ( echo FALLO: no se pudo publicar en Vercel & exit /b 1 )

echo ----- publicado bien -----
exit /b 0
