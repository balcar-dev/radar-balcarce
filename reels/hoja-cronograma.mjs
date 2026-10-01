// El cronograma de las redes como una imagen (1/10/2026, Hernán: "pasame un cronograma más lindo y
// detallado, si es el locutor o la locutora"): un día por tarjeta, cada pieza con su hora, su tipo
// (reel o historia), quién la dice y cuántos audios gasta el día del cupo de 10.
//
//   node reels/hoja-cronograma.mjs --desde=2026-10-05 --dias=8 [--con-efemeride] [--fijas=a,b] [--salida=archivo.png]
//
// Usa las mismas funciones que el reloj (redes/cronograma-semana.mjs). Va en reels/ porque dibuja
// con las placas (resvg).

import path from 'node:path';
import { aPng, COLORES, COLOR_SECCION, anchoAproximado } from './placa.mjs';
import { cronogramaDeLaSemana, CUPO_DE_VOZ_POR_DIA } from '../redes/cronograma-semana.mjs';
import { diaAR } from '../ingesta/zona.mjs';

const ANCHO = 1080;
const M = 48;
const TEXTO = 'Inter';
const DISPLAY = 'Source Serif 4 60pt';
const FILA = 84;

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** El color de cada pieza (los de CRITERIO-REDES.md § 8: el color lo da lo que se cuenta). */
export function colorDePieza(nombre) {
  if (nombre.startsWith('clima')) return COLOR_SECCION.Clima;
  if (nombre === 'farmacia') return COLOR_SECCION.Farmacias;
  if (nombre.startsWith('participa')) return COLOR_SECCION.WhatsApp;
  if (nombre === 'utiles') return COLOR_SECCION.Balcarce;
  if (nombre === 'agenda') return '#6D4BA0';
  if (nombre === 'efemeride') return COLOR_SECCION['Cultura y agenda'];
  if (nombre === 'feriado') return COLOR_SECCION.Feriados;
  if (nombre.startsWith('aviso')) return COLORES.ambar;
  return COLORES.tinta; // los repasos (noticia1, noticia2, podcast)
}

const chip = (x, y, texto, { fondo, color = '#FFFFFF', ancho, borde = null }) => `
  <rect x="${x}" y="${y}" width="${ancho}" height="36" rx="18" fill="${fondo}"${borde ? ` stroke="${borde}" stroke-width="2"` : ''}/>
  <text x="${x + ancho / 2}" y="${y + 25}" font-family="${TEXTO}" font-size="19" font-weight="700" letter-spacing="1.4" text-anchor="middle" fill="${color}">${esc(texto)}</text>`;

/** Los diez cuadraditos del cupo de voz del día: llenos los que gasta, vacíos los que sobran. */
function medidor(x, y, usados) {
  const cuadros = Array.from({ length: CUPO_DE_VOZ_POR_DIA }, (_, i) => {
    const lleno = i < usados;
    const pasa = usados > CUPO_DE_VOZ_POR_DIA;
    return `<rect x="${x + i * 26}" y="${y}" width="20" height="28" rx="4" fill="${lleno ? (pasa ? COLORES.rojo : COLORES.tinta) : 'none'}" stroke="${lleno ? 'none' : COLORES.linea}" stroke-width="2"/>`;
  }).join('');
  return cuadros;
}

