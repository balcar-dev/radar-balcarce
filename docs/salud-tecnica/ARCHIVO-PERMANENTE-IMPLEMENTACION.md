# Archivo permanente: lo que se construyó y cómo se activa

*Escrito el 15/10/2026. Continúa `ARCHIVO-PERMANENTE.md` (el diseño, variante "a": R2 + un Worker delante de las notas). **Está construido y probado sin red, pero NO está activado:** no se desplegó nada, no se creó ningún depósito, no se tocó ninguna ruta de `radarbalcarce.com` y el sitio publica exactamente lo mismo que ayer. `MAXIMO_EN_ARCHIVO` sigue en 3.700 y `web/lib/archivo.js` no cambió.*

Lo que sigue sin verificar contra Cloudflare real está marcado **SIN VERIFICAR**; se mira en el ensayo (sección 4) antes de activar nada.

## 1. Qué hay construido

| Archivo | Para qué sirve |
|---|---|
| `infra/archivo-cloudflare/worker.mjs` | El Worker. Pregunta primero al sitio; sólo si el sitio dice 404 (o no contesta) busca la nota en R2 y la sirve con la misma dirección. Sin dependencias. Sólo **lee** R2. |
| `infra/archivo-cloudflare/wrangler.toml` | Dos entornos: `staging` (workers.dev, depósito `radar-archivo-staging`, **sin rutas**) y producción (depósito `radar-archivo`, con la ruta comentada: mientras esté comentada no cambia nada). |
| `web/scripts/archivar-a-r2.mjs` | El exportador. Decide qué notas son "viejas", toma su HTML del sitio ya compilado (`web/out`), lo prepara para que dure, arma el manifiesto y, **sólo con `--subir`**, lo sube a R2. Por defecto es una simulación. |
| `.github/workflows/archivo-staging.yml` | A mano. Sube el Worker de ensayo y, si se pide, compila el sitio y carga una muestra en el depósito de prueba. No commitea nada. |
| `pruebas/archivo-cloudflare.test.mjs` (25) y `pruebas/archivar-a-r2.test.mjs` (28; una se saltea sola si no existe `web/out`) | Sin red. El Worker se prueba con un R2 y un "sitio" simulados; el exportador, con un sitio armado en una carpeta temporal y un `wrangler` falso. Incluyen la **prueba de contrato** (sección 3). |

### Cómo atiende el Worker un pedido a `/nota/*`

1. Le pide la página al sitio (Pages). Si contesta cualquier cosa que no sea 404/410/5xx (200, 301, 304…), **devuelve esa respuesta tal cual**. Las notas recientes no notan que existe el Worker.
2. Si el sitio dice 404 (o no contesta), busca la nota en R2 **por su identificador** (lo que va después del último guion):
   - está y la dirección pedida es la canónica → **200** con la página guardada, las mismas cabeceras de seguridad que `web/public/_headers` (una prueba las compara) y caché de Cloudflare de 1 hora;
   - está pero la dirección es otra (titular viejo, `/nota/ID` a secas, `?fbclid=…`) → **301** a la canónica (conserva el `?…`);
   - no está → devuelve **el 404 del propio sitio**, con su página y su estado (404 de verdad, como hoy).
3. También sirve `/nota/<titular-id>/opengraph-image` (la tarjeta al compartir) y, si se configura la ruta y `FOTOS_DE_RESPALDO=1`, `/fotos-notas/*`.
4. Si R2 falla, devuelve lo que dijo el sitio. Si el sitio no contesta y R2 no tiene la nota, 502 (no se sabe). Nunca lanza una excepción.
5. **Interruptores**: `ARCHIVO_ACTIVO=0` lo vuelve un tubo; sacar la ruta hace lo mismo. Sólo atiende GET y HEAD; todo lo que no es `/nota/<titular-id>[/imagen]` pasa derecho sin tocar R2. No cuenta el buscador ni las listas de sección: lo archivado se llega por enlace (igual que en el diseño).

### Cómo prepara el exportador una nota (`prepararHtml`)

Toma el HTML que ya armó Next (`web/out/nota/<titular-id>.html`) y hace **sólo** esto:

