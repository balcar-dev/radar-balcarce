// Las escenas del deporte (9/10/2026), HECHAS PARA MÁS ADELANTE: todavía no salen en las redes. Sirven cuando se quiera publicar, con voz, un dato
// del automovilismo (cómo clasificó Colapinto, cómo terminó la carrera) o del fútbol (la tabla, un resultado). Los datos son los que ya baja la web
// (web/data/f1.json y web/data/futbol.json); acá sólo se dibuja. Si falta un dato, no se escribe (regla 140).

import {
  COLORES, COLOR_SECCION, DISPLAY, TEXTO, MARGEN, cabecera, rotulo, repartir, renglones, esc,
} from '../placa.mjs';
import {
  W, clamp, prog, easeOut, entra, aparece, escenaSobrePapel, crearEscena,
} from './comun.mjs';

const TINTA = COLORES.tinta;
const GRIS = COLORES.gris;
const FIN = 1440;
const COLOR_AUTO = COLOR_SECCION.Automovilismo;
const COLOR_FUTBOL = COLOR_SECCION['Fútbol'];

const apellido = (nombre = '') => nombre.trim().split(/\s+/).slice(-1)[0];
const ordinal = (n) => `${n}.º`;

/** El mejor tiempo de la clasificación: el de la última vuelta que corrió (Q3, si no Q2, si no Q1). */
const tiempoDeClasificacion = (f) => f.q3 || f.q2 || f.q1 || '';

/** Una fila de tabla: número de posición, nombre, detalle chico y el dato de la derecha. `destacada`: la que se quiere mirar (Colapinto, un equipo). */
function fila(t, k, { y, alto, pos, nombre, detalle, dato, color, destacada, desde = 0.6 }) {
  const fondo = destacada ? `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="24" fill="${color}" fill-opacity="0.13" stroke="${color}" stroke-width="4"/>`
    : `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="24" fill="#FFFFFF" stroke="${COLORES.lineaSuave}" stroke-width="2"/>`;
  const tam = nombre.length > 22 ? 38 : 44;
  return aparece(t, desde + k * 0.16, `${fondo}
    <text x="${64 + 70}" y="${y + alto / 2 + 22}" text-anchor="middle" font-family="${DISPLAY}" font-size="${String(pos).length > 2 ? 40 : 54}" font-weight="900" fill="${destacada ? color : TINTA}">${esc(pos)}</text>
    <text x="${64 + 150}" y="${y + alto / 2 + (detalle ? 2 : 14)}" font-family="${DISPLAY}" font-size="${tam}" font-weight="800" letter-spacing="-0.5" fill="${TINTA}">${esc(nombre)}</text>
    ${detalle ? `<text x="${64 + 150}" y="${y + alto / 2 + 40}" font-family="${TEXTO}" font-size="28" font-weight="500" fill="${GRIS}">${esc(detalle)}</text>` : ''}
    <text x="${W - 64 - 36}" y="${y + alto / 2 + 16}" text-anchor="end" font-family="${TEXTO}" font-size="40" font-weight="700" fill="${destacada ? color : TINTA}">${esc(dato)}</text>`, { dx: -40, dy: 0, dur: 0.55 });
}

// ------------------------------------------------------------------ la clasificación de la Fórmula 1

/**
 * La clasificación (la parrilla de largada). `gp`: el nombre del gran premio en castellano; `filas`: las de f1.json (parrilla.filas).
 * Muestra los primeros y, si Colapinto no está entre ellos, su fila al final, con el hueco marcado.
 */
