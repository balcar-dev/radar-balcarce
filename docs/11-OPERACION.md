# 11 · Operación: el manual de uso diario

*Escrito el 28/09/2026 (puesto al día el 29/09) para Hernán y Andrés, verificado contra el código y los
workflows de ese día. Es un manual de tareas: cada sección dice qué hacer, paso
a paso, y qué va a pasar después. Por qué funciona así está en los otros
documentos: las redes en [`07-REDES.md`](07-REDES.md), dónde corre cada cosa
en [`08-INFRAESTRUCTURA.md`](08-INFRAESTRUCTURA.md), el panel en `09-PANEL`,
las reglas y las pruebas en `10-REGLAS-Y-PRUEBAS`. Lo que hay que pegar a mano
en los perfiles está en [`PARA-CARGAR-A-MANO.md`](../PARA-CARGAR-A-MANO.md);
lo que falta, en [`PENDIENTES.md`](../PENDIENTES.md).*

## Los enlaces

| Qué | Dónde | Quién entra |
|---|---|---|
| **La web** | https://radarbalcarce.com | Cualquiera |
| Instagram | https://www.instagram.com/radarbalcarce | Cualquiera |
| Facebook | La página "Radar Balcarce" (se busca por el nombre; su ID para la API está en `docs/07-REDES.md`) | Cualquiera |
| **El panel del celular** (el de todos los días) | https://radarbalcarce.com/panel/ (instalado como app desde Chrome) | Quien tenga una llave de GitHub cargada en su celular |
| El modo de prueba del panel del celular | https://radarbalcarce.com/panel/?demo | Cualquiera (notas inventadas, no guarda nada) |
| **El panel**, desde la PC | http://localhost:4321 | Hernán y Andrés, con su usuario y contraseña |
| El panel, desde afuera | La dirección del túnel de Tailscale, en `panel/datos/DIRECCION-DEL-PANEL.txt`, en la PC (no va al repositorio, que es público) | Igual |
| El código y las corridas | https://github.com/balcar-dev/radar-balcarce (pestaña **Actions**) | Público desde el 25/09; cuenta `balcardev@gmail.com` |
| Cloudflare (la web, el dominio, las estadísticas) | https://dash.cloudflare.com | `radarbalcarce@gmail.com` |
| Trabajos automáticos (cron-job.org) | https://console.cron-job.org/jobs | `radarbalcarce@gmail.com` |
| Google Search Console | https://search.google.com/search-console | `radarbalcarce@gmail.com` |
| Google AI Studio (las claves y el gasto de Gemini) | https://aistudio.google.com | `radarbalcarce@gmail.com` |
| La guía comercial (vista previa) | https://claude.ai/artifact/EPFpaXCo83ryUimSvRnMvU | Privado |

**Las cuentas:** `radarbalcarce@gmail.com` es el medio (Cloudflare, Vercel
apagado, Tailscale, Instagram, Facebook, Meta, Gemini, cron-job.org, Search
Console); `balcardev@gmail.com` es lo técnico (GitHub).

## En una frase

La web, las redes y la vigilancia andan solas con la PC apagada; a una persona
le queda decidir las notas que esperan, corregir o sacar lo que salió mal,
mirar el WhatsApp de las 21 y, cuando algo deja de salir, revisar en orden
cron-job.org, GitHub Actions y el interruptor de las redes.

## Antes de empezar: dónde se hace cada cosa