- copia el CSS adentro de la página (`<style>`): el archivo de estilos de Next cambia de nombre en cada armado y Cloudflare no guarda los viejos (es **un solo archivo global** de 38 KB, medido, y no usa nada con huella: sus tipografías son `/fuentes/…`, de dirección fija);
- saca los `<script>` de Next (la nota se lee sin JavaScript) y los precargadores de scripts; **deja los datos estructurados** (`application/ld+json`, lo que lee Google);
- saca lo que se congela mal: la franja de arriba con la fecha, el clima y la farmacia **del día del armado** (en 2027 diría "14° Nublado" de hoy), los "hace 5 días" (la fecha exacta de la nota queda) y los tres botones que sólo andan con JavaScript (buscar, compartir por WhatsApp, copiar el enlace: quedarían muertos);
- saca la huella del armado pegada al doctype.

Todo lo demás (cabeza, metadatos, canónica, Open Graph, artículo, "Seguí leyendo", pie) es **el del sitio, letra por letra**. Cada página se valida antes de subirla: canónica igual a la dirección de la nota, con titular, completa, sin ninguna referencia a `/_next/static/`; si no, la nota se **omite** (queda anotada en el manifiesto con el motivo) y nunca se sube una página rota.

**Qué se archiva por nota**: la página, su tarjeta `opengraph-image` (si tiene) y su foto si se pide con una dirección del propio sitio (`/fotos-notas/…`; si ya se usa `FOTOS_BASE` no hace falta). **No** la imagen de Instagram (`instagram.png`, ~800 KB): la lee Meta una vez al publicar. `--con-instagram` la agrega.

### Qué notas son "viejas"

Las que quedan fuera de las primeras `tope − margen` en el **mismo orden con que el sitio se queda con las suyas** (`actualizarArchivo`: primero las que salieron en redes, después las más nuevas). Con `tope = 3700` y `margen = 200` son las que **van a salir en los próximos ~4 días**: se archivan antes de que se caigan. Siempre se excluyen las de `retiradas.json`. Las que ya salieron del sitio **antes** de que existiera esto (hoy 289, en `web/data/historico/`) no tienen HTML: se anotan como `sin-html-en-el-sitio` (ver sección 7).

### Qué se mide hoy (armado real del 15/10, 1.131 notas)

| Cosa | Medido |
|---|---|
| Página archivada (con el CSS adentro) | ~56 KB |
| Foto (0,78 por nota) | 72 KB en promedio |
| Tarjeta `opengraph-image` (14% de las notas) | 367 KB |
| `instagram.png` (14%; **no se archiva**) | 827 KB |
| **Por nota, sin Instagram** | **~160 KB** |
| Con 46 notas por día | ~2,7 GB por año → entra en los 10 GB gratis de R2 unos **3,5 años**; después, centavos por mes (**SIN VERIFICAR** el precio vigente) |
| Objetos para subir todo lo que está hoy en el sitio | ~2.200 (≈ 10 minutos con 6 subidas a la vez) |

## 2. Qué cambia en el sitio al activarlo (y qué no)

**No cambia** el sitio compilado ni lo que publica Pages: sigue igual, con las mismas ~16.000 archivos como máximo. Las direcciones de las notas, `_redirects`, `_headers`, el sitemap, el feed y las páginas de sección no se tocan.

**Cambia, en orden:**
1. Una ruta nueva `radarbalcarce.com/nota/*` pasa por el Worker. Cada pedido a una nota cuenta como una invocación (no las fotos, portada ni secciones, salvo que se agregue a propósito la ruta de fotos). Con ~155 visitas por día y los robots, está lejos del cupo gratis (100.000 por día, **SIN VERIFICAR**) y el plan de Workers de US$ 5 por mes ya está previsto.
2. Un paso nuevo en el despliegue (`cloudflare-deploy.yml`) que corre el exportador **antes** de subir el sitio (sección 5, paso 6).
3. Recién después, y como decisión aparte, se puede **bajar** el tope de notas del sitio (por ejemplo a 2.000): más rápido de armar y de subir, y sin romper un solo enlace.

**No toca:** `web/data/*`, `web/lib/archivo.js`, `MAXIMO_EN_ARCHIVO`, la ingesta, las redes ni el reloj.

## 3. La prueba de contrato

`pruebas/archivar-a-r2.test.mjs` → "CONTRATO". Con una nota de un sitio armado en carpeta temporal:

1. lo que se guarda en R2 tiene **la misma cabeza** (todos los `<meta>`, `<link>`, `<title>`), **los mismos datos estructurados** y **el mismo `<article>`, letra por letra**, que el HTML del sitio (se ignoran sólo las cuatro diferencias a propósito: scripts, estilos, "hace N", botones y franja del día);
2. el Worker, cuando el sitio dice 404, devuelve ese mismo texto con estado 200;
3. la foto y la tarjeta que la página pide están en el depósito con la misma dirección.

