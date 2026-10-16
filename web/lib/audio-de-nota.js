// El audio de una nota (17/10/2026). PROTOTIPO, SIN CONECTAR: ninguna página lo usa y el interruptor está apagado.
// El diseño, los números y lo que falta para prenderlo: docs/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md.
//
// Qué hace: decide si una nota tiene un audio que se pueda mostrar en la página y devuelve lo necesario para el reproductor
// (`components/reproductor-de-audio.js`). No toca el disco ni la red: se prueba con node --test (pruebas/audio-en-la-pagina.test.mjs).
//
// Reglas de seguridad (el audio NUNCA va en Cloudflare Pages, que tiene tope de archivos: vive en un depósito público aparte):
//   * sólo una dirección https de NUESTRO servidor de audio (SERVIDOR_DE_AUDIO), exacta: ni subdominios raros, ni r2.dev, ni usuario@;
//   * sólo .mp3 o .m4a, con el tamaño real en bytes y la duración (sin eso el reproductor no se muestra);
//   * con el interruptor apagado devuelve siempre null, aunque la nota traiga audio.

/** Para prender el reproductor en las notas que tengan audio, poner true (y haber cumplido las etapas 0 y 1 del documento). */
export const AUDIO_EN_LA_PAGINA = false;

/** El único host desde el que se acepta un audio. Es un dominio propio conectado a un depósito público de R2 (no `*.r2.dev`). */
export const SERVIDOR_DE_AUDIO = 'audio.radarbalcarce.com';

const TIPOS = { mp3: 'audio/mpeg', m4a: 'audio/mp4' };

/** "52 segundos", "1 minuto 5 segundos", "10 minutos": para leer en voz alta y para el texto del reproductor. */
export function duracionHablada(segundos) {
  const s = Math.max(0, Math.round(Number(segundos) || 0));
  if (s < 60) return `${s} ${s === 1 ? 'segundo' : 'segundos'}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const minutos = `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  return r ? `${minutos} ${r} ${r === 1 ? 'segundo' : 'segundos'}` : minutos;
}

/** "420 KB" o "1,4 MB": cuánto se baja si se aprieta "reproducir" (con preload="none" no se baja nada antes). */
export function pesoLegible(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1_000_000) return `${Math.max(1, Math.round(b / 1000))} KB`;
  return `${(b / 1_000_000).toFixed(1).replace('.', ',')} MB`;
}

/**
 * El audio de la nota listo para mostrar, o null.
 * La nota trae `audio: { url, bytes, segundos }` (lo escribirá el paso que sube el mp3; todavía no existe).
 */
export function audioDeNota(nota, { activo = AUDIO_EN_LA_PAGINA } = {}) {
  if (!activo) return null;
  const a = nota?.audio;
  if (!a || typeof a.url !== 'string') return null;
  let u;
  try { u = new URL(a.url); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== SERVIDOR_DE_AUDIO || u.username || u.password || u.port || u.search || u.hash) return null;
  const ext = /\.(mp3|m4a)$/i.exec(u.pathname)?.[1]?.toLowerCase();
  if (!ext) return null;
  const bytes = Math.round(Number(a.bytes));
  const segundos = Number(a.segundos);
  if (!(bytes > 0) || !(segundos > 0)) return null;
  return {
    url: u.href,
    tipo: TIPOS[ext],
    bytes,
    segundos,
    duracion: duracionHablada(segundos),
    peso: pesoLegible(bytes),
  };
}
