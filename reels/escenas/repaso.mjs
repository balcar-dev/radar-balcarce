// El repaso animado (17/10/2026, regla 209). El repaso es la pieza principal del día y era la menos animada: entraba la lista y quedaba
// quieta unos 50 segundos. Ahora el video sigue a la voz: mientras cuenta cada nota se ve SU foto (o su ilustración; si no tiene, una
// placa con el color de su sección), con su titular grande y "2 de 4" arriba; arranca con la primera nota, que es la más fuerte, y cierra
// con la lista completa, que es también la TAPA del reel (el primer cuadro, la imagen que muestran Instagram y Facebook en la grilla).
//
// Es una SECUENCIA de placas (las mismas piezas de dibujo de reels/placa.mjs, con su entrada animada de reels/animacion.mjs): cada una
// arranca cuando la voz llega a su nota. El momento sale de los tiempos de cada palabra (reels/alinear.mjs): la placa de una nota entra
// cuando empieza la oración que la cuenta ("Cambiando de tema: …"). Si algo no se encuentra, la pieza sale como antes, con la lista quieta
// (la animación nunca frena una pieza, regla 157).
//
// Las fotos son las que ya muestra la web (web/data/portada.json → web/public/fotos-notas/), sin marca, y el crédito va ABAJO de la foto,
// como el epígrafe de la web, nunca encima (CLAUDE.md, "Las fotos"). Las fotos con chicos que entraron por la excepción de la regla 186
// no van a las redes. Este archivo es dibujo puro (SVG); leer las fotos del disco lo hace `fotoParaElRepaso`.

import fs from 'node:fs';
import path from 'node:path';
import {
  ANCHO, COLORES, colorDeSeccion, repartir, esc, rotulo, renglones, lienzo, pie, DISPLAY, TEXTO, MARGEN, placaRepaso,
} from '../placa.mjs';
import { paraLeer } from '../voz.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..');

/** La caja de la foto (16:10), dentro de la zona segura. */
export const FOTO = { x: MARGEN, y: 380, ancho: ANCHO - MARGEN * 2, alto: 585, radio: 26 };
const FIN_TITULAR = 1440;
const ESCALONES_TITULAR = [{ tam: 74, max: 3 }, { tam: 66, max: 4 }, { tam: 58, max: 4 }, { tam: 52, max: 5 }, { tam: 46, max: 5 }];

const TIPOS_DE_IMAGEN = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/**
 * La foto de una nota para el repaso: { datos: 'data:image/jpeg;base64,…', credito } o null. Sólo la que ya está en la web, guardada en
 * el sitio; nunca una con chicos de la excepción de la regla 186 (`banco[id].excepcion`), aunque la web la muestre.
 */
export function fotoParaElRepaso(nota, { banco = {}, raiz = RAIZ, tope = 2_500_000 } = {}) {
  const archivo = nota?.foto?.archivo;
  if (!archivo || banco?.[nota.id]?.excepcion) return null;
  const tipo = TIPOS_DE_IMAGEN[path.extname(archivo).toLowerCase()];
  if (!tipo || archivo.includes('..')) return null;
  try {
    const ruta = path.join(raiz, 'web', 'public', archivo);
    if (fs.statSync(ruta).size > tope) return null;
    return { datos: `data:${tipo};base64,${fs.readFileSync(ruta).toString('base64')}`, credito: String(nota.foto.credito ?? '').trim() };
  } catch { return null; }
}

/** "2 de 4" y las rayitas de avance arriba. */
function avance(i, n, color) {
  const hueco = 12;
  const ancho = (ANCHO - MARGEN * 2 - hueco * (n - 1)) / n;
  const rayas = Array.from({ length: n }, (_, k) => `<rect x="${(MARGEN + k * (ancho + hueco)).toFixed(1)}" y="330" width="${ancho.toFixed(1)}" height="8" rx="4" fill="${k <= i ? color : COLORES.linea}"/>`).join('');
  return `<g>${rayas}</g>`;
}

/** La imagen de la nota (foto o ilustración) recortada en la caja, o la placa de su sección si no tiene. */
function imagen(nota, i, color) {
  const { x, y, ancho, alto, radio } = FOTO;
  if (nota.foto?.datos) {
    return `<g><clipPath id="caja${i}"><rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="${radio}"/></clipPath>
    <image href="${nota.foto.datos}" x="${x}" y="${y}" width="${ancho}" height="${alto}" preserveAspectRatio="xMidYMid slice" clip-path="url(#caja${i})"/></g>`;
  }
  // Sin foto: la placa de la sección (el color de siempre, el nombre grande y el número de la nota).
  const seccion = String(nota.seccion ?? 'Radar Balcarce');
  const t = repartir(seccion, [{ tam: 120, max: 1 }, { tam: 96, max: 2 }, { tam: 80, max: 2 }], ancho - 120);
  return `<g><rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="${radio}" fill="${color}"/>
    <text x="${x + ancho - 60}" y="${y + alto - 60}" font-family="${DISPLAY}" font-size="300" font-weight="900" text-anchor="end" fill="#FFFFFF" fill-opacity="0.16">${i + 1}</text>
    ${renglones(t.lineas, { x: x + 60, y: y + 90 + Math.round(t.tam * 0.9), tam: t.tam, color: '#FFFFFF', espaciado: -2 })}</g>`;
}

/**
 * La placa de UNA nota del repaso: el nombre del repaso y "i de n", la foto, su crédito abajo (epígrafe), la sección y el titular grande.
 * `nota` = { titulo, seccion, foto: { datos, credito } | null }.
 */
