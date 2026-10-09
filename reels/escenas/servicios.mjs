// Las escenas de servicio (8/10/2026; docs/propuestas/PLANTILLAS-DE-PIEZAS.md): la farmacia de turno, la invitación a participar, los teléfonos útiles
// y la agenda. Propuesta para aprobar: mientras no se apruebe, esas piezas salen con la placa de siempre.

import {
  COLORES, COLOR_SECCION, DISPLAY, TEXTO, MARGEN, cabecera, rotulo, repartir, renglones, esc,
} from '../placa.mjs';
import {
  W, clamp, prog, easeOut, easeInOut, entra, aparece, escenaSobrePapel, crearEscena,
} from './comun.mjs';
import { fechaEnLetras } from './clima.mjs';

const TINTA = COLORES.tinta;
const GRIS = COLORES.gris;
const VERDE = COLOR_SECCION.Farmacias;
const FIN = 1440;

/** Un marcador de lugar (rojo) con su centro en (0,0), para usar con translate. */
const MARCADOR = `<path d="M0 -30 C-17 -30 -28 -17 -28 -2 C-28 17 0 38 0 38 C0 38 28 17 28 -2 C28 -17 17 -30 0 -30 Z" fill="${COLORES.rojo}"/><circle cy="-3" r="10" fill="#FFFFFF"/>`;

// ------------------------------------------------------------------ la farmacia

/** La cruz verde que entra girando y después late; una onda sale de ella cada dos segundos. */
function cruzVerde(t, cx, cy, escala) {
  const e = easeOut(prog(t, 0.2, 0.9));
  const pulso = t > 0.9 ? 1 + 0.045 * Math.sin((t - 0.9) * 3.2) : 1;
  const s = e * pulso * escala;
  const onda = t > 0.9 ? (() => { const k = ((t - 0.9) % 2.2) / 2.2; return `<circle cx="${cx}" cy="${cy}" r="${(130 * escala + 70 * k * escala).toFixed(1)}" fill="none" stroke="${VERDE}" stroke-width="6" opacity="${(0.5 * (1 - k)).toFixed(2)}"/>`; })() : '';
  return `${onda}<g transform="translate(${cx} ${cy}) scale(${s.toFixed(3)}) rotate(${((1 - e) * -90).toFixed(1)})"><circle r="150" fill="#E3F1E9"/><rect x="-42" y="-116" width="84" height="232" rx="18" fill="${VERDE}"/><rect x="-116" y="-42" width="232" height="84" rx="18" fill="${VERDE}"/></g>`;
}

