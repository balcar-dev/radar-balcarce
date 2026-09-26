# Pendientes: todo en un solo lugar

Los otros documentos explican **cómo** funciona cada cosa; éste dice **qué
falta**. Lo que se exige siempre está en `REGLAS.md`. El estado de la
auditoría del 25/09, ítem por ítem, está en `docs/historico/AUDITORIA.md`.

*Última revisión: 25/09/2026.* Lo que ya se hizo está al final ("Ya resuelto").
Cada cosa figura una sola vez: si está en "Para mañana", no se repite abajo.

## PARA MAÑANA (26/09), en este orden

1. **Reiniciar el panel** (cerrar su ventana y doble clic en `ARRANCAR.bat`).
   Sin eso sigue con el código viejo: publica en Vercel, respalda las claves y
   no tiene los arreglos de seguridad del 25/09.
2. **Borrar las claves en texto plano.** `panel/datos/CLAVES-INICIALES.txt`
   (una vez que las contraseñas nuevas estén guardadas en otro lado) y, en las
   copias viejas de `respaldos/`, los `CLAVES-INICIALES.txt` y `secreto.txt`
   que quedaron de antes del 25/09. Las copias nuevas ya no los llevan.
3. **Decidir si Política y Policiales esperan a una persona también en la
   web** (Hernán y Andrés). Hoy, en la web, salen solas si el semáforo da
   verde; en las redes siempre esperan a una persona. Si se decide que
   esperen, es sacarlas de `verdeSecciones` en `ingesta/fuentes.mjs`.
4. **Confirmar el texto de "Quiénes somos"** (`/quienes-somos`): dice "Lo
   hacen Hernán y Andrés, dos vecinos de Balcarce". Si no los representa, se
   cambia en `web/app/quienes-somos/page.js`.
5. **Cuerpos de las notas:** el 25/09 a la mañana tenía cuerpo el 19 %; a la
   madrugada, con la portada de 72 h y la IA primero en lo local, 62 de 104
   (60 %). El vigilante pide 35 %. Es lo que más pesa para Google y para AdSense. Mirar si sube con la
   IA reescribiendo primero lo local (log de "Actualizar la web": clave de
   Gemini, cuota y por qué rechaza el verificador, que ahora lo dice).
6. **Google AdSense** (lo pidieron Hernán y Andrés). Lo que falta:
   - una persona abre la cuenta (pide datos fiscales) y pide la revisión;
   - `ads.txt` con el ID de editor que da AdSense (sin el ID no se puede
     armar);
   - más notas con cuerpo (el punto 5): AdSense rechaza sitios con poco
     contenido propio.
   "Quiénes somos", "Contacto" y la política de privacidad ya están. La
   aprobación tarda de días a semanas. Detalle en `PUBLICIDAD.md`.
7. **Permisos para las estadísticas** (las pide el resumen de WhatsApp; los
   seguidores ya llegan):
   - Cloudflare: crear un token con *Account · Account Analytics · Read* y
     guardarlo como secreto `CLOUDFLARE_ANALYTICS_TOKEN` (pasos en
     `INFRAESTRUCTURA.md`).
   - Meta: regenerar el token del usuario del sistema `publicador-radar` con
     todos los permisos de ahora **más** `read_insights` e
     `instagram_manage_insights`, y reemplazar `META_TOKEN`.
   - Probar con Actions → "Prueba de estadísticas".
8. **Comercial:** campo "tipo de actividad" y micro-SAS/SAS en el catálogo.

## A. Redes y automatización

9. **Mirar los primeros días** que salgan bien los tres podcasts, el enlace en
   los posteos de Facebook y el espejo a Instagram. Si algo deja de salir,
   seguir los pasos de "Si algo dejó de salir" en `EMPEZAR-ACA.md`.
10. **Avisos nuevos por WhatsApp** (andando desde el 25/09, ver
    `INFRAESTRUCTURA.md`): mirar los primeros días que no sean demasiados ni
    muy pocos, y ajustar los umbrales en `redes/avisos.mjs`.