Hay una segunda prueba que **se saltea sola si no existe `web/out`** (que es lo normal en `npm test`): con el sitio real compilado (`cd web && npx next build`) repite el contrato contra **todas las notas reales**, además de comprobar que cada preparación es idempotente. La corrí el 15/10 con las 1.131 notas del armado real: pasaron todas, sin problemas.

## 4. Ensayo en staging (antes de activar nada)

Hace falta una persona, ~30 minutos. Los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` ya existen; el token necesita **Workers Scripts: Edit** y **Workers R2 Storage: Edit** (el del respaldo ya tiene el segundo; si el deploy del Worker falla por permisos, es esto).

1. GitHub → Actions → **Archivo permanente (staging)** → Run workflow, con `cargar_muestra` **tildado** y `cuantas` = 20. Hace, en este orden: corre las pruebas, crea el depósito `radar-archivo-staging` si no existe, sube el Worker `radar-balcarce-archivo-staging`, compila el sitio y sube una muestra de las 20 notas más viejas. Lo único que escribe es ese depósito de prueba (el exportador se niega a escribir en un depósito sin "staging" o "prueba" en el nombre, o que sea el de respaldos o el de fotos).
2. En Cloudflare → Workers → `radar-balcarce-archivo-staging` se ve su dirección de workers.dev (`https://radar-balcarce-archivo-staging.<cuenta>.workers.dev`).
3. Probar (el Worker de ensayo mira R2 **antes** que el sitio: `ARCHIVO_PRIMERO=1`, así se prueba una nota que el sitio todavía tiene). Con una nota de la muestra, `RUTA` = `/nota/<titular-id>`:
   - `curl -sI https://…workers.dev/RUTA` → `200`, `x-radar-archivo: r2`, `content-type: text/html`, las seis cabeceras de seguridad.
   - `curl -s https://…workers.dev/RUTA` frente a `curl -s https://radarbalcarce.com/RUTA`: mismo titular, mismo cuerpo, misma foto (abrirla en el navegador y mirar las dos lado a lado; sin franja de arriba ni botones, es lo esperado).
   - `curl -sI https://…workers.dev/nota/cualquier-titular-<id>` → `301` a `/nota/<titular-id>`.
   - `curl -sI https://…workers.dev/nota/no-existe-zzzzzz` → `404` con la página "No encontramos esa página" (el 404 del sitio).
   - Foto y tarjeta: abrir la imagen de la nota y `…/RUTA/opengraph-image` (`image/png`).
   - Pegar la dirección de ensayo en el depurador de Facebook (Sharing Debugger) y verificar que la vista previa sale con título, bajada e imagen.
4. **SIN VERIFICAR, hay que mirarlo ahora:** que el estilo se vea completo en el celular (lo único que no se prueba sin navegador), que la tipografía cargue (viene de `/fuentes/…`, o sea del sitio), y que la respuesta en un Worker real de una página con tildes y emojis salga con la codificación correcta.
5. Para el ensayo de "sitio caído": cambiar el valor de `ORIGEN_PAGES` en el panel del Worker de ensayo a una dirección que no exista y repetir el `curl` del primer punto (tiene que servir desde R2 igual).

Si algo no cierra, se borra el Worker de ensayo y el depósito de prueba; producción no se enteró de nada.

## 5. Cómo se activaría (pasos exactos)

Cada paso se puede frenar o volver atrás sin tocar el siguiente. El orden es el que menos expone al lector.

**0. Antes de todo (ya previsto en `ARCHIVO-PERMANENTE.md`):** que las fotos tengan dónde vivir cuando la nota sale del sitio. Dos caminos, a elegir (decisión 2):
   - **Fotos a R2** (`Fotos a R2` + variable `FOTOS_BASE`): las páginas piden la foto a otro dominio y el archivo no tiene que guardarla; o
   - **Dejar que el archivo guarde las fotos** (es lo que hace el exportador por defecto) y agregar la ruta `radarbalcarce.com/fotos-notas/*` con `FOTOS_DE_RESPALDO=1`. Cuesta una invocación del Worker por cada foto que se vea; **no se recomienda** salvo que las fotos a R2 se demoren.

