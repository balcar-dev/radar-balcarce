# 09 · Los paneles: el del celular y el de la PC

*Actualizado el 29/09/2026. Si algo de acá no coincide con el código, manda el
código.* Qué es cada nota y por qué el semáforo la pone de un color:
`docs/03-SELECCION.md`; cómo escribe la IA: `docs/04-REDACCION.md`; cómo usa la
web lo que se decide: `docs/06-WEB.md`; las redes: `docs/07-REDES.md`; el paso a
paso de todos los días (crear la llave, instalar, decidir, corregir):
`docs/11-OPERACION.md`.

## En una frase

Hay dos paneles. **El del celular** (`radarbalcarce.com/panel/`) es el de
todos los días: una app sin servidor propio que habla directo con GitHub con la
llave de quien lo usa, para aprobar, editar, retirar (y volver a publicar),
pedirle a la IA que escriba una nota y ver lo que sale hoy en las redes, con la
PC apagada. **El de la PC** (`http://localhost:4321`,
`ARRANCAR.bat`) queda de respaldo para lo que el celular no hace: la agenda
cargada a mano, los avisos publicitarios, el buzón, las fuentes y el
calendario.

---

## El panel del celular

### Qué es y cómo se instala

- Son archivos de la web (`web/public/panel/`: `index.html`, `app.js`,
  `github.js`, `cifrado.js`, `textos.js`, `sw.js`, `manifest.webmanifest`) que
  Cloudflare publica con el sitio. Los textos que explican cada cosa (por qué
  espera una nota, qué hace cada botón, las preguntas antes de confirmar) están
  todos en `textos.js`. No hay servidor propio: todo lo que lee y escribe pasa
  por la API de GitHub.
