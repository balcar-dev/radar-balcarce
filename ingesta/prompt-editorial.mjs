// La instrucción que recibe la IA, leída de CRITERIO-EDITORIAL.md.
//
// Hasta el 25/09 el prompt estaba escrito adentro de reels/reescritura.mjs y
// el criterio, repartido entre EDITORIAL.md, MANUAL.md y el código: había que
// adivinar cuál mandaba. Ahora hay un solo documento editorial y la IA lee de
// ahí, tal cual, las partes marcadas:
//
//   <!-- PROMPT:INICIO -->                  el marco de toda la instrucción
//     <!-- PROMPT:REGLAS:INICIO -->          las reglas fijas, con {{TONO}}
//     <!-- PROMPT:TONO_AMENO:INICIO -->      el tono de todos los días
//     <!-- PROMPT:TONO_SERIO:INICIO -->      el tono de lo serio
//     <!-- PROMPT:NOTA_PANEL:INICIO -->      lo que el panel muestra aparte
//   <!-- PROMPT:FIN -->
//   <!-- PALABRAS_SERIAS:INICIO -->          las palabras que piden el tono serio
//
// (cada una cierra con su :FIN). Si el archivo no se puede leer, o le falta
// una parte, leerCriterio() LANZA: la IA no escribe sin criterio, y es mejor
// que "Actualizar la web" falle a la vista a que publique notas escritas con
// una instrucción vacía. `npm test` lo controla antes de cada publicación.
//
// La ruta sale de este mismo archivo (import.meta.url), no del directorio
// desde el que se corre: así anda igual en GitHub Actions, en el panel de la
// PC y en las pruebas. Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Dónde está el criterio editorial: en la raíz del proyecto. */
export const RUTA_DEL_CRITERIO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'CRITERIO-EDITORIAL.md');

const falla = (ruta, que) => new Error(`Criterio editorial (${ruta}): ${que}. La IA no escribe sin criterio: corregir CRITERIO-EDITORIAL.md.`);

/** El texto entre <!-- NOMBRE:INICIO --> y <!-- NOMBRE:FIN -->, sin las
 *  líneas en blanco de los bordes. Tiene que estar una sola vez. */
function entreMarcas(texto, nombre, ruta) {
  const inicio = `<!-- ${nombre}:INICIO -->`;
  const fin = `<!-- ${nombre}:FIN -->`;
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fin);
  if (a < 0 || b < 0) throw falla(ruta, `falta la marca ${a < 0 ? inicio : fin}`);
  if (b < a) throw falla(ruta, `${fin} está antes que ${inicio}`);
  if (texto.indexOf(inicio, a + 1) >= 0 || texto.indexOf(fin, b + 1) >= 0) throw falla(ruta, `la marca ${nombre} está repetida`);
  const adentro = texto.slice(a + inicio.length, b).replace(/^[ \t]*\n+/, '').replace(/\n+[ \t]*$/, '');
  if (!adentro.trim()) throw falla(ruta, `la parte ${nombre} está vacía`);
  return adentro;
}

/**
 * Lee el criterio editorial. Devuelve
 *   { texto, reglas, tonoAmeno, tonoSerio, notaPanel, palabrasSerias }
 * o lanza si el archivo no está o le falta algo.
 */
export function leerCriterio(ruta = RUTA_DEL_CRITERIO) {
  let texto;
  try {
    texto = fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    throw falla(ruta, `no se pudo leer (${e.code ?? e.message})`);
  }
  // Los archivos del repositorio están en CRLF en la PC y en LF en GitHub:
  // la IA recibe siempre lo mismo.
  texto = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  const prompt = entreMarcas(texto, 'PROMPT', ruta);
  const parte = (nombre) => entreMarcas(prompt, `PROMPT:${nombre}`, ruta);
  const reglas = parte('REGLAS');
  if ((reglas.match(/\{\{TONO\}\}/g) ?? []).length !== 1) throw falla(ruta, 'las reglas tienen que marcar una sola vez dónde va el tono, con {{TONO}}');
  const tonoAmeno = parte('TONO_AMENO');
  const tonoSerio = parte('TONO_SERIO');
  const notaPanel = parte('NOTA_PANEL');

  // Las palabras van entre comillas invertidas: `robo` · `choque` · …
  const palabrasSerias = [...entreMarcas(texto, 'PALABRAS_SERIAS', ruta).matchAll(/`([^`]+)`/g)]
    .map((m) => m[1].trim().toLowerCase())
    .filter(Boolean);
  if (!palabrasSerias.length) throw falla(ruta, 'no hay palabras que pidan el tono serio');

  return {
    texto, reglas, tonoAmeno, tonoSerio, notaPanel, palabrasSerias,
  };
}
