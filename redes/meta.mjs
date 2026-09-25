// El cliente de Meta: lo que hace falta para publicar en la página de
// Facebook y en el Instagram del medio, y nada más.
//
// Sin dependencias, sólo fetch: corre igual en GitHub Actions que en la PC.
//
// Tres cuidados que no se negocian:
//
//   1. El token viaja en el encabezado Authorization y nunca en la dirección,
//      así no queda en ningún registro de servidor ni de Actions.
//   2. Si Meta devuelve un error, el mensaje se limpia antes de mostrarse por
//      si alguna vez repite el token.
//   3. Acá no se decide QUÉ se publica. Eso es de elegir.mjs, que respeta el
//      semáforo. Este archivo sólo sabe hablar con Meta.

const BASE = 'https://graph.facebook.com';
export const VERSION = 'v23.0';

/** El error de Meta con lo que sirve para decidir qué hacer: si reintentar,
 *  si el token murió, si el contenido fue rechazado. */
export class ErrorMeta extends Error {
  constructor(mensaje, { codigo = null, subcodigo = null, tipo = null, http = null } = {}) {
    super(mensaje);
    this.name = 'ErrorMeta';
    this.codigo = codigo;
    this.subcodigo = subcodigo;
    this.tipo = tipo;
    this.http = http;
  }

  /** El token venció o lo revocaron: no tiene sentido seguir intentando. */
  get tokenMuerto() {
    return this.codigo === 190;
  }
}

