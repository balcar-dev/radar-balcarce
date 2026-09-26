# Pendientes: todo en un solo lugar

*Actualizado el 26/09/2026.* Los otros documentos explican **cómo** funciona
cada cosa; éste dice **qué falta**. Lo que se exige siempre está en `REGLAS.md`.
Lo que ya se hizo está al final ("Ya resuelto"). Cada cosa figura una sola vez.

Cada pendiente dice **quién** lo hace (Hernán, Andrés, "los dos" o Claude) y
**qué tan urgente** es (alta, media o baja). Lo que sólo puede hacer una persona
(abrir cuentas, cargar claves, decidir criterio) nunca lo hace Claude.

## Lo primero del 26/09: comprobar que Facebook ya se ve

**Los dos · alta.** La app de Meta "Radar Balcarce Publicador" estaba en **modo
desarrollo**: sus posteos y reels sólo los veían quienes tienen un rol en la
app (las historias sí). El 26/09 se **publicó** (modo activo). Hay que
comprobar, con una persona que **no sea administradora** de la página, que ahora
ve los posteos y los reels nuevos (el primer posteo sale desde las 8:10). Si los
de antes siguen ocultos, hay que volver a publicar lo importante. El workflow
**Ver Facebook** (`redes/ver-facebook.mjs`) muestra lo que Meta tiene publicado.

## Para Hernán y Andrés (a mano)

Ordenadas por urgencia. Ninguna la puede hacer Claude: piden una cuenta, una
clave o una decisión.

| # | Qué | Quién | Urgencia |
|---|---|---|---|
| 1 | **Reiniciar el panel** (cerrar su ventana y doble clic en `ARRANCAR.bat`). Node carga el código al arrancar: sin reiniciar, el panel sigue con el código viejo (sin los arreglos de seguridad del 25/09 y sin lo que se cambió desde entonces) | Hernán | Alta |
| 2 | **Tope de presupuesto en Google Cloud** para la clave paga de Gemini (voces y reels). Sin tope, un error puede gastar de más. La clave de redacción es gratis | Los dos | Alta |
| 3 | **Borrar las claves en texto plano**: `panel/datos/CLAVES-INICIALES.txt` (cuando las contraseñas nuevas estén guardadas en otro lado) y, en las copias viejas de `respaldos/`, los `CLAVES-INICIALES.txt` y `secreto.txt` de antes del 25/09. **No** borrar `panel/datos/secreto.txt`: es la firma de las sesiones del panel. Las copias nuevas ya no los llevan | Hernán | Alta |
| 4 | **Decidir si Política y Policiales esperan a una persona también en la web.** Hoy, en la web, salen solas si el semáforo da verde; en las redes siempre esperan. Si se decide que esperen, es sacarlas de `verdeSecciones` en `ingesta/fuentes.mjs` | Los dos | Media |
| 5 | **Subir la portada nueva de Facebook**: `node reels/portada.mjs` genera `reels/salida/portada-facebook.png` (16:9, 1640 × 924; la anterior se veía cortada en el celular). Se sube sólo desde la app o el navegador (Meta no deja por API con el token actual). Después mirar cómo queda en el celular y en la compu | Los dos | Media |
| 6 | **Pegar las biografías** de Instagram y Facebook (textos en `PERFILES.md`), la categoría, el botón de contacto y las historias destacadas; hacer el avatar. Instagram sólo se edita desde el celular; Facebook, desde Meta Business Suite | Los dos | Media |
| 7 | **Permisos de estadísticas** (los pide el resumen de WhatsApp; los seguidores ya llegan). Cloudflare: token con *Account · Account Analytics · Read* guardado como secreto `CLOUDFLARE_ANALYTICS_TOKEN`. Meta: regenerar el token de `publicador-radar` con los permisos de ahora **más** `read_insights` e `instagram_manage_insights` y reemplazar `META_TOKEN`. Probar con Actions → "Prueba de estadísticas" | Los dos | Media |
| 8 | **Borrar el proyecto de Vercel** y limpiar el DNS que quedó (también el sitio duplicado de la cuenta vieja, `radar-balcarce.vercel.app`). Vercel está apagado desde el 25/09 | Los dos | Media |
| 9 | **Google AdSense**: una persona abre la cuenta (pide datos fiscales) y pide la revisión; después, `ads.txt` con el ID de editor que da AdSense (sin el ID no se puede armar). La aprobación tarda de días a semanas. Detalle en `PUBLICIDAD.md` | Los dos | Media |
| 10 | **Apuntar `RESPALDO_CARPETA`** a una carpeta de Drive u OneDrive, para que el respaldo del panel quede afuera de la PC. Si se rompe el disco hoy, se pierde el historial editorial | Hernán | Media |
| 11 | **Confirmar el texto de "Quiénes somos"** (`/quienes-somos`): dice "Lo hacen Hernán y Andrés, dos vecinos de Balcarce". Si no los representa, se cambia en `web/app/quienes-somos/page.js` | Los dos | Baja |
| 12 | **Borrar el repaso duplicado de las 10:08 del 25/09** (Facebook e Instagram). **Preguntar antes**: es borrar algo publicado y no se puede deshacer | Los dos | Baja |
| 13 | **Dominios de la app de Meta**: el campo quedó vacío y no lo exigieron. Decidir si se completa con `radarbalcarce.com` | Los dos | Baja |
| 14 | **Confirmar las medidas sin fuente oficial** de `FORMATOS.md` (foto de perfil de Instagram 1080 × 1080 y de Facebook 720 × 720; están `verificado: false` en `redes/formatos.mjs`) y volver a mirar todas cada 90 días (la auditoría avisa) | Los dos | Baja |
| 15 | **Cerrar el túnel de Tailscale** (`tailscale funnel --https=443 off`) cuando no haga falta | Hernán | Baja |
| 16 | **Renovar el token de GitHub de cron-job.org antes del 21/09/2027** (lo usa en sus tres trabajos; el vigilante avisa 30 días antes). El dominio vence el mismo día | Los dos | Fecha fija |