**1. Crear el depósito** `radar-archivo` en Cloudflare → R2 → Create bucket (privado: sin dominio público ni "Public access"). Es **otro** depósito, distinto de `R2_RESPALDOS` y de `R2_FOTOS`.

**2. Verificar el token** (`CLOUDFLARE_API_TOKEN`): con "Workers R2 Storage: Edit" alcanza para el exportador (que sube con wrangler). Para más seguridad se puede crear uno con permiso sólo sobre ese depósito (decisión 4).

**3. Subir todo lo que existe hoy.** Se necesita un workflow de producción (no está escrito a propósito: se escribe recién acá, son ~15 líneas, calcado de `archivo-staging.yml`): compila el sitio y corre `node web/scripts/archivar-a-r2.mjs --subir --bucket=radar-archivo --produccion --tope=1 --margen=0`. Con `--tope=1` ("archivá todo lo que haya") sube las ~1.130 notas del sitio. **Verificar** abriendo el manifiesto (`manifiesto.json` en la raíz del depósito) y probando 20 enlaces reales de Facebook en el Worker de ensayo apuntado a este depósito.

**4. Subir el Worker de producción sin ruta.** `wrangler deploy` en `infra/archivo-cloudflare/` (producción, sin `--env`). Con la ruta todavía comentada es inofensivo: existe pero nadie le pregunta nada. Probarlo en su dirección de workers.dev temporal (`workers_dev = true` un rato) contra una nota archivada.

**5. Poner la ruta (es el momento del cambio).** En `infra/archivo-cloudflare/wrangler.toml` descomentar el bloque `routes` y volver a subir el Worker; o a mano en Cloudflare → Workers → `radar-balcarce-archivo` → Settings → Domains & Routes → Add route → `radarbalcarce.com/nota/*`. Desde ese momento los pedidos a notas pasan por el Worker. Comprobar de inmediato: una nota de hoy (200 del sitio, sin `x-radar-archivo`), una nota inexistente (404) y el `curl -sI` de una nota que el sitio ya no tenga.
   - **SIN VERIFICAR:** si con `ORIGEN_PAGES` puesto el Worker le pregunta bien a Pages (otro nombre de host, mismo proyecto). Alternativa: dejar `ORIGEN_PAGES` vacío (`""`) para que el Worker deje pasar el pedido original al origen. Se prueba en el paso 4 con las dos formas.

**6. Automatizarlo para que no se pierda ninguna nota.** En `cloudflare-deploy.yml`, **después de "Compilar el sitio" y antes de "Subir a Cloudflare Pages"**, un paso:
   ```
   - name: Archivar las notas por salir (R2)
     run: node web/scripts/archivar-a-r2.mjs --subir --bucket="$R2_ARCHIVO" --produccion --borrar
     env:
       R2_ARCHIVO: ${{ vars.R2_ARCHIVO }}
       CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
       CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
   ```
   y la variable de GitHub `R2_ARCHIVO` = `radar-archivo`. Sólo sube lo que cambió (compara con `manifiesto.json`). `--borrar` saca del depósito lo que desde la corrida anterior pasó a `retiradas.json` (menores, víctimas: ver sección 8). Si el paso falla, **el despliegue falla** y el vigilante avisa (decisión 5: o se prefiere que el paso no frene el sitio y sólo avise).

**7. Bajar el tope del sitio** (decisión 6; es aparte y reversible): cambiar `MAXIMO_EN_ARCHIVO` en `web/lib/archivo.js` **y** `PORTADA.maximoDeNotas` en `ingesta/criterio.mjs` (y la tabla de `CRITERIO-EDITORIAL.md`; una prueba los compara). Las notas que salgan ya están en R2. El margen del exportador tiene que seguir cubriendo lo que sale entre una corrida y la siguiente (hoy ~4 días).

## 6. Cómo se vuelve atrás en un minuto

El Worker es una pieza **aparte** y el sitio nunca dependió de él. Tres maneras, de la más rápida a la más completa:

1. **Sacar la ruta** (≈ 1 minuto, sin comandos): Cloudflare → Workers → `radar-balcarce-archivo` → Settings → Domains & Routes → borrar `radarbalcarce.com/nota/*`. Desde ese segundo el sitio responde solo, exactamente como antes. Las notas archivadas vuelven a dar 404 (como hoy cuando pasan el tope); **ninguna nota reciente cambia**.
2. **Apagar el archivo sin sacar la ruta**: poner la variable `ARCHIVO_ACTIVO` = `0` en el Worker (queda como un tubo).
3. **Volver el repositorio**: en `wrangler.toml`, volver a comentar el bloque `routes` y subir; y sacar el paso del exportador de `cloudflare-deploy.yml`.

