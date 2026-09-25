# Pendientes: todo en un solo lugar

Los otros documentos explican **cómo** funciona cada cosa; éste dice **qué
falta**. Lo que se exige siempre está en `REGLAS.md`.

*Última revisión: 25/09/2026.* Lo que ya se hizo está al final ("Ya resuelto").

## PARA MAÑANA (26/09), en este orden

1. **WhatsApp NO está andando.** El 25/09 el workflow "Prueba de WhatsApp"
   (Actions → Run workflow) mostró que CallMeBot contesta **"APIKey is
   invalid"** y que el secreto `WHATSAPP_TELEFONO` tiene **7 dígitos** (tiene
   que ser el número completo con código de país, sin + ni espacios, el mismo
   con el que se activó CallMeBot). Hay que cargar de nuevo los dos secretos
   (los pega una persona) y volver a correr "Prueba de WhatsApp" hasta que
   llegue el mensaje al celular. Ojo: durante unas horas el código dio ese
   error por bueno (arreglado el 25/09, con prueba); nunca llegó ningún aviso.
2. **Ver que la portada quedó bien** con el deploy nuevo (sin fuentes arriba
   de los títulos, sin "la vimos hace", farmacia sin hora, más nuevas primero)
   y que el vigilante ya no detecta esas reglas. El 25/09 a la noche estaba bien.
3. **Cuerpos de las notas:** el 24/09 sólo 15 de 115 notas tenían cuerpo. Mirar
   si sube (log de "Actualizar la web": clave de Gemini, cuota, verificador).
4. **Google AdSense** (lo pidió el usuario para mañana).
5. **Panel online** (`PANEL.md`): decidir cómo se entra (Cloudflare Access o
   login propio) y que una persona cargue el token de GitHub en Cloudflare.
6. Cloudflare Web Analytics: el código ya está en el sitio; mirar en el panel
   de Cloudflare que estén llegando visitas.
7. Perfiles: aplicar las biografías de `PERFILES.md` (Instagram sólo desde el
   celular) y hacer avatar/portada; confirmar nombre y categoría.
8. Comercial: campo "tipo de actividad" y micro-SAS/SAS en el catálogo.
9. Borrar `panel/datos/CLAVES-INICIALES.txt` cuando las claves nuevas del panel
   (cambiadas el 25/09) estén guardadas en otro lado.

## A. Redes y automatización

1. **Mirar los primeros días** que salgan bien los tres podcasts, el enlace en
   los posteos de Facebook y el espejo a Instagram. Si algo deja de salir,
   **lo primero es revisar cron-job.org**: desactiva solo un trabajo que falla
   varias veces (`INFRAESTRUCTURA.md`).
2. **Renovar el token de GitHub antes del 21/09/2027.** Lo usa cron-job.org
   en sus tres trabajos. El vigilante avisa por WhatsApp 30 días antes.
3. **Threads**: pide su propio token, distinto del de Facebook e Instagram.
4. **La agenda de la semana en historia** sólo se arma en la PC, porque
   `panel/datos/agenda.json` no está en GitHub (a propósito).
5. Mirar cómo salieron las primeras tandas (voz, horarios, cantidad) y ajustar
   `redes/elegir.mjs` / `redes/piezas.mjs` según rinda.
6. **Hashtags**: hoy las piezas salen sin ninguno. Probar `#Balcarce` + uno de
   la sección durante dos semanas y comparar el alcance con números propios.
7. Permiso `instagram_manage_insights` para leer qué rinde cada red.

## B. Perfiles y medidas

8. **Aplicar a mano las biografías** de Instagram y Facebook, la categoría, el
   botón de contacto y las historias destacadas fijas. Los textos están listos
   en `PERFILES.md`. Instagram sólo se edita desde el celular; Facebook, desde
   Meta Business Suite.
9. **Confirmar las medidas de `FORMATOS.md` que no tienen fuente oficial**:
   foto de perfil de Instagram (1080 × 1080), portada de la página de Facebook
   (1640 × 624) y foto de perfil de Facebook (720 × 720). Están marcadas
   `verificado: false` en `redes/formatos.mjs`. Además, volver a mirar todas
   cada 90 días (la auditoría avisa).

## C. SEO y posicionamiento

Lo hecho y lo que falta, en detalle, en `SEO.md`.

10. **Bing Webmaster Tools** (se puede importar desde Search Console; pide un
    permiso de Google, lo hace una persona).
11. **Google AdSense**: se dejó para más adelante (24/09). Pide cuenta con
    datos fiscales, verificar el sitio, `ads.txt` y aprobación de días a
    semanas. Ver `PUBLICIDAD.md`.
12. Mirar en Search Console qué páginas indexó Google (el sitemap se envió el
    24/09).
13. **Google Publisher Center** (Google Noticias y Discover): alta manual e
    imágenes de al menos 1200 px.
14. Páginas de confianza (quiénes somos, contacto, política editorial).
15. Medir con PageSpeed Insights (Core Web Vitals) y ajustar.
16. Depurador de Facebook y Twitter Cards en todas las páginas; parámetros UTM
    en los enlaces de redes.
