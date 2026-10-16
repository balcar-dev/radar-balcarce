# Flujo: ilustrar con Gemini web las notas que quedan sin foto

*Acordado con Hernán el 16/10/2026: «todos los días prendo la PC y se las pedís con el Chrome a Gemini; vamos reemplazando las que falten, gratis; se puede correr dos veces por día». Es la vía de mejor calidad. Desde el 17/10 (regla 185) el generador de Cloudflare (`ilustrar-notas.yml`) corre **solo, cada 2 horas**, y rellena lo que falta aunque la PC esté apagada.*

## Cómo conviven Cloudflare y Gemini web

| | Cloudflare automático (relleno) | Gemini web (mejor calidad) |
|---|---|---|
| Cuándo | Solo, a los :20 cada 2 horas de 7:20 a 23:20 de Balcarce (el reloj de Cloudflare dispara «Ilustrar notas sin foto» con `automatico` = true) | Con la PC prendida, 10:00 y 18:00 (o cuando Hernán lo pida) |
| Quién mira la imagen | El control con visión de Gemini (API, clave gratis de clasificación o redacción): sin personas, rostros, texto, logos, armas, sangre, nada raro ni que parezca la escena del hecho. Lo que no pasa, no se publica | Una persona (Claude con Hernán), antes de subirla |
| Qué notas | Las mismas que acá (paso 1): casi todas, con el mismo tono | Las mismas |
| Cuánto | Hasta 20 por día (12 por corrida como mucho, repartidas en el día), dentro de las neuronas gratis de Cloudflare | Unas 10 por tanda |
| Dónde queda | `web/data/fotos-ia.json` con `modelo: 'sdxl'` y `automatica: true` | `web/data/fotos-ia.json` con `modelo: 'gemini-web'` |

- **Gemini web reemplaza a Cloudflare:** si una nota ya tiene la ilustración automática y la de Gemini web sale mejor, se pisa la entrada de `fotos-ia.json` con la nueva (otro nombre de archivo, `<id>-ia-2.jpg`, porque Cloudflare guarda el viejo una semana).
- **Cloudflare nunca pisa a Gemini web:** el modo automático salta toda nota que ya tiene una ilustración, y reconoce las de Gemini web (`modelo: 'gemini-web'`, o el prompt que dice «Gemini web»). Si una de Gemini web se sube mientras la corrida automática está trabajando, el paso que guarda vuelve a mirar `fotos-ia.json` recién bajado y no la toca.
- Las dos tienen la prioridad más baja: si aparece una foto real de la fuente, gana la foto.

## Pasos (Gemini web)
1. **Qué notas faltan.** Mirar `web/data/portada.json` (origin/main): las de las últimas 24 horas sin `foto` (o con la ilustración automática, si se quiere mejorar). Hernán (16/10): «que todas las notas tengan, no te limites: la imagen no tiene por qué dibujar chicos». Como la imagen NUNCA lleva personas (sólo objetos), se ilustra casi todo, incluidos escuelas, deportes infantiles y Policiales/Política (con tono sobrio). Se saltan sólo: fallecimientos y sepelios, el semáforo rojo (abuso sexual, suicidio, femicidio) y las propias que ya traen su imagen (clima, efemérides, repasos, dólar, F1, fútbol). La corrida automática de Cloudflare usa exactamente estos mismos filtros (`motivoParaSaltar`, `web/scripts/ilustrar-notas.mjs`).
2. **Pedirle a Gemini** (Chrome, gemini.google.com/app, un chat nuevo por nota) este texto, con la nota entera al final:

> Generá una imagen fotoperiodística y conceptual para ilustrar la nota periodística que te dejo abajo. Requisitos importantes: 1. No debe aparecer ninguna persona en la imagen (completamente sin gente) para evitar confusiones de identidad. 2. Debe ser un plano detalle o bodegón natural y espontáneo de los objetos y herramientas típicos de la actividad o profesión de la que habla la nota. 3. Los objetos deben estar sobre una superficie de trabajo (mesa, escritorio, etc.) y mostrar desgaste por uso. 4. Evitá por completo mostrar logotipos oficiales, escudos, marcas o textos institucionales específicos. Si hay carteles, folletos o documentos, que tengan un diseño genérico, desenfocado o meramente de texto simple, o solo colores y formas abstractas sin emblemas. 5. El fondo debe estar muy desenfocado (efecto bokeh) pero debe sugerir el lugar donde transcurren los hechos. 6. La foto debe ser natural, con luz real (de archivo de diario), de aspecto cotidiano y sin retoques digitales exagerados. 7. Formato horizontal 16:9, sin ningún texto legible. 8. TONO: *(según la nota)*. Acá está la nota: *(título, bajada y cuerpo COMPLETOS)*

3. **El tono lo decide quien pide** (Hernán, 16/10: «que sea algo lindo si la nota implica algo agradable, no algo gris y oscuro»): para notas alegres (eventos, deporte, cultura, escuelas, festejos) se agrega «luminosa, cálida y agradable: luz de día soleada, colores vivos y limpios, ambiente festivo; nada gris, oscuro ni sombrío»; para notas graves (Policiales, Política, tragedias, justicia) tono sobrio y neutro, nunca dramático, un objeto simbólico y nunca la escena del hecho; para temas técnicos o institucionales, luz natural neutra. Es el mismo criterio que usa la corrida automática (`tonoDeLaNota` y `TONOS`). Si una imagen sale oscura para una nota alegre, se pide de nuevo con el tono.
3 bis. **Mirar la imagen** antes de usarla: sin personas, sin texto legible, sin logos, sin nada raro ni que pueda hacerse pasar por una foto del hecho. Si no sirve, pedir otra (una vez) o dejar la nota con la placa (o con la automática, si ya la tiene y está bien).
4. **Descargarla** (ícono de descarga de la imagen) y guardarla achicada (1.200 px, JPEG) como `web/public/fotos-notas/<id>-ia.jpg` (si ya existe, `<id>-ia-2.jpg`), anotándola en `web/data/fotos-ia.json` con `credito: 'Ilustración generada con IA'`, `medio` igual, `origen: 'ia'`, **`modelo: 'gemini-web'`** (así la corrida automática nunca la pisa), `cuando`, `titulo` y `prompt`. Tiene la prioridad más baja: si después aparece una foto real de la fuente, gana.
5. **Subir entre corridas de «Actualizar la web»** (no entre los :00–:10 ni :30–:40 UTC) **ni a los :20–:30 de las horas pares UTC** (la corrida automática), con `git commit -- archivos` y el worktree de empuje.

## Reglas
- La etiqueta «Ilustración generada con IA» va siempre en el epígrafe.
- La imagen no lleva personas ni rostros, nunca: así no hay forma de identificar a un menor ni a una víctima (regla de CLAUDE.md). Sin armas, sangre ni escenas de hechos policiales: sólo objetos genéricos.
- Se pega el prompt + la nota completa (título, bajada y cuerpo).
- Límite: unas 10 imágenes por tanda, para no abusar del cupo gratis de Gemini.
- Aviso: automatizar la app web de Gemini (no la API) es zona gris de los términos de Google; con pocas imágenes por día y una persona supervisando el riesgo es bajo.
