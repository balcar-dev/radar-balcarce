// La voz de Radar Balcarce.
// Usa las voces argentinas de Microsoft Edge: no hace falta cuenta ni tarjeta.
// Devuelve el mp3 y, lo importante, el tiempo exacto de cada palabra, que es
// lo que después sincroniza los subtítulos del reel sin adivinar nada.

import fs from 'node:fs';
import path from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Elena es la voz elegida. Se define una sola vez y no se cambia nunca más:
// la voz es la marca. Tomas es la alternativa masculina.
export const VOZ = 'es-AR-ElenaNeural';
export const VOZ_ALTERNATIVA = 'es-AR-TomasNeural';

function escaparSsml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// El locutor no lee símbolos: se los traducimos antes.
export function paraLeer(texto) {
  return texto
    // "N° 1" o "Nº1" (abreviatura de "número") va antes que el reemplazo de
    // grados: si no, el símbolo suelto queda y la voz lo lee como si fuera
    // otra palabra ("ene", "grado", "uno").
    .replace(/\bN[°º]\s*/gi, 'número ')
    .replace(/(\d+)\s*°/g, '$1 grados')
    .replace(/(\d+)\s*km\/h/gi, '$1 kilómetros por hora')
    .replace(/(\d+)\s*%/g, '$1 por ciento')
    .replace(/\bhs?\b\.?/gi, '')
    .replace(/\bFM\b/g, 'efe eme')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Sintetiza `texto` y devuelve { archivo, duracion, palabras }.
 * `palabras` es [{ texto, desde, hasta }] en segundos.
 */
export async function decir(texto, destino, { voz = VOZ, velocidad = '+4%' } = {}) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voz, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
    sentenceBoundaryEnabled: false,
  });

  const { audioStream, metadataStream } = tts.toStream(escaparSsml(texto), { rate: velocidad });

  const palabras = [];
  // La metadata llega como objetos JSON completos, indentados y con saltos de
  // línea adentro, así que no se puede cortar por línea: hay que contar llaves.
  let resto = '';
  const tomarObjetos = () => {
    const objetos = [];
    let inicio = -1; let hondo = 0;
    for (let i = 0; i < resto.length; i += 1) {
      if (resto[i] === '{') { if (hondo === 0) inicio = i; hondo += 1; }
      else if (resto[i] === '}') {
        hondo -= 1;
        if (hondo === 0 && inicio >= 0) { objetos.push(resto.slice(inicio, i + 1)); inicio = -1; }
      }
    }
    resto = inicio >= 0 ? resto.slice(inicio) : '';
    return objetos;
  };

  if (metadataStream) {
    metadataStream.on('data', (trozo) => {
      resto += trozo.toString('utf8');
      for (const crudo of tomarObjetos()) {
        try {
          const j = JSON.parse(crudo);
          for (const m of j.Metadata ?? []) {
            if (m.Type !== 'WordBoundary') continue;
            // Los tiempos vienen en unidades de 100 nanosegundos.
            palabras.push({
              texto: m.Data.text.Text,
              desde: m.Data.Offset / 1e7,
              hasta: (m.Data.Offset + m.Data.Duration) / 1e7,
            });
          }
        } catch { /* objeto incompleto, se completa en la próxima vuelta */ }
      }
    });
  }

  await new Promise((ok, mal) => {
    const salida = fs.createWriteStream(destino);
    audioStream.pipe(salida);
    audioStream.on('error', mal);
    salida.on('finish', ok);
    salida.on('error', mal);
  });
  tts.close();

  // La metadata no trae la puntuación, así que la buscamos en el texto
  // original: sin esto los subtítulos cortan en mitad de una frase.
  let cursor = 0;
  for (const p of palabras) {
    const donde = texto.indexOf(p.texto, cursor);
    if (donde >= 0) {
      cursor = donde + p.texto.length;
      const sigue = texto.slice(cursor, cursor + 1);
      p.finFrase = /[.!?…]/.test(sigue);
      p.pausa = /[.!?…,;:]/.test(sigue);
    }
  }

  const duracion = palabras.length ? palabras[palabras.length - 1].hasta : 0;
  return { archivo: destino, duracion, palabras };
}

/** Arma un cartel a partir de su grupo de palabras. */
function cartelDe(grupo) {
  return {
    texto: grupo.map((p) => p.texto).join(' '),
    desde: grupo[0].desde,
    hasta: grupo[grupo.length - 1].hasta + 0.12,
    palabras: grupo,
  };
}

/**
 * Agrupa las palabras en carteles de subtítulo de 3 a 5 palabras, que es lo
 * que se lee cómodo en un celular sin tapar la pantalla.
 *
 * Ningún cartel queda con menos de `minimo` palabras. Se vio el 21/09: la
 * última palabra de una frase a veces caía sola en su propio cartel (por
 * ejemplo "Balcarce."), y como el efecto pinta del color de resalte la
 * palabra que se está diciendo, un cartel de una sola palabra queda ENTERO
 * en ese color — se lee como un error, no como un subtítulo. Un cartel corto
 * se junta con el de al lado en vez de mostrarse solo.
 */
export function enCarteles(palabras, { max = 4, minimo = 2 } = {}) {
  const grupos = [];
  let grupo = [];
  const cerrar = () => {
    if (grupo.length) grupos.push(grupo);
    grupo = [];
  };
  for (const p of palabras) {
    grupo.push(p);
    // Corta al terminar una frase, o en una coma si ya hay suficientes
    // palabras, o cuando el cartel se llenó.
    if (p.finFrase || grupo.length >= max || (p.pausa && grupo.length >= 3)) cerrar();
  }
  cerrar();

  // Un grupo corto se junta con el anterior (o, si es el primero, con el
  // que sigue) en vez de quedar solo. De atrás para adelante, para que unir
  // uno no corra los índices de los que todavía faltan revisar.
  for (let i = grupos.length - 1; i >= 0; i -= 1) {
    if (grupos[i].length >= minimo || grupos.length === 1) continue;
    if (i > 0) grupos[i - 1] = [...grupos[i - 1], ...grupos[i]];
    else grupos[i + 1] = [...grupos[i], ...grupos[i + 1]];
    grupos.splice(i, 1);
  }

  return grupos.map(cartelDe);
}

if (process.argv[1] && process.argv[1].endsWith('voz.mjs')) {
  const texto = process.argv.slice(2).join(' ')
    || 'Buen día, Balcarce. Hoy hay dieciséis grados y el cielo está despejado.';
  const r = await decir(paraLeer(texto), path.join(import.meta.dirname, 'salida', 'prueba.mp3'));
  console.log(`\n  ${r.archivo}`);
  console.log(`  ${r.duracion.toFixed(2)} s · ${r.palabras.length} palabras marcadas`);
  console.log(`  primeras: ${r.palabras.slice(0, 6).map((p) => `${p.texto}@${p.desde.toFixed(2)}`).join(' ')}\n`);
}
