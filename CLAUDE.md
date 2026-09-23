# Radar Balcarce

Medio digital automático de Balcarce (Buenos Aires). Lee 33 fuentes cada media
hora, decide qué publicar, arma el sitio y lo sube, sin que haya nadie
despierto. Los usuarios son Hernán y Andrés; escribir siempre en castellano
rioplatense, sin voseo forzado.

## Cómo está armado

    ingesta/   el motor. SIN dependencias: sólo lo que trae Node
    panel/     el tablero editorial (vive en la PC de Hernán, puerto 4321)
    reels/     placas, voz y video. SÍ tiene dependencias (resvg, ffmpeg)
    redes/     publicar en Facebook e Instagram (API de Meta). SIN dependencias
    web/       el sitio público (Next.js 15, JavaScript, HTML estático)
    pruebas/   `npm test`, 300+ pruebas, sin red

Flujo: fuentes → ingesta → clasificar → puntaje → semáforo → `web/data/portada.json`
→ GitHub Actions (cada 30 min) → Vercel. **La web se actualiza con la PC apagada.**

Redes (todo desde GitHub, con la PC apagada): `redes.yml` es el reloj. Varias veces
por día publica en Facebook y, si a esa hora le toca una historia o reel, la arma
con la voz de Gemini y la sube a Instagram. `piezas.yml` sirve para armar o
publicar piezas a mano. Detalle y horarios en `REDES.md`.

## Comandos

    npm test              las pruebas (correr SIEMPRE antes de commitear)
    npm run auditar       qué está decidiendo el filtro sobre las noticias de hoy
    cd web && npm run datos && npm run build     regenerar y compilar

## Reglas que no se negocian

- **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** Hay una prueba
  que lo vigila. Dos veces se coló un import pesado y las pruebas rompieron en
  GitHub Actions andando en la máquina.
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba.**
- **Nada sensible sale solo a las redes.** Política y Policiales esperan a una
  persona en TODAS las piezas (`redes/elegir.mjs`), aunque en la web salgan por
  el semáforo.
- **Todo lo que va a Instagram es video con voz.** La API no acepta una imagen
  si no está en una dirección pública, y no alojamos archivos.
- **Tokens y claves nunca en un chat ni en el código.** Van a GitHub Secrets o
  al `.env`. Quien los pega es una persona.
- **Nunca la foto de otro medio.** La ley 11.723 cubre el texto, no las fotos.
  Va una placa propia con el titular.
- **Nunca identificar a un menor ni a una víctima** (leyes 26.061 y 26.485). El
  semáforo rojo lo frena; no tocar esa lista sin preguntar.
- **Lo que escribe la IA se verifica contra la fuente** (`ingesta/verificar.mjs`).
  Si inventó un número, un nombre, un día o una cita, no se usa.
- **Cada nota dice quién la escribió** (IA o fuente, automática o revisada).

## Cosas que muerden

- **Node carga el código al arrancar.** Si se toca `ingesta/`, `panel/` o
  `reels/`, hay que reiniciar el panel (cerrar su ventana y correr `ARRANCAR.bat`).
  Si no, sigue trabajando con la versión vieja.
- **Los archivos del repo están en CRLF.** Editar por líneas, no con
  reemplazos multilínea: un `\n` literal no encuentra nada.
- **Escapar barras invertidas desde la terminal falla.** Para regex con `\b`,
  `\s`, `\d`: escribir un archivo `.cjs` con la herramienta Write, no `node -e`.
- **`web/data/portada.json` lo regenera GitHub Actions.** Antes de `git push`
  suele haber conflicto en ese archivo: `git pull --rebase`, resolver con
  `git checkout --theirs web/data/portada.json`, continuar.
- **El turno de farmacia dura hasta las 8:30 de la mañana del día siguiente**, no
  hasta la medianoche. La regla está en `ingesta/utiles.mjs`.
- **Las palabras clave cortas engañan.** "gol" encontraba "golpe"; "partido" en
  la provincia es un municipio. Las ambiguas están en `PALABRAS_DEBILES`
  (`ingesta/ingesta.mjs`) y sólo deciden desde el titular.

- **Las redes tienen un interruptor:** la variable de GitHub `REDES_ACTIVAS`.
  Con `Si` (cualquier mayúscula o tilde) publica; con otro valor todo corre pero
  sólo simula. No hay que tocar código para prender o apagar.
- **Dos claves de Gemini, separadas a propósito:** `GEMINI_API_KEY_REDACCION`
  para redactar las notas (acepta el nombre viejo `GEMINI_API_KEY`) y
  `GEMINI_API_KEY_REDES` para voces y reels (`reels/claves.mjs`). La de redes
  no tiene alternativa: si falta, los reels no arrancan. La de redes es paga.
