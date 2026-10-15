// Medidas para el análisis de las etapas 2 a 5 (entrada, duplicadas, clasificación, puntaje).
//
// SÓLO LEE: web/data/*.json y las listas de fuentes (si se pueden importar). No toca el motor.
// Escribe únicamente en esta carpeta (docs/etapa-2-5/): medidas.json, lecturas-por-grupo.csv,
// duplicadas-publicadas.csv y ruido-publicado.csv.
//
//     node docs/etapa-2-5/medir-etapas.mjs
//
// Sin dependencias (Node 22). Todo lo que sea "por palabras" (tipo de nota, ruido) es una
// aproximación para medir, NO una regla para el motor: está marcado así en ANALISIS.md.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = import.meta.dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const leer = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));
const sinTildes = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ------------------------------------------------------------------ datos
const archivo = leer('web/data/archivo.json').notas;
const historico = fs.readdirSync(path.join(RAIZ, 'web/data/historico')).filter((f) => f.endsWith('.json'))
  .flatMap((f) => leer(`web/data/historico/${f}`).notas ?? []);
const porId = new Map();
for (const n of [...historico, ...archivo]) porId.set(n.id, n); // el archivo pisa al histórico
const notas = [...porId.values()];
const estad = leer('web/data/estadisticas.json');
const fichas = leer('web/data/fichas.json').fichas ?? {};
const fusionadas = leer('web/data/fusionadas.json').notas ?? {};
const correcciones = leer('web/data/correcciones.json').notas ?? {};
const portada = leer('web/data/portada.json');
const porDia = leer('web/data/notas-por-dia.json').dias ?? {};

// Pesos y grupos de las fuentes (si el archivo de fuentes está a mitad de una edición, se sigue sin ellos).
let feeds = [];
try {
  const f1 = await import(pathToFileURL(path.join(RAIZ, 'ingesta/fuentes.mjs')).href);
  const f2 = await import(pathToFileURL(path.join(RAIZ, 'ingesta/fuentes-cruce.mjs')).href);
  feeds = [...f1.FUENTES, ...f1.FUENTES_NACIONALES, ...f2.FUENTES_CRUCE];
} catch (e) { console.log(`(sin listas de fuentes: ${e.message})`); }
const hostDe = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const pesoPorHost = new Map();
const medioPorHost = new Map();
const pesoPorMedio = new Map();
for (const f of feeds) {
  if (f.activa === false) continue;
  const h = hostDe(f.base ?? f.url);
  pesoPorHost.set(h, Math.max(pesoPorHost.get(h) ?? 0, f.peso ?? 10));
  medioPorHost.set(h, f.medio);
  pesoPorMedio.set(f.medio, Math.max(pesoPorMedio.get(f.medio) ?? 0, f.peso ?? 10));
}
// Grupos (dueño o sistema): el campo `grupo` si ya existe; si no, los dos que midió la etapa 1.
const GRUPO_CONOCIDO = {
  'Clarín': 'Grupo Clarín', 'Olé': 'Grupo Clarín', 'TN (Todo Noticias)': 'Grupo Clarín', TN: 'Grupo Clarín', 'Radio Mitre': 'Grupo Clarín',
  'El Eco de Tandil': 'eleco', 'Ecos Diarios (Necochea)': 'eleco', 'El Marplatense': 'eleco', 'LU9 Mar del Plata': 'eleco',
  'QZ Noticias (Mar del Plata)': 'eleco', 'La Noticia 1': 'eleco', 'La Voz del Pueblo': 'eleco',
};
const grupoDe = (medio) => feeds.find((f) => f.medio === medio && f.grupo)?.grupo ?? GRUPO_CONOCIDO[medio] ?? medio;
const mediosConGrupo = (n) => new Set((n.medios ?? []).map(grupoDe)).size;

