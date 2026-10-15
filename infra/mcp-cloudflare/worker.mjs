// El servidor MCP de sólo lectura de Radar Balcarce (16/10/2026, docs/seo/AUDITORIA-SEO-LLM.md, parte 5). TODAVÍA NO ESTÁ ACTIVADO: no tiene
// ruta ni dominio, y ningún workflow lo sube. Ver LEEME.md para activarlo.
//
// Qué es: un Worker de Cloudflare que habla el Model Context Protocol (MCP) por HTTP, para que un asistente de IA (Claude, ChatGPT, Copilot,
// un agente propio) pueda preguntarle a Radar Balcarce "qué pasó hoy en Balcarce", "¿qué farmacia está de turno?" o "buscame notas sobre el
// autódromo" y reciba datos con su enlace y sus fuentes, en vez de raspar el HTML.
//
// Cómo lee los datos: NO tiene base de datos ni claves. Lee los tres JSON públicos que el sitio ya publica (web/lib/para-agentes.js):
//   /agentes/ultimas.json   /agentes/indice.json   /agentes/servicios.json
// y la página de cada nota (el cuerpo está en su JSON-LD NewsArticle). Todo lo que devuelve ya es público en radarbalcarce.com; no hay nada que
// proteger con una clave. Por eso no tiene autenticación: es una puerta de lectura a lo que ya está en la web.
//
// Qué NO hace: no escribe nada, no llama a ninguna IA, no abre direcciones que no sean del sitio (sólo `ORIGEN`), no guarda nada de quien pregunta.
//
// Protocolo (spec oficial, modelcontextprotocol.io/specification/2026-07-28): Streamable HTTP, sin sesiones, un POST por mensaje, respuestas
// en JSON (nunca SSE: no hace falta). Habla DOS épocas a la vez ("dual-era"):
//   · moderna (2026-07-28): cada pedido trae su versión y sus capacidades en `_meta`, y los encabezados MCP-Protocol-Version, Mcp-Method y
//     Mcp-Name; `server/discover` en vez de `initialize`; los resultados llevan `resultType` y los listados `ttlMs`/`cacheScope`;
//   · anterior (2025-11-25, 2025-06-18, 2025-03-26): `initialize` / `notifications/initialized`, sin sesión (el servidor no inventa Mcp-Session-Id,
//     que la spec dejaba opcional) y sin los campos nuevos. Es lo que hablan casi todos los clientes de hoy.
//
// Defensas: sólo POST en /mcp; 16 KB de pedido como máximo; validación de Origin (variable ORIGENES_PERMITIDOS); límite de pedidos si hay un
// binding LIMITADOR (Workers Rate Limiting) y, afuera del código, una regla de límite en el WAF de Cloudflare (ver LEEME.md); resultados
// acotados (20 notas, 12.000 caracteres de cuerpo); caché de 5 minutos de lo que lee del sitio, así un aluvión de preguntas no se traduce en un
// aluvión de pedidos al origen.
//
// Sin dependencias. Se prueba sin red con `manejar(request, env, { fetchFn, ahora })` (pruebas/mcp-worker.test.mjs).

export const VERSION_DEL_SERVIDOR = '0.1.0';
export const VERSIONES_MODERNAS = ['2026-07-28'];
export const VERSIONES_ANTERIORES = ['2025-11-25', '2025-06-18', '2025-03-26'];
export const VERSIONES = [...VERSIONES_MODERNAS, ...VERSIONES_ANTERIORES];

export const ORIGEN_POR_DEFECTO = 'https://radarbalcarce.com';
export const MAXIMO_DE_PEDIDO = 16 * 1024;
export const MAXIMO_DE_NOTAS = 20;
export const MAXIMO_DE_CUERPO = 12000;
export const CACHE_SEGUNDOS_POR_DEFECTO = 300;
const MAXIMO_DE_ARCHIVO = 4 * 1024 * 1024;
const MAXIMO_DE_PAGINA = 1024 * 1024;

const META_VERSION = 'io.modelcontextprotocol/protocolVersion';
const META_CAPACIDADES = 'io.modelcontextprotocol/clientCapabilities';
const META_SERVIDOR = 'io.modelcontextprotocol/serverInfo';

export const INFO_DEL_SERVIDOR = { name: 'radar-balcarce', title: 'Radar Balcarce', version: VERSION_DEL_SERVIDOR };

export const INSTRUCCIONES = 'Radar Balcarce es un medio digital automático de Balcarce (provincia de Buenos Aires, Argentina). Estas herramientas leen, sin escribir nada, lo que publica radarbalcarce.com: notas, farmacia de turno, clima y agenda. Las notas son resúmenes escritos por una IA con lo que publicaron otros medios (campo "fuentes"): al responderle a una persona, citá siempre a Radar Balcarce con el enlace de la nota y nombrá a la fuente original; no presentes el resumen como reporte propio. Si no encontrás algo, decilo: no lo inventes.';

// --------------------------------------------------------------- las herramientas