11. **Renovar el token de GitHub antes del 21/09/2027.** Lo usa cron-job.org
    en sus tres trabajos. El vigilante avisa por WhatsApp 30 días antes.
12. **Threads**: pide su propio token, distinto del de Facebook e Instagram.
13. **La agenda de la semana en historia** todavía se arma sólo en la PC
    (`reels/plan.mjs` lee `panel/datos/agenda.json`). Desde el 25/09 los eventos
    ya están en GitHub con su página (`web/data/agenda.json`: los del municipio
    y los que se publican desde el panel), así que falta poco: que
    `reels/plan.mjs` los lea de ahí (con el enlace a cada página) y sacar
    `agenda` de `SOLO_EN_LA_PC` en `redes/piezas.mjs`. Además, **revisar la
    base de contactos** (`ingesta/contactos-agenda.json`, 43 instituciones):
    lo dudoso está anotado en `nota` (Cámara de Comercio y Museo Histórico con
    teléfonos de guías, Escuela de Estética con datos de 2013, varios clubes
    sólo con Instagram, clubes que no se pudieron confirmar). Y empezar a
    escribirles desde "A quién escribir este mes" (`PANEL.md`).
14. Mirar cómo salieron las primeras tandas (voz, horarios, cantidad) y ajustar
    `redes/elegir.mjs` / `redes/piezas.mjs` según rinda.
15. **Hashtags**: hoy las piezas salen sin ninguno. Probar `#Balcarce` + uno de
    la sección durante dos semanas y comparar el alcance con números propios.
16. Permiso `instagram_manage_insights` para leer qué rinde cada red.

Encontrado al auditar el contrato del día (26/09, `redes/contrato.mjs`); lo que
sigue es de `reels/` y de `redes/publicar-piezas.mjs`, y no está arreglado:

- **16a. Las historias de los podcasts largos no salen (ALTA).** Una historia
  acepta hasta 60 segundos (Instagram: "Max duration for stories is 61.0";
  Facebook la rechaza también). El podcast de la noche, con 4 notas, duró
  62,7 s el 25/09 y **su historia no salió en ninguna de las dos redes**; el
  reel sí. Los de la mañana y la tarde (3 notas) van justos. Arreglo: al armar
  el podcast, si pasa de 58 s, hacer para la historia un corte de 58 s
  (`ffmpeg -t 58`, con un cierre corto) y usarlo sólo para `STORIES`, o bajar
  las notas del podcast de la noche a 3. Mientras tanto el vigilante avisa
  "no salió la historia de podcast noche… no se reintenta".
- **16b. La historia de un reel, y la copia en la segunda red, no se
  reintentan (MEDIA).** `piezasQueTocan` mira sólo la red que manda
  (Instagram): en cuanto el reel salió, la pieza ya no "toca", así que si la
  historia falló (o Facebook falló después de tres intentos) no hay otra
  vuelta. Arreglo: guardar en el libro qué falta de cada pieza y rearmarla sólo
  si falta algo; o subir la historia con tres intentos y un corte automático
  (ver 16a).
- **16c. Los teléfonos útiles no salen los días que rota (MEDIA).**
  `redes/piezas.mjs` (`diaRotativoDeUtiles`) decide el día de la semana, pero
  `reels/plan.mjs` usa el de `panel/horarios.mjs` (martes) y sólo arma la pieza
  ese día. El 25/09 (viernes) el reloj dijo "tocan: utiles" cada 30 minutos de
  11:00 a 16:00 y nunca se armó; hasta las 15:49 eso además hacía fallar la
  corrida de Redes. Arreglo: que `plan.mjs` use el mismo día que el reloj.
  Mientras, la auditoría muestra "semanal teléfonos útiles: falta".
- **16d. `historiasPorDia: 6` de `reels/plan.mjs` no se aplica (BAJA).** Sólo se
  imprime. Con los útiles y la agenda pueden salir 7 u 8 historias en un día:
  no hay nada que las frene, y el contrato del día las cuenta aparte.
