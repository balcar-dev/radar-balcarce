// Las escenas de fechas (8/10/2026; docs/propuestas/PLANTILLAS-DE-PIEZAS.md): "Un día como hoy" y el feriado. Propuesta para aprobar: mientras no
// se apruebe, esas piezas salen con la placa de siempre.
//
// El criterio (centro y centro-derecha, como el medio) está en el punto 4 de docs/propuestas/PLANTILLAS-DE-PIEZAS.md: hechos con su fuente, sin
// adjetivos, sin estadísticas que no vayan con la línea; lo delicado lo revisa una persona.

import {
  COLORES, COLOR_SECCION, DISPLAY, TEXTO, MARGEN, cabecera, rotulo, repartir, renglones, esc,
} from '../placa.mjs';
import {
  W, clamp, prog, easeOut, easeInOut, entra, aparece, azar, escenaSobrePapel, crearEscena,
} from './comun.mjs';
import { fechaEnLetras } from './clima.mjs';

const TINTA = COLORES.tinta;
const GRIS = COLORES.gris;
const FIN = 1440;

// ------------------------------------------------------------------ las ilustraciones (cada una vive en un cuadro de ~300 x 300 px)

/** La bandera argentina que flamea: tres bandas celeste y blanco con el Sol de Mayo, en un asta. */
function bandera(t, cx, cy, ancho = 300, alto = 190, op = 1) {
  const x0 = cx - ancho / 2;
  const y0 = cy - alto / 2;
  const onda = (x) => 9 * Math.sin(x / 38 - t * 3.2) * (x / ancho);
  const banda = (i, color) => {
    const y1 = y0 + (alto / 3) * i;
    const y2 = y0 + (alto / 3) * (i + 1);
    const arriba = []; const abajo = [];
    for (let x = 0; x <= ancho; x += 12) { arriba.push(`${(x0 + x).toFixed(1)},${(y1 + onda(x)).toFixed(1)}`); abajo.unshift(`${(x0 + x).toFixed(1)},${(y2 + onda(x)).toFixed(1)}`); }
    return `<polygon points="${arriba.join(' ')} ${abajo.join(' ')}" fill="${color}"/>`;
  };
  const sol = `<circle cx="${(cx + onda(ancho / 2)).toFixed(1)}" cy="${(cy + onda(ancho / 2)).toFixed(1)}" r="${(alto / 8).toFixed(1)}" fill="#F6B40E"/>`;
  return `<g opacity="${op}"><rect x="${x0 - 14}" y="${y0 - 16}" width="9" height="${alto + 40}" rx="4" fill="#6B5B45"/>${banda(0, '#74ACDF')}${banda(1, '#FFFFFF')}${banda(2, '#74ACDF')}${sol}<polyline points="${Array.from({ length: Math.round(ancho / 12) + 1 }, (_, i) => `${(x0 + i * 12).toFixed(1)},${(y0 + onda(i * 12)).toFixed(1)}`).join(' ')}" fill="none" stroke="#C9D6E2" stroke-width="1.5"/></g>`;
}

function marcadorQueRebota(t, cx, cy, color) {
  const rebote = Math.abs(Math.sin(t * 2.4)) * 34;
  const ondas = [0, 1].map((i) => { const k = ((t * 0.7 + i * 0.5) % 1); return `<ellipse cx="${cx}" cy="${cy + 108}" rx="${(30 + 80 * k).toFixed(1)}" ry="${(10 + 26 * k).toFixed(1)}" fill="none" stroke="${color}" stroke-width="5" opacity="${(0.5 * (1 - k)).toFixed(2)}"/>`; }).join('');
  return `${ondas}<g transform="translate(${cx} ${(cy + 30 - rebote).toFixed(1)}) scale(3.2)"><path d="M0 -30 C-17 -30 -28 -17 -28 -2 C-28 17 0 38 0 38 C0 38 28 17 28 -2 C28 -17 17 -30 0 -30 Z" fill="${color}"/><circle cy="-3" r="10" fill="#FFFFFF"/></g>`;
}

