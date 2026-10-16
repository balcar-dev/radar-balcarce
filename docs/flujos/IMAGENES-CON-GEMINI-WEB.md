# Flujo: ilustrar con Gemini web las notas que quedan sin foto

*Acordado con Hernán el 16/10/2026: «todos los días prendo la PC y se las pedís con el Chrome a Gemini; vamos reemplazando las que falten, gratis; se puede correr dos veces por día». Es la vía de mejor calidad. El generador de Cloudflare (`ilustrar-notas.yml`, automático) queda de respaldo para cuando la PC esté apagada.*

## Cuándo
Dos veces por día con la PC prendida (por ejemplo 10:00 y 18:00), o cuando Hernán lo pida.

## Pasos
1. **Qué notas faltan.** Mirar `web/data/portada.json` (origin/main): las de las últimas 24 horas sin `foto`. Hernán (16/10): «que todas las notas tengan, no te limites: la imagen no tiene por qué dibujar chicos». Como la imagen NUNCA lleva personas (sólo objetos), se ilustra casi todo, incluidos escuelas, deportes infantiles y Policiales/Política (con tono sobrio). Se saltan sólo: fallecimientos y sepelios, y las propias que ya traen su imagen (clima, efemérides, repasos, dólar). La corrida «Ilustrar notas sin foto» (Cloudflare, automática) sigue con filtros más estrictos y sirve de respaldo cuando la PC está apagada.
2. **Pedirle a Gemini** (Chrome, gemini.google.com/app, un chat nuevo por nota) este texto, con la nota entera al final:

> Generá una imagen fotoperiodística y conceptual para ilustrar la nota periodística que te dejo abajo. Requisitos importantes: 1. No debe aparecer ninguna persona en la imagen (completamente sin gente) para evitar confusiones de identidad. 2. Debe ser un plano detalle o bodegón natural y espontáneo de los objetos y herramientas típicos de la actividad o profesión de la que habla la nota. 3. Los objetos deben estar sobre una superficie de trabajo (mesa, escritorio, etc.) y mostrar desgaste por uso. 4. Evitá por completo mostrar logotipos oficiales, escudos, marcas o textos institucionales específicos. Si hay carteles, folletos o documentos, que tengan un diseño genérico, desenfocado o meramente de texto simple, o solo colores y formas abstractas sin emblemas. 5. El fondo debe estar muy desenfocado (efecto bokeh) pero debe sugerir el lugar donde transcurren los hechos. 6. La foto debe ser natural, con luz real (de archivo de diario), de aspecto cotidiano y sin retoques digitales exagerados. 7. Formato horizontal 16:9, sin ningún texto legible. 8. TONO: *(según la nota)*. Acá está la nota: *(título, bajada y cuerpo COMPLETOS)*

3. **El tono lo decide quien pide** (Hernán, 16/10: «que sea algo lindo si la nota implica algo agradable, no algo gris y oscuro»): para notas alegres (eventos, deporte, cultura, escuelas, festejos) se agrega «luminosa, cálida y agradable: luz de día soleada, colores vivos y limpios, ambiente festivo; nada gris, oscuro ni sombrío»; para notas graves (Policiales, tragedias, justicia) tono sobrio y neutro, nunca dramático; para temas técnicos o institucionales, luz natural neutra. Si una imagen sale oscura para una nota alegre, se pide de nuevo con el tono.
3 bis. **Mirar la imagen** antes de usarla: sin personas, sin texto legible, sin logos, sin nada raro ni que pueda hacerse pasar por una foto del hecho. Si no sirve, pedir otra (una vez) o dejar la nota con la placa.
4. **Descargarla** (ícono de descarga de la imagen) y guardarla achicada (1.200 px, JPEG) como `web/public/fotos-notas/<id>-ia.jpg`, anotándola en `web/data/fotos-ia.json` con `credito: 'Ilustración generada con IA'`, `origen: 'ia'`. Tiene la prioridad más baja: si después aparece una foto real de la fuente, gana.
5. **Subir entre corridas de «Actualizar la web»** (no entre los :00–:10 ni :30–:40 UTC), con `git commit -- archivos` y el worktree de empuje.

## Reglas
- La etiqueta «Ilustración generada con IA» va siempre en el epígrafe.
- La imagen no lleva personas ni rostros, nunca: así no hay forma de identificar a un menor ni a una víctima (regla de CLAUDE.md). Sin armas, sangre ni escenas de hechos policiales: sólo objetos genéricos.
- Se pega el prompt + la nota completa (título, bajada y cuerpo).
- Límite: unas 10 imágenes por tanda, para no abusar del cupo gratis de Gemini.
- Aviso: automatizar la app web de Gemini (no la API) es zona gris de los términos de Google; con pocas imágenes por día y una persona supervisando el riesgo es bajo.
