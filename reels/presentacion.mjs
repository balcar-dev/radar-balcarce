// El video de presentación de Radar Balcarce para el público general (4/10/2026, Hernán): qué es, cómo trabaja, qué tiene el sitio y dónde seguirnos.
// Sin nombres de personas: sólo "Radar Balcarce". Se dibuja cuadro por cuadro en SVG (con las mismas tipografías y colores de las placas), se convierte a PNG
// con resvg y se arma con ffmpeg, en dos formatos: vertical (1080 x 1920: reels, historias) y horizontal (1920 x 1080: Facebook, YouTube, la web).
//
//   node reels/presentacion.mjs                      los dos formatos, mudos (con el texto en pantalla)
//   node reels/presentacion.mjs --audio=voz.mp3      con la voz: las escenas se acomodan a lo que dura el audio
//   node reels/presentacion.mjs --solo=vertical      un solo formato
//   node reels/presentacion.mjs --cuadros            sólo un cuadro por escena (PNG), para mirar el diseño sin armar el video
//
// El guion que se lee está en GUION (y se escribe en reels/salida/presentacion/guion.txt): es lo que hay que pasar a una voz.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { COLORES, COLOR_SECCION, archivosDeFuente, anchoAproximado, envolverAncho } from './placa.mjs';

const correr = promisify(execFile);
// ffmpeg se carga recién cuando hace falta: las pruebas importan este archivo y en GitHub Actions no se instala nada.
const rutaDeFfmpeg = async () => (await import('ffmpeg-static')).default;
const SALIDA = path.join(import.meta.dirname, 'salida', 'presentacion');
const FPS = 30;
const DISPLAY = 'Source Serif 4 60pt';
const TEXTO = 'Inter';
const OSCURO = '#14161A';
const OSCURO_AZUL = '#1B2A33';

export const FORMATOS = {
  vertical: { nombre: 'vertical', W: 1080, H: 1920, v: true },
  horizontal: { nombre: 'horizontal', W: 1920, H: 1080, v: false },
};

/**
 * Las escenas: lo que se dice (`voz`), lo que se lee en pantalla (`caption`) y cuánto dura si no hay audio. Nada de nombres de personas.
 * Todo lo que se afirma es lo que hace el sistema hoy (CRITERIO-EDITORIAL.md).
 */
export const ESCENAS = [
  { id: 'marca', oscuro: true, voz: 'Radar Balcarce. Todo lo que pasa en Balcarce, en un solo lugar.', caption: 'Todo lo que pasa en Balcarce, en un solo lugar.' },
  { id: 'lectura', voz: 'Cada media hora leemos más de doscientos canales de noticias, de medios y organismos de Balcarce y la región.', caption: 'Leemos la información de Balcarce y la región, todo el día.' },
  { id: 'proceso', voz: 'Juntamos lo que cuentan, lo controlamos contra las fuentes y lo escribimos claro, sin gritar.', caption: 'Lo escribimos claro, sin gritar.' },
  { id: 'fuentes', voz: 'Usamos inteligencia artificial para redactar, y cada nota dice quién la escribió y de dónde sale la información.', caption: 'Cada nota dice quién la escribió y de dónde sale.' },
  { id: 'secciones', voz: 'Balcarce primero, y también política, policiales, deportes, agro, economía, cultura y más.', caption: 'Balcarce primero. Y todo lo demás.' },
  { id: 'servicios', voz: 'Y además, el clima, las farmacias de turno, la agenda y la cotización del dólar.', caption: 'Y los datos del día a día.' },
  { id: 'redes', voz: 'Seguinos en Facebook e Instagram: reels, historias y un repaso del día, tres veces por día.', caption: 'Seguinos en Facebook e Instagram.' },
  { id: 'cierre', oscuro: true, voz: 'Radar Balcarce. Las noticias de acá, siempre al día. Entrá a radarbalcarce punto com. Y si tenés algo para contarnos, escribinos.', caption: '¿Tenés algo para contarnos? Escribinos.' },
];

/** El texto completo que se lee, para pasárselo a una voz. */
export const GUION = ESCENAS.map((e) => e.voz).join('\n\n');