function espigas(t, cx, cy, color) {
  return [-70, 0, 70].map((dx, i) => {
    const sway = Math.sin(t * 1.5 + i * 0.9) * 9;
    const granos = Array.from({ length: 7 }, (_, k) => {
      const yy = -150 + k * 24;
      return `<ellipse cx="${(sway * (1 + k * 0.05) - 15).toFixed(1)}" cy="${yy}" rx="9" ry="18" transform="rotate(-28 ${(sway - 15).toFixed(1)} ${yy})" fill="${color}"/><ellipse cx="${(sway * (1 + k * 0.05) + 15).toFixed(1)}" cy="${yy + 8}" rx="9" ry="18" transform="rotate(28 ${(sway + 15).toFixed(1)} ${yy + 8})" fill="${color}"/>`;
    }).join('');
    return `<g transform="translate(${cx + dx} ${cy + 130})"><path d="M0 0 Q${sway.toFixed(1)} -90 ${sway.toFixed(1)} -150" stroke="${color}" stroke-width="7" fill="none" stroke-linecap="round"/>${granos}</g>`;
  }).join('');
}

function atomo(t, cx, cy, color) {
  const orbitas = [0, 60, 120].map((rot, i) => `<ellipse cx="${cx}" cy="${cy}" rx="130" ry="46" transform="rotate(${rot + t * 14} ${cx} ${cy})" fill="none" stroke="${color}" stroke-width="6" opacity="0.8"/>`).join('');
  const electrones = [0, 60, 120].map((rot, i) => {
    const a = t * (1.8 + i * 0.3) + i * 2;
    const ex = 130 * Math.cos(a); const ey = 46 * Math.sin(a);
    const r = ((rot + t * 14) * Math.PI) / 180;
    return `<circle cx="${(cx + ex * Math.cos(r) - ey * Math.sin(r)).toFixed(1)}" cy="${(cy + ex * Math.sin(r) + ey * Math.cos(r)).toFixed(1)}" r="11" fill="${color}"/>`;
  }).join('');
  return `${orbitas}<circle cx="${cx}" cy="${cy}" r="22" fill="${color}"/>${electrones}`;
}

function copa(t, cx, cy, color) {
  const brillo = 0.5 + 0.5 * Math.sin(t * 2.2);
  return `<g transform="translate(${cx} ${cy})"><path d="M-80 -120 H80 V-60 Q80 10 0 30 Q-80 10 -80 -60 Z" fill="${color}"/><path d="M-80 -100 Q-130 -100 -120 -50 Q-112 -10 -70 -8" fill="none" stroke="${color}" stroke-width="12"/><path d="M80 -100 Q130 -100 120 -50 Q112 -10 70 -8" fill="none" stroke="${color}" stroke-width="12"/><rect x="-14" y="30" width="28" height="60" fill="${color}"/><rect x="-62" y="88" width="124" height="26" rx="8" fill="${color}"/><path d="M-50 -105 q-4 70 40 100" stroke="#FFFFFF" stroke-width="10" fill="none" stroke-linecap="round" opacity="${(0.25 + 0.4 * brillo).toFixed(2)}"/></g>`;
}

function notasMusicales(t, cx, cy, color) {
  return [0, 1, 2, 3].map((i) => {
    const f = ((t * 0.32 + i * 0.25) % 1);
    const x = cx - 110 + i * 75 + 18 * Math.sin(t * 1.6 + i);
    const y = cy + 130 - f * 260;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" opacity="${(Math.sin(f * Math.PI)).toFixed(2)}"><ellipse cx="0" cy="0" rx="22" ry="16" transform="rotate(-20)" fill="${color}"/><rect x="16" y="-70" width="8" height="70" fill="${color}"/><path d="M24 -70 q30 8 22 40" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/></g>`;
  }).join('');
}

