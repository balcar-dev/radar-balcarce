// Cómo habla el panel del celular con GitHub (29/09). Sin servidor propio: la
// llave (un token de GitHub que crea una persona y pega una sola vez en el
// celular) va directo a la API de GitHub, y nada más la ve.
//
// Sin nada del DOM: se prueba con Node (pruebas/celular-app.test.mjs).

export const REPO = 'balcar-dev/radar-balcarce';
export const RAMA = 'main';
const API = 'https://api.github.com';

/** Las once secciones (web/lib/datos.js, SECCIONES; una prueba controla que coincidan). */
export const SECCIONES = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología', 'Argentina'];

/** Los archivos que escribe el celular (panel/celular-datos.mjs). */
export const ARCHIVOS = {
  decisiones: 'web/data/celular-decisiones.json',
  correcciones: 'web/data/correcciones.json',
  llaves: 'web/data/celular-llaves.json',
  pendientes: 'web/data/celular-pendientes.json',
  borradores: 'web/data/celular-borradores.json',
  estado: 'web/data/celular-estado.json',
  libro: 'web/data/redes.json',
  retiradas: 'web/data/retiradas.json',
  portada: 'web/data/portada.json',
  esperando: 'web/data/esperando-cuerpo.json',
  archivo: 'web/data/archivo.json',
  candidatas: 'web/data/efemerides-candidatas.json',
  feriados: 'web/data/feriados-piezas.json',
  elegidas: 'web/data/efemerides-elegidas.json',
};

export class ErrorDeGitHub extends Error {
  constructor(estado, mensaje) {
    super(mensaje || `GitHub contestó ${estado}`);
    this.estado = estado;
  }
}

/** Texto (UTF-8) a base64, como lo pide la API de GitHub para escribir un archivo. */
export function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function deBase64(b64) {
  const s = atob(String(b64).replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
}

/**
 * Un archivo de notas escrito como los escribe el repositorio: una nota por
 * renglón (comoRetiradasJson, web/lib/archivo.js). Así el cambio de cada
 * decisión es un renglón en el historial, y no el archivo entero.
 */
export function comoRenglones(json, claves = Object.keys(json)) {
  const bloques = claves.map((k) => {
    const lineas = Object.entries(json[k] ?? {}).map(([id, n]) => `${JSON.stringify(id)}:${JSON.stringify(n)}`);
    return `${JSON.stringify(k)}:{${lineas.length ? `\n${lineas.join(',\n')}\n` : ''}}`;
  });
  return `{${bloques.join(',')}}\n`;
}

/** Cómo se escribe cada archivo que toca el celular. */
export function formatear(ruta, json) {
  if (ruta === ARCHIVOS.correcciones || ruta === ARCHIVOS.retiradas) return comoRenglones(json, ['notas']);
  if (ruta === ARCHIVOS.decisiones) return comoRenglones(json, ['notas', 'redes']);
  // Un día o un feriado por renglón: el historial dice qué se decidió cuándo.
  if (ruta === ARCHIVOS.elegidas) return comoRenglones(json, ['dias', 'feriados']);
  return `${JSON.stringify(json, null, 1)}\n`;
}

export function crearCliente({ token, fetchFn = (...a) => fetch(...a) }) {
  async function pedir(ruta, { metodo = 'GET', cuerpo, aceptar = 'application/vnd.github+json' } = {}) {
    const res = await fetchFn(`${API}${ruta}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${token}`,
        accept: aceptar,
        'x-github-api-version': '2022-11-28',
        ...(cuerpo ? { 'content-type': 'application/json' } : {}),
      },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      cache: 'no-store',
    });
    if (!res.ok) {
      let mensaje = '';
      try { mensaje = (await res.json())?.message ?? ''; } catch { /* sin cuerpo */ }
      throw new ErrorDeGitHub(res.status, mensaje);
    }
    return res;
  }

  /** Lee un archivo del repositorio (siempre la versión de ahora, sin caché): { json, sha }. */
  async function leer(ruta) {
    const res = await pedir(`/repos/${REPO}/contents/${ruta}?ref=${RAMA}`);
    const j = await res.json();
    let texto;
    if (j.encoding === 'base64' && j.content) texto = deBase64(j.content);
    else {
      // Más de 1 MB (archivo.json): la API lo da sólo "crudo".
      texto = await (await pedir(`/repos/${REPO}/contents/${ruta}?ref=${RAMA}`, { aceptar: 'application/vnd.github.raw+json' })).text();
    }
    return { json: JSON.parse(texto), sha: j.sha };
  }

  /**
   * Cambia un archivo: lo lee, le aplica `cambiar` y lo sube como un commit.
   * Si justo lo cambió otra corrida (GitHub contesta 409), lo vuelve a leer y
   * reintenta: nunca pisa lo que subió otro.
   */
  async function guardar(ruta, cambiar, mensaje) {
    for (let intento = 1; ; intento += 1) {
      const { json, sha } = await leer(ruta);
      const nuevo = cambiar(json) ?? json;
      try {
        await pedir(`/repos/${REPO}/contents/${ruta}`, {
          metodo: 'PUT',
          cuerpo: { message: mensaje, content: aBase64(formatear(ruta, nuevo)), sha, branch: RAMA },
        });
        return nuevo;
      } catch (e) {
        if (!(e instanceof ErrorDeGitHub) || ![409, 422].includes(e.estado) || intento >= 3) throw e;
      }
    }
  }

  return {
    leer,
    guardar,
    /** ¿Esta llave puede escribir en el repositorio? */
    async puedeEscribir() {
      const j = await (await pedir(`/repos/${REPO}`)).json();
      return !!j?.permissions?.push;
    },
    /** Dispara un workflow (actualizar.yml, panel.yml). */
    async disparar(workflow, inputs = {}) {
      await pedir(`/repos/${REPO}/actions/workflows/${workflow}/dispatches`, { metodo: 'POST', cuerpo: { ref: RAMA, inputs } });
    },
    /** Las últimas corridas de un workflow. */
    async corridas(workflow) {
      const j = await (await pedir(`/repos/${REPO}/actions/workflows/${workflow}/runs?per_page=15`)).json();
      return j.workflow_runs ?? [];
    },
  };
}

