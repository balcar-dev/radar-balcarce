// Las escenas del clima (8/10/2026; docs/propuestas/PLANTILLAS-DE-PIEZAS.md): el clima de la mañana, el de la noche y el aviso, cada uno con su
// ilustración según cómo está el cielo. Es una propuesta para aprobar: mientras no se apruebe, el clima sale con la placa de siempre.
//
//   mañana y noche   un panel de cielo con la temperatura (que cuenta hasta su valor) y una ilustración que se mueve, y debajo los días que vienen
//   aviso            el mismo panel, pero con el aviso como protagonista y el color de la alerta
//
// Los números salen de lo que ya trae la portada (portada.clima); lo que no hay no se dibuja (regla 140: nunca "0 % de lluvia").

import {
  COLOR_SECCION, COLORES, DISPLAY, TEXTO, MARGEN, cabecera, rotulo, repartir, renglones, esc,
} from '../placa.mjs';
import {
  W, clamp, prog, easeOut, entra, aparece, azar, escenaSobrePapel, crearEscena,
} from './comun.mjs';

// ------------------------------------------------------------------ qué cielo es

/** Las bases del cielo. De noche son las mismas con luna y estrellas (`noche`). */
export const BASES = ['despejado', 'parcial', 'nublado', 'llovizna', 'lluvia', 'tormenta', 'niebla'];

/** El tipo de cielo a partir del texto de Open-Meteo o met.no ("Chaparrones fuertes", "Algo nublado"…). */
export function baseDelCielo(cielo = '') {
  const c = String(cielo).toLowerCase();
  if (/torment|granizo/.test(c)) return 'tormenta';
  if (/llovizna/.test(c)) return 'llovizna';
  if (/lluv|chaparr/.test(c)) return 'lluvia';
  if (/niebla|neblina|bruma/.test(c)) return 'niebla';
  if (/parcial|algo nublado|intervalos|poco nublado/.test(c)) return 'parcial';
  if (/nubl|cubierto/.test(c)) return 'nublado';
  return 'despejado';
}

/** El nombre de la variante ("lluvia", "despejado-noche", "aviso-helada"…). */
export const nombreDeVariante = ({ cielo, esDeDia = true }) => `${baseDelCielo(cielo)}${esDeDia ? '' : '-noche'}`;

/** Fondo del panel (de arriba hacia abajo), color del texto y acento, por base y por momento del día. */
const PALETAS = {
  despejado: { dia: ['#FFD98A', '#FFF1D0'], noche: ['#0E1A33', '#22385C'], acento: '#E8A33C' },
  parcial: { dia: ['#BFDDF2', '#EEF5FA'], noche: ['#14213B', '#2D4062'], acento: '#E8A33C' },
  nublado: { dia: ['#B8C0CA', '#E4E8EC'], noche: ['#222A38', '#3B4556'], acento: '#7FA6C9' },
  llovizna: { dia: ['#9FB3C6', '#D3DEE8'], noche: ['#1A2535', '#2C3C52'], acento: '#4F86B8' },
  lluvia: { dia: ['#52677F', '#7D92A8'], noche: ['#131D2C', '#25364D'], acento: '#7FB2E5' },
  tormenta: { dia: ['#2C3441', '#4B5568'], noche: ['#0C111B', '#222B3A'], acento: '#F2C94C' },
  niebla: { dia: ['#CBCFD3', '#EEEFF0'], noche: ['#2A3038', '#444C57'], acento: '#9AA7B3' },
};
/** Los avisos: el color de la alerta. */
const PALETAS_AVISO = {
  helada: { fondo: ['#BFE3F5', '#EAF6FC'], oscuro: false, acento: '#0B6FB8', nombre: 'HELADA' },
  granizo: { fondo: ['#2F3A49', '#5B6779'], oscuro: true, acento: '#F2C94C', nombre: 'GRANIZO' },
  viento: { fondo: ['#B3C4D2', '#E1E9EF'], oscuro: false, acento: '#C7381C', nombre: 'VIENTO FUERTE' },
};

const TINTA = COLORES.tinta;
const BLANCO = '#FFFFFF';

// ------------------------------------------------------------------ las ilustraciones