export function escenaDeClasificacion({ gp, fecha, filas }) {
  const primeros = filas.slice(0, 7);
  const colapinto = filas.find((f) => f.colapinto);
  const lista = [...primeros, ...(colapinto && !primeros.includes(colapinto) ? [colapinto] : [])];
  const cab = cabecera('Fórmula 1 · Clasificación', gp, { color: COLOR_AUTO });
  const y0 = cab.hasta + 56;
  const gap = 14;
  const alto = Math.min(124, Math.floor((FIN - y0 - gap * (lista.length - 1) - (colapinto && !primeros.includes(colapinto) ? 40 : 0)) / lista.length));
  const cuadro = (t) => {
    const hayHueco = colapinto && !primeros.includes(colapinto);
    const items = lista.map((f, k) => {
      const salto = hayHueco && k === lista.length - 1 ? 40 : 0;
      const y = y0 + k * (alto + gap) + salto;
      const aparte = salto ? aparece(t, 0.6 + k * 0.16, `<text x="${W / 2}" y="${y - 12}" text-anchor="middle" font-family="${TEXTO}" font-size="34" font-weight="700" letter-spacing="8" fill="${GRIS}">· · ·</text>`) : '';
      return `${aparte}${fila(t, k, { y, alto, pos: f.posicion, nombre: f.piloto, detalle: f.equipo, dato: tiempoDeClasificacion(f), color: COLOR_AUTO, destacada: f.colapinto })}`;
    }).join('');
    return escenaSobrePapel({ contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${items}` });
  };
  return crearEscena({ nombre: 'clasificacion', variante: 'f1-clasificacion', cuadro, duracionMinima: 14 });
}

// ------------------------------------------------------------------ el resultado de la carrera

/** El podio que sube y, abajo, cómo le fue a Colapinto. `resultado`: f1.json (resultado.filas, ya ordenadas). */
export function escenaDePodio({ gp, filas }) {
  const [p1, p2, p3] = filas;
  const colapinto = filas.find((f) => f.colapinto);
  const cab = cabecera('Fórmula 1 · Carrera', gp, { color: COLOR_AUTO });
  const base = 1010;
  const columnas = [
    { f: p2, x: W / 2 - 330, alto: 320, n: 2 },
    { f: p1, x: W / 2, alto: 400, n: 1 },
    { f: p3, x: W / 2 + 330, alto: 220, n: 3 },
  ].filter((c) => c.f);
  const cuadro = (t) => {
    const podio = columnas.map((c, k) => {
      const sube = easeOut(prog(t, 0.5 + k * 0.25, 1.4 + k * 0.25));
      const alto = c.alto * sube;
      const nombre = repartir(apellido(c.f.piloto), [{ tam: 52, max: 1 }, { tam: 42, max: 1 }], 300, 'serif');
      const yTop = base - alto;
      return `<g>
        <rect x="${c.x - 150}" y="${yTop.toFixed(1)}" width="300" height="${alto.toFixed(1)}" rx="20" fill="${COLOR_AUTO}" fill-opacity="${c.n === 1 ? 1 : 0.62}"/>
        <text x="${c.x}" y="${(yTop + 118).toFixed(1)}" text-anchor="middle" font-family="${DISPLAY}" font-size="104" font-weight="900" fill="#FFFFFF" opacity="${clamp(sube * 1.4).toFixed(2)}">${c.n}</text>
        ${aparece(t, 1.5 + k * 0.25, `${renglones(nombre.lineas, { x: c.x, y: yTop - 66, tam: nombre.tam, interlinea: Math.round(nombre.tam * 1.05), color: TINTA, ancla: 'middle', espaciado: -0.5 })}<text x="${c.x}" y="${yTop - 22}" text-anchor="middle" font-family="${TEXTO}" font-size="26" font-weight="600" fill="${GRIS}">${esc(c.f.equipo)}</text>`, { dy: 18 })}</g>`;
    }).join('');
    const tarjeta = colapinto ? aparece(t, 3.0, `<rect x="64" y="1090" width="${W - 128}" height="300" rx="30" fill="${COLOR_AUTO}" fill-opacity="0.13" stroke="${COLOR_AUTO}" stroke-width="4"/>
      <text x="108" y="1160" font-family="${TEXTO}" font-size="28" font-weight="800" letter-spacing="4" fill="${COLOR_AUTO}">FRANCO COLAPINTO</text>
      <text x="108" y="1290" font-family="${DISPLAY}" font-size="140" font-weight="900" letter-spacing="-4" fill="${TINTA}">${esc(ordinal(Math.round(colapinto.posicion * easeOut(prog(t, 3.1, 4.0)) || colapinto.posicion)))}</text>
      <text x="${W - 108}" y="1228" text-anchor="end" font-family="${TEXTO}" font-size="38" font-weight="600" fill="${GRIS}">${colapinto.parrilla ? `Largó ${ordinal(colapinto.parrilla)}` : ''}</text>
      <text x="${W - 108}" y="1290" text-anchor="end" font-family="${TEXTO}" font-size="44" font-weight="700" fill="${TINTA}">${esc(colapinto.tiempo ?? '')}</text>`, { dy: 30, dur: 0.7 }) : '';
    return escenaSobrePapel({ contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${podio}${tarjeta}` });
  };
  return crearEscena({ nombre: 'podio', variante: 'f1-carrera', cuadro, duracionMinima: 15 });
}