## Decisiones de criterio que esperan a los dos

- **Falsos positivos conocidos del semáforo.** "Violación de la ley" da rojo y
  "el menor de los males" da amarillo. Hoy es preferible pasarse de cuidadoso;
  si frena demasiadas notas, se afina la frase. La lista no se toca sin
  preguntar.
- **Rastreadores de IA en `robots.txt`** (GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended): permitirlos da visibilidad y citas; bloquearlos protege el
  contenido. Decisión editorial, no técnica.
- **Qué sección puede salir sola, cuál se lee más, si conviene partir o unir
  alguna:** decidir con números cuando la analítica de Cloudflare tenga un par
  de semanas de tráfico.
- **Panel 100% online.** Hoy vive en la PC de Hernán y, con la PC apagada, no se
  pueden decidir notas amarillas ni cargar avisos. Primero hay que decidir cómo
  se entra (Cloudflare Access o login propio) y que una persona cargue el token
  de GitHub en Cloudflare. Opciones en `PANEL.md`.
- **Primer aviso publicitario**: cargarlo en los tres espacios, preguntar
  precios en Balcarce y armar la página `/publicidad` y el media kit
  (`PUBLICIDAD.md`).
- **Base comercial** (`COMERCIAL.md`): completar los 145 comercios, pedir la
  lista de socios a la Cámara de Comercio y el padrón de habilitaciones al
  municipio, sumar el campo "tipo de actividad" y micro-SAS/SAS.
- **Base de contactos de la agenda** (`ingesta/contactos-agenda.json`, 43
  instituciones): revisar lo dudoso, que está anotado en `nota` (Cámara de
  Comercio y Museo Histórico con teléfonos de guías, Escuela de Estética con
  datos de 2013, clubes sólo con Instagram o sin confirmar), y empezar a
  escribirles desde "A quién escribir este mes" (`PANEL.md`).

## Para Claude (código y seguimiento)

**Alta**

- **Mirar los primeros días de redes.** Que salgan bien los tres podcasts, el
  enlace en los posteos de Facebook y el espejo a Instagram; que el contrato del
  día cierre completo (`REDES.md`). Si algo deja de salir, seguir "Si algo dejó
  de salir" en `EMPEZAR-ACA.md`.
- **Mirar los avisos nuevos por WhatsApp** (andan desde el 25/09): que no sean
  demasiados ni muy pocos, y ajustar los umbrales en `redes/avisos.mjs`.

**Media**

- **La historia de un reel no se reintenta entre corridas (16b, resuelto en
  parte).** La historia se intenta tres veces en la misma corrida. Si falla las
  tres, no se reintenta en las siguientes ni tampoco la copia de Facebook de un
  reel que falló: el video no se guarda entre corridas y armarlo de nuevo gasta
  la voz de Gemini (y `plan.mjs` podría elegir otras notas). Para cubrirlo habría
  que guardar el `.mp4` (artefacto de Actions o Release) y bajarlo en la corrida
  siguiente; no se hizo por costo y por no poder probarlo sin publicar. Mientras
  tanto el vigilante avisa "no salió la historia de…".
