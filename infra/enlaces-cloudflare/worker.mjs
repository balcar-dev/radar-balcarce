// Los enlaces cortos de las redes de Radar Balcarce (17/10/2026, regla 282; docs/redes/ACORTADOR-DE-ENLACES.md).
//
// Un posteo de Facebook lleva hoy el enlace con sus UTM (150 caracteres o más). Con este Worker lleva
//     https://radarbalcarce.com/r/f/dg5er4
// y el Worker manda a quien lo toca a la nota, con las mismas UTM de siempre:
//     302 → /nota/<titular>-dg5er4?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=dg5er4
//
// La gramática del enlace (/r/<red>/<destino>) y la tabla de redes viven en redes/enlaces-cortos.mjs, compartidas con el generador de textos.
//
// Cómo atiende:
//   1. Un pedido que no es /r/... pasa derecho (no debería llegar: la ruta es sólo radarbalcarce.com/r/*).
//   2. Un código que no entiende (letra de red que no existe, destino raro) manda a la portada, sin UTM. Nunca un error, nunca una
//      dirección armada con lo que escribió quien llegó: la dirección final sale SIEMPRE de SITIO + un camino que este Worker armó y validó.
//   3. Una nota se busca por su identificador en /nota/indice.json (el índice que el sitio publica en cada compilación: { id: "titular-id" }, lo
//      mismo que usa la página 404). Se guarda en memoria 10 minutos. Si la nota no está (es vieja y ya salió del sitio, o el índice no
//      contestó), se manda a /nota/<id> y de ahí la lleva a su dirección buena el archivo permanente (infra/archivo-cloudflare/) o la página 404.
//   4. Cuenta cada visita en Analytics Engine (binding opcional CLICS): red, tipo, destino y si fue una persona o un robot (los robots de las
//      redes, que miran el enlace para armar la vista previa, se cuentan aparte). Sin el binding, no cuenta y todo anda igual.
//
// Qué NO hace: no escribe nada en ningún depósito, no usa claves, no cambia ninguna dirección del sitio. La respuesta es 302 (no 301):
// la nota puede cambiar de dirección y las UTM no se guardan en ningún lado.
// No manda Referrer-Policy en la respuesta, a propósito: la que mande una redirección reemplaza a la de la página que la originó, y se perdería
// de dónde vino la visita (facebook.com) para las analíticas del sitio.
//
// Sin dependencias. Se prueba sin red importando `manejar` (pruebas/enlaces-cloudflare.test.mjs).
//
// Configuración (wrangler.toml): variables SITIO (https://radarbalcarce.com) y ORIGEN_PAGES (de dónde se baja el índice; un Worker no puede pedir
// una dirección de su propia zona que tenga ruta, así que se pregunta al origen: https://radar-balcarce.pages.dev), CACHE_SEGUNDOS (600),
// ENLACES_ACTIVO ("0" apaga la cuenta de visitas, no la redirección: un enlace ya publicado tiene que seguir andando).

import { analizarCodigo, destinoDeLaVisita } from '../../redes/enlaces-cortos.mjs';

export const CACHE_SEGUNDOS_POR_DEFECTO = 600;
export const SITIO_POR_DEFECTO = 'https://radarbalcarce.com';

/** Los robots de las redes y de los buscadores que miran un enlace para armar la vista previa: no son una persona que tocó el enlace. */
const ROBOT = /(facebookexternalhit|facebot|meta-externalagent|twitterbot|telegrambot|whatsapp|slackbot|bluesky|bsky|linkedinbot|discordbot|googlebot|bingbot|bot\b|crawler|spider|preview)/i;
export const esRobot = (userAgent) => ROBOT.test(String(userAgent ?? ''));

const PARTE_VALIDA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// El índice en memoria: { mapa, hasta }. Un Worker vive minutos o horas; guardar el índice evita pedirlo en cada toque.
let indice = { mapa: null, hasta: 0 };
export function olvidarElIndice() { indice = { mapa: null, hasta: 0 }; }