/** Una nube que cruza el panel de lado a lado, sin saltos: `vel` en píxeles por segundo, `fase` desplaza dónde arranca. */
function nubeQueCruza(t, { y, escala, vel, fase, ancho, color, op = 1 }) {
  const largo = ancho + 420 * escala;
  const x = ((fase + t * vel) % largo + largo) % largo - 210 * escala;
  return `<g transform="translate(${x.toFixed(1)} ${y}) scale(${escala})" opacity="${op}" fill="${color}">
    <circle cx="0" cy="0" r="46"/><circle cx="62" cy="-28" r="62"/><circle cx="132" cy="-4" r="48"/><rect x="-46" y="-4" width="226" height="50" rx="25"/></g>`;
}

function sol(t, cx, cy, subir = 1) {
  const y = cy + (1 - subir) * 220;
  const rayos = Array.from({ length: 12 }, (_, i) => {
    const ang = ((i * 30 + t * 7) * Math.PI) / 180;
    const r1 = 128;
    const r2 = 172 + 12 * Math.sin(t * 2.2 + i);
    return `<line x1="${(cx + r1 * Math.cos(ang)).toFixed(1)}" y1="${(y + r1 * Math.sin(ang)).toFixed(1)}" x2="${(cx + r2 * Math.cos(ang)).toFixed(1)}" y2="${(y + r2 * Math.sin(ang)).toFixed(1)}" stroke="#F2A93B" stroke-width="14" stroke-linecap="round"/>`;
  }).join('');
  return `<circle cx="${cx}" cy="${y.toFixed(1)}" r="${(150 + 8 * Math.sin(t * 1.4)).toFixed(1)}" fill="#FFFFFF" opacity="0.22"/>${rayos}<circle cx="${cx}" cy="${y.toFixed(1)}" r="${(104 + 3 * Math.sin(t * 2)).toFixed(1)}" fill="#F7B93E"/>`;
}

function luna(t, cx, cy, subir = 1) {
  const y = cy + (1 - subir) * 200;
  return `<circle cx="${cx}" cy="${y.toFixed(1)}" r="${(165 + 6 * Math.sin(t * 1.2)).toFixed(1)}" fill="#F1EBCB" opacity="0.10"/>
  <g transform="translate(${cx - 124} ${(y - 130).toFixed(1)}) scale(11)"><path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" fill="#F1EBCB"/></g>`;
}

function estrellas(t, x0, y0, ancho, alto, cuantas = 22) {
  return Array.from({ length: cuantas }, (_, i) => {
    const x = x0 + azar(i + 1) * ancho;
    const y = y0 + azar(i + 50) * alto;
    const r = 2 + azar(i + 99) * 3.2;
    // Titilan despacio (un ciclo cada 3 a 6 segundos): nada que parpadee rápido.
    const op = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (1.0 + azar(i + 150) * 1.2) + i * 1.7));
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#FFFFFF" opacity="${op.toFixed(2)}"/>`;
  }).join('');
}

function lluviaCayendo(t, { x0, y0, ancho, alto, cuantas, vel, largo, color, grosor = 4, op = 0.5, inclinacion = 0.14 }) {
  return Array.from({ length: cuantas }, (_, i) => {
    const x = x0 + azar(i + 7) * (ancho + 80);
    const v = vel * (0.8 + azar(i + 31) * 0.5);
    const recorrido = alto + largo * 2;
    const y = y0 + (((t * v + azar(i + 61) * recorrido) % recorrido) - largo);
    return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - largo * inclinacion).toFixed(1)}" y2="${(y + largo).toFixed(1)}" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" opacity="${op}"/>`;
  }).join('');
}

function bandasDeNiebla(t, x0, y0, ancho, alto, color) {
  return Array.from({ length: 6 }, (_, i) => {
    const y = y0 + (i + 0.5) * (alto / 6);
    const vel = (i % 2 ? 1 : -1) * (14 + i * 5);
    const x = ((t * vel) % 400) - 200;
    return `<rect x="${(x0 + x - 120).toFixed(1)}" y="${y.toFixed(1)}" width="${ancho + 500}" height="46" rx="23" fill="${color}" opacity="${(0.28 + 0.06 * (i % 3)).toFixed(2)}"/>`;
  }).join('');
}

/** Un destello (uno solo cada 6 segundos, nunca parpadeo): sube de golpe y se apaga en un cuarto de segundo. */
function destello(t, { cada = 6, desde = 2.2 } = {}) {
  const fase = (t - desde) % cada;
  if (t < desde || fase > 0.28) return 0;
  return (1 - fase / 0.28) * 0.5;
}

function rayo(cx, cy, op) {
  if (op <= 0) return '';
  return `<polygon points="${cx},${cy} ${cx - 62},${cy + 150} ${cx - 8},${cy + 150} ${cx - 56},${cy + 300} ${cx + 66},${cy + 112} ${cx + 8},${cy + 112} ${cx + 52},${cy}" fill="#FFE27A" opacity="${Math.min(1, op * 2).toFixed(2)}"/>`;
}

function copoDeHielo(cx, cy, radio, rot, op) {
  const brazos = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 + rot) * Math.PI) / 180;
    const ex = cx + radio * Math.cos(a);
    const ey = cy + radio * Math.sin(a);
    const ramas = [0.45, 0.7].map((f) => {
      const bx = cx + radio * f * Math.cos(a);
      const by = cy + radio * f * Math.sin(a);
      const l = radio * 0.22;
      return [-1, 1].map((s) => `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + l * Math.cos(a + s * 0.9)).toFixed(1)}" y2="${(by + l * Math.sin(a + s * 0.9)).toFixed(1)}"/>`).join('');
    }).join('');
    return `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"/>${ramas}`;
  }).join('');
  return `<g stroke="#0B6FB8" stroke-width="9" stroke-linecap="round" fill="none" opacity="${op.toFixed(2)}">${brazos}</g>`;
}

