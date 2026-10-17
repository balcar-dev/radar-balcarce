@echo off
rem Abre Claude Code usando DeepSeek por OpenRouter, para seguir trabajando si se acaban los tokens de Claude.
rem Usa la clave OPENROUTER_API_KEY que ya esta en esta PC (variable de entorno de Windows). No se escribe en ningun archivo.
rem Uso: scripts\claude-con-openrouter.cmd      (despues, dentro de Claude Code, /status muestra la direccion de OpenRouter)
rem Si antes entraste con tu cuenta de Anthropic, hace /logout dentro de Claude Code y volve a abrirlo con este archivo.
rem Costo aproximado de DeepSeek V4 Pro: unos US$ 0,21 por millon de tokens de entrada y 0,42 de salida (precios de OpenRouter del 17/10/2026).
rem Siempre trabaja en la carpeta del proyecto, aunque se abra con doble clic.
cd /d "%~dp0.."
if "%OPENROUTER_API_KEY%"=="" (
  echo Falta la variable OPENROUTER_API_KEY. Crearla en https://openrouter.ai/keys y guardarla como variable de entorno de Windows.
  exit /b 1
)
set ANTHROPIC_BASE_URL=https://openrouter.ai/api
set ANTHROPIC_AUTH_TOKEN=%OPENROUTER_API_KEY%
set ANTHROPIC_API_KEY=
set ANTHROPIC_DEFAULT_OPUS_MODEL=deepseek/deepseek-v4-pro
set ANTHROPIC_DEFAULT_SONNET_MODEL=deepseek/deepseek-v4-pro
set ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek/deepseek-v4-flash
claude %*