function reloj(t, cx, cy, color, hacia = -1) {
  const a = hacia * t * 120;
  return `<circle cx="${cx}" cy="${cy}" r="120" fill="#FFFFFF" stroke="${color}" stroke-width="12"/>${Array.from({ length: 12 }, (_, i) => `<line x1="${cx + 100 * Math.cos((i * Math.PI) / 6)}" y1="${cy + 100 * Math.sin((i * Math.PI) / 6)}" x2="${cx + 112 * Math.cos((i * Math.PI) / 6)}" y2="${cy + 112 * Math.sin((i * Math.PI) / 6)}" stroke="${color}" stroke-width="6"/>`).join('')}
  <line x1="${cx}" y1="${cy}" x2="${cx + 82 * Math.cos(((a - 90) * Math.PI) / 180)}" y2="${cy + 82 * Math.sin(((a - 90) * Math.PI) / 180)}" stroke="${TINTA}" stroke-width="9" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${cx + 56 * Math.cos(((a / 12 - 90) * Math.PI) / 180)}" y2="${cy + 56 * Math.sin(((a / 12 - 90) * Math.PI) / 180)}" stroke="${color}" stroke-width="12" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="9" fill="${TINTA}"/>`;
}

function estrellaDeLuz(t, cx, cy, color) {
  const brillo = 0.75 + 0.25 * Math.sin(t * 1.6);
  const puntas = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const largo = i % 2 ? 80 : 135;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + largo * Math.cos(a)).toFixed(1)}" y2="${(cy + largo * Math.sin(a)).toFixed(1)}" stroke="${color}" stroke-width="${i % 2 ? 8 : 12}" stroke-linecap="round"/>`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${(110 * brillo).toFixed(1)}" fill="${color}" opacity="0.14"/>${puntas}<circle cx="${cx}" cy="${cy}" r="20" fill="${color}"/>`;
}

function confeti(t, x0, y0, ancho, alto) {
  const colores = ['#E8A33C', '#C7381C', '#0B6FB8', '#9D2C8F', '#16615B'];
  return Array.from({ length: 34 }, (_, i) => {
    const x = x0 + azar(i + 2) * ancho + 14 * Math.sin(t * 2 + i);
    const ciclo = alto + 60;
    const y = y0 + (((t * (60 + azar(i + 9) * 70)) + azar(i + 17) * ciclo) % ciclo) - 30;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="14" height="22" rx="3" fill="${colores[i % 5]}" transform="rotate(${(t * 90 + i * 40) % 360} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
}

/** Cada tipo de hecho: su color y su ilustración (una de las de arriba). */
export const TIPOS_DE_EFEMERIDE = {
  patria: { color: COLOR_SECCION.Feriados, dibujo: (t, cx, cy) => bandera(t, cx + 20, cy - 10) },
  balcarce: { color: COLOR_SECCION.Balcarce, dibujo: (t, cx, cy) => marcadorQueRebota(t, cx, cy - 20, COLOR_SECCION.Balcarce) },
  campo: { color: COLOR_SECCION.Agro, dibujo: (t, cx, cy) => espigas(t, cx, cy, COLOR_SECCION.Agro) },
  ciencia: { color: COLOR_SECCION['Tecnología'], dibujo: (t, cx, cy) => atomo(t, cx, cy, COLOR_SECCION['Tecnología']) },
  deporte: { color: COLOR_SECCION.Deportes, dibujo: (t, cx, cy) => copa(t, cx, cy, COLOR_SECCION.Deportes) },
  cultura: { color: COLOR_SECCION['Cultura y agenda'], dibujo: (t, cx, cy) => notasMusicales(t, cx, cy, COLOR_SECCION['Cultura y agenda']) },
  historia: { color: COLOR_SECCION.Argentina, dibujo: (t, cx, cy) => reloj(t, cx, cy, COLOR_SECCION.Argentina) },
};

// ------------------------------------------------------------------ un día como hoy

/** Los renglones de un texto, cada uno entrando después del anterior. */
const porRenglon = (t, desde, lineas, o) => lineas.map((l, i) => aparece(t, desde + i * 0.18, renglones([l], { ...o, y: o.y + i * o.interlinea }), { dy: 36 })).join('');

const recortar = (s, max) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/**
 * Una efeméride. `principal`: { anio, titulo, cuerpo }; `ademas`: [{ anio, texto }] (hasta tres); `tipo`: una de TIPOS_DE_EFEMERIDE;
 * `anioActual`: desde dónde corre el año hacia atrás.
 */
export function escenaDeEfemeride({ fecha, principal, ademas = [], tipo = 'historia', anioActual = 2026 }) {
  const { color, dibujo } = TIPOS_DE_EFEMERIDE[tipo] ?? TIPOS_DE_EFEMERIDE.historia;
  const cab = cabecera('Un día como hoy', fechaEnLetras(fecha), { color });
  const anio = principal.anio ? Number(principal.anio) : null;
  const tamAnio = 250;
  const yAnio = cab.hasta + 40 + Math.round(tamAnio * 0.8);
  const yRaya = yAnio + 38;
  const lista = ademas.slice(0, 3);
  const altoAdemas = lista.length ? 70 + lista.length * 60 : 0;
  const yAdemas = FIN - altoAdemas;
  const titulo = repartir(principal.titulo, [{ tam: 82, max: 3 }, { tam: 70, max: 3 }, { tam: 60, max: 4 }], W - MARGEN * 2, 'serif');
  const yTitulo = yRaya + 30 + Math.round(titulo.tam * 0.95);
  const interTitulo = Math.round(titulo.tam * 1.04);
  const yCuerpo = yTitulo + (titulo.lineas.length - 1) * interTitulo + 64;
  const cuerpo = principal.cuerpo ? repartir(principal.cuerpo, [{ tam: 40, max: 3 }, { tam: 34, max: 4 }], W - MARGEN * 2, 'sans') : null;

  const cuadro = (t) => {
    const k = easeInOut(prog(t, 0.4, 2.0));
    const mostrado = anio ? Math.round(anio + (anioActual - anio) * (1 - k)) : null;
    const txtAnio = mostrado !== null ? String(mostrado) : '';
    const dibujoSvg = aparece(t, 0.2, dibujo(t, W - 230, yAnio - 130), { dy: 0, dur: 0.8 });
    return escenaSobrePapel({
      contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${dibujoSvg}
        <text x="${MARGEN - 4}" y="${yAnio}" font-family="${DISPLAY}" font-size="${tamAnio}" font-weight="900" letter-spacing="-6" fill="${color}" opacity="${entra(t, 0.2, 0.4).toFixed(2)}">${txtAnio}</text>
        <rect x="${MARGEN}" y="${yRaya}" width="${((W - MARGEN * 2) * easeOut(prog(t, 2.0, 2.8))).toFixed(1)}" height="6" fill="${COLORES.rojo}"/>
        ${porRenglon(t, 2.1, titulo.lineas, { x: MARGEN, y: yTitulo, tam: titulo.tam, interlinea: interTitulo, color: TINTA, espaciado: -1.5 })}
        ${cuerpo ? aparece(t, 2.9, renglones(cuerpo.lineas, { x: MARGEN, y: yCuerpo, tam: cuerpo.tam, interlinea: Math.round(cuerpo.tam * 1.35), familia: TEXTO, peso: 500, color: GRIS }), { dy: 24 }) : ''}
        ${lista.length ? aparece(t, 4.2, rotulo('Y además', { x: MARGEN, y: yAdemas + 22, color: GRIS, tam: 26 }), { dy: 14 }) : ''}
        ${lista.map((x, i) => aparece(t, 4.6 + i * 0.5, `<text x="${MARGEN}" y="${yAdemas + 82 + i * 60}" font-family="${TEXTO}" font-size="34" font-weight="800" fill="${COLORES.rojo}">${esc(x.anio ?? 'Hoy')}</text>
          <text x="${MARGEN + 124}" y="${yAdemas + 82 + i * 60}" font-family="${TEXTO}" font-size="34" font-weight="500" fill="${GRIS}">${esc(recortar(x.texto, 42))}</text>`, { dx: 60, dy: 0, dur: 0.6 })).join('')}`,
    });
  };
  return crearEscena({ nombre: 'efemeride', variante: `efemeride-${tipo}`, cuadro, duracionMinima: 14 });
}