// ------------------------------------------------------------- lecturas
// estadisticas.json · dias[dia].notas = páginas vistas por nota (Cloudflare Web Analytics, en el navegador).
const dias = Object.entries(estad.dias ?? {}).sort(([a], [b]) => (a < b ? -1 : 1));
const totalDelDia = (d) => Object.values(d.notas ?? {}).reduce((s, x) => s + x, 0) + Object.values(d.paginas ?? {}).reduce((s, x) => s + x, 0);
const diasConDatos = dias.filter(([, d]) => totalDelDia(d) > 0).map(([k]) => k);
const diasSinDatos = dias.filter(([, d]) => totalDelDia(d) === 0).map(([k]) => k);
const vistas = new Map();
for (const [, d] of dias) for (const [id, c] of Object.entries(d.notas ?? {})) vistas.set(id, (vistas.get(id) ?? 0) + c);
const paginas = {};
const referentes = {};
for (const [, d] of dias) {
  for (const [p, c] of Object.entries(d.paginas ?? {})) paginas[p] = (paginas[p] ?? 0) + c;
  for (const [r, c] of Object.entries(d.referentes ?? {})) referentes[r] = (referentes[r] ?? 0) + c;
}
// Ventana justa: notas publicadas desde el primer día con datos hasta el último día con datos
// (las de los días sin medición no tuvieron chance de sumar visitas).
const desde = diasConDatos[0];
const hasta = diasConDatos[diasConDatos.length - 1];
const diaDe = (n) => new Date(new Date(n.fecha).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
const enVentana = notas.filter((n) => { const d = diaDe(n); return d >= desde && d <= hasta; });

// ------------------------------------------------------- tipo por palabras (aproximación)
const RE = (s) => new RegExp(s, 'i');
const TIPOS = [
  ['servicio', RE('\\b(corte(s)? (de|del|programado)|sin (luz|agua)|farmacia|horario|atenci[oó]n al p[uú]blico|tr[aá]mite|inscripci[oó]n|inscrib|vacunaci|cronograma|turnos?\\b|vencimiento|cierre de calle|desv[ií]o|ruta (cortada|cerrada)|alerta|aviso|suspend|reprogram|tarifa|boleto|colectivo|beca|convocatoria|gratuit|campa[nñ]a|castraci|recolecci[oó]n|residuos|cementerio|licencia de conducir|\\bdni\\b|feriado|cobro|pago de|calendario de pagos|pr[oó]rroga|operativo|asueto|clases)')],
  ['institucional', RE('\\b(concejo|concejal|ordenanza|intendente|municipio|municipal|sesi[oó]n|presupuesto|delegaci[oó]n|secretar[ií]a)')],
  ['agenda', RE('\\b(festival|muestra|show|recital|presenta|taller|charla|fiesta|celebra|aniversario|encuentro|jornada|exposici[oó]n|obra de teatro|concierto|feria)')],
  ['resultado deportivo', RE('\\b(gan[oó]|empat[oó]|perdi[oó]|venci[oó]|goleada|clasific[oó]|campe[oó]n|podio|final|fecha \\d|torneo)')],
];
const tipoDe = (n) => {
  const t = sinTildes(`${n.titulo} ${n.copete ?? ''}`);
  for (const [tipo, re] of TIPOS) if (re.test(t)) return tipo;
  return 'hecho u otro';
};
const subtipoPropia = (n) => (n.id.match(/^(repaso|clima|efemeride|dolar|f1|futbol|feriado)/)?.[1] ?? 'otra propia');
const lugarDe = (n) => (n.propia ? 'propia de Radar' : n.deLaZona ? 'la zona' : n.local ? 'Balcarce' : 'de afuera');
const cubo = (m) => (m <= 1 ? '1' : m === 2 ? '2' : m === 3 ? '3' : m <= 7 ? '4 a 7' : '8 o más');

function porGrupo(lista, clave) {
  const g = new Map();
  for (const n of lista) {
    const k = clave(n);
    if (k == null) continue;
    const o = g.get(k) ?? { grupo: k, notas: 0, vistas: 0, conAlgunaVista: 0 };
    const v = vistas.get(n.id) ?? 0;
    o.notas += 1; o.vistas += v; if (v > 0) o.conAlgunaVista += 1;
    g.set(k, o);
  }
  const totN = lista.length;
  const totV = lista.reduce((s, n) => s + (vistas.get(n.id) ?? 0), 0) || 1;
  return [...g.values()].map((o) => ({
    ...o,
    vistasPorNota: +(o.vistas / o.notas).toFixed(2),
    pctNotas: +(100 * o.notas / totN).toFixed(1),
    pctVistas: +(100 * o.vistas / totV).toFixed(1),
    indice: +((o.vistas / totV) / (o.notas / totN)).toFixed(2),
  })).sort((a, b) => b.vistasPorNota - a.vistasPorNota);
}

const deMedios = enVentana.filter((n) => !n.propia);
const lecturas = {
  ventana: { desde, hasta, diasConDatos: diasConDatos.length, diasSinDatos, notasEnVentana: enVentana.length,
    vistasANotas: [...vistas.values()].reduce((s, x) => s + x, 0),
    vistasEnVentana: enVentana.reduce((s, n) => s + (vistas.get(n.id) ?? 0), 0) },
  porLugar: porGrupo(enVentana, lugarDe),
  porSeccion: porGrupo(deMedios, (n) => n.seccion),
  porSeccionSoloDeAca: porGrupo(deMedios.filter((n) => n.local || n.deLaZona), (n) => n.seccion),
  porSeccionSoloDeAfuera: porGrupo(deMedios.filter((n) => !n.local && !n.deLaZona), (n) => n.seccion),
  porTipoDeAca: porGrupo(deMedios.filter((n) => n.local || n.deLaZona), tipoDe),
  porTipoDeAfuera: porGrupo(deMedios.filter((n) => !n.local && !n.deLaZona), tipoDe),
  porMediosDeAfuera: porGrupo(deMedios.filter((n) => !n.local && !n.deLaZona), (n) => cubo((n.medios ?? []).length)),
  porPropia: porGrupo(enVentana.filter((n) => n.propia), subtipoPropia),
  // Facebook trae ~70 % de las visitas: lo que fue a las redes se lee más por eso, no sólo por lo que es.
  porRedes: porGrupo(deMedios, (n) => `${(n.local || n.deLaZona) ? 'de acá' : 'de afuera'} · ${n.redes ? 'fue a redes' : 'no fue a redes'}`),
  porMediosDeAca: porGrupo(deMedios.filter((n) => n.local || n.deLaZona), (n) => cubo((n.medios ?? []).length)),
  porFoto: porGrupo(deMedios, (n) => (n.foto?.archivo ? 'con foto' : 'sin foto')),
  porComo: porGrupo(deMedios, (n) => n.como),
  masLeidas: [...enVentana].sort((a, b) => (vistas.get(b.id) ?? 0) - (vistas.get(a.id) ?? 0)).slice(0, 20)
    .map((n) => ({ id: n.id, vistas: vistas.get(n.id) ?? 0, lugar: lugarDe(n), seccion: n.seccion, medios: (n.medios ?? []).length, tipo: tipoDe(n), titulo: n.titulo })),
  paginasMasVistas: Object.entries(paginas).sort((a, b) => b[1] - a[1]).slice(0, 15),
  referentes: Object.entries(referentes).sort((a, b) => b[1] - a[1]).slice(0, 8),
};
// Concentración: qué parte de las visitas se llevan las 10 % más leídas.
{
  const vs = enVentana.map((n) => vistas.get(n.id) ?? 0).sort((a, b) => b - a);
  const tot = vs.reduce((s, x) => s + x, 0) || 1;
  const top = vs.slice(0, Math.ceil(vs.length * 0.1)).reduce((s, x) => s + x, 0);
  lecturas.concentracion = { notas: vs.length, sinNingunaVista: vs.filter((x) => x === 0).length, pctVistasDel10PorCientoMasLeido: +(100 * top / tot).toFixed(1) };
}

// ------------------------------------------- el puntaje de hoy, reconstruido (aproximación)
// La fórmula de relevancia() sin lo que el archivo no guarda (frescura al momento, figura, nombraBalcarce):
// peso del medio principal + 25 si es de acá + 10 por medio extra (tope 40) + 6 con imagen + 8 si es Automovilismo.
const pesoDe = (n) => pesoPorHost.get(hostDe(n.enlace)) ?? Math.max(10, ...((n.medios ?? []).map((m) => pesoPorMedio.get(m) ?? 0)));
const puntajeHoy = (n) => Math.min(100, pesoDe(n) + (n.local ? 25 : 0) + Math.min(40, 10 * Math.max(0, (n.medios ?? []).length - 1))
  + (n.teniaImagenLaFuente ? 6 : 0) + (n.seccion === 'Automovilismo' ? 8 : 0) + 25 /* frescura: se asume menos de 3 h */);

// El puntaje propuesto (ver ANALISIS.md, Etapa 5). Acá con aproximaciones por palabras en lugar de los
// campos del modelo (tipo, interés): sirve para comparar el ORDEN, no para producción.
const frescuraMax = 15;
// Los pesos son los de la tabla de ANALISIS.md (Etapa 5): cercanía 25/15/0, servicio 10, medios distintos con
// grupo hasta 20, frescura hasta 15, tipo −10 a +5, interés del modelo hasta 10 (acá, aproximado por el lugar).
function puntajePropuesto(n) {
  const deAca = !!(n.local || n.deLaZona);
  const cercania = n.local ? 25 : n.deLaZona ? 15 : 0;
  const tipo = tipoDe(n);
  const servicio = tipo === 'servicio' ? 10 : 0;
  const m = mediosConGrupo(n);
  const medios = m >= 8 ? 20 : m >= 4 ? 15 : m === 3 ? 5 : 0;
  const tipoNota = tipo === 'agenda' ? -5 : tipo === 'institucional' ? -3 : 5;
  const interes = deAca ? 10 : 3; // sin el campo del modelo: aproximación
  return Math.max(0, Math.min(100, cercania + servicio + medios + frescuraMax + tipoNota + interes));
}

function spearman(xs, ys) {
  const rango = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = Array(v.length); let i = 0;
    while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j += 1; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k += 1) r[o[k][1]] = m; i = j + 1; } return r; };
  const a = rango(xs); const b = rango(ys); const n = xs.length;
  const ma = a.reduce((s, x) => s + x, 0) / n; const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i += 1) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return +(num / Math.sqrt(da * db)).toFixed(3);
}
const conVistasPosibles = deMedios;
const ph = conVistasPosibles.map(puntajeHoy);
const pp = conVistasPosibles.map(puntajePropuesto);
const vv = conVistasPosibles.map((n) => vistas.get(n.id) ?? 0);
const enTopN = (scores, N) => {
  const topVistas = new Set([...conVistasPosibles].sort((a, b) => (vistas.get(b.id) ?? 0) - (vistas.get(a.id) ?? 0)).slice(0, N).map((n) => n.id));
  const topScore = conVistasPosibles.map((n, i) => [n.id, scores[i]]).sort((a, b) => b[1] - a[1]).slice(0, N).map(([id]) => id);
  return topScore.filter((id) => topVistas.has(id)).length;
};
const histo = (vals, paso = 10) => { const h = {}; for (const v of vals) { const k = `${Math.floor(v / paso) * paso}-${Math.floor(v / paso) * paso + paso - 1}`; h[k] = (h[k] ?? 0) + 1; } return Object.fromEntries(Object.entries(h).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))); };
const puntaje = {
  portadaHoy: { notas: portada.notas.length, histograma: histo(portada.notas.map((n) => n.relevancia ?? 0)),
    deAca: histo(portada.notas.filter((n) => n.local).map((n) => n.relevancia ?? 0)),
    deAfuera: histo(portada.notas.filter((n) => !n.local).map((n) => n.relevancia ?? 0)) },
  reconstruido: { notas: conVistasPosibles.length, histograma: histo(ph), spearmanConVistas: spearman(ph, vv), aciertosTop20: enTopN(ph, 20), aciertosTop50: enTopN(ph, 50) },
  propuesto: { histograma: histo(pp), spearmanConVistas: spearman(pp, vv), aciertosTop20: enTopN(pp, 20), aciertosTop50: enTopN(pp, 50) },
  // Dentro de lo de acá: ¿el puntaje de hoy separa lo que se lee de lo que no?
  soloDeAca: (() => {
    const l = conVistasPosibles.filter((n) => n.local || n.deLaZona);
    return { notas: l.length, spearmanHoy: spearman(l.map(puntajeHoy), l.map((n) => vistas.get(n.id) ?? 0)), spearmanPropuesto: spearman(l.map(puntajePropuesto), l.map((n) => vistas.get(n.id) ?? 0)), histogramaHoy: histo(l.map(puntajeHoy)) };
  })(),
};

