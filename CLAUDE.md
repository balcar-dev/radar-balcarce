# Radar Balcarce

Medio digital automático de Balcarce (Buenos Aires). Lee 33 fuentes cada media
hora, decide qué publicar, arma el sitio y lo sube, sin que haya nadie
despierto. Los usuarios son Hernán y Andrés; escribir siempre en castellano
rioplatense, sin voseo forzado.

## Cómo está armado

    ingesta/   el motor. SIN dependencias: sólo lo que trae Node
    panel/     el tablero editorial (vive en la PC de Hernán, puerto 4321)
    reels/     placas, voz y video. SÍ tiene dependencias (resvg, ffmpeg)
    web/       el sitio público (Next.js 15, JavaScript, HTML estático)
    pruebas/   `npm test`, 150+ pruebas, sin red

Flujo: fuentes → ingesta → clasificar → puntaje → semáforo → `web/data/portada.json`
→ GitHub Actions (cada 30 min) → Vercel. **La web se actualiza con la PC apagada.**

## Comandos

    npm test              las pruebas (correr SIEMPRE antes de commitear)
    npm run auditar       qué está decidiendo el filtro sobre las noticias de hoy
    cd web && npm run datos && npm run build     regenerar y compilar

## Reglas que no se negocian

- **`ingesta/` y `panel/` no importan nada de afuera de Node.** Hay una prueba
  que lo vigila. Dos veces se coló un import pesado y las pruebas rompieron en
  GitHub Actions andando en la máquina.
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba.**
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
- **El turno de farmacia dura hasta las 9 de la mañana del día siguiente**, no
  hasta la medianoche. La regla está en `ingesta/utiles.mjs`.
- **Las palabras clave cortas engañan.** "gol" encontraba "golpe"; "partido" en
  la provincia es un municipio. Las ambiguas están en `PALABRAS_DEBILES`
  (`ingesta/ingesta.mjs`) y sólo deciden desde el titular.

## Cuentas

- **GitHub:** `balcardev@gmail.com` (única con ese correo). Repo `balcar-dev/radar-balcarce`.
- **Todo lo demás:** `radarbalcarce@gmail.com` (Vercel, Google/Gemini, Meta, Instagram).
- El correo de los commits automáticos es el noreply de GitHub, porque Vercel
  valida la firma contra una cuenta de GitHub. No cambiarlo.

## Estado y pendientes

- Sitio: `radar-balcarce-six.vercel.app`. Dominio `radarbalcarce.com` comprado
  en DonWeb, **todavía sin conectar**. Mientras tanto el sitio le pide a Google
  que no lo indexe (`web/lib/sitio.js`); se da vuelta solo al conectarlo.
- **No gastar la clave de Gemini en reels** hasta que se puedan subir a
  Instagram y Facebook automáticamente (decisión del 21/09). La reescritura con
  IA tampoco corre sola todavía.
- Los reels se suben a mano por ahora. Hay que decidir voces por sección.
- Lista completa de pendientes: el documento "Pendientes" de la sesión del 21/09
  y `IDEAS.md`. Documentación del proyecto: `MANUAL.md`.

## Dónde tocar cada cosa

| Quiero… | Archivo |
|---|---|
| agregar una fuente o cambiar un peso | `ingesta/fuentes.mjs` |
| que una palabra mande una nota a otra sección | `REGLAS_SECCION`, mismo archivo |
| que algo espere aprobación o nunca salga | `REGLAS_SEMAFORO`, mismo archivo |
| cambiar cuánto puntaje pide cada sección | `PISO_DE_AFUERA` y `CUPO_DE_AFUERA`, mismo archivo |
| agregar un tema que se sigue | `TEMAS`, mismo archivo |
| ajustar el filtro de la IA | `ingesta/verificar.mjs` |
| cambiar cuándo salen las historias | panel → Calendario (`panel/horarios.mjs`) |