- **Se instala desde Chrome**: menú ⋮ → **"Instalar app"** (o "Agregar a
  pantalla principal"). Chrome lo convierte en app: ícono propio, pantalla
  completa y se actualiza solo. No hace falta un .apk.
- No se indexa (`web/app/robots.js` y `X-Robots-Tag`) y sólo puede hablar con
  GitHub (una `Content-Security-Policy` propia en `web/public/_headers`):
  guarda la llave de quien lo usa, así que no carga nada de afuera.

### La llave de GitHub

Para entrar hace falta una **llave de GitHub**: un *fine-grained personal
access token* de la cuenta `balcardev@gmail.com`, que una persona crea una sola
vez y pega en el celular junto con su nombre (va en cada decisión, en `por`).
**Sólo quien tiene la llave puede tocar algo**: la página es pública, pero sin
llave no lee lo cifrado ni escribe nada.

Se crea en github.com → Settings → Developer settings → Fine-grained tokens →
Generate new token (el panel tiene el enlace directo):

| Campo | Qué poner |
|---|---|
| Token name | "Panel del celular" |
| Expiration | Un año (anotar la fecha) |
| Repository access | "Only select repositories" → **radar-balcarce** |
| Repository permissions | **Contents**: "Read and write" y **Actions**: "Read and write". Nada más |

- Queda guardada **sólo en ese celular** (en el navegador) y nunca va por chat
  ni por mail. GitHub la muestra una sola vez: si se pierde, se crea otra.
- Puede ser la misma llave en los dos celulares o una por persona (así, si se
  pierde un celular, se borra sólo esa).
- **Para revocarla** (celular perdido, llave expuesta): en GitHub, el mismo
  lugar donde se creó → la llave → **Delete**. En el celular, "Más" → "Salir y
  borrar la llave de este celular".
- Al entrar, el panel prueba que la llave pueda escribir en el repositorio; si
  no, dice qué permiso falta. Vencida o borrada, dice "La llave no anda" y pide
  otra.

### Cómo viajan los datos

1. **La primera vez**, el celular crea su par de llaves de cifrado (con la
   criptografía del navegador). La **privada** queda en el navegador y no sale
   nunca del celular; la **pública** se sube a `web/data/celular-llaves.json`.
   Hasta 6 celulares (`LLAVES_MAXIMAS`, `panel/cifrado.mjs`).
2. **Cada corrida de "Actualizar la web"** (sólo en la nube) arma:
   - **lo que espera a una persona**, con todo lo que hace falta para decidir
     (`paraDecidir`, `panel/celular-datos.mjs`): el resumen de la fuente
     principal, **lo que contó cada medio** (su resumen, si es oficial y el
     enlace a la nota original), el motivo, lo que anotó la IA al leerla (de
     dónde es el hecho, su importancia, por qué le importaría a un vecino:
     `web/data/fichas.json`). **La IA no escribe sola lo que espera** (29/09,
     Hernán: "si la nota no sale en automático, la idea es que no se escriba
     nada"; regla 68): lo escribe sólo si una persona lo pide;
   - **la papelera**: lo que retiró una persona, tal como estaba publicado (ver
     "Retirar y volver a publicar", más abajo);
   - las dos cosas **cifradas para cada celular registrado**, un sobre por nota
     (`cerrarCadaUno`, `panel/cifrado.mjs`: AES-256-GCM, con la llave de cada
     sobre cifrada con la pública de cada celular), en
     `web/data/celular-pendientes.json` (versión 2). Una nota que no cambió
     conserva su sobre, así git guarda sólo lo nuevo;
   - las notas enteras, con sus fuentes, en la caché de Actions
     (`.cache/celular-notas.json`), que no es pública, para "Escribir con IA";
   - **`web/data/celular-estado.json`**, sin cifrar (es de lo ya publicado):
     cuántas notas hay en la portada y en el archivo, y **la previa de las
     redes** (`previaDelDia`, `redes/previa.mjs`): el cronograma de hoy, qué
     cuenta cada repaso (con la misma función que usa el plan de los videos,
     `repasosDelDia` en `redes/repasos.mjs`), la cola de Facebook y si las redes
     están prendidas (`REDES_ACTIVAS`, que el workflow le pasa sólo para esto).
   **¿Por qué cifrado?** El repositorio es público y esas notas pueden nombrar
   a un acusado o a un chico (regla 79). Por lo mismo, la lista corta de
   `portada.json` va sin titular cuando la nota es de Policiales o habla de
   chicos o de víctimas: es lo que muestra "Esperan" hasta que llega la cifrada
   (un celular recién registrado la recibe en la próxima actualización).
3. **El celular lee** con la llave: `portada.json`, `esperando-cuerpo.json`
   (con cuántas veces lo intentó la IA), `celular-pendientes.json` (lo abre con
   su llave privada), `celular-decisiones.json`, `correcciones.json`,
   `celular-estado.json`, `redes.json` (el libro de las redes, para decir al
   momento lo que ya salió) y, si se pide, `archivo.json`.
4. **"Escribir con IA"** dispara el workflow **"Panel del celular"**
   (`.github/workflows/panel.yml`) con la nota, el pedido (opcional) y una marca
   para encontrar la corrida. `panel/celular.mjs` busca la nota en la caché (lo
   que trajo la última ingesta) o en lo publicado (portada, esperando cuerpo,
   archivo), y `panel/reescribir-una.mjs` la escribe por el mismo camino que la
   redacción automática: el texto completo de las fuentes, los antecedentes,
   `CRITERIO-EDITORIAL.md` § 12 con el pedido al final (nunca por encima de las
   reglas), los arreglos que no inventan y el mismo verificador. La diferencia:
   no descarta nada en silencio, devuelve el texto con la lista de lo que no
   cuadra con las fuentes. Lo rojo no se escribe nunca. El borrador queda
   **cifrado** en `web/data/celular-borradores.json` (hasta 30, por 7 días).
   Tarda un minuto: el celular espera y lo abre. El registro del workflow no
   muestra nada de la nota.
5. **Lo que decide la persona** se escribe en el repositorio por la API de
   GitHub, en un commit con su nombre ("Panel del celular: Hernán aprueba una
   nota"), una nota por renglón (el historial muestra una línea por decisión).
   Si otro cambió el archivo en el medio, lo vuelve a leer y reintenta.
6. **La próxima corrida de "Actualizar la web"** lo aplica: `generar-datos.mjs`
   pone las decisiones del celular encima de las del panel de la PC
   (`unirDecisiones`; si las dos decidieron sobre la misma nota, gana la más
   nueva). Para no esperar la media hora: "Actualizar la web ahora" (unos 8
   minutos hasta la web).

### Las pestañas

Cada pestaña tiene arriba un "¿Qué es esto?" que la explica, y "Más" explica
todo el panel.

| Pestaña | Qué muestra | Qué se puede hacer |
|---|---|---|
| **Esperan** | Lo que espera a una persona: lo amarillo de los últimos 3 días (hasta 40), nunca lo rojo, y sin el "relleno" que tampoco avisa el WhatsApp (lo de afuera poco contado, lo que pasó el cupo, la cotización del dólar). En la lista, el motivo en pocas palabras ("Acusa a alguien ("detenido")"). Al abrirla: **por qué espera y qué mirar** (`explicarMotivo`), lo que anotó la IA al leerla, el resumen de la fuente principal y **lo que contó cada medio**, con el enlace a la nota original. La IA no las escribe sola. Abajo, las aprobadas que salen en la próxima actualización y las **descartadas** | **Escribirla con IA** (con un pedido opcional; tarda un minuto y muestra el texto con lo que marcó el verificador, para corregirlo) → **Publicar**; **Escribirla a mano**; **Descartar** (pregunta antes). Una descartada se puede **Volver a traer** mientras siga en las noticias del día; una aprobada, **Deshacer** hasta la próxima actualización |
| **Sin cuerpo** | Las notas que **salen solas** pero todavía no tienen un cuerpo que pase el verificador (`esperando-cuerpo.json`), con cuántas veces lo intentó la IA (hasta 3, `MAXIMO_DE_INTENTOS`): mientras le queden intentos, la IA la vuelve a probar sola en cada actualización | **Escribir con IA ahora** o **Escribir a mano** → "Publicar con este cuerpo" |
| **Publicadas** | Cuántas hay **en la portada** (las de las últimas 36 horas) y cuántas **en el archivo** (con página, hasta 180 días); la lista de la portada y, con "Buscar también en el archivo", las del archivo; buscador por título o sección. Cada nota dice si salió en Facebook e Instagram o si está en la cola. Al final, **Retiradas**: lo que retiró una persona en los últimos 30 días | **Editar** (título, bajada, cuerpo y sección), **Reescribir con IA** (con pedido), **Mandar también a las redes** (o "Sacar de la cola de las redes"; pregunta antes), **Retirar de la web** (pregunta y pide el motivo) y **Deshacer**. En las retiradas: **Volver a publicar** o **Corregirla y volver a publicarla** |
| **Redes** | El cronograma de hoy (cada pieza con su hora, su voz y si salió, está en su horario o ya no sale), **qué cuenta cada repaso** (lo que contó, o lo que contaría si saliera ahora), los posteos de Facebook de hoy, cuándo puede salir el próximo y la cola. Si las redes están apagadas (`REDES_ACTIVAS`), lo dice arriba | Mirar. Para mandar una nota: Publicadas → "Mandar también a las redes" |
| **Más** | Quién entró y **cómo funciona todo**, pregunta por pregunta | **Actualizar la web ahora**, abrir la web, **Salir y borrar la llave de este celular** |

Al aprobar hacen falta título, bajada y cuerpo, con el texto de la IA o
editado. Con menos de 70 palabras de cuerpo pregunta antes de guardar (con
menos de 70 una nota automática no sale sola). El borrador muestra lo que el
verificador marcó contra las fuentes y lo que sacó. Se puede cambiar la
sección y, en lo que espera o no tiene cuerpo, marcar "Mandarla también a
Facebook e Instagram" (pregunta antes de guardar).

**Las preguntas antes de confirmar** (29/09, Hernán: "estaría bueno que re
pregunte antes de mandar"): mandar a las redes, sacar de la cola, retirar,
descartar, volver a publicar y publicar un cuerpo corto preguntan en una
ventana que explica qué va a pasar (`PREGUNTAS` y `preguntaRedes`,
`textos.js`); el foco queda en "Cancelar", para que un toque de más no
confirme. Deshacer no pregunta.

### Qué escribe

| Archivo | Qué guarda | Cuándo |
|---|---|---|
| `web/data/celular-decisiones.json` | `notas`: aprobar = `publicada` con el texto entero (`deIA` si lo escribió la IA, con sus partes internas), descartar = `descartada`, retirar = `bloqueada` con el motivo (y `antes: "publicada"` si estaba aprobada desde el celular, para que deshacer la deje aprobada); volver a publicar = `publicada` con el texto que tenía; cada una con `por` y `cuando`. `redes`: las marcadas para Facebook e Instagram | Aprobar, descartar, retirar, volver a publicar, deshacer, marcar para las redes |
| `web/data/correcciones.json` | Título, bajada, cuerpo o sección, con `motivo`, `cuando` y `por` (el mismo archivo de las correcciones a mano). Un texto de la IA revisado lleva `deIA: true` y firma "Redacción con IA, revisada por la redacción"; uno escrito a mano, "Revisada por la redacción" | Editar, escribir un cuerpo, cambiar la sección al aprobar |
| `web/data/retiradas.json` | Sólo **saca** una nota (nunca agrega) | Volver a publicar una nota que se retiró a mano ahí |
| `web/data/celular-llaves.json` | Las llaves públicas de los celulares | La primera vez que entra cada celular |

**Ningún workflow toca esos archivos**, así nunca se pisan.
`problemaDeDecision` (`panel/celular-datos.mjs`) exige que aprobar traiga el
texto entero (una decisión humana sin texto publicaría el de la fuente tal
cual, que es copiar a otro medio) y que retirar traiga el motivo; lo que no
vale se saltea, y una prueba avisa antes de publicar.

### Retirar y volver a publicar: la papelera

"Retirar de la web" no borra nada. Una nota retirada por una persona (desde el
celular, desde el panel de la PC o en `retiradas.json`) pierde su página en la
próxima actualización, y la corrida la guarda **tal como estaba publicada** en
la papelera (`papeleraAlDia`, `panel/celular-datos.mjs`; en la caché de
Actions, `.cache/papelera.json`, porque el repositorio es público y una nota se
puede retirar justamente por lo que dice). El celular la ve, cifrada, al final
de "Publicadas", **durante 30 días** (`DIAS_EN_LA_PAPELERA`).

- **Antes de la próxima actualización**, "Deshacer" la deja como estaba (si
  estaba aprobada desde el celular, sigue aprobada).
- **Después**, "Volver a publicar" la aprueba de nuevo con el texto que tenía
  (o corregido, con "Corregirla y volver a publicarla"). En la próxima
  actualización vuelve a su página, **con la misma dirección**; si es de las
  últimas 36 horas, también a la portada. Si se había retirado en
  `retiradas.json`, el celular también la saca de ahí.
- **Vuelve sólo lo que una persona vuelve a aprobar después de retirarlo.** Que
  deje de estar retirado no alcanza: `retiradas.json` se poda solo los lunes
  (regla 69) y eso no es volver a publicar.
- Lo que ya salió en Facebook o Instagram no se borra al retirar ni vuelve al
  volver a publicar: allá se maneja a mano.

### Las redes: aprobar no es publicar en redes

Lo que salió en la web porque lo aprobó una persona (era amarillo) **no va
solo** a las redes. Va si la persona lo manda con **"Mandar también a las
redes"** (antes pregunta), y así sí puede ir Política o Policiales (regla 78,
`vaAFacebookPorLoQueEs` en `redes/elegir.mjs`): sale en el próximo posteo que
permitan las reglas de Facebook (de 8 a 22, 90 minutos entre posteos, 5 por
día), antes que las demás. Mientras no salga, se saca de la cola con el mismo
botón; una vez publicada, sólo se borra a mano en Facebook e Instagram. Los
podcasts siguen sin Política ni Policiales.

### El modo de prueba

`radarbalcarce.com/panel/?demo`: notas inventadas, no pide llave y no guarda
nada (`web/public/panel/prueba.js`). Sirve para mostrarlo o probar un cambio.

### Límites

- **El pedido a la IA queda a la vista en GitHub** (es un dato de la corrida):
  el celular avisa que no se pongan nombres.
- **Nada es instantáneo**: lo decidido sale en la próxima vuelta de "Actualizar
  la web" (cada media hora) o con "Actualizar la web ahora" (unos 8 minutos).
- **Retirar de la web no borra lo que ya salió en Facebook o Instagram**: eso
  se borra a mano en la red (el celular lo recuerda).
- **Lo que contaría un repaso puede cambiar hasta su hora**: la pestaña Redes
  muestra lo que elegiría si saliera ahora, calculado en la última
  actualización.
- **No hace** lo del panel de la PC: agenda cargada a mano, avisos, buzón,
  fuentes, calendario.
- **El panel de la PC no ve lo decidido en el celular**: una nota aprobada en
  el celular puede seguir en "Para decidir" de la PC. Si se decide en los dos,
  manda la decisión más nueva.

### ¿Y el panel 100 % online?

Es éste. De las opciones que se habían pensado (Cloudflare Functions con
Access, una página que escriba por la API de GitHub, un servidor gratis o uno
pago) se eligió la segunda, sin servidor: el celular escribe directo en el
repositorio con la llave de cada persona, y lo sensible viaja cifrado.

---

## El panel de la PC

Un programa de Node que corre **sólo en la PC de Hernán**
(`http://localhost:4321`): busca noticias cada 10 minutos, deja decidir las
amarillas y **sube solo a GitHub** sus decisiones, los avisos y los eventos. No
arma ni publica la web: la arma GitHub con la PC prendida o apagada.

### 1. Arrancar

Doble clic en **`ARRANCAR.bat`** (en la raíz del proyecto): abre una ventana
negra, "Radar Balcarce - PANEL", que corre `node panel/servidor.mjs`, y a los 5
segundos el navegador en `http://localhost:4321`. **Esa ventana es el panel**:
si se cierra, se apaga. También se puede con `npm run panel`.

### 2. Lo que hace al arrancar (`panel/servidor.mjs`)

1. Lee `panel/datos/estado.json` (su memoria; si no existe, lo crea con las
   fuentes del código). Suma las fuentes nuevas del código
   (`TODAS_LAS_FUENTES`) y respeta el peso y la pausa que se hayan tocado en el
   panel.
2. Guarda el estado, lo que **siempre** exporta las decisiones y los eventos y
   programa la subida a GitHub (paso 5).
3. A los 15 segundos hace una copia de seguridad (paso 6) y después, una cada 6
   horas.
4. Escucha en el puerto 4321. Si nunca buscó noticias, busca; si no tiene la
   agenda del municipio, la trae. Después, **busca noticias cada 10 minutos**
   (`correrIngesta`, con el peso y la pausa del panel: `fuentesParaIngestar`) y
   **trae la agenda cada hora**. No reescribe solo con IA: eso lo hace sólo la
   nube; queda el botón "Reescribir con IA", a pedido.

### 3. Entrar

- La primera pantalla es el **login** (`panel/acceso.mjs`), con dos usuarios,
  Hernán y Andrés. Las cuentas se crean o se les cambia la clave en la consola
  de la PC: `node panel/clave.mjs <usuario> "<clave>" ["Nombre"]`. **Una clave
  nunca se escribe en un documento ni en un chat.**
- Las claves se guardan como hash (scrypt con sal) en
  `panel/datos/usuarios.json`. La sesión es una cookie firmada que dura 30 días
  (`DIAS_DE_SESION`); la firma sale de `panel/datos/secreto.txt`, que se crea
  solo (si se borra, se cierran todas las sesiones).
- Cinco claves mal seguidas desde la misma dirección cierran la puerta 15
  minutos (`MAX_FALLOS`, `CASTIGO_MS`); la dirección que manda el túnel
  (`X-Forwarded-For`) sólo se cree si la conexión viene de la misma PC, y el
  error no delata si el usuario existe. Un pedido que cambia algo y viene de
  otra página se rechaza (`origenPermitido`, `panel/seguridad.mjs`), "Salir" es
  un botón y no un enlace, y "Probar una fuente" no deja entrar a la red de la
  casa (`probarUrlPermitida`).
- El panel escucha en todas las conexiones de la PC (cualquiera en la misma red
  llega al login) y, con **Tailscale Funnel** prendido, se entra desde afuera
  con la dirección de `panel/datos/DIRECCION-DEL-PANEL.txt` (no va al
  repositorio). Ahí lo protege **sólo la contraseña**; con https la cookie sale
  `Secure`. Con el panel del celular, el túnel ya no hace falta: se cierra con
  `tailscale funnel --https=443 off`.

### 4. Las pestañas

El tablero (`panel/panel.html`, una sola página) se recarga solo cada minuto
mientras no haya una nota abierta. Arriba: quién entró, **"Buscar noticias
ahora"** y **"Salir"**.

| Pestaña | Qué muestra | Qué se puede hacer |
|---|---|---|
| **Para decidir** | Las notas en `pendiente`: las amarillas sin decidir, con el semáforo, sección, medios, cuándo, "coinciden N", "nos nombran afuera", "sin cuerpo", el puntaje y el motivo | Editar título, bajada, cuerpo y guion; **Reescribir con IA**; **Publicar**, **Guardar cambios** o **Descartar**. Plegado, el **análisis interno** (verificación, claves, qué se sabe, qué falta confirmar, fuentes, antecedentes), que la web no muestra. Sin cuerpo, "Publicar" pide **"Publicar igual, sin cuerpo"**. **"Archivar esas N"** descarta de una vez las viejas o flojas (las que dicen "días" o tienen menos de 55 de puntaje) |
| **Publicadas** | Lo publicado por una persona y lo que salió solo | **Volver a la cola** (borra la decisión); en lo que salió solo, **Bajar de la web** |
| **Descartadas** | Lo que alguien descartó | **Volver a la cola** |
| **Frenadas** | El semáforo rojo | Nada: no se publica ni por error |
| **Archivadas** | Lo que pasó 72 horas sin decidirse (`HORAS_PARA_ARCHIVAR`) | **Volver a la cola** |
| **Fuentes** | Cada fuente con su peso, si está activa y cómo le fue; el historial | Pausar, reactivar, cambiar el peso (1 a 40), borrar, **sumar una fuente** y **probarla** antes |
| **Clima y farmacias** | La farmacia de turno y la semana, el clima, los números útiles | Sólo mirar |
| **Agenda** | Los eventos cargados a mano, los del municipio, "Cargar un evento", "A quién pedirle fechas" y las fiestas anuales | Ver "La agenda, paso a paso" |
| **Calendario** | A qué hora y qué días sale cada historia fija | Cambiarlas. **Sólo rige en la PC**: GitHub usa los horarios de fábrica (`HISTORIAS_FIJAS`, `panel/horarios.mjs`; `PENDIENTES.md`, D7) |
| **Para redes** | Los videos y placas armados **en la PC** en las últimas 24 horas (`reels/salida/`) | Bajarlos. Las redes de todos los días salen desde GitHub (`docs/07-REDES.md`) |
| **Buzón** | Lo que manda la gente: dato, reclamo, opinión o seguimiento (`panel/buzon.mjs`) | Cargar algo que llegó por otro canal, cambiarle el estado, anotar la respuesta de la otra parte, borrar. Un reclamo **nunca** se publica de un solo lado |
| **Avisos** | Los tres espacios publicitarios de la web (apertura, clima, pie; `SLOTS_AVISOS`) | Cargar nombre, texto y logo; con el nombre vacío se borra (`PUBLICIDAD.md`) |
| **Cómo escribe la IA** | La instrucción exacta que recibe la IA (`CRITERIO-EDITORIAL.md` § 12) y, plegado, el criterio entero | Sólo mirar. Se cambia en el documento y se reinicia el panel |

### 5. Qué pasa cuando alguien decide algo

1. El navegador manda el pedido al panel (`/api/nota`, `/api/lote`,
   `/api/reescribir`, `/api/avisos`, `/api/evento`…). Quién lo hizo sale de la
   sesión, no de lo que diga el navegador.
2. El panel cambia su estado, lo anota en el historial y guarda
   `panel/datos/estado.json`. En el mismo momento:
   - **exporta las decisiones** a `web/data/decisiones.json`
     (`exportarDecisiones`): sólo lo que decidió una persona y los textos de la
     IA de los últimos 3 días (`vaALaWeb`, `panel/notas.mjs`), con los campos
     que la web usa (`decisionParaLaWeb`). **Poda** lo de más de 60 días
     (`DIAS_DE_DECISIONES`), salvo lo que una persona descartó, bloqueó o
     archivó (así no vuelve si un medio la republica), y lo pendiente de más de
     7 días (`DIAS_DE_PENDIENTES`);
   - **exporta los eventos** publicados a `web/data/eventos-panel.json`
     (`eventosParaLaWeb`, `panel/agenda.mjs`): sólo los campos públicos
     (`CAMPOS_PUBLICOS`), nunca quién avisó ni su teléfono, hasta 90 días
     después de que terminan;
   - los avisos se escriben directo en `web/data/avisos.json`.
3. **Sube a GitHub** (`panel/sincronizar.mjs`) **30 segundos** después del
   último cambio (`esperaMs`), así varios cambios van en una sola subida:
   `git add` de los tres archivos → `git commit` "Panel: decisiones, avisos y
   agenda · fecha" → `git pull --rebase --autostash` → `git push`. Si algo falla
   (sin internet, un conflicto), cancela, lo dice en la ventana y el cambio sube
   con el próximo. Se apaga con `SINCRONIZAR_GITHUB=no`.
4. La próxima corrida de "Actualizar la web" lo respeta (`notaPublicada`,
   `generar-datos.mjs`): unos 35 minutos en el peor caso.

Para la web sólo manda una decisión con `por` distinto de `'ia'`
(`decisionHumana`, `ingesta/utiles.mjs`); lo que escribió la IA desde el panel
se usa como texto, pero no decide si la nota sale. **"Volver a la cola" borra
la decisión**: si la nota es verde, vuelve a salir sola; si es amarilla, vuelve
a "Para decidir". En lote (`/api/lote`), las que no tienen cuerpo se saltean. Si
una persona cambia el título, la bajada o el cuerpo, las partes internas que
armó la IA se borran (`conTextoCorregido`, `panel/notas.mjs`).

### 6. El respaldo (`panel/respaldo.mjs`)

Copia `panel/datos/` a una carpeta con la fecha (`AAAA-MM-DD`) al arrancar y
cada 6 horas, y guarda las **últimas 14**. La carpeta es la de
`RESPALDO_CARPETA` (conviene Drive u OneDrive, afuera de la PC); si no está,
`respaldos/` junto al proyecto. **Nunca** va a GitHub (hay usuarios y datos del
buzón) y **no copia** los secretos en texto plano (`esSecreto`). A mano: `node
panel/respaldo.mjs [carpeta]`.

### La agenda, paso a paso

`panel/agenda.mjs`; el criterio, en `CRITERIO-EDITORIAL.md` § 8; la página de
cada evento, en `docs/06-WEB.md`. La historia de la agenda de los jueves sale
desde GitHub con la agenda publicada (`docs/07-REDES.md`).

**Cargar un evento que avisó alguien:**

1. Pestaña **Agenda** → **Cargar un evento**: nombre, fecha (`2026-10-15`) y,
   si se sabe, hora (`20:30`), cuándo termina, lugar, dirección, entrada, quién
   organiza, página de entradas y descripción. Todo eso **sale en la web tal
   cual**; "Quién lo avisó" queda en el panel.
2. Si la fecha está **confirmada por quien organiza**, tildar "Publicar ya en
   la web". Si no, queda como **borrador** y se publica después con **Publicar
   en la web**. Una fecha aproximada no se publica.
3. En la próxima corrida de GitHub el evento tiene su página. **Sacar de la
   web** o **Borrar** la hacen desaparecer en la corrida siguiente.

**Una fiesta del calendario anual** (Automovilismo, Postre, Balcarce Corre…):
cuando el organizador confirma la fecha, **Ya tengo la fecha** llena el
formulario y lo liga a la fiesta; la web cambia "fecha a confirmar" por la
fecha con enlace.

**Pedirle fechas a las instituciones** ("A quién pedirle fechas"):

1. **A quién escribir este mes** muestra a los que suelen tener eventos en los
   próximos 45 días (`DIAS_ADELANTE`) y a los que no se les escribió en los
   últimos 30 (`DIAS_ENTRE_MENSAJES`).
2. **Escribir por WhatsApp** (o por mail) abre el mensaje ya escrito. **El
   panel no manda nada solo**: lo manda una persona. Sin WhatsApp ni mail, **Ver
   mensaje**, copiarlo y mandarlo por Instagram o Facebook.
3. Después, **Le escribimos hoy**; cuando contestan, **Respondió** y, si mandan
   una fecha, **Cargar un evento suyo**.

**La base de contactos** es `ingesta/contactos-agenda.json`: qué organiza cada
institución, en qué meses (sólo si hay una fuente que lo respalde), sus canales
**oficiales** y de dónde salió cada dato. El repositorio es público: nunca un
celular personal que la institución no publique. Se corrige editando ese
archivo y reiniciando el panel.

### Qué guarda y dónde

| Archivo | Qué es | ¿Va a GitHub? |
|---|---|---|
| `panel/datos/estado.json` | La memoria: decisiones completas, fuentes, historial (200 movimientos), eventos, buzón, contactos escritos, horarios | No (`.gitignore`) |
| `panel/datos/ultima.json`, `agenda.json` | La última búsqueda de noticias y la agenda del municipio | No |
| `panel/datos/usuarios.json`, `secreto.txt` | Los usuarios con su hash y la firma de las sesiones | No (y la firma no se respalda) |
| `web/data/decisiones.json` | Lo que la web necesita de las decisiones | **Sí**, lo sube el panel |
| `web/data/avisos.json` | Los tres avisos | **Sí**, lo sube el panel |
| `web/data/eventos-panel.json` | Los eventos publicados, sólo lo público | **Sí**, lo sube el panel |
| `reels/salida/` | Las piezas armadas en la PC | No |

### Por qué hay que reiniciarlo

Node lee el código **una sola vez, al arrancar**. Si cambia algo en `ingesta/`,
`panel/`, `reels/`, `CRITERIO-EDITORIAL.md` o `ingesta/contactos-agenda.json`
(también por un `git pull`) mientras el panel está prendido, sigue con la
versión vieja. Para que tome lo nuevo: **cerrar la ventana negra y volver a
correr `ARRANCAR.bat`**.

### Cómo puede pisar datos

1. **Pisa `web/data/decisiones.json`**: cada vez que guarda su estado lo
   reescribe entero desde su memoria. Un cambio hecho a mano o desde GitHub con
   el panel prendido **se pierde**. Por eso, para sacar o corregir notas sin el
   panel se usan **`web/data/retiradas.json`** y **`web/data/correcciones.json`**
   (o el panel del celular), que el panel de la PC no toca.
2. **Pisa `web/data/avisos.json`** con lo que tiene al guardar: los avisos
   conviene cargarlos sólo desde el panel.
3. **Su estado no se comparte entre PCs**: otra PC tendría su propio
   `estado.json`.

### La corrida de la PC y la de la nube no son iguales

| | Panel de la PC (cada 10 min) | "Actualizar la web" (GitHub, cada 30 min) |
|---|---|---|
| Fuentes | Las del código, con el peso y la pausa del panel | Las del código tal cual (pausar una fuente en el panel **no** la pausa en la nube) |
| Identificadores ya publicados (`idsConocidos`) | No los pasa | Sí: una historia conserva su identificador cuando otro medio se suma |
| Lectura con IA, repetidas, cupos, fotos, dólar, portada | No | Sí |
| Qué se reescribe con IA | Nada solo: sólo "Reescribir con IA", a pedido | Lo que va a salir, con las reglas de 36 y 12 horas |
| Cuándo una nota "se archiva" | A las 72 h sin decidir | Sale de la portada a las 36 h |

Por eso en "Para decidir" de la PC pueden aparecer notas que en la nube la IA
ya sacó, o con otra sección o color. Y el identificador que arma el panel para
una historia de varios medios **puede no ser el de la nube**: si difieren, lo
que se decida en la PC sobre esa nota no le llega a la web. El panel del
celular no tiene este problema: decide sobre lo que armó la nube.

Si en la PC se corre `cd web && npm run datos` después de que el panel buscó
noticias, `generar-datos.mjs` trabaja en "modo PC" (lee `panel/datos/`, sin IA
ni fotos): sirve para mirar la web en la PC, pero deja modificados
`portada.json`, `archivo.json` y otros, que no se suben (`CLAUDE.md`).

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `web/public/panel/app.js` | El panel del celular: pantallas, pestañas, decisiones, las preguntas antes de confirmar | El navegador del celular | Por la API de GitHub: `web/data/` | `celular-decisiones.json`, `correcciones.json`, `retiradas.json` (sólo saca), `celular-llaves.json` (vía `github.js`) |
| `web/public/panel/textos.js` | Lo que explica el panel: por qué espera cada nota (`explicarMotivo`, `motivoCorto`), lo que anotó la IA (`explicarFicha`), las pestañas (`PESTANAS`), las preguntas (`PREGUNTAS`, `preguntaRedes`), el estado de cada pieza y del próximo posteo, la hora de Balcarce | `app.js` | — | — |
| `web/public/panel/github.js` | Cómo habla con GitHub: leer, guardar con reintento, disparar un workflow, encontrar su corrida | `app.js` | La llave | — |
| `web/public/panel/cifrado.js` | Crea las llaves del celular y abre los sobres | `app.js` | La llave privada del navegador | — |
| `web/public/panel/sw.js`, `manifest.webmanifest` | Lo que lo vuelve una app instalable | Chrome | — | — |
| `web/public/panel/prueba.js`, `prueba-sobre.js` | El modo de prueba (`?demo`), con los mismos archivos que arma la web | `app.js` | — | — |
| `panel/celular-datos.mjs` | Qué decide el celular (`problemaDeDecision`, `leerDecisionesCelular`, `unirDecisiones`), qué necesita (`paraDecidir`, `notasParaEscribir`) y la papelera (`papeleraAlDia`, `paraLaPapelera`) | `generar-datos.mjs`, `celular.mjs` | — | — (funciones puras) |
| `panel/cifrado.mjs` | Cierra los sobres para cada celular (`cerrar`, `cerrarSiCambio`, `cerrarCadaUno`, `leerLlaves`) | `generar-datos.mjs`, `celular.mjs` | `celular-llaves.json` | — |
| `redes/previa.mjs` | Lo que sale hoy en las redes, para la pestaña Redes (`previaDelDia`) | `generar-datos.mjs` | La portada, el libro, el archivo | — (lo escribe `generar-datos.mjs` en `celular-estado.json`) |
| `redes/repasos.mjs` | Qué notas cuenta cada repaso (`repasosDelDia`): la misma regla para el plan de los videos y para la previa | `reels/plan.mjs`, `redes/previa.mjs` | — | — |
| `panel/celular.mjs` | El programa de "Panel del celular": busca la nota, la escribe, cierra el borrador | `.github/workflows/panel.yml` | `.cache/celular-notas.json`, `web/data/` | `web/data/celular-borradores.json` |
| `panel/reescribir-una.mjs` | Escribe una nota con IA con el criterio y el verificador de siempre | `celular.mjs` | Las fuentes, `archivo.json` | — |
| `ARRANCAR.bat` | Abre la ventana del panel de la PC y el navegador | Hernán, con doble clic | — | — |
| `panel/servidor.mjs` | El panel de la PC: ciclo de 10 min, API del tablero, exportar y sincronizar | `ARRANCAR.bat`, `npm run panel` | `panel/datos/*`, `web/data/archivo.json`, `avisos.json`, `reels/salida/` | `panel/datos/*`, `web/data/decisiones.json`, `eventos-panel.json`, `avisos.json` |
| `panel/panel.html` | El tablero de la PC (13 pestañas) | El navegador | `/api/estado` | Pedidos a la API |
| `panel/acceso.mjs`, `panel/clave.mjs` | Usuarios, claves, sesiones, freno por intentos; crear una cuenta o cambiar la clave | `servidor.mjs`; una persona, en la consola | `usuarios.json`, `secreto.txt` | Esos dos |
| `panel/seguridad.mjs` | Control de origen y de qué direcciones se pueden probar | `servidor.mjs` | — | — |
| `panel/notas.mjs` | Qué se puede editar, qué va a la web (`vaALaWeb`), poda de decisiones | `servidor.mjs` | — | — |
| `panel/sincronizar.mjs` | Subir a GitHub los tres archivos | `servidor.mjs` | git | Commits |
| `panel/respaldo.mjs` | Copia de `panel/datos/` | `servidor.mjs`; a mano | `panel/datos/` | La carpeta de respaldo |
| `panel/avisos.mjs`, `panel/buzon.mjs` | Los tres avisos; los cuatro tipos del buzón y sus reglas | `servidor.mjs` | — | — |
| `panel/agenda.mjs` | Eventos a mano, qué es público, a quién pedirle fechas | `servidor.mjs` | `ingesta/contactos-agenda.json` | — |
| `panel/horarios.mjs` | Horarios de las historias fijas y `toca` | `servidor.mjs`, `reels/plan.mjs`, `redes/piezas.mjs` | `estado.horarios` | — |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Crear, renovar o revocar la llave del celular | github.com (cuenta `balcardev@gmail.com`) → Settings → Developer settings → Fine-grained tokens (`docs/11-OPERACION.md`) |
| Qué ve el celular en "Esperan" | `paraDecidir` (`panel/celular-datos.mjs`) |
| Qué acepta la web de una decisión del celular | `problemaDeDecision` y `leerDecisionesCelular` (`panel/celular-datos.mjs`) |
| Cómo escribe la IA a pedido | `panel/reescribir-una.mjs` (y el criterio, `CRITERIO-EDITORIAL.md`) |
| Cuántos borradores se guardan | `BORRADORES` (`panel/celular.mjs`) |
| Cuántos días se puede volver a publicar una nota retirada | `DIAS_EN_LA_PAPELERA` (`panel/celular-datos.mjs`) |
| Cuántos celulares pueden registrarse | `LLAVES_MAXIMAS` (`panel/cifrado.mjs`) |
| Las pantallas del celular | `web/public/panel/app.js` e `index.html` |
| Lo que dice el celular (explicaciones, preguntas, motivos) | `web/public/panel/textos.js` |
| Lo que muestra la pestaña Redes | `previaDelDia` (`redes/previa.mjs`) y `NOMBRES_DE_PIEZAS` |
| Crear una cuenta o cambiar una clave del panel de la PC | `node panel/clave.mjs <usuario> "<clave>"` en la PC |
| Que el panel de la PC no suba nada a GitHub | Arrancarlo con `SINCRONIZAR_GITHUB=no` |
| Que el respaldo quede fuera de la PC | Variable `RESPALDO_CARPETA` (Drive u OneDrive) |
| Cada cuánto busca noticias la PC | `setInterval(correrIngesta, 10 * 60 * 1000)`, al final de `panel/servidor.mjs` |
| A las cuántas horas archiva lo no decidido | `HORAS_PARA_ARCHIVAR` (`panel/servidor.mjs`) |
| Cuánto tarda en subir a GitHub, y qué archivos | `esperaMs` (`panel/sincronizar.mjs`); `archivos` en `crearSincronizador(…)` (`panel/servidor.mjs`) |
| Cuántos días se guardan las decisiones y los textos de la IA | `DIAS_DE_DECISIONES`, `DIAS_DE_TEXTOS_DE_LA_IA`, `DIAS_DE_PENDIENTES` (`panel/notas.mjs`) |
| Qué campos del evento son públicos | `CAMPOS_PUBLICOS` (`panel/agenda.mjs`) |
| Los horarios de fábrica de las historias fijas | `HISTORIAS_FIJAS` (`panel/horarios.mjs`) |
| Los espacios publicitarios | `SLOTS_AVISOS` (`panel/avisos.mjs`) y `web/components/avisos.js` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| La llave del celular venció o la borraron | El celular dice "La llave no anda (venció o la borraron en GitHub)" | Crear otra y cargarla (`docs/11-OPERACION.md`) |
| A la llave le falta un permiso | "Esa llave no puede escribir…" o "GitHub no deja hacer esto con esta llave" | Crear otra con Contents y Actions en "Read and write" |
| "Esperan" muestra la lista corta, sin detalle | "El detalle de cada nota todavía no llegó cifrado para este celular" | Esperar la próxima actualización de la web (el celular recién se registró) |
| La pestaña Redes dice que las redes están apagadas | "Las redes están apagadas (la variable REDES_ACTIVAS…)" | Es lo esperable mientras `REDES_ACTIVAS` no diga "Si" (`docs/07-REDES.md`) |
| Una nota volvió a publicarse y no aparece | Sigue en "Retiradas" con "↺ vuelve en la próxima actualización" | Esperar la próxima actualización. Si estaba en `retiradas.json` y no se pudo sacar de ahí, sigue retirada: volver a tocar "Volver a publicar" |
| "Escribir con IA" no vuelve | "GitHub tardó demasiado" o "La corrida de GitHub falló" | Mirar "Panel del celular" en GitHub → Actions; probar de nuevo. Si la nota ya no está en la caché ni publicada: "No encontré la nota" |
| La IA no pudo escribirla | El borrador dice por qué (sin fuentes que bajar, la IA no contestó, da rojo) o trae la lista de lo que no cuadra | Revisar y editar, pedir otra versión o escribirla a mano |
| Se decidió en el celular y la web no cambió | — | Esperar la próxima vuelta o tocar "Actualizar la web ahora" (unos 8 minutos) |
| La PC está apagada o se cerró la ventana | No se pueden cargar avisos, eventos a mano ni el buzón. La web, las redes, la vigilancia y el panel del celular siguen | Prender la PC y correr `ARRANCAR.bat` |
| Se cambió código y no se reinició el panel de la PC | Se comporta "como antes" | Cerrar la ventana y `ARRANCAR.bat` |
| El panel de la PC no sube a GitHub | En la ventana: "panel → GitHub: no se pudo subir (…)" | Revisar internet y `git status`; se reintenta con el próximo cambio. Un conflicto se resuelve a mano (`git pull --rebase`; en `web/data/`, `git checkout --theirs`) |
| Se editó `decisiones.json` a mano con el panel de la PC prendido | El cambio desaparece | Usar el panel del celular, `retiradas.json` o `correcciones.json` |
| Sin clave de redacción en el `.env` de la PC, o sin cupo | "Reescribir con IA" cae al armado mecánico y lo dice | Revisar el `.env` (lo pega una persona), esperar o escribir a mano |
| La sesión venció, o cinco claves mal | El tablero vuelve al login, o "Demasiados intentos. Probá de nuevo en N minutos." | Entrar de nuevo, o esperar |
| Se rompió el disco de la PC | Se pierde el historial editorial y el buzón, salvo lo respaldado afuera | Por eso conviene `RESPALDO_CARPETA` |

Lo vigilan las pruebas `celular.test.mjs`, `celular-app.test.mjs`,
`previa-redes.test.mjs`, `panel.test.mjs`, `panel-seguridad.test.mjs`, `acceso.test.mjs`,
`respaldo.test.mjs`, `horarios.test.mjs`, `agenda-panel.test.mjs`,
`buzon.test.mjs` y parte de `editor.test.mjs` y `limpieza-29-09.test.mjs`
(`docs/10-REGLAS-Y-PRUEBAS.md`).