const NUMERO_EN_LETRAS = { 1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro' };

/**
 * La farmacia de turno. `farmacias`: [{ nombre, direccion, telefono }] (una, dos o tres); `hasta`: "De turno hasta mañana a las 8:30."
 */
export function escenaDeFarmacia({ fecha, farmacias = [], hasta = 'De turno hasta mañana a las 8:30.' }) {
  const lista = farmacias.slice(0, 3);
  const n = lista.length;
  const cab = cabecera('Farmacia de turno', fechaEnLetras(fecha), { color: VERDE });
  const yIcono = cab.hasta + 70;
  const tit = n === 1 ? 'Esta noche, de turno' : `Hoy hay ${NUMERO_EN_LETRAS[n]} farmacias de turno`;
  const titR = repartir(tit, [{ tam: 56, max: 2 }], 560, 'serif');
  // Cada ficha mide lo que ocupa su contenido y el grupo se centra en el espacio que queda entre el título y la franja de abajo.
  const gap = 24;
  const yChip = FIN - 70;
  const tamNombre = n === 1 ? 80 : n === 2 ? 66 : 56;
  const tamDato = n === 1 ? 40 : n === 2 ? 36 : 32;
  const alto = Math.round(34 + tamNombre + 22 + tamDato * 1.4 + (lista.some((f) => f.telefono) ? tamDato * 1.5 : 0) + 30);
  const espacioDesde = yIcono + 290;
  const bloque = alto * n + gap * (n - 1);
  const yFichas = espacioDesde + Math.max(0, Math.floor((yChip - 30 - espacioDesde - bloque) / 2));

  const cuadro = (t) => {
    const fichas = lista.map((f, k) => {
      const y = yFichas + k * (alto + gap);
      const nombre = repartir(f.nombre, [{ tam: tamNombre, max: 1 }, { tam: Math.round(tamNombre * 0.82), max: 2 }], W - 128 - 120, 'serif');
      const yN = y + 18 + Math.round(nombre.tam * 0.95);
      const yD = yN + (nombre.lineas.length - 1) * Math.round(nombre.tam * 1.02) + Math.round(tamDato * 1.5);
      return aparece(t, 1.1 + k * 0.45, `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="26" fill="#FFFFFF" stroke="#D5E4DB" stroke-width="3"/>
        <rect x="64" y="${y}" width="14" height="${alto}" rx="7" fill="${VERDE}"/>
        ${renglones(nombre.lineas, { x: 112, y: yN, tam: nombre.tam, interlinea: Math.round(nombre.tam * 1.02), color: TINTA })}
        <g transform="translate(${130} ${yD - Math.round(tamDato * 0.3)}) scale(${(tamDato / 38).toFixed(2)})">${MARCADOR}</g>
        <text x="${176}" y="${yD}" font-family="${TEXTO}" font-size="${tamDato}" font-weight="500" fill="${COLORES.gris}">${esc(f.direccion ?? '')}</text>
        ${f.telefono ? `<text x="112" y="${yD + Math.round(tamDato * 1.5)}" font-family="${TEXTO}" font-size="${tamDato}" font-weight="700" fill="${VERDE}">Tel. ${esc(f.telefono)}</text>` : ''}`, { dx: k % 2 ? 70 : -70, dy: 0, dur: 0.7 });
    }).join('');
    return escenaSobrePapel({
      contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}
        ${cruzVerde(t, 220, yIcono + 120, 0.8)}
        ${aparece(t, 0.8, renglones(titR.lineas, { x: 400, y: yIcono + 100, tam: titR.tam, interlinea: Math.round(titR.tam * 1.05), color: VERDE, espaciado: -1 }), { dy: 24 })}
        ${fichas}
        ${aparece(t, 1.1 + n * 0.45, `<rect x="64" y="${yChip}" width="${W - 128}" height="58" rx="29" fill="${VERDE}"/><text x="${W / 2}" y="${yChip + 39}" text-anchor="middle" font-family="${TEXTO}" font-size="30" font-weight="700" letter-spacing="1" fill="#FFFFFF">${esc(hasta)}</text>`, { dy: 16 })}`,
    });
  };
  return crearEscena({ nombre: 'farmacia', variante: `farmacia-${n}`, cuadro, duracionMinima: 10 });
}

// ------------------------------------------------------------------ participá

/**
 * La invitación a participar. `p`: { rotulo, pregunta, pie1, pie2 } de redes/participa.mjs; `color` el de su sección.
 */
export function escenaDeParticipa({ p, color, numero = '2266 51-1612', mail = 'redaccion@radarbalcarce.com' }) {
  const escalones = [120, 104, 92, 80].map((tam) => ({ tam, max: 5 }));
  const pregunta = repartir(p.pregunta, escalones, W - MARGEN * 2, 'serif');
  const inter = Math.round(pregunta.tam * 1.04);
  const yPregunta = 450;
  const yCaja = yPregunta + (pregunta.lineas.length - 1) * inter + 110;
  const altoCaja = 230;
  const yMail = yCaja + altoCaja + 110;

  const cuadro = (t) => {
    const lineas = pregunta.lineas.map((l, i) => aparece(t, 0.2 + i * 0.2, `<text x="${MARGEN}" y="${yPregunta + i * inter}" font-family="${DISPLAY}" font-size="${pregunta.tam}" font-weight="900" letter-spacing="-2" fill="${TINTA}">${esc(l)}</text>`, { dy: 40, dur: 0.6 })).join('');
    const tipeados = numero.slice(0, Math.floor(clamp((t - 1.5) / 1.1) * numero.length));
    const cursor = t > 1.5 && t < 3.0 && Math.floor(t * 3) % 2 ? '|' : '';
    const punto = (k) => (0.35 + 0.65 * (Math.sin(t * 6 - k * 1.1) > 0.2 ? 1 : 0)).toFixed(2);
    const burbuja = `<g transform="translate(${W - 190} ${yCaja + 115})"><circle r="58" fill="#FFFFFF"/><path d="M-36 38 L-50 66 L-14 50 Z" fill="#FFFFFF"/>${[-24, 0, 24].map((x, k) => `<circle cx="${x}" cy="0" r="8" fill="${COLOR_SECCION.WhatsApp}" opacity="${punto(k)}"/>`).join('')}</g>`;
    const caja = aparece(t, 1.0, `<rect x="${MARGEN}" y="${yCaja}" width="${W - MARGEN * 2}" height="${altoCaja}" rx="28" fill="${COLOR_SECCION.WhatsApp}"/>
      <text x="${MARGEN + 44}" y="${yCaja + 66}" font-family="${TEXTO}" font-size="28" font-weight="700" letter-spacing="4" fill="#FFFFFF" fill-opacity="0.85">ESCRIBINOS POR WHATSAPP</text>
      <text x="${MARGEN + 44}" y="${yCaja + 176}" font-family="${TEXTO}" font-size="92" font-weight="700" letter-spacing="-1" fill="#FFFFFF">${esc(tipeados)}${cursor}</text>${burbuja}`, { dy: 40, dur: 0.6 });
    // El sobre que se abre y el mail.
    const sobreA = entra(t, 3.0, 0.6);
    const tapa = easeInOut(prog(t, 3.6, 4.2));
    const sobre = `<g transform="translate(${MARGEN + 60} ${yMail - 14}) scale(${sobreA.toFixed(3)})" opacity="${sobreA.toFixed(2)}"><rect x="-62" y="-42" width="124" height="84" rx="10" fill="#FFFFFF" stroke="${TINTA}" stroke-width="5"/>
      <rect x="-36" y="${(-26 - 44 * tapa).toFixed(1)}" width="72" height="44" rx="4" fill="${COLORES.rojo}" opacity="${tapa.toFixed(2)}"/>
      <path d="M-62 -42 L0 ${(-42 + 54 * (1 - 2 * tapa)).toFixed(1)} L62 -42" fill="none" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/></g>`;
    const textoMail = aparece(t, 3.2, `<text x="${MARGEN + 150}" y="${yMail - 22}" font-family="${TEXTO}" font-size="26" font-weight="700" letter-spacing="3" fill="${GRIS}">O POR MAIL</text>
      <text x="${MARGEN + 150}" y="${yMail + 28}" font-family="${TEXTO}" font-size="42" font-weight="700" fill="${TINTA}">${esc(mail)}</text>`, { dy: 14 });
    const pies = [p.pie1, p.pie2].filter(Boolean).map((tx, k) => aparece(t, 4.4 + k * 0.4, `<text x="${MARGEN}" y="${yMail + 110 + k * 62}" font-family="${TEXTO}" font-size="42" font-weight="${k ? 500 : 700}" fill="${k ? GRIS : TINTA}">${esc(tx)}</text>`, { dy: 14 })).join('');
    return escenaSobrePapel({ contenido: `${aparece(t, 0, rotulo(p.rotulo, { y: 300, color }), { dy: 0, dur: 0.5 })}${lineas}${caja}${sobre}${textoMail}${pies}` });
  };
  return crearEscena({ nombre: 'participa', variante: 'participa', cuadro, duracionMinima: 12 });
}

// ------------------------------------------------------------------ teléfonos útiles

const COLOR_UTILES = '#8C2D18';

/** Un tubito de teléfono dentro de un círculo, centrado en (0,0). */
const TELEFONO = (color) => `<circle r="38" fill="${color}"/><path d="M-14 -16 q-6 2 -4 10 q8 24 30 28 q8 2 10 -4 l-2 -10 l-12 -3 l-6 6 q-10 -5 -14 -16 l6 -6 l-3 -12 z" fill="#FFFFFF"/>`;

/** Los teléfonos útiles. `grupos`: [{ categoria, items: [{ nombre, numero }] }] (como en ingesta/utiles.mjs); hasta seis filas. */
export function escenaDeUtiles({ grupos = [] }) {
  const filas = [];
  let anterior = null;
  for (const g of grupos) {
    for (const it of g.items) {
      if (filas.length >= 6) break;
      filas.push({ categoria: g.categoria !== anterior ? g.categoria : '', nombre: it.nombre, numero: String(it.numero).split(' / ')[0] });
      anterior = g.categoria;
    }
  }
  const cab = cabecera('Teléfonos útiles', 'Guardalos en el celular', { color: COLOR_UTILES });
  const y0 = cab.hasta + 60;
  const alto = Math.min(176, Math.floor((FIN - y0 - 14 * (filas.length - 1)) / Math.max(1, filas.length)));
  const cuadro = (t) => {
    const lista = filas.map((f, k) => {
      const y = y0 + k * (alto + 14);
      const nombre = repartir(f.nombre, [{ tam: 44, max: 1 }, { tam: 36, max: 2 }], W - 128 - 140 - 330, 'sans');
      return aparece(t, 0.6 + k * 0.28, `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="24" fill="#FFFFFF" stroke="${COLORES.lineaSuave}" stroke-width="2"/>
        <g transform="translate(${64 + 70} ${y + alto / 2})">${TELEFONO(COLOR_UTILES)}</g>
        ${f.categoria ? `<text x="${64 + 140}" y="${y + 50}" font-family="${TEXTO}" font-size="22" font-weight="700" letter-spacing="3" fill="${COLOR_UTILES}">${esc(f.categoria.toUpperCase())}</text>` : ''}
        ${renglones(nombre.lineas, { x: 64 + 140, y: y + (f.categoria ? 104 : 88), tam: nombre.tam, interlinea: Math.round(nombre.tam * 1.15), familia: TEXTO, peso: 600, color: TINTA })}
        <text x="${W - 64 - 36}" y="${y + alto / 2 + 18}" text-anchor="end" font-family="${DISPLAY}" font-size="${f.numero.length > 13 ? 44 : 58}" font-weight="900" letter-spacing="-1" fill="${TINTA}">${esc(f.numero)}</text>`, { dx: -50, dy: 0, dur: 0.6 });
    }).join('');
    return escenaSobrePapel({ contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${lista}` });
  };
  return crearEscena({ nombre: 'utiles', variante: 'utiles', cuadro, duracionMinima: 12 });
}