// ------------------------------------------------------- duplicadas publicadas
// TF-IDF sobre título (doble) + bajada, coseno, pares de notas de medios publicadas a menos de 72 h.
const VACIAS = new Set(sinTildes('de la el en y a los las del que se por con un una para al lo como mas su sus es fue son ser hay este esta estos estas ese esa tras sobre entre desde hasta ante ya no si o u le les nos todo todos otro otra muy sin segun cuando donde hoy ayer manana dia dias ano anos semana tambien pero sino porque durante contra hacia tiene tienen puede pueden ha han sera fueron era esto eso asi luego antes despues nuevo nueva nuevos nuevas gran primera primer ultimo ultima dos tres balcarce local locales').split(' '));
const palabras = (n) => sinTildes(`${n.titulo} ${n.titulo} ${n.copete ?? ''}`).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));
const deMediosTodas = notas.filter((n) => !n.propia && n.fecha);
const df = new Map();
const tfs = deMediosTodas.map((n) => { const tf = new Map(); for (const w of palabras(n)) tf.set(w, (tf.get(w) ?? 0) + 1); for (const w of tf.keys()) df.set(w, (df.get(w) ?? 0) + 1); return tf; });
const N = deMediosTodas.length;
const vec = tfs.map((tf) => { const v = new Map(); let no = 0; for (const [w, c] of tf) { const x = (1 + Math.log(c)) * Math.log((N + 1) / ((df.get(w) ?? 0) + 1)); v.set(w, x); no += x * x; } no = Math.sqrt(no) || 1; for (const [w, x] of v) v.set(w, x / no); return v; });
const t = deMediosTodas.map((n) => new Date(n.fecha).getTime());
const pares = [];
for (let i = 0; i < N; i += 1) {
  for (let j = i + 1; j < N; j += 1) {
    if (Math.abs(t[i] - t[j]) > 72 * 3600e3) continue;
    const [a, b] = vec[i].size < vec[j].size ? [vec[i], vec[j]] : [vec[j], vec[i]];
    let s = 0; for (const [w, x] of a) { const y = b.get(w); if (y) s += x * y; }
    if (s >= 0.35) pares.push({ s: +s.toFixed(3), a: deMediosTodas[i], b: deMediosTodas[j] });
  }
}
pares.sort((x, y) => y.s - x.s);
const parFila = (p) => ({ parecido: p.s, horas: +(Math.abs(new Date(p.a.fecha) - new Date(p.b.fecha)) / 3600e3).toFixed(1),
  idA: p.a.id, seccionA: p.a.seccion, lugarA: lugarDe(p.a), mediosA: (p.a.medios ?? []).join(' + '), tituloA: p.a.titulo,
  idB: p.b.id, seccionB: p.b.seccion, lugarB: lugarDe(p.b), mediosB: (p.b.medios ?? []).join(' + '), tituloB: p.b.titulo,
  mismoMedioPrincipal: hostDe(p.a.enlace) === hostDe(p.b.enlace), otraSeccion: p.a.seccion !== p.b.seccion });
