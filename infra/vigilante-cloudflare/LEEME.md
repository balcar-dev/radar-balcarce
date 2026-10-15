# El vigilante de Cloudflare

Un programa chico (un Worker de Cloudflare, `radar-balcarce-vigilante`) que **mira la web desde afuera de GitHub y avisa por mail**.
Existe porque el 1/10 se acabó el cupo de WhatsApp (CallMeBot) y nadie se enteró de que la web falló 24 veces el 4/10 y 17 el 11/10:
el vigilante de siempre (`redes/vigilar.mjs`) corre dentro del mismo GitHub que vigila. No lo reemplaza: lo complementa.

## Qué hace

Cada media hora (a los **:12 y :42**, para no pisarse con el reloj, que despierta a los :00, :30, :05, :35 y :45):

| Mira | Avisa si |
|---|---|
| La portada `radarbalcarce.com` | no contesta 200 en 15 segundos, **dos revisiones seguidas** (`web-caida`) |
| Cuándo se armó la web por última vez (el mapa del sitio `/sitemap.xml`; si falla, `lastBuildDate` de `/feed.xml`) | pasaron más de **3 horas** entre las 7 y las 23 (hora de Balcarce) o más de **6** de noche (`web-vieja`); no se puede leer la fecha dos veces seguidas (`web-sin-fecha`) |
| Las corridas de «Actualizar la web» (API pública de GitHub, sin llave) | la última corrida buena tiene más de 3 horas (`actualizar-vieja`) o las últimas 3 fallaron (`actualizar-falla`); no se puede leer a GitHub cuatro veces seguidas (`github-sin-lectura`) |

- Un problema **se avisa una vez y se repite cada 6 horas** mientras siga. Cuando se arregla llega **un mail de «Se arregló»**, una sola vez.
- A las **22** (Balcarce) llega un **resumen mínimo del día** (si la web responde, última actualización, notas de hoy —se cuentan en el feed—, la última corrida buena y los problemas abiertos), **pero sólo si el informe de la noche no llegó**: desde el 15/10 (regla 176) el informe de las 21:15 (`redes/informe-diario.mjs`, lo arma GitHub) es el resumen de verdad, y éste es su respaldo, que vive afuera de GitHub. Dice «El informe completo de la noche no llegó hoy».
- Si un mail no sale (por ejemplo, Cloudflare lo rechaza), ese aviso **no se da por hecho**: se reintenta en la vuelta siguiente y la ejecución figura como fallida en el panel del Worker.
- Los mails salen de `vigilante@radarbalcarce.com` y llegan a `radarbalcarce@gmail.com`. Es **texto simple**, en castellano, con los enlaces de dónde mirar.

La memoria (qué avisó y cuándo) vive en un KV de Cloudflare llamado `radar-balcarce-vigilante-ESTADO`. Los umbrales están en `LIMITES` (`worker.mjs`).

Dos direcciones del Worker (tiene una dirección `*.workers.dev`, que se ve en Cloudflare → Workers → radar-balcarce-vigilante):

- `GET /estado`: un JSON con la última revisión (sin ningún secreto) y los problemas abiertos.
- `GET /probar-mail`, con el encabezado `x-token: <VIGILANTE_TOKEN>`: manda un mail de prueba. **El token va sólo en el encabezado, nunca en la dirección.** Una prueba por minuto como mucho.
- `POST /avisar` (desde el 15/10, regla 173), con el mismo encabezado `x-token`: **la puerta de salida de los avisos de GitHub**. El vigilante de siempre (`redes/vigilar.mjs`), la auditoría semanal, la auditoría con IA y las pistas mandan por acá lo que antes iba por WhatsApp (`redes/avisar-por-mail.mjs`, secreto `VIGILANTE_TOKEN` en GitHub); si el mail no sale, recién ahí prueban WhatsApp. Cuerpo JSON `{ "asunto", "texto", "html"?, "clave"?, "nivel"? }`: con `clave`, la misma clave no se repite en 6 horas; como mucho 30 mails por hora; el pedido, hasta 100 KB. El `html` es opcional (desde el 15/10, lo usan los informes diarios): si viene, el mail sale con las dos versiones (texto y formato) y con el pie de siempre; si pasa de 60.000 caracteres se descarta, sale sólo el texto y la respuesta trae `"sinHtml": true`; si no es texto, 400. **Después de subir esta versión hay que correr de nuevo el workflow «Vigilante de Cloudflare»**: sin eso el Worker viejo no conoce `/avisar` y los avisos siguen cayendo a WhatsApp.

