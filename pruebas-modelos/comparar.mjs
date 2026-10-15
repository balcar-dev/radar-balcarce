// Cruza los resultados de cada modelo con lo que decidió el sistema actual.
//   node pruebas-modelos/comparar.mjs            (muestra chica: contra la decisión del sistema)
//   node pruebas-modelos/comparar.mjs --muestra=muestra-200.json --referencia=google/gemini-3.1-flash-lite
//   opciones: --modelos=a,b  --dia=900 (notas por día para el costo)
// Escribe la tabla en pantalla y en comparacion*.md. No necesita la clave.

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const NOTAS_POR_DIA = Number(args.dia ?? 900);
const NOTAS_POR_PEDIDO = 12; // como la lectura de producción (LECTURA.notasPorPedido)

// --muestra=muestra-200.json compara contra un modelo de referencia (--referencia=...), porque esas notas no tienen decisión del sistema.
const ARCHIVO_MUESTRA = args.muestra ?? 'muestra.json';
const muestra = JSON.parse(fs.readFileSync(path.join(AQUI, ARCHIVO_MUESTRA), 'utf8'));
const porId = new Map([...muestra.notas, ...(muestra.notasSoloParaPares ?? [])].map((n) => [n.id, n]));
muestra.pares ??= [];
const conSistema = muestra.notas.some((n) => n.sistema);

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}% (${a}/${b})` : 'n/d');
const prom = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const dolares = (x) => (x == null ? 's/d' : x === 0 ? 'US$ 0 (gratis)' : `US$ ${x < 1 ? x.toFixed(2) : x.toFixed(0)}`);

const MODO_PARES = !!args.pares; // --pares=pares-200.json: compara la detección de duplicadas contra las etiquetas
const todos = fs.readdirSync(AQUI).filter((f) => /^resultados-.*\.json$/.test(f))
  .map((f) => ({ f, res: JSON.parse(fs.readFileSync(path.join(AQUI, f), 'utf8')) }))
  .filter(({ res }) => (res.muestra ?? 'muestra.json') === ARCHIVO_MUESTRA)
  .filter(({ res }) => (MODO_PARES ? res.soloPares && res.paresArchivo === args.pares : !res.soloPares))
  .filter(({ res }) => !args.modelos || args.modelos.split(',').includes(res.modelo));
if (!todos.length) { console.error(`No hay resultados para ${ARCHIVO_MUESTRA}: corré primero probar.mjs`); process.exit(1); }
const etiqueta = (res) => `${res.modelo}${res.lote > 1 ? ` [${res.lote} por pedido]` : ''}`;

// ------------------------------------------------ duplicadas: ¿dos notas cuentan el mismo hecho?
function compararPares() {
  const etiquetas = JSON.parse(fs.readFileSync(path.join(AQUI, args.pares), 'utf8')).pares;
  const titulo = (id) => (porId.get(id)?.titulo ?? id).slice(0, 62).replace(/\|/g, '/');
  const L = [`# Duplicadas: ¿dos notas cuentan el mismo hecho? (${etiquetas.length} pares)\n`];
  const mismo = etiquetas.filter((p) => p.mismo).length;
  L.push(`${mismo} pares son del mismo hecho y ${etiquetas.length - mismo} no (la etiqueta la puso Claude leyendo las notas; ${etiquetas.filter((p) => p.dudoso).length} son dudosos). **Error grave** = juntar dos hechos distintos (se pierde una noticia). **Error leve** = no ver una duplicada (sale repetida).\n`);
  L.push('| Modelo | Aciertos | Junta de más (grave) | No ve la duplicada (leve) | Grupo de 5 (Fiesta del Postre) | Seg./par | Costo por 1.000 pares |');
  L.push('|---|---|---|---|---|---|---|');
  const detalle = [];
  for (const { res } of todos) {
    let ok = 0; let graves = 0; let leves = 0; let n = 0; let grupoOk = 0; let grupoN = 0; const errores = [];
    for (const p of etiquetas) {
      const r = res.pares[p.clave];
      if (!r || r.mismo === null || r.error) { errores.push({ p, que: 'sin respuesta' }); continue; }
      n += 1;
      if (r.mismo === p.mismo) ok += 1;
      else if (r.mismo && !p.mismo) { graves += 1; errores.push({ p, que: 'GRAVE: junta hechos distintos', noul: r.noul }); } else { leves += 1; errores.push({ p, que: 'leve: no vio la duplicada', noul: r.noul }); }
      if (p.grupo) { grupoN += 1; if (r.mismo) grupoOk += 1; }
    }
    const usos = etiquetas.map((p) => res.pares[p.clave]?.uso).filter((u) => u?.entrada != null);
    const entrada = prom(usos.map((u) => u.entrada)); const salida = prom(usos.map((u) => u.salida ?? 0));
    const reales = usos.filter((u) => u.costo != null).map((u) => u.costo);
    const costo1000 = res.precios && entrada != null ? 1000 * (entrada * res.precios.entrada + salida * res.precios.salida) : reales.length ? 1000 * prom(reales) : null;
    const seg = prom(etiquetas.map((p) => res.pares[p.clave]?.ms).filter(Boolean)) / 1000;
    L.push(`| ${etiqueta(res)} | ${pct(ok, n)} | ${graves} | ${leves} | ${grupoN ? `${grupoOk}/${grupoN} pares unidos` : 'n/d'} | ${Number.isFinite(seg) ? seg.toFixed(2) : 's/d'} | ${costo1000 == null ? 's/d' : costo1000 === 0 ? 'US$ 0' : `US$ ${costo1000.toFixed(3)}`} |`);
    detalle.push({ res, errores });
  }
  for (const { res, errores } of detalle) {
    if (!errores.length) continue;
    L.push(`\n## ${etiqueta(res)}: ${errores.length} errores\n`);
    L.push('| Error | Nota A | Nota B | Dudoso |');
    L.push('|---|---|---|---|');
    for (const e of errores) L.push(`| ${e.que} | ${titulo(e.p.a)} | ${titulo(e.p.b)} | ${e.p.dudoso ? 'sí' : ''} |`);
  }
  return `${L.join('\n')}\n`;
}
if (MODO_PARES) {
  const texto = compararPares();
  fs.writeFileSync(path.join(AQUI, 'comparacion-pares.md'), texto);
  console.log(texto);
  process.exit(0);
}

