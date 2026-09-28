// Las medidas, los colores y las cuentas de las tarjetas de las notas
// (lib/tarjeta.js): la de Instagram (el espejo de cada posteo de Facebook,
// 1080 x 1350) y la de compartir un enlace (Facebook, WhatsApp, 1200 x 630).
//
// Aparte de tarjeta.js porque ese archivo importa next/og, que sólo carga
// adentro de Next: acá está todo lo que se puede probar sin levantar el sitio
// (pruebas/tarjeta-diseno.test.mjs).
//
// El diseño es el que aprobó Hernán el 28/09 (lienzo "Radar Balcarce ·
// Plantillas redes"): fondo papel, la foto de la nota arriba con la franja de
// color de su sección, el título en serif, la bajada y el pie con "Radar
// Balcarce" y la fecha. Sin foto, el bloque de color de la sección con los
// anillos del radar ("Placa sin foto"). Las letras son las del sitio (Source
// Serif 4 e Inter) y los colores de sección, los de la web (--s-*).

import fs from 'node:fs';
import path from 'node:path';

/**
 * ¿La imagen del posteo de Instagram lleva la foto de la nota (del banco
 * propio, con el crédito en el texto del posteo)? Por ahora NO: CRITERIO-
 * EDITORIAL.md § 9 dice que en redes va siempre la placa propia, y usar ahí la
 * foto de otro medio lo decide Hernán (28/09). Lo leen la imagen
 * (app/nota/[id]/instagram.png) y el texto del posteo (redes/publicar.mjs), así
 * nunca va un crédito sin foto ni una foto sin crédito.
 */
export const FOTO_EN_INSTAGRAM = false;

export const TAMANO = { width: 1200, height: 630 };
export const TAMANO_INSTAGRAM = { width: 1080, height: 1350 };

export const PAPEL = '#FAF8F3';
export const TINTA = '#14161A';
export const GRIS = '#474C55';
export const LINEA = '#D9D4C7';
// El rojo de la marca: "Balcarce" en la firma (MEDIA-KIT.md).
export const ROJO = '#C7381C';

// Un color por sección, el mismo de la web (--s-* de web/app/globals.css).
// Son oscuros: el nombre de la sección va en blanco encima, y como texto sobre
// el papel también se leen (pruebas/titulos-colores.test.mjs lo controla).
export const COLOR = {
  Balcarce: '#B91C1C',
  Política: '#3730A3',
  Policiales: '#831843',
  Fútbol: '#15803D',
  Deportes: '#0F766E',
  Automovilismo: '#B45309',
  Agro: '#4D7C0F',
  'Cultura y agenda': '#9D2C8F',
  Economía: '#8A6500',
  Tecnología: '#0B6FB8',
  Argentina: '#4B5563',
};
export const POR_DEFECTO = ROJO;

/** El color de la sección de la nota; sin sección, el rojo de la marca. */
export const colorDe = (seccion) => COLOR[seccion] ?? POR_DEFECTO;

// La tarjeta de Instagram. La grilla del perfil la recorta (a 3:4 en la app
// nueva y a cuadrado en la vieja: 135 px arriba y abajo), así que todo el
// TEXTO va entre las filas 135 y 1215 (redes/formatos.mjs, zonaSegura). La
// foto y el bloque de color sí llegan al borde: si se recortan, no se pierde nada.
export const INSTAGRAM = {
  margen: 72,
  arriba: 150, // el rótulo de la sección, sobre la foto o el bloque
  abajo: 135, // el pie termina acá
  foto: 690, // alto de la foto
  bloque: 560, // alto del bloque de color de la placa sin foto
  franja: 14, // la franja del color de la sección debajo de la foto
  pie: 76, // la raya, la firma y la fecha
};

// Cuánto ocupa un texto, aproximadamente (los mismos factores que
// reels/placa.mjs, calibrados contra Source Serif 4 Black el 27/09 y el 28/09).
const LETRA = { estrecha: 0.30, normal: 0.50, ancha: 0.84, mayuscula: 0.63, numero: 0.54 };
export function anchoAproximado(texto, tam, familia = 'serif') {
  let total = 0;
  for (const c of String(texto)) {
    if (' iltjfr.,;:!|\'"()[]-·'.includes(c)) total += LETRA.estrecha;
    else if ('mwMW'.includes(c)) total += LETRA.ancha;
    else if (c >= '0' && c <= '9') total += LETRA.numero;
    else if (c === c.toUpperCase() && c !== c.toLowerCase()) total += LETRA.mayuscula;
    else total += LETRA.normal;
  }
  return total * tam * (familia === 'sans' ? 1.16 : 1);
}

