@echo off
rem APAGA DeepSeek: borra .claude\settings.local.json para que las sesiones nuevas de esta carpeta vuelvan a usar el cupo de Claude.
cd /d "%~dp0.."
if exist ".claude\settings.local.json" del ".claude\settings.local.json"
echo Listo: las sesiones nuevas de esta carpeta vuelven a usar Claude.