function pedrisco(t, { x0, y0, ancho, alto, cuantas }) {
  return Array.from({ length: cuantas }, (_, i) => {
    const x = x0 + azar(i + 3) * ancho;
    const ciclo = 1.5 + azar(i + 20) * 0.9;
    const f = ((t + azar(i + 40) * ciclo) % ciclo) / ciclo;
    const caida = Math.min(1, f / 0.7);
    // Cae con aceleración y, al llegar abajo, rebota una vez.
    let y = y0 + alto * (caida * caida);
    if (f > 0.7) y = y0 + alto - 70 * Math.abs(Math.sin(((f - 0.7) / 0.3) * Math.PI)) * (1 - (f - 0.7) / 0.3);
    const r = 11 + azar(i + 77) * 9;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#FFFFFF" stroke="#C9D6E2" stroke-width="3" opacity="0.95"/>`;
  }).join('');
}

function lineasDeViento(t, { x0, y0, ancho, alto, color }) {
  return Array.from({ length: 7 }, (_, i) => {
    const y = y0 + (i + 0.5) * (alto / 7);
    const largo = 280 + azar(i + 5) * 200;
    const desfase = -(t * (260 + i * 40) + azar(i + 11) * 600);
    const ondas = `M${x0} ${y.toFixed(1)} q 70 -34 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0`;
    return `<path d="${ondas}" fill="none" stroke="${color}" stroke-width="${6 + (i % 3) * 2}" stroke-linecap="round" stroke-dasharray="${largo.toFixed(0)} 520" stroke-dashoffset="${desfase.toFixed(1)}" opacity="${(0.45 + 0.1 * (i % 3)).toFixed(2)}"/>`;
  }).join('');
}