// ------------------------------------------------------------------ la agenda

const COLOR_AGENDA = COLOR_SECCION['Cultura y agenda'];

/** La agenda del fin de semana. `eventos`: [{ nombre, cuando, lugar }] (hasta cuatro). */
export function escenaDeAgenda({ eventos = [], titulo = 'Qué hacer este fin de semana' }) {
  const lista = eventos.slice(0, 4);
  const cab = cabecera('Agenda', titulo, { color: COLOR_AGENDA });
  const y0 = cab.hasta + 56;
  const gap = 20;
  const alto = Math.min(250, Math.floor((FIN - y0 - gap * (lista.length - 1)) / Math.max(1, lista.length)));
  const cuadro = (t) => {
    const tarjetas = lista.map((e, k) => {
      const y = y0 + k * (alto + gap);
      const nombre = repartir(e.nombre, [{ tam: 50, max: 1 }, { tam: 42, max: 2 }], W - 128 - 250, 'serif');
      const [dia, hora] = String(e.cuando ?? '').split(' ');
      const yN = y + 40 + Math.round(nombre.tam * 0.9);
      return aparece(t, 0.7 + k * 0.4, `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="26" fill="#FFFFFF" stroke="${COLORES.lineaSuave}" stroke-width="2"/>
        <rect x="64" y="${y}" width="190" height="${alto}" rx="26" fill="${COLOR_AGENDA}"/><rect x="224" y="${y}" width="30" height="${alto}" fill="${COLOR_AGENDA}"/>
        <text x="${64 + 95}" y="${y + alto / 2 + (hora ? -6 : 14)}" text-anchor="middle" font-family="${TEXTO}" font-size="${hora ? 34 : 38}" font-weight="800" letter-spacing="2" fill="#FFFFFF">${esc(String(dia ?? '').slice(0, 3).toUpperCase())}</text>
        ${hora ? `<text x="${64 + 95}" y="${y + alto / 2 + 44}" text-anchor="middle" font-family="${DISPLAY}" font-size="54" font-weight="900" fill="#FFFFFF">${esc(hora)}</text>` : ''}
        ${renglones(nombre.lineas, { x: 296, y: yN, tam: nombre.tam, interlinea: Math.round(nombre.tam * 1.04), color: TINTA, espaciado: -0.5 })}
        ${e.lugar ? `<g transform="translate(${312} ${yN + (nombre.lineas.length - 1) * Math.round(nombre.tam * 1.04) + 54}) scale(0.9)">${MARCADOR}</g><text x="${346}" y="${yN + (nombre.lineas.length - 1) * Math.round(nombre.tam * 1.04) + 62}" font-family="${TEXTO}" font-size="34" font-weight="500" fill="${GRIS}">${esc(e.lugar)}</text>` : ''}`, { dx: 70, dy: 0, dur: 0.65 });
    }).join('');
    return escenaSobrePapel({ contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${tarjetas}` });
  };
  return crearEscena({ nombre: 'agenda', variante: 'agenda', cuadro, duracionMinima: 12 });
}
