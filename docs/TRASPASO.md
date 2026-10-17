# Traspaso: dónde estamos y qué sigue

*Se actualiza cada vez que se cierra una tanda. Para retomar con otra sesión (por ejemplo con DeepSeek: `scripts\claude-con-openrouter.cmd`)
leer primero `CLAUDE.md`, después este archivo y `PENDIENTES.md`. Última actualización: 17/10/2026.*

## Cómo se trabaja
- Hablar siempre en castellano rioplatense, claro. Los dueños (Hernán y Andrés) no programan: **pedirles cada cosa una sola vez**, con el enlace y el paso.
- Nada legal ("no busques temas legales"), nada de costos nuevos, ningún interruptor sensible se prende sin que lo pidan.
- Antes de subir: `npm test` completo (borrar `web/out` y `web/.next` primero) y `git pull --no-rebase` antes del push. Los datos de `web/data/` los regenera GitHub cada media hora: no commitear los que cambie `npm run datos`.
- Los agentes trabajan en worktrees aparte (`.claude/worktrees/`) y se juntan con `git merge --no-ff`. Los números de regla chocan: mirar `docs/10-REGLAS-Y-PRUEBAS.md` antes de numerar.

## Hecho el 17/10 (reglas 188 a 283)
- Una sola compilación por vuelta; reloj de Cloudflare dispara cada cosa cuando toca; redirecciones con tope.
- Selección sin cupos: Balcarce entra todo; lo nacional por cantidad de medios (3; 2 en áreas chicas); 14 secciones activas.
- Repetidas de Balcarce por significado; fechas corregidas; fotos controladas; un solo camino de ilustración (Cloudflare).
- Revisión de todo el archivo por tandas desde el 22/10; OpenRouter como último respaldo de las IA (falta la clave en GitHub).
- Mudanza a Cloudflare: el código está en `main` apagado (variable `NUBE` vacía); plan en `docs/etapa-10-operacion/PLAN-DE-CAMBIO.md`.
- Sitio: sitemap de noticias, `/hoy`, firma de IA adentro de "Fuentes", datos estructurados. Redes: hashtags fijos, lo que va a Facebook solo Balcarce o lo más contado.

## En curso (si se corta, retomar de acá)
1. **Animaciones del repaso, guiones con continuidad y voces nuevas: terminado y subido** (reglas 300 a 302; `docs/redes/GUION-DEL-DIA-EJEMPLO.md`, `docs/redes/VOCES-NUEVAS.md`). Falta oírlo y verlo: el ejemplo renderizado está en el scratchpad de la sesión; rehacerlo con `node reels/guion-del-dia.mjs` y los scripts de reels. Voces: guardar la referencia de las voces actuales ANTES de cambiar la clave de Gemini.
2. Respuestas de ChatGPT y Gemini abiertas en el Chrome sobre posicionamiento en buscadores y en IA, MCP y cómo postear en Facebook: leerlas y anotarlas en `docs/auditoria-2-0/08-IDEAS-DE-OTRAS-IA.md`.
3. Estado completo y lista de pendientes, en un solo lugar: `docs/HOY.html`.

## Pendiente de Hernán y Andrés (una sola lista: `docs/PASOS-PARA-HERNAN-Y-ANDRES.html`)
Clave de OpenRouter en GitHub; variable `FOTOS_MENORES_OFICIALES`; cuentas de Bluesky y Telegram; permisos del token de Cloudflare; dos tokens de GitHub y la llave de R2 (para la mudanza); ordenar las claves de Google; borrar `panel\datos` y `respaldos` en la PC.

## Decisiones abiertas (preguntar una vez)
- Posteos por día en Facebook (propuesta de 8; `docs/redes/PROPUESTA-POSTEOS-POR-DIA.md`) y la barra de 5 medios para lo de afuera.
- Acortador de enlaces: subir el Worker y poner la ruta (`docs/redes/ACORTADOR-DE-ENLACES.md`).
- Cuatro fuentes de España apagadas: no prender (Hernán: "no es necesario sumar fuentes de afuera").
- Limpiar el historial de GitHub (una sola versión con el estado actual, con copia previa en R2): irreversible; pedir confirmación.
- Elegir una de las dos portadas de `docs/diseno/VISTA-PREVIA-PORTADA-2.html` (sin cambios grandes hasta que termine todo).

## Esta semana (lunes a viernes)
Mirar la estadística de selección (cuántas notas llegan, con cuántos medios, dónde caen). **Ojo:** `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS` (cuántos medios hacen falta, 3 y 2) los está armando el agente de criterio simple y todavía no están en `main`; hasta que se junte su trabajo, el criterio es el de las reglas 215 a 218 de `docs/10-REGLAS-Y-PRUEBAS.md`. No son cupos: los cupos no existen. Si se llega muy rápido a 150 por día, sumar fuentes o subir el mínimo; si una sección falta (tecnología), darle prioridad sin que cuente en el tope.

## Si se acaban los tokens de Claude
`scripts\claude-con-openrouter.cmd` (DeepSeek V4 Pro por OpenRouter, con la clave que ya está en la PC) o `node scripts/deepseek.mjs "pregunta"`. Detalle en `docs/11-OPERACION.md`.
