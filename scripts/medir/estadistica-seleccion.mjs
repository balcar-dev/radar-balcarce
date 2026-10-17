// El reporte semanal de la selección (regla 260, 17/10/2026): dónde caen todas las notas.
//
// Hernán: "la semana que viene lo miramos y ahí tenemos un pantallazo de dónde caen todas las notas. De lunes a viernes pulí la
// estadística y cómo caen las notas, categorías y secciones, y ahí regularizamos." Lee web/data/estadistica-seleccion.json (lo
// escribe cada vuelta de "Actualizar la web": ingesta/estadistica-seleccion.mjs) y arma UN archivo HTML con tablas claras:
//
//   · cuántas notas salen por día (de acá y de afuera) y qué secciones se quedaron sin notas;
//   · por sección: cuántas llegaron, cuántas salieron, cuántas por día y en cuántos días no hubo ninguna;
//   · dónde caen las que no salen (un solo medio, pocas fuentes, semáforo, la IA, repetida, sin cuerpo…);
//   · lo de afuera por cantidad de medios (1, 2, 3, 4, 5, 6 o más): cuántas llegaron y cuántas salieron;
//   · cuántas notas por día y por sección habría si el mínimo nacional fuera 2, 3, 4 o 5, y si el de las áreas chicas fuera 2, 3 o 4;
//   · el ritmo por hora.
//
//   node scripts/medir/estadistica-seleccion.mjs                    escribe .cache/estadistica-seleccion.html (últimos 7 días)
//   node scripts/medir/estadistica-seleccion.mjs --dias=14          otro período
//   node scripts/medir/estadistica-seleccion.mjs --salida=ruta.html otro archivo
//   node scripts/medir/estadistica-seleccion.mjs --texto            lo mismo, en texto, por la pantalla
//   node scripts/medir/estadistica-seleccion.mjs --ahora            lee los feeds AHORA (sin IA, sin escribir nada de web/data) y mide ese
//                                                                   momento: lo verde cuenta como "saldría". Sirve para ver cómo cae el día
//                                                                   sin esperar a que se junten datos.
//
// Cada vuelta de generar-datos lo rehace también en web/public/panel/estadistica-seleccion.html (el informe diario por mail lo enlaza).
// Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diaAR } from '../../ingesta/zona.mjs';
import { AREAS_CHICAS } from '../../ingesta/criterio.mjs';
import { minimoNacional, minimoAreasChicas } from '../../ingesta/popularidad.mjs';
import {
  SECCIONES_DE_LA_ESTADISTICA, RESULTADOS, CUBOS, estadoVacio, leerEstado, simularMinimo, anotarCorrida, observarCorrida, contarUnSoloMedio,
} from '../../ingesta/estadistica-seleccion.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARCHIVO = path.join(RAIZ, 'web', 'data', 'estadistica-seleccion.json');
const DIA = 864e5;
const NOMBRES_DE_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n1 = (n) => (Math.round(n * 10) / 10).toLocaleString('es-AR');
const n0 = (n) => Math.round(n).toLocaleString('es-AR');
const etiquetaDia = (d) => { const f = new Date(`${d}T12:00:00Z`); return `${NOMBRES_DE_DIA[f.getUTCDay()]} ${f.getUTCDate()}/${f.getUTCMonth() + 1}`; };
const nombreSeccion = (s) => (s === 'Tecnología' ? 'Tecnología e IA' : s);

