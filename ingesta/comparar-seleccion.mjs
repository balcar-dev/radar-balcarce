// Compara la selección de HOY con la NUEVA (ingesta/seleccion-nueva.mjs, modo sombra) sobre datos reales,
// y escribe docs/flujo/FLUJO-NUEVO-SIMULACION.html. No gasta IA, no cambia nada de producción.
//
//   node ingesta/comparar-seleccion.mjs                         corre la ingesta ahora (lee los feeds, sin IA)
//   node ingesta/comparar-seleccion.mjs --ingesta=archivo.json  usa una corrida guardada ({ notas: [...] })
//   node ingesta/comparar-seleccion.mjs --ref=origin/main       lee web/data/ de esa rama (git show) en vez del disco
//   node ingesta/comparar-seleccion.mjs --salida=otra.html
//
// Cómo simula: cada historia de la corrida se decide en el momento en que "califica" (lo de acá, cuando
// apareció; lo de afuera, cuando la contó el medio que completa los que pide su sección), de media hora en
// media hora y en orden, con el tope de 150 en 24 horas corridas. Lo de hoy se toma de dos lados: lo que
// el flujo de hoy decide sobre la MISMA corrida (fichas + medios + cupos) y lo que de verdad se publicó
// (web/data/archivo.json). La corrida guarda unas 36 horas de lo de afuera y 72 de lo de acá: los días
// completos son los de ayer y anteayer.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  seleccionNueva, SELECCION_NUEVA, frenoRojo, decidir, mediosQuePide, claseDe, seccionDe, elegirParaRepaso, elegirParaFacebook,
} from './seleccion-nueva.mjs';
import { contarMedios, exigirMedios, aplicarCupos, semaforoDelTexto, TODAS_LAS_FUENTES } from './ingesta.mjs';
import { aplicarFichas, quitarRepetidas } from './lectura-ia.mjs';
import { REGLAS_SEMAFORO } from './fuentes.mjs';
import { textoDeLaHistoria } from './seleccion-nueva.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;
const REF = arg('ref');
const SALIDA = arg('salida') ?? path.join(RAIZ, 'docs', 'flujo', 'FLUJO-NUEVO-SIMULACION.html');

function leerDatos(ruta, porDefecto) {
  try {
    if (REF) return JSON.parse(execFileSync('git', ['show', `${REF}:${ruta}`], { cwd: RAIZ, maxBuffer: 1 << 28 }).toString('utf8'));
    return JSON.parse(fs.readFileSync(path.join(RAIZ, ruta), 'utf8'));
  } catch { return porDefecto; }
}

const portada = leerDatos('web/data/portada.json', { notas: [] });
const archivo = leerDatos('web/data/archivo.json', { notas: [] });
const fichasArchivo = leerDatos('web/data/fichas.json', { fichas: {} });
const vistas = leerDatos('web/data/vistas.json', {});
const fusionadas = leerDatos('web/data/fusionadas.json', { notas: {} });
const intentosIA = leerDatos('web/data/intentos-ia.json', {});
const fichas = fichasArchivo.fichas ?? {};

// ------------------------------------------------------------------ la corrida
let corrida;
const rutaIngesta = arg('ingesta');
if (rutaIngesta) {
  corrida = JSON.parse(fs.readFileSync(path.resolve(rutaIngesta), 'utf8'));
} else {
  const { ingestar, MEMORIA_DEL_CRUCE } = await import('./ingesta.mjs');
  const memoria = path.join(os.tmpdir(), `cruce-memoria-sombra-${process.pid}.json`);
  if (fs.existsSync(MEMORIA_DEL_CRUCE)) fs.copyFileSync(MEMORIA_DEL_CRUCE, memoria);
  const idsConocidos = new Set([...(portada.notas ?? []), ...(archivo.notas ?? [])].map((n) => n.id));
  console.log('  corriendo la ingesta (lee los feeds, sin IA)…');
  corrida = await ingestar({ silencioso: true, memoria, idsConocidos, idsUnidos: new Set(Object.keys(fusionadas?.notas ?? {})) });
  fs.rmSync(memoria, { force: true });
  const guardar = path.join(RAIZ, '.cache', 'seleccion-ingesta.json');
  fs.mkdirSync(path.dirname(guardar), { recursive: true });
  fs.writeFileSync(guardar, JSON.stringify({ generado: corrida.generado, notas: corrida.notas }), 'utf8');
  console.log(`  guardada en ${path.relative(RAIZ, guardar)} (para repetir: --ingesta=${path.relative(RAIZ, guardar)})`);
}
const historias = corrida.notas ?? [];
const generado = Date.parse(corrida.generado ?? '') || Date.now();

