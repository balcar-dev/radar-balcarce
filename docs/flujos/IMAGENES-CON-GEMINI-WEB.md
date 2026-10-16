# Flujo: ilustrar con Gemini web las notas que quedan sin foto

*Acordado con Hernán el 16/10/2026: «todos los días prendo la PC y se las pedís con el Chrome a Gemini; vamos reemplazando las que falten, gratis; se puede correr dos veces por día». Es la vía de mejor calidad. El generador de Cloudflare (`ilustrar-notas.yml`, automático) queda de respaldo para cuando la PC esté apagada.*

## Cuándo
Dos veces por día con la PC prendida (por ejemplo 10:00 y 18:00), o cuando Hernán lo pida.

## Pasos
1. **Qué notas faltan.** Mirar `web/data/portada.json` (origin/main): las de las últimas 24 horas sin `foto`. Descartar las que no se ilustran nunca: Policiales, Política, fallecimientos, denuncias o detenidos, menores o escuelas, personas nombradas como protagonistas, y las propias (clima, efemérides, repasos, dólar). Si hay duda, no se ilustra. Lo que dice la corrida «Ilustrar notas sin foto» (adjunto `candidatas.json`, `saltadas` con su motivo) sirve de guía.
2. **Pedirle a Gemini** (Chrome, gemini.google.com/app, un chat nuevo por nota) este texto, con la nota entera al final:

> Generá una imagen fotoperiodística y conceptual para ilustrar la nota periodística que te dejo abajo. Requisitos importantes: 1. No debe aparecer ninguna persona en la imagen (completamente sin gente) para evitar confusiones de identidad. 2. Debe ser un plano detalle o bodegón natural y espontáneo de los objetos y herramientas típicos de la actividad o profesión de la que habla la nota. 3. Los objetos deben estar sobre una superficie de trabajo (mesa, escritorio, etc.) y mostrar desgaste por uso. 4. Evitá por completo mostrar logotipos oficiales, escudos, marcas o textos institucionales específicos. Si hay carteles, folletos o documentos, que tengan un diseño genérico, desenfocado o meramente de texto simple, o solo colores y formas abstractas sin emblemas. 5. El fondo debe estar muy desenfocado (efecto bokeh) pero debe sugerir el lugar donde transcurren los hechos. 6. La foto debe ser natural, con luz real (de archivo de diario), de aspecto cotidiano y sin retoques digitales exagerados. 7. Formato horizontal 16:9, sin ningún texto legible. Acá está la nota: *(título y cuerpo)*

3. **Mirar la imagen** antes de usarla: sin personas, sin texto legible, sin logos, sin nada raro ni que pueda hacerse pasar por una foto del hecho. Si no sirve, pedir otra (una vez) o dejar la nota con la placa.
4. **Descargarla** (ícono de descarga de la imagen) y guardarla achicada (1.200 px, JPEG) como `web/public/fotos-notas/<id>-ia.jpg`, anotándola en `web/data/fotos-ia.json` con `credito: 'Ilustración generada con IA'`, `origen: 'ia'`. Tiene la prioridad más baja: si después aparece una foto real de la fuente, gana.
5. **Subir entre corridas de «Actualizar la web»** (no entre los :00–:10 ni :30–:40 UTC), con `git commit -- archivos` y el worktree de empuje.

## Reglas
- La etiqueta «Ilustración generada con IA» va siempre en el epígrafe.
- Nada de Gemini web para notas sensibles; la regla de CLAUDE.md sobre menores y víctimas no se negocia.
- Límite: unas 10 imágenes por tanda, para no abusar del cupo gratis de Gemini.
- Aviso: automatizar la app web de Gemini (no la API) es zona gris de los términos de Google; con pocas imágenes por día y una persona supervisando el riesgo es bajo.