/** En cuántos renglones queda un texto a un cuerpo dado. */
export function renglonesDe(texto, tam, ancho, familia = 'serif') {
  const palabras = String(texto ?? '').split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = (`${actual} ${p}`).trim();
    if (actual && anchoAproximado(prueba, tam, familia) > ancho * 0.96) { lineas.push(actual); actual = p; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Corta la bajada en una palabra entera para que entre en `maxRenglones`
 * renglones, con puntos suspensivos si hubo que cortar. Vacía si no entra
 * ni un renglón.
 */
export function bajadaQueEntra(texto, tam, ancho, maxRenglones) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (!t || maxRenglones < 1) return '';
  const lineas = renglonesDe(t, tam, ancho, 'sans');
  if (lineas.length <= maxRenglones) return t;
  const cortado = lineas.slice(0, maxRenglones).join(' ').split(' ');
  // Se saca la última palabra para dejar lugar a los puntos suspensivos.
  cortado.pop();
  return `${cortado.join(' ').replace(/[\s,.;:]+$/, '')}…`;
}

// Los cuerpos del título, de mayor a menor, con cuántos renglones se permiten.
// Gana el primero donde el título entra entero: nunca se corta.
const ESCALONES = {
  conFoto: [{ tam: 72, max: 2 }, { tam: 64, max: 3 }, { tam: 56, max: 3 }, { tam: 50, max: 4 }, { tam: 44, max: 5 }, { tam: 38, max: 6 }],
  sinFoto: [{ tam: 84, max: 3 }, { tam: 74, max: 4 }, { tam: 64, max: 5 }, { tam: 56, max: 6 }, { tam: 48, max: 7 }, { tam: 42, max: 8 }],
  enlace: [{ tam: 78, max: 2 }, { tam: 68, max: 3 }, { tam: 60, max: 3 }, { tam: 52, max: 4 }, { tam: 44, max: 5 }, { tam: 38, max: 6 }],
};
export const INTERLINEA_TITULO = 1.06;
export const INTERLINEA_BAJADA = 1.35;

/**
 * Cómo se reparte el texto de la tarjeta: cuerpo del título (el más grande
 * donde entra entero en su lugar) y, con lo que sobra, cuánta bajada entra.
 * `formato`: 'conFoto' | 'sinFoto' | 'enlace'.
 */
export function repartirTexto({ titulo = '', copete = '' } = {}, formato = 'conFoto') {
  const alto = altoParaTexto(formato);
  const ancho = anchoParaTexto(formato);
  const escalones = ESCALONES[formato];
  let elegido = null;
  for (const e of escalones) {
    const n = renglonesDe(titulo, e.tam, ancho).length;
    if (n <= e.max && n * e.tam * INTERLINEA_TITULO <= alto) { elegido = { tam: e.tam, renglones: n }; break; }
  }
  // Ni en el más chico: se deja el más chico igual (el título no se corta nunca).
  elegido ??= { tam: escalones[escalones.length - 1].tam, renglones: renglonesDe(titulo, escalones[escalones.length - 1].tam, ancho).length };
  const altoTitulo = Math.ceil(elegido.renglones * elegido.tam * INTERLINEA_TITULO);

  // La bajada, sólo en la de Instagram con foto (el lienzo no la lleva sin foto
  // ni en la apaisada, donde no hay lugar).
  let bajada = '';
  const tamBajada = 30;
  if (formato === 'conFoto' && copete) {
    const sobra = alto - altoTitulo - 22;
    const entran = Math.min(3, Math.floor(sobra / (tamBajada * INTERLINEA_BAJADA)));
    bajada = bajadaQueEntra(copete, tamBajada, ancho, entran);
  }
  return {
    tamTitulo: elegido.tam, renglonesTitulo: elegido.renglones, altoTitulo, bajada, tamBajada, alto,
  };
}

/** El ancho del texto en cada formato. */
export function anchoParaTexto(formato) {
  if (formato === 'enlace') return TAMANO.width - 64 * 2;
  return TAMANO_INSTAGRAM.width - INSTAGRAM.margen * 2;
}

/** El alto que le queda al título (y la bajada) en cada formato. */
export function altoParaTexto(formato) {
  const I = INSTAGRAM;
  const finTexto = TAMANO_INSTAGRAM.height - I.abajo - I.pie - 24;
  if (formato === 'conFoto') return finTexto - (I.foto + I.franja + 44);
  if (formato === 'sinFoto') return finTexto - (I.bloque + 56);
  // La apaisada: la banda de color arriba (150), el pie abajo (70).
  return TAMANO.height - 150 - 14 - 40 - 70 - 40;
}

/** El cuerpo del nombre de la sección en la placa sin foto: lo más grande que entre en un renglón. */
export function tamNombreDeSeccion(nombre, ancho = TAMANO_INSTAGRAM.width - INSTAGRAM.margen * 2) {
  return Math.min(190, Math.floor((ancho * 0.94) / Math.max(1, anchoAproximado(nombre, 1))));
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "28 sep": la fecha de la nota, en la hora de Balcarce. Vacía si no hay. */
export function fechaCorta(nota) {
  const cuando = nota?.publicadaCuando ?? nota?.fecha;
  const d = cuando ? new Date(cuando) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const partes = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).formatToParts(d);
  const valor = (tipo) => Number(partes.find((p) => p.type === tipo)?.value);
  return `${valor('day')} ${MESES_CORTOS[valor('month') - 1]}`;
}

const TIPOS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/**
 * La foto de la nota en el banco propio (web/data/banco-fotos.json →
 * public/fotos-notas/ID.ext), si existe: la ruta del archivo y su tipo. Sin
 * foto (o si el archivo no está), null y va la placa sin foto.
 *
 * El crédito NUNCA va adentro de la imagen: va en el texto del posteo
 * (redes/elegir.mjs, conCreditoDeFoto) y en la página de la nota.
 */
export function fotoDeLaNota(nota, publica = path.join(process.cwd(), 'public')) {
  const archivo = nota?.foto?.archivo;
  if (!archivo || /\.\.|^\//.test(archivo)) return null;
  const ext = path.extname(archivo).slice(1).toLowerCase();
  const tipo = TIPOS[ext];
  const ruta = path.join(publica, archivo);
  if (!tipo || !fs.existsSync(ruta)) return null;
  return { ruta, tipo, credito: nota.foto.credito ?? null };
}