// ------------------------------------------------------------------ utilidades
const HORA = 3600e3;
const diaAR = (t) => new Date(t - 3 * HORA).toISOString().slice(0, 10);
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MEDIOS_LOCALES = new Set(TODAS_LAS_FUENTES.filter((f) => f.alcance === 'local').map((f) => f.medio));
const GRUPO = new Map(TODAS_LAS_FUENTES.filter((f) => f.grupo && f.medio).map((f) => [f.medio, f.grupo]));
const publicadasReales = [...(archivo.notas ?? []), ...(portada.notas ?? [])].filter((n) => !n.propia);
const idsReales = new Set(publicadasReales.map((n) => n.id));
const esLocalPublicada = (n) => !!n.local || (n.medios ?? []).some((m) => MEDIOS_LOCALES.has(m));

/** Cuándo "califica" una historia: lo de acá cuando apareció; lo de afuera, cuando la cuenta el medio que completa los que pide. */
function momentoDe(n, mediosNacional = SELECCION_NUEVA.mediosNacional) {
  const sinFecha = n.cuando === 'sin fecha en la fuente';
  const base = Date.parse((sinFecha ? vistas[n.id] : null) ?? n.fecha ?? '') || generado;
  const ficha = fichas[n.id] ?? null;
  const clase = claseDe(n, ficha);
  if (clase === 'balcarce' || n.oficial) return base;
  const pide = mediosQuePide(seccionDe(n, ficha, false), n, { mediosNacional });
  const vistos = new Set();
  const fechas = (n.origenes ?? []).map((o) => ({ medio: o.medio, t: Date.parse(o.fecha ?? '') || base })).sort((a, b) => a.t - b.t);
  for (const o of fechas) {
    vistos.add(GRUPO.get(o.medio) ?? o.medio);
    if (vistos.size >= pide) return Math.max(base, o.t);
  }
  return fechas.at(-1)?.t ?? base;
}

// ------------------------------------------------------------------ el flujo de HOY sobre la misma corrida
const viejas = structuredClone(historias);
const { notas: conFichas, cambios } = aplicarFichas(viejas, fichas, { esperarSinFicha: true, yaPublicadas: idsReales });
const sacadasIA = new Map(cambios.sacadas.map((c) => [c.id, c.motivo]));
const { notas: sinRepetidas, repetidas } = quitarRepetidas(conFichas, fichasArchivo.repetidas?.grupos ?? [], { publicadas: idsReales });
const repetidasIds = new Set(repetidas.map((r) => r.id));
exigirMedios(sinRepetidas);
aplicarCupos(sinRepetidas.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0)));
const vieja = new Map();
for (const n of historias) {
  const v = sinRepetidas.find((x) => x.id === n.id);
  if (sacadasIA.has(n.id)) vieja.set(n.id, { sale: false, motivo: `la IA la saca (${sacadasIA.get(n.id)})`, seccion: n.seccion });
  else if (repetidasIds.has(n.id)) vieja.set(n.id, { sale: false, motivo: 'repetida (la IA la unió a otra)', seccion: n.seccion });
  else if (v) vieja.set(n.id, { sale: v.semaforo === 'verde', motivo: v.motivo, seccion: v.seccion, semaforo: v.semaforo });
  else vieja.set(n.id, { sale: false, motivo: 'no está', seccion: n.seccion });
}