- **En GitHub las piezas se arman con lo ya publicado** (`web/data/portada.json`,
  vía `redes/datos.mjs`), no con los datos del panel. `reels/marca/` está en
  `.gitignore` salvo las tipografías; la cortina de sonido se genera sola.
- **Para que hoy y las horas sean las de Balcarce en Actions** hay que poner
  `TZ: America/Argentina/Buenos_Aires` en el workflow: el servidor corre en UTC.

## Cuentas

- **GitHub:** `balcardev@gmail.com` (única con ese correo). Repo `balcar-dev/radar-balcarce`.
- **Todo lo demás:** `radarbalcarce@gmail.com` (Vercel, Google/Gemini, Meta, Instagram).
- **Meta:** app "Radar Balcarce Publicador" (ID 2302218363874399), usuario del
  sistema `publicador-radar`, token sin vencimiento en el secreto `META_TOKEN`.
  Página de Facebook "Radar Balcarce"; su ID para la API es **1254237411116171**
  (no el número de la dirección de Facebook). Instagram `@radarbalcarce`.
- El correo de los commits automáticos es el noreply de GitHub, porque Vercel
  valida la firma contra una cuenta de GitHub. No cambiarlo.

## Estado y pendientes

- Sitio: **`radarbalcarce.com`** (conectado el 21/09: nameservers de DonWeb
  apuntando a Vercel; `www` redirige al dominio sin `www`). La dirección vieja
  `radar-balcarce-six.vercel.app` redirige al dominio propio. El sitio ya se
  indexa (`web/lib/sitio.js` lo detecta solo).
- **Redes, al 22/09: en pausa.** Meta bloqueó la API de la cuenta de
  desarrollador por "actividad inusual" y la pantalla para confirmarla está
  rota del lado de ellos. Los workflows **Redes** y **Piezas** están
  desactivados a mano hasta que se destrabe. Cuando ande: Facebook publica
  solo (una nota por vez, 5 por día como máximo, relevancia 75 o más) e
  Instagram y la página de Facebook las piezas de video del día (clima,
  farmacia, 2 reels de noticias, el podcast y 3 historias de notas) con la
  voz Gemini "Kore". Horarios y reglas, y cómo reactivarlo: `REDES.md`. El
  token de GitHub de cron-job.org vence el 21/09/2027: hay que renovarlo
  antes.
- **La reescritura con IA corre sola, 100% en la nube, desde el 22/09**: lo
  que se publica sin revisión humana se reescribe en cada corrida de
  "Actualizar la web" (no sólo cuando el panel está prendido), cruzando
  varias fuentes cuando hay más de una, con un tono distinto para lo serio
  (Policiales, inseguridad, emergencias) que para el resto, y verificado
  contra la fuente antes de aceptarse. Detalle completo: `EDITORIAL.md`.
- **Vercel Analytics activado el 22/09** (plan gratuito, 50.000 eventos/mes):
  ya se puede medir tráfico real desde vercel.com → el proyecto → Analytics.
- **Todo lo que falta, por categoría, está en [`PENDIENTES.md`](PENDIENTES.md)**
  (redes, SEO, bios, editorial, técnico) y en `IDEAS.md` (ideas de producto).
  Qué se publica y cómo se escribe: `EDITORIAL.md`. Redes: `REDES.md`.
  Documentación del proyecto: `MANUAL.md`.

## Dónde tocar cada cosa

| Quiero… | Archivo |
|---|---|
| agregar una fuente o cambiar un peso | `ingesta/fuentes.mjs` |
| que una palabra mande una nota a otra sección | `REGLAS_SECCION`, mismo archivo |
| que algo espere aprobación o nunca salga | `REGLAS_SEMAFORO`, mismo archivo |
| cambiar cuánto puntaje pide cada sección | `PISO_DE_AFUERA` y `CUPO_DE_AFUERA`, mismo archivo |
| agregar un tema que se sigue | `TEMAS`, mismo archivo |
| ajustar el filtro de la IA | `ingesta/verificar.mjs` |
| cambiar el tono o las reglas con que la IA reescribe una nota | `reels/reescritura.mjs` (`INSTRUCCION_EDITORIAL`, `esTemaSerio`) |
| cambiar cuándo salen las historias | panel → Calendario (`panel/horarios.mjs`) |
| cambiar qué se publica en Facebook, reels, historias o el podcast | `redes/elegir.mjs` |
| cambiar a qué hora sale una pieza de Instagram | `redes/piezas.mjs` (ventana) y `reels/plan.mjs` (horarios de reels e historias de notas) |
| prender o apagar la publicación en redes | variable `REDES_ACTIVAS` en GitHub |
| cambiar cómo se habla con Meta | `redes/meta.mjs` |