const palabras = (s) => s.split(/\s+/).filter(Boolean).length;
/** Cuánto dura cada escena: sin audio, por lo que cuesta leerla; con audio, repartido según las palabras de cada una. */
export function duracionesDeLasEscenas(totalAudio = null) {
  const pesos = ESCENAS.map((e) => Math.max(palabras(e.voz), 6));
  if (totalAudio) {
    const suma = pesos.reduce((a, b) => a + b, 0);
    return pesos.map((p) => (totalAudio * p) / suma);
  }
  return ESCENAS.map((e) => Math.max(4.2, palabras(e.voz) / 2.3 + 1.2));
}

// ------------------------------------------------------------------ dibujo

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lim = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = (x) => 1 - (1 - lim(x)) ** 3;
/** Cuánto va de una animación que empieza en `ini` y dura `dur` (0 a 1, con freno al final). */
const entra = (t, ini, dur = 0.5) => suave((t - ini) / dur);
const n2 = (x) => Math.round(x * 100) / 100;

function texto(x, y, s, { tam = 40, peso = 600, color = COLORES.tinta, ancla = 'middle', fam = TEXTO, op = 1, ls = 0 } = {}) {
  if (op <= 0.005) return '';
  return `<text x="${n2(x)}" y="${n2(y)}" font-family="${fam}" font-weight="${peso}" font-size="${tam}" fill="${color}" text-anchor="${ancla}" opacity="${n2(op)}"${ls ? ` letter-spacing="${ls}"` : ''}>${esc(s)}</text>`;
}

/** Anillos que se abren desde un centro, como un radar. */
function anillos(cx, cy, t, { color = COLORES.rojo, maximo = 900, cuantos = 4, vuelta = 4.5, grosor = 3, base = 0.55 } = {}) {
  let s = '';
  for (let i = 0; i < cuantos; i += 1) {
    const f = ((t / vuelta) + i / cuantos) % 1;
    s += `<circle cx="${cx}" cy="${cy}" r="${n2(40 + f * maximo)}" fill="none" stroke="${color}" stroke-width="${grosor}" opacity="${n2((1 - f) * base)}"/>`;
  }
  return s;
}

/** La marca: RADAR, el punto ámbar y BALCARCE, centrada en (cx, cy), con un tamaño base `k` (el alto de una línea). */
function marca(cx, cy, k, { clara = true, op = 1, escala = 1 } = {}) {
  if (op <= 0.005) return '';
  const tinta = clara ? '#F3F0E8' : COLORES.tinta;
  return `<g opacity="${n2(op)}" transform="translate(${cx} ${cy}) scale(${n2(escala)})">
    ${texto(0, -k * 0.55, 'RADAR', { tam: k, peso: 900, fam: DISPLAY, color: tinta })}
    <circle cx="0" cy="${n2(k * 0.02)}" r="${n2(k * 0.095)}" fill="${COLORES.ambar}"/>
    ${texto(0, k * 0.95, 'BALCARCE', { tam: k * 0.84, peso: 900, fam: DISPLAY, color: clara ? '#D8421F' : COLORES.rojo })}
  </g>`;
}

/** Una marca chica arriba, para las escenas de contenido. */
function marcaChica(f, op) {
  const x = f.v ? 72 : 96;
  const y = f.v ? 150 : 100;
  return `<g opacity="${n2(op)}">
    ${texto(x, y, 'Radar', { tam: f.v ? 46 : 40, peso: 900, fam: DISPLAY, ancla: 'start', color: COLORES.tinta })}
    ${texto(x + anchoAproximado('Radar ', f.v ? 46 : 40, 'serif') + 4, y, 'Balcarce', { tam: f.v ? 46 : 40, peso: 900, fam: DISPLAY, ancla: 'start', color: COLORES.rojo })}
  </g>`;
}

/** El texto de abajo: el renglón de lo que se dice, grande y centrado. */
function pie(f, caption, t, color) {
  const tam = f.v ? 62 : 50;
  const lineas = envolverAncho(caption, tam, f.W - (f.v ? 150 : 400), 'sans');
  const alto = tam * 1.28;
  const y0 = f.v ? 1480 : 860;
  const op = entra(t, 0.35, 0.5);
  const subir = (1 - op) * 24;
  return lineas.map((l, i) => texto(f.W / 2, y0 + subir + i * alto, l, { tam, peso: 700, color, op })).join('');
}