// ------------------------------------------------------------------ el flujo NUEVO, simulado en el tiempo
// Las mismas uniones de la IA que hoy (la misma noticia con otro título: quitarRepetidas) se aplican antes:
// juntar repetidas no es un freno, es no publicar dos veces lo mismo.
const { notas: paraElNuevo, repetidas: repetidasNuevo } = quitarRepetidas(structuredClone(historias), fichasArchivo.repetidas?.grupos ?? [], { publicadas: idsReales });
function simular(mediosNacional) {
  const conMomento = paraElNuevo.map((n) => ({ n, t: momentoDe(n, mediosNacional) })).sort((a, b) => a.t - b.t);
  const publicadasSim = []; // { id, t, clase, seccion }
  const decisionFinal = new Map();
  const localesPublicadasParaRefrito = publicadasReales.filter(esLocalPublicada).map((n) => ({ id: n.id, titulo: n.titulo, fecha: n.fecha }));
  let pendientes = [];
  const PASO = HORA / 2;
  const inicio = conMomento.length ? Math.floor(conMomento[0].t / PASO) * PASO : generado;
  let i = 0;
  for (let tick = inicio; tick <= generado + PASO; tick += PASO) {
    const nuevas = [];
    while (i < conMomento.length && conMomento[i].t <= tick) { nuevas.push(conMomento[i].n); i += 1; }
    const enJuego = [...pendientes, ...nuevas];
    if (!enJuego.length) continue;
    const desde = tick - 24 * HORA;
    const ventana = { local: 0, nacional: 0, porSeccion: {} };
    for (const p of publicadasSim) {
      if (p.t <= desde) continue;
      if (p.clase === 'balcarce') ventana.local += 1;
      else { ventana.nacional += 1; ventana.porSeccion[p.seccion] = (ventana.porSeccion[p.seccion] ?? 0) + 1; }
    }
    const { decisiones } = seleccionNueva(enJuego, {
      fichas, publicadas: localesPublicadasParaRefrito, ahora: tick, vistas, ventana, mediosNacional,
    });
    pendientes = [];
    decisiones.forEach((d, k) => {
      decisionFinal.set(d.id, { ...d, t: tick });
      if (d.accion === 'publicar') publicadasSim.push({ id: d.id, t: tick, clase: d.clase, seccion: d.seccion });
      else if (d.freno === 'tope' || (d.accion === 'esperar' && d.freno === 'ia')) pendientes.push(enJuego[k]);
    });
  }
  
  const dias = {};
  const fila = (dia) => (dias[dia] ??= {
    nuevaTotal: 0, nuevaLocal: 0, nuevaNacional: 0, viejaTotal: 0, viejaLocal: 0, viejaNacional: 0,
    realTotal: 0, realLocal: 0, realNacional: 0, historias: 0, porSeccionNueva: {}, porSeccionVieja: {},
    esperanPersona: 0, esperanTope: 0, descartadas: 0,
  });
  for (const { n, t } of conMomento) {
    const f = fila(diaAR(t));
    f.historias += 1;
    const d = decisionFinal.get(n.id);
    if (d?.accion === 'publicar') {
      f.nuevaTotal += 1;
      if (d.clase === 'balcarce') f.nuevaLocal += 1; else f.nuevaNacional += 1;
      f.porSeccionNueva[d.seccion] = (f.porSeccionNueva[d.seccion] ?? 0) + 1;
    } else if (d?.freno === 'persona') f.esperanPersona += 1;
    else if (d?.freno === 'tope') f.esperanTope += 1;
    else f.descartadas += 1;
    const v = vieja.get(n.id);
    if (v?.sale) {
      f.viejaTotal += 1;
      const local = d?.clase === 'balcarce';
      if (local) f.viejaLocal += 1; else f.viejaNacional += 1;
      f.porSeccionVieja[v.seccion] = (f.porSeccionVieja[v.seccion] ?? 0) + 1;
    }
  }
  for (const n of publicadasReales) {
    const t = Date.parse(n.fecha ?? '');
    if (!t) continue;
    const dia = diaAR(t);
    if (!dias[dia]) continue;
    dias[dia].realTotal += 1;
    if (esLocalPublicada(n)) dias[dia].realLocal += 1; else dias[dia].realNacional += 1;
  }
  // Los días completos: los que tienen lo de afuera de todo el día en la corrida (36 h de memoria).
  const diasCompletos = Object.keys(dias).filter((d) => {
    const finDelDia = Date.parse(`${d}T23:59:59-03:00`);
    const comienzo = Date.parse(`${d}T00:00:00-03:00`);
    return finDelDia < generado && dias[d].historias >= 80 && comienzo > generado - 72 * HORA;
  }).sort();
  const ultimas24 = [...decisionFinal.values()].filter((d) => d.accion === 'publicar' && d.t > generado - 24 * HORA);
  
  
  return { conMomento, decisionFinal, dias, diasCompletos, ultimas24 };
}
const ESCENARIO = SELECCION_NUEVA.mediosNacional;
const ALTERNATIVO = 2;
const { conMomento, decisionFinal, dias, diasCompletos, ultimas24 } = simular(ESCENARIO);
const alt = simular(ALTERNATIVO);
const alt4 = simular(4);

// ------------------------------------------------------------------ cuántos medios cuentan lo de afuera (pedido de Hernán, 16/10)
// Por día, lo de afuera que podría salir si no se contaran los medios (pasa la lista roja, la IA, las menudencias;
// sin contar las que llegan tarde): cuántas historias tienen 1, 2, 3, 4, 5 y 6 o más medios, contando un grupo
// (mismo dueño: Clarín = TN = Olé) una vez y sin juntarlos.
const distribucion = {};
for (const n of paraElNuevo) {
  const ficha = fichas[n.id] ?? null;
  if (claseDe(n, ficha) === 'balcarce') continue;
  const t0 = momentoDe(n, 1);
  const d = decidir(n, { ficha, ahora: t0 + HORA, vistas, mediosNacional: 1 });
  if (d.accion !== 'publicar') continue;
  const dia = diaAR(t0);
  const fila = (distribucion[dia] ??= { conGrupo: {}, sinGrupo: {} });
  const cg = Math.min(6, contarMedios(n.medios ?? []));
  const sg = Math.min(6, new Set(n.medios ?? []).size);
  fila.conGrupo[cg] = (fila.conGrupo[cg] ?? 0) + 1;
  fila.sinGrupo[sg] = (fila.sinGrupo[sg] ?? 0) + 1;
}
const desdeN = (cuenta, k) => Object.entries(cuenta).filter(([m]) => Number(m) >= k).reduce((s, [, v]) => s + v, 0);

