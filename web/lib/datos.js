// Lee web/data/portada.json, generado por scripts/generar-datos.mjs.
// Todas las páginas del sitio pasan por acá — nunca leen el panel
// directamente, así la web funciona igual desplegada en Vercel que en
// una PC con el panel corriendo al lado.

import fs from 'node:fs';
import path from 'node:path';

const ARCHIVO = path.join(process.cwd(), 'data', 'portada.json');

export function obtenerDatos() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  } catch {
    // Sin datos generados todavía: la web no se rompe, muestra vacío.
    return {
      generado: null, notas: [], secciones: [], clima: null,
      farmacias: { hoy: null, proximos: [], avisos: [] },
      agenda: { municipio: [], proximosAnuales: [] },
      utiles: { numeros: [], diaDeLaSemana: null, tocaHoy: false },
    };
  }
}

export function obtenerNota(id) {
  return obtenerDatos().notas.find((n) => n.id === id) ?? null;
}

export function haceCuanto(fechaISO) {
  const min = Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  const dias = Math.round(min / 1440);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

/**
 * Qué decir en el lugar de la hora.
 *
 * Si la fuente publicó la hora, esa. Si no, cuándo la vimos nosotros, que
 * es lo único que sabemos de verdad. Decía "sin hora", que parecía un
 * error nuestro y no le servía a nadie para saber si la nota es de hoy.
 */
export function cuando(nota) {
  if (!nota.sinFecha) return haceCuanto(nota.fecha);
  return nota.visto ? `la vimos ${haceCuanto(nota.visto)}` : 'sin hora';
}

// ---------------------------------------------------------------- contacto

// El WhatsApp del medio. La investigación dejó claro que es el canal: los
// cinco portales de la zona lo tienen y nosotros éramos los únicos sin él.
// En un pueblo el mail es un trámite; el WhatsApp es donde ya está la gente.
export const WHATSAPP = {
  // El formato de wa.me: país (54), el 9 de celular, el código de área sin
  // el cero y el número sin el 15.
  numero: '5492266511612',
  visible: '2266 51-1612',
};

/** Un enlace de WhatsApp con el mensaje ya escrito. Que la persona no tenga
 *  que explicar de dónde viene ni qué quiere. */
export function whatsapp(mensaje) {
  return `https://wa.me/${WHATSAPP.numero}?text=${encodeURIComponent(mensaje)}`;
}

export const MAIL = 'radarbalcarce@gmail.com';

// ------------------------------------------------------------- secciones

// El orden de acá es el orden de la navegación, y es editorial: primero lo
// que pasa en Balcarce, después lo que a Balcarce le interesa. País va
// último a propósito — si alguien quiere nacionales, tiene mil lugares;
// acá viene por lo local.
export const SECCIONES = [
  { nombre: 'Balcarce', ranura: 'balcarce', color: 'var(--s-balcarce)' },
  { nombre: 'Política', ranura: 'politica', color: 'var(--s-politica)' },
  { nombre: 'Policiales', ranura: 'policiales', color: 'var(--s-policiales)' },
  { nombre: 'Deportes', ranura: 'deportes', color: 'var(--s-deportes)' },
  { nombre: 'Automovilismo', ranura: 'automovilismo', color: 'var(--s-automovilismo)' },
  { nombre: 'Agro', ranura: 'agro', color: 'var(--s-agro)' },
  { nombre: 'Cultura y agenda', ranura: 'cultura', color: 'var(--s-cultura)' },
  { nombre: 'Tecnología', ranura: 'tecnologia', color: 'var(--s-tecnologia)' },
  { nombre: 'Servicios', ranura: 'servicios', color: 'var(--s-servicios)' },
  { nombre: 'País', ranura: 'pais', color: 'var(--s-pais)' },
];

// Las que van en la barra de navegación: el resto existe igual como página,
// pero no ocupa lugar arriba.
export const EN_NAVEGACION = ['Balcarce', 'Policiales', 'Deportes', 'Automovilismo', 'Agro', 'Cultura y agenda', 'Tecnología'];

export function datosSeccion(nombre) {
  return SECCIONES.find((s) => s.nombre === nombre)
    ?? { nombre, ranura: ranuraDe(nombre), color: 'var(--s-pais)' };
}

export function porRanura(ranura) {
  return SECCIONES.find((s) => s.ranura === ranura) ?? null;
}

function ranuraDe(nombre) {
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Un nombre corto para la navegación y las etiquetas: "Cultura y agenda"
// no entra en una etiqueta de 8 caracteres.
export function nombreCorto(nombre) {
  return nombre === 'Cultura y agenda' ? 'Cultura' : nombre;
}

// ---------------------------------------------------------------- fechas

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Parte "2026-09-18 21:00:00" en { dia, mes, hora } sin depender de la
 *  zona horaria del servidor: la agenda del municipio viene en hora local. */
export function partirFecha(texto) {
  if (!texto) return null;
  const m = String(texto).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return {
    dia: String(Number(m[3])),
    mes: MESES[Number(m[2]) - 1] ?? '',
    hora: m[4] ? `${m[4]}:${m[5]}` : null,
    iso: `${m[1]}-${m[2]}-${m[3]}`,
  };
}
