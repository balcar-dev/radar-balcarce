// Un GitHub de mentira, en memoria, para probar sin red lo que guarda por la API (infra/compartido/github.mjs): ramas, commits, árboles, blobs,
// contenidos, comparaciones y despachos. Sabe lo justo para que un commit que no es avance rápido falle con 422, como el de verdad.
import crypto from 'node:crypto';

const sha1 = (bytes) => crypto.createHash('sha1').update(bytes).digest('hex');
const shaDeBlob = (bytes) => sha1(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), Buffer.from(bytes)]));
const json = (obj, estado = 200) => new Response(JSON.stringify(obj), { status: estado, headers: { 'content-type': 'application/json' } });

export function githubFalso({ repo = 'radarbalcarce/radar-balcarce', token = 'ghp_PRUEBA', archivosIniciales = {} } = {}) {
  const blobs = new Map(); // sha → bytes
  const arboles = new Map(); // id → Map(ruta → sha)
  const commits = new Map(); // sha → { sha, parents, tree, message }
  let contador = 0;
  const arbolId = (mapa) => sha1(JSON.stringify([...mapa.entries()].sort()));

  const mapaInicial = new Map();
  for (const [ruta, contenido] of Object.entries(archivosIniciales)) {
    const bytes = Buffer.from(contenido);
    const sha = shaDeBlob(bytes);
    blobs.set(sha, bytes);
    mapaInicial.set(ruta, sha);
  }
  const arbolInicial = arbolId(mapaInicial);
  arboles.set(arbolInicial, mapaInicial);
  const inicial = sha1('inicial');
  commits.set(inicial, { sha: inicial, parents: [], tree: arbolInicial, message: 'inicial' });
  let cabeza = inicial;

  const estado = {
    llamadas: [], despachos: [], dispatchesDelRepo: [],
    /** Se llama justo antes de mover la rama; sirve para que "otro" suba en el medio. */
    antesDeMoverLaRama: null,
  };

  const archivosDe = (sha) => arboles.get(commits.get(sha).tree);
  const resolverRef = (ref) => (commits.has(ref) ? ref : cabeza);

  /** Alguien más sube archivos (como el celular o un workflow): un commit nuevo sobre la cabeza. */
  function subirComoOtro(archivos, mensaje = 'otro') {
    const mapa = new Map(archivosDe(cabeza));
    for (const [ruta, contenido] of Object.entries(archivos)) {
      if (contenido === null) { mapa.delete(ruta); continue; }
      const bytes = Buffer.from(contenido);
      const sha = shaDeBlob(bytes);
      blobs.set(sha, bytes);
      mapa.set(ruta, sha);
    }
    const id = arbolId(mapa);
    arboles.set(id, mapa);
    contador += 1;
    const sha = sha1(`otro${contador}${id}`);
    commits.set(sha, { sha, parents: [cabeza], tree: id, message: mensaje });
    cabeza = sha;
    return sha;
  }

  async function fetchFn(url, init = {}) {
    const u = new URL(url);
    const metodo = init.method ?? 'GET';
    const cuerpo = init.body ? JSON.parse(init.body) : undefined;
    estado.llamadas.push({ metodo, ruta: u.pathname.replace(`/repos/${repo}`, '') + u.search, cuerpo });
    if (init.headers?.authorization !== `Bearer ${token}`) return json({ message: 'Bad credentials' }, 401);
    const ruta = u.pathname.replace(`/repos/${repo}`, '');
    let m;

    if (metodo === 'GET' && ruta === '/git/ref/heads/main') return json({ object: { sha: cabeza } });
    if (metodo === 'GET' && (m = ruta.match(/^\/git\/commits\/(\w+)$/))) {
      const c = commits.get(m[1]);
      return c ? json({ sha: c.sha, tree: { sha: c.tree }, parents: c.parents.map((sha) => ({ sha })) }) : json({}, 404);
    }
    if (metodo === 'POST' && ruta === '/git/blobs') {
      const bytes = cuerpo.encoding === 'base64' ? Buffer.from(cuerpo.content, 'base64') : Buffer.from(cuerpo.content);
      const sha = shaDeBlob(bytes);
      blobs.set(sha, bytes);
      return json({ sha }, 201);
    }
    if (metodo === 'POST' && ruta === '/git/trees') {
      const mapa = new Map(arboles.get(cuerpo.base_tree));
      for (const e of cuerpo.tree) {
        if (e.sha === null) mapa.delete(e.path);
        else { if (!blobs.has(e.sha)) return json({ message: 'blob desconocido' }, 422); mapa.set(e.path, e.sha); }
      }
      const id = arbolId(mapa);
      arboles.set(id, mapa);
      return json({ sha: id }, 201);
    }
    if (metodo === 'POST' && ruta === '/git/commits') {
      contador += 1;
      const sha = sha1(`c${contador}${cuerpo.tree}${cuerpo.message}`);
      commits.set(sha, { sha, parents: cuerpo.parents, tree: cuerpo.tree, message: cuerpo.message, author: cuerpo.author });
      return json({ sha }, 201);
    }
    if (metodo === 'PATCH' && ruta === '/git/refs/heads/main') {
      estado.antesDeMoverLaRama?.();
      const c = commits.get(cuerpo.sha);
      if (!c) return json({ message: 'no existe' }, 422);
      if (!cuerpo.force && !c.parents.includes(cabeza)) return json({ message: 'Update is not a fast forward' }, 422);
      cabeza = cuerpo.sha;
      return json({ object: { sha: cabeza } });
    }
    if (metodo === 'GET' && (m = ruta.match(/^\/contents\/(.+)$/))) {
      const sha = archivosDe(resolverRef(u.searchParams.get('ref')))?.get(decodeURIComponent(m[1]));
      if (!sha) return json({ message: 'Not Found' }, 404);
      if (/raw/.test(init.headers.accept ?? '')) return new Response(blobs.get(sha), { status: 200 });
      return json({ sha, path: decodeURIComponent(m[1]) });
    }
    if (metodo === 'GET' && (m = ruta.match(/^\/git\/trees\/([^/]+)$/))) {
      const mapa = archivosDe(resolverRef(decodeURIComponent(m[1])));
      return json({ truncated: false, tree: [...mapa.entries()].map(([path, sha]) => ({ path, type: 'blob', sha })) });
    }
    if (metodo === 'GET' && (m = ruta.match(/^\/compare\/(\w+)\.\.\.(\w+)$/))) {
      const a = archivosDe(m[1]); const b = archivosDe(m[2]);
      const files = [];
      for (const [p, sha] of b) if (a.get(p) !== sha) files.push({ filename: p, status: a.has(p) ? 'modified' : 'added' });
      for (const p of a.keys()) if (!b.has(p)) files.push({ filename: p, status: 'removed' });
      return json({ files });
    }
    if (metodo === 'POST' && (m = ruta.match(/^\/actions\/workflows\/([^/]+)\/dispatches$/))) { estado.despachos.push({ archivo: m[1], ...cuerpo }); return new Response(null, { status: 204 }); }
    if (metodo === 'POST' && ruta === '/dispatches') { estado.dispatchesDelRepo.push(cuerpo); return new Response(null, { status: 204 }); }
    if (metodo === 'GET' && (m = ruta.match(/^\/actions\/workflows\/([^/]+)\/runs$/))) return json({ workflow_runs: [] });
    return json({ message: `la prueba no sabe contestar ${metodo} ${ruta}` }, 500);
  }

  return {
    repo, token, fetchFn, estado, commits, subirComoOtro,
    get cabeza() { return cabeza; },
    leer: (ruta) => { const sha = archivosDe(cabeza).get(ruta); return sha ? Buffer.from(blobs.get(sha)).toString('utf8') : null; },
    leerBytes: (ruta) => { const sha = archivosDe(cabeza).get(ruta); return sha ? Buffer.from(blobs.get(sha)) : null; },
    rutas: () => [...archivosDe(cabeza).keys()].sort(),
    shaDeBlob,
  };
}
