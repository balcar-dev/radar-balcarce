// Los avisos nuevos del vigilante (25/09): notas que esperan a una persona,
// noticia de Balcarce muy importante, lo que salió en redes, el resumen de las
// 21 y cómo se junta todo en UN solo WhatsApp por corrida.
// Todo con datos inventados, sin red y sin mandar nada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  pendientesDeLaIngesta, pendientesAAvisar, textoPendientes, anotarPendientes, LIMITES_AVISOS,
  importantesAAvisar, textoImportantes, anotarImportantes, IMPORTANTE,
  novedadesEnRedes, textoRedes, datosDelDia, armarMensaje, recortar,
} from '../redes/avisos.mjs';
import { planDeAvisos, mensajeDelResumen } from '../redes/vigilar.mjs';
import { LARGO_MAXIMO } from '../redes/whatsapp.mjs';

/** Una hora de Balcarce del 25/09/2026. */
const A = (hhmm) => new Date(`2026-09-25T${hhmm}:00-03:00`);
const hace = (ahora, minutos) => new Date(ahora.getTime() - minutos * 60000).toISOString();

// ------------------------------------------------ notas esperando a una persona

const deIngesta = (id, o = {}) => ({
  id, titulo: `Titular de la nota ${id}`, semaforo: 'amarillo', motivo: 'sección general, sin regla verde',
  seccion: 'Balcarce', fecha: hace(A('12:00'), 60), ...o,
});

test('pendientes: sólo las amarillas sin decidir; nunca una roja ni una verde', () => {
  const r = pendientesDeLaIngesta([
    deIngesta('a'), deIngesta('b', { semaforo: 'rojo', motivo: 'tema sensible: "x"' }), deIngesta('c', { semaforo: 'verde' }),
  ], {}, A('12:00'));
  assert.deepEqual(r.map((p) => p.id), ['a']);
});

test('pendientes: el relleno de afuera (poco puntaje, cupo) no es para una persona', () => {
  const r = pendientesDeLaIngesta([
    deIngesta('a', { motivo: 'de afuera y con poco puntaje (40 de 50)' }),
    deIngesta('b', { motivo: 'pasó el cupo de País de afuera (3 por vuelta)' }),
    deIngesta('c', { motivo: 'necesita ojo humano: "murió"' }),
  ], {}, A('12:00'));
  assert.deepEqual(r.map((p) => p.id), ['c']);
});

test('pendientes: lo que ya decidió una persona no espera; lo que marcó "pendiente", sí', () => {
  const r = pendientesDeLaIngesta([deIngesta('a'), deIngesta('b', { semaforo: 'verde' })], {
    a: { estado: 'publicada', por: 'Andrés' },
    b: { estado: 'pendiente', por: 'Hernán' },
  }, A('12:00'));
  assert.deepEqual(r.map((p) => p.id), ['b']);
  assert.match(r[0].motivo, /panel/);
});

test('pendientes: una decisión de la IA no cuenta como de una persona', () => {
  const r = pendientesDeLaIngesta([deIngesta('a')], { a: { estado: 'automatica', por: 'ia' } }, A('12:00'));
  assert.deepEqual(r.map((p) => p.id), ['a']);
});

test('pendientes: lo de más de tres días no se cuenta (el panel lo archiva solo)', () => {
  const r = pendientesDeLaIngesta([deIngesta('a', { fecha: hace(A('12:00'), 73 * 60) })], {}, A('12:00'));
  assert.equal(r.length, 0);
});