function evaluar(res) {
  const graves = [];
  const aRevisar = [];
  const discrepancias = [];
  let secOk = 0; let secN = 0; let pubOk = 0; let pubN = 0; let intOk = 0; let intN = 0;
  const tiempos = []; const entradas = []; const salidas = []; const costos = []; const variables = [];

  for (const nota of muestra.notas) {
    const r = res.notas[nota.id];
    if (!r) continue;
    const x = r.respuesta;
    if (r.ms) tiempos.push(r.ms);
    if (r.uso?.entrada != null) {
      entradas.push(r.uso.entrada); salidas.push(r.uso.salida ?? 0);
      if (r.uso.costo != null) costos.push(r.uso.costo);
      variables.push(r.caracteresDeNota / (r.caracteresDeNota + res.caracteresFijos));
    }
    const sis = nota.sistema;
    const dice = (ok, sisTxt, modTxt) => discrepancias.push({
      id: nota.id, titulo: nota.titulo, que: ok, sistema: sisTxt, modelo: modTxt,
      porque: `modelo: ${x?.razon || (r.error ? `error ${r.status}` : 'sin razón')} | sistema: ${sis.motivo ?? 'sin ficha'}`,
    });

    pubN += 1;
    if (!x || x.publicar === null) { aRevisar.push(`${nota.id}: respuesta sin "publicar" (${r.error ? `error ${r.status}` : 'ilegible'})`); dice('publicar', sis.publicada ? 'sí' : 'no', 'sin respuesta'); continue; }
    if (x.publicar === sis.publicada) pubOk += 1;
    else {
      dice('publicar', sis.publicada ? 'sí' : 'no', x.publicar ? 'sí' : 'no');
      if (!sis.publicada && x.publicar) graves.push(`GRAVE · publicó lo que no debía (${sis.motivo?.split(':')[0]}): "${nota.titulo}"`);
      else if (nota.grupo === 'balcarce') graves.push(`GRAVE · descartó una nota de Balcarce: "${nota.titulo}"`);
      else if (nota.grupo === 'zona') aRevisar.push(`descartó una nota de la zona: "${nota.titulo}"`);
    }
    if (sis.seccion) {
      secN += 1;
      if (x.seccion === sis.seccion) secOk += 1;
      else {
        dice('sección', sis.seccion, x.seccion ?? 'inválida');
        if (nota.grupo === 'balcarce' && x.seccion === 'Argentina') aRevisar.push(`mandó a Argentina una nota de Balcarce: "${nota.titulo}"`);
      }
    }
    if (sis.interes) {
      intN += 1;
      if (x.interes === sis.interes) intOk += 1;
    }
  }

  let dupOk = 0; let dupN = 0;
  for (const p of muestra.pares) {
    const r = res.pares[p.clave];
    if (!r) continue;
    dupN += 1;
    if (r.mismo === p.mismo_sistema) dupOk += 1;
    else {
      const t = `${porId.get(p.a).titulo} / ${porId.get(p.b).titulo}`;
      discrepancias.push({ id: p.clave, titulo: t, que: 'duplicadas', sistema: p.mismo_sistema ? 'mismo hecho' : 'hechos distintos', modelo: r.mismo === null ? 'sin respuesta' : r.mismo ? 'mismo hecho' : 'hechos distintos', porque: `modelo: ${r.razon || '—'}` });
      if (!p.mismo_sistema && r.mismo === true) graves.push(`GRAVE · juntó dos hechos distintos (se perdería una nota): ${t}`);
      else if (p.mismo_sistema && r.mismo === false) aRevisar.push(`no vio la duplicada (saldría repetida): ${t}`);
    }
    if (r.ms) tiempos.push(r.ms);
    if (r.uso?.entrada != null) { entradas.push(r.uso.entrada); salidas.push(r.uso.salida ?? 0); if (r.uso.costo != null) costos.push(r.uso.costo); }
  }

  // Costo mensual: con las notas mandadas de a 12 (lo fijo se reparte), a precio de lista; si no hay precio, con el costo real informado.
  const entradaMedia = prom(entradas); const salidaMedia = prom(salidas); const fraccionNota = prom(variables) ?? 0;
  let costoMes = null;
  if (entradaMedia != null) {
    const entradaPorNota = entradaMedia * fraccionNota + (entradaMedia * (1 - fraccionNota)) / NOTAS_POR_PEDIDO;
    if (res.precios) costoMes = NOTAS_POR_DIA * 30 * (entradaPorNota * res.precios.entrada + salidaMedia * res.precios.salida);
    else if (costos.length) costoMes = NOTAS_POR_DIA * 30 * prom(costos) * (entradaPorNota / entradaMedia);
    res.entradaPorNotaEnLote = Math.round(entradaPorNota);
  }
  return {
    modelo: res.modelo, modo: res.modo,
    seccion: pct(secOk, secN), publicar: pct(pubOk, pubN), duplicadas: pct(dupOk, dupN), interes: pct(intOk, intN),
    pubPct: pubN ? pubOk / pubN : 0, secPct: secN ? secOk / secN : 0,
    segundosPorNota: tiempos.length ? prom(tiempos) / 1000 : null,
    tokensEntrada: entradaMedia, tokensEntradaLote: res.entradaPorNotaEnLote, tokensSalida: salidaMedia,
    costoMes, graves, aRevisar, discrepancias,
    sinRespuesta: muestra.notas.filter((n) => !res.notas[n.id]?.respuesta?.valida).length,
  };
}

