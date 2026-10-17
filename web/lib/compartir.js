// El enlace para compartir por WhatsApp (17/10/2026, regla 254). Aparte de components/compartir.js para poder probarlo sin compilar.

/**
 * `https://wa.me/?text=…` con el titular, una línea en blanco y la dirección canónica. Es un enlace común: anda sin JavaScript, sin cookies y
 * sin ningún script de WhatsApp en la página. La dirección tiene que ser la del propio sitio (sin parámetros de seguimiento pegados).
 */
export function enlaceDeWhatsApp(titulo, url) {
  return `https://wa.me/?text=${encodeURIComponent(`${String(titulo ?? '').replace(/\s+/g, ' ').trim()}\n\n${url}`)}`;
}