test('pendientes: portada.json es público; el titular va recortado y NO va en Policiales ni si habla de chicos o víctimas', () => {
  const largo = 'Un titular larguísimo que tiene bastante más de sesenta letras para ver que se recorte bien';
  const r = pendientesDeLaIngesta([
    deIngesta('a', { titulo: largo }),
    deIngesta('b', { seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"' }),
    deIngesta('c', { motivo: 'necesita ojo humano: "víctima"' }),
    deIngesta('d', { motivo: 'necesita ojo humano: "menores de edad"' }),
    deIngesta('e', { motivo: 'necesita ojo humano: "niña"' }),
  ], {}, A('12:00'));
  assert.ok(r[0].titulo.length <= LIMITES_AVISOS.largoTitularPendiente, 'no recortó');
  assert.match(r[0].titulo, /…$/);
  for (const p of r.slice(1)) assert.equal(p.titulo, null, `la ${p.id} salió con titular`);
  // Sólo lo liviano: id, titular, sección y motivo.
  assert.deepEqual(Object.keys(r[0]).sort(), ['id', 'motivo', 'seccion', 'titulo']);
});

const P = (id, titulo = `Nota ${id}`) => ({ id, titulo, seccion: 'Balcarce', motivo: 'x' });

test('pendientes: se avisa cuando hay nuevas, y no se repite', () => {
  const ahora = A('12:00');
  const lista = [P('a'), P('b')];
  const r = pendientesAAvisar(lista, {}, ahora);
  assert.equal(r.total, 2);
  assert.equal(r.nuevos.length, 2);
  const guardado = anotarPendientes(lista, ahora);
  assert.equal(pendientesAAvisar(lista, guardado, A('18:00')), null, 'repitió las mismas');
});

test('pendientes: una nueva antes de las tres horas espera; después, se avisa', () => {
  const guardado = anotarPendientes([P('a')], A('12:00'));
  assert.equal(pendientesAAvisar([P('a'), P('b')], guardado, A('14:00')), null);
  const r = pendientesAAvisar([P('a'), P('b')], guardado, A('15:01'));
  assert.deepEqual(r.nuevos.map((p) => p.id), ['b']);
  assert.equal(r.total, 2);
});

test('pendientes: el mensaje lista hasta cinco, dice cuántas más y que se aprueban en el panel', () => {
  const nuevos = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((x) => P(x));
  nuevos[1] = { ...nuevos[1], titulo: null, seccion: 'Policiales' };
  const t = textoPendientes({ total: 9, nuevos });
  assert.match(t, /9 nota\(s\) esperando a una persona \(7 nueva\(s\)\)/);
  assert.equal((t.match(/^• /gm) ?? []).length, 5);
  assert.match(t, /…y 2 más/);
  assert.match(t, /panel, en la PC de Hernán/);
  assert.match(t, /Tema delicado.*\(Policiales\)/);
});

// ------------------------------------------ noticia de Balcarce muy importante

const nota = (id, o = {}) => ({
  id, titulo: `Algo muy importante número ${id} en la ciudad`, local: true, relevancia: 100,
  medios: ['La Vanguardia', 'Puntonueve', 'El Diario'], seccion: 'Balcarce', visto: hace(A('12:00'), 30), temas: [], ...o,
});

test('importante: local, relevancia 100 y contada por tres medios o más', () => {
  const ahora = A('12:00');
  const r = importantesAAvisar([
    nota('si'),
    nota('pocos', { medios: ['La Vanguardia', 'Puntonueve'] }),
    nota('afuera', { local: false }),
    nota('baja', { relevancia: 96 }),
  ], {}, ahora);
  assert.deepEqual(r.map((n) => n.id), ['si']);
  assert.equal(IMPORTANTE.relevanciaMinima, 100);
  assert.equal(IMPORTANTE.mediosMinimos, 3);
});

test('importante: sólo lo que entró hace poco (no lo de ayer al estrenar el aviso)', () => {
  const ahora = A('12:00');
  assert.equal(importantesAAvisar([nota('vieja', { visto: hace(ahora, 5 * 60) })], {}, ahora).length, 0);
  // Una que se aprobó recién en el panel entra ahora, aunque se haya visto antes.
  assert.equal(importantesAAvisar([nota('aprobada', { visto: hace(ahora, 5 * 60), publicadaCuando: hace(ahora, 10) })], {}, ahora).length, 1);
});

test('importante: una vez por nota, dos por día como mucho y sin repetir tema', () => {
  const ahora = A('12:00');
  let previo = anotarImportantes({}, [nota('a', { titulo: 'Reabre el autódromo Fangio este viernes' })], A('09:00'));
  assert.equal(importantesAAvisar([nota('a')], previo, ahora).length, 0, 'repitió la misma');
  const mismoTema = nota('b', { titulo: 'Todo listo para la reapertura del autódromo Fangio' });
  assert.equal(importantesAAvisar([mismoTema], previo, ahora).length, 0, 'repitió el tema');
  previo = anotarImportantes(previo, [nota('c', { titulo: 'El Senado aprobó la ley de Zona Fría' })], A('10:00'));
  assert.equal(importantesAAvisar([nota('d', { titulo: 'Inauguraron el nuevo hospital municipal' })], previo, ahora).length, 0, 'pasó el tope diario');
  assert.equal(importantesAAvisar([nota('d', { titulo: 'Inauguraron el nuevo hospital municipal', visto: hace(A('09:00'), -24 * 60) })], previo, new Date(A('09:00').getTime() + 24 * 3600e3 + 30 * 60000)).length, 1, 'al otro día vuelve a haber cupo');
});

test('importante: el mensaje trae el enlace a NUESTRA nota y marca lo de Policiales como sensible', () => {
  const t = textoImportantes([nota('abc', { slug: 'algo-importante' }), nota('xyz', { seccion: 'Policiales', slug: 'un-hecho' })]);
  assert.match(t, /https:\/\/radarbalcarce\.com\/nota\/algo-importante-abc/);
  assert.match(t, /\(sensible\)\nhttps:\/\/radarbalcarce\.com\/nota\/un-hecho-xyz/);
  assert.ok(!/\(sensible\)\nhttps:\/\/radarbalcarce\.com\/nota\/algo/.test(t));
});

// ------------------------------------------------------ lo que salió en redes

const LIBRO = {
  facebook: {
    n1: { cuando: '2026-09-25T13:05:00.000Z', titulo: 'Reabre el autódromo Fangio' },
    viejo: { cuando: '2026-09-24T13:05:00.000Z', titulo: 'Algo de ayer' },
  },
  instagramFeed: { n1: { cuando: '2026-09-25T13:05:30.000Z', titulo: 'Reabre el autódromo Fangio' } },
  instagram: { '2026-09-25/podcast': { cuando: '2026-09-25T23:31:00.000Z', nombre: 'podcast', tipo: 'REELS' } },
  facebookVideos: { '2026-09-25/podcast': { cuando: '2026-09-25T23:32:00.000Z', nombre: 'podcast', tipo: 'REELS' } },
  historiasDeReels: { 'instagram/2026-09-25/podcast': { cuando: '2026-09-25T23:33:00.000Z', nombre: 'podcast', red: 'instagram' } },
};

test('redes: sólo lo nuevo desde la corrida anterior, agrupado por pieza', () => {
  const r = novedadesEnRedes(LIBRO, '2026-09-25T12:00:00.000Z');
  assert.equal(r.items.length, 2);
  const [posteo, podcast] = r.items;
  assert.deepEqual(posteo.redes, ['Facebook', 'Instagram']);
  assert.deepEqual(posteo.tipos, ['posteo', 'foto']);
  assert.equal(podcast.etiqueta, 'Podcast de la noche');
  assert.deepEqual(podcast.redes, ['Instagram', 'Facebook']);
  assert.deepEqual(podcast.tipos, ['reel', 'historia']);
  assert.equal(r.hasta, '2026-09-25T23:33:00.000Z');
  assert.equal(novedadesEnRedes(LIBRO, r.hasta).items.length, 0, 'repetiría lo ya avisado');
});

test('redes: UN mensaje con la hora de Balcarce de cada cosa', () => {
  const t = textoRedes(novedadesEnRedes(LIBRO, '2026-09-25T12:00:00.000Z').items);
  assert.match(t, /^📣 Salió en redes:/);
  assert.match(t, /• 10:05 Reabre el autódromo Fangio — Facebook y Instagram \(posteo, foto\)/);
  assert.match(t, /• 20:31 Podcast de la noche — Instagram y Facebook \(reel, historia\)/);
});

// ------------------------------------------------------ el resumen de las 21

const PORTADA = {
  notas: [
    { id: '1', local: true, cuerpo: 'x', visto: '2026-09-25T12:00:00.000Z' },
    { id: '2', local: false, cuerpo: null, visto: '2026-09-25T14:00:00.000Z' },
    { id: '3', local: true, cuerpo: 'x', visto: '2026-09-24T14:00:00.000Z' },
  ],
  pendientes: [P('a'), P('b'), P('c')],
};

test('resumen: cuenta las notas del día, las locales, las que tienen cuerpo y lo que espera', () => {
  const d = datosDelDia({ ahora: A('21:00'), portada: PORTADA, libro: LIBRO });
  assert.deepEqual({ notas: d.notas, locales: d.locales, conCuerpo: d.conCuerpo, pendientes: d.pendientes }, { notas: 2, locales: 1, conCuerpo: 1, pendientes: 3 });
  assert.equal(d.facebook, 1);
  assert.equal(d.instagramFotos, 1);
  assert.equal(d.piezas.podcast, true);
  assert.equal(d.piezas['clima-manana'], false);
});

test('resumen: con problemas abiertos los lista, y trae las estadísticas', () => {
  const m = mensajeDelResumen({
    ahora: A('21:00'), portada: PORTADA, libro: LIBRO, web: null,
    problemas: [{ clave: 'x', nivel: 'alta', texto: 'La web no responde.' }], estadisticas: '📊 Estadísticas\nWeb: …',
  });
  assert.match(m, /^📋 Radar Balcarce: resumen del día/);
  assert.match(m, /Notas nuevas hoy: 2 \(1 de Balcarce\), 1 con cuerpo/);
  assert.match(m, /Esperando a una persona: 3/);
  assert.match(m, /Problemas abiertos \(1\):\n {2}- La web no responde\./);
  assert.match(m, /podcast noche ✓/);
  assert.match(m, /📊 Estadísticas/);
});

// ------------------------------------------------------ un solo mensaje

test('un solo mensaje: todo junto, en orden, y nunca más largo de lo que acepta CallMeBot', () => {
  const r = armarMensaje([
    { clave: 'problemas', texto: '⚠️ Radar Balcarce: hay un problema\n\n• x' },
    { clave: 'importantes', texto: '📰 algo' },
    { clave: 'redes', texto: 'r'.repeat(2000) },
  ]);
  assert.deepEqual(r.incluidas, ['problemas', 'importantes']);
  assert.ok(r.texto.length <= LARGO_MAXIMO);
  assert.match(r.texto, /^⚠️/);
});

test('un solo mensaje: sin problemas ni resumen arriba, lleva el nombre del medio', () => {
  const r = armarMensaje([{ clave: 'redes', texto: '📣 Salió en redes:\n• x' }]);
  assert.match(r.texto, /^Radar Balcarce\n\n📣/);
});

test('un solo mensaje: la primera sección sale aunque sea larga (un problema no se calla por largo)', () => {
  const r = armarMensaje([{ clave: 'problemas', texto: 'p'.repeat(3000) }]);
  assert.deepEqual(r.incluidas, ['problemas']);
  assert.ok(r.texto.length <= LARGO_MAXIMO);
});

test('un solo mensaje: nada que decir, nada que mandar', () => {
  assert.deepEqual(armarMensaje([]), { texto: '', incluidas: [] });
});

// ---------------------------------------------------- el plan de cada corrida

test('plan: junta problemas, importante, pendientes y redes, y sólo anota lo que entró en el mensaje', () => {
  const ahora = A('12:00');
  const portada = { notas: [nota('imp')], pendientes: [P('a')] };
  const estado = { avisos: {}, redes: { hasta: '2026-09-25T12:00:00.000Z' } };
  const plan = planDeAvisos({
    ahora, estado, portada, libro: LIBRO, problemas: [{ clave: 'web-caida', nivel: 'alta', texto: 'La web no responde.' }],
  });
  assert.deepEqual(plan.secciones.map((s) => s.clave), ['problemas', 'importantes', 'pendientes', 'redes']);
  plan.anotar(estado, ['problemas', 'importantes']);
  assert.ok(estado.avisos['web-caida']);
  assert.ok(estado.importantes.avisadas.imp);
  assert.equal(estado.pendientes, undefined, 'anotó algo que no se mandó');
  assert.equal(estado.redes.hasta, '2026-09-25T12:00:00.000Z', 'movió la marca de redes sin avisar');
});

test('plan: a las 21 va el resumen aunque haya problemas; a las 9, las estadísticas solas', () => {
  const problemas = [{ clave: 'x', nivel: 'media', texto: 'algo' }];
  const noche = planDeAvisos({ ahora: A('21:05'), estado: { avisos: { x: hace(A('21:05'), 10) } }, portada: {}, libro: {}, problemas, estadisticas: '📊 E' });
  assert.deepEqual(noche.secciones.map((s) => s.clave), ['resumen']);
  assert.match(noche.secciones[0].texto, /📊 E/);
  const manana = planDeAvisos({ ahora: A('09:05'), estado: {}, portada: {}, libro: {}, estadisticas: '📊 E' });
  assert.deepEqual(manana.secciones.map((s) => s.clave), ['estadisticas']);
});

test('plan: el resumen sale una vez por día', () => {
  const estado = {};
  const plan = planDeAvisos({ ahora: A('21:05'), estado, portada: {}, libro: {} });
  plan.anotar(estado, ['resumen']);
  assert.deepEqual(planDeAvisos({ ahora: A('21:35'), estado, portada: {}, libro: {} }).secciones, []);
});

test('plan: la prueba del resumen trae sólo el resumen, aunque haya otras cosas', () => {
  const plan = planDeAvisos({
    ahora: A('11:00'), estado: {}, portada: { notas: [nota('imp', { visto: hace(A('11:00'), 10) })], pendientes: [P('a')] }, libro: LIBRO,
    problemas: [{ clave: 'x', nivel: 'alta', texto: 'algo' }], soloResumen: true,
  });
  assert.deepEqual(plan.secciones.map((s) => s.clave), ['resumen']);
});

test('plan: la primera vez sin marca de redes no manda todo el libro', () => {
  const plan = planDeAvisos({ ahora: A('21:00'), estado: { ultimoResumen: '2026-09-25' }, portada: {}, libro: LIBRO });
  const redes = plan.secciones.find((s) => s.clave === 'redes');
  assert.ok(redes, 'no avisó lo de la última hora');
  assert.ok(!/Reabre el autódromo/.test(redes.texto), 'mandó lo de hace horas');
});

// -------------------------------------------------------------- lo cableado

const leer = (f) => fs.readFileSync(path.join(import.meta.dirname, '..', f), 'utf8');

test('generar-datos escribe las pendientes en portada.json con la función que cuida lo público', () => {
  const s = leer('web/scripts/generar-datos.mjs');
  assert.match(s, /pendientes: pendientesDeLaIngesta\(/);
});

test('el vigilante manda UN solo WhatsApp por corrida', () => {
  const s = leer('redes/vigilar.mjs');
  assert.equal((s.match(/enviarWhatsApp\(/g) ?? []).length, 1);
});

test('recortar corta en palabra entera', () => {
  assert.equal(recortar('uno dos tres cuatro', 12), 'uno dos…');
  assert.equal(recortar('corto', 60), 'corto');
});
