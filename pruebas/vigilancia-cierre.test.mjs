// El vigilante y el contrato del día (25/09): el cierre de las 23:30 contra
// Meta, el duplicado que se avisa enseguida, y que todo salga en UN solo
// WhatsApp por corrida. Sin red y sin mandar nada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluar, fechaDelCierre, cierreDelDia, planDeAvisos, problemasDelContrato,
} from '../redes/vigilar.mjs';
import { armarMensaje } from '../redes/avisos.mjs';
import { contratoDelDia } from '../redes/contrato.mjs';
import { armarMeta } from '../redes/auditar-redes.mjs';

const REAL = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'libro-real-24-25-09.json'), 'utf8'));
const AR = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-03:00`);
const D = '2026-09-25';
const meta = (hhmm) => AR(D, hhmm).toISOString().replace(/\.\d{3}Z$/, '+0000');
const unix = (hhmm) => Math.floor(AR(D, hhmm).getTime() / 1000);

/** Lo que Meta tenía el 25/09, igual que el libro (sin duplicados). */
function metaQueCuadra() {
  const nota = (hhmm, n) => ({ id: `p${n}`, created_time: meta(hhmm), message: `T${n} https://radarbalcarce.com/nota/n${n}`, permalink_url: `https://www.facebook.com/x/posts/${n}` });
  return armarMeta({
    fbPosteos: { data: [['08:02', 1], ['09:34', 2], ['11:05', 3], ['12:45', 4], ['14:32', 5]].map(([h, n]) => nota(h, n)) },
    fbReels: { data: ['10:05', '15:03', '20:37'].map((h, i) => ({ id: `r${i}`, created_time: meta(h) })) },
    fbHistorias: { data: ['07:33', '10:06', '15:04', '19:02', '20:02'].map((h) => ({ creation_time: unix(h), status: 'published' })) },
    igMedia: { data: [
      ...['08:02', '09:34', '11:05', '12:45', '14:32'].map((h, i) => ({ id: `f${i}`, media_product_type: 'FEED', timestamp: meta(h) })),
      ...['10:04', '15:03', '20:36'].map((h, i) => ({ id: `q${i}`, media_product_type: 'REELS', timestamp: meta(h) })),
    ] },
    igHistorias: { data: ['07:33', '10:04', '15:03', '19:02', '20:02'].map((h, i) => ({ id: `s${i}`, timestamp: meta(h) })) },
  });
}

/** El 25/09 completo: el libro real más la historia del podcast de la noche. */
function libroDelDiaCompleto() {
  const libro = JSON.parse(JSON.stringify(REAL));
  for (const red of ['instagram', 'facebook']) libro.historiasDeReels[`${red}/${D}/podcast`] = { cuando: AR(D, '20:38').toISOString(), mediaId: `H-${red}`, nombre: 'podcast', red };
  return libro;
}
function metaCompleta() {
  const m = metaQueCuadra();
  m.facebook.historias.push({ cuando: AR(D, '20:38').toISOString(), id: 'h' });
  m.instagram.historias.push({ cuando: AR(D, '20:38').toISOString(), id: 'h' });
  return m;
}

// ------------------------------------------------------- cuándo toca el cierre

test('el cierre toca una sola vez por día, a partir de las 23:30', () => {
  assert.equal(fechaDelCierre(AR(D, '23:29'), {}), null);
  assert.equal(fechaDelCierre(AR(D, '23:30'), {}), D);
  assert.equal(fechaDelCierre(AR(D, '23:59'), {}), D);
  assert.equal(fechaDelCierre(AR(D, '23:45'), { ultimoCierre: D }), null, 'no se repite');
  assert.equal(fechaDelCierre(AR(D, '12:00'), {}), null);
});

test('si la corrida de las 23:30 se demoró y llegó pasada la medianoche, cierra el día de ayer (hasta las 3)', () => {
  assert.equal(fechaDelCierre(AR('2026-09-26', '00:10'), { ultimoCierre: '2026-09-24' }), D);
  assert.equal(fechaDelCierre(AR('2026-09-26', '00:10'), { ultimoCierre: D }), null);
  assert.equal(fechaDelCierre(AR('2026-09-26', '02:59'), {}), D);
  assert.equal(fechaDelCierre(AR('2026-09-26', '03:00'), {}), null, 'a esa hora ya no se ven las historias de la mañana');
});

test('antes del 25/09 no rige el contrato: no hay cierre', () => {
  assert.equal(fechaDelCierre(AR('2026-09-24', '23:40'), {}), null);
});

// ---------------------------------------------------------------- el cierre

test('cierre con todo en orden: sin mensaje propio, y la línea "completos ✓" para el próximo mensaje normal', () => {
  const c = cierreDelDia({ fecha: D, ahora: AR(D, '23:30'), libro: libroDelDiaCompleto(), meta: metaCompleta() });
  assert.equal(c.ok, true, c.informe.discrepancias.join(' | '));
  assert.equal(c.texto, '');
  assert.equal(c.linea, 'Cierre del día: Facebook e Instagram completos ✓');
});