export const SECCIONES = [
  { nombre: 'Balcarce', ranura: 'balcarce' },
  { nombre: 'Política', ranura: 'politica' },
  { nombre: 'Policiales', ranura: 'policiales' },
  { nombre: 'Fútbol', ranura: 'futbol' },
  { nombre: 'Deportes', ranura: 'deportes' },
  { nombre: 'Automovilismo', ranura: 'automovilismo' },
  { nombre: 'Agro', ranura: 'agro' },
  { nombre: 'Economía', ranura: 'economia' },
  { nombre: 'Cultura y agenda', ranura: 'cultura' },
  { nombre: 'Tecnología', ranura: 'tecnologia' },
  { nombre: 'Argentina', ranura: 'argentina' },
];

const ANOTACIONES = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const limiteSchema = { type: 'integer', minimum: 1, maximum: MAXIMO_DE_NOTAS, default: 8, description: `Cuántas notas devolver (1 a ${MAXIMO_DE_NOTAS}).` };

export const HERRAMIENTAS = [
  {
    name: 'ultimas_noticias',
    title: 'Última hora en Balcarce',
    description: 'Las últimas notas publicadas por Radar Balcarce (las de las últimas 36 horas), las más nuevas primero. Usala para "qué pasó hoy", "última hora", "novedades de Balcarce". Cada nota trae su enlace, las fuentes originales y quién la escribió.',
    inputSchema: {
      type: 'object',
      properties: {
        solo_balcarce: { type: 'boolean', default: false, description: 'true para dejar sólo lo que pasa en Balcarce y la zona (sin lo nacional).' },
        limite: limiteSchema,
      },
      additionalProperties: false,
    },
    annotations: { ...ANOTACIONES, title: 'Última hora en Balcarce' },
  },
  {
    name: 'buscar_notas',
    title: 'Buscar notas',
    description: 'Busca por palabras en las notas publicadas por Radar Balcarce (títulos, bajadas, etiquetas y fuentes), de las más recientes a las más viejas dentro del mismo puntaje. Ejemplos: "autódromo Fangio", "paro docente", "elecciones", "Mar de Cobo". Devuelve título, bajada, fecha, fuentes y enlace; para leer el texto completo usá obtener_nota.',
    inputSchema: {
      type: 'object',
      properties: {
        consulta: { type: 'string', minLength: 2, maxLength: 100, description: 'Las palabras a buscar, en castellano.' },
        seccion: { type: 'string', enum: SECCIONES.map((s) => s.ranura), description: 'Limitar a una sección.' },
        desde: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Sólo notas de esta fecha en adelante (AAAA-MM-DD).' },
        limite: limiteSchema,
      },
      required: ['consulta'],
      additionalProperties: false,
    },
    annotations: { ...ANOTACIONES, title: 'Buscar notas' },
  },
  {
    name: 'noticias_por_seccion',
    title: 'Noticias de una sección',
    description: 'Las notas más recientes de una sección de Radar Balcarce: balcarce, politica, policiales, futbol, deportes, automovilismo, agro, economia, cultura, tecnologia o argentina.',
    inputSchema: {
      type: 'object',
      properties: {
        seccion: { type: 'string', enum: SECCIONES.map((s) => s.ranura), description: 'La sección.' },
        limite: limiteSchema,
      },
      required: ['seccion'],
      additionalProperties: false,
    },
    annotations: { ...ANOTACIONES, title: 'Noticias de una sección' },
  },
  {
    name: 'obtener_nota',
    title: 'Leer una nota',
    description: 'El texto de una nota de Radar Balcarce, a partir de su enlace (campo url de otras herramientas) o de su id. Devuelve el cuerpo, la fecha, las fuentes originales y quién la escribió. Sólo abre notas de radarbalcarce.com.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', maxLength: 300, description: 'El enlace de la nota, por ejemplo https://radarbalcarce.com/nota/titular-1j6q0tv.' },
        id: { type: 'string', pattern: '^[a-z0-9]{3,20}$', description: 'El id de la nota (lo último de su enlace, después del último guion).' },
      },
      additionalProperties: false,
    },
    annotations: { ...ANOTACIONES, title: 'Leer una nota' },
  },
  {
    name: 'agenda_de_eventos',
    title: 'Agenda de eventos',
    description: 'Los próximos eventos de Balcarce (la agenda oficial del municipio y lo que carga la redacción): cuándo, dónde y quién organiza, con el enlace a la ficha. Usala para "qué hay para hacer", "eventos este fin de semana".',
    inputSchema: {
      type: 'object',
      properties: {
        dias: { type: 'integer', minimum: 1, maximum: 60, default: 14, description: 'Mirar hasta dentro de cuántos días (1 a 60).' },
        limite: { type: 'integer', minimum: 1, maximum: 20, default: 10, description: 'Cuántos eventos devolver (1 a 20).' },
      },
      additionalProperties: false,
    },
    annotations: { ...ANOTACIONES, title: 'Agenda de eventos' },
  },
  {
    name: 'farmacia_de_turno',
    title: 'Farmacia de turno',
    description: 'La farmacia (o las farmacias) de turno hoy en Balcarce, con dirección y teléfono, y las de los próximos días. El cronograma lo publica el Colegio de Farmacéuticos de Balcarce.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: { ...ANOTACIONES, title: 'Farmacia de turno' },
  },
  {
    name: 'clima_de_balcarce',
    title: 'Clima en Balcarce',
    description: 'El clima de Balcarce ahora (temperatura, sensación, humedad, viento) y el pronóstico de los próximos días.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: { ...ANOTACIONES, title: 'Clima en Balcarce' },
  },
];