function tarjetaDelDia(d, y) {
  // Un día de feriado lleva el nombre del feriado debajo de la fecha: la cabecera es más alta.
  const extra = d.feriado ? 40 : 0;
  const alto = 112 + extra + d.piezas.length * FILA + 24;
  let svg = `<rect x="${M}" y="${y}" width="${ANCHO - M * 2}" height="${alto}" rx="22" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="2"/>`;
  const [dia, ...resto] = d.etiqueta.split(' ');
  svg += `<text x="${M + 32}" y="${y + 66}" font-family="${DISPLAY}" font-size="46" font-weight="900" fill="${COLORES.tinta}">${esc(dia[0].toUpperCase() + dia.slice(1))}</text>`;
  svg += `<text x="${M + 32 + 18 + Math.round(anchoAproximado(dia, 46, 'serif') * 1.12)}" y="${y + 64}" font-family="${TEXTO}" font-size="28" font-weight="500" fill="${COLORES.gris}">${esc(resto.join(' '))}</text>`;
  if (d.feriado) {
    svg += chip(M + 32, y + 76, 'FERIADO', { fondo: COLOR_SECCION.Feriados, ancho: 136 });
    svg += `<text x="${M + 32 + 152}" y="${y + 101}" font-family="${TEXTO}" font-size="22" font-weight="600" fill="${COLOR_SECCION.Feriados}">${esc(d.feriado)}</text>`;
  }
  // El cupo: diez cuadros y cuántos se gastan.
  svg += medidor(ANCHO - M - 32 - 258, y + 34, d.audios);
  svg += `<text x="${ANCHO - M - 32}" y="${y + 84}" font-family="${TEXTO}" font-size="22" font-weight="600" text-anchor="end" fill="${d.audios >= CUPO_DE_VOZ_POR_DIA ? COLORES.rojo : COLORES.gris}">${d.audios} de ${CUPO_DE_VOZ_POR_DIA} audios${d.audios >= CUPO_DE_VOZ_POR_DIA ? ' · justo' : ''}</text>`;
  svg += `<rect x="${M + 32}" y="${y + 104 + extra}" width="${ANCHO - M * 2 - 64}" height="2" fill="${COLORES.linea}"/>`;
  d.piezas.forEach((p, i) => {
    const yy = y + 112 + extra + i * FILA;
    const c = colorDePieza(p.nombre);
    svg += `<rect x="${M + 32}" y="${yy + 14}" width="8" height="${FILA - 28}" rx="4" fill="${c}"/>`;
    svg += `<text x="${M + 60}" y="${yy + 52}" font-family="${TEXTO}" font-size="32" font-weight="700" fill="${COLORES.tinta}">${esc(p.hora)}</text>`;
    svg += `<text x="${M + 188}" y="${yy + 40}" font-family="${TEXTO}" font-size="30" font-weight="600" fill="${COLORES.tinta}">${esc(p.titulo)}</text>`;
    svg += `<text x="${M + 188}" y="${yy + 68}" font-family="${TEXTO}" font-size="21" font-weight="500" fill="${COLORES.suave}">${p.tipo === 'reel' ? 'Reel · se sube también como historia' : 'Historia'}${p.nombre === 'efemeride' ? ' · nueva' : ''}${p.fija ? ' · armada de antemano' : ''}</text>`;
    const locutora = p.voz === 'la locutora';
    const xv = ANCHO - M - 32 - 168;
    svg += chip(xv, yy + 22, locutora ? 'LOCUTORA' : p.voz === 'el locutor' ? 'LOCUTOR' : 'SIN VOZ', locutora
      ? { fondo: COLORES.ambar, color: COLORES.tinta, ancho: 168 } : { fondo: COLORES.tinta, ancho: 168 });
    if (p.fija) svg += chip(xv - 8 - 112, yy + 22, 'FIJA', { fondo: COLORES.verde, ancho: 112 });
    else if (p.nombre === 'efemeride') svg += chip(xv - 8 - 112, yy + 22, 'NUEVA', { fondo: COLOR_SECCION['Cultura y agenda'], ancho: 112 });
  });
  return { svg, alto };
}

/** La hoja entera, como SVG. */
export function hojaDelCronograma(semana, { titulo = 'Cronograma de las redes' } = {}) {
  const primero = semana[0]?.etiqueta ?? '';
  const ultimo = semana.at(-1)?.etiqueta ?? '';
  let y = 330;
  let cuerpo = '';
  for (const d of semana) {
    const t = tarjetaDelDia(d, y);
    cuerpo += t.svg;
    y += t.alto + 26;
  }
  const alto = y + 170;
  const leyenda = [
    ['LOCUTORA', { fondo: COLORES.ambar, color: COLORES.tinta, ancho: 168 }],
    ['LOCUTOR', { fondo: COLORES.tinta, ancho: 168 }],
    ['FIJA', { fondo: COLORES.verde, ancho: 112 }],
  ].map(([t, o], i) => chip(M + [0, 184, 368][i], 262, t, o)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${alto}" viewBox="0 0 ${ANCHO} ${alto}">
  <rect width="${ANCHO}" height="${alto}" fill="${COLORES.papel}"/>
  <text x="${M}" y="120" font-family="${TEXTO}" font-size="24" font-weight="700" letter-spacing="3.4" fill="${COLOR_SECCION['Cultura y agenda']}">INSTAGRAM Y FACEBOOK</text>
  <text x="${M}" y="196" font-family="${DISPLAY}" font-size="72" font-weight="900" fill="${COLORES.tinta}">${esc(titulo)}</text>
  <text x="${M}" y="244" font-family="${TEXTO}" font-size="28" font-weight="500" fill="${COLORES.gris}">${esc(primero)} al ${esc(ultimo)}</text>
  ${leyenda}
  <text x="${M + 560}" y="288" font-family="${TEXTO}" font-size="21" font-weight="500" fill="${COLORES.suave}">Fija = armada de antemano, sin voz nueva</text>
  ${cuerpo}
  <text x="${M}" y="${alto - 104}" font-family="${TEXTO}" font-size="21" font-weight="500" fill="${COLORES.suave}">Cada cuadrito es un audio del cupo de voz del día (10).</text>
  <text x="${M}" y="${alto - 76}" font-family="${TEXTO}" font-size="21" font-weight="500" fill="${COLORES.suave}">Los reels se suben también como historia, con el mismo video.</text>
  <text x="${M}" y="${alto - 24}" font-family="${DISPLAY}" font-size="28" font-weight="700" fill="${COLORES.tinta}">Radar <tspan fill="${COLORES.rojo}">Balcarce</tspan></text>
</svg>`;
}

if (process.argv[1] && process.argv[1].endsWith('hoja-cronograma.mjs')) {
  const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
  const semana = cronogramaDeLaSemana(arg('desde', diaAR()), Number(arg('dias', '7')), {
    conEfemeride: process.argv.includes('--con-efemeride'), fijas: arg('fijas').split(',').filter(Boolean),
  });
  const salida = path.resolve(arg('salida', 'reels/salida/cronograma.png'));
  await aPng(hojaDelCronograma(semana), salida);
  console.log(`Listo: ${salida}`);
}
