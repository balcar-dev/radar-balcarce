@echo off
rem PRENDE DeepSeek (por OpenRouter) para las sesiones NUEVAS de Claude Code que se abran en esta carpeta, cuando se acaba el cupo de Claude.
rem Escribe .claude\settings.local.json (archivo local, no se sube a GitHub) con la clave OPENROUTER_API_KEY que ya esta en la PC. La clave no se muestra.
rem Para volver a Claude: scripts\usar-claude.cmd
cd /d "%~dp0.."
if "%OPENROUTER_API_KEY%"=="" (
  echo Falta la variable OPENROUTER_API_KEY en Windows.
  exit /b 1
)
if not exist ".claude" mkdir ".claude"
> ".claude\settings.local.json" (
  echo {
  echo   "env": {
  echo     "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
  echo     "ANTHROPIC_AUTH_TOKEN": "%OPENROUTER_API_KEY%",
  echo     "ANTHROPIC_API_KEY": "",
  echo     "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek/deepseek-v4-pro",
  echo     "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek/deepseek-v4-pro",
  echo     "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek/deepseek-v4-flash"
  echo   }
  echo }
)
echo Listo: las sesiones nuevas de esta carpeta van a usar DeepSeek. Cerra esta sesion y abri una nueva. Para volver a Claude: scripts\usar-claude.cmd