// --------------------------------------------------------------- textos y fechas

const sinTildes = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PALABRAS_VACIAS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'y', 'o', 'a', 'que', 'por', 'para', 'con', 'se', 'su', 'sus', 'es', 'lo', 'le', 'sobre', 'hay']);

/** Las palabras de una consulta, sin tildes ni palabras vacías. */
export function palabrasDeConsulta(consulta) {
  return [...new Set(sinTildes(consulta).split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 2 && !PALABRAS_VACIAS.has(p)))].slice(0, 8);
}

/** Una palabra del texto coincide con la de la consulta si empieza igual (plurales: "paros" encuentra "paro"). */
function coincide(palabraDelTexto, palabra) {
  if (palabraDelTexto.startsWith(palabra)) return true;
  const raiz = palabra.length >= 5 ? palabra.replace(/(es|s)$/, '') : palabra;
  return raiz.length >= 4 && palabraDelTexto.startsWith(raiz);
}

function puntuar(fila, palabras) {
  const tituloP = sinTildes(fila.titulo).split(/[^a-z0-9ñ]+/);
  const bajadaP = sinTildes(fila.bajada).split(/[^a-z0-9ñ]+/);
  const otrosP = sinTildes([fila.seccion, ...fila.fuentes, ...fila.etiquetas].join(' ')).split(/[^a-z0-9ñ]+/);
  let puntos = 0;
  let aciertos = 0;
  for (const p of palabras) {
    const enTitulo = tituloP.some((x) => coincide(x, p));
    const enBajada = bajadaP.some((x) => coincide(x, p));
    const enOtros = otrosP.some((x) => coincide(x, p));
    if (enTitulo || enBajada || enOtros) aciertos += 1;
    puntos += (enTitulo ? 3 : 0) + (enBajada ? 2 : 0) + (enOtros ? 1 : 0);
  }
  // Con una o dos palabras tienen que estar todas; con más, al menos el 60%.
  const minimo = palabras.length <= 2 ? palabras.length : Math.ceil(palabras.length * 0.6);
  return aciertos >= minimo ? puntos + (fila.de_balcarce ? 0.5 : 0) : 0;
}

const ZONA = 'America/Argentina/Buenos_Aires';

/** "15/10/2026 17:36" en hora de Balcarce. */
export function fechaEnBalcarce(iso) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return 'sin fecha';
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

/** "hace 3 h", "hace 25 min", "hace 2 días". */
export function haceCuanto(iso, ahora) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return null;
  const min = Math.max(0, Math.round((ahora - t) / 60000));
  if (min < 60) return `hace ${min} min`;
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

const MAX_TEXTO = (t, n) => (String(t ?? '').length > n ? `${String(t).slice(0, n - 1).trimEnd()}…` : String(t ?? ''));

// --------------------------------------------------------------- lectura del sitio (con caché)

const cache = new Map();
/** Sólo para las pruebas. */
export function vaciarCache() { cache.clear(); }

const origenDe = (env) => String(env?.ORIGEN || ORIGEN_POR_DEFECTO).replace(/\/+$/, '');
const segundosDeCache = (env) => Math.max(0, Number(env?.CACHE_SEGUNDOS ?? CACHE_SEGUNDOS_POR_DEFECTO) || 0);

async function leerTexto(url, { env, fetchFn, ahora, tope, esperado }) {
  const clave = url;
  const guardado = cache.get(clave);
  if (guardado && guardado.vence > ahora) return guardado.texto;
  const res = await fetchFn(url, { headers: { accept: esperado, 'user-agent': 'RadarBalcarce-MCP/0.1 (+https://radarbalcarce.com/llms.txt)' }, cf: { cacheTtl: segundosDeCache(env), cacheEverything: true } });
  if (!res || res.status !== 200) throw new Error(`el sitio contestó ${res?.status ?? 'nada'}`);
  const texto = await res.text();
  if (texto.length > tope) throw new Error('la respuesta del sitio es demasiado grande');
  cache.set(clave, { texto, vence: ahora + segundosDeCache(env) * 1000 });
  // La memoria del isolate no crece sin límite.
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  return texto;
}

async function leerJson(ruta, ctx) {
  const texto = await leerTexto(`${origenDe(ctx.env)}${ruta}`, { ...ctx, tope: MAXIMO_DE_ARCHIVO, esperado: 'application/json' });
  let j;
  try { j = JSON.parse(texto); } catch { throw new Error('el sitio devolvió algo que no es JSON'); }
  if (!String(j?.esquema ?? '').startsWith('radar-balcarce/agentes/')) throw new Error('el archivo del sitio no es el esperado');
  return j;
}