const filasPares = pares.map(parFila);
const fusion = Object.entries(fusionadas).map(([id, f]) => ({ id, a: f.a, cuando: f.cuando, ruta: f.ruta }));
// Etiquetas a mano de los pares 0,45+ (etiquetas-duplicadas.json; las puso Claude leyendo cada par).
let etiquetas = [];
try { etiquetas = JSON.parse(fs.readFileSync(path.join(AQUI, 'etiquetas-duplicadas.json'), 'utf8')).pares; } catch { /* sin etiquetas */ }
const confirmadas = etiquetas.filter((e) => e.mismoHecho === 'si');
const raizDe = new Map();
const raiz = (x) => { if (!raizDe.has(x)) raizDe.set(x, x); while (raizDe.get(x) !== x) x = raizDe.get(x); return x; };
for (const e of confirmadas) raizDe.set(raiz(e.idB), raiz(e.idA));
const idsDup = [...new Set(confirmadas.flatMap((e) => [e.idA, e.idB]))];
const historias = new Set(idsDup.map(raiz)).size;
const esDeAcaId = (id) => { const n = porId.get(id); return !!(n && (n.local || n.deLaZona)); };
const etiquetado = etiquetas.length ? {
  pares: etiquetas.length,
  mismoHecho: confirmadas.length,
  dudosos: etiquetas.filter((e) => e.mismoHecho === 'dudoso').length,
  noSon: etiquetas.filter((e) => e.mismoHecho === 'no').length,
  notasEnParesConfirmados: idsDup.length,
  historiasDetras: historias,
  copiasDeMas: idsDup.length - historias,
  copiasDeMasDeAca: idsDup.filter(esDeAcaId).length - new Set(idsDup.filter(esDeAcaId).map(raiz)).size,
  paresConfirmadosEnOtraSeccion: confirmadas.filter((e) => porId.get(e.idA)?.seccion !== porId.get(e.idB)?.seccion).length,
  paresConfirmadosAMasDe12Horas: confirmadas.filter((e) => Math.abs(new Date(porId.get(e.idA)?.fecha) - new Date(porId.get(e.idB)?.fecha)) > 12 * 3600e3).length,
  precisionPorBanda: ['0.7', '0.55', '0.45'].map((b, i, arr) => {
    const hastaB = i === 0 ? 2 : +arr[i - 1];
    const enBanda = etiquetas.filter((e) => e.parecido >= +b && e.parecido < hastaB);
    return { banda: `${b} a ${hastaB === 2 ? '1' : hastaB}`, pares: enBanda.length, si: enBanda.filter((e) => e.mismoHecho === 'si').length, dudosos: enBanda.filter((e) => e.mismoHecho === 'dudoso').length };
  }),
} : null;