// ------------------------------------------------------------------ el feriado

const COLOR_FERIADO = COLOR_SECCION.Feriados;
export const TIPOS_DE_FERIADO = {
  patrio: { rotulo: 'Feriado nacional', color: COLOR_FERIADO },
  religioso: { rotulo: 'Feriado', color: '#5B4B8A' },
  trasladable: { rotulo: 'Feriado trasladable', color: COLOR_FERIADO },
  decreto: { rotulo: 'Feriado por decreto', color: '#1F4E5F' },
  carnaval: { rotulo: 'Feriado de Carnaval', color: '#9D2C8F' },
};

/** Una tira de la semana con el día del feriado marcado (para los trasladables: de qué día se pasa a cuál). */
function tiraDeSemana(t, cx, cy, color, desde = 3, hasta = 0) {
  const dias = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const lado = 70;
  const x0 = cx - (7 * lado) / 2;
  const marca = desde + (hasta - desde) * easeInOut(prog(t, 1.6, 2.6));
  return `${dias.map((d, i) => `<rect x="${x0 + i * lado + 4}" y="${cy - 30}" width="${lado - 8}" height="${lado - 8}" rx="10" fill="#FFFFFF" stroke="${COLORES.lineaSuave}" stroke-width="2"/><text x="${x0 + i * lado + lado / 2}" y="${cy + 18}" text-anchor="middle" font-family="${TEXTO}" font-size="30" font-weight="700" fill="${GRIS}">${d}</text>`).join('')}
  <rect x="${(x0 + marca * lado + 4).toFixed(1)}" y="${cy - 30}" width="${lado - 8}" height="${lado - 8}" rx="10" fill="${color}"/><text x="${(x0 + marca * lado + lado / 2).toFixed(1)}" y="${cy + 18}" text-anchor="middle" font-family="${TEXTO}" font-size="30" font-weight="800" fill="#FFFFFF">${dias[Math.round(marca)]}</text>`;
}