// ------------------------------------------------------------------ las escenas

function escenaMarca(f, t, dur) {
  const cx = f.W / 2; const cy = f.H * (f.v ? 0.42 : 0.44);
  const k = f.v ? 210 : 190;
  const aparece = entra(t, 0.4, 0.8);
  return `${anillos(cx, cy, t, { maximo: f.v ? 1000 : 900 })}
    ${marca(cx, cy, k, { op: aparece, escala: 0.88 + aparece * 0.12 })}
    ${pie(f, ESCENAS[0].caption, t, '#F3F0E8')}`;
}

function escenaLectura(f, t) {
  const R = f.v ? 330 : 280;
  const cx = f.v ? f.W / 2 : 520; const cy = f.v ? 640 : 480;
  const barrido = ((t * 110) % 360);
  const puntos = [[0.62, 20], [0.4, 75], [0.85, 130], [0.55, 190], [0.3, 240], [0.78, 285], [0.5, 330], [0.9, 40], [0.7, 215], [0.25, 150]];
  const rad = (g) => (g - 90) * Math.PI / 180;
  const cuña = (g, ancho) => {
    const a0 = rad(g - ancho); const a1 = rad(g);
    return `M ${cx} ${cy} L ${n2(cx + R * Math.cos(a0))} ${n2(cy + R * Math.sin(a0))} A ${R} ${R} 0 0 1 ${n2(cx + R * Math.cos(a1))} ${n2(cy + R * Math.sin(a1))} Z`;
  };
  let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>`;
  for (const r of [0.33, 0.66]) s += `<circle cx="${cx}" cy="${cy}" r="${n2(R * r)}" fill="none" stroke="${COLORES.lineaSuave}" stroke-width="3"/>`;
  s += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${COLORES.lineaSuave}" stroke-width="3"/><line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="${COLORES.lineaSuave}" stroke-width="3"/>`;
  s += `<path d="${cuña(barrido, 55)}" fill="${COLORES.rojo}" opacity="0.18"/><path d="${cuña(barrido, 20)}" fill="${COLORES.rojo}" opacity="0.2"/>`;
  s += `<line x1="${cx}" y1="${cy}" x2="${n2(cx + R * Math.cos(rad(barrido)))}" y2="${n2(cy + R * Math.sin(rad(barrido)))}" stroke="${COLORES.rojo}" stroke-width="5"/>`;
  for (const [r, g] of puntos) {
    const desde = (barrido - g + 360) % 360; // cuánto hace que pasó el barrido por este punto
    const brillo = lim(1 - desde / 200) * lim(t / 0.6);
    const x = cx + R * r * Math.cos(rad(g)); const y = cy + R * r * Math.sin(rad(g));
    s += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(11 + brillo * 12)}" fill="${COLORES.ambar}" opacity="${n2(brillo * 0.35)}"/><circle cx="${n2(x)}" cy="${n2(y)}" r="11" fill="${COLORES.ambar}" opacity="${n2(0.25 + brillo * 0.75)}"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="12" fill="${COLORES.rojo}"/>`;

  // Los números: cuentan hasta su valor.
  const datos = [
    { n: 200, mas: '+', texto: 'canales de noticias', ini: 0.7 },
    { n: 90, mas: '', texto: 'medios y organismos', ini: 1.0 },
    { n: 30, mas: '', texto: 'minutos entre cada lectura', ini: 1.3 },
  ];
  datos.forEach((d, i) => {
    const p = entra(t, d.ini, 1.1);
    const x = f.v ? 72 + 312 * i + 156 : 1130;
    const y = f.v ? 1100 : 270 + i * 170;
    const tamN = f.v ? 104 : 96;
    const cifra = `${Math.round(d.n * p)}${p > 0.98 ? d.mas : ''}`;
    if (f.v) {
      s += texto(x, y, cifra, { tam: tamN, peso: 900, fam: DISPLAY, color: COLORES.rojo, op: lim(p * 3) });
      envolverAncho(d.texto, 30, 290, 'sans').forEach((l, j) => { s += texto(x, y + 52 + j * 38, l, { tam: 30, peso: 600, color: COLORES.gris, op: lim(p * 3) }); });
    } else {
      s += texto(x, y, cifra, { tam: tamN, peso: 900, fam: DISPLAY, color: COLORES.rojo, ancla: 'start', op: lim(p * 3) });
      s += texto(x + 250, y - 8, d.texto, { tam: 38, peso: 600, color: COLORES.gris, ancla: 'start', op: lim(p * 3) });
    }
  });
  return s;
}

