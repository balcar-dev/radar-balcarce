# Las claves y servicios de IA: qué hay, para qué se usa y qué falta · 9/10/2026

*Hecho a pedido de Hernán: "un listado de todas las que tenemos, para qué las usamos, y ver cuáles podemos ir metiendo, sean respaldos gratis o pagos". No lleva ninguna clave:
sólo sus nombres. Las claves viven en GitHub (Settings → Secrets) y en el `.env` de la PC, y las pega una persona.*

## 1. Lo que hay hoy

| Nombre del secreto | De quién es | Para qué se usa | Cupo / costo | Respaldo hoy |
|---|---|---|---|---|
| `GEMINI_API_KEY_REDACCION` | Google (proyecto de redacción) | Escribir las notas (el «editor digital»), reescribir con IA | Gratis; límite diario del plan gratis | Si da 429 (sin cupo): `GEMINI_API_KEY_REDES`, y después `GEMINI_API_KEY_CLASIFICACION` |
| `GEMINI_API_KEY_REDES` | Google (proyecto de redes) | **Las voces** de los reels (10 audios por día) | Gratis; **10 audios/día**, justo para un día normal | Ninguno: si se acaba, la pieza no sale (nunca con otra voz) |
| `GEMINI_API_KEY_CLASIFICACION` | Google (proyecto de lectura) | Lectura con IA (qué es, de qué sección, si es de acá), comparar fotos, auditoría | Gratis | `GROQ_API_KEY` para la lectura y las fotos |
| `GROQ_API_KEY` | Groq | Respaldo gratis de la lectura y de las fotos (no sirve para redactar) | Gratis | — |
| `TAVILY_API_KEY` | Tavily | Búsqueda en internet con texto, sólo para las Pistas | Créditos mensuales (no hay contador visible todavía) | Ninguno (las pistas esperan) |
| `META_TOKEN` | Meta | Publicar en Facebook e Instagram, leer las estadísticas | Gratis, sin vencimiento | — |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN` | Cloudflare | Subir la web, leer las estadísticas | Gratis | — |
| `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | CallMeBot | Los avisos y el resumen de las 21 | Gratis | Ninguno (un solo canal) |
| `GITLAB_TOKEN` | GitLab | Respaldo externo (todavía sin crear) | — | — |
| *(en cron-job.org)* token de GitHub | GitHub | Despertar los workflows cada media hora | Gratis; vence el 21/09/2027 | El `schedule` de GitHub (impuntual) |

## 2. Lo que falta o se puede sumar (la idea de Hernán: mejorar absolutamente todas)

| Qué | Para qué | Costo aproximado | Riesgo que cubre |
|---|---|---|---|
| **Una cuenta paga de Gemini con tope de gasto** (reactivar la suspendida el 29/09, o abrir otra) | Que la redacción, la lectura y las voces tengan un respaldo cuando se acaba el cupo gratis | Hoy, USD 10 por mes de tope en la cuenta de Google | Si Google corta una clave gratis, la redacción se frena sola |
| **Una cuenta de Anthropic (Claude) con tope** (#33e) | Segundo proveedor **para redactar** (Groq no sirve para eso) y para el «jefe editor» que revisa lo escrito | Se paga por uso; con tope mensual | Dependencia de un solo proveedor de texto |
| **Una segunda clave de voz** (otro proyecto de Google) (PENDIENTES 0g) | Duplicar los 10 audios por día | Gratis | El cupo de voz es el más justo del sistema |
| **Un proveedor de voz alternativo** (por ejemplo ElevenLabs u OpenAI voz) | Respaldo de voz, **con otra voz distinta** (hoy la regla es que nunca suene otra voz: habría que decidirlo) | Pago por uso | Si Gemini se cae, hoy la pieza no sale |
| **Un segundo canal de avisos** (Healthchecks y ntfy, #43; o un resumen por mail) | Enterarse aunque falle CallMeBot o el teléfono | Gratis | Hoy, un solo teléfono recibe todo |
| **Contador de créditos de Tavily en el WhatsApp** (#51) | Saber cuánto queda antes de que se acabe | — | Pistas que se frenan sin avisar |
| **Rotación de claves** (calendario de renovación y aviso del vigilante) | Que ninguna clave quede en uso años | — | Fuga silenciosa |

## 3. Qué se puede hacer sin ustedes y qué no

- **Sin ustedes:** el contador de Tavily, el aviso del vigilante cuando una clave de respaldo falta, y dejar el código listo para sumar proveedores (la lista de respaldos ya está en `reels/claves.mjs`).
- **Con ustedes (cuentas y plata):** abrir las cuentas pagas, ponerles tope y pegar las claves en GitHub. Claude nunca crea cuentas ni toca claves.