Es seguro por diseño: ante cualquier falla propia (R2 caído, error interno) el Worker devuelve lo que habría devuelto el sitio solo. Lo único que se pierde al volver atrás es el acceso a las notas que ya salieron del sitio; en R2 siguen guardadas.

## 7. Lo que ya salió del sitio (289 notas del histórico)

Las notas de `web/data/historico/*.json` (hoy 289: las que pasaron los 180 días o el tope antes de que existiera el archivo, o las de antes de la regla del cuerpo) **no tienen HTML en el sitio**: el exportador las lista como omitidas por `sin-html-en-el-sitio`. Para rescatarlas hace falta un armado de rescate: compilar Next una vez con `archivo.json` reemplazado por las notas del histórico que se quieran recuperar (en una copia del repositorio o una rama que **no se publica**), y correr el exportador sobre ese `web/out` con `--tope=1 --margen=0`. No está automatizado: `web/lib/datos.js` lee `web/data/archivo.json` en un lugar fijo y no quise tocarlo sin que lo decidan (decisión 3). La mayoría de esas notas, además, no tenían enlaces circulando (las de antes del 25/09 son `noindex` y sin cuerpo).

## 8. Menores, víctimas y retiradas

Es la regla que más cuidado pide: **lo retirado no puede quedar en un depósito más**.
- El exportador **nunca archiva** lo que está en `web/data/retiradas.json`, y con `--borrar` borra de R2 lo que desde la corrida anterior pasó a esa lista (compara con `manifiesto.json`).
- Una nota que el semáforo rojo (o la IA) saque de `archivo.json` desaparece de `archivo.json` **y** del histórico (`bajasDelArchivo` no guarda lo retirado). El exportador cruza el manifiesto del depósito con las notas vivas: **todo id del manifiesto que ya no está ni en `archivo.json` ni en `historico/` se trata como retirado** y `--borrar` lo saca de R2. Para que un archivo roto o vacío no vacíe el depósito, un borrado de más del 5 % del depósito (y de más de 10 notas) se frena y hay que repetirlo con `--confirmar-borrado`.
- El manifiesto (`manifiesto.json` en la raíz del depósito, que el Worker nunca sirve) se **acumula** entre corridas: lo que ya había más lo nuevo, menos lo borrado. Si no se pudiera leer al empezar una corrida (error de red), esa corrida lo reescribe con lo suyo: lo ya subido sigue servido, pero esa vez no se podría borrar lo retirado; el exportador lo avisa en el recuento ("por subir" alto de golpe).
- Demora: el Worker guarda cada nota en la caché de Cloudflare **1 hora** (`CACHE_SEGUNDOS`); desde que se borra de R2 hasta que deja de servirse pasan hasta 60 minutos más el `max-age` del navegador (5 minutos). Para urgencias: Cloudflare → Caching → Purge by URL con la dirección de la nota, o bajar `CACHE_SEGUNDOS` a 0.
- Una corrección posterior a un texto ya archivado (la auditoría con IA, el celular) **no llega a la copia de R2** mientras la nota ya no esté en el sitio. Si la nota todavía está en `web/out`, `--ids=<id>` la vuelve a preparar y `diferencias` la sube porque cambió su huella.

## 9. Riesgos