// ------------------------------------------------------------------ control: nada rojo sale
const rojasEntrada = historias.filter((n) => frenoRojo(n));
const rojasQueSalen = rojasEntrada.filter((n) => decisionFinal.get(n.id)?.accion === 'publicar');
const nuncaEnTitulo = historias.filter((n) => (REGLAS_SEMAFORO.nunca ?? []).some((p) => n.titulo?.toLowerCase().includes(p)));
const publicadasConRojoEnTexto = [...decisionFinal.values()].filter((d) => d.accion === 'publicar')
  .filter((d) => semaforoDelTexto(textoDeLaHistoria(historias.find((n) => n.id === d.id)))?.color === 'rojo');

// ------------------------------------------------------------------ ejemplos
const todas = conMomento.map(({ n, t }) => ({ n, t, d: decisionFinal.get(n.id), v: vieja.get(n.id), real: idsReales.has(n.id) }));
const nuevasQueAntesNo = todas.filter((x) => x.d?.accion === 'publicar' && !x.v?.sale && !x.real);
const dejanDeSalir = todas.filter((x) => (x.v?.sale || x.real) && x.d?.accion !== 'publicar');
const porFreno = {};
for (const x of todas) {
  if (x.d?.accion === 'publicar') continue;
  const k = `${x.d?.accion} · ${x.d?.freno ?? '-'}`;
  porFreno[k] = (porFreno[k] ?? 0) + 1;
}
const menudencias = todas.filter((x) => x.d?.freno === 'menudencia');

// ------------------------------------------------------------------ costo de IA
const intentos = Object.values(intentosIA);
const conCuerpo = intentos.filter((x) => x.motivo === 'con cuerpo').length;
const totalIntentos = intentos.reduce((s, x) => s + (x.intentos ?? 0), 0);
const intentosPorNota = conCuerpo ? totalIntentos / conCuerpo : 1.75;
const LLAMADAS_POR_INTENTO = 1.3; // un intento es 1 pedido, o 2 si el primero no pasa el verificador (estimado)
const llamadasPorNota = intentosPorNota * LLAMADAS_POR_INTENTO;
const promedioNuevo = diasCompletos.length ? diasCompletos.reduce((s, d) => s + dias[d].nuevaTotal, 0) / diasCompletos.length : ultimas24.length;
const promedioViejo = diasCompletos.length ? diasCompletos.reduce((s, d) => s + dias[d].realTotal, 0) / diasCompletos.length : 0;
const promedio4 = alt4.diasCompletos.length ? alt4.diasCompletos.reduce((s, d) => s + alt4.dias[d].nuevaTotal, 0) / alt4.diasCompletos.length : alt4.ultimas24.length;
const promedioAlt = alt.diasCompletos.length ? alt.diasCompletos.reduce((s, d) => s + alt.dias[d].nuevaTotal, 0) / alt.diasCompletos.length : alt.ultimas24.length;
const extrasAlt = conMomento.map(({ n }) => ({ n, d: alt.decisionFinal.get(n.id), d3: decisionFinal.get(n.id) }))
  .filter((x) => x.d?.accion === 'publicar' && x.d3?.accion !== 'publicar').sort((a, b) => b.d.puntaje - a.d.puntaje);
const topeAlt = conMomento.map(({ n }) => alt.decisionFinal.get(n.id)).filter((d) => d?.freno === 'tope');

