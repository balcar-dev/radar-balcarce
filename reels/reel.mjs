// Arma el video vertical: placa + voz + subtítulos sincronizados palabra por
// palabra. El video se arma con ffmpeg, en la máquina; la voz es la de Gemini
// (la clave de redes, con su cupo diario de audios). Si Gemini falla, la pieza
// no se arma: nunca sale con otra voz (28/09, "mejor nunca Elena"). Sin música:
// la cortina hecha con osciladores sonaba a pitido y se sacó el 29/09.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { paraLeer, enCarteles } from './voz.mjs';
import { aPng } from './placa.mjs';
import { decirGemini } from './voz-gemini.mjs';
import { componerIndicacion, vozDePieza } from '../redes/prompt-redes.mjs';
import {
  HISTORIA_MAXIMA, duracionDeLaSalida, pasaDelMaximo, argumentosDeRecorte,
} from './duracion.mjs';

const correr = promisify(execFile);
// Lo que tarda en entrar la voz después de que aparece la placa.
const RETARDO = 0.25;

// ASS usa los colores al revés: &HAABBGGRR.
const aAss = (hex, alfa = '00') => {
  const h = hex.replace('#', '');
  return `&H${alfa}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
};

const tiempo = (s) => {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const seg = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};

/**
 * Subtítulos estilo reel: el cartel entero en blanco y la palabra que se está
 * diciendo en ámbar. Se lee sin audio, que es como mira la mayoría.
 */
// El subtítulo va SIEMPRE en el mismo lugar: anclado por su centro con \pos,
// no apoyado en el borde de abajo. Si se apoya abajo, cada vez que un cartel
// necesita dos renglones el bloque crece hacia arriba y parece que salta.
// Los subtítulos viven en la mitad de abajo, que en el diseño nuevo es
// papel. Por eso el texto va en tinta con un halo claro, y no en blanco
// sobre un recuadro negro: ese recuadro quedaba como un parche pegado
// encima del diseño.
const TINTA = '#14161A';
const SUB_Y = 1660;

// La carpeta de tipografías, en ruta RELATIVA a donde corre ffmpeg (que es
// la carpeta de salida). Con la ruta absoluta no anda: el filtro usa los dos
// puntos como separador de opciones, así que "D:" lo parte al medio, y el
// espacio de "Radar Balcarce" lo termina de romper. Relativa no tiene ni una
// cosa ni la otra.
const CARPETA_FUENTES = '../marca/fuentes';

function armarAss(carteles, { acento = '#E8A33C', retardo = 0 } = {}) {
  const lineas = [];
  for (const c of carteles) {
    for (let i = 0; i < c.palabras.length; i += 1) {
      const p = c.palabras[i];
      const desde = (i === 0 ? c.desde : p.desde) + retardo;
      const hasta = (i === c.palabras.length - 1 ? c.hasta : c.palabras[i + 1].desde) + retardo;
      const texto = c.palabras.map((q, j) => (j === i
        ? `{\\c${aAss(acento)}}${q.texto}{\\c${aAss(TINTA)}}`
        : q.texto)).join(' ');
      lineas.push(`Dialogue: 0,${tiempo(desde)},${tiempo(hasta)},Sub,,0,0,0,,{\\pos(540,${SUB_Y})}${texto}`);
    }
  }

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter,64,&H001A1614,&H00FFFFFF,&H00E3ECEF,&H00000000,-1,0,0,0,100,100,0.5,0,1,0,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lineas.join('\n')}
`;
}

/** Cuánto dura un video, en segundos, medido con ffmpeg (que sale con error al abrir
 *  un archivo sin destino: lo que importa es lo que imprime). null si no pudo. */
export async function medirDuracion(archivo) {
  try {
    await correr(ffmpeg, ['-i', archivo], { maxBuffer: 1024 * 1024 * 10 });
    return null;
  } catch (e) {
    return duracionDeLaSalida(`${e.stderr ?? ''}${e.stdout ?? ''}`);
  }
}

/** La versión del video para las historias: cortada en HISTORIA_MAXIMA con fundido
 *  de salida. Deja el original como está. Devuelve la ruta y lo que dura. */
export async function recortarParaHistoria(mp4, salida) {
  await correr(ffmpeg, argumentosDeRecorte({ entrada: mp4, salida }), { maxBuffer: 1024 * 1024 * 40 });
  return { mp4: salida, duracion: (await medirDuracion(salida)) ?? HISTORIA_MAXIMA };
}

/**
 * @param spec { nombre, svg, guion, acento }
 * @returns ruta del mp4
 */