function escenaProceso(f, t) {
  const pasos = [
    { t: 'Leemos', d: 'medios y organismos de Balcarce y la región' },
    { t: 'Juntamos', d: 'lo mismo contado por varios, en una sola nota' },
    { t: 'Controlamos', d: 'cada dato contra lo que dicen las fuentes' },
    { t: 'Escribimos', d: 'claro, directo y sin gritar' },
  ];
  let s = '';
  pasos.forEach((p, i) => {
    const a = entra(t, 0.5 + i * 0.9, 0.55);
    const marcar = entra(t, 0.9 + i * 0.9, 0.35);
    if (f.v) {
      const y = 330 + i * 245; const x = 72;
      s += `<g opacity="${n2(a)}" transform="translate(${n2((1 - a) * 60)} 0)">
        <rect x="${x}" y="${y}" width="936" height="205" rx="26" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
        <circle cx="${x + 100}" cy="${y + 102}" r="52" fill="${COLORES.rojo}"/>
        ${texto(x + 100, y + 124, String(i + 1), { tam: 66, peso: 900, fam: DISPLAY, color: '#FFFFFF' })}
        ${texto(x + 190, y + 90, p.t, { tam: 66, peso: 900, fam: DISPLAY, ancla: 'start' })}
        ${envolverAncho(p.d, 34, 600, 'sans').map((l, j) => texto(x + 190, y + 140 + j * 40, l, { tam: 34, peso: 500, color: COLORES.gris, ancla: 'start' })).join('')}
        <path d="M ${x + 866} ${y + 100} l 22 22 l 44 -50" transform="translate(-40 0)" fill="none" stroke="${COLORES.verde}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="${n2(marcar)}"/>
      </g>`;
    } else {
      const w = 390; const x = 120 + i * (w + 40); const y = 200;
      s += `<g opacity="${n2(a)}" transform="translate(0 ${n2((1 - a) * 50)})">
        <rect x="${x}" y="${y}" width="${w}" height="440" rx="26" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
        <circle cx="${x + 70}" cy="${y + 90}" r="46" fill="${COLORES.rojo}"/>
        ${texto(x + 70, y + 110, String(i + 1), { tam: 58, peso: 900, fam: DISPLAY, color: '#FFFFFF' })}
        ${texto(x + 36, y + 230, p.t, { tam: 56, peso: 900, fam: DISPLAY, ancla: 'start' })}
        ${envolverAncho(p.d, 32, w - 70, 'sans').map((l, j) => texto(x + 36, y + 290 + j * 40, l, { tam: 32, peso: 500, color: COLORES.gris, ancla: 'start' })).join('')}
        <path d="M ${x + w - 100} ${y + 80} l 18 18 l 38 -44" fill="none" stroke="${COLORES.verde}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="${n2(marcar)}"/>
      </g>`;
    }
  });
  return s;
}

