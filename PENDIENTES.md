# Pendientes

*Actualizado el 15/10/2026. Sólo lo que está abierto, una vez cada cosa. Lo hecho se saca de acá (queda en el
historial de git y en `docs/historico/`); la lista anterior, con todo lo viejo, está en
`docs/historico/propuestas-2026-10/PENDIENTES-HASTA-15-10.md`. Lo que se decidió y las preguntas abiertas viven en
`docs/DECISIONES.md`. Cómo funciona cada cosa: `docs/00-INDICE.md`.*

Cada pendiente dice **quién**: Hernán, Andrés, "los dos" o Claude. Lo que pide una cuenta, una clave, borrar algo
publicado o una decisión de criterio lo hace una persona; Claude nunca.

## El rediseño (lo principal desde el 15/10)

Se rehace todo desde cero, **una etapa por vez**: fuentes → entrada → duplicadas → clasificación → puntaje →
contexto → redacción y verificación → fotos → publicación y redes → operación (`docs/DECISIONES.md`, 15/10). En
cada etapa: mirar los criterios de hoy, proponer, probar con notas reales y recién ahí cambiar. Las preguntas que
frenan alguna etapa están en `docs/DECISIONES.md` → "Preguntas abiertas".

| Qué | Quién |
|---|---|
| **Etapa 1, fuentes**: reactivar las que se apagaron por bloqueo si andan (2261 Lobería, El Diario de Tandil, El Argentino Digital, Sendero Regional), sumar las verificadas, el motivo de cada fuente apagada en `FUENTES.md` y probar desde Cloudflare las que bloquean a GitHub | Claude; los dos aprueban |
| **Elegir los modelos** de cada paso (con pruebas; `pruebas-modelos/`) y, con eso, crear las claves nuevas en cuentas de `radarbalcarce` | Claude prueba; los dos eligen; una persona pega las claves |
| **Segunda tanda de limpieza**: revisar `prueba-whatsapp.yml`, `pruebas-otra-hora.yml`, `armado-vacio.yml`, los scripts que nadie llama y el panel de la PC; de a un grupo, con `npm test` y una corrida de "Actualizar la web" | Claude; los dos aprueban |
| **Una prueba de los documentos** (`pruebas/docs.test.mjs`): que existan los enlaces relativos, que "la próxima regla" coincida con `docs/10`, sin números de feeds escritos a mano | Claude |
| **Enchufar el registro de uso de la IA** (`redes/uso-ia.mjs`, regla 170) en `ingesta/lectura-ia.mjs`, fotos, voces y pistas: hoy sólo anota la redacción. En cada llamada, después de leer el JSON de la respuesta: `anotarUsoIA({ tarea: 'lectura', modelo, clave: 'clasificacion' o 'groq', respuesta: j })` (Gemini trae `usageMetadata`, Groq `usage`; los dos los entiende) y, si la llamada falla, `anotarUsoIA({ tarea, modelo, clave, error: res.status })`. Nunca lanza. Con 2 semanas de datos se puede calcular el costo equivalente a precio de lista | Claude |

## Para revisar juntos: qué sirve y qué no (pedido de Andrés, 15/10)

Pasada de punta a punta, módulo por módulo, después de terminar la tanda de mejoras. Para cada herramienta, servicio, archivo y proceso: qué hace, por qué existe, si se usa de verdad (con evidencia), qué cuesta y qué conviene (mantener, reemplazar o apagar).
- La base ya está hecha en las auditorías del 15/10: `docs/etapa-10-operacion/ANALISIS.md` (tabla herramienta/servicio), `docs/salud-tecnica/ANALISIS.md` (mapa de 13 módulos), `docs/auditoria-opus/ANALISIS.md`, `docs/criterio/`, `docs/analiticas/`, `docs/etapa-2-5/` y `docs/etapa-6-9/`.
- Revisar con ojo de dueños: las redes (qué piezas rinden), el panel del celular y el de la PC, los workflows manuales, `comercial/`, `pruebas-modelos/`, `criterio-unico/`, las claves de IA y cada cuenta (cuáles se usan y cuáles no).
- Después de esa pasada: la auditoría final con Opus sobre lo que quedó.
- **Dos errores de escritura congelados en `web/data/correcciones.json`** (hallazgo B1 de la auditoría de Opus; no se tocaron porque lo de una persona no se edita sin decidir): en la nota `1b3umaz` dice "si el equipo se consagra **campen**" (debería ser "campeón") y en `woerbj` dice "La **Séleccion** Argentina" (debería ser "La Selección Argentina"). Como `correcciones.json` cuenta como escrito por una persona, ningún arreglo automático los toca. Decidir juntos: corregirlos a mano (con `motivo`, `cuando` y `por`) o dejarlos.

## De la consulta a ChatGPT (15/10) cruzada con la auditoría de Opus