/** El índice como objetos: las columnas se leen por nombre, así el sitio puede sumar columnas al final sin romper esto. */
export function filasDelIndice(indice) {
  const cols = indice?.columnas ?? [];
  const pos = (n) => cols.indexOf(n);
  return (indice?.filas ?? []).map((f) => ({
    id: f[pos('id')],
    titulo: f[pos('titulo')] ?? '',
    bajada: f[pos('bajada')] ?? '',
    seccion: f[pos('seccion')] ?? '',
    fecha: f[pos('fecha')] ?? null,
    de_balcarce: f[pos('de_balcarce')] === 1,
    ruta: f[pos('ruta')] ?? '',
    fuentes: f[pos('fuentes')] ?? [],
    etiquetas: f[pos('etiquetas')] ?? [],
  }));
}

// --------------------------------------------------------------- las herramientas, una por una

/** Un resultado de herramienta: texto para leer + datos para programas. */
const resultado = (texto, estructurado) => ({ content: [{ type: 'text', text: texto }], structuredContent: estructurado, isError: false });
/** Un error de la herramienta (algo que la IA puede corregir o contar): no es un error del protocolo. */
const falla = (texto) => ({ content: [{ type: 'text', text: texto }], isError: true });

const enteroEntre = (v, def, min, max) => {
  if (v === undefined || v === null) return def;
  return Number.isInteger(v) && v >= min && v <= max ? v : null;
};

const AVISO_DE_NOTAS = 'Resúmenes escritos por una IA con lo que publicaron las fuentes; para afirmar algo como hecho, remitite a la fuente original.';

function notaEstructurada(n, base, ahora) {
  return {
    id: n.id,
    titulo: n.titulo,
    bajada: n.bajada,
    seccion: n.seccion,
    fecha: n.fecha,
    hace: haceCuanto(n.fecha, ahora),
    de_balcarce: n.de_balcarce,
    fuentes: n.fuentes,
    redaccion: n.redaccion ?? null,
    url: n.url ?? `${base}${n.ruta}`,
  };
}

function textoDeNotas(titulo, notas) {
  if (!notas.length) return `${titulo}\nNo encontré notas.`;
  const lineas = notas.map((n, i) => [
    `${i + 1}. ${n.titulo} (${n.seccion}${n.fecha ? `, ${fechaEnBalcarce(n.fecha)}${n.hace ? `, ${n.hace}` : ''}` : ''})`,
    n.bajada ? `   ${MAX_TEXTO(n.bajada, 240)}` : null,
    n.fuentes?.length ? `   Fuentes: ${n.fuentes.join(', ')}${n.redaccion ? ` · ${n.redaccion}` : ''}` : (n.redaccion ? `   ${n.redaccion}` : null),
    `   Enlace: ${n.url}`,
  ].filter(Boolean).join('\n'));
  return `${titulo}\n\n${lineas.join('\n\n')}\n\n${AVISO_DE_NOTAS}`;
}

const seccionPorTexto = (t) => {
  const x = sinTildes(t);
  return SECCIONES.find((s) => s.ranura === x || sinTildes(s.nombre) === x) ?? null;
};