/** La ilustración de un cielo, dentro del panel. `g` = { x, y, ancho, alto } del panel; el dibujo vive en la mitad de la derecha. */
function ilustracion(base, noche, t, g) {
  const cx = g.x + g.ancho - 250;
  const cy = g.y + 235;
  const subir = entra(t, 0, 1.2);
  const nubes = (color, op, n = 3, bajas = false) => Array.from({ length: n }, (_, i) => nubeQueCruza(t, {
    y: g.y + (bajas ? 300 : 150) + i * 95, escala: 0.8 + i * 0.28, vel: 18 + i * 9, fase: i * 420, ancho: g.ancho, color, op: op - i * 0.06,
  })).join('');
  const nubeClara = noche ? '#5A6B86' : '#FFFFFF';
  const nubeOscura = noche ? '#37445A' : '#8190A3';
  switch (base) {
    case 'despejado':
      return noche ? `${estrellas(t, g.x + 40, g.y + 30, g.ancho - 80, g.alto - 90)}${luna(t, cx, cy, subir)}` : sol(t, cx, cy, subir);
    case 'parcial':
      return `${noche ? `${estrellas(t, g.x + 40, g.y + 30, g.ancho - 80, 250)}${luna(t, cx + 30, cy - 10, subir)}` : sol(t, cx + 30, cy - 10, subir)}${nubes(nubeClara, 0.95, 2)}`;
    case 'nublado':
      return `${nubes(nubeClara, 0.95, 3)}${nubes(nubeOscura, 0.85, 1, true)}`;
    case 'llovizna':
      return `${nubes(nubeOscura, 0.95, 2)}${lluviaCayendo(t, { x0: g.x + 40, y0: g.y + 60, ancho: g.ancho - 80, alto: g.alto - 60, cuantas: 38, vel: 330, largo: 34, color: noche ? '#9CC4EE' : '#EAF3FB', grosor: 3, op: 0.55 })}`;
    case 'lluvia':
      return `${nubes(nubeOscura, 0.98, 3)}${lluviaCayendo(t, { x0: g.x + 40, y0: g.y + 60, ancho: g.ancho - 80, alto: g.alto - 60, cuantas: 68, vel: 640, largo: 62, color: noche ? '#8FBBEA' : '#EAF3FB', grosor: 5, op: 0.6 })}`;
    case 'tormenta': {
      const f = destello(t);
      return `${nubes('#1F2733', 0.98, 3)}${lluviaCayendo(t, { x0: g.x + 40, y0: g.y + 60, ancho: g.ancho - 80, alto: g.alto - 60, cuantas: 80, vel: 820, largo: 74, color: '#BFD3EA', grosor: 5, op: 0.55 })}${rayo(cx + 20, g.y + 170, f)}${f > 0 ? `<rect x="${g.x}" y="${g.y}" width="${g.ancho}" height="${g.alto}" fill="#FFFFFF" opacity="${(f * 0.6).toFixed(2)}"/>` : ''}`;
    }
    case 'niebla':
      return `${noche ? estrellas(t, g.x + 40, g.y + 30, g.ancho - 80, 160, 10) : ''}${bandasDeNiebla(t, g.x, g.y + 70, g.ancho, g.alto - 120, noche ? '#AAB4BF' : '#FFFFFF')}`;
    default:
      return '';
  }
}

// ------------------------------------------------------------------ la escena

const TEMP_TAM = 270;

/** "Viernes 9 de octubre", a partir de una fecha ISO ("2026-10-09"). */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function fechaEnLetras(iso) {
  const [a, m, d] = String(iso).split('-').map(Number);
  const s = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay();
  const dia = DIAS[s];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d} de ${MESES[m - 1]}`;
}

/** Las etiquetas chicas que se suman al panel: Helada, Calor, Viento fuerte (no reemplazan al aviso grande). */
export function etiquetasDelClima({ ahora = {}, hoy = {}, manana = null, momento = 'manana' }) {
  const e = [];
  const minima = momento === 'noche' ? (manana ?? hoy).min : hoy.min;
  if (typeof minima === 'number' && minima <= 2) e.push({ texto: 'Helada', color: '#0B6FB8' });
  if (typeof hoy.max === 'number' && hoy.max >= 32 && momento !== 'noche') e.push({ texto: 'Calor', color: '#C7381C' });
  const viento = Math.max(ahora.viento ?? 0, hoy.viento ?? 0);
  if (viento >= 40) e.push({ texto: 'Viento fuerte', color: '#4B5563' });
  return e.slice(0, 2);
}

/** Un dibujito del cielo de ese día (el mismo vocabulario de las ilustraciones grandes, en chiquito). Centrado en (cx, cy), de unos 110 px. */
function iconoDelDia(base, cx, cy, t, fase = 0) {
  const sol = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${(t * 12 + fase * 30).toFixed(1)})">${Array.from({ length: 8 }, (_, i) => `<rect x="-3.5" y="${-r - 17}" width="7" height="13" rx="3.5" fill="#F6B73C" transform="rotate(${i * 45})"/>`).join('')}<circle r="${r}" fill="#F6B73C"/></g>`;
  const nube = (x, y, k, color = '#B9C6D3') => `<g transform="translate(${x} ${y}) scale(${k})" fill="${color}"><circle cx="-24" cy="8" r="20"/><circle cx="2" cy="-6" r="28"/><circle cx="30" cy="8" r="19"/><rect x="-44" y="8" width="94" height="20" rx="10"/></g>`;
  const gotas = (n, color) => Array.from({ length: n }, (_, i) => {
    const f = ((t * 1.3 + i * 0.37 + fase * 0.2) % 1);
    return `<rect x="${-26 + i * (52 / Math.max(1, n - 1))}" y="${(22 + f * 30).toFixed(1)}" width="6" height="16" rx="3" fill="${color}" opacity="${(1 - f * 0.8).toFixed(2)}" transform="rotate(14)"/>`;
  }).join('');
  const bob = Math.sin(t * 1.6 + fase) * 3;
  let dibujo;
  if (base === 'despejado') dibujo = sol(0, 0, 26);
  else if (base === 'parcial') dibujo = `${sol(-16, -14, 20)}${nube(8, 12, 0.85, '#C9D3DD')}`;
  else if (base === 'nublado') dibujo = `${nube(-14, -12, 0.55, '#A9B6C4')}${nube(6, 8, 0.85, '#C9D3DD')}`;
  else if (base === 'niebla') dibujo = `${nube(0, -14, 0.8, '#D5DCE3')}${[10, 28, 46].map((y, i) => `<rect x="${-46 + i * 8}" y="${y - 8}" width="${86 - i * 6}" height="8" rx="4" fill="#AEB9C4" opacity="${(0.6 + 0.4 * Math.sin(t * 1.4 + i)).toFixed(2)}"/>`).join('')}`;
  else if (base === 'tormenta') dibujo = `${nube(0, -16, 0.9, '#6B7787')}<path d="M4 6 L-12 34 L2 34 L-6 56 L18 24 L4 24 Z" fill="#F2C230" opacity="${(0.75 + 0.25 * Math.sin(t * 5 + fase)).toFixed(2)}"/>`;
  else dibujo = `${nube(0, -16, 0.9, base === 'lluvia' ? '#8795A6' : '#A9B6C4')}${gotas(base === 'lluvia' ? 4 : 3, '#3C8FC4')}`;
  return `<g transform="translate(${cx} ${(cy + bob).toFixed(1)}) scale(1.35)">${dibujo}</g>`;
}

