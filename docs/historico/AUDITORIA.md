# Auditoría completa — 25/09/2026

## Estado al cierre del 25/09

✅ arreglado · ⏳ pendiente (técnico) · 👤 le toca a una persona.
Los números (1 a 7) son los de la tabla "Urgente" de más abajo. El resto de
la auditoría, tal como se escribió a la mañana, sigue después de este bloque.
Al cierre: **684 pruebas, todas pasan.**

**Urgente**

| # | Qué | Estado |
|---|---|---|
| 1 | Enlaces de Facebook que daban 404 | ✅ La dirección de cada nota queda fija desde la primera publicación; `web/data/archivo.json` guarda 180 días (hasta 2500 notas) y las páginas se generan también desde ahí; la 404 rescata por el identificador. Se rescataron 1556 notas del historial. Pruebas en `pruebas/archivo.test.mjs` |
| 2 | Minutos de GitHub Actions | ✅ El repositorio pasó a **público** (los públicos no gastan minutos). Se revisó todo el historial: ninguna clave en el repo |
| 3 | El filtro de menores y víctimas miraba poco texto | ✅ El semáforo mira también el texto completo de la fuente y lo que escribió la IA; la instrucción de la IA prohíbe identificar menores y víctimas |
| 4 | La lista roja tenía una sola prueba | ✅ Términos nuevos (decididos por Hernán y Andrés) y una prueba por término (`pruebas/semaforo.test.mjs`). ⏳ Falsos positivos conocidos: "violación de la ley" da rojo, "el menor de los males" da amarillo |
| 5 | "Siempre con revisión humana" | ✅ El pie dice ahora que los resúmenes los escribe una IA, se verifican solos contra la fuente y lo sensible lo revisa una persona. 👤 Aplicar las biografías nuevas de `PERFILES.md` en Instagram y Facebook |
| 6 | Farmacias, Agenda, Útil y Privacidad decían ser la portada | ✅ Canónico propio en cada una, con prueba |
| 7 | WhatsApp roto | ✅ Funciona desde el 25/09 (llegó el mensaje de prueba). Faltaba el teléfono completo con 549 y la clave correcta |

**Importante: web y SEO**

- ⏳ Cuerpos de notas: 19 %. Sigue siendo lo más importante para Google y AdSense.
- ⏳ Nota duplicada ("Zona Fría"): el agrupamiento todavía no las une ("Seguí leyendo" ya no repite el mismo titular).
- ✅ Imagen para compartir como `image/png`, HSTS y otros encabezados, caché de un año para `/_next/static` (`web/public/_headers`). ⏳ Una CSP completa (hoy sólo `frame-ancestors`).
- ✅ Páginas "Quiénes somos" y "Contacto", en el pie y en el sitemap. 👤 Confirmar el texto "Lo hacen Hernán y Andrés, dos vecinos de Balcarce".
- 👤 `ads.txt`: necesita el ID de AdSense.
- ✅ Logo en el JSON-LD, `es-AR`, sitemap de noticias sin fechas de relleno.

**Importante: código y operación**

- ✅ Hora de Balcarce (`TZ`) en los workflows; tiempos máximos en "Actualizar la web" (20 min) y "Cloudflare Pages" (15 min). ⏳ `tocaHoy` (`ingesta/utiles.mjs`) todavía depende de la zona del servidor.
- ✅ Tiempos máximos en Gemini, Meta y el clima.
- ✅ El panel ya no publica en Vercel ni regenera `portada.json`.
- ✅ Sin dependencias de afuera, con prueba que sigue los imports en cadena.
- ✅ `generar-datos.mjs` tiene pruebas del corte de 72 h y del archivo.
- ✅ Facebook no repite tema en 24 h y publica hasta las 22:00 en punto.
- ✅ El registro dice por qué el verificador rechazó una nota.
- ✅ La Vigilancia ya no pinta de rojo Actions: deja un aviso amarillo.

**Importante: seguridad**

- ✅ El respaldo ya no copia `CLAVES-INICIALES.txt` ni `secreto.txt`. 👤 Las copias viejas en `respaldos/` todavía los tienen: borrarlas a mano, junto con `panel/datos/CLAVES-INICIALES.txt`.
- ✅ El freno de 5 intentos ya no se saltea con `X-Forwarded-For`; control de origen; "Salir" por POST; `/api/probar` no entra a la red de la casa.
- ✅ `wrangler` fijo en 4.139.0. ✅ Permisos de sólo lectura en los workflows que no necesitan más.
- ⏳ `next`/`postcss` con una vulnerabilidad conocida (riesgo bajo).
- ⏳ `reels/ilustrar.mjs` (experimento) todavía manda la clave de Gemini en la dirección.

**Menor**

- ✅ Contraste de Automovilismo, nombre del buscador, `es-AR`, título de Privacidad sin la marca repetida.
- ✅ `decisiones.json` se poda a 60 días.
- ✅ Vencimiento del dominio (21/09/2027, DonWeb) en la tabla de vencimientos y en el vigilante (avisa 30 días antes).
- ✅ `CLOUDFLARE_PROJECT` corregida en `INFRAESTRUCTURA.md` (no existe: se usa `radar-balcarce`).
- ⏳ `ingesta/ingesta.mjs` sigue largo; scripts de experimentos sueltos en `reels/`.

