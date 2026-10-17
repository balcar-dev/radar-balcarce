// Guardar y leer en GitHub por su API, sin `git` y sin minutos de Actions (18/10/2026, mudanza a Cloudflare).
//
// Hasta ahora cada trabajo que guardaba algo (portada, libro de redes, estado del vigilante…) lo hacía con `git commit` + `git pull --rebase` +
// `git push` dentro de un workflow. Un Worker de Cloudflare no tiene `git`, y la vuelta del motor (dentro de Workers Builds) no tiene por qué
// depender de que el clon traiga credenciales: acá se hace lo mismo con la API de GitHub (la de "Git Data", la misma que usa el panel del
// celular): se suben los archivos que cambiaron, se arma UN commit sobre la cabeza actual de `main` y se mueve la rama. Si alguien subió en el
// medio (rama no avanza), se vuelve a armar sobre la cabeza nueva; los archivos propios ganan, como el `--theirs` de los workflows, salvo los
// que tienen una función para unirse (las pistas: panel/unir-conflictos.mjs).
//
// Mover archivos por API NO gasta minutos de Actions. Sin dependencias: sólo `fetch`. La llave (`RADAR_GITHUB_TOKEN`) es de grano fino, sólo para
// este repositorio, con "Contents: lectura y escritura" (y "Actions: lectura y escritura" si también despierta workflows). Nunca se imprime.

const API = 'https://api.github.com';

const codificadorDeTexto = new TextEncoder();
const aBytes = (x) => (typeof x === 'string' ? codificadorDeTexto.encode(x) : x);