function escenaFuentes(f, t) {
  const w = f.v ? 936 : 900; const h = f.v ? 820 : 560;
  const x = f.v ? 72 : 130; const y = f.v ? 300 : 150;
  const a = entra(t, 0.2, 0.7);
  const barra = (bx, by, bw, bh, ini, color = COLORES.lineaSuave) => `<rect x="${bx}" y="${by}" width="${n2(bw * entra(t, ini, 0.7))}" height="${bh}" rx="${bh / 2}" fill="${color}"/>`;
  let s = `<g opacity="${n2(a)}" transform="translate(0 ${n2((1 - a) * 70)})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
    <rect x="${x + 40}" y="${y + 40}" width="170" height="46" rx="23" fill="${COLOR_SECCION.Balcarce}"/>
    ${texto(x + 125, y + 73, 'Balcarce', { tam: 28, peso: 700, color: '#FFFFFF' })}
    ${barra(x + 40, y + 120, w - 80, 34, 0.8, '#D6D2C6')}
    ${barra(x + 40, y + 170, (w - 80) * 0.7, 34, 1.0, '#D6D2C6')}
    ${[0, 1, 2, 3].map((i) => barra(x + 40, y + 250 + i * 46, (w - 80) * (i === 3 ? 0.55 : 1), 20, 1.2 + i * 0.15)).join('')}`;
  // La firma y el desplegable de fuentes.
  const yf = y + (f.v ? 470 : 460);
  const firma = envolverAncho('Escrita con inteligencia artificial y controlada contra las fuentes.', f.v ? 32 : 28, w - 80, 'sans');
  s += firma.map((l, i) => texto(x + 40, yf + i * 40, l, { tam: f.v ? 32 : 28, peso: 600, color: COLORES.gris, ancla: 'start', op: entra(t, 2.0, 0.5) })).join('');
  const abre = entra(t, 3.0, 0.6);
  const yy = yf + 40 * firma.length + 20;
  s += `<g opacity="${n2(entra(t, 2.5, 0.5))}">
      <rect x="${x + 40}" y="${yy}" width="${w - 80}" height="${n2(70 + abre * (f.v ? 170 : 0))}" rx="16" fill="${COLORES.papel}" stroke="${COLORES.linea}" stroke-width="3"/>
      ${texto(x + 70, yy + 46, 'Fuentes (3)', { tam: 34, peso: 700, ancla: 'start' })}
      <path d="M ${x + w - 110} ${yy + 28} l 20 ${n2(20 * (1 - abre * 2))} l 20 ${n2(-20 * (1 - abre * 2))}" fill="none" stroke="${COLORES.gris}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  if (f.v) {
    ['Un medio de Balcarce', 'Otro medio de la zona', 'Un organismo oficial'].forEach((n, i) => {
      s += texto(x + 70, yy + 120 + i * 48, `· ${n}`, { tam: 30, peso: 500, color: COLORES.gris, ancla: 'start', op: entra(t, 3.5 + i * 0.25, 0.4) });
    });
  }
  return `${s}</g>`;
}

function chips(f, lista, t, { ini = 0.3, paso = 0.28, tam, y0, margen = 72 } = {}) {
  const gap = 18; const padX = tam * 0.7; const alto = tam * 1.9;
  const ancho = (c) => anchoAproximado(c.nombre, tam, 'sans') + padX * 2;
  const filas = []; let fila = []; let usado = 0; const disponible = f.W - margen * 2;
  for (const c of lista) {
    const w = ancho(c);
    if (fila.length && usado + gap + w > disponible) { filas.push(fila); fila = []; usado = 0; }
    fila.push({ ...c, w }); usado += (fila.length > 1 ? gap : 0) + w;
  }
  if (fila.length) filas.push(fila);
  let s = ''; let n = 0;
  filas.forEach((fl, r) => {
    const total = fl.reduce((a, c) => a + c.w, 0) + gap * (fl.length - 1);
    let x = (f.W - total) / 2;
    fl.forEach((c) => {
      const p = entra(t, ini + n * paso, 0.45); n += 1;
      const cy = y0 + r * (alto + gap) + alto / 2;
      const cx = x + c.w / 2;
      s += `<g opacity="${n2(lim(p * 2))}" transform="translate(${n2(cx)} ${n2(cy)}) scale(${n2(0.6 + 0.4 * p)})">
        <rect x="${n2(-c.w / 2)}" y="${n2(-alto / 2)}" width="${n2(c.w)}" height="${n2(alto)}" rx="${n2(alto / 2)}" fill="${c.color}"/>
        ${texto(0, tam * 0.36, c.nombre, { tam, peso: 700, color: '#FFFFFF' })}
      </g>`;
      x += c.w + gap;
    });
  });
  return s;
}

function escenaSecciones(f, t) {
  const lista = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología', 'Argentina']
    .map((nombre) => ({ nombre, color: COLOR_SECCION[nombre] ?? COLORES.tinta }));
  return chips(f, lista, t, { tam: f.v ? 46 : 42, y0: f.v ? 500 : 300, paso: 0.3, margen: f.v ? 60 : 200 });
}

function icono(tipo, cx, cy, k, color = '#FFFFFF') {
  const t = k / 100;
  if (tipo === 'clima') {
    let s = `<circle cx="${cx}" cy="${cy}" r="${24 * t}" fill="${color}"/>`;
    for (let i = 0; i < 8; i += 1) { const a = (i * Math.PI) / 4; s += `<line x1="${n2(cx + Math.cos(a) * 38 * t)}" y1="${n2(cy + Math.sin(a) * 38 * t)}" x2="${n2(cx + Math.cos(a) * 52 * t)}" y2="${n2(cy + Math.sin(a) * 52 * t)}" stroke="${color}" stroke-width="${7 * t}" stroke-linecap="round"/>`; }
    return s;
  }
  if (tipo === 'farmacia') return `<path d="M ${cx - 16 * t} ${cy - 50 * t} h ${32 * t} v ${34 * t} h ${34 * t} v ${32 * t} h ${-34 * t} v ${34 * t} h ${-32 * t} v ${-34 * t} h ${-34 * t} v ${-32 * t} h ${34 * t} z" fill="${color}"/>`;
  if (tipo === 'agenda') return `<rect x="${cx - 48 * t}" y="${cy - 42 * t}" width="${96 * t}" height="${90 * t}" rx="${12 * t}" fill="none" stroke="${color}" stroke-width="${8 * t}"/><line x1="${cx - 48 * t}" y1="${cy - 12 * t}" x2="${cx + 48 * t}" y2="${cy - 12 * t}" stroke="${color}" stroke-width="${8 * t}"/><line x1="${cx - 22 * t}" y1="${cy - 56 * t}" x2="${cx - 22 * t}" y2="${cy - 30 * t}" stroke="${color}" stroke-width="${8 * t}" stroke-linecap="round"/><line x1="${cx + 22 * t}" y1="${cy - 56 * t}" x2="${cx + 22 * t}" y2="${cy - 30 * t}" stroke="${color}" stroke-width="${8 * t}" stroke-linecap="round"/><circle cx="${cx - 20 * t}" cy="${cy + 20 * t}" r="${7 * t}" fill="${color}"/><circle cx="${cx + 20 * t}" cy="${cy + 20 * t}" r="${7 * t}" fill="${color}"/>`;
  return texto(cx, cy + 36 * t, '$', { tam: 120 * t, peso: 900, fam: DISPLAY, color });
}

function escenaServicios(f, t) {
  const tiles = [
    { tipo: 'clima', nombre: 'El clima', color: COLOR_SECCION.Clima },
    { tipo: 'farmacia', nombre: 'Farmacias de turno', color: COLOR_SECCION.Farmacias },
    { tipo: 'agenda', nombre: 'La agenda', color: COLOR_SECCION['Cultura y agenda'] },
    { tipo: 'dolar', nombre: 'El dólar', color: COLOR_SECCION.Economía },
  ];
  const w = f.v ? 450 : 390; const h = f.v ? 420 : 480; const gap = 36;
  let s = '';
  tiles.forEach((c, i) => {
    const col = f.v ? i % 2 : i; const fila = f.v ? Math.floor(i / 2) : 0;
    const x = f.v ? 72 + col * (w + gap) : 120 + col * (w + gap + 0);
    const y = f.v ? 330 + fila * (h + gap) : 200;
    const p = entra(t, 0.4 + i * 0.5, 0.55);
    s += `<g opacity="${n2(lim(p * 2))}" transform="translate(${n2(x + w / 2)} ${n2(y + h / 2)}) scale(${n2(0.85 + 0.15 * p)}) translate(${-(x + w / 2)} ${-(y + h / 2)})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="32" fill="${c.color}"/>
      ${icono(c.tipo, x + w / 2, y + h * 0.4, f.v ? 190 : 170)}
      ${texto(x + w / 2, y + h - 62, c.nombre, { tam: f.v ? 40 : 38, peso: 700, color: '#FFFFFF' })}
    </g>`;
  });
  return s;
}

function escenaRedes(f, t) {
  const tarjetas = [
    { red: 'Facebook', nombre: 'Radar Balcarce', fondo: COLORES.tinta, tinta: '#FFFFFF', suave: '#C9CDD2' },
    { red: 'Instagram', nombre: '@radarbalcarce', fondo: COLORES.rojo, tinta: '#FFFFFF', suave: '#FBE3DB' },
  ];
  const w = f.v ? 936 : 780; const h = f.v ? 300 : 380;
  let s = '';
  tarjetas.forEach((c, i) => {
    const x = f.v ? 72 : 120 + i * (w + 60 - 0);
    const y = f.v ? 330 + i * (h + 40) : 200;
    const p = entra(t, 0.4 + i * 0.6, 0.6);
    s += `<g opacity="${n2(lim(p * 2))}" transform="translate(${n2((1 - p) * (f.v ? 80 : 0))} ${n2(f.v ? 0 : (1 - p) * 60)})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="32" fill="${c.fondo}"/>
      ${texto(x + 56, y + h * 0.4, c.red, { tam: f.v ? 60 : 54, peso: 600, color: c.suave, ancla: 'start' })}
      ${texto(x + 56, y + h * 0.4 + (f.v ? 100 : 96), c.nombre, { tam: f.v ? 78 : 72, peso: 900, fam: DISPLAY, color: c.tinta, ancla: 'start' })}
    </g>`;
  });
  const lista = [{ nombre: 'Reels con voz', color: COLOR_SECCION.Deportes }, { nombre: 'Historias', color: COLOR_SECCION['Cultura y agenda'] }, { nombre: 'El repaso del día, 3 por día', color: COLOR_SECCION.Política }];
  const y0 = f.v ? 1010 : 640;
  const tam = f.v ? 38 : 34;
  s += chips({ ...f, W: f.W }, lista, t, { tam, y0: f.v ? 1020 : 640, ini: 2.0, paso: 0.4, margen: f.v ? 70 : 140 });
  return s + (y0 ? '' : '');
}

function escenaCierre(f, t) {
  const cx = f.W / 2; const cy = f.H * (f.v ? 0.3 : 0.25);
  const aparece = entra(t, 0.2, 0.7);
  return `${anillos(cx, cy, t, { maximo: f.v ? 900 : 800 })}
    ${marca(cx, cy, f.v ? 150 : 120, { op: aparece })}
    ${texto(cx, f.v ? 880 : 580, 'radarbalcarce.com', { tam: f.v ? 84 : 84, peso: 700, color: '#F3F0E8', op: entra(t, 1.0, 0.6) })}
    ${texto(cx, f.v ? 990 : 665, 'Facebook: Radar Balcarce', { tam: f.v ? 46 : 44, peso: 600, color: '#C9CDD2', op: entra(t, 1.5, 0.6) })}
    ${texto(cx, f.v ? 1060 : 725, 'Instagram: @radarbalcarce', { tam: f.v ? 46 : 44, peso: 600, color: '#C9CDD2', op: entra(t, 1.8, 0.6) })}
    ${pie(f, ESCENAS[7].caption, Math.max(0, t - 1.5), '#E8A33C')}`;
}

const DIBUJAR = { marca: escenaMarca, lectura: escenaLectura, proceso: escenaProceso, fuentes: escenaFuentes, secciones: escenaSecciones, servicios: escenaServicios, redes: escenaRedes, cierre: escenaCierre };

/** Una escena ya sin el fondo ni la marca chica ni el pie: sólo lo que la distingue. */
function contenido(f, e, t, dur) {
  const cuerpo = DIBUJAR[e.id](f, t, dur);
  return cuerpo;
}

/** El SVG de un cuadro: en el instante `tt` (segundos desde el principio del video). */
export function cuadro(f, tt, duraciones) {
  let inicio = 0; let i = 0;
  while (i < ESCENAS.length - 1 && tt >= inicio + duraciones[i]) { inicio += duraciones[i]; i += 1; }
  const e = ESCENAS[i]; const dur = duraciones[i]; const t = tt - inicio;
  const { W, H } = f;
  const siguiente = ESCENAS[i + 1];
  const oscuro = e.oscuro;
  const fondo = oscuro
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${OSCURO_AZUL}"/><stop offset="0.6" stop-color="${OSCURO}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`
    : `<rect width="${W}" height="${H}" fill="${COLORES.papel}"/>`;
  const aparece = oscuro ? 1 : entra(t, 0, 0.35);
  const sale = e.id === 'redes' || !siguiente || siguiente.oscuro || oscuro ? 1 : 1 - entra(t - (dur - 0.35), 0, 0.35);
  let cuerpo = contenido(f, e, t, dur);
  if (!oscuro) {
    cuerpo = `<g opacity="${n2(aparece * sale)}">${marcaChica(f, 1)}${cuerpo}${pie(f, e.caption, t, COLORES.tinta)}</g>`;
  }
  // El paso entre escenas: un círculo que se abre desde el centro, como una onda de radar, tapa la escena que termina.
  let onda = '';
  if (siguiente && (oscuro || siguiente.oscuro) && t > dur - 0.8) {
    const p = entra(t - (dur - 0.8), 0, 0.8);
    onda = `<circle cx="${W / 2}" cy="${H * 0.45}" r="${n2(p * Math.hypot(W, H))}" fill="${siguiente.oscuro ? OSCURO : COLORES.papel}"/>`;
  }
  if (e.id === 'redes' && siguiente?.oscuro && t > dur - 0.8) { /* la onda ya se dibujó arriba */ }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${fondo}${cuerpo}${onda}</svg>`;
}

// ------------------------------------------------------------------ armado

async function duracionDelAudio(ruta) {
  try {
    await correr(await rutaDeFfmpeg(), ['-i', ruta]);
  } catch (e) {
    const m = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(String(e.stderr ?? ''));
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  throw new Error(`No pude leer la duración del audio ${ruta}`);
}

async function convertidor() {
  const { Resvg } = await import('@resvg/resvg-js');
  const fontFiles = archivosDeFuente();
  return (svg, ancho) => new Resvg(svg, { fitTo: { mode: 'width', value: ancho }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: TEXTO } }).render().asPng();
}

export async function armar(f, { audio = null, soloCuadros = false, cola = 1.2 } = {}) {
  fs.mkdirSync(SALIDA, { recursive: true });
  const aPng = await convertidor();
  const totalAudio = audio ? await duracionDelAudio(audio) : null;
  const duraciones = duracionesDeLasEscenas(totalAudio ? totalAudio - cola : null);
  if (totalAudio) duraciones[duraciones.length - 1] += cola;
  const total = duraciones.reduce((a, b) => a + b, 0);
  if (soloCuadros) {
    let inicio = 0;
    ESCENAS.forEach((e, i) => {
      const medio = inicio + Math.min(duraciones[i] - 0.1, Math.max(2.5, duraciones[i] * 0.8));
      fs.writeFileSync(path.join(SALIDA, `cuadro-${f.nombre}-${i + 1}-${e.id}.png`), aPng(cuadro(f, medio, duraciones), f.W));
      inicio += duraciones[i];
    });
    return { total, duraciones };
  }
  const destino = path.join(SALIDA, `presentacion-${f.nombre}.mp4`);
  const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', ...(audio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
    ...(audio ? ['-c:a', 'aac', '-b:a', '192k'] : []), '-t', String(n2(total)), '-movflags', '+faststart', destino];
  const p = spawn(await rutaDeFfmpeg(), args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let errores = '';
  p.stderr.on('data', (d) => { errores += d; });
  const termino = new Promise((resolver, rechazar) => { p.on('close', (c) => (c === 0 ? resolver() : rechazar(new Error(`ffmpeg salió con ${c}: ${errores.slice(-400)}`)))); });
  const cuadros = Math.ceil(total * FPS);
  for (let n = 0; n < cuadros; n += 1) {
    const png = aPng(cuadro(f, n / FPS, duraciones), f.W);
    if (!p.stdin.write(png)) await new Promise((r) => p.stdin.once('drain', r));
    if (n % 150 === 0) console.log(`  ${f.nombre}: ${n}/${cuadros}`);
  }
  p.stdin.end();
  await termino;
  return { destino, total, duraciones };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  const arg = (nombre) => (process.argv.find((a) => a.startsWith(`--${nombre}=`)) ?? '').split('=')[1] || null;
  const audio = arg('audio');
  const solo = arg('solo');
  const soloCuadros = process.argv.includes('--cuadros');
  fs.mkdirSync(SALIDA, { recursive: true });
  fs.writeFileSync(path.join(SALIDA, 'guion.txt'), `${GUION}\n`, 'utf8');
  for (const f of Object.values(FORMATOS).filter((x) => !solo || x.nombre === solo)) {
    const r = await armar(f, { audio, soloCuadros });
    console.log(`${f.nombre}: ${soloCuadros ? 'cuadros en' : r.destino} (${n2(r.total)} s)`);
  }
}
