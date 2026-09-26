// Las medidas de imágenes y videos de cada red, en un solo lugar.
//
// Todo lo que se genera (las tarjetas de las notas, las placas de las
// historias y los podcasts, los íconos) tiene que coincidir con esto. Hay
// pruebas que lo comparan (pruebas/formatos.test.mjs) y una auditoría semanal
// que lo compara contra lo publicado (redes/auditar.mjs).
//
// LAS REDES CAMBIAN ESTO DE TANTO EN TANTO (Instagram cambió la grilla del
// perfil de cuadrada a 3:4 en 2025). Por eso cada dato lleva la fecha en que se
// verificó y de dónde salió, y la auditoría avisa cuando pasaron más de
// `VIGENCIA_DIAS` sin volver a mirarlo.
//
// Para actualizarlo: buscar las medidas vigentes, cambiar los valores y la
// fecha `verificado`, y correr `npm test`. Detalle en FORMATOS.md.

/** Cuántos días vale una verificación antes de que la auditoría pida otra. */
export const VIGENCIA_DIAS = 90;

/** Cuándo se verificaron por última vez estas medidas (AAAA-MM-DD). */
export const VERIFICADO = '2026-09-25';

/** De dónde salieron (consultadas el 24/09/2026 y, la portada de Facebook, el 25/09/2026). */
export const FUENTES = [
  'https://buffer.com/resources/instagram-image-size/',
  'https://influencermarketinghub.com/instagram-image-sizes/',
  'https://yoursocial.team/blog/instagram-new-grid-format',
  'https://buffer.com/resources/social-media-image-sizes/',
  'https://blog.hootsuite.com/social-media-image-sizes-guide/',
  // Portada de Facebook (25/09/2026): 820x312 en computadora y 640x360 en celular.
  'https://socialsizes.io/facebook-cover-photo-size/',
  'https://www.brandwatch.com/blog/facebook-cover-photo-size/',
  'https://whatdimensions.com/photo-image-sizes/dimensions-for-facebook-cover-photo',
];

export const FORMATOS = {
  instagram: {
    // Posteo del feed: vertical 4:5. La grilla del perfil lo muestra recortado
    // (3:4 en la app nueva, cuadrado en la vieja), así que el texto va en la
    // zona segura del centro.
    posteo: {
      ancho: 1080, alto: 1350, proporcion: '4:5', zonaSegura: { ancho: 1012, alto: 1080 }, verificado: true,
    },
    // Historias y reels: vertical 9:16. Arriba y abajo la app pone su propia
    // interfaz (nombre, respuesta, botones): se dejan libres ~250 px arriba y
    // ~340 px abajo.
    historia: {
      ancho: 1080, alto: 1920, proporcion: '9:16', margenArriba: 250, margenAbajo: 340, verificado: true,
    },
    reel: {
      ancho: 1080, alto: 1920, proporcion: '9:16', margenArriba: 250, margenAbajo: 340, verificado: true,
    },
    // Foto de perfil: se muestra redonda. Se sube cuadrada y grande.
    perfil: { ancho: 1080, alto: 1080, proporcion: '1:1', redonda: true, verificado: false },
  },
  facebook: {
    // Un posteo con enlace muestra la imagen del enlace (og:image) apaisada.
    enlace: { ancho: 1200, alto: 630, proporcion: '1.91:1', verificado: true },
    // Un posteo con foto propia: vertical 4:5 o cuadrado.
    foto: { ancho: 1080, alto: 1350, proporcion: '4:5', verificado: true },
    historia: { ancho: 1080, alto: 1920, proporcion: '9:16', verificado: true },
    reel: { ancho: 1080, alto: 1920, proporcion: '9:16', verificado: true },
    // Portada de la página (verificado 25/09/2026 en guías; la ayuda oficial de
    // Meta no se pudo leer entera): computadora 820x312 (2,63:1), celular 640x360
    // (16:9). Una sola imagen 16:9 al doble (1640x924): en escritorio se recorta
    // arriba y abajo a 2,63:1 (quedan las filas 150 a 774) y en el celular se ve
    // entera, con el avatar tapando el centro-abajo (desde ~54 % de la altura;
    // medido en una captura real, no documentado por Meta). El texto va en la zona
    // segura común (ver reels/portada.mjs y FORMATOS.md).
    portada: { ancho: 1640, alto: 924, proporcion: '16:9', escritorio: { ancho: 820, alto: 312 }, celular: { ancho: 640, alto: 360 }, zonaSegura: { x: 220, y: 190, ancho: 1200, alto: 235 }, verificado: true },
    perfil: { ancho: 720, alto: 720, proporcion: '1:1', redonda: true, verificado: false },
  },
  web: {
    // Lo que se ve al compartir un enlace por WhatsApp, Facebook, X, etc.
    compartir: { ancho: 1200, alto: 630, proporcion: '1.91:1', verificado: true },
    icono: { tamanos: [16, 32, 48], png: [192, 512], apple: 180, verificado: true },
  },
};

/**
 * Qué datos NO se pudieron confirmar en la última verificación (`verificado:
 * false`): se dejan con el valor habitual pero la auditoría los marca para
 * volver a mirarlos en la fuente oficial.
 */
export function sinConfirmar() {
  const r = [];
  for (const [red, formatos] of Object.entries(FORMATOS)) {
    for (const [nombre, f] of Object.entries(formatos)) if (f.verificado === false) r.push(`${red}.${nombre}`);
  }
  return r;
}

/** Días que pasaron desde la última verificación. */
export function diasDesdeVerificado(ahora = new Date()) {
  return Math.floor((ahora.getTime() - new Date(`${VERIFICADO}T12:00:00Z`).getTime()) / 86400000);
}

/** ¿Hace falta volver a verificar las medidas? */
export const hayQueVolverAVerificar = (ahora = new Date()) => diasDesdeVerificado(ahora) > VIGENCIA_DIAS;

/** Lee el ancho y el alto de un PNG desde sus primeros bytes. */
export function medidaDePng(buffer) {
  const b = Buffer.from(buffer);
  if (b.length < 24 || b.subarray(1, 4).toString() !== 'PNG') return null;
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}
