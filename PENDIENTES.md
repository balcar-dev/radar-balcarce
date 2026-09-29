# Pendientes: todo en un solo lugar

*Actualizado el 29/09/2026.* Los otros documentos explican **cómo** funciona
cada cosa; éste dice **qué falta**. Las reglas que se exigen siempre están en `docs/10-REGLAS-Y-PRUEBAS.md`; cómo funciona
cada parte, en `docs/` (empezar por `docs/00-INDICE.md`).
Lo que ya se hizo, con fecha, está en `docs/00-INDICE.md` ("La historia
corta"), `docs/historico/HISTORIA.md` y `docs/historico/AUDITORIA.md`, para
no volver a proponerlo. Cada cosa figura una sola vez.

**Redes en pausa desde el 28/09** (`REDES_ACTIVAS` en `No`), hasta el visto
bueno de Hernán al diseño nuevo **y, desde el 29/09, hasta resolver la clave
paga de Gemini** (punto 2b: sin ella no hay voces); el estado del día está en `CLAUDE.md`
("Estado"). Para prenderlas: la variable a `Si` en GitHub
(`docs/11-OPERACION.md`, tarea 5).

Cada pendiente dice **quién** lo hace (Hernán, Andrés, "los dos" o Claude) y
**qué tan urgente** es (alta, media o baja). Lo que sólo puede hacer una persona
(abrir cuentas, cargar claves, decidir criterio) nunca lo hace Claude.

## El plan V2.2 (27/09): cómo se eligen las notas

El plan completo, con la hoja de ruta, está en [`docs/historico/PLAN-V2.2.md`](docs/historico/PLAN-V2.2.md)
(es la foto del plan de ese día; lo que quedó por hacer está en la tabla de abajo).
Punto de restauración anterior a los cambios: la etiqueta `antes-de-v2.2` en GitHub.

| Qué falta | Quién | Urgencia |
|---|---|---|
| Mirar unos días cómo rinde Groq de respaldo de la lectura con IA (`leerGrupoGroq`, `ingesta/lectura-ia.mjs`; clave cargada el 28/09) | Claude | Baja |
| La lectura con IA (`ingesta/lectura-ia.mjs`, decide desde el 27/09): leer con el texto completo (nivel 2), historias por `clave_tema`, resumen de lo que sacó la IA en el WhatsApp de las 21 | Claude | Semanas 2 y 3 |
| Notas populares medidas (cobertura y Tendencias de Google Argentina), primero sólo anotando cuáles habría publicado. Nunca a redes, sin morbo ni chimentos, hasta 5 por día. El feed de Tendencias (`trends.google.com/trending/rss?geo=AR`) respondía el 27/09; no está en el código | Claude | Después del primer mes |
| Lo que queda de la hoja de ruta del plan: reglas por ámbito (un anuncio no es un hecho); redes con la ficha de la IA (medidas provinciales como IOMA o ARBA); puntaje de fuentes por sección con ajuste mensual; el podcast de la noche con el mismo piso de relevancia que los otros (hoy no tiene); fuentes nuevas (Concejo, hospital, bomberos, Facultad, SMN, ANSES, Boletín Oficial, más TC); actualizar una nota cuando la historia sigue | Claude, con los dos | Semanas 4 y 5 |

## Comprobar que Facebook se ve (pendiente desde el 26/09)

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
| 1 | ~~Reiniciar el panel~~ **No hace falta** (28/09 a la noche: el panel no estaba abierto; la próxima vez que se abra con `ARRANCAR.bat` ya carga el código nuevo) | — | — |
| 2 | ~~Tope de presupuesto para la clave paga de Gemini~~ **Hecho** (confirmado el 28/09: Gemini ya tiene el tope) | — | — |
| 2b | **La clave paga de Gemini (`GEMINI_API_KEY_REDES`) está suspendida desde el 29/09**: primero se agotó el crédito (error 402) y después Google la suspendió. Sin ella no se puede armar ninguna pieza con voz y la redacción pierde su respaldo pago. Hay que entrar a Google AI Studio (proyecto RadarBalcarce), ver por qué la suspendieron, cargar crédito o pedir que la reactiven; si hace falta una clave nueva, la pega una persona en GitHub → Secrets (nunca en un chat). **Hasta que esto se resuelva no conviene prender las redes** (`docs/08-INFRAESTRUCTURA.md`, "Las claves de IA") | Los dos | Alta |
| 3 | **Borrar las claves en texto plano**: `panel/datos/CLAVES-INICIALES.txt` (cuando las contraseñas nuevas estén guardadas en otro lado) y, en las copias viejas de `respaldos/`, los `CLAVES-INICIALES.txt` y `secreto.txt` de antes del 25/09. **No** borrar `panel/datos/secreto.txt`: es la firma de las sesiones del panel. Las copias nuevas ya no los llevan | Hernán | Alta |
| 4 | **Decidir si Política y Policiales esperan a una persona también en la web.** Hoy, en la web, salen solas si el semáforo da verde; en las redes siempre esperan. Si se decide que esperen, es una regla nueva al final de `semaforo` (`ingesta/ingesta.mjs`; la lista `verdeSecciones` se sacó el 28/09) | Los dos | Media |
| 5 | **Mirar en el celular la portada y la foto de perfil azules** (subidas el 28/09; Hernán prefirió las azules a las rojas: `MEDIA-KIT.md`, "Los colores") | Los dos | Baja |
| 6 | **Biografías (28/09, Claude con el Chrome de Radar):** Instagram ya tiene la bio nueva, el nombre "Radar Balcarce · Noticias" y la foto azul; Facebook, la ubicación (Balcarce) y la categoría y el sitio web que ya estaban. **Falta a mano, desde el celular:** el enlace de Instagram (la web no deja editarlo), la categoría de Instagram, el botón de contacto y las historias destacadas. La presentación de Facebook quedó la que estaba (ya junta la breve y la larga; la página nueva tiene un solo campo) | Los dos | Media |
| 7 | **Permisos de estadísticas de Meta** (los pide el resumen de WhatsApp; los seguidores ya llegan; Cloudflare quedó resuelto el 27/09): regenerar el token de `publicador-radar` con los permisos de ahora **más** `read_insights` e `instagram_manage_insights` y reemplazar `META_TOKEN`. Probar con Actions → "Prueba de estadísticas" | Los dos | Media |
| 7b | **Gemini, presupuesto de octubre.** Se cargaron USD 5 en el proyecto RadarBalcarce (clave paga, voces); desde octubre se mide desde cero con USD 10 por mes. Al empezar el mes: ofrecer el límite mensual de AI Studio (Gasto → Establecer límite) y el gasto en el aviso de las 21. La clave de redacción es el proyecto RadarGratis (500 pedidos/día, sin facturación). **Ojo (29/09): el crédito de USD 5 se agotó y la clave quedó suspendida; ver el punto 2b** | Los dos | Baja |
| 8 | **Borrar el proyecto de Vercel** y limpiar el DNS que quedó (también el sitio duplicado de la cuenta vieja, `radar-balcarce.vercel.app`). Vercel está apagado desde el 25/09 | Los dos | Media |
| 9 | **Google AdSense**: una persona abre la cuenta (pide datos fiscales) y pide la revisión; después, `ads.txt` con el ID de editor que da AdSense (sin el ID no se puede armar). La aprobación tarda de días a semanas. Detalle en `PUBLICIDAD.md` | Los dos | Media |
| 10 | **Apuntar `RESPALDO_CARPETA`** a una carpeta de Drive u OneDrive, para que el respaldo del panel quede afuera de la PC. Si se rompe el disco hoy, se pierde el historial editorial | Hernán | Media |
| 11 | **Confirmar el texto de "Quiénes somos"** (`/quienes-somos`): dice "Lo hacen Hernán y Andrés, dos vecinos de Balcarce". Si no los representa, se cambia en `web/app/quienes-somos/page.js` | Los dos | Baja |
| 12 | **Borrar el repaso duplicado de las 10:08 del 25/09** (Facebook e Instagram). **Preguntar antes**: es borrar algo publicado y no se puede deshacer | Los dos | Baja |
| 13 | **Dominios de la app de Meta**: el campo quedó vacío y no lo exigieron. Decidir si se completa con `radarbalcarce.com` | Los dos | Baja |
| 14 | **Confirmar las medidas sin fuente oficial** de `FORMATOS.md` (foto de perfil de Instagram 1080 × 1080 y de Facebook 720 × 720; están `verificado: false` en `redes/formatos.mjs`) y volver a mirar todas cada 90 días (la auditoría avisa) | Los dos | Baja |
| 15 | **Cerrar el túnel de Tailscale** (`tailscale funnel --https=443 off`) cuando no haga falta | Hernán | Baja |
| 16 | **Renovar el token de GitHub de cron-job.org antes del 21/09/2027** (lo usa en sus tres trabajos; el vigilante avisa 30 días antes). El dominio vence el mismo día | Los dos | Fecha fija |
| 17 | **Renovar las dos voces propias de Gemini antes del 29/09/2027** (vencen al año de crearse): Actions → "Crear voces" → crear, elegir una locutora y un locutor, borrar el resto y cambiar los identificadores en `CRITERIO-REDES.md` § 6. Si vencen, las piezas con voz dejan de salir | Los dos | Fecha fija |
| 18 | **Confirmar el WhatsApp de reclamos de la Cooperativa de Electricidad** (2266-480809, anunciado en una nota de El Diario Balcarce de septiembre de 2024): no figura en coopbalcarce.com.ar y por eso no está en los teléfonos útiles. Si sigue vigente, se suma a `ingesta/utiles.mjs`. *(Lo que sí figura en su página, la guardia de 24 horas 0800 222 2342 y el fijo (02266) 42-4091, ya está en los teléfonos útiles desde el 28/09: regla 77.)* | Los dos | Baja |

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
| D1 | **La Auditoría de los lunes corrió por primera vez el 28/09** (16:06; `web/data/auditoria.json`): miró 5 imágenes y encontró un solo problema, las medidas de perfil sin confirmar en fuente oficial (`instagram.perfil`, `facebook.perfil`: punto 14 de arriba). Falta mirar que el lunes siguiente corra sola. Además, `auditoriaVencida` (`redes/auditar.mjs`) no avisaría si el archivo llegara a faltar | Hernán (mirar); Claude (el aviso) | Baja |
| D2 | **cron-job.org llama a "Redes" tres veces por hora** (:05, :35 y :45, de 0 a 22 hora de Balcarce, según el historial del 27 y 28/09), no "cada 30 minutos de 7 a 23". Mirar en console.cron-job.org si hay un cuarto trabajo o uno con tres horarios; si lo hay, sumarlo a los que llevan el token de GitHub (se renueva antes del 21/09/2027). Después, corregir el comentario de `redes.yml` | Hernán (mirar); Claude (comentario) | Media |
| D3 | **Las fotos: el criterio y el código no dicen lo mismo.** `CRITERIO-EDITORIAL.md` § 2 pide por defecto una foto propia, oficial, de stock o una ilustración (el código no tiene nada de eso: sin foto elegida, la página va sin imagen), "recortar" la foto de otro medio (se guarda entera; la página sólo la encuadra, así que un logo en una esquina puede quedar a la vista) y revisarla a ojo antes de guardarla (lo hace sólo la IA). Decidir si se cambia el criterio o el código | Los dos (decidir); Claude (hacerlo) | Media |
| D4 | **Una nota amarilla aprobada por una persona puede llevar la foto de un chico**: la exclusión de menores y víctimas depende del semáforo rojo, y las amarillas por "niño", "adolescente" o "alumno de" que se publican desde el panel sí se prueban. Sumar esa regla a `elegiblePorSeccion` (`web/scripts/fotos-notas.mjs`) o mirar la foto al aprobar | Claude | Media (en parte: desde el 28/09 la IA marca a los menores reconocibles y esa foto no se elige, regla 73) |
| D5 | **Una fuente oficial de afuera contada por un solo medio no pasa el cruce** (el Gobierno de la Provincia solo): "una fuente oficial alcanza sola" vale recién en los medios que pide la sección. Decidir si lo oficial de afuera tiene que entrar solo | Los dos | Baja |
| D6 | ~~`CRITERIO-EDITORIAL.md` § 2 decía que lo de la zona "tiene el cupo de su sección"~~ **Hecho el 28/09**: corregido fuera de la instrucción de la IA (no ocupa cupo, `esDeAca`) | — | — |
| D7 | **La pestaña Calendario del panel no cambia lo que publica GitHub**: ni el reloj ni el plan leen lo guardado en el panel (los horarios van en `decisiones.json` y nadie los lee). Las horas reales son las de fábrica de `panel/horarios.mjs`. Decidir si GitHub los lee o se saca la pestaña | Los dos; Claude | Baja |
| D8 | **Los tres créditos de Wikimedia guardados antes del arreglo** (Mariano Werner y dos de Colapinto) dicen sólo "Foto: Wikimedia Commons": completar autor y licencia en `web/data/banco-fotos.json` | Claude | Baja |
| D9 | **`web/data/decisiones.json` pesa 2,5 MB** (1.540 decisiones, 1.390 escritas por la IA desde el panel): la poda a 60 días no alcanza porque cada decisión de la IA lleva el cuerpo y las partes internas. Achicar lo que se exporta | Claude | Baja |
| D10 | **El panel escucha en todas las conexiones de la PC**: cualquiera en la misma red llega al login. Probar si puede escuchar sólo en `localhost` sin romper el túnel | Claude, con Hernán | Baja |
| D11 | **Una decisión del panel puede no llegar a la web** si la nota tiene otro identificador en la nube (el panel no pasa `idsConocidos` a la ingesta). Sale de leer el código; no está medido. Medirlo o pasárselos | Claude | Baja |
| D12 | **Código sin uso** (`placaNoticia` se borró el 28/09): la cortina (`reels/cortina.mjs`, apagada) y las páginas `/tema/` (sin enlaces desde el 21/09). Decidir si se borran o se vuelven a usar | Los dos | Baja |
| D13 | **La variable del ID de la página de Facebook tiene dos nombres** (`META_PAGE_ID` y `META_PAGINA_ID`). Ninguna está cargada y todos usan el ID fijo; unificar | Claude | Baja |
| D14 | **Comentarios y títulos de pruebas que quedaron viejos** (no cambian lo que hace el código): `ampliar` en `ingesta/ingesta.mjs` ("sólo lo que no tiene cuerpo, unos 15 pedidos": abre todo lo raspado); `HORAS_EN_PORTADA` en `web/lib/archivo.js` ("el mismo criterio que el panel": el panel archiva a las 72 h); `panel/servidor.mjs` ("si la IA falla tres veces seguidas": son tres en el ciclo); `web/next.config.mjs` ("las únicas imágenes son las placas propias"); la descripción de `web/package.json` ("datos generados desde el panel"); `web/app/sitemap.js` (el feed "trae las últimas veinte"); `web/lib/tarjeta-diseno.js` (nombra `tarjeta-diseno.test.mjs`, que no existe: es `placas.test.mjs`); la pestaña "Para redes" de `panel/panel.html` ("el camino real de todos los días"); `redes.yml` (D2); el título "corta las listas en 72 horas" de `pruebas/archivo.test.mjs` (son 36) y el encabezado de `pruebas/criterios-extranjero-zona.test.mjs` ("los sepelios esperan a una persona", "7 días") | Claude | Baja |

## Auditoría del sitio (29/09): lo que quedó

Tres auditorías el 29/09 (documentos, sitio publicado y código de `web/`). **Ya se arregló el
mismo día:** la imagen para compartir de 7 de cada 10 notas (daba 404), los títulos cortados,
las secciones vacías, las fechas de modificación, el teclado en las pestañas, las fuentes
repetidas y el peso de las fotos. Lo que falta, con las ideas nuevas en `IDEAS.md`:

| # | Qué | Quién | Urgencia |
|---|---|---|---|
| A1 | **Notas repetidas con dos o más direcciones** (9 grupos vistos: el Fangio "reabre / reabre sus puertas / reinauguran" en 4 notas, YPF en 3, Top Serrano, Boccanera y Baigorria, Campo de Pato…). Compiten entre sí en Google. Unirlas (una queda y las otras redirigen con 301) y revisar por qué el cruce (`ingesta/cruce.mjs`) no las juntó | Claude | Alta |
| A2 | **Mirar el sitio publicado después de la próxima corrida:** que las notas viejas muestren la tarjeta del sitio, que las fotos achicadas se vean y que `/seccion/tecnologia` ya no sea la página vieja del 24/09. Esa página respondía con encabezados que no son los de Cloudflare Pages (`x-robots-tag: noindex`, caché de 7 días): parece un resto del sitio anterior en Vercel (ver el punto 8 de arriba) | Claude | Alta |
| A3 | **Alertas del vigilante cuando la clave de Gemini falla** (401, 402, 403 o "sin crédito") y 30 días antes de que venzan las voces propias. Hoy se cortó la voz y nos enteramos mirando | Claude | Alta |
| A4 | **Google AI Studio:** separar Radar de los otros proyectos (la cuenta de facturación es compartida y ya se llevaron parte del saldo) y poner el límite mensual de USD 10 en RadarBalcarce (hoy figura sin límite) | Los dos | Media |
| A5 | **Confirmar que el WhatsApp 5492266511612 del pie de cada página es el del medio**, no uno personal | Los dos | Media |
| A6 | **Botones y enlaces de menos de 44 px en el celular** (38 de 91 en la portada: "Ver todo →", teléfonos de emergencia, "Facebook") y 73 textos de menos de 12 px | Claude | Media |
| A7 | **316 de las 499 páginas archivadas no tienen cuerpo de verdad** (menos de 70 palabras): no están en el sitemap pero Google las puede encontrar. `noindex` o sacarlas del archivo | Claude | Media |
| A8 | **Las tarjetas para compartir con foto pesan hasta 749 KB** (34 de 69 pasan de 300 KB): pasarlas a JPEG | Claude | Media |
| A9 | **La política de privacidad debe decir** que el navegador le pide cosas a Google Fonts, Open-Meteo y DolarApi/Bluelytics (su IP les llega). Mejor todavía, servir las tipografías desde el sitio (`IDEAS.md`) | Los dos; Claude | Media |
| A10 | **Pruebas que faltan:** un verificador de enlaces del sitio compilado (hoy ya controla la imagen para compartir), un tope de peso para las fotos y las tarjetas, y "Hoy en Balcarce" en un navegador de verdad | Claude | Media |
| A11 | **Feed y sitemap:** `robots.txt` bloquea `/feed.xml` pero la portada lo anuncia; el feed no tiene `lastBuildDate` ni `atom:link`; el sitemap pone la misma fecha en todas las páginas | Claude | Baja |
| A12 | **Cosas chicas del sitio:** sin `ads.txt`, sin CSP completa, sin "saltar al contenido"; los enlaces de compartir por correo pasan por la ofuscación de Cloudflare (probar a mano que abren el correo); el buscador sin foco atrapado ni anuncio de resultados | Claude | Baja |
| A13 | **Código repetido o sin uso en `web/`:** `nombresDeTurno` (`hoy-balcarce.js`) no la usa nadie, `hoyEnBalcarce` está copiada en dos archivos, la clase `.fraunces` quedó con nombre viejo | Claude | Baja |
| A14 | **`banco-fotos.json` guarda cada nota probada para siempre** (unos 40 KB por día): podar las de más de 180 días. Además había 2 grupos de fotos idénticas guardadas dos y tres veces | Claude | Baja |
| A16 | **Acortar la instrucción de la IA (`CRITERIO-EDITORIAL.md` § 12): probado el 29/09 y NO conviene tal cual.** Una versión condensada (26 % menos, las mismas 20 reglas) se comparó con la actual sobre notas reales, con el mismo verificador de producción (`reels/comparar-instruccion.mjs`), dos veces: la actual sacó cuerpo en 11 de 19 y 11 de 20 pedidas; la corta, en 5 de 15 y 8 de 16. Copiaba más del original. Los ejemplos y las repeticiones de la versión larga parecen ayudar. Si se vuelve a intentar, cambiar de a una regla por vez y medir cada una. Las corridas chocaron con el límite de cupo de la clave gratis (2 a 3 pedidos con 429), así que los números son aproximados | Claude | Baja |
| A15 | **`next` 15.5.26** (parche) y las 2 vulnerabilidades de compilación (postcss y next: no afectan al sitio publicado, que son archivos estáticos). No usar `npm audit fix --force`: sube a next 16 | Claude | Baja |

## Para Claude (código y seguimiento)

**Alta**

- **El banco de fotos propio** (en vivo desde el 28/09; cómo funciona, en
  `docs/05-FOTOS.md`). Falta:
  1. Un lugar para ir sumando fotos propias (las que saquen Hernán y Andrés)
     al mismo banco, con su propio crédito ("Foto: Radar Balcarce"). Hoy
     `banco-fotos.json` sólo lo arma el código.
  2. **Mirar en los próximos días**: cuántas notas terminan con foto real
     contra placa, si el tope de 10 por corrida alcanza, y si el cupo de
     Gemini (compartido con la lectura con IA) rinde con las dos cosas
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
- **El rediseño (el lienzo "Radar Balcarce · Plantillas redes", aprobado el
  28/09; ver `docs/07-REDES.md` y `MEDIA-KIT.md`):** probarlo también como
  tarjeta de enlace de **WhatsApp** (`web/lib/tarjeta.js`, la misma que arma
  la tarjeta para Facebook), no sólo como pieza de Instagram.
- **Cuando se vuelvan a prender las redes** (después de resolver la clave paga, punto 2b), **mirar los primeros días.** Que salgan las piezas con las dos voces nuevas (cada una con su voz del reparto), que salgan bien los tres podcasts, el
  enlace en los posteos de Facebook y el espejo a Instagram; que el contrato del
  día cierre completo (`docs/07-REDES.md`). Si algo deja de salir, seguir "Si
  algo dejó de salir" en `docs/11-OPERACION.md`.
- ~~**Dos detalles de las voces nuevas (29/09)**~~ **Hechos el 29/09**: el
  formulario de "Crear voces" ya trae los identificadores vigentes y el panel
  dice "sensación térmica".
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
  días hecha con la voz anterior (Kore): **volver a medirlo con la locutora y el
  locutor nuevos** (`PODCAST_VOZ`, `ingesta/criterio.mjs` y la tabla del criterio).
  Si la voz se enlentece, el corte de 58 s de las historias la ataja, pero
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
- **`comercial/propuestas.mjs` no lo llama nada fuera de su prueba**
  (`pruebas/propuestas.test.mjs`): conectarlo (al panel o a la guía
  comercial) o decidir si se deja como está (`COMERCIAL.md`). Los dos
  (decidir); Claude.

Las ideas más grandes, que cambian cómo funciona algo, están en `IDEAS.md`.