- **16e. Sin `REDES_ACTIVAS` todo parece faltar (BAJA).** Con el interruptor
  apagado el libro no se escribe y el vigilante avisa de cada pieza que falta.
  Es lo esperable, pero el aviso no lo dice.

## B. Perfiles y medidas

17. **Aplicar a mano las biografías** de Instagram y Facebook (las nuevas ya
    no prometen "revisión humana" en todo), la categoría, el botón de
    contacto y las historias destacadas fijas; hacer avatar y portada;
    confirmar nombre y categoría. Los textos están listos en `PERFILES.md`.
    Instagram sólo se edita desde el celular; Facebook, desde Meta Business
    Suite.
18. **Confirmar las medidas de `FORMATOS.md` que no tienen fuente oficial**:
    foto de perfil de Instagram (1080 × 1080) y foto de perfil de Facebook
    (720 × 720). Están marcadas
    `verificado: false` en `redes/formatos.mjs`. Además, volver a mirar todas
    cada 90 días (la auditoría avisa).

18b. **Subir a mano la portada nueva de Facebook** (25/09): la anterior se veía
    cortada en el celular ("ADAR BALCARC") y con la bajada tapada por el avatar.
    La nueva es 16:9, 1640 × 924: `node reels/portada.mjs` genera
    `reels/salida/portada-facebook.png`. Se sube sólo desde la app o el
    navegador (Meta no deja por API con el token actual). Revisar cómo queda en
    el celular y en la compu.

## C. SEO y posicionamiento

Lo hecho y lo que falta, en detalle, en `SEO.md`. AdSense está en "Para
mañana".

19. **Bing Webmaster Tools** (se puede importar desde Search Console; pide un
    permiso de Google, lo hace una persona).
20. Mirar en Search Console qué páginas indexó Google (el sitemap se envió el
    24/09).
21. **Google Publisher Center** (Google Noticias y Discover): alta manual e
    imágenes de al menos 1200 px.
22. **Política editorial** como página pública ("Quiénes somos" y "Contacto"
    ya están desde el 25/09).
23. Medir con PageSpeed Insights (Core Web Vitals) y ajustar.
24. Depurador de Facebook y Twitter Cards en todas las páginas; parámetros UTM
    en los enlaces de redes.
25. Enlaces internos entre notas mientras las etiquetas de temas estén
    apagadas (`MOSTRAR_TEMAS`).
26. Decidir en `robots.txt` si se permite a los rastreadores de IA (GPTBot,
    ClaudeBot, PerplexityBot, Google-Extended). Decisión editorial.
27. Google Business Profile, si corresponde.
28. Nota duplicada con dos direcciones ("Zona Fría"): el agrupamiento todavía
    no las une.

## D. Editorial y contenido

- **Fuente local de Policiales (26/09).** Hecho: se sacaron las 3 fuentes nacionales;
  cupo de afuera 0; palabras locales nuevas (incendio, asalto, ladrón, robaron,
  estafa, alcoholemia, persecución). Revisado y sin feed usable: Bomberos
  Voluntarios (sin sitio propio; salen en La Vanguardia y Puntonueve), Policía
  Comunal / Jefatura / Defensa Civil (categorías del WordPress de la Municipalidad:
  1 a 18 notas en total y casi ninguna policial; ya entran por el feed general del
  municipio). Falta: seguir cazando fuentes (Facebook de la Comisaría y de Bomberos
  no tienen feed; Tránsito publica operativos cada tanto en la categoría Movilidad
  y Control Urbano).

29. Mirar cómo salen las notas reescritas con IA (cuerpo distinto del copete,
    sin inventos) y ajustar el prompt si hace falta: se corrige en
    `CRITERIO-EDITORIAL.md`, sección 12.
