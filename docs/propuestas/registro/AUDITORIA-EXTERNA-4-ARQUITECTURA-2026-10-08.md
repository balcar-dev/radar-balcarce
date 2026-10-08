# Cuarta auditoría externa: la arquitectura (8/10/2026)

*Una IA revisó la arquitectura (no el sitio): qué mantener y qué cambiar. A diferencia de las tres primeras, esta no describe un
sitio que no existe: acierta en lo central. Acá se contrasta cada punto con lo que hay hoy y con lo que ya decidieron Hernán
y Andrés, y se arma un plan por etapas. Nada de esto se aplicó todavía: necesita cuentas, tarjetas o decisiones de ustedes.*

## Lo que propone, punto por punto

| Propuesta | Veredicto | Qué hay hoy | Matiz |
|---|---|---|---|
| **Mantener** Cloudflare (DNS + hosting estático + CDN), GitHub Secrets y robots en GitHub Actions | **De acuerdo** | Es lo que hay | — |
| **A. Fotos a Cloudflare R2** (sin costo de salida, con la CDN) | **De acuerdo; ya estaba decidido** (8/10: "fotos, audios y videos a Cloudflare, livianos") | 592 fotos, 45 MB en el repositorio, unos 4 MB por día | Las fotos **ya se sirven desde Cloudflare Pages**, no desde GitHub: lo que molesta es el peso del repositorio y que cada foto cuenta para el límite de 20.000 archivos por publicación (C-6). R2 pide tarjeta aunque no cobre |
| **B. Base de datos (D1, SQLite en Cloudflare) en vez de JSON en GitHub** | **De acuerdo con matices**: sirve para lo grande y lo que cambia siempre; no para lo que decide una persona | `archivo.json` pesa 2,4 MB y se reescribe cada media hora; unos 80 commits por día de datos; los choques se resuelven con `git checkout --theirs` | El repositorio público también es transparencia, historial gratis y el "backend" del panel del celular. Mover **todo** obliga a poner un servicio entre el celular y los datos (y ahí está C-2). Unos 45 módulos leen `web/data` |
| **C. Sacar cron-job.org** (usar GitHub schedule o Workers Cron) | **Parcial** | Ya hay respaldo con `schedule` de GitHub (:07 y :37) | El `schedule` de GitHub se demora y a veces salta corridas: por eso está cron-job.org. Un **Cloudflare Worker con Cron Trigger** que dispare el workflow es preciso, gratis y es una cuenta menos (el token a GitHub sigue venciendo el 21/09/2027) |
| **D. Respaldos** | **De acuerdo; ya decidido** (cuatro lugares: GitHub, GitLab, Google Drive y la PC) | Falta armarlo | Al separar código de datos, el respaldo de datos es un export mensual |
| **E. Panel unificado como PWA en Cloudflare** que dispare webhooks o hable con la base | **De acuerdo; ya decidido** ("el panel se rediseña después del flujo") | Panel del celular sin servidor que escribe a GitHub con la llave de quien lo usa; el de la PC es de respaldo | Separarlo del sitio público resuelve también C-2. El panel de la PC se puede congelar |
| **Flujo sugerido** (fuentes → Worker/Action → D1; fotos → R2; build → Pages) | **Coherente** | Hoy: fuentes → Action → JSON en git → build → Pages | Es un destino razonable. Se llega por etapas, sin parar nada |

**Lo que la auditoría no dice:** cuánto cuesta migrar (todo lo que lee `web/data` hoy lee archivos locales: el armado, las 1.850
pruebas y los 45 módulos), que el repositorio público es parte del diseño (Actions gratis, transparencia), y que hay datos que
**conviene** que queden en git porque los toca una persona (decisiones, correcciones, retiradas): ahí git da historial y deshacer
gratis.

## Qué se puede hacer por etapas (sin romper nada)

**Etapa 0 · Ya hecha el 8/10.** Dos pasos chicos que apuntan para el mismo lado:
- `ingesta/datos-vivos.mjs`: una sola función dice **de dónde se leen** los datos de feriados y efemérides (hoy `web/data`; las pruebas,
  copias fijas). Es el primer ladrillo de "los datos pueden vivir en otro lado".
- Histórico por mes (`web/data/historico/`): lo que sale del archivo se guarda, no se borra (regla 111).

**Etapa 1 · Fotos a R2** *(necesita: tarjeta en Cloudflare, un token como secreto de GitHub, y que lo pegue una persona)*.
1. Una variable `FOTOS_BASE` (por defecto, la misma web) para que toda dirección de foto salga de un solo lugar.
2. Subir las 592 fotos a un depósito R2 y apuntar `FOTOS_BASE` ahí; el banco sigue diciendo `fotos-notas/ID.jpg`.
3. Que los robots nuevos suban a R2 y no al repositorio. Las fotos viejas quedan en git hasta la última etapa.
4. Efecto: el repositorio deja de crecer 4 MB por día y las fotos dejan de contar para los 20.000 archivos (se podría volver a subir
   el tope de notas).

**Etapa 2 · El archivo grande fuera de git** *(necesita: D1 o, más simple, archivos por mes en R2)*.
1. `archivo.json` (2,4 MB, se reescribe cada media hora) pasa a un almacén; el armado lo lee por mes.
2. El histórico (lo que sale del archivo) vive ahí y las notas viejas se arman **en el momento** con una función de Cloudflare
   (la parte que falta de C-6: sin esto, pasadas las 3.500, el enlace viejo deja de abrir).
3. Con esto el tope de notas deja de existir.

**Etapa 3 · Lo que cambia siempre, fuera de git.** `vistas.json`, `estadisticas.json`, `notas-por-dia.json`, `fichas.json`,
`banco-fotos.json`, `intentos-ia.json`, `redes.json`. Son los que generan los commits de cada media hora y los choques. **No** se
mueven las decisiones de personas (`celular-decisiones.json`, `correcciones.json`, `retiradas.json`).

**Etapa 4 · Disparador de repuesto.** Un Worker con Cron Trigger que llame a `workflow_dispatch` como segundo disparador (convive con
cron-job.org). Si anda bien un mes, se evalúa sacar cron-job.org.

**Etapa 5 · Panel nuevo (PWA) separado del sitio.** Va con el rediseño que ya decidieron y con C-2. Puede hablar con los datos
nuevos sin llave de GitHub en el celular.

**Etapa 6 · Respaldos.** Un export mensual de lo que haya salido de git, a Google Drive/GitLab, además del código.

## Orden recomendado

1. **Respaldo** (etapa 6, parte simple: copiar el repositorio a GitLab) y el **recordatorio del 15/12**, porque hoy no hay ninguno.
2. **Etapa 1 (fotos)**: es lo que más pesa y lo que menos arriesga.
3. **Etapa 2** antes de que se llegue a 3.500 notas (alrededor del 2/12).
4. Etapas 3 a 5, con el rediseño del panel.

## Qué necesita de ustedes

- **Tarjeta en Cloudflare** para R2 (no cobra mientras se use poco; la piden igual) y un **token** de Cloudflare como secreto.
- Decidir **R2 con archivos por mes** (más simple, sin base) o **D1** (consultas, pero hay que escribir una capa nueva) para el archivo.
- Confirmar que el panel de la PC se **congela** (no se toca más) hasta el panel nuevo.