function documentoConSello(t, cx, cy, color) {
  const sello = easeOut(prog(t, 1.4, 1.9));
  return `<g transform="translate(${cx} ${cy})"><rect x="-90" y="-120" width="180" height="240" rx="12" fill="#FFFFFF" stroke="${TINTA}" stroke-width="6"/>${[-70, -40, -10, 20].map((y) => `<line x1="-60" y1="${y}" x2="60" y2="${y}" stroke="${COLORES.lineaSuave}" stroke-width="8" stroke-linecap="round"/>`).join('')}
    <g transform="translate(40 70) scale(${(0.3 + 0.7 * sello).toFixed(2)}) rotate(-14)" opacity="${sello.toFixed(2)}"><circle r="46" fill="none" stroke="${color}" stroke-width="8"/><circle r="32" fill="none" stroke="${color}" stroke-width="4"/><text y="10" text-anchor="middle" font-family="${TEXTO}" font-size="28" font-weight="800" fill="${color}">DNU</text></g></g>`;
}

/**
 * El feriado. `feriado`: { nombre, tipo ('patrio'|'religioso'|'trasladable'|'decreto'|'carnaval'), alcance }; `dato`: { anio, texto } (la historia de
 * la fecha: sin estadísticas); `diaAnterior`: el número del día anterior (para que la hoja del calendario pase de uno a otro).
 */