17. Enlaces internos entre notas mientras las etiquetas de temas estén
    apagadas (`MOSTRAR_TEMAS`).
18. Decidir en `robots.txt` si se permite a los rastreadores de IA (GPTBot,
    ClaudeBot, PerplexityBot, Google-Extended). Decisión editorial.
19. Google Business Profile, si corresponde.

## D. Editorial y contenido

20. Mirar cómo salen las notas reescritas con IA (cuerpo distinto del copete,
    sin inventos) y ajustar el prompt si hace falta. Detalle en `EDITORIAL.md`.
21. **Decidir con números** qué sección puede salir sola, cuál se lee más y si
    conviene partir o unir alguna, cuando la analítica de Cloudflare tenga un
    par de semanas de tráfico.
22. **Fuentes nuevas para evaluar** (faltan confirmar si tienen RSS): **Acción
    5** (deportivo balcarceño, una segunda voz para Deportes) y el **Boletín
    Oficial Municipal** (`sibom.slyt.gba.gov.ar/bulletins/11595`, fuente
    primaria de las actas del Concejo Deliberante; conecta con `IDEAS.md`).
23. Lo pendiente de la investigación de la competencia (WhatsApp para
    lectores, alertas de clima, "lo más leído", encuestas): ver
    `INVESTIGACION-COMPETENCIA.md` § 4.

## E. Panel

24. **Panel 100% online.** Hoy vive en la PC de Hernán y, con la PC apagada, no
    se pueden decidir notas amarillas ni cargar avisos. Opciones sin costo y
    con costo en `PANEL.md`.
25. **Apuntar `RESPALDO_CARPETA`** a una carpeta de Drive u OneDrive, para que
    el respaldo del panel quede afuera de la PC. Si se rompe el disco hoy, se
    pierde el historial editorial.
26. Confirmar que `panel/datos/CLAVES-INICIALES.txt` ya no existe. (Las
    contraseñas del panel se cambiaron el 25/09; si se difunde otra, se cambia
    con `node panel/clave.mjs`.)
27. Cerrar el túnel de Tailscale (`tailscale funnel --https=443 off`) cuando no
    haga falta.

## F. Infraestructura

28. **(Vercel apagado el 25/09: se le sacó la conexión con GitHub, ya no despliega; el proyecto sigue ahí por si hay que volver.) Falta borrar el proyecto y limpiar el DNS que quedó de Vercel.** El dominio ya lo
    sirve Cloudflare desde el 24/09; Vercel sólo queda de respaldo. Borrar
    también el sitio duplicado de la cuenta vieja (`radar-balcarce.vercel.app`).
29. **Activar el WhatsApp de la vigilancia** si todavía no llega el resumen de
    las 21: contacto de CallMeBot, mensaje de activación y los secretos
    `WHATSAPP_TELEFONO` y `WHATSAPP_APIKEY` (pasos en `redes/whatsapp.mjs`).
    Con eso funcionando, sigue sólo.
30. **Clave gratuita de redacción** (`GEMINI_API_KEY_REDACCION`) sin cargar en
    GitHub: la reescritura usa la clave paga de redes (decidido el 24/09).
31. Comentarios de código con datos viejos (no se tocaron: sólo documentación):
    `.github/workflows/actualizar.yml` dice "22 fuentes" y "conectado a
    Vercel"; `web/components/buscador.js`, `web/components/compartir.js` y
    `web/components/piezas.js` citan `INVESTIGACION-PORTALES.md` /
    `INVESTIGACION-NACIONALES.md`, que ahora son `INVESTIGACION-COMPETENCIA.md`;
    `web/scripts/generar-datos.mjs` cita `NOTAS.md`, fase 2.

## G. Base comercial y publicidad

32. **Completar los 145 comercios**, pedir la lista de socios a la Cámara de
    Comercio y el padrón de habilitaciones al municipio. Todo en `COMERCIAL.md`.
33. **Cargar el primer aviso** en los tres espacios de la web, preguntar
    precios en Balcarce y armar la página `/publicidad` y el media kit
    (`PUBLICIDAD.md`).

## H. Ideas más grandes, para pensar

Cambian cómo funciona algo: conviene decidir con calma.

- **Un panel de salud del sistema**: hoy hay que mirar tres workflows para
  saber si algo falló (el vigilante ya cubre gran parte por WhatsApp).
- **Una vista previa de lo que el reloj va a publicar** en las próximas horas.
- **Analítica propia sin cookies** más completa que la de Cloudflare.
- **Probar los workflows localmente** (`act`).
- **Revisar la accesibilidad** de la web (contraste, texto alternativo,
  teclado): no se auditó.
- **La guía comercial y el mapa de Balcarce** con marketing conjunto y
  sorteos (`IDEAS.md`, `COMERCIAL.md`): la idea más grande y la que más
  conecta con vender publicidad.

## Ya resuelto (para no volver a proponerlo)

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