const duplicadas = {
  notasComparadas: N,
  etiquetado,
  paresConParecido: { '0,35+': pares.length, '0,45+': pares.filter((p) => p.s >= 0.45).length, '0,55+': pares.filter((p) => p.s >= 0.55).length, '0,70+': pares.filter((p) => p.s >= 0.7).length },
  paresDeAcaConDeAca045: pares.filter((p) => p.s >= 0.45 && (p.a.local || p.a.deLaZona) && (p.b.local || p.b.deLaZona)).length,
  paresEnOtraSeccion045: pares.filter((p) => p.s >= 0.45 && p.a.seccion !== p.b.seccion).length,
  unidasDespuesDePublicadas: fusion.length,
  unidasPorDia: fusion.reduce((o, f) => { const d = String(f.cuando).slice(0, 10); o[d] = (o[d] ?? 0) + 1; return o; }, {}),
};

// ----------------------------------------------------- clasificación
const deAcaPublicadas = notas.filter((n) => !n.propia && (n.local || n.deLaZona));
const fueraDeBalcarce = deAcaPublicadas.filter((n) => n.seccion !== 'Balcarce');
const conFicha = notas.filter((n) => fichas[n.id]);
const fichaDistinta = conFicha.filter((n) => {
  const s = { Servicios: 'Balcarce', País: 'Argentina' }[fichas[n.id].seccion] ?? fichas[n.id].seccion;
  return s !== n.seccion;
});
const cuenta = (lista, f) => lista.reduce((o, x) => { const k = f(x); o[k] = (o[k] ?? 0) + 1; return o; }, {});
const todasLasFichas = Object.values(fichas);
const idsPublicados = new Set(notas.map((n) => n.id));
const fichasPublicadas = Object.entries(fichas).filter(([id]) => idsPublicados.has(id)).map(([, f]) => f);
const fichasNoPublicadas = Object.entries(fichas).filter(([id]) => !idsPublicados.has(id)).map(([, f]) => f);
const correccionesDeSeccion = Object.entries(correcciones).filter(([, v]) => v?.seccion)
  .map(([id, v]) => ({ id, seccion: v.seccion, cuando: v.cuando, motivo: String(v.motivo ?? '').slice(0, 140), titulo: porId.get(id)?.titulo ?? v.titulo ?? '' }));