30. **La clasificación por palabras se equivoca**: un proyecto de una escuela
    primaria salió en Deportes; noticias de fútbol peruano entran por las
    fuentes nacionales. Se ajusta agregando o sacando palabras en
    `REGLAS_SECCION` (`ingesta/fuentes.mjs`); `npm run auditar` muestra qué
    palabra decidió cada nota.
31. **Falsos positivos conocidos del semáforo** (Hernán y Andrés deciden: la
    lista no se toca sin preguntar): "violación de la ley" da rojo y "el menor
    de los males" da amarillo. Hoy es preferible pasarse de cuidadoso; si
    frena demasiadas notas, se afina la frase.
32. **Decidir con números** qué sección puede salir sola, cuál se lee más y si
    conviene partir o unir alguna, cuando la analítica de Cloudflare tenga un
    par de semanas de tráfico.
33. **Fuentes nuevas para evaluar** (faltan confirmar si tienen RSS): **Acción
    5** (deportivo balcarceño, una segunda voz para Deportes) y el **Boletín
    Oficial Municipal** (`sibom.slyt.gba.gov.ar/bulletins/11595`, fuente
    primaria de las actas del Concejo Deliberante; conecta con `IDEAS.md`).
34. Lo pendiente de la investigación de la competencia (WhatsApp para
    lectores, alertas de clima, "lo más leído", encuestas): ver
    `docs/historico/INVESTIGACION-COMPETENCIA.md` § 4.

## E. Panel

35. **Panel 100% online.** Hoy vive en la PC de Hernán y, con la PC apagada, no
    se pueden decidir notas amarillas ni cargar avisos. Primero hay que
    decidir cómo se entra (Cloudflare Access o login propio) y que una persona
    cargue el token de GitHub en Cloudflare. Opciones sin costo y con costo en
    `PANEL.md`.
36. **Apuntar `RESPALDO_CARPETA`** a una carpeta de Drive u OneDrive, para que
    el respaldo del panel quede afuera de la PC. Si se rompe el disco hoy, se
    pierde el historial editorial.
37. Cerrar el túnel de Tailscale (`tailscale funnel --https=443 off`) cuando no
    haga falta.

## F. Infraestructura y código

38. **Borrar el proyecto de Vercel y limpiar el DNS que quedó.** Vercel está
    apagado desde el 25/09 (sin conexión a GitHub, no despliega). Borrar
    también el sitio duplicado de la cuenta vieja
    (`radar-balcarce.vercel.app`).
39. **Clave gratuita de redacción**: cargada el 25/09 (probada con el workflow
    "Prueba de Gemini"). La redacción usa primero la gratis y sólo pasa a la paga
    si la gratis se queda sin cupo (429). Tope de 150 notas por día
    (`REESCRITURA.porDia`). Falta poner un tope de presupuesto en Google Cloud
    para la clave paga.
40. **`tocaHoy`** (`ingesta/utiles.mjs`, qué día salen los teléfonos útiles)
    todavía cuenta el día con la zona del servidor, no con la de Balcarce.
41. `next`/`postcss` con una vulnerabilidad conocida (riesgo bajo: el sitio es
    estático). Actualizar cuando haya versión.
42. Una política de seguridad de contenido (CSP) completa en
    `web/public/_headers` (hoy sólo `frame-ancestors`).
43. `ingesta/ingesta.mjs` es muy largo.

## G. Base comercial y publicidad

44. **Completar los 145 comercios**, pedir la lista de socios a la Cámara de
    Comercio y el padrón de habilitaciones al municipio. Todo en `COMERCIAL.md`.
45. **Cargar el primer aviso** en los tres espacios de la web, preguntar
    precios en Balcarce y armar la página `/publicidad` y el media kit
    (`PUBLICIDAD.md`).

Las ideas más grandes, que cambian cómo funciona algo, están en `IDEAS.md`.

## Ya resuelto (para no volver a proponerlo)