function sugerencia(e) {
  if (e.graves.length) return `No: ${e.graves.length} error(es) grave(s)`;
  if (e.pubPct >= 0.9 && e.secPct >= 0.75) return 'Candidato (revisar discrepancias)';
  return 'A revisar: acuerdo bajo';
}

// ------------------------------------------------ modo "contra referencia" (muestra sin decisión del sistema)

/** Costo mensual y tokens, igual que en evaluar(), para los resultados de una muestra sin sistema. */
function costos(res) {
  const rs = muestra.notas.map((n) => res.notas[n.id]).filter((r) => r?.uso?.entrada != null);
  if (!rs.length) return { entrada: null, lote: null, salida: null, mes: null, seg: null };
  const entrada = prom(rs.map((r) => r.uso.entrada)); const salida = prom(rs.map((r) => r.uso.salida ?? 0));
  const frac = prom(rs.map((r) => r.caracteresDeNota / (r.caracteresDeNota + res.caracteresFijos)));
  const lote = entrada * frac + (entrada * (1 - frac)) / NOTAS_POR_PEDIDO;
  const reales = rs.filter((r) => r.uso.costo != null).map((r) => r.uso.costo);
  const mes = res.precios ? NOTAS_POR_DIA * 30 * (lote * res.precios.entrada + salida * res.precios.salida)
    : reales.length ? NOTAS_POR_DIA * 30 * prom(reales) * (lote / entrada) : null;
  return { entrada, lote: Math.round(lote), salida, mes, seg: prom(muestra.notas.map((n) => res.notas[n.id]?.ms).filter(Boolean)) / 1000 };
}