/** El pronóstico de los días que siguen: una columna por día, con el dibujo del cielo, la máxima, la mínima y, si hay dato, la lluvia. */
function pronosticoEnColumnas(t, dias, { x, y, ancho, alto, titulo, desde = 1.5 }) {
  if (!dias.length) return '';
  const col = (ancho - 48) / dias.length;
  const columnas = dias.map((d, k) => {
    const a = entra(t, desde + k * 0.15, 0.7);
    const cx = x + 24 + col * k + col / 2;
    const etiqueta = String(d.etiqueta ?? d.dia ?? '').toUpperCase();
    const base = baseDelCielo(d.cielo ?? '');
    const separador = k ? `<rect x="${(x + 24 + col * k - 1).toFixed(1)}" y="${y + 96}" width="2" height="${alto - 130}" rx="1" fill="${COLORES.lineaSuave}"/>` : '';
    return `${separador}<g opacity="${clamp(a * 1.6).toFixed(2)}" transform="translate(0 ${((1 - a) * 24).toFixed(1)})">
      <text x="${cx.toFixed(1)}" y="${y + 118}" text-anchor="middle" font-family="${TEXTO}" font-weight="800" font-size="30" letter-spacing="2" fill="${COLORES.gris}">${esc(etiqueta)}</text>
      ${iconoDelDia(base, cx, y + 204, t, k)}
      <text x="${cx.toFixed(1)}" y="${y + 292}" text-anchor="middle" font-family="${DISPLAY}" font-weight="900" font-size="54" letter-spacing="-1" fill="${TINTA}">${d.max}°</text>
      <text x="${cx.toFixed(1)}" y="${y + 336}" text-anchor="middle" font-family="${TEXTO}" font-weight="500" font-size="34" fill="${COLORES.gris}">${d.min}°</text>
      ${typeof d.lluvia === 'number' && d.lluvia > 0 ? `<g transform="translate(${(cx - 14).toFixed(1)} ${y + 372})"><path d="M0 -26 C-8 -12 -12 -6 -12 0 a12 12 0 0 0 24 0 C12 -6 8 -12 0 -26 Z" fill="#3C8FC4"/><text x="22" y="8" font-family="${TEXTO}" font-weight="700" font-size="30" fill="#2F6E8F">${d.lluvia}%</text></g>` : ''}</g>`;
  }).join('');
  return `<rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="32" fill="#FFFFFF" stroke="${COLORES.lineaSuave}" stroke-width="2"/>
  ${rotulo(titulo, { x: x + 36, y: y + 60, color: COLORES.gris, tam: 24 })}${columnas}`;
}

/**
 * La escena del clima.
 *  - momento 'manana' | 'noche' | 'aviso'
 *  - clima: lo que trae la portada ({ ahora, dias })
 *  - fecha: ISO de hoy ("2026-10-09")
 *  - aviso: { tipo: 'helada'|'granizo'|'viento', titulo, texto } (sólo en 'aviso')
 */