/** Los `n` días de calendario que terminan en `hasta`, del más viejo al más nuevo. */
export function ventana(hasta, n) {
  const fin = Date.parse(`${hasta}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(fin - (n - 1 - i) * DIA).toISOString().slice(0, 10));
}

// ------------------------------------------------------------------ el modelo

/**
 * Todos los números del reporte, listos para mostrar (sin HTML). `hasta`: el último día (por defecto, hoy de Balcarce); `dias`: cuántos días.
 * Los días sin números (antes de que empiece la estadística) no cuentan para los promedios.
 */
export function modeloDelReporte(estado, { hasta = diaAR(), dias = 7 } = {}) {
  const calendario = ventana(hasta, dias);
  const conNumeros = calendario.filter((d) => estado?.dias?.[d]);
  const secciones = SECCIONES_DE_LA_ESTADISTICA;
  const cerrados = conNumeros.filter((d) => d < hasta);
  const porDia = conNumeros.map((dia) => {
    const d = estado.dias[dia];
    return {
      dia, llegaron: d.llegaron ?? 0, publicadas: d.publicadas ?? 0, deAca: d.deAcaPublicadas ?? 0, deAfuera: d.deAfueraPublicadas ?? 0,
      sinNotas: secciones.filter((s) => !(d.secciones?.[s]?.publicadas > 0)), enCurso: dia === hasta,
    };
  });
  const suma = (f) => conNumeros.reduce((t, dia) => t + (f(estado.dias[dia]) ?? 0), 0);
  const promedio = (f) => (conNumeros.length ? suma(f) / conNumeros.length : 0);

  const porSeccion = secciones.map((seccion) => {
    const de = (campo) => conNumeros.reduce((t, dia) => t + (estado.dias[dia].secciones?.[seccion]?.[campo] ?? 0), 0);
    const diasSinNotas = conNumeros.filter((dia) => !(estado.dias[dia].secciones?.[seccion]?.publicadas > 0));
    const medios = Array(6).fill(0);
    const publicadasMedios = Array(6).fill(0);
    const quedaronAfuera = {};
    for (const dia of conNumeros) {
      const s = estado.dias[dia].secciones?.[seccion];
      if (!s) continue;
      for (let i = 0; i < 6; i += 1) { medios[i] += s.medios?.[i] ?? 0; publicadasMedios[i] += s.publicadasMedios?.[i] ?? 0; }
      for (const [k, n] of Object.entries(s.quedaronAfuera ?? {})) quedaronAfuera[k] = (quedaronAfuera[k] ?? 0) + n;
    }
    return {
      seccion, llegaron: de('llegaron'), publicadas: de('publicadas'), deAca: de('deAcaPublicadas'), deAfuera: de('publicadas') - de('deAcaPublicadas'),
      porDia: conNumeros.length ? de('publicadas') / conNumeros.length : 0, diasSinNotas, medios, publicadasMedios, quedaronAfuera, areaChica: AREAS_CHICAS.includes(seccion),
    };
  });

  const porHora = Array(24).fill(0);
  for (const dia of conNumeros) (estado.dias[dia].porHora ?? []).forEach((n, i) => { porHora[i] += n; });

  const vigentes = { nacional: minimoNacional(), areasChicas: minimoAreasChicas() };
  const simulacion = {
    nacional: [2, 3, 4, 5].map((minimo) => ({ minimo, ...simularMinimo(estado, conNumeros, { minimo, areasChicas: AREAS_CHICAS, minimoAreasChicas: vigentes.areasChicas }) })),
    areasChicas: [2, 3, 4].map((minimo) => ({ minimo, ...simularMinimo(estado, conNumeros, { minimo: vigentes.nacional, areasChicas: AREAS_CHICAS, minimoAreasChicas: minimo }) })),
  };

  return {
    hasta, dias, conNumeros, cerrados, porDia, porSeccion, porHora: porHora.map((n) => (conNumeros.length ? n / conNumeros.length : 0)), vigentes, simulacion,
    promedios: { publicadas: promedio((d) => d.publicadas), deAca: promedio((d) => d.deAcaPublicadas), deAfuera: promedio((d) => d.deAfueraPublicadas), llegaron: promedio((d) => d.llegaron) },
    hoy: estado?.dias?.[hasta] ?? null,
  };
}

// ------------------------------------------------------------------ el HTML

const CSS = `
:root{--fondo:#fafaf7;--texto:#1c1f1d;--suave:#5f6663;--linea:#d9ddd8;--caja:#fff;--verde:#1e7a54;--rojo:#b42318;--ambar:#a8660a;--azul:#1d4f91}
@media (prefers-color-scheme:dark){:root{--fondo:#151816;--texto:#eceee9;--suave:#a0a8a3;--linea:#2e3431;--caja:#1c211e;--verde:#5ec79a;--rojo:#ff8a7a;--ambar:#e0a85a;--azul:#7fb2f0}}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:16px}
main{max-width:1100px;margin:0 auto}h1{font-size:1.6rem;margin:.2em 0}h2{font-size:1.2rem;margin:1.8em 0 .4em}p{margin:.4em 0}.suave{color:var(--suave);font-size:.92rem}
.tarjetas{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.tarjeta{background:var(--caja);border:1px solid var(--linea);border-radius:10px;padding:10px 14px;min-width:150px}
.tarjeta b{display:block;font-size:1.5rem}.envoltura{overflow-x:auto;border:1px solid var(--linea);border-radius:10px;background:var(--caja)}
table{border-collapse:collapse;width:100%;font-size:.93rem}th,td{padding:6px 10px;text-align:right;border-bottom:1px solid var(--linea);white-space:nowrap}th:first-child,td:first-child{text-align:left}
th{font-weight:600;color:var(--suave);background:transparent}tr:last-child td{border-bottom:0}.cero{color:var(--rojo);font-weight:600}.vigente{background:rgba(30,122,84,.14);font-weight:600}
.total td{font-weight:700;border-top:2px solid var(--linea)}.barra{display:inline-block;height:10px;background:var(--azul);border-radius:3px;vertical-align:middle}.horas td:nth-child(2){text-align:left;width:100%}
.nota{background:var(--caja);border:1px solid var(--linea);border-left:4px solid var(--ambar);border-radius:6px;padding:8px 12px;margin:12px 0}
`;

const celdaN = (n, { cero = false } = {}) => `<td${cero && !n ? ' class="cero"' : ''}>${n0(n)}</td>`;
const tabla = (cabeceras, filas, { clase = '' } = {}) => `<div class="envoltura"><table${clase ? ` class="${clase}"` : ''}><thead><tr>${cabeceras.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table></div>`;

/** El reporte entero como un solo archivo HTML (con tablas, sin scripts ni estilos de afuera). */
export function reporteHtml(estado, opciones = {}) {
  const m = modeloDelReporte(estado, opciones);
  const periodo = m.conNumeros.length ? `${etiquetaDia(m.conNumeros[0])} a ${etiquetaDia(m.conNumeros.at(-1))}` : 'sin días medidos todavía';
  const hoy = m.hoy;
  const partes = [];

  partes.push(`<h1>Cómo cae la selección</h1>
    <p class="suave">Radar Balcarce · ${esc(periodo)} (${m.conNumeros.length} ${m.conNumeros.length === 1 ? 'día medido' : 'días medidos'} de ${m.dias}). Cada número es una <b>historia</b>: la misma noticia contada por varios medios cuenta una vez.
    Lo de hoy puede estar incompleto: el día termina a las 24.</p>
    <div class="tarjetas">
      <div class="tarjeta"><span class="suave">Mínimo nacional (medios)</span><b>${m.vigentes.nacional}</b><span class="suave">variable MINIMO_NACIONAL</span></div>
      <div class="tarjeta"><span class="suave">Mínimo en áreas chicas</span><b>${m.vigentes.areasChicas}</b><span class="suave">variable MINIMO_AREAS_CHICAS</span></div>
      <div class="tarjeta"><span class="suave">Publicadas por día (promedio)</span><b>${n1(m.promedios.publicadas)}</b><span class="suave">${n1(m.promedios.deAca)} de acá · ${n1(m.promedios.deAfuera)} de afuera</span></div>
      <div class="tarjeta"><span class="suave">Llegan por día (promedio)</span><b>${n0(m.promedios.llegaron)}</b><span class="suave">historias al cruce</span></div>
      ${hoy ? `<div class="tarjeta"><span class="suave">Hoy, hasta ahora</span><b>${hoy.publicadas ?? 0}</b><span class="suave">${hoy.deAcaPublicadas ?? 0} de acá · ${hoy.deAfueraPublicadas ?? 0} de afuera</span></div>` : ''}
    </div>
    <p class="nota">Áreas chicas (piden menos medios): ${AREAS_CHICAS.map(nombreSeccion).map(esc).join(', ')}. Para cambiar los mínimos: en GitHub, Settings, Secrets and variables, Actions, Variables:
    <b>MINIMO_NACIONAL</b> y <b>MINIMO_AREAS_CHICAS</b> (un número de 2 a 10; sin tocar código). La lista de áreas chicas está en <code>AREAS_CHICAS</code> (<code>ingesta/criterio.mjs</code>).</p>`);

  // 1. por día
  partes.push(`<h2>1. Cuántas notas salen por día</h2>${tabla(
    ['Día', 'Llegaron', 'Publicadas', 'De acá', 'De afuera', 'Secciones sin notas'],
    m.porDia.map((d) => `<tr><td>${etiquetaDia(d.dia)}${d.enCurso ? ' (hoy)' : ''}</td>${celdaN(d.llegaron)}${celdaN(d.publicadas)}${celdaN(d.deAca)}${celdaN(d.deAfuera)}<td style="text-align:left;white-space:normal">${d.sinNotas.length ? d.sinNotas.map(nombreSeccion).map(esc).join(', ') : '—'}</td></tr>`),
  )}`);

  // 2. por sección
  const filasSeccion = m.porSeccion.map((s) => `<tr><td>${esc(nombreSeccion(s.seccion))}${s.areaChica ? ' <span class="suave">(área chica)</span>' : ''}</td>${celdaN(s.llegaron)}${celdaN(s.publicadas)}<td>${n1(s.porDia)}</td>${celdaN(s.deAca)}${celdaN(s.deAfuera)}<td class="${s.diasSinNotas.length ? 'cero' : ''}">${s.diasSinNotas.length} de ${m.conNumeros.length}</td></tr>`);
  const tot = (f) => m.porSeccion.reduce((t, s) => t + f(s), 0);
  filasSeccion.push(`<tr class="total"><td>Todas</td>${celdaN(tot((s) => s.llegaron))}${celdaN(tot((s) => s.publicadas))}<td>${n1(tot((s) => s.porDia))}</td>${celdaN(tot((s) => s.deAca))}${celdaN(tot((s) => s.deAfuera))}<td></td></tr>`);
  partes.push(`<h2>2. Por sección</h2>${tabla(['Sección', 'Llegaron', 'Publicadas', 'Por día', 'De acá', 'De afuera', 'Días sin notas'], filasSeccion)}
    <p class="suave">Período completo. "Días sin notas" cuenta los días en que la sección no publicó nada; en rojo, las que tuvieron alguno.</p>`);

  // 3. dónde caen
  const claves = Object.keys(RESULTADOS).filter((k) => k !== 'publicada');
  const filasCaen = m.porSeccion.map((s) => `<tr><td>${esc(nombreSeccion(s.seccion))}</td>${celdaN(s.publicadas)}${claves.map((k) => celdaN(s.quedaronAfuera[k] ?? 0)).join('')}</tr>`);
  filasCaen.push(`<tr class="total"><td>Todas</td>${celdaN(tot((s) => s.publicadas))}${claves.map((k) => celdaN(tot((s) => s.quedaronAfuera[k] ?? 0))).join('')}</tr>`);
  partes.push(`<h2>3. Dónde caen las notas que no salen</h2>${tabla(['Sección', 'Se publicaron', ...claves.map((k) => esc(RESULTADOS[k]).replace(/ \(.*$/, ''))], filasCaen)}
    <ul class="suave">${claves.map((k) => `<li><b>${esc(RESULTADOS[k]).replace(/ \(.*$/, '')}</b>: ${esc(RESULTADOS[k])}</li>`).join('')}</ul>`);

  // 4. por cantidad de medios
  const filasMedios = m.porSeccion.filter((s) => s.medios.some((n) => n)).map((s) => `<tr><td>${esc(nombreSeccion(s.seccion))}</td>${s.medios.map((n, i) => `<td>${n0(n)} <span class="suave">/ ${n0(s.publicadasMedios[i])}</span></td>`).join('')}</tr>`);
  const totM = Array(6).fill(0); const totP = Array(6).fill(0);
  for (const s of m.porSeccion) s.medios.forEach((n, i) => { totM[i] += n; totP[i] += s.publicadasMedios[i]; });
  filasMedios.push(`<tr class="total"><td>Todas</td>${totM.map((n, i) => `<td>${n0(n)} <span class="suave">/ ${n0(totP[i])}</span></td>`).join('')}</tr>`);
  partes.push(`<h2>4. Lo de afuera, por cantidad de medios</h2>${tabla(['Sección', ...CUBOS.map((c) => `${c} ${c === '1' ? 'medio' : 'medios'}`)], filasMedios)}
    <p class="suave">Cada celda: historias de afuera que llegaron <i>/</i> las que salieron. Con un solo medio no pasa el cruce; con dos salen sólo las áreas chicas; con tres, el resto.</p>`);

  // 5. simulación
  const filasSim = (lista, vigente) => {
    const filas = SECCIONES_DE_LA_ESTADISTICA.map((s) => `<tr><td>${esc(nombreSeccion(s))}</td>${lista.map((x) => `<td class="${x.minimo === vigente ? 'vigente' : ''}">${n1(x.porSeccion[s] ?? 0)}</td>`).join('')}</tr>`);
    filas.push(`<tr class="total"><td>Todas, por día</td>${lista.map((x) => `<td class="${x.minimo === vigente ? 'vigente' : ''}">${n1(x.total)}</td>`).join('')}</tr>`);
    return filas;
  };
  partes.push(`<h2>5. Si el mínimo cambiara: cuántas notas por día habría</h2>
    <p class="suave">Promedio por día del período, con lo que pasó el semáforo y la lectura con IA; lo de acá, tal cual salió. En verde, el mínimo de hoy. Es una cuenta aproximada: no incluye lo que un solo medio podría haber aportado ni los días en que el cupo gratis de la IA se acabó.</p>
    <h3>Si el mínimo nacional fuera 2, 3, 4 o 5 (las áreas chicas se quedan en ${m.vigentes.areasChicas})</h3>
    ${tabla(['Sección', ...m.simulacion.nacional.map((x) => `${x.minimo} medios`)], filasSim(m.simulacion.nacional, m.vigentes.nacional))}
    <h3>Si el mínimo de las áreas chicas fuera 2, 3 o 4 (lo nacional se queda en ${m.vigentes.nacional})</h3>
    ${tabla(['Sección', ...m.simulacion.areasChicas.map((x) => `${x.minimo} medios`)], filasSim(m.simulacion.areasChicas, m.vigentes.areasChicas))}`);

  // 6. días sin notas
  const sin = m.porSeccion.filter((s) => s.diasSinNotas.length);
  partes.push(`<h2>6. Días en que una sección quedó sin notas</h2>${sin.length
    ? tabla(['Sección', 'Días sin ninguna nota'], sin.map((s) => `<tr><td>${esc(nombreSeccion(s.seccion))}</td><td style="text-align:left;white-space:normal">${s.diasSinNotas.map(etiquetaDia).join(', ')}</td></tr>`))
    : '<p class="suave">Ninguna sección se quedó sin notas en el período.</p>'}`);

  // 7. por hora
  const maxH = Math.max(0.01, ...m.porHora);
  partes.push(`<h2>7. A qué hora salen</h2>${tabla(['Hora', 'Notas por día (promedio)'], m.porHora.map((n, h) => (n || (h >= 7 && h <= 23)
    ? `<tr><td>${String(h).padStart(2, '0')}:00</td><td style="text-align:left"><span class="barra" style="width:${Math.max(2, Math.round((n / maxH) * 260))}px"></span> ${n1(n)}</td></tr>` : '')).filter(Boolean), { clase: 'horas' })}
    <p class="suave">Hora de Balcarce. Es la hora en que la nota apareció en las listas por primera vez (las que ya estaban cuando empezó la medición cuentan en la hora en que se vieron).</p>`);

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Cómo cae la selección</title><style>${CSS}</style></head><body><main>
${partes.join('\n')}
<p class="suave" style="margin-top:2em">Armado ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC por <code>scripts/medir/estadistica-seleccion.mjs</code> a partir de <code>web/data/estadistica-seleccion.json</code>. Ver <code>docs/03-SELECCION.md</code>, paso 7.</p>
</main></body></html>
`;
}

// ------------------------------------------------------------------ el texto

/** Lo mismo en texto plano, para mirar por la pantalla. */
export function reporteTexto(estado, opciones = {}) {
  const m = modeloDelReporte(estado, opciones);
  const l = [];
  l.push(`LA SELECCIÓN · ${m.conNumeros.length} días medidos (hasta ${m.hasta}) · mínimos vigentes: nacional ${m.vigentes.nacional}, áreas chicas ${m.vigentes.areasChicas}`);
  l.push(`publicadas por día: ${n1(m.promedios.publicadas)} (${n1(m.promedios.deAca)} de acá, ${n1(m.promedios.deAfuera)} de afuera) · llegan ${n0(m.promedios.llegaron)} historias por día`);
  l.push('', 'POR DÍA');
  for (const d of m.porDia) l.push(`  ${etiquetaDia(d.dia)}${d.enCurso ? '*' : ' '} llegaron ${String(d.llegaron).padStart(4)} · publicadas ${String(d.publicadas).padStart(3)} (${d.deAca} de acá, ${d.deAfuera} de afuera) · sin notas: ${d.sinNotas.map(nombreSeccion).join(', ') || '—'}`);
  l.push('', 'POR SECCIÓN (período)');
  for (const s of m.porSeccion) l.push(`  ${nombreSeccion(s.seccion).padEnd(17)} llegaron ${String(s.llegaron).padStart(4)} · publicadas ${String(s.publicadas).padStart(4)} (${n1(s.porDia)} por día) · días sin notas ${s.diasSinNotas.length}/${m.conNumeros.length}${s.areaChica ? ' · área chica' : ''}`);
  l.push('', 'SI EL MÍNIMO NACIONAL FUERA… (notas por día)');
  l.push(`  ${''.padEnd(17)} ${m.simulacion.nacional.map((x) => `${x.minimo} medios`.padStart(10)).join('')}`);
  for (const s of SECCIONES_DE_LA_ESTADISTICA) l.push(`  ${nombreSeccion(s).padEnd(17)} ${m.simulacion.nacional.map((x) => n1(x.porSeccion[s] ?? 0).padStart(10)).join('')}`);
  l.push(`  ${'TODAS'.padEnd(17)} ${m.simulacion.nacional.map((x) => n1(x.total).padStart(10)).join('')}`);
  l.push('', 'SI EL MÍNIMO DE LAS ÁREAS CHICAS FUERA… (notas por día)');
  l.push(`  ${'TODAS'.padEnd(17)} ${m.simulacion.areasChicas.map((x) => `${x.minimo} medios: ${n1(x.total)}`.padStart(18)).join('')}`);
  return `${l.join('\n')}\n`;
}

// ------------------------------------------------------------------ medir ahora, sin IA

/**
 * Lee los feeds ahora (sin IA, sin escribir nada de web/data) y arma un estado de un solo momento: lo verde cuenta como "saldría",
 * lo amarillo con "poco contada" como pocas fuentes, lo de un solo medio como tal. Sirve para ver cómo cae el día sin esperar a que se junten
 * datos. La lectura con IA y el cuerpo no están: el número de "publicadas" es el máximo que el criterio dejaría salir.
 */
export async function estadoDeAhora() {
  const { ingestar, contarMedios, esDeAca, esDeUnMedioDeAca, MOTIVO_POCO_CONTADA } = await import('../../ingesta/ingesta.mjs');
  const datos = await ingestar({ silencioso: true, memoria: null, escribirArchivos: false });
  const ahora = new Date();
  // Sólo lo de hoy (hora de Balcarce): los feeds traen uno o dos días de notas, y el reporte de una foto es "cómo cae el día".
  const esDeHoy = (iso) => !!iso && diaAR(new Date(iso)) === diaAR(ahora);
  datos.notas = datos.notas.filter((n) => esDeHoy(n.fecha));
  datos.deUnSoloMedio = (datos.deUnSoloMedio ?? []).filter((u) => esDeHoy(u.fecha));
  const delCruce = datos.notas.map((n) => ({ id: n.id, seccion: n.seccion, medios: contarMedios(n.medios), deAca: esDeAca(n) || esDeUnMedioDeAca(n) || n.alcance === 'local' }));
  const finales = datos.notas.map((n) => ({ id: n.id, seccion: n.seccion, semaforo: n.semaforo, motivo: n.motivo, medios: contarMedios(n.medios) }));
  const observaciones = observarCorrida({
    delCruce, finales,
    publicadas: new Set(datos.notas.filter((n) => n.semaforo === 'verde').map((n) => n.id)),
    motivos: { pocoContada: MOTIVO_POCO_CONTADA, esperaLectura: 'de un medio de acá sin nombrar Balcarce' },
    ahora,
  });
  return { estado: anotarCorrida(estadoVacio(), observaciones, { ahora, solos: contarUnSoloMedio(datos.deUnSoloMedio, { ahora }) }), hasta: diaAR(ahora), fuentes: datos.fuentes };
}

// ------------------------------------------------------------------ desde la línea de comandos

const esElPrograma = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esElPrograma) {
  const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;
  const tiene = (nombre) => process.argv.includes(`--${nombre}`);
  const dias = Number(arg('dias') ?? 7);
  let estado;
  let hasta = diaAR();
  if (tiene('ahora')) {
    const r = await estadoDeAhora();
    ({ estado, hasta } = r);
    console.log(`Leídas las fuentes ahora (${r.fuentes.filter((f) => f.estado === 'ok').length} de ${r.fuentes.length} respondieron). Sin IA: lo verde cuenta como "saldría".`);
  } else {
    estado = fs.existsSync(ARCHIVO) ? leerEstado(fs.readFileSync(ARCHIVO, 'utf8')) : estadoVacio();
  }
  if (tiene('texto')) {
    process.stdout.write(reporteTexto(estado, { hasta, dias }));
  } else {
    const salida = path.resolve(RAIZ, arg('salida') ?? '.cache/estadistica-seleccion.html');
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, reporteHtml(estado, { hasta, dias }), 'utf8');
    console.log(`Escrito ${path.relative(RAIZ, salida)}`);
  }
}