Respuesta completa en `docs/auditoria-opus/RESPUESTAS-OTRAS-IAS.md` (Grok y Meta AI piden iniciar sesión: no se consultaron). Coinciden con Opus en: abogado para la reescritura y las notas policiales, 2FA y recuperación de cuentas, respaldo fuera de GitHub, correcciones visibles, riesgo de Google por "contenido masivo sin valor propio" y más peso a lo local. Lo nuevo o distinto:
- **Contar fuentes independientes, no direcciones** (la Municipalidad más tres diarios que copian su comunicado es UNA fuente): ampliar el campo `grupo` a "fuente primaria".
- **Botón de emergencia** que frene toda publicación automática, y uno separado para Policiales, Política y redes.
- **Alerta si el robot publica de más** (por ejemplo más de 10 notas en 30 minutos) y si pasa una hora sin ejecutarse (el vigilante nuevo ya cubre lo segundo).
- **Historial de correcciones por nota** (publicado → qué cambió → por qué → quién aprobó) y una página pública de correcciones.
- **Niveles de certeza** en las notas (confirmado, informado por una fuente, versión oficial, en desarrollo, contradictorio); si dos fuentes discrepan, la nota lo dice en vez de elegir.
- **Hacia un medio más local:** menos peso a lo nacional, páginas permanentes de servicio (cortes, farmacias, Concejo, clubes, escuelas), fuentes primarias locales y alianzas (Bomberos, clubes, escuelas, Cámara de Comercio).
- **Google:** News Sitemap aparte (solo las últimas 48 horas), NewsArticle completo (autor, fecha de modificación), página de transparencia (cómo trabajamos, uso de IA, correcciones, propietario).
- **Canal de WhatsApp y una newsletter** ("Radar de la mañana", 5 notas, 7:30), antes que una guía de comercios.
- **Etiqueta de IA visible en los videos** ("Video y voz generados con IA a partir de información periodística verificada") y nunca una voz que imite a una persona real.
- **Un documento "si mañana falta uno de nosotros"** (dominio, cuentas, pagos, recuperación) y la prueba anual de reconstruir todo si desapareciera GitHub.
- **Dónde NO coincide con Opus:** ChatGPT no migraría a Workers + D1 todavía (50 visitas por día). Lo que sí recomienda es sacar de git los datos que hacen de base de datos y pasar la multimedia a R2. Se discute en la revisión de punta a punta; mientras tanto el rumbo acordado sigue siendo menos GitHub y más Cloudflare. Sobre las 500 compilaciones gratis de Pages: no aplican, el sitio se sube por Direct Upload sin que Cloudflare compile.

## Lo que quedó armado en la ventana autónoma del 15/10 (para mirar juntos)

- **Armado y sin conectar a producción**: `motor/` (esquema de la base D1 y su importador, con prueba de espejo contra `web/data`), `redes/reparar-estadisticas.mjs` (simula por defecto; 6 días a reparar; necesita el token de analíticas de Cloudflare para `--aplicar`), `docs/etapa-10-operacion/DISENO-MOTOR.md` y `docs/salud-tecnica/ARCHIVO-PERMANENTE.md` (diseños, con sus preguntas).
- **12 decisiones del celular de tipo "publicada" no traen `motivo`** (`celular-decisiones.json`): el esquema nuevo las rechaza. Decidir qué motivo se les pone antes de armar el puente.
- **Decisiones de ustedes** (ver `docs/DECISIONES.md`, 15/10): limpiar o no el historial público de git (M4), recorte automático cerca de los 20.000 archivos (M5) y "una menor" suelta en la lista roja.
- **Tocar a mano**: probar `/probar-mail` del vigilante (mail de prueba), confirmar el perfil de TikTok, y el espejo en GitLab si lo quieren.

## Después de la mudanza (15/10)

| Qué | Quién |
|---|---|
| Mirar unos días que el Worker `radar-balcarce-reloj` dispare "Actualizar la web" (:00 y :30) y "Redes" (:05, :35 y :45) y que las corridas sigan en verde | Claude, con los dos |
| Cuando el Worker esté confirmado, borrar los tres trabajos pausados de cron-job.org | Una persona |
| Comprobar que la llave del panel del celular de cada uno anda con el repositorio nuevo (si dice "La llave no anda", crear otra: `docs/09-PANEL.md`) | Hernán y Andrés |

## Con fecha