// ------------------------------------------------------------------ consola
console.log(`\n  ${historias.length} historias · días completos: ${diasCompletos.join(', ') || 'ninguno'}`);
for (const d of Object.keys(dias).sort()) {
  const f = dias[d];
  console.log(`  ${d}${diasCompletos.includes(d) ? ' (completo)' : ''}: nuevo ${f.nuevaTotal} (acá ${f.nuevaLocal}, afuera ${f.nuevaNacional}) · hoy sobre la corrida ${f.viejaTotal} · publicado de verdad ${f.realTotal} · esperan persona ${f.esperanPersona} · tope ${f.esperanTope}`);
}
console.log(`  rojas en la entrada: ${rojasEntrada.length}; salen con el flujo nuevo: ${rojasQueSalen.length}; publicadas con rojo en el texto: ${publicadasConRojoEnTexto.length}`);
console.log(`  últimas 24 h: ${ultimas24.length} · llamadas de IA por nota publicada: ${llamadasPorNota.toFixed(2)}`);
for (const d of diasCompletos) {
  const f = distribucion[d] ?? { conGrupo: {}, sinGrupo: {} };
  console.log(`  medios de lo de afuera ${d}: con dueño ${JSON.stringify(f.conGrupo)} · sin juntar ${JSON.stringify(f.sinGrupo)} · ≥2 ${desdeN(f.conGrupo, 2)} · ≥3 ${desdeN(f.conGrupo, 3)} · ≥4 ${desdeN(f.conGrupo, 4)} · de acá ${dias[d].nuevaLocal}`);
}
console.log(`  promedio por día: con 2 medios ${Math.round(promedioAlt)} · con 3 ${Math.round(promedioNuevo)} · con 4 ${Math.round(promedio4)}`);
console.log(`  frenos: ${Object.entries(porFreno).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
for (const d of Object.keys(alt.dias).sort()) {
  const f = alt.dias[d];
  if (f.historias >= 80) console.log(`  con ${ALTERNATIVO} medios ${d}: ${f.nuevaTotal} (acá ${f.nuevaLocal}, afuera ${f.nuevaNacional}) · esperan por tope ${f.esperanTope}`);
}

// ------------------------------------------------------------------ HTML
const SECCIONES = [...new Set(todas.flatMap((x) => [x.d?.seccion, x.v?.seccion]).filter(Boolean))].sort();
const sumaSeccion = (clave) => {
  const s = {};
  for (const d of diasCompletos) for (const [k, v] of Object.entries(dias[d][clave])) s[k] = (s[k] ?? 0) + v;
  for (const k of Object.keys(s)) s[k] = s[k] / Math.max(1, diasCompletos.length);
  return s;
};
const secNueva = sumaSeccion('porSeccionNueva');
const secVieja = sumaSeccion('porSeccionVieja');
const maxSec = Math.max(1, ...Object.values(secNueva), ...Object.values(secVieja));
const hora = (t) => new Date(t).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const filaEjemplo = (x, motivo) => `<tr><td>${esc(x.n.titulo)}<div class="m">${esc((x.n.medios ?? []).slice(0, 4).join(' · '))}${(x.n.medios ?? []).length > 4 ? ` y ${(x.n.medios ?? []).length - 4} más` : ''} · ${hora(x.t)}</div></td><td>${esc(x.d?.seccion ?? '')}</td><td>${esc(motivo)}</td></tr>`;
const ejemplosNuevasLocal = nuevasQueAntesNo.filter((x) => x.d.clase === 'balcarce').slice(0, 25);
const ejemplosNuevasNacional = nuevasQueAntesNo.filter((x) => x.d.clase !== 'balcarce').sort((a, b) => b.d.puntaje - a.d.puntaje).slice(0, 30);
const repaso = elegirParaRepaso(ultimas24);
const facebook = elegirParaFacebook(ultimas24);
const archivoDias = Math.round(3700 / Math.max(1, promedioNuevo));

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulación del flujo nuevo</title>
<style>
:root{--fondo:#111418;--panel:#1a1f25;--linea:#2c333c;--texto:#e8e6e1;--suave:#a3a9b1;--acento:#e8a33c;--verde:#4fb39a;--rojo:#e0735a;--azul:#7aa7e0}
:root[data-theme="light"]{--fondo:#f7f5ef;--panel:#fff;--linea:#d5cfc0;--texto:#14161a;--suave:#4a4f4b;--acento:#a8371f;--verde:#16615b;--rojo:#a8371f;--azul:#2f5f9e}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--texto);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:16px}h1{font-size:24px;margin:8px 0 4px}h2{font-size:19px;margin:28px 0 8px;border-bottom:1px solid var(--linea);padding-bottom:4px}
.meta{color:var(--suave);font-size:13px}.cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:14px 0}
.cifra{background:var(--panel);border:1px solid var(--linea);border-radius:8px;padding:10px}.cifra b{display:block;font-size:26px;color:var(--acento)}.cifra span{font-size:13px;color:var(--suave)}
.tabla{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid var(--linea);padding:6px 6px;text-align:left;vertical-align:top}th{color:var(--suave);font-weight:600}
td.n,th.n{text-align:right;white-space:nowrap}.m{color:var(--suave);font-size:12px}.ok{color:var(--verde);font-weight:700}.mal{color:var(--rojo);font-weight:700}
.barra{display:flex;align-items:center;gap:6px;margin:3px 0;font-size:13px}.barra .nom{width:130px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.barra .b{height:10px;border-radius:3px}.b.v{background:var(--suave)}.b.n{background:var(--acento)}.caja{background:var(--panel);border:1px solid var(--linea);border-radius:8px;padding:12px;margin:10px 0}
details{margin:8px 0}summary{cursor:pointer;color:var(--azul)}
</style></head><body><main>
<h1>Simulación del flujo nuevo</h1>
<p class="meta">Corrida de la ingesta del ${hora(generado)} (hora de Balcarce), sin IA, con las fichas de la lectura con IA y lo publicado de <code>web/data/</code>${REF ? ` (${esc(REF)})` : ''}. Generado por <code>node ingesta/comparar-seleccion.mjs</code>. Las reglas: <a href="FLUJO-NUEVO.html">FLUJO-NUEVO.html</a>. <b>Nada de esto está en producción.</b></p>

<div class="cifras">
<div class="cifra"><b>${Math.round(promedioNuevo)}</b><span>notas por día con el flujo nuevo (promedio de ${diasCompletos.length} días completos)</span></div>
<div class="cifra"><b>${Math.round(promedioViejo)}</b><span>notas por día publicadas de verdad esos días (archivo)</span></div>
<div class="cifra"><b>${ultimas24.length}</b><span>saldrían en las últimas 24 horas</span></div>
<div class="cifra"><b class="${rojasQueSalen.length || publicadasConRojoEnTexto.length ? 'mal' : 'ok'}">${rojasQueSalen.length + publicadasConRojoEnTexto.length}</b><span>notas de la lista roja o "nunca" que saldrían (de ${rojasEntrada.length} que entraron)</span></div>
</div>

<h2>Por día</h2>
<div class="tabla"><table><tr><th>Día</th><th class="n">Nuevo: total</th><th class="n">de acá</th><th class="n">de afuera</th><th class="n">Hoy, misma corrida</th><th class="n">Publicado de verdad</th><th class="n">de acá / afuera</th><th class="n">Esperan persona</th><th class="n">Esperan por tope</th></tr>
${Object.keys(dias).sort().filter((d) => dias[d].historias >= 5).map((d) => { const f = dias[d]; return `<tr><td>${d}${diasCompletos.includes(d) ? '' : ' <span class="m">(incompleto)</span>'}</td><td class="n"><b>${f.nuevaTotal}</b></td><td class="n">${f.nuevaLocal}</td><td class="n">${f.nuevaNacional}</td><td class="n">${f.viejaTotal}</td><td class="n">${f.realTotal}</td><td class="n">${f.realLocal} / ${f.realNacional}</td><td class="n">${f.esperanPersona}</td><td class="n">${f.esperanTope}</td></tr>`; }).join('\n')}
</table></div>
<p class="meta">"Hoy, misma corrida": lo que el flujo actual deja en verde sobre la misma corrida (fichas, medios y cupos; los cupos son "a la vez" y se gastan también en notas viejas, por eso da menos que lo publicado). "Publicado de verdad": notas de medios del archivo con esa fecha. Lo de acá se cuenta igual en las dos columnas (un medio u organismo de Balcarce entre las fuentes). Lo que el flujo nuevo publica igual pasa después por la escritura, el verificador y el cuerpo mínimo: alguna se cae ahí (hoy, unas 4 de cada 10 de lo de acá que esperan cuerpo).</p>

<h2>¿Cuántos medios cuentan lo de afuera? ¿Se llega a ${SELECCION_NUEVA.topeDiario}?</h2>
<p class="meta">Pedido de Hernán (16/10). Historias de afuera (nacionales, y del extranjero con un argentino) que podrían salir si no se contaran los medios: ya pasaron la lista roja, la lectura con IA (publicidad, chimento, extranjero sin argentino, policial de afuera) y las menudencias, sin contar las que llegan tarde. "Con dueño": un grupo (Clarín = TN = Olé; los del mismo sistema) cuenta una vez; "sin juntar": cada medio por su nombre.</p>
<div class="tabla"><table>
<tr><th rowspan="2">Día</th><th colspan="6">Medios con dueño (cuentan una vez)</th><th colspan="5">Medios sin juntar</th></tr>
<tr><th class="n">1</th><th class="n">2</th><th class="n">3</th><th class="n">4</th><th class="n">5</th><th class="n">6+</th><th class="n">2</th><th class="n">3</th><th class="n">4</th><th class="n">5</th><th class="n">6+</th></tr>
${diasCompletos.map((d) => { const f = distribucion[d] ?? { conGrupo: {}, sinGrupo: {} }; return `<tr><td>${d}</td>${[1, 2, 3, 4, 5, 6].map((k) => `<td class="n">${f.conGrupo[k] ?? 0}</td>`).join('')}${[2, 3, 4, 5, 6].map((k) => `<td class="n">${f.sinGrupo[k] ?? 0}</td>`).join('')}</tr>`; }).join('')}
</table></div>
<div class="tabla"><table>
<tr><th>Día</th><th class="n">De acá</th><th class="n">Afuera ≥2</th><th class="n">Total ≥2</th><th class="n">Afuera ≥3</th><th class="n">Total ≥3</th><th class="n">Afuera ≥4</th><th class="n">Total ≥4</th></tr>
${diasCompletos.map((d) => { const f = distribucion[d] ?? { conGrupo: {} }; const loc = dias[d].nuevaLocal; return `<tr><td>${d}</td><td class="n">${loc}</td>${[2, 3, 4].map((k) => { const a = desdeN(f.conGrupo, k); const tot = a + loc; return `<td class="n">${a}</td><td class="n"><b class="${tot >= SELECCION_NUEVA.topeDiario ? 'mal' : ''}">${tot}</b></td>`; }).join('')}</tr>`; }).join('')}
</table></div>
<p class="meta">Umbral parejo para todas las secciones, con dueño. Con las reglas completas (tecnología, ciencia, IA, automovilismo y lo que nombra a una figura argentina piden 2; lo que llega tarde no sale; el tope ordena por puntaje), la simulación da por día: <b>con 2 medios ~${Math.round(promedioAlt)}</b>, <b>con 3 ~${Math.round(promedioNuevo)}</b>, <b>con 4 ~${Math.round(promedio4)}</b>. En rojo, el total que llega o pasa ${SELECCION_NUEVA.topeDiario}.</p>

<h2>Si lo de afuera pidiera ${ALTERNATIVO} medios en vez de ${ESCENARIO}</h2>
<div class="caja">
<p>Con ${ALTERNATIVO} medios independientes (y el tope de ${SELECCION_NUEVA.topeDiario} en 24 horas ordenando por puntaje) saldrían <b>~${Math.round(promedioAlt)} notas por día</b>, contra ~${Math.round(promedioNuevo)} con ${ESCENARIO}.</p>
<div class="tabla"><table><tr><th>Día</th><th class="n">Total</th><th class="n">de acá</th><th class="n">de afuera</th><th class="n">Esperan por tope</th></tr>
${Object.keys(alt.dias).sort().filter((d) => alt.dias[d].historias >= 80).map((d) => { const f = alt.dias[d]; return `<tr><td>${d}</td><td class="n"><b>${f.nuevaTotal}</b></td><td class="n">${f.nuevaLocal}</td><td class="n">${f.nuevaNacional}</td><td class="n">${f.esperanTope}</td></tr>`; }).join('')}
</table></div>
<p class="m">Lo que sumaría (${extrasAlt.length} historias en la corrida), las de más puntaje primero; casi todo es de 2 medios, el tipo de nota que menos se lee (de afuera, 2-3 medios: 0,10 visitas por nota; 4-7: 0,44):</p>
<ul>${extrasAlt.slice(0, 15).map((x) => `<li>${esc(x.n.titulo)} <span class="m">(${esc(x.d.seccion)}, ${x.d.medios} medios, ${x.d.puntaje})</span></li>`).join('')}</ul>
${topeAlt.length ? `<p class="m">${topeAlt.length} quedaron esperando por el tope.</p>` : '<p class="m">El tope no llegó a apretar.</p>'}
</div>

<h2>Por sección (promedio por día de los días completos)</h2>
<div class="caja">${SECCIONES.filter((s) => secNueva[s] || secVieja[s]).sort((a, b) => (secNueva[b] ?? 0) - (secNueva[a] ?? 0)).map((s) => `<div class="barra"><span class="nom">${esc(s)}</span><span class="b v" style="width:${Math.round(((secVieja[s] ?? 0) / maxSec) * 45)}%"></span><span class="m">${(secVieja[s] ?? 0).toFixed(1)}</span></div><div class="barra"><span class="nom"></span><span class="b n" style="width:${Math.round(((secNueva[s] ?? 0) / maxSec) * 45)}%"></span><span>${(secNueva[s] ?? 0).toFixed(1)}</span></div>`).join('')}
<p class="m">Gris: el flujo de hoy sobre la misma corrida. Naranja: el flujo nuevo. Las secciones son las de hoy (11); con las ~20 nuevas, cada nota trae la suya y la cuenta es la misma.</p></div>

<h2>La lista roja y "nunca": control</h2>
<div class="caja">
<p>Entraron <b>${rojasEntrada.length}</b> historias que tocan la lista roja, una lista de sepelios o una efeméride ajena (mirando el semáforo de la ingesta <b>y</b> todo el texto de cada medio). Con el flujo nuevo salen: <b class="${rojasQueSalen.length ? 'mal' : 'ok'}">${rojasQueSalen.length}</b>. Publicadas con algo rojo en el texto de cualquiera de sus medios: <b class="${publicadasConRojoEnTexto.length ? 'mal' : 'ok'}">${publicadasConRojoEnTexto.length}</b>. Títulos con palabras de sepelios: ${nuncaEnTitulo.length}, ninguna publicada.</p>
<p class="m">De lo rojo el sitio público no guarda el título (es para cuidar a menores y víctimas): acá tampoco se lista.</p>
</div>

<h2>Por qué no sale lo que no sale (flujo nuevo)</h2>
<div class="tabla"><table><tr><th>Acción · freno</th><th class="n">Historias</th></tr>
${Object.entries(porFreno).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v}</td></tr>`).join('')}
</table></div>
<p class="meta">rojo = lista roja o nunca; persona = menores, víctimas, muertes de acá, una detención sin confirmar (esperan como hoy); ia = publicidad, chimento, del extranjero sin argentino, policial de afuera o espera la lectura; menudencia = autopublicada, servicio que ya damos, resumen, saludo o refrito; medios = de afuera con menos medios de los que pide; tiempo = llega tarde; tope = no entró en las 150.</p>