**Documentación**

- ✅ Documentos puestos al día el 25/09 (`CLAUDE.md`, `PENDIENTES.md`, `EMPEZAR-ACA.md` con "Si algo dejó de salir", `INFRAESTRUCTURA.md`, `REDES.md`, `SEO.md`, `PANEL.md`, `EDITORIAL.md`, `REGLAS.md`, `HISTORIA.md`, `web/README.md`).
- 👤 **Política y Policiales en la web.** Hoy salen solas si el semáforo da verde; en las redes siempre esperan a una persona. Hernán y Andrés tienen que decidir si en la web también esperan.
- ⏳ Quedan menciones a Vercel en comentarios de `web/scripts/generar-datos.mjs` y `web/components/piezas.js`, y `generar-redirects.mjs` sigue escribiendo `web/vercel.json` (ya no se commitea).

**Producto**

- ✅ Portada sólo con notas de las últimas 72 h (ahora en la nube). Cupos de afuera: Automovilismo 12, Tecnología 8, Política 8.
- ✅ La IA reescribe primero lo local.
- ⏳ Canal de WhatsApp para lectores (idea, en `PENDIENTES.md`).

**Le toca a una persona (resumen):** borrar el proyecto de Vercel y el DNS que
quedó · `ads.txt` y AdSense · decidir Política y Policiales en la web ·
confirmar el texto de "Quiénes somos" · borrar `CLAVES-INICIALES.txt` y las
copias viejas en `respaldos/` · **reiniciar el panel** (`ARRANCAR.bat`) para
que tome los cambios · aplicar las biografías de `PERFILES.md`.

---

## La auditoría, tal como se escribió (mañana del 25/09)

Revisión de sólo lectura en cinco áreas: seguridad y legal, código y pruebas,
web y SEO, infraestructura y operación, documentación y producto. No se tocó
nada durante la revisión. "Verificado" = se comprobó; "a confirmar" = sospecha.

Estado general: **el sistema anda** (537 pruebas pasan, "Actualizar la web" sin
fallas en 48 h, Meta publicando de verdad, sitio rápido, ninguna clave filtrada
en el código ni en el historial). Pero hay dos problemas que hoy cuestan
lectores o pueden frenar todo, y dos riesgos legales.

## 1. Urgente (esta semana)

| # | Qué | Evidencia | Arreglo |
|---|---|---|---|
| 1 | **Los enlaces que se publican en Facebook dan 404** cuando la IA cambia el titular después de publicar, o cuando la nota sale de la portada | Verificado: `/nota/1o216bo` y `/nota/lcvlqf` → 404; la dirección con el titular viejo → 404; `/nota/942wi7` → 301 a la nota. En la corrida 36081883561 el espejo a Instagram falló por lo mismo | Publicar en redes `/nota/<id>` (ya redirige) y una página 404 que busque la nota por el identificador del final. Con prueba |
| 2 | **Minutos de GitHub Actions**: el repo es **privado** y se estima ~400 min/día (~12.000/mes). El plan gratis trae 2.000 | Repo PRIVATE verificado; el plan no se pudo ver (falta permiso) | Una persona mira github.com/settings/billing. Opciones: hacer público el repo, no compilar dos veces (actualizar + deploy), sacar el disparo de Redes de los :45 en cron-job.org, Vigilancia cada hora |
| 3 | **El filtro de menores y víctimas mira poco texto**: el semáforo lee título + 600 caracteres, pero la IA escribe con el artículo completo y lo que escribe no vuelve a pasar por el semáforo. La instrucción de la IA no dice "no identificar menores ni víctimas" | Verificado en el código (`ingesta/ingesta.mjs:437`, `reels/reescritura.mjs`) | Pasar el semáforo también por el texto completo y por lo que escribió la IA; sumar la regla a la instrucción; prueba |
| 4 | **La lista roja tiene una sola prueba** ("femicidio") y le faltan términos ("menor" suelto, "bebé", "alumna", "abusó", "trata"…) | Verificado (`ingesta/fuentes.mjs:566-586`) | Prueba por cada término. **La lista no se toca sin que Hernán y Andrés decidan** |
| 5 | **El sitio dice "siempre con revisión humana"** y ninguna de las 178 notas fue revisada por una persona. Cada nota dice lo contrario | Verificado (`web/app/layout.js:191`, `llms.txt`, bios en `PERFILES.md`) | Cambiar a "verificado automáticamente contra la fuente; lo sensible lo revisa una persona" |
| 6 | **Farmacias, Agenda, Útil y Privacidad le dicen a Google que son la portada** (canónico `/`): pueden no aparecer nunca en Google | Verificado en el sitio | Canónico propio en cada una, con prueba |
| 7 | **WhatsApp roto**: teléfono de 7 dígitos; la clave se recargó a las 00:02 del 25/09 pero no se probó | Verificado (corrida 36088067713) | Recargar el teléfono completo (549…) y correr "Prueba de WhatsApp" |

## 2. Importante (próximas dos semanas)