function aBase64(bytes) {
  let binario = '';
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo) binario += String.fromCharCode(...bytes.subarray(i, i + trozo));
  return btoa(binario);
}
const deBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** El SHA-1 que Git le pone a un archivo (`blob <largo>\0contenido`): sirve para saber si cambió sin bajarlo. */
export async function shaDeBlob(contenido) {
  const bytes = aBytes(contenido);
  const cabeza = codificadorDeTexto.encode(`blob ${bytes.length}\0`);
  const todo = new Uint8Array(cabeza.length + bytes.length);
  todo.set(cabeza, 0);
  todo.set(bytes, cabeza.length);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-1', todo))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Con quién firman los robots sus commits: el correo interno de la cuenta balcar-dev, que GitHub reconoce. NO cambiarlo (CLAUDE.md). */
export const AUTOR_DE_LOS_ROBOTS = { name: 'Radar Balcarce', email: '272334999+balcar-dev@users.noreply.github.com' };

export class ErrorDeGithub extends Error {
  constructor(mensaje, estado) { super(mensaje); this.estado = estado; }
}

/**
 * @param {object} o
 * @param {string} o.token   la llave (RADAR_GITHUB_TOKEN)
 * @param {string} o.repo    "radarbalcarce/radar-balcarce"
 * @param {string} [o.rama]  "main"
 */
export function crearGithub({ token, repo, rama = 'main', fetchFn = fetch, agente = 'radar-balcarce-robot', espera = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  if (!token) throw new Error('Falta la llave de GitHub (RADAR_GITHUB_TOKEN).');
  if (!repo) throw new Error('Falta el repositorio de GitHub.');

  async function pedir(metodo, ruta, { cuerpo, aceptar = 'application/vnd.github+json', crudo = false, ok404 = false } = {}) {
    const r = await fetchFn(ruta.startsWith('http') ? ruta : `${API}/repos/${repo}${ruta}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${token}`, accept: aceptar, 'x-github-api-version': '2022-11-28', 'user-agent': agente,
        ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
    });
    if (r.status === 404 && ok404) return null;
    if (!r.ok) {
      const texto = String(await r.text().catch(() => '')).replace(token, '***').slice(0, 200);
      throw new ErrorDeGithub(`GitHub ${metodo} ${ruta.replace(/\?.*/, '')}: HTTP ${r.status} ${texto}`, r.status);
    }
    if (crudo) return new Uint8Array(await r.arrayBuffer());
    return r.status === 204 ? null : r.json();
  }

  const api = {
    repo,
    rama,

    /** El SHA del último commit de la rama. */
    async cabeza() {
      return (await pedir('GET', `/git/ref/heads/${rama}`)).object.sha;
    },

    /** Los bytes de un archivo en la rama (o en otra referencia), o null si no existe. */
    async leerArchivo(ruta, ref = rama) {
      return pedir('GET', `/contents/${ruta.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, {
        aceptar: 'application/vnd.github.raw+json', crudo: true, ok404: true,
      });
    },

    /** El SHA de un archivo en la rama (sin bajarlo), o null si no existe. */
    async shaDe(ruta, ref = rama) {
      const j = await pedir('GET', `/contents/${ruta.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, { ok404: true });
      return j?.sha ?? null;
    },

    /** Todos los archivos de la rama: Map ruta → sha. (Una sola llamada; unos pocos MB.) */
    async arbol(ref = rama) {
      const j = await pedir('GET', `/git/trees/${encodeURIComponent(ref)}?recursive=1`);
      if (j.truncated) throw new ErrorDeGithub('GitHub devolvió el árbol del repositorio cortado (demasiados archivos).', 0);
      return new Map(j.tree.filter((x) => x.type === 'blob').map((x) => [x.path, x.sha]));
    },

    /** Los archivos que cambiaron entre dos commits (hasta 300; si hay más, `completo` es false). */
    async archivosEntre(base, cabeza) {
      const j = await pedir('GET', `/compare/${base}...${cabeza}`);
      return { archivos: (j.files ?? []).map((f) => ({ ruta: f.filename, estado: f.status })), completo: (j.files ?? []).length < 300 };
    },

    /**
     * Un commit con varios archivos. `cambios`: [{ ruta, contenido: string | Uint8Array | null (borrar), baseSha?: el SHA que tenía el archivo
     * cuando se leyó, base?: su contenido de entonces }]. `unir(ruta, nuestro, ajeno, base)` (por archivo, en `cambio.unir`): si alguien
     * más cambió ese archivo desde que se leyó (su SHA ya no es `baseSha`), devuelve el texto unido; sin eso, ganan los archivos propios. Devuelve { sha, padre (el commit sobre el que se apoyó), archivos, intentos } o { sha: null, archivos: 0 } si no había nada.
     */
    async commitear({ mensaje, cambios, intentos = 4, autor = AUTOR_DE_LOS_ROBOTS }) {
      const aplicables = cambios.filter((c) => c && c.ruta);
      if (!aplicables.length) return { sha: null, archivos: 0, intentos: 0 };
      const blobs = new Map(); // ruta → sha del blob ya subido (los blobs no cambian entre intentos)
      const subir = async (ruta, contenido) => {
        const bytes = aBytes(contenido);
        const clave = `${ruta}:${bytes.length}:${await shaDeBlob(bytes)}`;
        if (blobs.has(clave)) return blobs.get(clave);
        const b = await pedir('POST', '/git/blobs', { cuerpo: { content: aBase64(bytes), encoding: 'base64' } });
        blobs.set(clave, b.sha);
        return b.sha;
      };
      let ultimo;
      for (let intento = 1; intento <= intentos; intento += 1) {
        const cabeza = await api.cabeza();
        const commitActual = await pedir('GET', `/git/commits/${cabeza}`);
        // Si alguien cambió, desde que se leyó, un archivo que sabe unirse, se une; si no, gana el nuestro.
        const aEscribir = [];
        for (const c of aplicables) {
          if (c.contenido !== null && typeof c.unir === 'function' && c.baseSha !== undefined) {
            const actual = await api.shaDe(c.ruta, cabeza);
            if (actual !== null && actual !== c.baseSha) {
              const ajeno = await api.leerArchivo(c.ruta, cabeza);
              const unido = await c.unir(c.ruta, typeof c.contenido === 'string' ? c.contenido : new TextDecoder().decode(c.contenido), ajeno ? new TextDecoder().decode(ajeno) : null, c.base ?? null);
              aEscribir.push({ ...c, contenido: unido ?? c.contenido });
              continue;
            }
          }
          aEscribir.push(c);
        }
        const entradas = [];
        for (const c of aEscribir) {
          if (c.contenido === null) entradas.push({ path: c.ruta, mode: '100644', type: 'blob', sha: null });
          else entradas.push({ path: c.ruta, mode: '100644', type: 'blob', sha: await subir(c.ruta, c.contenido) });
        }
        const arbolNuevo = await pedir('POST', '/git/trees', { cuerpo: { base_tree: commitActual.tree.sha, tree: entradas } });
        if (arbolNuevo.sha === commitActual.tree.sha) return { sha: cabeza, padre: cabeza, archivos: 0, intentos: intento }; // no cambiaba nada
        const commit = await pedir('POST', '/git/commits', { cuerpo: { message: mensaje, tree: arbolNuevo.sha, parents: [cabeza], ...(autor ? { author: { ...autor, date: new Date().toISOString() }, committer: { ...autor, date: new Date().toISOString() } } : {}) } });
        try {
          await pedir('PATCH', `/git/refs/heads/${rama}`, { cuerpo: { sha: commit.sha, force: false } });
          return { sha: commit.sha, padre: cabeza, archivos: entradas.length, intentos: intento };
        } catch (e) {
          // 422 = la rama avanzó (no es avance rápido): se vuelve a armar sobre la cabeza nueva.
          if (e.estado !== 422 && e.estado !== 409) throw e;
          ultimo = e;
          await espera(400 * intento);
        }
      }
      throw new ErrorDeGithub(`No se pudo guardar en GitHub después de ${intentos} intentos (la rama seguía avanzando): ${ultimo?.message ?? ''}`, ultimo?.estado ?? 0);
    },

    /** Despierta un workflow de este repositorio (workflow_dispatch). */
    async despacharWorkflow(archivo, inputs = null, ref = rama) {
      await pedir('POST', `/actions/workflows/${archivo}/dispatches`, { cuerpo: { ref, ...(inputs ? { inputs } : {}) } });
      return true;
    },

    /** Dispara un `repository_dispatch` (lo que escucha el repositorio público de render). */
    async avisar(tipo, payload = {}) {
      await pedir('POST', '/dispatches', { cuerpo: { event_type: tipo, client_payload: payload } });
      return true;
    },

    /** Las últimas corridas de un workflow (para saber si una sigue andando). */
    async corridas(archivo, cuantas = 5) {
      const j = await pedir('GET', `/actions/workflows/${archivo}/runs?per_page=${cuantas}`);
      return (j.workflow_runs ?? []).map((x) => ({ id: x.id, estado: x.status, resultado: x.conclusion, creada: x.created_at }));
    },
  };
  return api;
}

export { aBase64, deBase64 };