| Cuándo | Qué | Quién |
|---|---|---|
| Antes del 19/10 | Ubuntu 26: los robots están fijos en 24.04; probar uno a propósito antes de pasar | Claude |
| Desde el 20/10 | Efemérides de noviembre: se arman **después de la renovación** (decisión del 12/10); el vigilante va a avisar desde el 20 que falta el mes | Claude arma; los dos aprueban en Fechas |
| 21/10 | Next 15 deja de recibir parches. No se pasa a Next 16 mientras el límite de 20.000 archivos de Cloudflare lo impida (regla 148) | Los dos deciden; Claude |
| Antes del 25/10 | Piezas fijas de Participá: vencen el 31/10. Decidir si se renuevan ("Fijar piezas") | Los dos |
| Antes del 10/12 | Archivo permanente: que el enlace de una nota que salió de las 3.700 con página no dé 404 (R2 + Worker o páginas mínimas; diseño y pasos en `docs/salud-tecnica/ARCHIVO-PERMANENTE.md`). Mientras tanto, sacar las fotos del sitio a R2 gana lugar | Los dos deciden; Claude arma; una persona crea el depósito |
| 15/12 | Revisión general (archivo, fotos, respaldo) | Los dos, con Claude |
| 21/09/2027 | Renovar el dominio `radarbalcarce.com` (DonWeb). El vigilante avisa 30 días antes | Los dos |
| 29/09/2027 | Renovar la llave del panel del celular y las dos voces propias ("Crear voces", modo `recrear`; `CRITERIO-REDES.md` § 6) | Hernán; los dos |
| Cada 90 días | Mirar las medidas de imagen de las redes (`FORMATOS.md`; la auditoría de los lunes avisa) | Los dos |

## Lo que hace una persona (cuentas, claves, borrar publicado)

| Qué | Quién |
|---|---|
| **Respaldo externo** (GitLab y Cloudflare R2): hoy el único historial está en GitHub. Pasos en `docs/propuestas/PASOS-PARA-USTEDES.md` § 1 | Los dos |
| Aprobar que corran los pull requests de afuera (GitHub → Settings → Actions → General → "Require approval for all outside collaborators") | Andrés |
| Verificación en dos pasos en las cuentas del medio; confirmar quién administra cada una | Los dos |
| Borrar el proyecto de Vercel y limpiar el DNS que quedó (apagado desde el 25/09) | Hernán |
| Pegar las bios y completar los perfiles de Instagram y Facebook (`PERFILES.md`, `/compartir`): categoría, enlace, botón de WhatsApp, cinco historias destacadas | Los dos |
| Mandarse un mail de prueba a `contacto@`, `redaccion@` y `publicidad@` y decidir "Enviar como" en Gmail | Los dos |
| Borrar a mano las copias repetidas de Instagram (nota de 19 y 114 bis), el repaso duplicado del 25/09 y, si se decide, el posteo del superávit del 29/09 | Hernán |
| AdSense, con `radarbalcarce@gmail.com` (pide datos fiscales) | Los dos |
| Search Console, Bing y todo lo de SEO: **después de la renovación** (decisión del 12/10) | Los dos |

## Lo que puede hacer Claude (cuando la etapa lo permita)

| Qué | Notas |
|---|---|
| Avisos y resumen diario por **mail** (decisión del 12/10), con un aviso de afuera si el vigilante mismo se cae | Falta elegir el servicio de envío |
| Farmacia con fuente propia, cotejada con la página del Colegio (decisión del 12/10) | |
| Miniaturas livianas (~480 px) y fotos nuevas en WebP | La mayor mejora de carga en el celular |
| Sacar del despliegue los dos videos de `/compartir` (9,9 MB) | |
| En el panel del celular: lista de sólo lectura de lo frenado en rojo; "juntadas hoy" y "parecidas sin juntar" en Revisión | |
| Revisar qué parte del texto de las pistas queda todavía sin cifrar (el informe ya viaja cifrado) | Delicado: se avisa antes |
| Contar los créditos de búsqueda (Tavily) en el resumen diario | |
| Actualizar las acciones de GitHub (Node 20 deprecado en `checkout`, `setup-node`, `cache` v4) | Probar en un workflow manual primero |
| Arreglos chicos del sitio: `<title>` cortado con "…", botones de menos de 44 px, política de privacidad (Open-Meteo, DolarApi), podar `banco-fotos.json`, tres créditos de Wikimedia incompletos | |
| Comentarios viejos en el código ("clave paga", `CANDIDATOS` de `ingesta/fuentes.mjs`) | |
| Fuentes locales que faltan: fútbol local (Liga Balcarceña, Regional Amateur), Policiales (Policía, bomberos, Defensa Civil), agenda con una semana de anticipación (municipio, clubes, Teatro, Sociedad Rural) | Entra en la etapa de fuentes |
| Medir la originalidad de las notas de varias fuentes (cuánto se parece cada cuerpo a sus fuentes) | Entra en la etapa de redacción |
| Conectar las escenas de deporte (F1, tabla de la Liga) cuando se decida cuándo salen | Falta decisión |
| "Buenas noches" dicho dos veces al principio del clima de la noche (4/10): ver si se repite | |