const argentinaUltimas = notas.filter((n) => n.seccion === 'Argentina' && !n.propia).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 40)
  .map((n) => ({ id: n.id, medios: (n.medios ?? []).length, titulo: n.titulo }));
const clasificacion = {
  notasDeMedios: notas.filter((n) => !n.propia).length,
  deAca: deAcaPublicadas.length,
  deAcaFueraDeLaSeccionBalcarce: fueraDeBalcarce.length,
  deAcaPorSeccion: cuenta(deAcaPublicadas, (n) => n.seccion),
  deLaZona: notas.filter((n) => n.deLaZona).length,
  correccionesDeSeccionAMano: correccionesDeSeccion.length,
  correccionesDeSeccionPorDia: cuenta(correccionesDeSeccion, (c) => String(c.cuando).slice(0, 10)),
  publicadasConFicha: conFicha.length,
  fichaDiceOtraSeccion: fichaDistinta.length,
  fichaDiceOtraSeccionEjemplos: fichaDistinta.slice(0, 25).map((n) => ({ id: n.id, ficha: fichas[n.id].seccion, publicada: n.seccion, local: !!n.local, titulo: n.titulo })),
  fichas: {
    total: todasLasFichas.length,
    publicadas: fichasPublicadas.length,
    noPublicadas: fichasNoPublicadas.length,
    ambito: cuenta(todasLasFichas, (f) => f.ambito),
    impacto: cuenta(todasLasFichas, (f) => f.impacto),
    importancia: cuenta(todasLasFichas, (f) => f.importancia),
    razon: cuenta(todasLasFichas, (f) => f.razon),
    publicidad: todasLasFichas.filter((f) => f.publicidad).length,
    chimento: todasLasFichas.filter((f) => f.chimento).length,
    impactoDeLasPublicadas: cuenta(fichasPublicadas, (f) => f.impacto),
    importanciaDeLasPublicadas: cuenta(fichasPublicadas, (f) => f.importancia),
    seccionDeLasFichas: cuenta(todasLasFichas, (f) => f.seccion),
  },
  argentinaUltimas,
};