// ------------------------------------------------------------------ el fútbol

/** La tabla de una zona (los primeros diez). `destacado`: el id de un equipo que se quiere marcar (opcional). */
export function escenaDeTabla({ torneo, zona, filas, destacado = null }) {
  const lista = filas.slice(0, 10);
  const cab = cabecera(`${torneo}${zona ? ` · ${zona}` : ''}`, 'Así está la tabla', { color: COLOR_FUTBOL });
  const yCol = cab.hasta + 40;
  const y0 = yCol + 44;
  const gap = 10;
  const alto = Math.floor((FIN - y0 - gap * (lista.length - 1)) / lista.length);
  const xPJ = W - 64 - 36 - 260;
  const xDIF = W - 64 - 36 - 130;
  const xPTS = W - 64 - 36;
  const cuadro = (t) => {
    const columnas = aparece(t, 0.4, `<text x="${xPJ}" y="${yCol + 24}" text-anchor="end" font-family="${TEXTO}" font-size="24" font-weight="800" letter-spacing="3" fill="${GRIS}">PJ</text>
      <text x="${xDIF}" y="${yCol + 24}" text-anchor="end" font-family="${TEXTO}" font-size="24" font-weight="800" letter-spacing="3" fill="${GRIS}">DIF</text>
      <text x="${xPTS}" y="${yCol + 24}" text-anchor="end" font-family="${TEXTO}" font-size="24" font-weight="800" letter-spacing="3" fill="${COLOR_FUTBOL}">PTS</text>`, { dy: 0 });
    const items = lista.map((f, k) => {
      const y = y0 + k * (alto + gap);
      const marcada = destacado && String(f.id) === String(destacado);
      const pts = Math.round(f.pts * easeOut(prog(t, 0.9 + k * 0.16, 1.9 + k * 0.16)));
      const dif = f.dif > 0 ? `+${f.dif}` : String(f.dif).replace('-', '−');
      const tam = f.equipo.length > 20 ? 34 : 40;
      return aparece(t, 0.6 + k * 0.16, `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="22" fill="${marcada ? COLOR_FUTBOL : '#FFFFFF'}" fill-opacity="${marcada ? 0.14 : 1}" stroke="${marcada ? COLOR_FUTBOL : COLORES.lineaSuave}" stroke-width="${marcada ? 4 : 2}"/>
        <text x="${64 + 62}" y="${y + alto / 2 + 18}" text-anchor="middle" font-family="${DISPLAY}" font-size="50" font-weight="900" fill="${k === 0 ? COLOR_FUTBOL : TINTA}">${f.posicion}</text>
        <text x="${64 + 120}" y="${y + alto / 2 + 14}" font-family="${DISPLAY}" font-size="${tam}" font-weight="800" letter-spacing="-0.5" fill="${TINTA}">${esc(f.equipo)}</text>
        <text x="${xPJ}" y="${y + alto / 2 + 12}" text-anchor="end" font-family="${TEXTO}" font-size="34" font-weight="500" fill="${GRIS}">${f.pj}</text>
        <text x="${xDIF}" y="${y + alto / 2 + 12}" text-anchor="end" font-family="${TEXTO}" font-size="34" font-weight="500" fill="${GRIS}">${dif}</text>
        <text x="${xPTS}" y="${y + alto / 2 + 14}" text-anchor="end" font-family="${DISPLAY}" font-size="48" font-weight="900" fill="${TINTA}">${pts}</text>`, { dx: -40, dy: 0, dur: 0.5 });
    }).join('');
    return escenaSobrePapel({ contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${columnas}${items}` });
  };
  return crearEscena({ nombre: 'tabla', variante: 'futbol-tabla', cuadro, duracionMinima: 14 });
}

/** Un resultado: el marcador grande, los goles que cuentan hasta su valor y quién los hizo. `partido`: uno de futbol.json (estado final). */
export function escenaDeResultado({ torneo, partido }) {
  const { local, visitante } = partido;
  const cab = cabecera(torneo, partido.estado === 'final' ? 'Final del partido' : 'El resultado', { color: COLOR_FUTBOL });
  const yNombres = cab.hasta + 170;
  const yMarcador = yNombres + 400;
  const goles = (equipo) => (partido.goles ?? []).filter((g) => g.equipo === equipo && g.tipo !== 'roja').slice(0, 5);
  const cuadro = (t) => {
    const cuenta = (n, desde) => Math.round(n * easeOut(prog(t, desde, desde + 1.0)));
    const nombre = (e, x, k) => {
      const r = repartir(e.nombre, [{ tam: 56, max: 2 }, { tam: 46, max: 2 }], 440, 'serif');
      return aparece(t, 0.4 + k * 0.2, renglones(r.lineas, { x, y: yNombres, tam: r.tam, interlinea: Math.round(r.tam * 1.05), color: TINTA, ancla: 'middle', espaciado: -1 }), { dy: 24 });
    };
    const lista = (equipo, x, k) => aparece(t, 2.2 + k * 0.3, goles(equipo).map((g, i) => `<text x="${x}" y="${yMarcador + 170 + i * 68}" text-anchor="middle" font-family="${TEXTO}" font-size="38" font-weight="600" fill="${TINTA}">${esc(g.jugador)} <tspan fill="${GRIS}" font-weight="500">${esc(g.minuto)}</tspan></text>`).join(''), { dy: 20 });
    return escenaSobrePapel({
      contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${nombre(local, 64 + 250, 0)}${nombre(visitante, W - 64 - 250, 1)}
        ${aparece(t, 0.8, `<text x="${64 + 250}" y="${yMarcador}" text-anchor="middle" font-family="${DISPLAY}" font-size="300" font-weight="900" letter-spacing="-10" fill="${TINTA}">${cuenta(local.goles ?? 0, 0.9)}</text>
          <text x="${W - 64 - 250}" y="${yMarcador}" text-anchor="middle" font-family="${DISPLAY}" font-size="300" font-weight="900" letter-spacing="-10" fill="${TINTA}">${cuenta(visitante.goles ?? 0, 0.9)}</text>
          <rect x="${W / 2 - 24}" y="${yMarcador - 120}" width="48" height="12" rx="6" fill="${COLOR_FUTBOL}"/>`, { dy: 30, dur: 0.7 })}
        ${lista('local', 64 + 250, 0)}${lista('visitante', W - 64 - 250, 1)}`,
    });
  };
  return crearEscena({ nombre: 'resultado', variante: 'futbol-resultado', cuadro, duracionMinima: 14 });
}