test('cierre del 25/09 tal como fue: falta la historia de la noche', () => {
  const c = cierreDelDia({ fecha: D, ahora: AR(D, '23:30'), libro: REAL, meta: metaQueCuadra() });
  assert.equal(c.ok, false);
  assert.match(c.texto, /^🔎 Cierre del día/);
  assert.match(c.texto, /Facebook: falta la historia de podcast noche \(era de las 20:30\)/);
  assert.match(c.texto, /Instagram: falta la historia de podcast noche/);
});

test('al cerrar, lo que estaba "a tiempo" a las 23:30 ya cuenta como faltante (nada sale al día siguiente)', () => {
  const libro = libroDelDiaCompleto();
  for (const s of ['instagram', 'facebookVideos']) delete libro[s][`${D}/farmacia`];
  const c = cierreDelDia({ fecha: D, ahora: AR(D, '23:30'), libro, meta: null });
  assert.ok(c.informe.discrepancias.some((d) => /falta la historia de farmacia \(era de las 19:00\)/.test(d)));
});

test('cierre: Meta y el libro que no coinciden (libro sin Meta) se avisan', () => {
  const m = metaCompleta();
  m.facebook.posteos.pop(); // el libro dice que salió el de las 14:32
  const c = cierreDelDia({ fecha: D, ahora: AR(D, '23:30'), libro: libroDelDiaCompleto(), meta: m });
  assert.equal(c.ok, false);
  assert.match(c.texto, /el libro dice que salió el posteo de las 14:32/);
});

// ---------------------------------------------------- lo que sale en el mensaje

const base = { ahora: AR(D, '23:35'), portada: { notas: [] }, libro: {}, problemas: [] };
/** El resumen de las 21 ya salió: lo que se prueba es lo que viene después. */
const yaResumido = { avisos: {}, ultimoResumen: D };

test('cierre con discrepancias: va en el mismo mensaje, detrás de los problemas, y se anota al salir', () => {
  const cierre = cierreDelDia({ fecha: D, ahora: AR(D, '23:30'), libro: REAL, meta: metaQueCuadra() });
  const estado = { avisos: {} };
  const plan = planDeAvisos({ ...base, estado, cierre, problemas: [{ clave: 'x', nivel: 'alta', texto: 'La web no responde.' }] });
  assert.deepEqual(plan.secciones.map((s) => s.clave).slice(0, 2), ['problemas', 'cierre']);
  const { texto, incluidas } = armarMensaje(plan.secciones);
  assert.ok(incluidas.includes('cierre'));
  assert.match(texto, /^⚠️/);
  assert.equal((texto.match(/Cierre del día/g) ?? []).length, 1);
  plan.anotar(estado, incluidas);
  assert.equal(estado.ultimoCierre, D);
  assert.equal(fechaDelCierre(AR(D, '23:45'), estado), null, 'no se repite el aviso');
});

test('cierre con discrepancias y nada más: el mensaje es el cierre, con su propio título', () => {
  const cierre = cierreDelDia({ fecha: D, ahora: AR(D, '23:30'), libro: REAL, meta: metaQueCuadra() });
  const plan = planDeAvisos({ ...base, estado: { avisos: {} }, cierre });
  const { texto } = armarMensaje(plan.secciones);
  assert.match(texto, /^🔎 Cierre del día/);
});

test('cierre limpio: NO genera un mensaje propio', () => {
  const cierre = cierreDelDia({ fecha: D, ahora: AR(D, '23:30'), libro: libroDelDiaCompleto(), meta: metaCompleta() });
  const plan = planDeAvisos({ ...base, libro: libroDelDiaCompleto(), estado: { ...yaResumido }, cierre });
  assert.deepEqual(plan.secciones, [], 'sin nada más que decir, no se manda nada');
});

test('la línea de "completos ✓" viaja dentro del próximo mensaje normal, una sola vez', () => {
  const estado = { ...yaResumido, cierreOk: { fecha: D, linea: 'Cierre del día: Facebook e Instagram completos ✓' } };
  // Sin nada más que decir, no sale.
  assert.deepEqual(planDeAvisos({ ...base, estado }).secciones, []);
  // Con un mensaje normal (las estadísticas de la mañana), va adentro.
  const plan = planDeAvisos({ ...base, ahora: AR('2026-09-26', '09:00'), estado, estadisticas: '📊 Estadísticas de la mañana\nWeb: 10 visitas' });
  assert.deepEqual(plan.secciones.map((s) => s.clave), ['estadisticas', 'cierre-ok']);
  const { texto, incluidas } = armarMensaje(plan.secciones);
  assert.match(texto, /✓ Cierre del día: Facebook e Instagram completos ✓/);
  plan.anotar(estado, incluidas);
  assert.equal(estado.cierreOk, undefined, 'una vez');
  // Con la línea anotada, el mensaje siguiente no la repite.
  assert.deepEqual(planDeAvisos({ ...base, ahora: AR('2026-09-26', '10:00'), estado, estadisticas: 'x' }).secciones.map((s) => s.clave), ['estadisticas']);
});