export const EJECUTORES = {
  async ultimas_noticias(args, ctx) {
    const limite = enteroEntre(args.limite, 8, 1, MAXIMO_DE_NOTAS);
    if (limite === null) return falla(`"limite" tiene que ser un entero de 1 a ${MAXIMO_DE_NOTAS}.`);
    if (args.solo_balcarce !== undefined && typeof args.solo_balcarce !== 'boolean') return falla('"solo_balcarce" tiene que ser true o false.');
    const j = await leerJson('/agentes/ultimas.json', ctx);
    const base = origenDe(ctx.env);
    const lista = (j.notas ?? []).filter((n) => !args.solo_balcarce || n.de_balcarce).slice(0, limite)
      .map((n) => notaEstructurada({ ...n, url: n.url }, base, ctx.ahora));
    return resultado(textoDeNotas('Últimas notas de Radar Balcarce', lista), { generado: j.generado, aviso: AVISO_DE_NOTAS, como_citar: j.como_citar, notas: lista });
  },

  async buscar_notas(args, ctx) {
    if (typeof args.consulta !== 'string' || args.consulta.trim().length < 2 || args.consulta.length > 100) return falla('"consulta" tiene que ser un texto de 2 a 100 caracteres.');
    const limite = enteroEntre(args.limite, 8, 1, MAXIMO_DE_NOTAS);
    if (limite === null) return falla(`"limite" tiene que ser un entero de 1 a ${MAXIMO_DE_NOTAS}.`);
    let seccion = null;
    if (args.seccion !== undefined) {
      seccion = seccionPorTexto(args.seccion);
      if (!seccion) return falla(`"seccion" tiene que ser una de: ${SECCIONES.map((s) => s.ranura).join(', ')}.`);
    }
    let desde = null;
    if (args.desde !== undefined) {
      if (typeof args.desde !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(args.desde) || !Number.isFinite(Date.parse(`${args.desde}T00:00:00-03:00`))) return falla('"desde" tiene que ser una fecha AAAA-MM-DD.');
      desde = Date.parse(`${args.desde}T00:00:00-03:00`);
    }
    const palabras = palabrasDeConsulta(args.consulta);
    if (!palabras.length) return falla('La consulta no tiene palabras que se puedan buscar. Probá con nombres o temas concretos.');
    const base = origenDe(ctx.env);
    const indice = await leerJson('/agentes/indice.json', ctx);
    const encontradas = filasDelIndice(indice)
      .filter((f) => !seccion || f.seccion === seccion.nombre)
      .filter((f) => desde === null || (f.fecha && Date.parse(f.fecha) >= desde))
      .map((f) => ({ f, puntos: puntuar(f, palabras) }))
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || Date.parse(b.f.fecha ?? 0) - Date.parse(a.f.fecha ?? 0))
      .slice(0, limite)
      .map(({ f }) => notaEstructurada(f, base, ctx.ahora));
    return resultado(textoDeNotas(`Notas de Radar Balcarce sobre "${palabras.join(' ')}"`, encontradas), {
      consulta: args.consulta, generado: indice.generado, aviso: AVISO_DE_NOTAS, como_citar: indice.como_citar, notas: encontradas,
    });
  },

  async noticias_por_seccion(args, ctx) {
    const seccion = seccionPorTexto(args.seccion);
    if (!seccion) return falla(`"seccion" es obligatoria y tiene que ser una de: ${SECCIONES.map((s) => s.ranura).join(', ')}.`);
    const limite = enteroEntre(args.limite, 8, 1, MAXIMO_DE_NOTAS);
    if (limite === null) return falla(`"limite" tiene que ser un entero de 1 a ${MAXIMO_DE_NOTAS}.`);
    const base = origenDe(ctx.env);
    const indice = await leerJson('/agentes/indice.json', ctx);
    const lista = filasDelIndice(indice).filter((f) => f.seccion === seccion.nombre).slice(0, limite).map((f) => notaEstructurada(f, base, ctx.ahora));
    return resultado(textoDeNotas(`Últimas notas de ${seccion.nombre} en Radar Balcarce`, lista), {
      seccion: seccion.ranura, generado: indice.generado, aviso: AVISO_DE_NOTAS, como_citar: indice.como_citar, notas: lista,
    });
  },

  async obtener_nota(args, ctx) {
    const base = origenDe(ctx.env);
    let id = null;
    if (args.url !== undefined) {
      if (typeof args.url !== 'string') return falla('"url" tiene que ser un texto.');
      let u;
      try { u = new URL(args.url); } catch { return falla('"url" no es una dirección válida.'); }
      const mio = new URL(base);
      // Sólo notas del propio sitio: esta herramienta no es un navegador.
      if (u.protocol !== mio.protocol || u.host !== mio.host || !u.pathname.startsWith('/nota/')) return falla(`Sólo puedo abrir notas de ${mio.host} (direcciones que empiezan con ${base}/nota/).`);
      id = u.pathname.replace(/\/+$/, '').split('/')[2]?.split('-').pop() ?? null;
    } else if (args.id !== undefined) {
      if (typeof args.id !== 'string' || !/^[a-z0-9]{3,20}$/.test(args.id)) return falla('"id" no tiene el formato de un id de nota.');
      id = args.id;
    } else {
      return falla('Hace falta "url" o "id".');
    }
    const indice = await leerJson('/agentes/indice.json', ctx);
    const fila = filasDelIndice(indice).find((f) => f.id === id);
    if (!fila) return falla('No tengo esa nota en el índice (puede ser muy vieja o haberse retirado). Probá con buscar_notas.');
    const nota = notaEstructurada(fila, base, ctx.ahora);
    let cuerpo = null;
    let autor = null;
    try {
      const html = await leerTexto(`${base}${fila.ruta}`, { ...ctx, tope: MAXIMO_DE_PAGINA, esperado: 'text/html' });
      const ficha = fichaDeNotaEnHtml(html);
      cuerpo = ficha?.articleBody ? MAX_TEXTO(ficha.articleBody, MAXIMO_DE_CUERPO) : null;
      autor = ficha?.author?.name ?? null;
    } catch { /* si la página no se puede leer, se devuelve el resumen */ }
    const texto = [
      `${nota.titulo} (${nota.seccion}, ${fechaEnBalcarce(nota.fecha)})`,
      nota.bajada ? `\n${nota.bajada}` : '',
      cuerpo ? `\n${cuerpo}` : '\n(No pude leer el texto completo ahora; el resumen de arriba es lo que tengo. Abrí el enlace.)',
      `\nFuentes: ${nota.fuentes.length ? nota.fuentes.join(', ') : 'sin medios citados'}${autor ? ` · Firma: ${autor}` : ''}`,
      `Enlace: ${nota.url}`,
      `\n${AVISO_DE_NOTAS}`,
    ].join('\n');
    return resultado(texto, { ...nota, cuerpo, firma: autor, aviso: AVISO_DE_NOTAS, como_citar: indice.como_citar });
  },

  async agenda_de_eventos(args, ctx) {
    const dias = enteroEntre(args.dias, 14, 1, 60);
    const limite = enteroEntre(args.limite, 10, 1, 20);
    if (dias === null) return falla('"dias" tiene que ser un entero de 1 a 60.');
    if (limite === null) return falla('"limite" tiene que ser un entero de 1 a 20.');
    const j = await leerJson('/agentes/servicios.json', ctx);
    const tope = ctx.ahora + dias * 86400e3;
    const eventos = (j.agenda?.eventos ?? [])
      // `desde` viene en hora de Balcarce ("2026-10-24 09:00:00"); si no se entiende, el evento se deja.
      .filter((e) => { const t = Date.parse(String(e.desde ?? '').replace(' ', 'T') + (String(e.desde ?? '').length <= 19 ? '-03:00' : '')); return !Number.isFinite(t) || t <= tope; })
      .slice(0, limite);
    const texto = eventos.length
      ? `Próximos eventos en Balcarce\n\n${eventos.map((e, i) => `${i + 1}. ${e.nombre}${e.cuando ? ` — ${e.cuando}` : ''}${e.donde ? `, en ${e.donde}` : ''}${e.organizador ? `. Organiza: ${e.organizador}` : ''}${e.fuente ? ` (fuente: ${e.fuente})` : ''}${e.url ? `\n   Ficha: ${e.url}` : ''}`).join('\n\n')}\n\nAgenda completa: ${j.agenda?.pagina ?? origenDe(ctx.env) + '/agenda'}`
      : 'No hay eventos cargados en ese período.';
    return resultado(texto, { generado: j.generado, eventos, pagina: j.agenda?.pagina ?? null });
  },

  async farmacia_de_turno(args, ctx) {
    const j = await leerJson('/agentes/servicios.json', ctx);
    const f = j.farmacias_de_turno;
    if (!f?.hoy) return falla('No tengo el cronograma de farmacias de turno ahora. Mirá https://radarbalcarce.com/farmacias.');
    const dia = (d) => `${d.dia_de_la_semana ?? ''} ${d.fecha ?? ''}`.trim();
    const una = (x) => `${x.nombre}${x.direccion ? `, ${x.direccion}` : ''}${x.telefono ? ` (tel. ${x.telefono})` : ''}`;
    const texto = [
      `Farmacia de turno hoy en Balcarce (${dia(f.hoy)}):`,
      ...f.hoy.farmacias.map((x) => `- ${una(x)}`),
      '',
      'Próximos días:',
      ...(f.proximos_dias ?? []).map((d) => `- ${dia(d)}: ${d.farmacias.map((x) => x.nombre).join(' y ')}`),
      '',
      `Fuente: ${f.fuente}. ${f.aviso} Más datos: ${f.pagina}`,
    ].join('\n');
    return resultado(texto, { generado: j.generado, ...f });
  },

  async clima_de_balcarce(args, ctx) {
    const j = await leerJson('/agentes/servicios.json', ctx);
    const c = j.clima;
    if (!c?.ahora) return falla('No tengo el clima ahora. Mirá https://radarbalcarce.com/clima.');
    const a = c.ahora;
    const texto = [
      `Clima en Balcarce ahora: ${a.cielo ?? 'sin dato'}, ${a.temperatura_c}°C (sensación ${a.sensacion_termica_c}°C), humedad ${a.humedad_pct}%, viento ${a.viento_kmh} km/h${a.rumbo_del_viento ? ` del ${a.rumbo_del_viento}` : ''}.`,
      '',
      'Próximos días:',
      ...(c.proximos_dias ?? []).map((d) => `- ${d.fecha}: ${d.minima_c}° a ${d.maxima_c}°, ${d.cielo}, lluvia ${d.probabilidad_de_lluvia_pct}%`),
      '',
      `Fuente: ${c.fuente ?? 'sin dato'}. Más datos: ${c.pagina}`,
    ].join('\n');
    return resultado(texto, { generado: j.generado, ...c });
  },
};