/** Saca el token de cualquier texto antes de mostrarlo. */
export function sinToken(texto, token) {
  const t = String(texto ?? '');
  return token ? t.split(token).join('***') : t;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Cuánto se espera a Meta. Sin tiempo máximo, un pedido que Meta deja colgado
// dejaba el reloj de Redes esperando hasta que GitHub lo mataba (auditoría del
// 25/09). Un pedido común contesta en uno o dos segundos. La subida de un
// video es otra cosa: un podcast pesa varios megas y la conexión de GitHub con
// Meta a veces es lenta, así que tiene diez minutos.
export const ESPERA_MAXIMA = 60_000;
export const ESPERA_MAXIMA_SUBIDA = 10 * 60_000;

/**
 * @param {object} o
 * @param {string} o.token          el del usuario del sistema
 * @param {string} o.paginaId       la página de Facebook
 * @param {Function} [o.fetchFn]    para las pruebas
 * @param {Function} [o.esperar]    para las pruebas: no dormir de verdad
 * @param {number} [o.espera]       tiempo máximo de un pedido común, en ms
 * @param {number} [o.esperaSubida] tiempo máximo de la subida de un video, en ms
 */
export function crearCliente({
  token, paginaId, fetchFn = fetch, esperar = dormir, version = VERSION,
  espera = ESPERA_MAXIMA, esperaSubida = ESPERA_MAXIMA_SUBIDA,
}) {
  if (!token) throw new Error('Falta el token de Meta (META_TOKEN).');
  if (!paginaId) throw new Error('Falta el ID de la página de Facebook.');

  let cache = null;

  async function pedir(camino, { metodo = 'GET', params = {}, conToken = token } = {}) {
    const url = new URL(`${BASE}/${version}/${camino.replace(/^\//, '')}`);
    const init = { method: metodo, headers: { Authorization: `Bearer ${conToken}` }, signal: AbortSignal.timeout(espera) };

    if (metodo === 'GET') {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    } else {
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    }

    let r;
    try {
      r = await fetchFn(url, init);
    } catch (e) {
      throw new ErrorMeta(`No se pudo hablar con Meta: ${sinToken(e.message, token)}`);
    }

    let json = null;
    try { json = await r.json(); } catch { /* respuesta vacía o no JSON */ }

    if (!r.ok || json?.error) {
      const e = json?.error ?? {};
      throw new ErrorMeta(sinToken(sinToken(e.message ?? `Meta respondió ${r.status}`, token), conToken), {
        codigo: e.code ?? null, subcodigo: e.error_subcode ?? null, tipo: e.type ?? null, http: r.status,
      });
    }
    return json;
  }

  /** La página, su token propio y la cuenta de Instagram que tiene vinculada. */
  async function pagina() {
    if (cache) return cache;
    const j = await pedir(paginaId, {
      params: { fields: 'name,link,access_token,instagram_business_account{id,username}' },
    });
    cache = {
      nombre: j.name,
      enlace: j.link ?? null,
      // Las publicaciones se hacen con el token de la página, no con el del
      // usuario del sistema: es lo que Meta pide para escribir en su nombre.
      tokenPagina: j.access_token ?? token,
      instagramId: j.instagram_business_account?.id ?? null,
      instagramUsuario: j.instagram_business_account?.username ?? null,
    };
    return cache;
  }

  /** Un posteo con enlace: Facebook arma solo la tarjeta con la imagen y el
   *  titular de NUESTRA página, nunca la foto de otro medio. */
  async function publicarEnFacebook({ mensaje, enlace }) {
    const p = await pagina();
    const j = await pedir(`${paginaId}/feed`, {
      metodo: 'POST',
      conToken: p.tokenPagina,
      params: { message: mensaje, ...(enlace ? { link: enlace } : {}) },
    });
    return { id: j.id };
  }

  /** Una foto en el feed de Instagram. `imagenUrl` tiene que ser pública y
   *  JPEG: Instagram la descarga desde ahí, no acepta archivos subidos. */
  async function publicarFotoEnInstagram({ imagenUrl, pie }) {
    const p = await pagina();
    if (!p.instagramId) throw new ErrorMeta('La página no tiene un Instagram vinculado.');

    const contenedor = await pedir(`${p.instagramId}/media`, {
      metodo: 'POST', conToken: p.tokenPagina,
      params: { image_url: imagenUrl, caption: pie },
    });

    // Las fotos casi siempre están listas al instante, pero Meta no lo
    // garantiza: se pregunta unas veces antes de rendirse.
    for (let i = 0; i < 10; i += 1) {
      const estado = await pedir(contenedor.id, { conToken: p.tokenPagina, params: { fields: 'status_code' } });
      if (estado.status_code === 'FINISHED' || estado.status_code === undefined) break;
      if (estado.status_code === 'ERROR' || estado.status_code === 'EXPIRED') {
        throw new ErrorMeta(`Instagram rechazó la imagen (${estado.status_code}).`);
      }
      await esperar(2000);
    }

    const j = await pedir(`${p.instagramId}/media_publish`, {
      metodo: 'POST', conToken: p.tokenPagina, params: { creation_id: contenedor.id },
    });
    return { id: j.id };
  }

  /**
   * Un video en Instagram, como historia (STORIES) o como reel (REELS).
   *
   * Se sube directo, en dos pasos: Instagram da una dirección de subida y el
   * archivo se manda ahí, sin tener que dejarlo en ningún sitio público. Por
   * eso todo lo que sale a Instagram es video: es lo único que se puede
   * entregar sin alojarlo.
   *
   * @param {Buffer} o.video   el mp4 entero
   * @param {'STORIES'|'REELS'} o.tipo
   * @param {string} [o.pie]   el texto del reel (las historias no llevan)
   */
  async function publicarVideoEnInstagram({ video, tipo, pie = '' }) {
    const p = await pagina();
    if (!p.instagramId) throw new ErrorMeta('La página no tiene un Instagram vinculado.');
    if (tipo !== 'STORIES' && tipo !== 'REELS') throw new ErrorMeta(`Tipo de video desconocido: ${tipo}`);

    const params = { media_type: tipo, upload_type: 'resumable' };
    if (pie && tipo === 'REELS') params.caption = pie;

    const contenedor = await pedir(`${p.instagramId}/media`, { metodo: 'POST', conToken: p.tokenPagina, params });
    if (!contenedor.uri) throw new ErrorMeta('Instagram no indicó dónde subir el video.');

    // Paso 2: el archivo, tal cual, a la dirección que dio Instagram.
    let r;
    try {
      r = await fetchFn(contenedor.uri, {
        method: 'POST',
        headers: { Authorization: `OAuth ${p.tokenPagina}`, offset: '0', file_size: String(video.length) },
        body: video,
        signal: AbortSignal.timeout(esperaSubida),
      });
    } catch (e) {
      throw new ErrorMeta(`No se pudo subir el video: ${sinToken(sinToken(e.message, token), p.tokenPagina)}`);
    }
    let cuerpo = null;
    try { cuerpo = await r.json(); } catch { /* sin cuerpo */ }
    if (!r.ok || cuerpo?.success === false) {
      const detalle = cuerpo?.debug_info?.message ?? cuerpo?.error?.message ?? cuerpo?.message ?? '';
      throw new ErrorMeta(sinToken(sinToken(`La subida del video falló (${r.status}) ${detalle}`.trim(), token), p.tokenPagina), { http: r.status });
    }

    // Instagram procesa el video: unos segundos, a veces un minuto o más.
    for (let i = 0; i < 60; i += 1) {
      const estado = await pedir(contenedor.id, { conToken: p.tokenPagina, params: { fields: 'status_code,status' } });
      if (estado.status_code === 'FINISHED') break;
      if (estado.status_code === 'ERROR' || estado.status_code === 'EXPIRED') {
        throw new ErrorMeta(`Instagram rechazó el video (${estado.status_code}${estado.status ? `: ${estado.status}` : ''}).`);
      }
      if (i === 59) throw new ErrorMeta('Instagram no terminó de procesar el video a tiempo.');
      await esperar(3000);
    }

    const j = await pedir(`${p.instagramId}/media_publish`, {
      metodo: 'POST', conToken: p.tokenPagina, params: { creation_id: contenedor.id },
    });
    return { id: j.id };
  }

  /**
   * El mismo video, en la página de Facebook, como historia (STORIES) o como
   * reel (REELS).
   *
   * Es la misma idea que en Instagram, con las direcciones de Facebook: se
   * abre la subida, se manda el archivo y se cierra. Así el video que se armó
   * una vez sirve para las dos redes y no se gasta voz de más.
   *
   * @param {Buffer} o.video
   * @param {'STORIES'|'REELS'} o.tipo
   * @param {string} [o.pie]   el texto del reel (las historias no llevan)
   */
  async function publicarVideoEnFacebook({ video, tipo, pie = '' }) {
    const p = await pagina();
    if (tipo !== 'STORIES' && tipo !== 'REELS') throw new ErrorMeta(`Tipo de video desconocido: ${tipo}`);
    const camino = `${paginaId}/${tipo === 'REELS' ? 'video_reels' : 'video_stories'}`;

    // 1. Abrir la subida.
    const inicio = await pedir(camino, { metodo: 'POST', conToken: p.tokenPagina, params: { upload_phase: 'start' } });
    if (!inicio.video_id || !inicio.upload_url) throw new ErrorMeta('Facebook no indicó dónde subir el video.');

    // 2. Mandar el archivo, tal cual, a la dirección que dio Facebook.
    let r;
    try {
      r = await fetchFn(inicio.upload_url, {
        method: 'POST',
        headers: { Authorization: `OAuth ${p.tokenPagina}`, offset: '0', file_size: String(video.length) },
        body: video,
        signal: AbortSignal.timeout(esperaSubida),
      });
    } catch (e) {
      throw new ErrorMeta(`No se pudo subir el video a Facebook: ${sinToken(sinToken(e.message, token), p.tokenPagina)}`);
    }
    let cuerpo = null;
    try { cuerpo = await r.json(); } catch { /* sin cuerpo */ }
    if (!r.ok || cuerpo?.success === false) {
      const detalle = cuerpo?.debug_info?.message ?? cuerpo?.error?.message ?? cuerpo?.message ?? '';
      throw new ErrorMeta(sinToken(sinToken(`La subida del video a Facebook falló (${r.status}) ${detalle}`.trim(), token), p.tokenPagina), { http: r.status });
    }

    // 3. Cerrar y publicar.
    const cierre = { upload_phase: 'finish', video_id: inicio.video_id };
    if (tipo === 'REELS') { cierre.video_state = 'PUBLISHED'; if (pie) cierre.description = pie; }
    const fin = await pedir(camino, { metodo: 'POST', conToken: p.tokenPagina, params: cierre });
    if (fin.success === false) throw new ErrorMeta('Facebook no aceptó publicar el video.');

    // 4. Facebook procesa el video. Si dice que falló, se avisa; si no dice nada
    // claro, se da por publicado.
    for (let i = 0; i < 20; i += 1) {
      let estado = null;
      try { estado = await pedir(inicio.video_id, { conToken: p.tokenPagina, params: { fields: 'status' } }); } catch { break; }
      const st = estado?.status?.video_status;
      if (st === 'error' || st === 'expired') {
        throw new ErrorMeta(`Facebook rechazó el video (${st}).`);
      }
      if (!st || st === 'ready' || st === 'complete' || st === 'published') break;
      await esperar(3000);
    }
    return { id: inicio.video_id, postId: fin.post_id ?? null };
  }

  /** Un chequeo sin efectos: sirve para saber si el acceso quedó bien. */
  async function verificar() {
    const p = await pagina();
    let permisos = null;
    try {
      const j = await pedir('me/permissions');
      permisos = (j.data ?? []).filter((x) => x.status === 'granted').map((x) => x.permission);
    } catch { /* algunos tokens de sistema no exponen esto */ }
    return { pagina: p.nombre, enlace: p.enlace, instagram: p.instagramUsuario, instagramId: p.instagramId, permisos };
  }

  return {
    pedir, pagina, publicarEnFacebook, publicarFotoEnInstagram, publicarVideoEnInstagram, publicarVideoEnFacebook, verificar,
  };
}