test('el resumen de las 21 lleva el contrato completo, y el mensaje entero cabe en WhatsApp', () => {
  const plan = planDeAvisos({ ...base, ahora: AR(D, '21:00'), libro: REAL, estado: { avisos: {} }, estadisticas: '📊 Estadísticas\nWeb: 120 visitas · Facebook: 3 seguidores · Instagram: 4 seguidores' });
  const resumen = plan.secciones.find((s) => s.clave === 'resumen').texto;
  assert.match(resumen, /• Facebook: posteos 5\/5 · reels 3\/3 · historias 5\/6/);
  assert.match(resumen, /• Instagram: fotos 5\/5 · reels 3\/3 · historias 5\/6/);
  assert.ok(armarMensaje(plan.secciones).texto.length <= 1000);
});

// ------------------------------------------------- los problemas del contrato

test('un duplicado en el libro es de prioridad alta y se avisa enseguida', () => {
  const libro = libroDelDiaCompleto();
  libro.facebookVideos[`${D}/noticia1-bis`] = { ...libro.facebookVideos[`${D}/noticia1`] };
  const contrato = contratoDelDia({ libro, fecha: D, ahora: AR(D, '10:30') });
  const p = problemasDelContrato(contrato).filter((x) => x.clave.startsWith('duplicado-'));
  assert.equal(p.length, 1);
  assert.equal(p[0].nivel, 'alta');
  assert.match(p[0].texto, /^Facebook: DUPLICADO/);
  // Y llega hasta `evaluar` (un problema más de la corrida, sin esperar al cierre).
  const hace = (m) => new Date(AR(D, '10:30').getTime() - m * 60000).toISOString();
  const r = evaluar({
    ahora: AR(D, '10:30'), web: { estado: 200, actualizado: hace(20) }, www: { redirige: true }, libro, contrato,
    corridas: { Redes: [{ createdAt: hace(10), conclusion: 'success', status: 'completed' }] },
  });
  assert.ok(r.some((x) => x.nivel === 'alta' && x.clave.startsWith('duplicado-facebook')));
});

test('un podcast que no salió, con su ventana cerrada, es un problema (antes nadie lo miraba)', () => {
  const libro = libroDelDiaCompleto();
  for (const s of ['instagram', 'facebookVideos']) delete libro[s][`${D}/noticia2`];
  for (const k of Object.keys(libro.historiasDeReels)) if (k.endsWith('noticia2')) delete libro.historiasDeReels[k];
  const p = problemasDelContrato(contratoDelDia({ libro, fecha: D, ahora: AR(D, '20:05') }));
  assert.deepEqual(p.map((x) => x.clave).sort(), [
    'falta-facebook-historia:noticia2', 'falta-facebook-reel:noticia2', 'falta-instagram-historia:noticia2', 'falta-instagram-reel:noticia2',
  ]);
  assert.match(p.find((x) => x.clave === 'falta-facebook-reel:noticia2').texto, /no salió el reel de podcast tarde de las 15:00/);
  // A las 19:00 todavía estaba a tiempo: sin problema.
  assert.deepEqual(problemasDelContrato(contratoDelDia({ libro, fecha: D, ahora: AR(D, '17:00') })), []);
});

test('la historia de un podcast cuyo reel salió y ella no, se avisa enseguida (no se reintenta)', () => {
  const p = problemasDelContrato(contratoDelDia({ libro: REAL, fecha: D, ahora: AR(D, '21:15') }));
  const h = p.filter((x) => x.clave.endsWith('historia:podcast'));
  assert.equal(h.length, 2);
  assert.ok(h.every((x) => x.nivel === 'alta' && /no se reintenta/.test(x.texto) && /60 segundos/.test(x.texto)));
});

test('no repite lo que evaluar ya vigila: el clima y la farmacia de Instagram tienen su propia clave', () => {
  const libro = libroDelDiaCompleto();
  delete libro.instagram[`${D}/farmacia`];
  const claves = problemasDelContrato(contratoDelDia({ libro, fecha: D, ahora: AR(D, '23:00') })).map((x) => x.clave);
  assert.ok(!claves.includes('falta-instagram-historia:farmacia'));
});

test('con el contrato completo no hay problemas', () => {
  assert.deepEqual(problemasDelContrato(contratoDelDia({ libro: libroDelDiaCompleto(), fecha: D, ahora: AR(D, '23:00') })), []);
});