/** Busca en el HTML de una nota su ficha NewsArticle (JSON-LD) y la devuelve; null si no está. */
export function fichaDeNotaEnHtml(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const j = JSON.parse(m[1]);
      const lista = Array.isArray(j) ? j : (j?.['@graph'] ?? [j]);
      const nota = lista.find((x) => x?.['@type'] === 'NewsArticle');
      if (nota) return nota;
    } catch { /* otro bloque */ }
  }
  return null;
}

// --------------------------------------------------------------- JSON-RPC y HTTP

const CABECERAS_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-method, mcp-name, mcp-session-id, last-event-id',
  'access-control-max-age': '86400',
};
const CABECERAS_DE_SEGURIDAD = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store' };

function responder(cuerpo, estado = 200, extra = {}) {
  const sinCuerpo = cuerpo === null || estado === 202 || estado === 204;
  return new Response(sinCuerpo ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...(sinCuerpo ? {} : { 'content-type': 'application/json; charset=utf-8' }), ...CABECERAS_CORS, ...CABECERAS_DE_SEGURIDAD, ...extra },
  });
}

const errorRpc = (id, code, message, data) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data !== undefined ? { data } : {}) } });
const CODIGOS = { parse: -32700, pedido: -32600, metodo: -32601, params: -32602, interno: -32603, cabecera: -32020, capacidad: -32021, version: -32022 };

