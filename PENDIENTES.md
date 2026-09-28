# Pendientes: todo en un solo lugar

*Actualizado el 28/09/2026 a la noche.* Los otros documentos explican **cómo** funciona
cada cosa; éste dice **qué falta**. Las reglas que se exigen siempre están en `docs/10-REGLAS-Y-PRUEBAS.md`; cómo funciona
cada parte, en `docs/` (empezar por `docs/00-INDICE.md`).
Lo que ya se hizo está al final ("Ya resuelto"). Cada cosa figura una sola vez.

**Redes prendidas otra vez desde el 28/09 a las 12:50** (Hernán: "activá las
redes nuevamente"). Estuvieron en pausa esa mañana (`REDES_ACTIVAS` en `No`)
mientras se arreglaban los perfiles: foto y portada azules, bio y nombre de
Instagram, ubicación de Facebook, y se borró el posteo de Necochea. Para
apagarlas: la variable a `No` en GitHub, o pedírselo a Claude.

Cada pendiente dice **quién** lo hace (Hernán, Andrés, "los dos" o Claude) y
**qué tan urgente** es (alta, media o baja). Lo que sólo puede hacer una persona
(abrir cuentas, cargar claves, decidir criterio) nunca lo hace Claude.

## El plan V2.2 (27/09): cómo se eligen las notas

El plan completo, con la hoja de ruta, está en [`docs/historico/PLAN-V2.2.md`](docs/historico/PLAN-V2.2.md)
(es la foto del plan de ese día; lo que quedó por hacer está en la tabla de abajo).
Punto de restauración anterior a los cambios: la etiqueta `antes-de-v2.2` en GitHub.

**Hecho el 27/09:** filtro de entrada por la sección del medio (otros países,
policiales de afuera, consejos), feeds generales que sólo cuentan cobertura,
ficha de cada fuente, "de Balcarce" sólo con el título, redes sólo con lo de
Balcarce, título de la IA sin Balcarce de más, 197 notas retiradas de la web
(`web/data/retiradas.json`), medios de España y chimentos apagados. **A la
tarde:** el cruce de medios (160 feeds más, de 76 medios, en
`ingesta/fuentes-cruce.mjs`; lo de afuera sólo con dos medios o más, con
memoria de 36 horas), la lectura con IA decidiendo, las repetidas juntas en una
nota, Fútbol aparte de Deportes, Argentina en lugar de País, sin sección
Servicios, títulos sin "en Balcarce" al final, correcciones a mano en
`web/data/correcciones.json`, un color distinto por sección y la tipografía
nueva (Source Serif 4 e Inter en la web, las imágenes, las placas, el panel y
la guía comercial). **A la noche:** la importancia de lo de afuera por cantidad
de medios (`MEDIOS_DE_AFUERA`, sin piso de puntaje), un nombre por medio, sin
secciones Región ni Provincia, sin `maxItems` ni fuentes "de señal", la IA saca
los chimentos, el archivo sin las páginas de afuera de un solo medio y el
registro de fuentes `FUENTES.md`. **Más tarde:** del extranjero sólo con un
argentino, lo de la zona sale solo con un medio, las listas de sepelios nunca,
nada de más de 72 horas en la portada, lo copiado de afuera por un medio de acá
es de afuera, la fecha real de las notas de El Diario (sin sus necrológicas),
de las repetidas queda la ya publicada, y cuerpos escritos a mano en
`web/data/correcciones.json` (37, por Claude, a pedido de Hernán).

| Qué falta | Quién | Urgencia |
|---|---|---|
| ~~Borrar de Facebook e Instagram el posteo de Necochea~~ **Hecho el 28/09** (lo borró Hernán en las dos redes) | Hernán | — |
| **Hecho el 28/09:** `GEMINI_API_KEY_CLASIFICACION` cargada (la lectura con IA sube a 200 pedidos por día y la redacción vuelve a 450) y `GROQ_API_KEY` cargada (segundo proveedor gratis de respaldo para la lectura con IA, `leerGrupoGroq` en `ingesta/lectura-ia.mjs`, si Gemini falla o se queda sin cupo). Falta mirar unos días cómo rinde Groq de respaldo. | Claude | Baja |
| **Hecho el 27/09:** perfil de Balcarce (`ingesta/perfil-balcarce.md`) y lectura rápida con IA en prueba silenciosa (`ingesta/lectura-ia.mjs`, fichas en `web/data/fichas.json`). **Desde el 27/09 la IA decide** (sin prueba ni examen, a pedido de Hernán: se corrige en vivo). **Falta:** lectura con el texto completo (nivel 2), historias por `clave_tema`, resumen de lo que sacó la IA en el WhatsApp de las 21 | Claude | Semanas 2 y 3 |
| Notas populares medidas (cobertura y Tendencias de Google Argentina), primero sólo anotando cuáles habría publicado. Nunca a redes, sin morbo ni chimentos, hasta 5 por día. El feed de Tendencias (`trends.google.com/trending/rss?geo=AR`) respondía el 27/09; no está en el código | Claude | Después del primer mes |
| Lo que queda de la hoja de ruta del plan: reglas por ámbito (un anuncio no es un hecho); redes con la ficha de la IA (medidas provinciales como IOMA o ARBA); puntaje de fuentes por sección con ajuste mensual; el podcast de la noche con el mismo piso de relevancia que los otros (hoy no tiene); fuentes nuevas (Concejo, hospital, bomberos, Facultad, SMN, ANSES, Boletín Oficial, más TC); actualizar una nota cuando la historia sigue | Claude, con los dos | Semanas 4 y 5 |

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
| 5 | ~~Subir la portada nueva de Facebook~~ **28/09: se probó la roja y Hernán prefirió la azul de antes** ("se ve mejor el contraste entre Radar y Balcarce, lo otro es muy rojo"): quedaron la portada y la foto azules con el nombre, en Facebook y en Instagram. `reels/avatar.mjs` y `reels/portada.mjs` volvieron a esa versión. Falta mirarla en el celular | Los dos | Baja |
| 6 | **Biografías (28/09, Claude con el Chrome de Radar):** Instagram ya tiene la bio nueva, el nombre "Radar Balcarce · Noticias" y la foto azul; Facebook, la ubicación (Balcarce) y la categoría y el sitio web que ya estaban. **Falta a mano, desde el celular:** el enlace de Instagram (la web no deja editarlo), la categoría de Instagram, el botón de contacto y las historias destacadas. La presentación de Facebook quedó la que estaba (ya junta la breve y la larga; la página nueva tiene un solo campo) | Los dos | Media |
| 7 | **Permisos de estadísticas** (los pide el resumen de WhatsApp; los seguidores ya llegan). **Cloudflare: resuelto el 27/09** (se le agregó *Account · Account Analytics · Read* al token `github-radar-balcarce`; la prueba ya no da error de Cloudflare). **Falta sólo Meta (lo vemos el 28/09):** regenerar el token de `publicador-radar` con los permisos de ahora **más** `read_insights` e `instagram_manage_insights` y reemplazar `META_TOKEN`. Probar con Actions → "Prueba de estadísticas" | Los dos | Media |
| 7b | **Gemini, presupuesto de octubre.** Se cargaron USD 5 en el proyecto RadarBalcarce (clave paga, voces); desde octubre se mide desde cero con USD 10 por mes. Al empezar el mes: ofrecer el límite mensual de AI Studio (Gasto → Establecer límite) y el gasto en el aviso de las 21. La clave de redacción es el proyecto RadarGratis (500 pedidos/día, sin facturación) | Los dos | Baja |
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
  de GitHub en Cloudflare. Opciones en `docs/09-PANEL.md`, "Cómo se podría pasar a online".
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
  escribirles desde "A quién escribir este mes" (`docs/09-PANEL.md`, "La agenda, paso a paso").

## Encontrado al documentar (28/09)

Al escribir `docs/` desde el código aparecieron diferencias. Las que eran un
error del código se arreglaron ese mismo día (commit "Trece arreglos
encontrados al documentar": acusaciones, firma de lo corregido a mano,
sepelios, fuente oficial, páginas que se perdían por el cupo, fotos en la PC,
crédito de Wikimedia, interruptor, útiles, reintentos de Vigilancia y
Auditoría, Piezas vacío). Las que eran un documento viejo se resolvieron al
retirarlo. Queda esto:

| # | Qué | Quién | Urgencia |
|---|---|---|---|
| D1 | **La Auditoría de los lunes nunca corrió** (al 28/09 a las 15:15 no había ninguna corrida y `web/data/auditoria.json` no existe). Correrla una vez a mano (Actions → Auditoría → Run workflow) y mirar el lunes siguiente que corra sola. Además, `auditoriaVencida` (`redes/auditar.mjs`) no avisa mientras el archivo no exista: que avise también si nunca corrió | Hernán (correrla); Claude (el aviso) | Media |
| D2 | **cron-job.org llama a "Redes" tres veces por hora** (:05, :35 y :45, de 0 a 22 hora de Balcarce, según el historial del 27 y 28/09), no "cada 30 minutos de 7 a 23". Mirar en console.cron-job.org si hay un cuarto trabajo o uno con tres horarios; si lo hay, sumarlo a los que llevan el token de GitHub (se renueva antes del 21/09/2027). Después, corregir el comentario de `redes.yml` | Hernán (mirar); Claude (comentario) | Media |
| D3 | **Las fotos: el criterio y el código no dicen lo mismo.** `CRITERIO-EDITORIAL.md` § 2 pide por defecto una foto propia, oficial, de stock o una ilustración (el código no tiene nada de eso: sin foto elegida, la página va sin imagen), "recortar" la foto de otro medio (se guarda entera; la página sólo la encuadra, así que un logo en una esquina puede quedar a la vista) y revisarla a ojo antes de guardarla (lo hace sólo la IA). Decidir si se cambia el criterio o el código | Los dos (decidir); Claude (hacerlo) | Media |
| D4 | **Una nota amarilla aprobada por una persona puede llevar la foto de un chico**: la exclusión de menores y víctimas depende del semáforo rojo, y las amarillas por "niño", "adolescente" o "alumno de" que se publican desde el panel sí se prueban. Sumar esa regla a `elegiblePorSeccion` (`web/scripts/fotos-notas.mjs`) o mirar la foto al aprobar | Claude | Media |
| D5 | **Una fuente oficial de afuera contada por un solo medio no pasa el cruce** (el Gobierno de la Provincia solo): "una fuente oficial alcanza sola" vale recién en los medios que pide la sección. Decidir si lo oficial de afuera tiene que entrar solo | Los dos | Baja |
| D6 | **`CRITERIO-EDITORIAL.md` § 2 dice que lo de la zona "tiene el cupo de su sección"**: desde el 28/09 (`esDeAca`) no ocupa cupo. Corregir ese renglón del criterio (fuera de la instrucción de la IA) | Claude, con el sí de Hernán | Baja |
| D7 | **La pestaña Calendario del panel no cambia lo que publica GitHub**: ni el reloj ni el plan leen lo guardado en el panel (los horarios van en `decisiones.json` y nadie los lee). Las horas reales son las de fábrica de `panel/horarios.mjs`. Decidir si GitHub los lee o se saca la pestaña | Los dos; Claude | Baja |
| D8 | **Los tres créditos de Wikimedia guardados antes del arreglo** (Mariano Werner y dos de Colapinto) dicen sólo "Foto: Wikimedia Commons": completar autor y licencia en `web/data/banco-fotos.json` | Claude | Baja |
| D9 | **`web/data/decisiones.json` pesa 2,5 MB** (1.540 decisiones, 1.390 escritas por la IA desde el panel): la poda a 60 días no alcanza porque cada decisión de la IA lleva el cuerpo y las partes internas. Achicar lo que se exporta | Claude | Baja |
| D10 | **El panel escucha en todas las conexiones de la PC**: cualquiera en la misma red llega al login. Probar si puede escuchar sólo en `localhost` sin romper el túnel | Claude, con Hernán | Baja |
| D11 | **Una decisión del panel puede no llegar a la web** si la nota tiene otro identificador en la nube (el panel no pasa `idsConocidos` a la ingesta). Sale de leer el código; no está medido. Medirlo o pasárselos | Claude | Baja |
| D12 | **Código sin uso** (`placaNoticia` se borró el 28/09): la cortina (`reels/cortina.mjs`, apagada) y las páginas `/tema/` (sin enlaces desde el 21/09). Decidir si se borran o se vuelven a usar | Los dos | Baja |
| D13 | **La variable del ID de la página de Facebook tiene dos nombres** (`META_PAGE_ID` y `META_PAGINA_ID`). Ninguna está cargada y todos usan el ID fijo; unificar | Claude | Baja |
| D14 | **Comentarios y títulos de pruebas que quedaron viejos** (no cambian lo que hace el código): `ampliar` en `ingesta/ingesta.mjs` ("sólo lo que no tiene cuerpo, unos 15 pedidos": abre todo lo raspado); `HORAS_EN_PORTADA` en `web/lib/archivo.js` ("el mismo criterio que el panel": el panel archiva a las 72 h); `panel/servidor.mjs` ("si la IA falla tres veces seguidas": son tres en el ciclo); `web/next.config.mjs` ("las únicas imágenes son las placas propias"); la descripción de `web/package.json` ("datos generados desde el panel"); `web/app/sitemap.js` (el feed "trae las últimas veinte"); `web/lib/tarjeta-diseno.js` (nombra `tarjeta-diseno.test.mjs`, que no existe: es `placas.test.mjs`); la pestaña "Para redes" de `panel/panel.html` ("el camino real de todos los días"); `redes.yml` (D2); el título "corta las listas en 72 horas" de `pruebas/archivo.test.mjs` (son 36) y el encabezado de `pruebas/criterios-extranjero-zona.test.mjs` ("los sepelios esperan a una persona", "7 días") | Claude | Baja |

## Para Claude (código y seguimiento)

**Alta**

- **El banco de fotos propio (27/09, Hernán). Construido y en vivo desde el
  28/09**, con lo que faltaba:
  1. ~~Un archivo con cada foto~~ **Hecho**: `web/data/banco-fotos.json`
     (de dónde salió, el crédito, la licencia si es de Wikimedia) y los
     archivos en `web/public/fotos-notas/`.
  2. ~~Comparar las fotos de los medios y guardar la mejor~~ **Hecho**:
     `ingesta/fotos.mjs` (Gemini, con Groq de respaldo). Nunca elige una con
     marca de agua (usa la mejor SIN marca en su lugar, aunque no sea la
     ideal); distingue la marca de un medio de un logo que ya estaba en la
     escena (un sponsor, un club, el cartel de un evento). **Más cuidado con
     medios locales y de la zona**, como se decidió el 28/09.
  3. ~~Guardar en el banco toda foto probada~~ **Hecho**: una nota ya
     probada (tenga foto o no) no se le vuelve a preguntar
     (`web/scripts/fotos-notas.mjs`, hasta 10 notas nuevas por corrida, para
     no gastarle de más el cupo a la lectura con IA).
  4. **Sigue pendiente**: un lugar para ir sumando fotos propias (las que
     saquen Hernán y Andrés) al mismo banco, con su propio crédito ("Foto:
     Radar Balcarce"). Hoy `banco-fotos.json` sólo lo arma el código.
  5. ~~Mostrar la foto en la página de la nota~~ **Hecho**: con su crédito en
     el epígrafe, nunca adentro de la imagen (`web/app/nota/[id]/page.js`).
     **El espejo de Instagram lleva la foto** (28/09, `FOTO_EN_INSTAGRAM`, con el
     crédito en el texto del posteo). La tarjeta para compartir el enlace también lleva la
     foto desde el 28/09 (`FOTO_EN_ENLACE`, `paraCompartirConFoto`; el crédito
     está en el epígrafe de la página, no en la imagen). La placa sin foto es lo que sale cuando no hay foto.
  6. ~~Buscar una foto de la persona nombrada~~ **Hecho** (idea de Hernán,
     28/09, al ver el caso de Mariano Werner: una sola fuente, con marca de
     agua): si ninguna fuente sirve y la nota es de una sola persona pública
     identificable, se prueba una foto libre en Wikimedia Commons antes de
     resignarse a la placa (`personaPublicaDeNota`, `buscarFotoWikimedia`,
     `ingesta/fotos.mjs`).
  7. **Para mirar en los próximos días**: cuántas notas terminan con foto
     real contra placa, si el tope de 10 por corrida alcanza, y si el cupo
     de Gemini (compartido con la lectura con IA) rinde con las dos cosas
     pidiendo a la vez.
- **Escuchar el podcast en la web (27/09, idea de Hernán).** El audio de cada
  repaso ya se genera para el reel; hoy se arma en un archivo temporal de la
  corrida y no queda guardado en ningún lado después de subirlo a Instagram y
  Facebook ("no alojamos archivos" era sobre eso). Para poner un reproductor
  en la nota del repaso (`web/lib/notas-propias.js`) hay que:
  1. Guardar el .mp3 (no el video) en un lugar público de nuestro propio
     sitio (`web/public/audio/`, como ya se hace con las imágenes para
     compartir), en la misma corrida que arma el reel.
  2. Que ese archivo llegue al repositorio antes de que se compile la web
     (hoy son workflows separados: `redes.yml` arma los reels, `actualizar.yml`
     compila el sitio).
  3. Un `<audio controls>` en la página de la nota del repaso, con el
     archivo de esa fecha.
- **El rediseño (dirección B: el lienzo "Radar Balcarce · Plantillas redes", aprobado el 28/09; ver `docs/07-REDES.md` y `MEDIA-KIT.md`) suma tres cosas más**
  (27/09, Hernán):
  1. Probarlo también como tarjeta de enlace de **WhatsApp**
     (`web/lib/tarjeta.js`, la misma que arma tarjeta para Facebook), no sólo
     como pieza de Instagram. **Sigue pendiente.**
  2. ~~El **ícono del sitio**~~ **Hecho el 28/09**: `web/scripts/hacer-iconos.mjs`
     dibuja ahora el mismo radar (dos anillos y un punto) del resto del
     rediseño, en el rojo de marca, en vez de la "R" de antes. (El ícono del
     sitio siguió rojo; en redes volvió el azul, ver el punto 3.)
  3. ~~El **ícono de perfil de Instagram y de Facebook**, y la **portada de
     Facebook**~~ **Hecho el 28/09**: `reels/avatar.mjs` (el ícono, sin texto,
     para que se lea recortado en círculo) y `reels/portada.mjs` (la portada)
     pasaron del fondo verde azulado de antes al rojo de marca. **El 28/09
     Hernán los vio subidos y prefirió los de antes** ("me gustaba más la azul
     y el logo que también diga el nombre, se ve mejor el contraste entre
     Radar y Balcarce, lo otro es muy rojo"): los dos archivos volvieron a la
     versión azul con el nombre y así quedaron en Instagram y Facebook.
- **Mirar los primeros días de redes.** Que salgan bien los tres podcasts, el
  enlace en los posteos de Facebook y el espejo a Instagram; que el contrato del
  día cierre completo (`docs/07-REDES.md`). Si algo deja de salir, seguir "Si
  algo dejó de salir" en `docs/11-OPERACION.md`.
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
- **Nota duplicada con dos direcciones** ("Zona Fría"): desde el 27/09 lo
  atacan el cruce de medios (título y resumen, TF-IDF) y `agruparRepetidas` (la
  IA junta las que cuentan el mismo hecho). Falta confirmar que no vuelve a pasar.

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

- **28/09:** portada de 36 horas y 12 para estrenar (`llegaTarde`); una fecha
  única por nota (`vistas.json`); "de acá" con una sola definición (`esDeAca`);
  lo copiado de afuera por un medio de acá espera a la IA; el banco de fotos en
  la web; Groq de respaldo; la nota del dólar sólo si se mueve 2 %; "Hoy en
  Balcarce" y `/clima`; las plantillas nuevas de redes; los trece arreglos
  encontrados al documentar (reglas 63 a 67 de `docs/10-REGLAS-Y-PRUEBAS.md`);
  y la documentación en limpio (`docs/00` a `docs/12`), que reemplazó a
  `REGLAS.md`, `REDES.md`, `INFRAESTRUCTURA.md`, `PANEL.md`, `EMPEZAR-ACA.md`,
  `MANUAL.md` y `docs/RADAR-3.0.md`.
- **27/09:** plan V2.2 semana 1 (filtro de entrada, fichas de fuente, policiales
  sólo de Balcarce), la lectura con IA decide en vivo, el cruce de medios (218
  fuentes configuradas, 214 activas; ya no entran "las 3 a 5 más nuevas"), lo de
  afuera sólo con los medios que pide su sección (sin piso de puntaje), un
  nombre por medio, una noticia una nota, secciones nuevas (Fútbol, Argentina;
  sin Servicios, Región ni Provincia), un color por sección, títulos sin "en
  Balcarce", correcciones y retiradas a mano sin el panel, `FUENTES.md`,
  tipografía Source Serif 4 e Inter en todo; a la noche, lo de la zona, los
  sepelios, las 72 horas, lo copiado de afuera, la fecha de El Diario y los
  cuerpos a mano (reglas 41 a 62 de `docs/10-REGLAS-Y-PRUEBAS.md`).
- **26/09:** la app de Meta se **publicó** (modo activo); Policiales sólo de
  Balcarce y la zona; secciones flacas con 13 fuentes nuevas, pisos (desde el
  27/09, cantidad de medios) y cupos por
  sección (58 fuentes en total); una sola hora de Balcarce para todo el código
  (`ingesta/zona.mjs`, incluye los teléfonos útiles) y una sola lectura de JSON
  (`ingesta/json.mjs`); se sacó "Resumen hecho con IA" de los posteos de redes.
- **26/09, contrato del día y reels** (reglas 33 a 40 de `docs/10-REGLAS-Y-PRUEBAS.md`): historias
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
    primero y sólo pasa a la paga si se queda sin cupo (429). Tope de 450 notas
    por día con la clave de lectura propia, 330 sin ella (`REESCRITURA.porDia`, 27/09).
  - **Enlaces de redes que no se rompen**: dirección fija desde la primera
    publicación, archivo de 180 días (`web/data/archivo.json`) y rescate en la
    404. Se recuperaron 1556 notas. Las notas archivadas ya están en el sitemap.
  - **Portada sólo con las últimas 72 h**, ahora en la nube.
  - **Semáforo más estricto**: mira el texto completo y lo que escribe la IA; la
    IA tiene prohibido identificar menores y víctimas.
  - **Sin cuerpo no se publica** y el lector ve la nota, no el análisis
    (`docs/10-REGLAS-Y-PRUEBAS.md`, reglas 23 y 24); la IA trabaja como editor digital (claves,
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