- **Arreglos de la auditoría del 25/09** (detalle en `docs/historico/AUDITORIA.md`):
  - **WhatsApp de la Vigilancia funcionando** (teléfono completo con 549 y la
    clave correcta; probado con "Prueba de WhatsApp").
  - **Repositorio público**, para no quedarse sin minutos de Actions. Sin
    claves en el historial.
  - **Enlaces de redes que no se rompen**: dirección fija desde la primera
    publicación, archivo de 180 días (`web/data/archivo.json`) y rescate en
    la 404. Se recuperaron 1556 notas.
  - **Portada sólo con notas de las últimas 72 h**, ahora en la nube (antes
    sólo con la PC prendida). Se vio que la portada quedó bien.
  - **Semáforo más estricto**: mira el texto completo y lo que escribe la IA;
    términos nuevos con una prueba por término; la IA tiene prohibido
    identificar menores y víctimas.
  - Cupos de afuera (Automovilismo 12, Tecnología 8, Política 8) y la IA
    reescribe primero lo local.
  - Facebook no repite tema en 24 h y publica hasta las 22:00 en punto.
  - Web: canónico propio en Farmacias, Agenda, Útil y Privacidad; "Quiénes
    somos" y "Contacto"; pie honesto sobre la revisión; `_headers`; logo en
    el JSON-LD; `es-AR`; sitemap de noticias sin fechas de relleno.
  - Workflows con hora de Balcarce, tiempos máximos, `wrangler` fijo y
    permisos justos; la Vigilancia avisa el vencimiento del dominio y ya no
    pinta de rojo.
  - Panel: ya no publica en Vercel, respaldo sin claves, freno de intentos
    firme, control de origen, "Salir" por POST, poda de decisiones a 60 días,
    sin dependencias de afuera (con prueba que sigue los imports en cadena).
  - Vercel apagado (queda borrar el proyecto: punto 38).
- Dominio propio (`radarbalcarce.com`, 21/09) y mudanza a **Cloudflare Pages**
  (24/09), con `www` redirigido y Web Analytics.
- Search Console verificado y sitemaps enviados (24/09); datos estructurados;
  `sitemap-news.xml` y `llms.txt` (23/09).
- Redes con Meta: página, Instagram, app, usuario del sistema y token sin
  vencimiento (21/09). **Meta destrabó la cuenta y Redes y Piezas andan** (24/09).
- Dos claves de Gemini separadas (21/09).
- El reloj publica con un disparador externo confiable, cron-job.org (21/09).
- Historias y reels en la página de Facebook además de Instagram (21/09).
- **Tres podcasts por día** en lugar de noticias sueltas, con un color distinto
  cada día, el enlace a la nota y sin nombrar la fuente (23 y 24/09).
- Posteo de Instagram vertical 1080 × 1350 con zona segura, Facebook 1200 × 630,
  y **auditoría semanal** de las medidas (24/09, `FORMATOS.md`).
- **Vigilancia por WhatsApp** (CallMeBot) con chequeos de las reglas de
  contenido (24/09, `redes/vigilar.mjs`).
- **La IA recibe el texto completo de la fuente** (`ingesta/articulo.mjs`); el
  cuerpo es la nota desarrollada y distinta del copete, con verificador
  anti-invención y un reintento con corrección (24/09).
- Portada sin fuentes arriba de los títulos, sin "la vimos hace…", con la
  farmacia sin hora de cierre y las notas de la más nueva a la más vieja (24/09).
- Reescritura con IA 100 % en la nube (22/09) y cuerpo visible y editable en
  el panel (23/09).
- Los tres espacios de publicidad se cargan desde el panel (23/09).
- Facebook espeja cada posteo como foto en el feed de Instagram (23/09).
- El turno de farmacia cambia a las 8:30, no a las 9.
- Etiquetas de temas apagadas en la web (cargaban la página).
- Subtítulos sincronizados con la voz (22/09).
- **El panel sube solo sus decisiones a GitHub** (`panel/sincronizar.mjs`) y
  se respalda solo (`panel/respaldo.mjs`) (24/09).
- Contraseñas del panel cambiadas (25/09).
- Base comercial armada con 145 comercios de OpenStreetMap (24/09).