export function escenaDeClima({ momento = 'manana', clima, fecha, aviso = null, variante = null }) {
  const a = clima.ahora;
  const dias = clima.dias ?? [];
  const hoy = dias.find((d) => d.fecha === fecha) ?? dias[0];
  const idxHoy = Math.max(0, dias.indexOf(hoy));
  const manana = dias[idxHoy + 1] ?? null;
  const esAviso = momento === 'aviso' && aviso;
  const esDeDia = a.esDeDia !== false;
  const base = variante?.base ?? baseDelCielo(a.cielo);
  const noche = variante?.noche ?? !esDeDia;
  const paletaAviso = esAviso ? PALETAS_AVISO[aviso.tipo] ?? PALETAS_AVISO.viento : null;
  const colorFondo = esAviso ? paletaAviso.fondo : PALETAS[base][noche ? 'noche' : 'dia'];
  const textoClaro = esAviso ? paletaAviso.oscuro : (noche || ['lluvia', 'tormenta'].includes(base));
  const acento = esAviso ? paletaAviso.acento : PALETAS[base].acento;
  const cTexto = textoClaro ? BLANCO : TINTA;
  const cSub = textoClaro ? '#DCE6F0' : '#3B403C';

  const kicker = esAviso ? `Aviso de clima · ${aviso.dia === hoy?.fecha ? 'hoy' : 'mañana'}` : momento === 'noche' ? 'Esta noche en Balcarce' : 'Hoy en Balcarce';
  const titulo = esAviso ? aviso.titulo : momento === 'noche' ? 'Así sigue la noche' : fechaEnLetras(fecha);
  const cab = cabecera(kicker, titulo, { color: esAviso ? acento : COLOR_SECCION.Clima });
  // Todas las variantes (de día, de noche, con o sin aviso) arrancan en el mismo lugar y miden lo mismo (9/10, Hernán).
  const yPanel = cabecera('x', 'x').hasta + 44;
  const altoPronostico = 420;
  const panel = { x: 64, y: yPanel, ancho: W - 128, alto: esAviso ? 1440 - yPanel : clamp(1440 - yPanel - altoPronostico - 30, 520, 640) };
  const yPronostico = panel.y + panel.alto + 30;

  // Los días de abajo: de mañana a la tarde, hoy y los que siguen; de noche, mañana y los que siguen.
  const desdeIdx = momento === 'noche' ? idxHoy + 1 : idxHoy;
  const columnas = dias.slice(desdeIdx, desdeIdx + 4).map((d, i) => ({
    ...d, etiqueta: i === 0 ? (momento === 'noche' ? 'Mañana' : 'Hoy') : d.dia,
  }));
  const minNoche = (manana ?? hoy).min;
  // Del día del aviso: dos cifras para ver de un vistazo.
  const diaDelAviso = esAviso ? (dias.find((d) => d.fecha === aviso.dia) ?? hoy) : null;
  const cifrasDelAviso = !esAviso ? [] : aviso.tipo === 'helada'
    ? [{ titulo: 'Mínima prevista', valor: `${diaDelAviso.min}°` }, { titulo: 'Máxima del día', valor: `${diaDelAviso.max}°` }]
    : aviso.tipo === 'granizo'
      ? [typeof diaDelAviso.lluvia === 'number' ? { titulo: 'Probabilidad de lluvia', valor: `${diaDelAviso.lluvia}%` } : { titulo: 'Máxima del día', valor: `${diaDelAviso.max}°` }, { titulo: 'Viento', valor: `${diaDelAviso.viento ?? a.viento} km/h` }]
      : [{ titulo: 'Viento de hasta', valor: `${diaDelAviso.viento ?? a.viento} km/h` }, { titulo: 'Ahora', valor: `${a.temp}°` }];
  const etiquetas = esAviso ? [] : etiquetasDelClima({ ahora: a, hoy, manana, momento });

  const defs = `<linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colorFondo[0]}"/><stop offset="1" stop-color="${colorFondo[1]}"/></linearGradient>
    <linearGradient id="velo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${colorFondo[1]}" stop-opacity="0.78"/><stop offset="0.55" stop-color="${colorFondo[1]}" stop-opacity="0.35"/><stop offset="0.8" stop-color="${colorFondo[1]}" stop-opacity="0"/></linearGradient>
    <clipPath id="panel"><rect x="${panel.x}" y="${panel.y}" width="${panel.ancho}" height="${panel.alto}" rx="40"/></clipPath>`;

  const cuadro = (t) => {
    const temp = Math.round(a.temp * easeOut(prog(t, 0.3, 1.5)));
    const tamTitulo = esAviso ? 0 : TEMP_TAM;
    const cielo = repartir(a.cielo ?? '', [{ tam: 62, max: 1 }, { tam: 54, max: 1 }, { tam: 46, max: 2 }], 620, 'sans');
    const detalle = momento === 'noche'
      ? [`Mínima de esta noche: ${minNoche}°`, manana ? `Mañana, máxima de ${manana.max}°` : null]
      : [a.sensacion != null ? `Sensación térmica ${a.sensacion}°` : null, a.viento != null ? `Viento ${a.rumbo ? `${a.rumbo} ` : ''}${a.viento} km/h` : null];

    let interior;
    if (esAviso) {
      const yCifras = panel.y + panel.alto - 164;
      const yTextoPrevisto = panel.y + 215 + Math.max(3 * 80, 260) + 10;
      const texto = [40, 36, 32, 28].map((tam) => repartir(aviso.texto ?? '', [{ tam, max: 9 }], panel.ancho - 96, 'sans'))
        .find((r) => r.lineas.length * Math.round(r.tam * 1.3) <= yCifras - 24 - yTextoPrevisto) ?? repartir(aviso.texto ?? '', [{ tam: 28, max: 9 }], panel.ancho - 96, 'sans');
      const tituloR = repartir(aviso.titulo, [{ tam: 84, max: 3 }, { tam: 72, max: 3 }, { tam: 62, max: 4 }], 540, 'serif');
      const yTexto = yTextoPrevisto;
      const anchoCifra = (panel.ancho - 96 - 24) / 2;
      interior = `${aparece(t, 0.35, `<rect x="${panel.x + 44}" y="${panel.y + 52}" width="${paletaAviso.nombre.length * 22 + 64}" height="58" rx="29" fill="${acento}"/>
        <text x="${panel.x + 44 + (paletaAviso.nombre.length * 22 + 64) / 2}" y="${panel.y + 92}" text-anchor="middle" font-family="${TEXTO}" font-weight="800" font-size="28" letter-spacing="3" fill="${paletaAviso.oscuro ? '#14161A' : '#FFFFFF'}">${esc(paletaAviso.nombre)}</text>`)}
        ${aparece(t, 0.6, renglones(tituloR.lineas, { x: panel.x + 48, y: panel.y + 210, tam: tituloR.tam, interlinea: Math.round(tituloR.tam * 1.04), color: cTexto, espaciado: -1.5 }))}
        ${aparece(t, 1.3, renglones(texto.lineas, { x: panel.x + 48, y: yTexto, tam: texto.tam, interlinea: Math.round(texto.tam * 1.3), familia: TEXTO, peso: 500, color: cSub }))}
        ${cifrasDelAviso.map((cf, i) => aparece(t, 2.0 + i * 0.25, `<rect x="${panel.x + 48 + i * (anchoCifra + 24)}" y="${yCifras}" width="${anchoCifra}" height="136" rx="26" fill="${textoClaro ? '#FFFFFF' : '#14161A'}" opacity="0.14"/>
          <text x="${panel.x + 48 + i * (anchoCifra + 24) + 28}" y="${yCifras + 46}" font-family="${TEXTO}" font-size="24" font-weight="700" letter-spacing="2" fill="${cSub}">${esc(cf.titulo.toUpperCase())}</text>
          <text x="${panel.x + 48 + i * (anchoCifra + 24) + 28}" y="${yCifras + 112}" font-family="${DISPLAY}" font-size="66" font-weight="900" letter-spacing="-2" fill="${cTexto}">${esc(cf.valor)}</text>`, { dy: 24 })).join('')}`;
    } else {
      interior = `${aparece(t, 0.25, rotulo(momento === 'noche' ? 'Ahora' : 'El clima ahora', { x: panel.x + 48, y: panel.y + 70, color: cSub, tam: 26 }), { dy: 14 })}
        ${etiquetas.map((e, i) => { const w = e.texto.length * 19 + 58; const x = panel.x + panel.ancho - 48 - w - etiquetas.slice(0, i).reduce((s, o) => s + o.texto.length * 19 + 58 + 14, 0); return aparece(t, 0.5 + i * 0.12, `<rect x="${x}" y="${panel.y + 42}" width="${w}" height="54" rx="27" fill="${e.color}"/>
          <text x="${x + w / 2}" y="${panel.y + 78}" text-anchor="middle" font-family="${TEXTO}" font-weight="800" font-size="26" letter-spacing="2" fill="#FFFFFF">${esc(e.texto.toUpperCase())}</text>`, { dy: 10 }); }).join('')}
        <text x="${panel.x + 40}" y="${panel.y + 322}" font-family="${DISPLAY}" font-size="${tamTitulo}" font-weight="900" letter-spacing="-8" fill="${cTexto}" opacity="${entra(t, 0.2, 0.4).toFixed(2)}">${temp}°</text>
        ${aparece(t, 1.0, renglones(cielo.lineas, { x: panel.x + 48, y: panel.y + 400, tam: cielo.tam, interlinea: Math.round(cielo.tam * 1.05), color: cTexto, peso: 700 }), { dy: 24 })}
        ${aparece(t, 1.25, detalle.filter(Boolean).slice(0, cielo.lineas.length > 1 ? 1 : 2).map((l, i) => `<text x="${panel.x + 48}" y="${panel.y + 400 + (cielo.lineas.length - 1) * Math.round(cielo.tam * 1.05) + 58 + i * 46}" font-family="${TEXTO}" font-size="34" font-weight="${i === 0 && momento === 'noche' ? 700 : 500}" fill="${cSub}">${esc(l)}</text>`).join(''), { dy: 20 })}`;
    }

    const ilu = esAviso
      ? aviso.tipo === 'helada'
        ? `${estrellas(t, panel.x + panel.ancho - 420, panel.y + 30, 380, 380, 16).replace(/#FFFFFF/g, '#7CB9E0')}${copoDeHielo(panel.x + panel.ancho - 230, panel.y + 250, 150 * entra(t, 0.4, 1.2), t * 4, entra(t, 0.4, 0.8))}`
        : aviso.tipo === 'granizo'
          ? `${nubeQueCruza(t, { y: panel.y + 130, escala: 1.0, vel: 8, fase: 700, ancho: panel.ancho, color: '#2A3340' })}${pedrisco(t, { x0: panel.x + panel.ancho - 400, y0: panel.y + 130, ancho: 340, alto: 250, cuantas: 10 })}`
          : lineasDeViento(t, { x0: panel.x + panel.ancho - 470, y0: panel.y + 90, ancho: 440, alto: 360, color: '#FFFFFF' })
      : ilustracion(base, noche, t, panel);

    const fondoPanel = `<rect x="${panel.x}" y="${panel.y}" width="${panel.ancho}" height="${panel.alto}" rx="40" fill="url(#cielo)"/>`;
    const entradaPanel = entra(t, 0.05, 0.7);
    const panelSvg = `<g opacity="${entradaPanel.toFixed(3)}" transform="translate(0 ${((1 - entradaPanel) * 40).toFixed(2)})">${fondoPanel}<g clip-path="url(#panel)">${ilu}${!esAviso && textoClaro && ['lluvia', 'tormenta', 'llovizna'].includes(base) ? `<rect x="${panel.x}" y="${panel.y}" width="${panel.ancho}" height="${panel.alto}" fill="url(#velo)"/>` : ''}</g>${interior}</g>`;
    const pronostico = pronosticoEnColumnas(t, columnas, {
      x: panel.x, y: yPronostico, ancho: panel.ancho, alto: altoPronostico, titulo: momento === 'noche' ? 'Mañana y los días que siguen' : 'Hoy y los días que siguen', desde: 1.5,
    });
    return escenaSobrePapel({
      defs,
      contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${panelSvg}${esAviso ? '' : aparece(t, 1.4, pronostico, { dy: 40, dur: 0.7 })}`,
    });
  };

  const nombre = esAviso ? `aviso-${aviso.tipo}` : `${momento === 'noche' ? 'clima-noche' : 'clima-manana'}`;
  return crearEscena({ nombre, variante: esAviso ? `aviso-${aviso.tipo}` : `${base}${noche ? '-noche' : ''}`, cuadro, duracionMinima: 12 });
}

/** Todas las variantes de cielo que tiene el clima (para el catálogo y para las pruebas). */
export const TODAS_LAS_VARIANTES = [
  ...BASES.map((base) => ({ base, noche: false, nombre: base })),
  ...BASES.map((base) => ({ base, noche: true, nombre: `${base}-noche` })),
];
export const TODOS_LOS_AVISOS = ['helada', 'granizo', 'viento'];

void MARGEN;