## Qué hace una persona, una sola vez (los clics)

1. **Permisos del token de Cloudflare.** En <https://dash.cloudflare.com/profile/api-tokens> abrir el token que ya está guardado como `CLOUDFLARE_API_TOKEN` en GitHub (el del reloj) → *Edit* y comprobar que tenga **Account → Workers Scripts: Edit** (ya lo tiene, sube el reloj) y agregar **Account → Workers KV Storage: Edit** (para crear la memoria). *Continue to summary → Save*. El valor del token no cambia.
2. **Los mails.** En <https://dash.cloudflare.com/?to=/:account/radarbalcarce.com/email/routing/routes> (Cloudflare → radarbalcarce.com → Email → Email Routing) comprobar que **Email Routing está activado** (lo está: ya reenvía contacto@, redaccion@ y publicidad@) y que en la pestaña *Destination addresses* `radarbalcarce@gmail.com` figura como **Verified**. No hay que crear ninguna regla nueva.
3. **El secreto de las pruebas.** En <https://github.com/radarbalcarce/radar-balcarce/settings/secrets/actions> → *New repository secret*: nombre `VIGILANTE_TOKEN`, valor un texto largo al azar (por ejemplo, 40 letras y números que se inventen). Anotarlo en el administrador de contraseñas: se usa en el paso 5. (Opcional: `VIGILANTE_GITHUB_TOKEN`, un token de grano fino de GitHub **sin ningún permiso** —sólo lectura pública—, por si GitHub limita las lecturas sin llave; sólo hace falta si llega el aviso `github-sin-lectura`.)
4. **Subirlo.** En <https://github.com/radarbalcarce/radar-balcarce/actions/workflows/vigilante-cloudflare.yml> → *Run workflow*. Crea el KV si falta, sube el Worker y carga los secretos. Tiene que quedar en verde.
5. **Probar que el mail llega.** Desde una terminal (el token es el del paso 3; la dirección del Worker, la de Cloudflare → Workers → radar-balcarce-vigilante → Settings → Domains & Routes):

   ```
   curl -H "x-token: EL_TOKEN" https://radar-balcarce-vigilante.TU-SUBDOMINIO.workers.dev/probar-mail
   ```

   Tiene que contestar `{"ok": true, ...}` y llegar un mail a `radarbalcarce@gmail.com`. Si cae en *Spam*, abrirlo y tocar **«No es spam»** (así los avisos reales no se pierden).
6. **Ver que corre.** Esperar al :12 o :42 y mirar <https://dash.cloudflare.com/?to=/:account/workers/services/view/radar-balcarce-vigilante/production> → *Logs/Observability*, o abrir `/estado`. No debería llegar ningún mail si todo anda bien (salvo el resumen de las 21).

Después de esto, **CallMeBot ya no hace falta para los avisos de que la web falla**.

## Si algo no anda

- **El workflow falla en «Buscar (o crear) la memoria»**: al token de Cloudflare le falta *Workers KV Storage: Edit* (paso 1).
- **`/probar-mail` devuelve un error de envío**: casi siempre es que `radarbalcarce@gmail.com` no figura como *Verified* en Email Routing, o que Email Routing no está activado en el dominio (paso 2).
- **No llegan mails pero `/estado` muestra problemas**: mirar Cloudflare → Workers → radar-balcarce-vigilante → ejecuciones fallidas; el error dice por qué no salió el mail.
- **Quién vigila al vigilante**: la ejecución fallida figura en el panel de Cloudflare y el informe de las 21:15 tiene que llegar todos los días (o, si no, el resumen de las 22 que dice «no llegó»); si un día no llega ninguno, mirar el Worker.
- Para cambiar cuándo corre o los umbrales: `wrangler.toml` (`crons`) y `LIMITES` en `worker.mjs`, y volver a correr el workflow «Vigilante de Cloudflare».

Sin dependencias; probado en `pruebas/vigilante-cloudflare.test.mjs`, sin red. Lo que no se puede probar sin Cloudflare: el envío real del mail (`enviarPorCloudflare`) y el KV real; por eso existe `/probar-mail`.
