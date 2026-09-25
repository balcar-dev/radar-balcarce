// Dos controles chicos del servidor del panel, separados para poder probarlos
// sin levantarlo.
//
//   · De dónde viene un pedido que cambia algo. La cookie de sesión viaja
//     sola con cualquier pedido que arme el navegador, también desde otra
//     página: si Hernán tiene el panel abierto y entra a un sitio malicioso,
//     ese sitio podría mandar un formulario a localhost:4321 y publicar o
//     borrar algo en su nombre. El navegador marca esos pedidos con el
//     encabezado Origin, así que si viene y no es el panel, se rechaza.
//
//   · Qué direcciones se dejan probar desde "Probar una fuente". Sin límite,
//     el panel servía para mirar adentro de la red de casa (el router, otra
//     PC) desde afuera, por el túnel.
//
// Sin dependencias: sólo lo que trae Node.

import dns from 'node:dns';
import net from 'node:net';

const CAMBIAN_ALGO = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Si la conexión llegó desde esta misma PC. Tailscale Funnel entrega los
 *  pedidos de afuera por acá (127.0.0.1), así que eso sólo no alcanza para
 *  confiar en alguien: sirve para saber si los encabezados X-Forwarded-*
 *  los puso el túnel o los inventó el que llama. */
export function desdeEstaPC(req) {
  const ip = String(req.socket?.remoteAddress ?? '');
  return ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.');
}

/** ¿Se acepta este pedido según su origen? Los GET siempre (no cambian
 *  nada). Los que cambian algo, sólo si no traen Origin (un navegador viejo,
 *  una prueba con curl) o si el Origin es el mismo panel. */
export function origenPermitido(req) {
  if (!CAMBIAN_ALGO.has(String(req.method ?? 'GET').toUpperCase())) return true;
  const origen = req.headers?.origin;
  if (origen === undefined || origen === '') return true;
  let host;
  try { host = new URL(origen).host.toLowerCase(); } catch { return false; } // "null" y basura
  const propios = [req.headers?.host];
  // Detrás del túnel, el nombre con el que entró el navegador viene en
  // X-Forwarded-Host. Sólo se le cree si lo puso el túnel.
  if (desdeEstaPC(req)) propios.push(req.headers?.['x-forwarded-host']);
  return propios.some((h) => h && String(h).toLowerCase() === host);
}

// ------------------------------------------------ las direcciones internas

function ipv4Interna(ip) {
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127); // la red de Tailscale (CGNAT)
}

/** ¿Es una IP de la red de casa, de esta PC o de Tailscale? */
export function ipInterna(ip) {
  const limpia = String(ip).replace(/^\[|\]$/g, '').toLowerCase();
  if (net.isIPv4(limpia)) return ipv4Interna(limpia);
  if (!net.isIPv6(limpia)) return false;
  if (limpia === '::1' || limpia === '::') return true;
  const mapeada = limpia.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapeada) return ipv4Interna(mapeada[1]);
  if (limpia.startsWith('::ffff:')) return true; // mapeada escrita en hexadecimal: por las dudas, no
  return /^f[cd]/.test(limpia) || /^fe[89ab]/.test(limpia); // fc00::/7 y fe80::/10
}

/** Mira sólo el texto de la dirección: que sea http(s) y que no apunte a
 *  una máquina de adentro. Devuelve { ok, motivo, url }. */
export function urlDePruebaPermitida(texto) {
  let url;
  try { url = new URL(String(texto ?? '').trim()); } catch { return { ok: false, motivo: 'no es una dirección válida' }; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, motivo: 'sólo se prueban direcciones http o https' };
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
    || host.endsWith('.internal') || host.endsWith('.ts.net') || ipInterna(host)) {
    return { ok: false, motivo: 'esa dirección es de la red interna' };
  }
  return { ok: true, url };
}

/** Lo mismo, pero además averigua a qué IP apunta el nombre: un dominio
 *  cualquiera puede apuntar a 192.168.0.1. `buscar` se reemplaza en las
 *  pruebas para no salir a internet. */
export async function probarUrlPermitida(texto, { buscar = (h) => dns.promises.lookup(h, { all: true }) } = {}) {
  const r = urlDePruebaPermitida(texto);
  if (!r.ok) return r;
  if (net.isIP(r.url.hostname.replace(/^\[|\]$/g, ''))) return r;
  let direcciones;
  try { direcciones = await buscar(r.url.hostname); } catch { return { ok: false, motivo: 'no encuentro ese dominio' }; }
  if (direcciones.some((d) => ipInterna(d.address))) return { ok: false, motivo: 'esa dirección es de la red interna' };
  return r;
}
