// Los canales propios del medio: WhatsApp, Telegram y Bluesky (17/10/2026, regla 257).
//
// Sólo existen cuando una persona carga la dirección en una variable de entorno (en GitHub: Settings > Secrets and variables > Actions >
// Variables; en el motor de Cloudflare, la misma variable): WHATSAPP_CANAL_URL, TELEGRAM_CANAL_URL y BLUESKY_URL. Sin la variable no
// aparece NADA en el sitio: ni un botón, ni un enlace, ni una línea del marcado. Las direcciones las crea una persona desde cada
// aplicación (nunca se inventan acá) y se pegan tal cual.
//
// Como la dirección viaja a un enlace que ven todos los lectores, se valida: tiene que ser https, sin usuario ni clave, y de la web de
// ese servicio (whatsapp.com, t.me o telegram.me, bsky.app). Una variable mal pegada (o con otra cosa adentro) se ignora en vez de poner
// un enlace roto o ajeno en todas las notas.
//
// Sin imports con "@/": las pruebas lo cargan con node pelado.

/** Qué variable, qué dominios y qué texto lleva cada canal. El orden es el del pie. */
export const CANALES = [
  {
    id: 'whatsapp',
    variable: 'WHATSAPP_CANAL_URL',
    nombre: 'WhatsApp',
    dominios: ['whatsapp.com', 'chat.whatsapp.com'],
    // Lo que va en el cartel del final de cada nota (sólo el de WhatsApp tiene cartel; los otros, enlace en el pie).
    cartel: { titulo: 'Lo importante, en tu WhatsApp', texto: 'Sumate al canal de Radar Balcarce y recibí las noticias del día en el celular.', boton: 'Sumarme al canal' },
  },
  { id: 'telegram', variable: 'TELEGRAM_CANAL_URL', nombre: 'Telegram', dominios: ['t.me', 'telegram.me'] },
  { id: 'bluesky', variable: 'BLUESKY_URL', nombre: 'Bluesky', dominios: ['bsky.app'] },
];

/** La dirección limpia si es https y de uno de esos dominios; si no, null. */
export function direccionDeCanal(valor, dominios) {
  const crudo = String(valor ?? '').trim();
  if (!crudo) return null;
  let u;
  try { u = new URL(crudo); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!dominios.includes(host)) return null;
  // Una dirección con sólo el dominio ("https://t.me/") no lleva a ningún canal.
  if (u.pathname.replace(/\//g, '') === '') return null;
  return u.href;
}

/**
 * Los canales que están configurados: [{ id, nombre, url, cartel? }] en el orden de CANALES. `env` es `process.env` (se lee al compilar;
 * los componentes que lo usan son del servidor).
 */
export function canalesDelMedio(env = process.env) {
  return CANALES
    .map((c) => ({ ...c, url: direccionDeCanal(env?.[c.variable], c.dominios) }))
    .filter((c) => c.url)
    .map(({ id, nombre, url, cartel }) => ({ id, nombre, url, ...(cartel ? { cartel } : {}) }));
}

/** El canal de WhatsApp, o null: el único que lleva cartel al final de las notas. */
export function canalDeWhatsApp(env = process.env) {
  return canalesDelMedio(env).find((c) => c.id === 'whatsapp') ?? null;
}
