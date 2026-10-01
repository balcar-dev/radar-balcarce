// La vista previa de "Un día como hoy" (1/10/2026, Hernán: "armá los reels de la primera
// semana para ver cómo quedan, sin audios para no gastar cupo"): por cada día, las dos
// placas (la principal y "Además, un día como hoy"), un video SIN VOZ con los subtítulos
// calculados por el ritmo de lectura (no gasta nada del cupo de audios) y un resumen con
// lo que se leería, quién lo lee y los datos que hay que confirmar.
//
//   node reels/previa-efemerides.mjs [--carpeta=reels/salida] [--dias=2026-10-05,2026-10-06]
//
// Lee web/data/efemerides-piezas.json. No publica nada ni toca el libro. Va en reels/ porque
// usa las placas y ffmpeg (dependencias).

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { placaEfemeride, placaLista, aPng, COLOR_SECCION, COLOR_FERIADO } from './placa.mjs';
import { paraLeer, enCarteles } from './voz.mjs';
import { armarAss } from './reel.mjs';
import { vozDePieza } from '../redes/prompt-redes.mjs';
import { feriadoDelDia, fechaDeFeriado, datosParaContar, guionFeriado } from '../redes/feriado.mjs';

const correr = promisify(execFile);
const RAIZ = path.join(import.meta.dirname, '..');
const COLOR = COLOR_SECCION['Cultura y agenda'];
/** Palabras por segundo de la voz de Gemini con un texto así (CRITERIO-REDES.md: entre 2,3 y 2,6). */
export const RITMO = 2.5;
const RETARDO = 0.25;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const fechaLarga = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return { dia: DIAS[new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()], numero: d, mes: MESES[m - 1] };
};

/**
 * Las palabras del guion con tiempos calculados por el ritmo de lectura, en el formato de los
 * subtítulos ({ texto, desde, hasta, finFrase, pausa }). Sin voz: es una estimación.
 */
export function palabrasSinteticas(texto, { ritmo = RITMO } = {}) {
  const palabras = paraLeer(texto).split(/\s+/).filter(Boolean);
  let t = 0;
  return palabras.map((tok) => {
    const letras = tok.replace(/[^\p{L}\p{N}]/gu, '').length;
    const dur = (1 / ritmo) * Math.max(0.7, Math.min(1.6, letras / 5));
    const finFrase = /[.!?]$/.test(tok);
    const pausa = /[,;:]$/.test(tok);
    const p = { texto: tok, desde: t, hasta: t + dur, finFrase, pausa };
    t += dur + (finFrase ? 0.28 : pausa ? 0.12 : 0);
    return p;
  });
}

/** Cuándo empieza "Y además…": hasta ahí va la placa principal y desde ahí la de "Además". */
export function momentoDelAdemas(palabras) {
  const i = palabras.findIndex((p, k) => p.texto === 'Y' && /^además/i.test(palabras[k + 1]?.texto ?? ''));
  return i > 0 ? palabras[i].desde : null;
}

/** Las dos placas de un día (SVG). */
export function placasDelDia(fecha, dia) {
  const f = fechaLarga(fecha);
  const rotulo = `Un día como hoy · ${f.numero} de ${f.mes}`;
  const p = dia.principal;
  // Lo que va en grande: el año. Un "día de…" sin año (el del Circo Criollo) lleva el día, así todas las placas arrancan igual (1/10, Hernán).
  const grande = p.anio ? String(p.anio) : `${f.numero} ${MESES_CORTOS[MESES.indexOf(f.mes)]}`;
  const principal = placaEfemeride({ rotulo, grande, titulo: p.titulo, cuerpo: p.cuerpo, color: COLOR });
  const ademas = placaLista({
    rotulo: 'Además, un día como hoy', titulo: `${f.numero} de ${f.mes}`, color: COLOR,
    filas: dia.ademas.map((x) => ({ rotulo: x.anio ? String(x.anio) : 'Hoy', principal: x.texto })),
  });
  return { principal, ademas };
}

/** Un video sin voz: la placa principal, después la de "Además", subtítulos encima y una pista de silencio. */
export async function armarVideoSinVoz({ nombre, svgs, guion, dir }) {
  fs.mkdirSync(dir, { recursive: true });
  const p1 = path.join(dir, `${nombre}-principal.png`);
  const p2 = svgs.ademas ? path.join(dir, `${nombre}-ademas.png`) : null;
  await aPng(svgs.principal, p1);
  if (p2) await aPng(svgs.ademas, p2);
  const palabras = palabrasSinteticas(guion);
  const total = RETARDO + palabras.at(-1).hasta + 1.4;
  const corte = (momentoDelAdemas(palabras) ?? total / 2) + RETARDO;
  const acento = svgs.acento ?? COLOR;
  fs.writeFileSync(path.join(dir, `${nombre}.ass`), armarAss(enCarteles(palabras, { max: 4, minimo: 2 }), { acento, retardo: RETARDO }), 'utf8');
  const mp4 = path.join(dir, `${nombre}.mp4`);
  // La carpeta de tipografías es relativa a donde corre ffmpeg (igual que reels/reel.mjs): la carpeta de salida.
  const entradas = p2
    ? ['-loop', '1', '-t', corte.toFixed(2), '-i', path.basename(p1), '-loop', '1', '-t', (total - corte).toFixed(2), '-i', path.basename(p2)]
    : ['-loop', '1', '-t', total.toFixed(2), '-i', path.basename(p1)];
  const origen = p2 ? '[0:v][1:v]concat=n=2:v=1:a=0' : '[0:v]null';
  await correr(ffmpeg, [
    '-y', ...entradas,
    '-f', 'lavfi', '-t', total.toFixed(2), '-i', 'anullsrc=r=44100:cl=stereo',
    '-filter_complex', `${origen},subtitles=${nombre}.ass:fontsdir=../marca/fuentes,format=yuv420p[v]`,
    '-map', '[v]', '-map', `${p2 ? 2 : 1}:a`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '96k',
    '-t', total.toFixed(2), '-r', '30', '-movflags', '+faststart', path.basename(mp4),
  ], { cwd: dir, maxBuffer: 1024 * 1024 * 40 });
  return { mp4, principal: p1, ademas: p2, segundos: total, palabras: palabras.length };
}