| Riesgo | Cuánto | Qué lo contiene |
|---|---|---|
| El Worker se rompe y afecta a **todas** las notas (el pedido pasa por él) | Medio al activar, bajo después | Falla "abierta": ante errores propios devuelve la respuesta del sitio; se saca la ruta en 1 minuto; el ensayo en staging antes. **Aun así un error de despliegue de Cloudflare (no nuestro) puede dejar `/nota/*` sin responder**: es el costo de poner un Worker delante. |
| La nota archivada se ve distinta (estilos, tipografía) | Bajo | Prueba de contrato contra las 1.131 notas reales; mirar en el celular en el ensayo (sección 4, punto 4). |
| Una nota sale del sitio sin haber sido archivada (el paso falló varios días seguidos) | Bajo con margen de ~4 días | El paso falla a la vista (workflow rojo + vigilante). Sin una guarda en el código de "no sacar del sitio lo no confirmado" (decisión 5). |
| Lo retirado queda en R2 | **Medio, es el riesgo grave** | `--borrar` (retiradas a mano **y** lo que desapareció del archivo vivo), freno ante borrados enormes, caché de 1 hora (sección 8). Verificarlo en el ensayo con una nota retirada de prueba antes de activar la ruta. |
| Cuota del plan gratis de Workers en un pico | Bajo | Plan pago de US$ 5 ya previsto; el Worker responde las notas recientes sin tocar R2. |
| El HTML guardado depende de la plantilla de **ese** día | Aceptado | Una nota archivada no se actualiza con los cambios de diseño del sitio. Un rediseño no la arregla: hay que volver a prepararla (sirve `--ids`) mientras tenga HTML, o regenerar desde los datos. |
| Se perdió el HTML de una nota archivada | Bajo | R2 está replicado por Cloudflare; el respaldo (`respaldo.yml`) **no incluye este depósito**: ver decisión 8. |
| Google ve páginas que no están en el sitemap | Bajo | Responden 200 con su canónica de siempre; el sitemap sólo lleva las recientes (decisión 9). |
| `wrangler r2 object put` de a uno es lento en la primera carga (~2.200 objetos) | Bajo | ~10 minutos con 6 a la vez; reintenta 3 veces cada objeto. |

## 10. Decisiones que quedan para Hernán

1. **¿Seguimos con la variante (a)?** (Worker delante de Pages). Esta guía la da por buena porque es la recomendada y es la que se construyó.
2. **Fotos**: ¿primero "Fotos a R2" con `FOTOS_BASE` (recomendado) o que el archivo guarde las fotos y se sirvan por el Worker?
3. **Las 289 notas del histórico**: ¿se rescatan con un armado especial (medio día de trabajo) o se dan por perdidas? Hoy no hay enlaces conocidos hacia la mayoría.
4. **Token de Cloudflare**: ¿se usa el actual o se crea uno nuevo con permiso sólo sobre `radar-archivo` (más seguro, un paso más)?
5. **Si el archivado falla**, ¿el despliegue del sitio se frena (recomendado hasta que haya una guarda en el código) o sólo avisa y sigue?
6. **Cuánto baja el tope del sitio** una vez andando (hoy 3.700; con el archivo podría ser 2.000 o menos). Es decisión editorial y de velocidad, no técnica.
7. **El paso `--borrar` en el despliegue** (sección 8): ¿se deja siempre prendido (recomendado: es lo que borra a un menor o una víctima si se descubre tarde) o sólo a mano?
8. **Respaldo del depósito**: hoy `respaldo.yml` no copia `radar-archivo`. ¿Se suma una copia mensual a otro lado?
9. **Sitemap de archivo** (`sitemap-archivo.xml` armado por el Worker) y una página `/archivo/2026-09` para navegar lo viejo: ¿ahora, después o nunca?
10. **Qué hacer con los tres botones y la franja del día en las notas archivadas**: se sacaron porque sin JavaScript quedaban muertos o desactualizados. Si se prefiere mantener buscar/compartir, hay que publicar un JavaScript propio con nombre fijo (más trabajo, y toca el sitio).

## 11. Qué falta y cómo se prueba cada cosa

- **Construido y probado sin red:** Worker (rutas, caché, ETag/304, HEAD, 404 correcto, redirecciones, fallback con sitio o R2 caídos, interruptor), exportador (selección, preparación del HTML, plan, manifiesto, diferencias, guardas, subida con reintentos, simulación), contrato contra el sitio real y `wrangler deploy --dry-run` de los dos entornos (valida el `wrangler.toml` y empaqueta el Worker: 7,9 KiB).
- **Falta, con red y con credenciales (las tiene una persona):** crear los depósitos, el ensayo de la sección 4, el workflow de producción (paso 3), el paso del despliegue (paso 6), y una prueba de que el vigilante (`infra/vigilante-cloudflare/`) revise una nota archivada de verdad (hoy sólo mira la portada).
- **SIN VERIFICAR contra Cloudflare real:** el host que se pasa a Pages (`ORIGEN_PAGES` vs. dejar pasar el pedido original), `caches.default` en una ruta de un dominio propio, el cupo y precio actuales de Workers y R2, el nombre exacto de los permisos del token, el formato de salida de `wrangler r2 bucket list` (el workflow de staging lo usa para decidir si crea el depósito: si falla, `wrangler r2 bucket create` a mano alcanza), y que `wrangler r2 object put/get/delete --remote` se comporte igual en la versión fija 4.139.0.