/** Una marca al azar para encontrar la corrida que se acaba de disparar (va en su nombre). */
export const marcaNueva = () => Math.random().toString(36).slice(2, 10);

/** La corrida de "Panel del celular" que lleva esta marca, si ya apareció. */
export const corridaConMarca = (corridas, marca) => corridas.find((c) => String(c.display_title ?? c.name ?? '').includes(marca)) ?? null;

// ----------------------------------------------------- lo que se escribe

const hoyISO = () => new Date().toISOString();

/** Una decisión del celular (panel/celular-datos.mjs dice qué pide cada una). */
export function conDecision(json, id, decision) {
  const j = { notas: {}, redes: {}, ...json };
  j.notas = { ...j.notas, [id]: { ...decision, cuando: decision.cuando ?? hoyISO() } };
  return j;
}

/** Saca la decisión del celular sobre una nota (deshacer). */
export function sinDecision(json, id) {
  const j = { notas: {}, redes: {}, ...json };
  const { [id]: _, ...resto } = j.notas;
  j.notas = resto;
  return j;
}

/** Saca una nota de web/data/retiradas.json (deshacer un retiro hecho a mano). */
export function sinRetirada(json, id) {
  const j = { notas: {}, ...json };
  const { [id]: _, ...resto } = j.notas;
  j.notas = resto;
  return j;
}

/** Marca (o desmarca) una nota para que también vaya a Facebook e Instagram. */
export function conRedes(json, id, por, si = true) {
  const j = { notas: {}, redes: {}, ...json };
  const { [id]: _, ...resto } = j.redes;
  j.redes = si ? { ...resto, [id]: { por, cuando: hoyISO() } } : resto;
  return j;
}

/**
 * Una corrección (web/data/correcciones.json): los campos que cambió la
 * persona, encima de los que ya tenía esa nota, con motivo, cuándo y quién (sin
 * eso la corrida de la web no la acepta).
 */
export function conCorreccion(json, id, campos, { motivo, por, deIA = false }) {
  const j = { notas: {}, ...json };
  const antes = j.notas[id] ?? {};
  const limpios = Object.fromEntries(Object.entries(campos).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, v.trim()]));
  const nueva = { ...antes, ...limpios, motivo, cuando: hoyISO().slice(0, 10), por };
  if (deIA) nueva.deIA = true; else delete nueva.deIA;
  j.notas = { ...j.notas, [id]: nueva };
  return j;
}

/** Lo que se eligió para un día de "Un día como hoy" (panel/fechas.js arma `eleccion`). */
export function conEleccionDeDia(json, dia, eleccion) {
  const j = { dias: {}, feriados: {}, ...json };
  j.dias = { ...j.dias, [dia]: eleccion };
  return j;
}

/** La decisión sobre el enfoque de un feriado: aprobado, o con cambios pedidos. */
export function conDecisionDeFeriado(json, fecha, { estado, comentario = '', por }) {
  const j = { dias: {}, feriados: {}, ...json };
  j.feriados = { ...j.feriados, [fecha]: { estado, ...(comentario ? { comentario } : {}), por, cuando: hoyISO() } };
  return j;
}

/** Suma la llave pública de este celular (una por celular; la más nueva primero si hay de más). */
export function conLlave(json, { nombre, publica, huella }) {
  const lista = (json?.llaves ?? []).filter((l) => l.publica !== publica);
  return { llaves: [...lista, { nombre, publica, huella, alta: hoyISO() }].slice(-6) };
}

/** "hace 5 min", "hace 3 h", "ayer": para las listas. */
export function haceCuanto(iso, ahora = Date.now()) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.floor((ahora - t) / 60000));
  if (min < 2) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/** Cuántas palabras tiene un texto (el cuerpo pide 70 para salir solo). */
export const palabras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;