| Dónde | Qué se hace ahí | Se puede desde el celular |
|---|---|---|
| **El panel del celular** (radarbalcarce.com/panel/) | Decidir lo que espera, corregir, cambiar de sección, reescribir con IA, retirar y volver a publicar, mandar una nota a las redes, ver lo que sale hoy en las redes, actualizar la web | Sí: es para eso. Con la PC apagada |
| **GitHub** (github.com/balcar-dev/radar-balcarce, cuenta `balcardev@gmail.com`) | Ver si algo falló (pestaña **Actions**), correr un workflow a mano (**Run workflow**), corregir o retirar una nota editando un archivo, prender o apagar las redes (**Settings**) | Sí, desde el navegador |
| **El panel de la PC** (http://localhost:4321 en la PC; afuera, la dirección de `panel/datos/DIRECCION-DEL-PANEL.txt`) | Cargar avisos, la agenda a mano, el buzón (lo que el celular no hace) | Sí, si la PC está prendida |
| **cron-job.org** (console.cron-job.org/jobs, cuenta `radarbalcarce@gmail.com`) | Ver y reactivar los trabajos que despiertan a GitHub | Sí |
| **Claude** (una sesión de Claude Code sobre la carpeta del proyecto) | Cualquier cambio de código, escribir cuerpos, repasos editoriales, mirar la web publicada | Según dónde esté abierta la sesión |
| **Meta, Cloudflare, Google AI Studio, DonWeb** | Cuentas: claves, borrar publicaciones, pagos, dominio | Sí, pero lo hace siempre una persona |

**Tres cuidados que valen para todo lo que sigue:**

1. **Los archivos `.json` son delicados.** Una coma de más o de menos y el
   archivo queda roto. Las pruebas de "Actualizar la web" lo detectan y, si
   está roto, **la web deja de actualizarse** hasta arreglarlo (no se publica
   nada mal, pero se congela). Por eso: copiar una entrada que ya existe y
   cambiarle los valores, y si hay dudas, pedírselo a Claude.
2. **Cada cambio a mano dice por qué, cuándo y quién** (`motivo`, `cuando`,
   `por`). Sin motivo, el código lo ignora; sin los tres, las pruebas fallan.
3. **Nada se ve al instante.** Lo que se cambia en `web/data/` aparece en la
   web en la próxima corrida de "Actualizar la web" (a los :00 o :30) más uno
   o dos minutos de Cloudflare. Para no esperar: Actions → **Actualizar la
   web** → Run workflow.

## La rutina

| Cuándo | Qué | Tiempo |
|---|---|---|
| **Todos los días, a las 21** | Leer el WhatsApp del resumen. "✅ todo bien" = nada que hacer. Si no llegó, ver "El WhatsApp no llega" | 1 minuto |
| **Cuando llega un WhatsApp de notas esperando** (cada 3 horas como mucho) | Decidirlas en el panel del celular, pestaña **Esperan** (ver "0. El panel del celular") | Unos minutos |
| **Cuando llega un WhatsApp de problema** | Seguir lo que dice; si no se entiende, "Si algo dejó de salir" | — |
| **Los lunes** | Mirar que la **Auditoría** haya corrido (Actions → Auditoría). Corrió por primera vez el 28/09; si un lunes no corre, correrla a mano (Run workflow) | 1 minuto |
| **Principios de cada mes** | Mirar el gasto de la clave paga de Gemini en Google AI Studio (presupuesto: USD 10 por mes desde octubre) | 2 minutos |
| **Cada 90 días** (la primera, hacia el 24/12/2026) | Volver a verificar las medidas de las redes (`FORMATOS.md`). La auditoría avisa | — |
| **Antes del 21/09/2027** | Renovar el dominio en DonWeb y el token de GitHub de cron-job.org (el vigilante avisa 30 días antes) | — |

## 0. El panel del celular

Es lo de todos los días. Cómo funciona por dentro: `09-PANEL`. Para entrar hace
falta una **llave de GitHub** que se crea una sola vez: el mismo panel lo
explica paso a paso la primera vez (el detalle, en `09-PANEL`, "La llave de
GitHub"). Se instala desde Chrome: menú ⋮ → **Instalar app**. **Si se pierde
un celular**: en GitHub (cuenta `balcardev@gmail.com`) → Settings → Developer
settings → Fine-grained tokens → esa llave → **Delete**.

**Todo lo que se hace ahí sale en la web en la próxima actualización** (a los
:00 y :30, más unos minutos). Para no esperar: "Más" → **Actualizar la web
ahora** (unos 8 minutos).

| Pestaña | Para qué | Lo que conviene saber |
|---|---|---|
| **Esperan** | Las notas que el sistema no publica solo | Cada una dice **por qué espera y qué mirar** y qué contó cada medio (con el enlace a la nota original). La IA no las escribe sola: para publicar una, **"Escribirla con IA"** (tarda un minuto y te muestra el texto para corregir) o "Escribirla a mano". "Descartar" pregunta antes; lo descartado queda al final ("Descartadas") y se puede volver a traer |
| **Sin cuerpo** | Notas que **salen solas** pero todavía no tienen cuerpo | La IA las vuelve a intentar sola hasta 3 veces; cada una dice cuántas van. Si una importa y no puede esperar, "Escribir con IA ahora" o "Escribir a mano" |
| **Publicadas** | Lo que está en la web | El número de la pestaña son las de **la portada** (las últimas 36 horas); arriba dice también cuántas tienen página **en el archivo** (hasta 180 días; se buscan con "Buscar también en el archivo"). Desde cada nota: Editar, Reescribir con IA, Mandar también a las redes, Retirar de la web |
| **Redes** | Lo que sale hoy en Facebook e Instagram | El cronograma (hora, voz, si salió), **qué noticias cuenta cada repaso** (lo que contaría si saliera ahora: puede cambiar hasta su hora) y la cola de Facebook |
| **Más** | Actualizar la web, y cómo funciona todo | — |

**"Mandar también a las redes"** (en una nota publicada): la pone en la cola de
Facebook, con su foto en Instagram. Sale en la próxima vuelta de las redes que
corresponda (de 8 a 22, con 90 minutos entre posteos, hasta 5 por día), antes
que las que van solas. **Antes pregunta.** Mientras no salga, el mismo botón la
saca de la cola; una vez publicada, sólo se borra a mano en Facebook e
Instagram. Sirve también para Política y Policiales, que solas no van nunca.

**Si retirás una nota por error:** mientras no pasó la próxima actualización,
en la misma nota aparece **Deshacer**. Después, la nota está al final de
**Publicadas → Retiradas** durante 30 días: "Volver a publicar" la trae de
nuevo, **con la misma dirección**, en la próxima actualización. Lo que ya había
salido en Facebook o Instagram no se toca solo, ni al retirar ni al volver.

## 1. Corregir una nota ya publicada

Lo más fácil: panel del celular → **Publicadas** → la nota → **Editar**. Lo que
sigue es cómo hacerlo sin el panel, desde GitHub.

Sirve para cambiar el **título**, la **bajada** (se llama `copete`), la
**sección** o el **cuerpo** de una nota que ya está en la web, sin el panel.
Manda sobre lo que escriba la IA en todas las corridas siguientes, aunque el
panel esté prendido, y **la dirección de la nota no cambia** (los enlaces que
ya circulan siguen andando).

1. **Encontrar el identificador de la nota.** Es lo que va después del último
   guion en la dirección. En
   `radarbalcarce.com/nota/carlos-bianco-aclara-la-polemica-9f1kip` es `9f1kip`.
2. **Abrir el archivo** `web/data/correcciones.json` en GitHub y tocar el lápiz
   (Edit).
3. **Agregar una entrada** dentro de `"notas"`, con sólo los campos que se
   corrigen, más los tres obligatorios:

   ```json
   "9f1kip": {
     "titulo": "El título corregido",
     "copete": "La bajada corregida, de dos o tres frases.",
     "seccion": "Balcarce",
     "motivo": "el título decía otra cosa que la fuente",
     "cuando": "2026-09-28",
     "por": "Hernán"
   },
   ```

   - La sección tiene que ser una de las once: Balcarce, Política, Policiales,
     Fútbol, Deportes, Automovilismo, Agro, Economía, Cultura y agenda,
     Tecnología, Argentina.
   - Cada entrada va separada de la siguiente por una coma; la última, sin coma.
   - Si la nota ya tiene una entrada, se edita esa (no se agrega otra con el
     mismo identificador).
4. **Guardar** (Commit changes, directo en `main`).
5. Esperar la próxima corrida de "Actualizar la web" o correrla a mano.

**Qué no hace:** no cambia lo que ya salió en Facebook o Instagram (el posteo
queda con el texto viejo; si hace falta, lo edita o lo borra una persona en la
red). Cómo se escribe un buen título o bajada: `CRITERIO-EDITORIAL.md` § 4.
El código: `correccionesAMano` y `conCorreccion` en `web/lib/archivo.js`,
aplicados por `web/scripts/generar-datos.mjs` (ver `06-WEB`).

## 2. Sacar (retirar) una nota de la web

Lo más fácil: panel del celular → **Publicadas** → la nota → **Retirar de la
web** (pide el motivo; se puede volver a publicar durante 30 días). Lo que
sigue es cómo hacerlo desde GitHub.

Para una nota que no tendría que haber salido: la saca de la portada, de las
secciones y del archivo, y **la página deja de existir**, aunque la ingesta la
vuelva a traer. Vale aunque el panel esté prendido. También queda en la
papelera del celular 30 días.

1. Identificador de la nota (como en 1.1).
2. Editar `web/data/retiradas.json` en GitHub y agregar, dentro de `"notas"`:

   ```json
   "9f1kip": {
     "motivo": "es de otro país y no nombra a ningún argentino",
     "titulo": "El título tal como salió",
     "medio": "El medio de origen",
     "cuando": "2026-09-28",
     "por": "Andrés"
   },
   ```

3. Guardar y esperar (o correr) "Actualizar la web".

**Después, a mano, si hace falta:**

- Si la nota **salió en Facebook o Instagram**, el posteo sigue ahí y su
  enlace ahora lleva a una página que no existe: **borrarlo en la red** (lo
  hace una persona).
- Si entró en un **podcast**, el video ya publicado no cambia; la nota del
  repaso en la web se rearma sola sin ella (y si le quedan menos de dos, se
  retira).
- **Con el panel** también se puede bloquear una nota (`09-PANEL`); la
  diferencia es que `retiradas.json` no depende de la PC ni del panel.

**No editar `web/data/decisiones.json` a mano:** si el panel está prendido, lo
reescribe entero cada vez que guarda su estado (al arrancar, con cada botón y
después de cada ciclo de 10 minutos en que la IA escribió algo), con lo que
tiene en memoria, y el cambio se pierde.

## 3. Escribir el cuerpo de una nota que espera

Una nota automática **sin cuerpo de al menos 70 palabras no se publica** (ni en
la web ni en las redes). La IA lo intenta hasta tres veces; si Gemini se quedó
sin cupo o la nota no tenía material, queda esperando. La lista está en
`web/data/esperando-cuerpo.json` (la rehace cada corrida de "Actualizar la
web", sólo con las notas que todavía podrían estar en la portada), y el resumen
de las 21 dice cuántas son ("Esperando cuerpo: N").

1. Abrir `web/data/esperando-cuerpo.json`. Cada nota trae su `id`, título,
   bajada, sección, fecha y las **fuentes con sus enlaces**.
2. Leer las fuentes y escribir el cuerpo: dos o tres párrafos, sólo con lo que
   dicen las fuentes, sin inventar nombres ni números, con el criterio de
   `CRITERIO-EDITORIAL.md` § 4 ("El cuerpo") y § 12.
3. Ponerlo en `web/data/correcciones.json` (como en 1), con el campo `cuerpo`
   (los párrafos se separan con `\n\n` dentro del texto) y, si hace falta,
   también `titulo` y `copete`:

   ```json
   "1by9dws": {
     "cuerpo": "Primer párrafo.\n\nSegundo párrafo.",
     "motivo": "cuerpo escrito a mano: Gemini sin cupo",
     "cuando": "2026-09-28",
     "por": "Hernán"
   },
   ```

4. En la próxima corrida la nota sale, y **a esa nota ya no se le pide nada a
   Gemini**.

**Lo más simple es pedírselo a Claude** ("escribí los cuerpos de las notas que
esperan"): el 27/09 escribió así 37, firmados "redacción de Claude, pedida por
Hernán". Lo que publica una persona desde el panel sin cuerpo se respeta (el
panel pide confirmarlo).

## 4. Decidir las notas que esperan a una persona

Las amarillas del semáforo (acusan a alguien, hablan de una muerte, nombran a
un chico) y todo lo de Política y Policiales que vaya a las redes esperan a
una persona. Se deciden en el **panel**, con la PC prendida: `09-PANEL`. El
WhatsApp avisa cuando hay nuevas, cada 3 horas como mucho. Con la PC apagada no
se pueden decidir; nada se rompe, sólo esperan.

## 5. Prender o apagar las redes

1. GitHub → el repositorio → **Settings** → **Secrets and variables** →
   **Actions** → pestaña **Variables**.
2. `REDES_ACTIVAS` → editar → **`Si`** para publicar; cualquier otra cosa
   (por ejemplo `No`) para apagar.

Qué pasa:

- **Apagadas:** en la corrida siguiente, Facebook sólo simula (el registro dice
  qué publicaría), no se arma ningún video (no se gasta la voz paga), el libro
  no cambia, el vigilante lo dice una vez por día y el resumen de las 21 dice
  "Redes: apagadas".
- **Al prenderlas:** en la corrida siguiente vuelve todo. Las piezas cuya
  ventana todavía está abierta salen; las que ya se cerraron, no (ver las
  ventanas en `07-REDES`).
- `Si` vale con cualquier mayúscula, con o sin tilde (`si`, `SÍ`, `sí`…):
  Facebook y el reloj de las piezas lo leen con la misma regla desde el 28/09.

## 6. Publicar una pieza a mano

Para una historia fija que no salió (clima, farmacia) o para probar:

1. Actions → **Piezas** → Run workflow.
2. **solo:** el nombre de la pieza. Los nombres: `clima-manana`,
   `clima-noche`, `farmacia`, `utiles`, `noticia1` (podcast de la mañana),
   `noticia2` (tarde), `podcast` (noche), y los avisos `aviso-helada`,
   `aviso-granizo`, `aviso-viento`. Si queda vacío, la corrida no arma nada y
   termina con "Sin piezas elegidas" (28/09: antes armaba todas las del día y
   gastaba una voz paga por cada una). Para armarlas todas a propósito, dejar
   `solo` vacío y marcar **todas**.
3. **publicar:** tildado para que la suba (sin tildar, sólo la arma y deja el
   video para descargar 7 días).
4. **destino:** `ambas`, `instagram` o `facebook`.

Limitaciones que conviene saber:

- Sólo se arma lo que ese día corresponde: la farmacia necesita el turno de
  hoy, los teléfonos útiles sólo salen su día, un podcast necesita dos notas
  o más, el aviso sólo si hay un aviso grave.
- **Un podcast que ya salió en Instagram no se vuelve a armar**: Piezas no
  sirve para completar el reel de Facebook ni la historia de un podcast que
  faltó. En ese caso: abrir la corrida de **Redes** que lo armó (Actions →
  Redes → la corrida → Artifacts, quedan 3 días), bajar el video y subirlo a
  mano desde la app.
- Con las redes apagadas, Piezas tampoco publica: sólo arma.
- "Redes" y "Piezas" nunca corren a la vez: si una está corriendo, la otra
  espera.

## 7. Reiniciar el panel

**Cuándo:** después de cualquier cambio en `ingesta/`, `panel/` o `reels/`
(Node lee el código una sola vez, al arrancar: si no se reinicia, sigue
trabajando con la versión vieja), después de prender la PC, o si el panel no
responde. Ojo: el panel trae solo los cambios de GitHub al sincronizar, así
que el código del disco puede estar al día y el panel igual correr la versión
vieja hasta reiniciarlo.

1. Cerrar la ventana negra que se llama **"Radar Balcarce - PANEL"**.
2. Doble clic en **`ARRANCAR.bat`** (en la carpeta del proyecto).
3. Se abre otra ventana negra (no cerrarla: es el panel) y, a los 5 segundos,
   el navegador en http://localhost:4321.

Si Claude está trabajando en la PC, puede reiniciarlo él. Para cambiar una
contraseña del panel, la persona corre en la PC `node panel/clave.mjs
<usuario> "<contraseña nueva>"` (nunca se escribe en un chat). Para cerrar el
panel a internet: `tailscale funnel --https=443 off`.

## 8. Si algo dejó de salir: el orden para mirar

1. **¿Llegó un WhatsApp del vigilante?** Dice qué falló. Si no llegó ni el
   resumen de las 21, el problema puede ser el vigilante mismo: seguir.
2. **cron-job.org:** ¿están prendidos todos los trabajos? (tarea 10).
3. **GitHub → Actions:** ¿hay una corrida en rojo? Abrirla y leer el paso rojo.
   Un aviso amarillo de "Vigilancia" no es una falla: es lo que encontró.
4. **`REDES_ACTIVAS`** dice `Si` (tarea 5). Desde el 28/09 está en `No` a
   propósito, hasta el visto bueno de Hernán al diseño nuevo (`CLAUDE.md`,
   "Estado").
5. **¿La PC está prendida?** Sólo importa para el panel.
6. **Si se publica pero nadie lo ve en Facebook:** Actions → **Ver Facebook**
   (muestra lo que Meta tiene publicado) y mirar la página desde una cuenta que
   no sea administradora.
7. Si nada de eso: la tabla "Qué puede fallar" de `08-INFRAESTRUCTURA.md` y de
   `07-REDES.md`.

## 9. La web no se actualiza

Se nota porque la portada no cambia o llega el aviso "La web no se actualiza
hace N horas".

1. Actions → **Actualizar la web**: ¿la última corrida cuándo fue?
   - **No hay corridas recientes** → cron-job.org (tarea 10). Mientras tanto,
     Run workflow a mano.
   - **Está en rojo** → abrirla. Si el paso rojo es **"Probar que nada se
     rompió"**, una prueba falló: la causa más común es un `.json` editado a
     mano con un error (ver "Antes de empezar"). Si es "Compilar el sitio" o
     "Revisar que el SEO siga en pie", es código: pedírselo a Claude. Si es
     "Guardar si cambió algo" con "después de tres intentos", suele arreglarse
     solo en la corrida siguiente.
   - **Está en verde** y dice "Sin novedades" → no había nada nuevo: está bien.
2. Actions → **Cloudflare Pages**: ¿corrió después, y en verde? Si está en
   rojo, leer el paso "Subir a Cloudflare Pages" (suele ser el token de
   Cloudflare: lo arregla una persona). Se puede correr a mano.
3. Si las dos están en verde y la web sigue vieja: mirar Cloudflare
   (dash.cloudflare.com → Pages) y probar recargar sin caché.

## 10. cron-job.org se apagó

cron-job.org **desactiva solo** un trabajo que falla varias veces seguidas.
Se nota con avisos "No hay corridas nuevas de…" o "El reloj de Redes no corre",
o porque la web se actualiza tarde (queda el respaldo de GitHub, que es
impuntual).

1. Entrar a https://console.cron-job.org/jobs con `radarbalcarce@gmail.com`.
2. Mirar que estén **prendidos** los trabajos: "Actualizar la web", el reloj
   de "Redes" y "Vigilancia" (según GitHub, a Redes lo llaman tres veces por
   hora: puede haber un cuarto trabajo; ver `08-INFRAESTRUCTURA`,
   "cron-job.org").
3. Prender el que esté apagado. En su historial se ve por qué fallaba: un
   error 401 o 403 quiere decir que el **token de GitHub** venció o está mal
   (lo reemplaza una persona, en el encabezado `Authorization` de **todos** los
   trabajos).
4. En media hora tiene que aparecer una corrida nueva en Actions.

## 11. Gemini se quedó sin cupo

**Cómo se nota:** el aviso "Sólo N de M notas… tienen cuerpo", el resumen de
las 21 con muchas "Esperando cuerpo", o en el registro de "Actualizar la web"
la línea "tope del día" o "claves de Gemini usadas: N con la gratis, M con la
paga".

**Qué pasa solo:**

- La redacción usa la clave gratis (tope propio de 450 notas por día). Si la
  gratis dice "sin cupo", reintenta una vez con la paga. Lo que no se pudo
  escribir queda esperando cuerpo y se reintenta en las corridas siguientes
  (hasta tres intentos por nota). El cupo gratis se renueva al día siguiente.
- La lectura con IA, si Gemini falla, prueba con Groq.
- Las voces: si Gemini no contesta, la pieza no sale en esa vuelta y se reintenta en la siguiente (nunca con otra voz).
  Si el error es **402 ("prepayment credits are depleted")**, se acabó el crédito de la clave paga: cargarlo en
  Google AI Studio (proyecto RadarBalcarce); reintentar no lo arregla. **Desde el 29/09 pasó eso y, después,
  Google suspendió la clave**: mientras siga así, no sale ninguna pieza con voz (las redes están apagadas
  de todos modos) y hay que resolverlo con Google antes de prender las redes.

**Qué hacer:**

1. Nada urgente: no se publica nada mal, sólo sale menos.
2. Si hay notas importantes esperando: escribir sus cuerpos a mano o con
   Claude (tarea 3).
3. Para saber si la clave gratis anda: Actions → **Prueba de Gemini**.
4. **No subir los topes ni cambiar de clave sin hablarlo entre los dos**: la
   única que cobra es la de redes.

## 12. El WhatsApp no llega

1. Actions → **Prueba de WhatsApp** → Run workflow. Manda un mensaje de prueba
   y muestra lo que contestó CallMeBot.
2. Si dice "APIKey is invalid": la clave de CallMeBot está mal copiada en
   `WHATSAPP_APIKEY`. Si el teléfono tiene pocos dígitos: `WHATSAPP_TELEFONO`
   va completo, con 549 adelante, sin + ni espacios. Los corrige una persona en
   GitHub Secrets.
3. Si la prueba anda y el resumen no llega: mirar que "Vigilancia" esté
   corriendo (Actions) y que su trabajo de cron-job.org esté prendido. El
   registro de cada corrida de Vigilancia dice qué encontró y si mandó el
   mensaje.

## 13. Cargar un aviso publicitario

Son tres espacios en la web: después de la nota de apertura (`apertura`), al
lado del clima y la farmacia (`clima`) y abajo de todo (`pie`). Reglas y
precios: `PUBLICIDAD.md`.

1. En el **panel** (PC prendida), pestaña **Avisos**.
2. Elegir el espacio y completar comercio, texto y, si hay, logo.
3. Guardar. El panel lo sube solo a GitHub a los pocos segundos y aparece en
   la web con la próxima "Actualizar la web".
4. Para sacarlo: dejar vacío el nombre del comercio.

Sin la PC, se puede editar `web/data/avisos.json` en GitHub (cada espacio es
`null` o `{"nombre": "…", "texto": "…", "logo": "…"}`), con el mismo cuidado
de los `.json`. El panel no lo pisa: lo lee del archivo cada vez.

## 14. Cómo pedirle algo a Claude

Claude trabaja sobre la carpeta del proyecto y lee solo `CLAUDE.md` al
empezar: sabe las reglas, las cuentas y dónde está cada cosa.

**Cómo pedir:**

- **Con el ejemplo concreto:** el enlace de la nota, la captura, el texto del
  WhatsApp. "La nota de la peregrinación dice Fútbol y es de Balcarce" se
  arregla en minutos; "las secciones andan mal" no.
- **Varias cosas, numeradas**, para que no se pierda ninguna.
- **Decir si es una regla o un caso:** "esta nota está mal" (se corrige o se
  retira) no es lo mismo que "esto no tiene que salir nunca más" (se cambia el
  criterio o el código, con una prueba).
- **Pedir que lo mire publicado:** "revisalo en la web cuando esté". Después
  de un cambio, Claude tiene que correr "Actualizar la web", esperar el
  despliegue y mirar radarbalcarce.com antes de decir que está listo.

**Lo que Claude hace:** cambia código y documentos; corre `npm test` antes de
commitear; commitea sólo los archivos que tocó (`git commit -- archivos`: el
panel sube solo lo que encuentre preparado, y así no se mezclan); corre
workflows a mano; escribe cuerpos, correcciones y retiradas (firmados en `por`);
reinicia el panel si tocó `ingesta/`, `panel/` o `reels/`. Un cambio de
criterio editorial lo hace en `CRITERIO-EDITORIAL.md` (y sus números en
`ingesta/criterio.mjs`); **la lista roja del semáforo no la toca sin
preguntar**.

**Lo que Claude no hace:** ver, pegar ni pedir claves o tokens (si hace falta
uno, dice cuál y dónde va, y lo pega una persona); entrar a las cuentas;
borrar publicaciones; aceptar términos; pagar.

## 15. Lo que sólo puede hacer una persona

| Qué | Dónde | Cuándo |
|---|---|---|
| Cargar o cambiar una clave o un token (`META_TOKEN`, las de Gemini, `GROQ_API_KEY`, Cloudflare, WhatsApp) | GitHub → Settings → Secrets and variables → Actions; en la PC, el `.env` | Cuando se crea, vence o se filtra |
| Regenerar `META_TOKEN` con los permisos de estadísticas (`read_insights`, `instagram_manage_insights`, además de todos los de ahora) | Meta Business → usuario del sistema `publicador-radar` | Hecho (1/10/2026) |
| Renovar el token de GitHub de cron-job.org y pegarlo en todos los trabajos | GitHub (`balcardev@gmail.com`) y cron-job.org | Antes del 21/09/2027 |
| Renovar el dominio | DonWeb | Antes del 21/09/2027 |
| Borrar o editar un posteo, una historia o un reel (un duplicado, una nota retirada) | Las apps de Facebook e Instagram | Cuando haga falta |
| Subir a mano un video que faltó (desde el artefacto de una corrida) | Las apps | Cuando haga falta |
| Foto de perfil, portada, biografías, categorías | Las apps, con los textos de `PARA-CARGAR-A-MANO.md` | Una vez |
| Comprobar con una cuenta que no sea administradora que el público ve los posteos y los reels | Facebook | Pendiente |
| Poner un límite de gasto a la clave paga de Gemini | Google AI Studio (proyecto RadarBalcarce → Gasto) | Hecho el 28/09 (al empezar cada mes, volver a mirarlo) |
| Resolver la clave paga de Gemini, suspendida por Google el 29/09 (sin ella no hay voces) | Google AI Studio (proyecto RadarBalcarce) y, si se crea otra clave, GitHub → Secrets (`GEMINI_API_KEY_REDES`) | Alta: antes de prender las redes |
| Borrar el proyecto de Vercel y limpiar el DNS que quedó | Vercel y Cloudflare | Pendiente |
| Activar o reactivar CallMeBot (si cambia el número del teléfono) | WhatsApp | Cuando haga falta |
| Cambiar contraseñas del panel | En la PC: `node panel/clave.mjs` | Cuando haga falta |
| Decidir las notas amarillas | El panel | Todos los días |
| Aceptar términos, pagar, crear cuentas | Cada servicio | — |

La lista completa y al día de lo pendiente: `PENDIENTES.md`.

## Qué archivo hace qué (los que se tocan a mano)

| Archivo | Qué es | Quién lo escribe | Quién lo lee | ¿Se edita a mano? |
|---|---|---|---|---|
| `web/data/correcciones.json` | Títulos, bajadas, secciones y cuerpos corregidos | Una persona o Claude | `generar-datos.mjs` (`correccionesAMano`) | **Sí** (tareas 1 y 3) |
| `web/data/retiradas.json` | Notas sacadas de la web | Una persona o Claude | `generar-datos.mjs` (`idsRetiradosAMano`) | **Sí** (tarea 2) |
| `web/data/esperando-cuerpo.json` | Las notas automáticas que no salen por falta de cuerpo | "Actualizar la web" | Personas y Claude | No: se lee |
| `web/data/avisos.json` | Los tres avisos | El panel | La web | Mejor desde el panel (tarea 13) |
| `web/data/decisiones.json` | Lo que decidió el panel | El panel | "Actualizar la web" | **No** (el panel lo pisa) |
| `web/data/redes.json` | El libro de las redes | "Redes" y "Piezas" | Casi todo | **No** (si se borra una entrada, puede repetirse una publicación) |
| `web/data/portada.json`, `archivo.json` y el resto de `web/data/` | Lo que arma "Actualizar la web" | Los workflows | La web, las redes, el vigilante | **No** |
| `ARRANCAR.bat` | Levanta el panel | Doble clic | — | No |
| `.env` (sólo en la PC) | Claves para trabajar en la PC | Una persona | `reels/claves.mjs` | Sólo una persona |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Corregir una nota | `web/data/correcciones.json` (tarea 1) |
| Sacar una nota | `web/data/retiradas.json` (tarea 2) o el panel |
| Que una nota que espera salga | Cuerpo en `correcciones.json` (tarea 3) |
| Decidir una amarilla | El panel |
| Prender o apagar las redes | Variable `REDES_ACTIVAS` (tarea 5) |
| Publicar una pieza ya | Actions → Piezas (tarea 6) |
| Forzar una actualización de la web | Actions → Actualizar la web → Run workflow |
| Volver a subir la web sin rearmar los datos | Actions → Cloudflare Pages → Run workflow |
| Comprobar el acceso a Meta | Actions → Redes → Run workflow → `verificar` |
| Ver cómo llegaría el resumen de las 21 | Actions → Vigilancia → Run workflow → `probar-resumen` (manda un WhatsApp, no guarda nada) |
| Ver el cierre del día contra Meta sin mandar nada | Actions → Vigilancia → `probar-cierre` |
| Auditar lo publicado en redes | Actions → Auditar redes |
| Ver las estadísticas ahora | Actions → Prueba de estadísticas |
| Cargar un aviso | Panel → Avisos (tarea 13) |
| Cambiar una regla, un número o el diseño | Pedírselo a Claude (tarea 14); la tabla completa, en `CLAUDE.md` |

## Qué puede fallar al operar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Un `.json` quedó mal escrito | "Actualizar la web" en rojo en "Probar que nada se rompió"; a los 100 minutos, "La web no se actualiza" | Abrir la corrida, ver qué prueba falló, arreglar el archivo (o pedírselo a Claude) |
| Una corrección sin `motivo` | No pasa nada: el código la ignora (y la prueba falla) | Agregar el motivo |
| Se editó `decisiones.json` con el panel prendido | El cambio desaparece a los 10 minutos | Usar `retiradas.json` o `correcciones.json`, o el panel |
| Se corrigió una nota que ya estaba en Facebook | La red sigue mostrando lo viejo | Editar o borrar el posteo a mano |
| Se retiró una nota que estaba en Facebook | El enlace del posteo da "no encontrada" | Borrar el posteo a mano |
| Se corrió Piezas con `solo` vacío | La corrida termina en rojo con "Sin piezas elegidas" y no arma nada (no gasta) | Escribir el nombre, o marcar `todas` si de verdad se quieren todas |
| Una corrección o retirada sin `cuando` o sin `por` | El código sólo exige `motivo`, pero las pruebas piden los tres: "Actualizar la web" falla y la web se congela | Completar los tres campos |
| Se cambió código de `ingesta/`, `panel/` o `reels/` y no se reinició el panel | El panel sigue haciendo lo de antes | Tarea 7 |

## Lo que sigue abierto

En `PENDIENTES.md`: la pestaña Calendario del panel no cambia las horas de lo
que publica GitHub (las reales son las de fábrica de `panel/horarios.mjs`), la
Auditoría de los lunes tiene que confirmar que corre sola (la primera vez fue
el 28/09) y hay que mirar cuántos trabajos tiene cron-job.org.