// ------------------------------------------------ ruido que llegó a publicarse (aproximación)
const RUIDO = [
  ['en vivo', RE('\\b(en vivo|minuto a minuto)\\b')],
  ['cotización', RE('\\b(dolar (hoy|blue|oficial|mep)|cotiza|cotizacion|riesgo pais hoy)')],
  ['pronóstico de otro medio', RE('\\b(pronostico|clima (para|en) (el|este|hoy)|como estara el tiempo|el tiempo (para|en))')],
  ['consejo o curiosidad', RE('\\b(como (hacer|limpiar|cuidar|preparar|elegir|ahorrar)|trucos?\\b|consejos?\\b|que significa|la ciencia explica|segun la (ia|inteligencia artificial)|receta|el secreto|por que (los|las|el|la) )')],
  ['farándula', RE('\\b(romance|separacion|ex pareja|su novi[oa]|casamiento|embarazad|gran hermano|reality|mirtha|wanda|tinelli)')],
  ['opinión o análisis', RE('\\b(opinion|columna|editorial|analisis:|por que .* importa)')],
  ['promoción', RE('\\b(sorteo|sortea|gana tu|descuento|promo\\b|promocion|cuotas sin interes|hot sale|cyber monday|black friday)')],
  ['videojuego o tecnología de consumo', RE('\\b(videojuego|playstation|xbox|nintendo|iphone|android|whatsapp (suma|agrega|lanza))')],
];
const ruido = [];
for (const n of notas) {
  if (n.propia) continue;
  const t = sinTildes(n.titulo);
  for (const [tipo, re] of RUIDO) if (re.test(t)) { ruido.push({ tipo, id: n.id, seccion: n.seccion, lugar: lugarDe(n), medios: (n.medios ?? []).length, como: n.como, vistas: vistas.get(n.id) ?? 0, titulo: n.titulo }); break; }
}

// Ruido revisado a mano: lo que encontró la búsqueda de arriba más lo que listó 03-PLAN-DE-MEJORA (11/10),
// leído uno por uno (etiqueta de Claude). Se informa cuáles siguen en el archivo y cuánto se leyeron.
const RUIDO_A_MANO = {
  levilm: 'cotización', n5lm6f: 'cotización', '1qyg9eg': 'cotización', '1e8rdd4': 'cotización',
  q7bxgi: 'publicidad', '1saujqk': 'publicidad',
  r7245w: 'chimento', u1zabu: 'chimento', uknghh: 'chimento', '18ck224': 'chimento',
  '1cv9j22': 'curiosidad', '55gw7p': 'curiosidad', '5exxou': 'curiosidad', '1ijfhpo': 'curiosidad', tqz98z: 'curiosidad', qxi2f0: 'curiosidad',
  '1q4j7p': 'consejo', qsc6ig: 'consejo',
  fa17ki: 'pronóstico de otro medio', i06m20: 'pronóstico de otro medio', vqv317: 'pronóstico de otro medio',
};
const ruidoAMano = Object.entries(RUIDO_A_MANO).map(([id, tipo]) => {
  const n = porId.get(id);
  return { id, tipo, enElArchivo: !!n, seccion: n?.seccion, lugar: n ? lugarDe(n) : null, medios: (n?.medios ?? []).length, fecha: n?.fecha?.slice(0, 10), vistas: vistas.get(id) ?? 0, titulo: n?.titulo ?? '' };
});

// ------------------------------------------------------------- volumen
const volumen = {
  porDia: Object.values(porDia).map((d) => ({ dia: d.dia, publicadas: d.publicadas, deBalcarce: d.deBalcarce, deAfuera: d.deAfuera, porPersona: d.porPersona, propias: d.propias, esperandoPersona: d.esperandoPersona })),
};
{
  const ds = volumen.porDia;
  const prom = (k) => +(ds.reduce((s, d) => s + (d[k] ?? 0), 0) / ds.length).toFixed(1);
  volumen.promedio = { publicadas: prom('publicadas'), deBalcarce: prom('deBalcarce'), deAfuera: prom('deAfuera'), porPersona: prom('porPersona'), esperandoPersona: prom('esperandoPersona') };
}

// ------------------------------------------------------------- salida
// Pesos tirados de las lecturas: 20 × ln(vistas por nota del grupo / vistas por nota de la base).
// Es la "distancia en lecturas" de cada rasgo, en puntos. Sirve de punto de partida, no de verdad.
const vpn = (lista, nombre) => lista.find((o) => o.grupo === nombre)?.vistasPorNota ?? null;
const puntos = (a, b) => (a != null && b ? Math.round(20 * Math.log(Math.max(a, 0.01) / b)) : null);
const baseAfuera = vpn(lecturas.porLugar, 'de afuera');
const baseAca = vpn(lecturas.porLugar, 'Balcarce');
const afuera23 = (() => { const l = lecturas.porMediosDeAfuera.filter((o) => o.grupo === '2' || o.grupo === '3'); const n = l.reduce((s, o) => s + o.notas, 0); return n ? l.reduce((s, o) => s + o.vistas, 0) / n : null; })();
const afuera4 = (() => { const l = lecturas.porMediosDeAfuera.filter((o) => o.grupo === '4 a 7' || o.grupo === '8 o más'); const n = l.reduce((s, o) => s + o.notas, 0); return n ? l.reduce((s, o) => s + o.vistas, 0) / n : null; })();
const pesosDeLasLecturas = {
  explicacion: '20 × ln(vistas por nota del grupo ÷ vistas por nota de la base). +14 puntos = el doble de lecturas.',
  balcarceContraAfuera: puntos(baseAca, baseAfuera),
  zonaContraAfuera: puntos(vpn(lecturas.porLugar, 'la zona'), baseAfuera),
  deAca_servicioContraPromedio: puntos(vpn(lecturas.porTipoDeAca, 'servicio'), baseAca),
  deAca_resultadoDeportivoContraPromedio: puntos(vpn(lecturas.porTipoDeAca, 'resultado deportivo'), baseAca),
  deAca_institucionalContraPromedio: puntos(vpn(lecturas.porTipoDeAca, 'institucional'), baseAca),
  deAca_agendaContraPromedio: puntos(vpn(lecturas.porTipoDeAca, 'agenda'), baseAca),
  afuera_4oMasMediosContra2o3: puntos(afuera4, afuera23),
};