<h2>Saldrían ahora y antes no: de Balcarce (${nuevasQueAntesNo.filter((x) => x.d.clase === 'balcarce').length})</h2>
<div class="tabla"><table><tr><th>Título (de la fuente)</th><th>Sección</th><th>Por qué hoy no sale</th></tr>
${ejemplosNuevasLocal.map((x) => filaEjemplo(x, x.v?.motivo ?? '')).join('\n')}
</table></div>

<h2>Saldrían ahora y antes no: de afuera (${nuevasQueAntesNo.filter((x) => x.d.clase !== 'balcarce').length}; las 30 de más puntaje)</h2>
<div class="tabla"><table><tr><th>Título (de la fuente)</th><th>Sección</th><th>Por qué hoy no sale</th></tr>
${ejemplosNuevasNacional.map((x) => filaEjemplo(x, `${x.v?.motivo ?? ''} · nuevo: ${x.d.medios} medios, puntaje ${x.d.puntaje}`)).join('\n')}
</table></div>

<h2>Dejarían de salir (${dejanDeSalir.length})</h2>
<div class="tabla"><table><tr><th>Título (de la fuente)</th><th>Sección</th><th>Por qué no sale con el flujo nuevo</th></tr>
${dejanDeSalir.filter((x) => x.d?.freno !== 'rojo').slice(0, 40).map((x) => filaEjemplo(x, `${x.d?.motivo ?? ''}${x.real ? ' · (salió de verdad)' : ''}`)).join('\n')}
</table></div>