export function escenaDeFeriado({ fecha, feriado, dato, tipo = 'patrio' }) {
  const v = TIPOS_DE_FERIADO[tipo] ?? TIPOS_DE_FERIADO.patrio;
  const [a, m, d] = fecha.split('-').map(Number);
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const semana = diasSemana[new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()];
  const cab = cabecera(v.rotulo, fechaEnLetras(fecha), { color: v.color });
  const yCal = cab.hasta + 60;
  const nombre = repartir(feriado.nombre, [{ tam: 76, max: 2 }, { tam: 66, max: 3 }, { tam: 56, max: 4 }], W - MARGEN * 2, 'serif');
  const yNombre = yCal + 400 + Math.round(nombre.tam * 0.9);
  const inter = Math.round(nombre.tam * 1.04);
  const yAnio = yNombre + (nombre.lineas.length - 1) * inter + 150;
  const datoR = dato?.texto ? repartir(dato.texto, [{ tam: 38, max: 4 }, { tam: 32, max: 5 }], W - MARGEN * 2, 'sans') : null;
  // Sin año grande (un decreto) el texto sube y no queda un hueco.
  const yDato = dato?.anio ? yAnio + 62 : yNombre + (nombre.lineas.length - 1) * inter + (feriado.alcance && feriado.alcance !== 'nacional' ? 130 : 90) - 40;
  const alcance = feriado.alcance && feriado.alcance !== 'nacional' ? `Rige en ${feriado.alcance}` : null;

  const cuadro = (t) => {
    const caida = easeOut(prog(t, 0, 0.7));
    const giro = easeInOut(prog(t, 0.7, 1.3));
    const numero = giro < 0.5 ? Math.max(1, d - 1) : d;
    const calendario = `<g transform="translate(${MARGEN + 190} ${(yCal + 175 - (1 - caida) * 260).toFixed(1)})" opacity="${caida.toFixed(2)}">
      <rect x="-170" y="-170" width="340" height="360" rx="26" fill="#FFFFFF" stroke="${TINTA}" stroke-width="6"/>
      <rect x="-170" y="-170" width="340" height="96" rx="26" fill="${v.color}"/><rect x="-170" y="-100" width="340" height="26" fill="${v.color}"/>
      <text y="-104" text-anchor="middle" font-family="${TEXTO}" font-size="40" font-weight="800" letter-spacing="4" fill="#FFFFFF">${meses[m - 1]}</text>
      <g transform="scale(1 ${Math.max(0.02, Math.abs(Math.cos(giro * Math.PI))).toFixed(3)})"><text y="82" text-anchor="middle" font-family="${DISPLAY}" font-size="200" font-weight="900" fill="${TINTA}">${numero}</text></g>
      <text y="150" text-anchor="middle" font-family="${TEXTO}" font-size="32" font-weight="600" fill="${GRIS}">${esc(semana)}</text></g>`;
    const ilustracion = aparece(t, 0.8, tipo === 'trasladable' ? tiraDeSemana(t, W - 330, yCal + 175, v.color, 3, 0).replace(/x="/g, 'x="')
      : tipo === 'decreto' ? documentoConSello(t, W - 250, yCal + 175, v.color)
        : tipo === 'religioso' ? estrellaDeLuz(t, W - 250, yCal + 175, v.color)
          : tipo === 'carnaval' ? confeti(t, W - 500, yCal - 20, 440, 420)
            : bandera(t, W - 240, yCal + 160, 330, 210), { dy: 0, dur: 0.8 });
    return escenaSobrePapel({
      contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${calendario}${ilustracion}
        ${porRenglon(t, 1.5, nombre.lineas, { x: MARGEN, y: yNombre, tam: nombre.tam, interlinea: inter, color: TINTA, espaciado: -1.5 })}
        ${alcance ? aparece(t, 2.0, `<text x="${MARGEN}" y="${yNombre + (nombre.lineas.length - 1) * inter + 52}" font-family="${TEXTO}" font-size="34" font-weight="700" fill="${v.color}">${esc(alcance)}</text>`, { dy: 14 }) : ''}
        ${dato?.anio ? aparece(t, 3.0, `<text x="${MARGEN - 2}" y="${yAnio}" font-family="${DISPLAY}" font-size="140" font-weight="900" letter-spacing="-4" fill="${COLORES.rojo}">${esc(dato.anio)}</text>`, { dy: 30, dur: 0.7 }) : ''}
        ${datoR ? aparece(t, 3.5, renglones(datoR.lineas, { x: MARGEN, y: yDato + 40, tam: datoR.tam, interlinea: Math.round(datoR.tam * 1.35), familia: TEXTO, peso: 500, color: GRIS }), { dy: 24 }) : ''}`,
    });
  };
  return crearEscena({ nombre: 'feriado', variante: `feriado-${tipo}`, cuadro, duracionMinima: 14 });
}
