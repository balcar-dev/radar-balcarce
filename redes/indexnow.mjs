// IndexNow (8/10/2026, "Bing e IndexNow"): después de cada despliegue, se le avisa a Bing (que alimenta a ChatGPT y a otros buscadores) qué notas
// nuevas hay, en vez de esperar a que pasen a mirar. No hace falta cuenta: la "clave" es pública y se demuestra publicándola en el propio sitio
// (web/public/<clave>.txt). Sólo avisa de notas que Google también puede ver (con cuerpo), nunca de lo que lleva noindex.
//
// Sin dependencias: sólo lo que trae Node. Se corre desde .github/workflows/cloudflare-deploy.yml, después de subir el sitio; si falla, el
// despliegue no se entera (`continue-on-error`): es un aviso, no una parte del sitio.

import fs from 'node:fs';
import path from 'node:path';
import { noSeOfreceAGoogle } from '../web/lib/cuerpo.js';

/** La clave de IndexNow. No es un secreto: tiene que estar publicada en el sitio, en web/public/<clave>.txt. */
export const CLAVE_INDEXNOW = '0776b1b28b613625cba478a97201b517';
export const SITIO = 'https://radarbalcarce.com';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Cuántos minutos hacia atrás se miran las notas nuevas (el despliegue corre cada 30). */
export const MINUTOS = 45;
/** Un pedido acepta hasta 10.000 direcciones; con tantas por vuelta alcanza de sobra. */
export const MAXIMO = 100;

/**
 * Las direcciones que hay que avisar: la portada y las notas que salieron en los últimos `minutos` y se ofrecen a los buscadores.
 * Una nota sale en la web con `visto` (cuándo la leyó el robot) o con su fecha; lo que no tiene cuerpo, lleva noindex y no se avisa.
 */
export function direccionesParaAvisar({ portada = {}, ahora = new Date(), minutos = MINUTOS, sitio = SITIO } = {}) {
  const desde = ahora.getTime() - minutos * 60000;
  const nuevas = (portada.notas ?? [])
    .filter((n) => n?.ruta && !noSeOfreceAGoogle(n))
    .filter((n) => {
      const t = Date.parse(n.visto ?? n.fecha);
      return Number.isFinite(t) && t >= desde && t <= ahora.getTime() + 5 * 60000;
    })
    .map((n) => `${sitio}${n.ruta}`);
  return nuevas.length ? [...new Set([`${sitio}/`, ...nuevas])].slice(0, MAXIMO) : [];
}

/** El cuerpo del pedido a IndexNow. */
export const pedidoDeIndexNow = (urls, { sitio = SITIO, clave = CLAVE_INDEXNOW } = {}) => ({
  host: new URL(sitio).host, key: clave, keyLocation: `${sitio}/${clave}.txt`, urlList: urls,
});

/** Avisa. Devuelve { enviadas, estado }; con nada para avisar no hace ningún pedido. */
export async function avisar({ urls, fetchFn = fetch, endpoint = ENDPOINT } = {}) {
  if (!urls?.length) return { enviadas: 0, estado: null };
  const res = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(pedidoDeIndexNow(urls)),
    signal: AbortSignal.timeout(20_000),
  });
  // 200 y 202 son "recibido"; 422/403 es que la clave no se encuentra en el sitio.
  if (!(res.status === 200 || res.status === 202)) throw new Error(`IndexNow contestó ${res.status}`);
  return { enviadas: urls.length, estado: res.status };
}

if (process.argv[1] && process.argv[1].endsWith('indexnow.mjs')) {
  const portada = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'web', 'data', 'portada.json'), 'utf8'));
  const urls = direccionesParaAvisar({ portada });
  if (!urls.length) { console.log('IndexNow: no hay notas nuevas para avisar.'); process.exit(0); }
  try {
    const r = await avisar({ urls });
    console.log(`IndexNow: ${r.enviadas} direcciones avisadas (HTTP ${r.estado}).`);
  } catch (e) {
    console.log(`IndexNow: no se pudo avisar (${e.message}). No frena nada.`);
  }
}