**Web y SEO**
- Sólo 19 % de las notas tiene cuerpo (24 % en el último día; el mínimo es 35 %). Es el mayor obstáculo para Google y para AdSense.
- Nota duplicada ("Zona Fría", dos direcciones); el agrupamiento no las une.
- La imagen para compartir sale como `application/octet-stream`: Facebook/WhatsApp pueden no mostrarla. Arreglo con `web/public/_headers`.
- Falta `ads.txt`, "Quiénes somos" y "Contacto" (necesarios para AdSense).
- Sin encabezados de seguridad (HSTS, CSP) y caché corta en archivos fijos: también en `_headers`.
- JSON-LD sin logo; 19 notas del sitemap de noticias con la misma fecha de relleno.

**Código y operación**
- `actualizar.yml` y `cloudflare-deploy.yml` sin `TZ` → de 21 a 24 h el cruce de farmacias y los números útiles toman el día siguiente.
- `actualizar.yml` sin `timeout-minutes` y Gemini sin timeout → una corrida colgada frena la web hasta 6 h.
- `fetch` sin timeout en Meta, voz de Gemini y el clima del navegador.
- El panel sigue intentando publicar en Vercel cada 2 h (`panel/servidor.mjs:440`): sacarlo.
- Regla "sin dependencias de afuera" rota: `panel/servidor.mjs` → `reels/voz-gemini.mjs` → `ffmpeg-static`. La prueba no la ve (sólo mira un nivel y no lee imports de varias líneas).
- `generar-datos.mjs`, que arma la portada, no tiene pruebas reales.
- Tres posteos de Facebook del mismo tema en 4 h; uno salió 22:25 (la regla dice hasta las 22).
- El log no dice por qué el verificador rechaza una nota.
- La Vigilancia pinta de rojo Actions cuando encuentra un problema (confunde con una falla real).

**Seguridad**
- Los respaldos del panel copian `CLAVES-INICIALES.txt` y `secreto.txt`; si van a Drive, terminan en la nube.
- El freno de intentos del panel se puede saltear falseando `X-Forwarded-For`.
- `npx wrangler@4` sin versión fija recibe el token de Cloudflare.
- `next`/`postcss` con una vulnerabilidad conocida (riesgo bajo: sitio estático).
- Dos workflows sin `permissions:`.

## 3. Menor

- Contraste bajo en la etiqueta de Automovilismo; buscador sin `aria-label`; `lang="es"` en vez de `es-AR`; "Radar Balcarce · Radar Balcarce" en el título de Privacidad.
- `decisiones.json` (437 KB) nunca se poda.
- `ingesta/ingesta.mjs` tiene 1222 líneas; scripts de experimentos sueltos en `reels/`.
- La clave de Gemini viaja en la dirección (`?key=`): mejor en el encabezado.
- Vencimiento del dominio (21/09/2027, DonWeb) no está en la tabla de vencimientos ni en el vigilante.
- La variable `CLOUDFLARE_PROJECT` que nombra `INFRAESTRUCTURA.md` no existe (se usa el valor por defecto).

## 4. Documentación

- Contradicción: Política y Policiales, ¿esperan a una persona o salen solas en la web? (`EDITORIAL.md` vs `EMPEZAR-ACA.md`/`PANEL.md`). Hay que decidirlo.
- AdSense: "para mañana" en un lado, "más adelante" en otros.
- Restos de Vercel en `web/README.md:39`, comentarios de `actualizar.yml`, `cloudflare-deploy.yml`, `generar-datos.mjs`, `piezas.js`.
- `REDES.md` con partes viejas (dos o tres pasadas, historias de nota, "el primer mes").
- `PENDIENTES.md`: ítems duplicados entre "Para mañana" y el resto; ninguno tiene dueño ni fecha.
- `EMPEZAR-ACA.md` necesita un "Si algo dejó de salir" paso a paso.
- `CLAUDE.md`: "300+ pruebas" (son 537), "dos trabajos" de cron-job.org (son tres).

## 5. Producto

- La portada es poco local: Automovilismo 46 notas, Balcarce 40; una sola fuente aporta el 40 %; 24 % de notas con más de 72 h.
- Tres mejoras de alto impacto y poco esfuerzo:
  1. Bajar el cupo de lo de afuera y sacar lo de más de 72 h (`CUPO_DE_AFUERA`/`PISO_DE_AFUERA`).
  2. Usar la IA primero en lo local con más puntaje (hoy 101 notas locales sin cuerpo).
  3. Canal de WhatsApp para lectores, con el texto de la farmacia y los podcasts.

## Lo que está bien

537 pruebas pasan en 4 s · ninguna clave en el código ni en el historial · contraseñas del panel con scrypt · Política y Policiales no salen solas a redes (con prueba) · nunca fotos de otros medios (con prueba) · sitio responde en 0,2–0,6 s, portada 35 KB comprimida · sitemap, feed, robots e íconos bien · beacon de Cloudflare en todas las páginas, sin restos de Vercel · Meta publicando de verdad · reescritura con IA mejoró de 2/20 a 34/40 aceptadas · certificado TLS se renueva solo.
