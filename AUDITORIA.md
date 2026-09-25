# Auditoría completa — 25/09/2026

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
