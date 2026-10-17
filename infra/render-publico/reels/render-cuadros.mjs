// Un obrero que dibuja cuadros (SVG → PNG) para `renderizarEscena` (reels/animacion.mjs): una escena de 20 s son más de 400 cuadros y, uno atrás
// del otro, tardaban más de un minuto y medio. Repartidos entre los núcleos de la máquina, tardan una fracción.
import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { archivosDeFuente } from './placa.mjs';

const propias = archivosDeFuente();
for (const { svg, archivo } of workerData.trabajo) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: workerData.ancho },
    font: { fontFiles: propias, loadSystemFonts: propias.length === 0, defaultFontFamily: 'Inter' },
  });
  fs.writeFileSync(archivo, r.render().asPng());
}
parentPort.postMessage('listo');