- **El ritmo de la voz** (2,4 palabras por segundo) es una medición de tres
  días. Si la voz se enlentece, el corte de 58 s de las historias la ataja, pero
  hay que mirar los avisos amarillos de "Redes" ("la historia sube recortada").
- **La agenda de la semana en historia** todavía se arma sólo en la PC
  (`reels/plan.mjs` lee `panel/datos/agenda.json`). Los eventos ya están en
  GitHub con su página (`web/data/agenda.json`), así que falta que `plan.mjs` los
  lea de ahí (con el enlace a cada página) y sacar `agenda` de `SOLO_EN_LA_PC` en
  `redes/piezas.mjs`.
- **Fuente local de Policiales.** Se sacaron las 3 fuentes nacionales, el cupo
  de afuera es 0 y hay palabras locales nuevas. Sin feed usable: Bomberos
  Voluntarios (salen en La Vanguardia y Puntonueve), Policía Comunal, Jefatura y
  Defensa Civil (ya entran por el feed general del municipio). Falta seguir
  cazando fuentes (la Comisaría y Bomberos no tienen feed; Tránsito publica
  operativos en la categoría Movilidad y Control Urbano).
- **Fuentes nuevas para evaluar** (falta confirmar si tienen RSS): **Acción 5**
  (deportivo balcarceño) y el **Boletín Oficial Municipal**
  (`sibom.slyt.gba.gov.ar/bulletins/11595`, fuente primaria de las actas del
  Concejo; conecta con `IDEAS.md`).
- **Mirar cómo salen las notas reescritas con IA** (cuerpo distinto de la
  bajada, sin inventos) y ajustar el prompt si hace falta: se corrige en
  `CRITERIO-EDITORIAL.md`, sección 12. El 26/09 a las 00:33 las 94 notas de la
  portada tenían cuerpo y 21 esperaban; el vigilante pide que al menos el 35 %
  de las últimas 24 horas lo tenga.
- **La clasificación por palabras se equivoca a veces**: un proyecto de una
  escuela primaria salió en Deportes; noticias de fútbol peruano entran por las
  fuentes nacionales. Se ajusta con `REGLAS_SECCION` (`ingesta/fuentes.mjs`);
  `npm run auditar` muestra qué palabra decidió cada nota.
- **Nota duplicada con dos direcciones** ("Zona Fría"): el agrupamiento todavía
  no las une.

**Baja**

- **Threads**: pide su propio token, distinto del de Facebook e Instagram.
- **Hashtags**: hoy las piezas de video salen sin ninguno. Probar `#Balcarce`
  más uno de la sección durante dos semanas y comparar el alcance con números
  propios.
- **SEO** (detalle en `SEO.md`): Bing Webmaster Tools (importa de Search Console,
  pide un permiso de Google que da una persona); mirar qué indexó Google (el
  sitemap se envió el 24/09); Google Publisher Center (alta manual, imágenes de
  al menos 1200 px); política editorial como página pública; PageSpeed y Core Web
  Vitals; depurador de Facebook y Twitter Cards; parámetros UTM en los enlaces de
  redes; enlaces internos mientras las etiquetas de temas estén apagadas
  (`MOSTRAR_TEMAS`); Google Business Profile, si corresponde.
- **Técnico**: `next` y `postcss` con una vulnerabilidad conocida (riesgo bajo:
  el sitio es estático); una política de seguridad de contenido (CSP) completa en
  `web/public/_headers` (hoy sólo `frame-ancestors`); `ingesta/ingesta.mjs` es
  muy largo.
- **Lo pendiente de la investigación de la competencia** (WhatsApp para
  lectores, encuestas, "lo más leído"): `docs/historico/INVESTIGACION-COMPETENCIA.md`, § 4.

Las ideas más grandes, que cambian cómo funciona algo, están en `IDEAS.md`.

## Ya resuelto (para no volver a proponerlo)

- **26/09:** la app de Meta se **publicó** (modo activo); Policiales sólo de
  Balcarce y la zona; secciones flacas con 13 fuentes nuevas, pisos y cupos por
  sección (58 fuentes en total); una sola hora de Balcarce para todo el código
  (`ingesta/zona.mjs`, incluye los teléfonos útiles) y una sola lectura de JSON
  (`ingesta/json.mjs`); se sacó "Resumen hecho con IA" de los posteos de redes.