const medidas = { generado: new Date().toISOString(), lecturas, pesosDeLasLecturas, puntaje, duplicadas, clasificacion, ruido: { total: ruido.length, porTipo: cuenta(ruido, (r) => r.tipo), aMano: ruidoAMano }, volumen };
fs.writeFileSync(path.join(AQUI, 'medidas.json'), JSON.stringify(medidas, null, 1));
const csv = (filas) => { if (!filas.length) return ''; const k = Object.keys(filas[0]); const esc = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; return `﻿${k.join(',')}\n${filas.map((f) => k.map((c) => esc(f[c])).join(',')).join('\n')}\n`; };
const filasLect = [];
for (const [nombre, lista] of Object.entries(lecturas)) if (Array.isArray(lista) && lista[0]?.vistasPorNota !== undefined) for (const o of lista) filasLect.push({ corte: nombre, ...o });
fs.writeFileSync(path.join(AQUI, 'lecturas-por-grupo.csv'), csv(filasLect));
fs.writeFileSync(path.join(AQUI, 'duplicadas-publicadas.csv'), csv(filasPares.filter((p) => p.parecido >= 0.45)));
fs.writeFileSync(path.join(AQUI, 'ruido-publicado.csv'), csv(ruido));

// En pantalla, lo principal.
console.log(JSON.stringify({
  ventana: lecturas.ventana, concentracion: lecturas.concentracion, porLugar: lecturas.porLugar,
  porTipoDeAca: lecturas.porTipoDeAca, porTipoDeAfuera: lecturas.porTipoDeAfuera, porMediosDeAfuera: lecturas.porMediosDeAfuera,
  porSeccion: lecturas.porSeccion, porPropia: lecturas.porPropia, porFoto: lecturas.porFoto, porComo: lecturas.porComo,
  porRedes: lecturas.porRedes, porMediosDeAca: lecturas.porMediosDeAca,
  paginas: lecturas.paginasMasVistas, referentes: lecturas.referentes, pesosDeLasLecturas,
  puntaje, duplicadas, ruido: { ...medidas.ruido, aMano: undefined }, ruidoAMano, volumen: volumen.promedio,
}, null, 1));
console.log('\nMÁS LEÍDAS'); for (const m of lecturas.masLeidas) console.log(`  ${m.vistas} · ${m.id} · ${m.lugar} · ${m.seccion} · ${m.medios} medios · ${m.tipo} · ${m.titulo}`);
console.log('\nPARES MÁS PARECIDOS (0,45+)'); for (const p of filasPares.filter((x) => x.parecido >= 0.45).slice(0, 60)) console.log(`  ${p.parecido} · ${p.horas} h · ${p.idA} [${p.seccionA}/${p.lugarA}] ${p.tituloA}\n         ${p.idB} [${p.seccionB}/${p.lugarB}] ${p.tituloB}`);
console.log('\nCLASIFICACIÓN', JSON.stringify({ ...clasificacion, argentinaUltimas: undefined, fichaDiceOtraSeccionEjemplos: undefined }, null, 1));
console.log('\nFICHA DISTINTA'); for (const e of clasificacion.fichaDiceOtraSeccionEjemplos) console.log(`  ${e.id} ficha=${e.ficha} publicada=${e.publicada} ${e.local ? 'local' : ''} · ${e.titulo}`);
console.log('\nARGENTINA (últimas)'); for (const e of argentinaUltimas) console.log(`  ${e.id} · ${e.medios} · ${e.titulo}`);
console.log('\nRUIDO'); for (const r of ruido) console.log(`  ${r.tipo} · ${r.id} · ${r.seccion} · ${r.lugar} · ${r.medios} medios · ${r.como} · ${r.vistas} vistas · ${r.titulo}`);
