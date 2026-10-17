// Un obrero que dibuja cuadros (SVG → PNG) para `renderizarEscena` y `renderizarLinea` (reels/animacion.mjs): una escena de 20 s son cientos de cuadros y,
// uno atrás del otro, tardaban más de un minuto y medio. Repartidos entre los núcleos de la máquina, tardan una fracción.
//
// Trabaja por encargo (18/10/2026, regla 300): quien lo llama le pasa un cuadro por vez `{ svg, archivo }` y él contesta cuando lo dejó en el disco; así
// el SVG de cada cuadro se arma recién cuando hay un obrero libre y no quedan cientos de SVG con fotos adentro esperando en la memoria.
// Un mensaje `null` lo manda a descansar.
import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { archivosDeFuente } from './placa.mjs';

const propias = archivosDeFuente();

parentPort.on('message', (encargo) => {
  if (!encargo) {
    parentPort.close();
    return;
  }
  const r = new Resvg(encargo.svg, {
    fitTo: { mode: 'width', value: workerData.ancho },
    font: { fontFiles: propias, loadSystemFonts: propias.length === 0, defaultFontFamily: 'Inter' },
  });
  fs.writeFileSync(encargo.archivo, r.render().asPng());
  parentPort.postMessage('listo');
});
