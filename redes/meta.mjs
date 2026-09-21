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

/**
 * @param {object} o
 * @param {string} o.token          el del usuario del sistema
 * @param {string} o.paginaId       la página de Facebook
 * @param {Function} [o.fetchFn]    para las pruebas
 * @param {Function} [o.esperar]    para las pruebas: no dormir de verdad
 */
export function crearCliente({ token, paginaId, fetchFn = fetch, esperar = dormir, version = VERSION }) {
  if (!token) throw new Error('Falta el token de Meta (META_TOKEN).');
  if (!paginaId) throw new Error('Falta el ID de la página de Facebook.');

  let cache = null;

  async function pedir(camino, { metodo = 'GET', params = {}, conToken = token } = {}) {
    const url = new URL(`${BASE}/${version}/${camino.replace(/^\//, '')}`);
    const init = { method: metodo, headers: { Authorization: `Bearer ${conToken}` } };

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
      throw new ErrorMeta(sinToken(e.message ?? `Meta respondió ${r.status}`, token), {
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

  return { pedir, pagina, publicarEnFacebook, publicarFotoEnInstagram, verificar };
}