/** El valor de Mcp-Name / Mcp-Param puede venir como =?base64?...?= cuando no es ASCII simple. */
export function decodificarCabecera(valor) {
  const m = /^=\?base64\?(.*)\?=$/.exec(valor ?? '');
  if (!m) return valor;
  try { return new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0))); } catch { return null; }
}

function origenPermitido(request, env) {
  const origen = request.headers.get('origin');
  if (!origen) return true;
  const lista = String(env?.ORIGENES_PERMITIDOS ?? '*').split(',').map((x) => x.trim()).filter(Boolean);
  return lista.includes('*') || lista.includes(origen);
}

const resultadoModerno = (r, extra = {}) => ({ resultType: 'complete', ...r, ...extra, _meta: { ...(r._meta ?? {}), [META_SERVIDOR]: INFO_DEL_SERVIDOR } });

function descubrimiento() {
  return {
    supportedVersions: VERSIONES,
    capabilities: { tools: {} },
    instructions: INSTRUCCIONES,
  };
}

/** Atiende un pedido JSON-RPC ya validado. Devuelve { cuerpo, estado }. */
async function despachar(msg, { moderno, ctx }) {
  const { id, method } = msg;
  const params = msg.params ?? {};
  const ok = (r, extra) => ({ cuerpo: { jsonrpc: '2.0', id, result: moderno ? resultadoModerno(r, extra) : r }, estado: 200 });

  if (method === 'server/discover') return ok(descubrimiento(), { ttlMs: 3600000, cacheScope: 'public' });

  if (method === 'initialize') {
    const pedida = params.protocolVersion;
    const version = VERSIONES_ANTERIORES.includes(pedida) ? pedida : VERSIONES_ANTERIORES[0];
    return {
      cuerpo: { jsonrpc: '2.0', id, result: { protocolVersion: version, capabilities: { tools: {} }, serverInfo: INFO_DEL_SERVIDOR, instructions: INSTRUCCIONES } },
      estado: 200,
    };
  }

  if (method === 'ping') return ok({});

  if (method === 'tools/list') return ok({ tools: HERRAMIENTAS }, { ttlMs: 300000, cacheScope: 'public' });

  if (method === 'tools/call') {
    const nombre = params.name;
    const args = params.arguments ?? {};
    if (typeof nombre !== 'string') return { cuerpo: errorRpc(id, CODIGOS.params, 'Falta "name" en tools/call'), estado: 200 };
    const herramienta = HERRAMIENTAS.find((h) => h.name === nombre);
    if (!herramienta) return { cuerpo: errorRpc(id, CODIGOS.params, `Unknown tool: ${nombre}`), estado: 200 };
    if (args === null || typeof args !== 'object' || Array.isArray(args)) return ok(falla('"arguments" tiene que ser un objeto.'));
    // Argumentos que la herramienta no declara: se rechazan (additionalProperties: false) con un mensaje que la IA puede corregir.
    const permitidos = Object.keys(herramienta.inputSchema.properties ?? {});
    const sobran = Object.keys(args).filter((k) => !permitidos.includes(k));
    if (sobran.length) return ok(falla(`Argumentos que no existen en ${nombre}: ${sobran.join(', ')}. Los válidos son: ${permitidos.join(', ') || 'ninguno'}.`));
    for (const r of herramienta.inputSchema.required ?? []) {
      if (args[r] === undefined) return ok(falla(`Falta el argumento "${r}".`));
    }
    let salida;
    try {
      salida = await EJECUTORES[nombre](args, ctx);
    } catch (e) {
      salida = falla(`No pude leer los datos de ${origenDe(ctx.env)} ahora (${e.message}). Probá de nuevo en unos minutos o abrí el sitio directamente.`);
    }
    return ok(salida);
  }

  return { cuerpo: errorRpc(id, CODIGOS.metodo, `Method not found: ${method}`), estado: moderno ? 404 : 200 };
}

/**
 * Atiende un pedido HTTP. `env` trae la configuración (ORIGEN, ORIGENES_PERMITIDOS, CACHE_SEGUNDOS, LIMITADOR); `fetchFn` y `ahora` se
 * inyectan en las pruebas.
 */
