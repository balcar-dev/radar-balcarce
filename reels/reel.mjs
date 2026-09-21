// Arma el video vertical: placa + voz + subtítulos sincronizados palabra por
// palabra. Todo con ffmpeg, sin servicios de pago.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { decir, paraLeer, enCarteles } from './voz.mjs';
import { aPng } from './placa.mjs';
import { decirGemini } from './voz-gemini.mjs';
import { ARCHIVO as CORTINA, generar as generarCortina } from './cortina.mjs';

const correr = promisify(execFile);
const RETARDO = 0.7; // lo que suena la cortina sola antes de que entre la voz

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
Style: Sub,IBM Plex Sans,64,&H001A1614,&H00FFFFFF,&H00E3ECEF,&H00000000,-1,0,0,0,100,100,0.5,0,1,0,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lineas.join('\n')}
`;
}

/**
 * @param spec { nombre, svg, guion, acento }
 * @returns ruta del mp4
 */
// La cortina queda apagada: generada con osciladores puros sonaba a pitido de
// fondo, no a música. El código sigue en cortina.mjs para cuando tengamos una
// pista de verdad (grabada o de una librería libre) y ahí se prende con
// { musica: true }.
export async function armarReel({
  nombre, svg, guion, acento = '#E8A33C', musica = false,
  // Gemini por defecto: se nota bastante mejor que Edge, sobre todo en las
  // piezas que se repiten todos los días. El cupo gratis es de 10 pedidos
  // diarios y las piezas fijas son 4, así que entra holgado — y si se acaba,
  // el respaldo de abajo lee con Elena y la pieza sale igual.
  // Para forzar una u otra: VOZ=edge o VOZ=gemini.
  proveedor = process.env.VOZ ?? 'gemini', vozGemini = process.env.VOZ_GEMINI ?? 'Kore',
}, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const png = path.join(dir, `${nombre}.png`);
  const mp3 = path.join(dir, `${nombre}.mp3`);
  const ass = path.join(dir, `${nombre}.ass`);
  const mp4 = path.join(dir, `${nombre}.mp4`);

  await aPng(svg, png);
  // Edge trae los tiempos de palabra de fábrica; Gemini no, y se resuelven
  // alineando el texto con los silencios del audio (alinear.mjs).
  const texto = paraLeer(guion);

  // Gemini es mejor pero es preview y tiene techo de pedidos en el plan
  // gratuito. Si se planta, la pieza NO se cae: la lee Elena y sale igual.
  // Un medio no puede dejar de publicar el clima porque una API dijo 429.
  let voz;
  let vozUsada = proveedor;
  if (proveedor === 'gemini') {
    try {
      voz = await decirGemini(texto, mp3, { voz: vozGemini });
    } catch (e) {
      console.log(`\n    \x1b[33mGemini no respondió (${e.message.slice(0, 60)}…), va con Elena\x1b[0m`);
      voz = await decir(texto, mp3);
      vozUsada = 'edge';
    }
  } else {
    voz = await decir(texto, mp3);
  }
  if (!voz.palabras.length) throw new Error('la voz no devolvió tiempos de palabra');

  // Sin música, la voz entra casi enseguida; con música, medio segundo después.
  const retardo = musica ? RETARDO : 0.25;
  if (musica && !fs.existsSync(CORTINA)) await generarCortina();
  fs.writeFileSync(ass, armarAss(enCarteles(voz.palabras, { max: 3 }), { acento, retardo }), 'utf8');

  // Zoom lento sobre la placa: sin movimiento, un reel parece una foto y la
  // gente sigue de largo.
  // El movimiento se veía a saltos, y la culpa era del tamaño: zoompan
  // trabaja con recortes de píxeles enteros, así que sobre una imagen de
  // 1350 de ancho cada paso del zoom se nota como un tirón. Agrandando la
  // placa al doble antes de mover, un paso equivale a medio píxel de
  // salida y el movimiento se vuelve continuo. Más de 2x se nota poco y
  // duplica lo que tarda el render.
  //
  // El zoom también es más corto que antes (1.035 en vez de 1.05): a esta
  // suavidad, menos recorrido se lee mejor que más.
  const filtro = [
    'scale=2160:3840:flags=lanczos',
    "zoompan=z='min(pzoom+0.00010,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30",
    // fontsdir: sin esto ffmpeg busca la tipografía en el sistema y, si no
    // la encuentra, cae en una cualquiera. Las nuestras están en marca/fuentes.
    `subtitles=${path.basename(ass)}:fontsdir=${CARPETA_FUENTES}`,
    'format=yuv420p',
  ].join(',');

  const total = retardo + voz.duracion + 1.4;
  const ms = Math.round(retardo * 1000);

  // Con música: la voz retrasada y la cortina 21 dB más abajo (normalize=0
  // evita que amix baje la voz para hacerle lugar). Sin música: sólo la voz.
  const audio = musica
    ? [
      `[1:a]adelay=${ms}|${ms}[voz]`,
      `[2:a]volume=0.18,afade=t=out:st=${(total - 1.4).toFixed(2)}:d=1.4[mus]`,
      '[voz][mus]amix=inputs=2:duration=first:normalize=0[a]',
    ].join(';')
    : `[1:a]adelay=${ms}|${ms},apad=pad_dur=1.2[a]`;

  await correr(ffmpeg, [
    '-y', '-loop', '1', '-i', path.basename(png),
    '-i', path.basename(mp3),
    ...(musica ? ['-stream_loop', '-1', '-i', CORTINA] : []),
    '-filter_complex', `[0:v]${filtro}[v];${audio}`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-t', String(total), '-r', '30', '-movflags', '+faststart',
    path.basename(mp4),
  ], { cwd: dir, maxBuffer: 1024 * 1024 * 40 });

  return { mp4, mp3, png, duracion: total, palabras: voz.palabras.length, vozUsada };
}