/** El resumen en texto: lo que se lee, quién lo lee y qué confirmar. */
export function resumenDeDia(fecha, dia, { segundos, palabras }, voz) {
  const f = fechaLarga(fecha);
  const quien = voz === 'locutor' ? 'el locutor' : 'la locutora';
  const verificar = (dia.principal.verificar ?? []).map((v) => `  - ${v}`).join('\n');
  return `## ${f.dia[0].toUpperCase()}${f.dia.slice(1)} ${f.numero} de ${f.mes}\n\n`
    + `**Voz:** ${quien} · **Dura:** unos ${Math.round(segundos - RETARDO - 1.4)} segundos (${palabras} palabras)\n\n`
    + `**Placa principal:** ${dia.principal.anio ? `${dia.principal.anio} · ` : ''}${dia.principal.titulo} — ${dia.principal.cuerpo}\n\n`
    + `**Además:** ${dia.ademas.map((x) => `${x.anio ?? 'Hoy'}: ${x.texto}`).join(' · ')}\n\n`
    + `**Lo que se lee:**\n\n> ${dia.guion}\n\n`
    + `${verificar ? `**A confirmar con otra fuente:**\n${verificar}\n\n` : ''}`;
}

/** La pieza del feriado de ese día tal como la arma el plan (placa + guion de redes/feriado.mjs). */
export function piezaDeFeriado(iso) {
  const f = feriadoDelDia(new Date(`${iso}T15:00:00Z`));
  if (!f) return null;
  const cuando = new Date(`${iso}T12:00:00Z`);
  return {
    f,
    guion: guionFeriado(f, { fecha: cuando, momento: 'manana' }),
    svg: placaEfemeride({ rotulo: `Feriado · ${fechaDeFeriado(f.fecha)}`, titulo: f.nombre, cuerpo: datosParaContar(f).join(' '), color: COLOR_FERIADO }),
  };
}

async function main() {
  const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
  const carpeta = path.resolve(RAIZ, arg('carpeta', 'reels/salida'));
  const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-piezas.json'), 'utf8'));
  const elegidos = arg('dias') ? arg('dias').split(',') : Object.keys(datos.dias);
  let md = `# Un día como hoy: primera semana (vista previa sin voz)\n\n${datos.nota}\n\nSale a las ${datos.hora}. `
    + 'La voz es la del reparto de CRITERIO-REDES.md; los videos de esta vista previa no tienen audio (el cupo de voz no se toca).\n\n';
  for (const fecha of elegidos) {
    const dia = datos.dias[fecha];
    if (!dia) continue;
    const nombre = `efe-${fecha}`;
    process.stdout.write(`${fecha}… `);
    const r = await armarVideoSinVoz({ nombre, svgs: placasDelDia(fecha, dia), guion: dia.guion, dir: carpeta });
    md += resumenDeDia(fecha, dia, r, dia.voz ?? 'locutora');
    process.stdout.write(`${Math.round(r.segundos)} s\n`);
  }
  // El feriado más cercano de la semana (12/10): cómo sale cuando el día es feriado.
  const feriado = piezaDeFeriado(arg('feriado', '2026-10-12'));
  if (feriado) {
    const r = await armarVideoSinVoz({ nombre: 'efe-feriado-2026-10-12', svgs: { principal: feriado.svg, acento: COLOR_FERIADO }, guion: feriado.guion, dir: carpeta });
    md += `## Feriado: ${feriado.f.nombre} (${fechaDeFeriado(feriado.f.fecha)})\n\n`
      + `**Voz:** la locutora · **Dura:** unos ${Math.round(r.segundos - RETARDO - 1.4)} segundos (${r.palabras} palabras)\n\n`
      + `Ese día no hay "Un día como hoy": la pieza habla sólo de la fecha, con datos verificados (\`web/data/feriados-piezas.json\`).\n\n`
      + `**Lo que se lee:**\n\n> ${feriado.guion}\n\n`;
    console.log(`Feriado: ${Math.round(r.segundos)} s`);
  }
  fs.writeFileSync(path.join(carpeta, 'efemerides-primera-semana.md'), md, 'utf8');
  void vozDePieza; // la voz de producción sale del reparto: se importa para que la prueba controle que existe.
  console.log(`Listo en ${carpeta}`);
}

if (process.argv[1] && process.argv[1].endsWith('previa-efemerides.mjs')) {
  await main().catch((e) => { console.error(e); process.exit(1); });
}