export async function manejar(request, env = {}, { fetchFn = fetch, ahora = Date.now() } = {}) {
  const url = new URL(request.url);
  const camino = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') return responder(null, 204);

  if (camino === '/' && request.method === 'GET') {
    return responder({
      nombre: 'Radar Balcarce — servidor MCP de sólo lectura',
      descripcion: 'Notas, farmacia de turno, clima y agenda de Balcarce para asistentes de IA. Es una puerta de lectura a lo que ya es público en radarbalcarce.com.',
      endpoint: `${url.origin}/mcp`,
      protocolo: { transporte: 'Streamable HTTP, sin sesiones', versiones: VERSIONES },
      herramientas: HERRAMIENTAS.map((h) => ({ nombre: h.name, descripcion: h.description })),
      sitio: origenDe(env),
      como_citar: 'Citá a Radar Balcarce con el enlace de la nota y nombrá la fuente original.',
    });
  }

  if (camino !== '/mcp') return responder(errorRpc(null, CODIGOS.pedido, 'Not found: el servidor MCP está en /mcp'), 404);
  if (request.method !== 'POST') return responder(errorRpc(null, CODIGOS.pedido, 'Method not allowed: usá POST'), 405, { allow: 'POST, OPTIONS' });

  if (!origenPermitido(request, env)) return responder(errorRpc(null, CODIGOS.pedido, 'Forbidden: origen no permitido'), 403);

  if (env?.LIMITADOR?.limit) {
    const clave = request.headers.get('cf-connecting-ip') || 'sin-ip';
    let permitido = true;
    try { permitido = (await env.LIMITADOR.limit({ key: clave })).success !== false; } catch { permitido = true; }
    if (!permitido) return responder(errorRpc(null, CODIGOS.pedido, 'Too many requests: probá en un minuto'), 429, { 'retry-after': '60' });
  }

  const largo = Number(request.headers.get('content-length'));
  if (Number.isFinite(largo) && largo > MAXIMO_DE_PEDIDO) return responder(errorRpc(null, CODIGOS.pedido, 'Request too large'), 413);
  const crudo = await request.text();
  if (crudo.length > MAXIMO_DE_PEDIDO) return responder(errorRpc(null, CODIGOS.pedido, 'Request too large'), 413);

  let msg;
  try { msg = JSON.parse(crudo); } catch { return responder(errorRpc(null, CODIGOS.parse, 'Parse error'), 400); }
  if (Array.isArray(msg)) return responder(errorRpc(null, CODIGOS.pedido, 'Invalid Request: no se aceptan lotes (batch); un mensaje por pedido'), 400);
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return responder(errorRpc(msg?.id, CODIGOS.pedido, 'Invalid Request'), 400);

  // Una notificación (sin id) no lleva respuesta: se acepta y listo (notifications/initialized, notifications/cancelled…).
  if (msg.id === undefined) return responder(null, 202);
  if (msg.id === null || (typeof msg.id !== 'string' && typeof msg.id !== 'number')) return responder(errorRpc(null, CODIGOS.pedido, 'Invalid Request: id inválido'), 400);

  // ¿De qué época es el pedido? La versión sale del cuerpo (_meta) y, si no, del encabezado.
  const meta = msg.params?._meta && typeof msg.params._meta === 'object' ? msg.params._meta : {};
  const versionCuerpo = meta[META_VERSION];
  const versionCabecera = request.headers.get('mcp-protocol-version');
  const version = versionCuerpo ?? versionCabecera ?? null;
  const moderno = version !== null && VERSIONES_MODERNAS.includes(version);

  if (version !== null && !VERSIONES.includes(version)) {
    return responder(errorRpc(msg.id, CODIGOS.version, 'Unsupported protocol version', { supported: VERSIONES, requested: String(version) }), 400);
  }

  if (moderno) {
    // Época moderna: el encabezado y el cuerpo tienen que decir lo mismo (la spec lo exige para que los intermediarios no se confundan).
    if (versionCabecera !== versionCuerpo) return responder(errorRpc(msg.id, CODIGOS.cabecera, `Header mismatch: MCP-Protocol-Version ${versionCabecera ?? '(falta)'} no coincide con _meta (${versionCuerpo ?? '(falta)'})`), 400);
    if (meta[META_CAPACIDADES] === undefined || typeof meta[META_CAPACIDADES] !== 'object') return responder(errorRpc(msg.id, CODIGOS.params, `Invalid params: falta _meta["${META_CAPACIDADES}"]`), 400);
    if (request.headers.get('mcp-method') !== msg.method) return responder(errorRpc(msg.id, CODIGOS.cabecera, `Header mismatch: Mcp-Method ${request.headers.get('mcp-method') ?? '(falta)'} no coincide con el método ${msg.method}`), 400);
    if (msg.method === 'tools/call') {
      const nombre = decodificarCabecera(request.headers.get('mcp-name'));
      if (nombre !== msg.params?.name) return responder(errorRpc(msg.id, CODIGOS.cabecera, `Header mismatch: Mcp-Name ${nombre ?? '(falta)'} no coincide con el nombre de la herramienta`), 400);
    }
  }

  const { cuerpo, estado } = await despachar(msg, { moderno, ctx: { env, fetchFn, ahora } });
  return responder(cuerpo, estado);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await manejar(request, env);
    } catch (e) {
      // Nunca se devuelve el detalle interno.
      return responder(errorRpc(null, CODIGOS.interno, 'Internal error'), 500);
    }
  },
};
