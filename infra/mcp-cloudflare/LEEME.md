# Servidor MCP de Radar Balcarce (sólo lectura)

*16/10/2026. Estado: **escrito y probado, NO activado**.* Informe completo, con los riesgos y
la decisión de si conviene: `docs/seo/AUDITORIA-SEO-LLM.md` (parte 5).

## Qué es, en criollo

MCP (Model Context Protocol) es el "enchufe" que usan los asistentes de IA (Claude, ChatGPT,
Copilot, agentes propios) para pedirle datos a un servicio en vez de raspar su página. Este
Worker es ese enchufe para Radar Balcarce: un asistente se conecta y puede preguntar
**"¿qué pasó hoy en Balcarce?"**, **"¿qué farmacia está de turno?"** o **"buscame notas sobre el
autódromo"**, y recibe la respuesta con el enlace de la nota, las fuentes originales y quién la
escribió.

No tiene base de datos, no tiene claves, no escribe nada y no llama a ninguna IA (no gasta cupo).
Lee los tres JSON públicos que el sitio ya publica en `/agentes/` y la página de cada nota.

## Las herramientas

| Herramienta | Para qué |
|---|---|
| `ultimas_noticias` | Última hora (36 horas), con opción "sólo Balcarce" |
| `buscar_notas` | Buscar por palabras (con sección y fecha opcionales) |
| `noticias_por_seccion` | Lo último de una de las once secciones |
| `obtener_nota` | El texto de una nota (sólo de radarbalcarce.com) |
| `agenda_de_eventos` | Próximos eventos de la agenda |
| `farmacia_de_turno` | Farmacias de turno hoy y los próximos días |
| `clima_de_balcarce` | Clima ahora y pronóstico |

Todas llevan las anotaciones `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`.
Cada nota devuelta trae `url`, `fuentes` y `redaccion` (quién la escribió) y un aviso de que es un
resumen automático: es lo que hace que un asistente nos cite bien.

## Cómo habla

Protocolo MCP por HTTP (Streamable HTTP), sin sesiones, un `POST /mcp` por mensaje, respuestas en
JSON. Habla las dos épocas a la vez: la actual (**2026-07-28**, con `server/discover`) y las
anteriores (**2025-11-25**, 2025-06-18 y 2025-03-26, con `initialize`), que son las que usan casi
todos los clientes hoy. `GET /` devuelve una descripción en JSON para humanos.

## Cómo probarlo (sin activar nada)

    node --test pruebas/mcp-worker.test.mjs

Con Wrangler instalado también se puede correr en la compu: `cd infra/mcp-cloudflare` y
`npx wrangler dev`, y probar con el inspector oficial (`npx @modelcontextprotocol/inspector`)
apuntando a `http://localhost:8787/mcp`. Lee el sitio real (`ORIGEN`), así que necesita que
`/agentes/*.json` ya estén publicados (salen con el próximo despliegue del sitio).

## Cómo activarlo (cuando lo decidan)

1. **Esperar** a que el sitio publicado tenga `https://radarbalcarce.com/agentes/indice.json`
   (abrirlo en el navegador: tiene que mostrar un JSON).
2. **Subirlo:** `cd infra/mcp-cloudflare && npx wrangler deploy` (con la cuenta
   `radarbalcarce@gmail.com`). Sigue sin ser alcanzable: no tiene dominio.
3. **Poner un límite de pedidos en el WAF** (Cloudflare → radarbalcarce.com → Security → WAF →
   Rate limiting rules): para `mcp.radarbalcarce.com`, por IP, 60 pedidos por minuto, acción
   "Block" por 10 minutos. Opcional además: descomentar el binding `LIMITADOR` del
   `wrangler.toml`.
4. **Darle dominio:** en `wrangler.toml`, descomentar `routes` con `mcp.radarbalcarce.com`
   y volver a subir (Cloudflare crea el registro DNS solo).
5. **Probar de afuera:** el inspector contra `https://mcp.radarbalcarce.com/mcp`, y pedirle a
   Claude/ChatGPT que lo agregue como conector (Configuración → Conectores → agregar servidor
   MCP remoto → esa dirección) y que busque una nota.
6. **Anunciarlo:** poner la dirección en `MCP_URL` de `web/app/llms.txt/route.js` (con eso el
   `llms.txt` lo menciona) y agregarlo a `docs/08-INFRAESTRUCTURA.md`.

**Apagarlo:** sacar `routes` y volver a subir, o borrar el Worker desde Cloudflare → Workers.
No toca nada del sitio.

## Costos y riesgos (resumen; detalle en el informe)

- Plan gratis de Workers: 100.000 pedidos por día, sin costo. Cada pedido lee de la caché de
  5 minutos; el origen (Cloudflare Pages) no se entera de una ráfaga.
- **Riesgo de raspado masivo:** lo que devuelve ya es público; el servidor sólo lo hace más
  cómodo. El límite del WAF evita el abuso. Se mira Cloudflare → Workers → radar-balcarce-mcp
  → métricas, una vez por semana el primer mes.
- **Riesgo de que un asistente cite mal:** por eso cada resultado trae las fuentes, la firma y
  el aviso de "resumen automático". No se puede controlar lo que el asistente haga después.
- **Migración futura:** si el uso crece o se quiere autenticación, Cloudflare recomienda
  `createMcpHandler` con el SDK oficial (`@modelcontextprotocol/server`). Este Worker no usa
  dependencias a propósito (como el resto del repo) y cubre lo mínimo del protocolo.