function segundosDeCache(env) {
  const n = Number(env?.CACHE_SEGUNDOS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : CACHE_SEGUNDOS_POR_DEFECTO;
}

/** El índice { id: "titular-id" } del sitio, o null si no se pudo bajar. Nunca lanza. */
async function indiceDelSitio(env, fetchFn, ahora) {
  if (indice.mapa && ahora < indice.hasta) return indice.mapa;
  try {
    const origen = String(env?.ORIGEN_PAGES ?? env?.SITIO ?? SITIO_POR_DEFECTO).replace(/\/+$/, '');
    const r = await fetchFn(new Request(`${origen}/nota/indice.json`, { headers: { accept: 'application/json' } }));
    if (!r.ok) return indice.mapa; // si ya había uno viejo, mejor ese que ninguno
    const mapa = await r.json();
    if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return indice.mapa;
    indice = { mapa, hasta: ahora + segundosDeCache(env) * 1000 };
    return mapa;
  } catch {
    return indice.mapa;
  }
}

/** La parte de la dirección (`titular-id`) de una nota por su identificador, o null. Sólo si es una dirección válida de esa nota. */
async function parteDeLaNota(id, env, fetchFn, ahora) {
  const mapa = await indiceDelSitio(env, fetchFn, ahora);
  const parte = mapa && Object.hasOwn(mapa, id) ? mapa[id] : null;
  return typeof parte === 'string' && PARTE_VALIDA.test(parte) && (parte === id || parte.endsWith(`-${id}`)) ? parte : null;
}

function respuesta(location, extra = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}

/** Anota la visita. Nunca lanza ni espera: contar es un lujo. */
function contar(env, request, codigo, resultado) {
  try {
    if (String(env?.ENLACES_ACTIVO ?? '1') === '0' || !env?.CLICS?.writeDataPoint) return;
    const robot = esRobot(request.headers.get('user-agent'));
    env.CLICS.writeDataPoint({
      blobs: [codigo?.red ?? '?', codigo?.campana ?? '?', codigo?.destino ?? '?', robot ? 'robot' : 'persona', resultado],
      doubles: [1],
      indexes: [codigo?.red ?? 'invalido'],
    });
  } catch { /* contar no es obligatorio */ }
}

/**
 * Atiende un pedido. `fetchFn` se puede reemplazar para probar sin red; en Cloudflare es `fetch`. Nunca lanza.
 * `ahora` (milisegundos) se puede pasar para probar el vencimiento del índice.
 */
export async function manejar(request, env, ctx, { fetchFn = (r) => fetch(r), ahora = Date.now() } = {}) {
  const metodo = request.method;
  let url;
  try { url = new URL(request.url); } catch { return new Response('Pedido inválido.', { status: 400 }); }
  if (!url.pathname.startsWith('/r/') || (metodo !== 'GET' && metodo !== 'HEAD')) return fetchFn(request);

  const sitio = String(env?.SITIO ?? SITIO_POR_DEFECTO).replace(/\/+$/, '');
  const codigo = analizarCodigo(url.pathname);
  if (!codigo) {
    contar(env, request, null, 'invalido');
    return respuesta(`${sitio}/`, { 'X-Radar-Enlace': 'invalido' });
  }

  let parte = null;
  if (codigo.tipo === 'nota') parte = await parteDeLaNota(codigo.destino, env, fetchFn, ahora);
  const destino = destinoDeLaVisita(codigo, { parteDeLaNota: parte });
  if (!destino?.camino) {
    contar(env, request, codigo, 'invalido');
    return respuesta(`${sitio}/`, { 'X-Radar-Enlace': 'invalido' });
  }

  const final = new URL(destino.camino, `${sitio}/`);
  for (const [k, v] of Object.entries(destino.utm)) if (v) final.searchParams.set(k, v);
  contar(env, request, codigo, codigo.tipo === 'nota' && !parte ? 'sin-indice' : 'ok');
  return respuesta(final.toString(), { 'X-Radar-Enlace': codigo.tipo === 'nota' && !parte ? 'por-id' : 'directo' });
}

export default {
  async fetch(request, env, ctx) { return manejar(request, env, ctx); },
};