export async function armarReel({
  nombre, svg, guion, acento = '#E8A33C', indicacion = null,
  // Cada pieza tiene siempre la misma voz (el reparto de CRITERIO-REDES.md, sección
  // 6): la locutora o el locutor. No se cambia por variable de entorno ni hay otra
  // de respaldo; una pieza sin voz en el reparto lanza.
  vozGemini = vozDePieza(nombre),
}, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const png = path.join(dir, `${nombre}.png`);
  const mp3 = path.join(dir, `${nombre}.mp3`);
  const ass = path.join(dir, `${nombre}.ass`);
  const mp4 = path.join(dir, `${nombre}.mp4`);

  await aPng(svg, png);
  // Gemini no trae los tiempos de cada palabra: se resuelven alineando el
  // texto con los silencios del audio (alinear.mjs).
  const texto = paraLeer(guion);

  // Una sola voz por pieza, siempre (28/09): si Gemini no contesta después de sus
  // cuatro intentos (voz-gemini.mjs), la pieza NO sale con otra voz. Se cae
  // acá, plan.mjs la deja fuera del manifiesto y, como no quedó en el libro,
  // el reloj la vuelve a pedir en la vuelta siguiente mientras dure su
  // ventana (VENTANAS, redes/piezas.mjs). Mejor una historia que no sale
  // que una que suena a otro medio.
  const vozUsada = 'gemini';
  let voz;
  try {
    voz = await decirGemini(texto, mp3, {
      voz: vozGemini,
      // El estilo de siempre más el del momento del día (mañana, tarde o noche).
      indicacion: componerIndicacion(indicacion),
    });
  } catch (e) {
    throw new Error(`Gemini no respondió (${e.message.slice(0, 80)}): la pieza no sale con otra voz, se reintenta en la próxima vuelta`);
  }
  if (!voz.palabras.length) throw new Error('la voz no devolvió tiempos de palabra');

  const retardo = RETARDO;
  fs.writeFileSync(ass, armarAss(enCarteles(voz.palabras, { max: 4, minimo: 2 }), { acento, retardo }), 'utf8');

  // La placa va QUIETA (30/09, Hernán: "algunas historias y reels tiemblan
  // levemente, es molesto"). Antes llevaba un zoom lento con zoompan, que
  // recorta la imagen en píxeles enteros: aun agrandada al doble, cada cuadro
  // caía medio píxel corrido y el texto fino temblaba. Sin zoom no hay temblor.
  // Los subtítulos se dibujan encima, ya sin mover nada. El movimiento, cuando
  // se sume, será de detalles calculados cuadro a cuadro (docs/07-REDES.md).
  const filtro = [
    // fontsdir: sin esto ffmpeg busca la tipografía en el sistema y, si no
    // la encuentra, cae en una cualquiera. Las nuestras están en marca/fuentes.
    `subtitles=${path.basename(ass)}:fontsdir=${CARPETA_FUENTES}`,
    'format=yuv420p',
  ].join(',');

  const total = retardo + voz.duracion + 1.4;
  const ms = Math.round(retardo * 1000);

  // La voz, apenas retrasada, y un silencio corto al final.
  const audio = `[1:a]adelay=${ms}|${ms},apad=pad_dur=1.2[a]`;

  await correr(ffmpeg, [
    '-y', '-loop', '1', '-i', path.basename(png),
    '-i', path.basename(mp3),
    '-filter_complex', `[0:v]${filtro}[v];${audio}`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-t', String(total), '-r', '30', '-movflags', '+faststart',
    path.basename(mp4),
  ], { cwd: dir, maxBuffer: 1024 * 1024 * 40 });

  // La duración de verdad, medida en el archivo (no la calculada). Si pasa del
  // máximo de una historia, se hace además una versión recortada para las
  // historias; el reel queda entero. Sirve tanto para un podcast (se sube como
  // reel y como historia) como para una historia suelta que se hubiera alargado.
  const duracionReal = (await medirDuracion(mp4)) ?? total;
  let historia = null;
  if (pasaDelMaximo(duracionReal)) {
    historia = await recortarParaHistoria(mp4, path.join(dir, `${nombre}-historia.mp4`));
    historia.aviso = `el video dura ${duracionReal.toFixed(1)} s y una historia acepta 60: la historia sube recortada a ${HISTORIA_MAXIMA} s`;
  }

  return {
    mp4, mp3, png, duracion: duracionReal, palabras: voz.palabras.length, vozUsada, historia,
  };
}