export function placaDeNotaDelRepaso({ nota, i, n, titulo }) {
  const color = colorDeSeccion(nota.seccion);
  const credito = nota.foto?.datos && nota.foto.credito ? nota.foto.credito : '';
  const yRotulo = FOTO.y + FOTO.alto + (credito ? 108 : 78);
  const t = repartir(String(nota.titulo ?? ''), ESCALONES_TITULAR, ANCHO - MARGEN * 2);
  const inter = Math.round(t.tam * 1.08);
  const yTitular = yRotulo + 26 + Math.round(t.tam * 0.92);
  // Si el titular no entra hasta la fila de la firma, sube un poco (nunca pisa la foto).
  const sobra = Math.max(0, yTitular + (t.lineas.length - 1) * inter - FIN_TITULAR);
  return lienzo(`
  ${rotulo(titulo, { y: 304, color: COLORES.rojo })}
  <text x="${ANCHO - MARGEN}" y="304" font-family="${TEXTO}" font-size="28" font-weight="700" text-anchor="end" fill="${COLORES.gris}">${i + 1} de ${n}</text>
  ${avance(i, n, COLORES.rojo)}
  ${imagen(nota, i, color)}
  ${credito ? `<text x="${MARGEN}" y="${FOTO.y + FOTO.alto + 44}" font-family="${TEXTO}" font-size="24" font-weight="500" fill="${COLORES.gris}">${esc(credito)}</text>` : ''}
  ${nota.seccion ? rotulo(nota.seccion, { y: yRotulo - sobra, color, tam: 28 }) : ''}
  ${renglones(t.lineas, { y: yTitular - sobra, tam: t.tam, interlinea: inter, espaciado: -1.5 })}
  ${pie()}`);
}

/**
 * La secuencia del repaso: una placa por nota y, al final, la lista completa (que es también la tapa). Cada placa lleva su `marca`: el
 * texto con el que la voz llega a ella (el titular de la nota; la lista, el cierre). La primera no lleva: arranca con el video.
 * `notas` = [{ titulo, seccion, foto }] en el orden en que las cuenta la voz; `cierre`, el texto del cierre del guion.
 */
export function secuenciaDelRepaso({ titulo, momento, fecha = '', segundos = null, notas = [], cierre = '' }) {
  if (notas.length < 2) return null;
  const lista = placaRepaso({ titulo, momento, fecha, segundos, notas: notas.map((x) => ({ seccion: x.seccion, titulo: x.titulo })), color: COLORES.rojo });
  return {
    placas: [
      ...notas.map((nota, i) => ({ svg: placaDeNotaDelRepaso({ nota, i, n: notas.length, titulo }), marca: i === 0 ? null : nota.titulo })),
      ...(cierre ? [{ svg: lista, marca: cierre }] : []),
    ],
    tapa: lista,
  };
}

// ------------------------------------------------------------------ cuándo entra cada placa

const normal = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const palabrasDe = (texto) => paraLeer(String(texto ?? '')).split(/\s+/).map(normal).filter(Boolean);
const terminaFrase = (p) => Boolean(p?.finFrase) || /[.!?]["»”)]*$/.test(String(p?.texto ?? ''));

/**
 * El segundo en que la voz empieza la oración de cada marca (en orden), o null si alguna no aparece. `palabras` son las de la voz
 * ({ texto, desde }, reels/alinear.mjs). Se busca la marca por sus primeras palabras (hasta tres) a partir de la anterior, y se vuelve al
 * comienzo de su oración (así la placa entra con el "Cambiando de tema:" y no a mitad del titular).
 */
export function tiemposDeLasMarcas(palabras = [], marcas = []) {
  const voz = palabras.map((p) => normal(p.texto));
  const tiempos = [];
  let desde = 0;
  for (const marca of marcas) {
    const buscadas = palabrasDe(marca).slice(0, 3);
    if (!buscadas.length) return null;
    let k = -1;
    for (let j = desde; j <= voz.length - buscadas.length; j += 1) {
      if (buscadas.every((b, m) => voz[j + m] === b)) { k = j; break; }
    }
    if (k < 0) return null;
    let inicio = k;
    while (inicio > desde && inicio > k - 6 && !terminaFrase(palabras[inicio - 1])) inicio -= 1;
    tiempos.push(Number(palabras[inicio].desde));
    desde = k + buscadas.length;
  }
  return tiempos;
}

/**
 * Las placas con su momento ({ svg, desde }), listas para el video, o null si no se pueden ubicar (entonces la pieza sale como antes).
 * `retardo` es lo que tarda en entrar la voz (reels/reel.mjs). Entre una placa y la siguiente hay por lo menos `minimo` segundos.
 */
export function placasConTiempos(secuencia, palabras, { retardo = 0, minimo = 1.5, total = Infinity } = {}) {
  if (!secuencia?.placas?.length || !palabras?.length) return null;
  const conMarca = secuencia.placas.slice(1);
  const tiempos = tiemposDeLasMarcas(palabras, conMarca.map((p) => p.marca));
  if (!tiempos) return null;
  const salida = [{ svg: secuencia.placas[0].svg, desde: 0 }];
  for (let i = 0; i < conMarca.length; i += 1) {
    const t = tiempos[i] + retardo;
    if (t - salida[salida.length - 1].desde < minimo || t >= total - 0.5) return null;
    salida.push({ svg: conMarca[i].svg, desde: Number(t.toFixed(3)) });
  }
  return salida;
}