- **26/09, contrato del día y reels** (reglas 33 a 40 de `REGLAS.md`): historias
  de podcast de hasta 58 s, con presupuesto de 55 s en el guion y corte de
  seguridad (`reels/duracion.mjs`); los teléfonos útiles con una sola regla de
  "¿toca hoy?" (el 25/09 nunca se armaron); techo de 8 historias por día; con las
  redes apagadas el vigilante lo dice una vez por día; espejo de Instagram con
  reintento; reintento de la historia de un reel en la misma corrida.
- **25/09, la auditoría** (detalle en `docs/historico/AUDITORIA.md`):
  - **Repositorio público**, para no quedarse sin minutos de Actions. Sin claves
    en el historial.
  - **WhatsApp de la Vigilancia funcionando** (teléfono completo con 549 y la
    clave correcta; probado con "Prueba de WhatsApp"), con avisos nuevos y
    estadísticas.
  - **Clave gratis de redacción** cargada y probada (25/09): la redacción la usa
    primero y sólo pasa a la paga si se queda sin cupo (429). Tope de 150 notas
    por día (`REESCRITURA.porDia`).
  - **Enlaces de redes que no se rompen**: dirección fija desde la primera
    publicación, archivo de 180 días (`web/data/archivo.json`) y rescate en la
    404. Se recuperaron 1556 notas. Las notas archivadas ya están en el sitemap.
  - **Portada sólo con las últimas 72 h**, ahora en la nube.
  - **Semáforo más estricto**: mira el texto completo y lo que escribe la IA; la
    IA tiene prohibido identificar menores y víctimas.
  - **Sin cuerpo no se publica** y el lector ve la nota, no el análisis
    (`REGLAS.md`, reglas 23 y 24); la IA trabaja como editor digital (claves,
    qué se sabe, verificación).
  - **Criterio editorial único** (`CRITERIO-EDITORIAL.md`, que la IA lee tal
    cual) y **criterio único de las redes** (`CRITERIO-REDES.md`, una sola
    locutora y una auditoría de voz).
  - **Notas propias**: el dólar de cada día hábil y una nota por cada podcast;
    página `/dolar`; agenda con una página por evento y base de contactos.
  - **Tapa y celular**: tapa de cinco secciones distintas, tres notas por
    sección, "Seguí leyendo", hora en todas las notas, menú en una fila y
    servicios compactos, sistema tipográfico único.
  - Cupos de afuera (Automovilismo 6, Tecnología 8, Política 8) y la IA
    reescribe primero lo local; Facebook no repite tema en 24 h y publica hasta
    las 22:00 en punto.
  - Web: canónico propio en cada página, "Quiénes somos" y "Contacto", pie
    honesto sobre la revisión, `_headers`, logo en el JSON-LD, `es-AR`.
  - Workflows con hora de Balcarce, tiempos máximos, `wrangler` fijo y permisos
    justos; la Vigilancia avisa el vencimiento del dominio.
  - Panel: ya no publica en Vercel, respaldo sin claves, freno de intentos
    firme, control de origen, "Salir" por POST, poda de decisiones a 60 días,
    sin dependencias de afuera. Vercel apagado (queda borrar el proyecto: punto
    8 de la tabla).
  - Contraseñas del panel cambiadas.
- **24/09:** mudanza a **Cloudflare Pages** (`www` redirigido, Web Analytics);
  Search Console verificado y sitemaps enviados; Meta destrabó la cuenta y
  Redes y Piezas andan; **tres podcasts por día** en lugar de noticias sueltas;
  posteo de Instagram 4:5 con zona segura, Facebook 1200 × 630 y auditoría
  semanal de las medidas (`FORMATOS.md`); **Vigilancia por WhatsApp**; la IA
  recibe el texto completo de la fuente; el panel sube solo sus decisiones a
  GitHub y se respalda solo; base comercial con 145 comercios de OpenStreetMap;
  portada sin fuentes arriba de los títulos, sin "la vimos hace…", con la
  farmacia sin hora de cierre.
- **21 al 23/09:** dominio propio (`radarbalcarce.com`); redes con Meta (página,
  Instagram, app, usuario del sistema y token sin vencimiento); dos claves de
  Gemini separadas; el reloj con un disparador externo confiable (cron-job.org);
  historias y reels también en la página de Facebook; reescritura con IA 100 %
  en la nube; los tres espacios de publicidad se cargan desde el panel; Facebook
  espeja cada posteo como foto en Instagram; el turno de farmacia cambia a las
  8:30; subtítulos sincronizados con la voz; etiquetas de temas apagadas.