function contraReferencia() {
  const ref = todos.find(({ res }) => res.modelo === args.referencia)?.res;
  if (!ref) { console.error(`Falta el resultado de la referencia (--referencia=${args.referencia ?? '…'}). Corré probar.mjs con ese modelo.`); process.exit(1); }
  const L = [`# Comparación contra ${ref.modelo} (muestra de ${muestra.notas.length} notas crudas)\n`];
  L.push(`La referencia es lo que hoy usa el sistema (Gemini Flash-Lite). "Acuerdo" no dice quién tiene razón: las discrepancias se revisan a mano abajo. Costo mensual con ${NOTAS_POR_DIA} notas por día, ${NOTAS_POR_PEDIDO} por pedido.\n`);
  L.push('| Modelo | Acuerdo sección | Acuerdo publicar | Acuerdo interés | Ruido que dejó pasar | Sin respuesta | Seg./nota | Tokens/nota (lote de 12) | Costo por mes |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  const detalle = [];
  for (const { res } of todos) {
    let sec = 0; let pub = 0; let int = 0; let n = 0; let ruidoPasa = 0; let ruidoN = 0; let sinResp = 0;
    const dif = [];
    for (const nota of muestra.notas) {
      const a = res.notas[nota.id]?.respuesta; const b = ref.notas[nota.id]?.respuesta;
      if (!a?.valida) { sinResp += 1; continue; }
      if (nota.aporta && a.publicar) ruidoPasa += 1;
      if (nota.aporta) ruidoN += 1;
      if (!b?.valida || res === ref) continue;
      n += 1;
      if (a.seccion === b.seccion) sec += 1;
      if (a.publicar === b.publicar) pub += 1; else dif.push({ nota, a, b, que: 'publicar' });
      if (a.interes === b.interes) int += 1;
      if (a.seccion !== b.seccion && a.publicar === b.publicar) dif.push({ nota, a, b, que: 'sección' });
    }
    const c = costos(res);
    const esRef = res === ref;
    L.push(`| ${etiqueta(res)}${esRef ? ' (referencia)' : ''} | ${esRef ? '—' : pct(sec, n)} | ${esRef ? '—' : pct(pub, n)} | ${esRef ? '—' : pct(int, n)} | ${ruidoN ? `${ruidoPasa}/${ruidoN}` : 'n/d'} | ${sinResp} | ${c.seg == null ? 's/d' : c.seg.toFixed(1)} | ${c.entrada == null ? 's/d' : `${Math.round(c.entrada)} (${c.lote})`} | ${dolares(c.mes)} |`);
    if (!esRef) detalle.push({ res, dif });
  }
  L.push('\n**Ruido que dejó pasar**: de las notas que se garantizaron por ser de lo que no debería salir (horóscopo, loterías, chimentos, policiales de afuera, extranjero), cuántas el modelo mandó a publicar. Puede haber falsos avisos (por ejemplo, un extranjero con conexión argentina): hay que mirarlas.\n');
  for (const { res, dif } of detalle) {
    L.push(`\n## ${etiqueta(res)}: ${dif.length} discrepancias con ${ref.modelo}\n`);
    L.push('| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |');
    L.push('|---|---|---|---|---|');
    for (const d of dif) {
      const t = (x) => `${x.seccion}/${x.interes}/${x.publicar ? 'publica' : 'no publica'}`;
      L.push(`| ${d.que} | ${d.nota.titulo.slice(0, 80).replace(/\|/g, '/')} (${d.nota.medio}) | ${t(d.b)} | ${t(d.a)} | ${(d.a.razon || '—').slice(0, 160).replace(/\|/g, '/')} |`);
    }
  }
  return `${L.join('\n')}\n`;
}

if (!conSistema) {
  const texto = contraReferencia();
  fs.writeFileSync(path.join(AQUI, `comparacion-${ARCHIVO_MUESTRA.replace(/^muestra-?|\.json$/g, '') || 'chica'}.md`), texto);
  console.log(texto);
  process.exit(0);
}

const evaluaciones = todos.map(({ res }) => evaluar(res));

const L = [];
L.push(`# Comparación de modelos para seleccionar notas\n`);
L.push(`Muestra: ${muestra.notas.length} notas reales y ${muestra.pares.length} pares. Costo mensual estimado con ${NOTAS_POR_DIA} notas por día, mandando ${NOTAS_POR_PEDIDO} notas por pedido (como la lectura actual).\n`);
L.push('| Modelo | Acuerdo sección | Acuerdo publicar | Acuerdo duplicadas | Errores graves | Seg./nota | Tokens entrada/nota (en lote de 12) | Costo por mes | Sugerencia |');
L.push('|---|---|---|---|---|---|---|---|---|');
for (const e of evaluaciones) {
  L.push(`| ${e.modelo} | ${e.seccion} | ${e.publicar} | ${e.duplicadas} | ${e.graves.length} | ${e.segundosPorNota == null ? 's/d' : e.segundosPorNota.toFixed(1)} | ${e.tokensEntrada == null ? 's/d' : `${Math.round(e.tokensEntrada)} (${e.tokensEntradaLote})`} | ${dolares(e.costoMes)} | ${sugerencia(e)} |`);
}
L.push('\n**Errores graves** son: (1) publicar algo que no debía salir, (2) descartar una nota de Balcarce, (3) juntar dos hechos distintos como si fueran el mismo (se pierde una noticia).\n');
for (const e of evaluaciones) {
  L.push(`\n## ${e.modelo}\n`);
  if (e.sinRespuesta) L.push(`- ${e.sinRespuesta} nota(s) sin respuesta válida.`);
  L.push(`- Interés para Balcarce (donde el sistema tiene ficha): ${e.interes}.`);
  for (const g of e.graves) L.push(`- ${g}`);
  for (const a of e.aRevisar) L.push(`- A revisar: ${a}`);
  if (!e.graves.length) L.push('- Sin errores graves.');
  if (e.discrepancias.length) {
    L.push('\nDiscrepancias con el sistema actual:\n');
    L.push('| Qué | Nota | Sistema | Modelo | Por qué |');
    L.push('|---|---|---|---|---|');
    for (const d of e.discrepancias) L.push(`| ${d.que} | ${d.titulo.slice(0, 70).replace(/\|/g, '/')} | ${d.sistema} | ${d.modelo} | ${d.porque.slice(0, 220).replace(/\|/g, '/')} |`);
  }
}
const texto = `${L.join('\n')}\n`;
fs.writeFileSync(path.join(AQUI, 'comparacion.md'), texto);
console.log(texto);