<h2>Autopublicadas, menudencias y refritos detectados (${menudencias.length})</h2>
<p class="meta">Para revisar a ojo si la regla se equivoca: cada una de éstas NO saldría.</p>
<div class="tabla"><table><tr><th>Título (de la fuente)</th><th>Sección</th><th>Motivo</th></tr>
${menudencias.slice(0, 40).map((x) => filaEjemplo(x, x.d.motivo)).join('\n')}
</table></div>

<h2>Repasos y posteos con lo de las últimas 24 horas</h2>
<div class="caja"><p><b>Un repaso (4 notas):</b></p><ol>${repaso.map((d) => `<li>${esc(d.titulo)} <span class="m">(${d.clase === 'balcarce' ? 'de acá' : 'de afuera'}, ${esc(d.seccion)}, ${d.puntaje})</span></li>`).join('')}</ol>
<p><b>Los 5 posteos del día:</b></p><ol>${facebook.map((d) => `<li>${esc(d.titulo)} <span class="m">(${d.clase === 'balcarce' ? 'de acá' : 'de afuera'}, ${esc(d.seccion)}, ${d.puntaje})</span></li>`).join('')}</ol>
<p class="m">Política y Policiales no entran solas (esperan a una persona, como hoy).</p></div>

<h2>Lo que cuesta</h2>
<div class="caja"><ul>
<li><b>IA de redacción:</b> en los últimos 7 días hubo ${totalIntentos} intentos para ${conCuerpo} notas con cuerpo (${intentosPorNota.toFixed(2)} por nota); con ~${LLAMADAS_POR_INTENTO} pedidos por intento son <b>${llamadasPorNota.toFixed(1)} pedidos por nota publicada</b>. Con ${Math.round(promedioNuevo)} notas por día: <b>~${Math.round(promedioNuevo * llamadasPorNota)} pedidos por día</b> (más ~15 % de notas que nunca logran cuerpo), contra 500 gratis de la clave de redacción y el tope propio de 450.</li>
<li><b>Archivo:</b> a ${Math.round(promedioNuevo)} por día, las 3.700 notas con página se llenan en <b>~${archivoDias} días</b>; a 150 por día, en 25.</li>
<li><b>La corrida:</b> la ingesta tardó ${corrida.segundos ? `${Math.round(corrida.segundos)} s` : 'lo de siempre'} (no cambia: lee lo mismo); lo que crece es la escritura con IA y el armado del sitio.</li>
</ul></div>

<h2>Límites de esta simulación</h2>
<ul class="meta">
<li>Es <b>una</b> corrida: guarda ~36 horas de lo de afuera y 72 de lo de acá. Los días completos son pocos; hay que repetirla una semana (modo sombra).</li>
<li>Una historia se decide con todos los medios que juntó al final (el momento se toma cuando completa los que pide su sección, pero el puntaje usa el total).</li>
<li>Las fichas de la IA son las guardadas (3 días): ${historias.filter((n) => fichas[n.id]).length} de ${historias.length} historias tienen ficha.</li>
<li>No se simula la escritura ni el verificador: lo que "sale" acá es lo que se le pediría a la IA.</li>
<li>Los refritos se buscan contra lo publicado de verdad (no contra lo que habría publicado el flujo nuevo).</li>
</ul>
</main></body></html>
`;
fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, html, 'utf8');
console.log(`  escrito: ${path.relative(RAIZ, SALIDA)}`);
