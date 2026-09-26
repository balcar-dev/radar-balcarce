// El contrato del día de Facebook e Instagram (redes/contrato.mjs): qué salió,
// qué falta, qué está duplicado y qué todavía está a tiempo. Sin red.
//
// Los casos "reales" usan un fragmento del libro verdadero del 24 y 25/09
// (pruebas/libro-real-24-25-09.json): el 25/09 el podcast de la noche no tuvo
// historia (el video duraba 62,7 s y las historias aceptan 61) y el repaso de
// la mañana salió dos veces (eso el libro no lo muestra: lo ve Meta).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  contratoDelDia, piezasDelContrato, estadoDeLaPieza, textoContrato, lineaDeRed, contratoCompleto,
  candidatasSinPublicar, PODCASTS, CONTRATO_DESDE,
} from '../redes/contrato.mjs';
import { CONTRATO_DIARIO } from '../ingesta/criterio.mjs';
import { HORAS_REELS } from '../redes/piezas.mjs';

const REAL = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'libro-real-24-25-09.json'), 'utf8'));
const AR = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-03:00`);
const UTC = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-03:00`).toISOString();

/** Un día ENTERO y sano, armado a mano, para las dos redes. */
function libroCompleto(fecha) {
  const libro = { facebook: {}, instagramFeed: {}, instagram: {}, facebookVideos: {}, historiasDeReels: {} };
  ['a', 'b', 'c', 'd', 'e'].forEach((id, i) => {
    const cuando = UTC(fecha, `${String(9 + i * 2).padStart(2, '0')}:00`);
    libro.facebook[`${fecha}-${id}`] = { cuando, titulo: `Nota ${id}`, enlace: `https://radarbalcarce.com/nota/${fecha}-${id}` };
    libro.instagramFeed[`${fecha}-${id}`] = { cuando, titulo: `Nota ${id}`, enlace: `https://radarbalcarce.com/nota/${fecha}-${id}` };
  });
  const piezas = [
    ['clima-manana', 'STORIES', '07:31'], ['noticia1', 'REELS', '10:02'], ['noticia2', 'REELS', '15:02'],
    ['farmacia', 'STORIES', '19:02'], ['clima-noche', 'STORIES', '20:02'], ['podcast', 'REELS', '20:36'],
  ];
  let n = 0;
  for (const [nombre, tipo, hora] of piezas) {
    for (const [seccion, prefijo] of [['instagram', 'IG'], ['facebookVideos', 'FB']]) {
      n += 1;
      libro[seccion][`${fecha}/${nombre}`] = { cuando: UTC(fecha, hora), mediaId: `${prefijo}${n}`, nombre, tipo };
    }
    if (tipo === 'REELS') {
      for (const red of ['instagram', 'facebook']) {
        n += 1;
        libro.historiasDeReels[`${red}/${fecha}/${nombre}`] = { cuando: UTC(fecha, hora), mediaId: `H${n}`, nombre, red };
      }
    }
  }
  return libro;
}

test('el contrato tiene los números del criterio: 3 reels, 6 historias (3 + 2 + 1), 5 posteos', () => {
  assert.equal(CONTRATO_DIARIO.reelsPorDia, HORAS_REELS.length);
  assert.equal(CONTRATO_DIARIO.reelsPorDia, PODCASTS.length);
  assert.equal(CONTRATO_DIARIO.historiasPorDia, CONTRATO_DIARIO.historiasDePodcast + CONTRATO_DIARIO.historiasDeClima + CONTRATO_DIARIO.historiasDeFarmacia);
  const piezas = piezasDelContrato('2026-09-23').filter((p) => !p.semanal);
  assert.equal(piezas.filter((p) => p.grupo === 'reel').length, 3);
  assert.equal(piezas.filter((p) => p.grupo === 'historia-podcast').length, 3);
  assert.equal(piezas.filter((p) => p.grupo === 'clima').length, 2);
  assert.equal(piezas.filter((p) => p.grupo === 'farmacia').length, 1);
  // Las horas del contrato: podcasts 10:00, 15:00 y 20:30; clima 7:30 y 20:00; farmacia 19:00.
  const hora = (id) => piezas.find((p) => p.id === id).hora;
  assert.deepEqual([hora('reel:noticia1'), hora('reel:noticia2'), hora('reel:podcast')], ['10:00', '15:00', '20:30']);
  assert.deepEqual([hora('historia:clima-manana'), hora('historia:clima-noche'), hora('historia:farmacia')], ['07:30', '20:00', '19:00']);
  assert.equal(CONTRATO_DIARIO.posteosPorDia, 5);
});

test('un día completo: todo salió, nada falta, nada duplicado, en las dos redes', () => {
  const libro = libroCompleto('2026-09-23');
  const c = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-23', '23:50') });
  for (const red of [c.facebook, c.instagram]) {
    assert.equal(red.posteos.salieron, 5, red.nombre);
    assert.equal(red.posteos.estado, 'completo');
    assert.equal(red.reels.salieron, 3);
    assert.equal(red.historias.salieron, 6);
    assert.deepEqual(red.faltan, []);
    assert.deepEqual(red.pendientes, []);
    assert.deepEqual(red.duplicadas, []);
    assert.equal(red.completo, true);
  }
  assert.equal(contratoCompleto(c), true);
  assert.equal(textoContrato(c), '• Facebook: posteos 5/5 · reels 3/3 · historias 6/6\n• Instagram: fotos 5/5 · reels 3/3 · historias 6/6');
});

test('el 25/09 real: el podcast de la noche salió, su historia no, y el contrato lo dice', () => {
  const c = contratoDelDia({ libro: REAL, fecha: '2026-09-25', ahora: AR('2026-09-25', '23:30') });
  for (const red of [c.facebook, c.instagram]) {
    assert.equal(red.posteos.salieron, 5);
    assert.equal(red.reels.salieron, 3);
    assert.equal(red.historias.salieron, 5, `${red.nombre}: 5 de las 6 historias`);
    assert.deepEqual(red.faltan.map((p) => p.id), ['historia:podcast']);
    // No es "pendiente": el reel ya salió y el reloj no rearma un podcast que salió.
    assert.equal(red.faltan[0].fase, 'no-se-reintenta');
    assert.equal(red.faltan[0].hora, '20:30');
    assert.equal(red.completo, false);
  }
  assert.equal(contratoCompleto(c), false);
  assert.match(lineaDeRed(c.facebook), /historias 5\/6 \(falta: podcast noche\)/);
});

test('el 25/09 a las 21: lo que todavía está a tiempo es "pendiente", no "falta"', () => {
  // El libro real, pero como estaba a las 20:10 (antes del podcast de la noche).
  const libro = JSON.parse(JSON.stringify(REAL));
  for (const seccion of ['instagram', 'facebookVideos']) delete libro[seccion]['2026-09-25/podcast'];
  const c = contratoDelDia({ libro, fecha: '2026-09-25', ahora: AR('2026-09-25', '20:10') });
  assert.deepEqual(c.instagram.pendientes.map((p) => p.id).sort(), ['historia:podcast', 'reel:podcast']);
  assert.deepEqual(c.instagram.faltan, []);
  assert.ok(c.instagram.pendientes.every((p) => p.fase === 'futura'), 'todavía no era la hora del podcast (20:30)');
  assert.equal(c.instagram.completo, true, 'nada vencido falta: el día va bien');
  assert.match(textoContrato(c), /reels 2\/3 \(pendiente: noche\)/);
});

test('el 24/09 real: sin clima de la mañana ni podcast de la mañana, y un posteo sin su foto en Instagram', () => {
  const c = contratoDelDia({ libro: REAL, fecha: '2026-09-24', ahora: AR('2026-09-25', '10:00') });
  assert.equal(c.facebook.posteos.salieron, 5);
  assert.equal(c.instagram.posteos.salieron, 4);
  assert.deepEqual(c.instagram.posteos.sinEspejo.map((e) => e.id), ['yaqf3p']);
  assert.deepEqual(c.facebook.faltan.map((p) => p.id).sort(), ['historia:clima-manana', 'historia:noticia1', 'reel:noticia1']);
  assert.equal(c.instagram.completo, false);
  assert.match(lineaDeRed(c.instagram), /1 posteo\(s\) sin espejo/);
});

test('falta la farmacia: a las 18:00 no toca, a las 19:30 está a tiempo, a las 24:00 falta', () => {
  const libro = libroCompleto('2026-09-23');
  for (const seccion of ['instagram', 'facebookVideos']) delete libro[seccion]['2026-09-23/farmacia'];
  const en = (hhmm) => contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-23', hhmm) }).instagram;
  const a = en('18:00').pendientes.find((p) => p.id === 'historia:farmacia');
  assert.equal(a.estado, 'pendiente'); assert.equal(a.fase, 'futura');
  const b = en('19:30').pendientes.find((p) => p.id === 'historia:farmacia');
  assert.equal(b.fase, 'a-tiempo');
  assert.equal(en('23:59').pendientes.find((p) => p.id === 'historia:farmacia').fase, 'a-tiempo', 'hasta las 24:00 sigue a tiempo');
  const c = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-24', '00:00') }).instagram;
  assert.deepEqual(c.faltan.map((p) => p.id), ['historia:farmacia']);
  assert.equal(c.historias.salieron, 5);
  // Y al día siguiente ya es "falta" sin vueltas.
  const d = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-24', '08:00') }).instagram;
  assert.deepEqual(d.faltan.map((p) => p.id), ['historia:farmacia']);
});

test('la ventana de cada pieza es la de redes/piezas.mjs: el podcast de la tarde vale hasta las 20:00', () => {
  const p = piezasDelContrato('2026-09-23').find((x) => x.id === 'reel:noticia2');
  assert.equal(estadoDeLaPieza({ hora: p.hora, ventana: p.ventana, fecha: '2026-09-23', ahora: AR('2026-09-23', '19:59') }).estado, 'pendiente');
  assert.equal(estadoDeLaPieza({ hora: p.hora, ventana: p.ventana, fecha: '2026-09-23', ahora: AR('2026-09-23', '20:00') }).estado, 'falta');
  // Lo de un día no sale al siguiente: una ventana que pasaría de medianoche se corta a las 24:00.
  const f = piezasDelContrato('2026-09-23').find((x) => x.id === 'historia:farmacia');
  assert.equal(estadoDeLaPieza({ hora: f.hora, ventana: f.ventana, fecha: '2026-09-23', ahora: AR('2026-09-24', '00:05') }).estado, 'falta');
});

test('un duplicado que deja rastro en el libro se marca: el mismo id de Meta bajo dos claves', () => {
  const libro = libroCompleto('2026-09-23');
  libro.instagram['2026-09-23/noticia1-bis'] = { ...libro.instagram['2026-09-23/noticia1'], cuando: UTC('2026-09-23', '10:06') };
  const c = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-23', '23:50') });
  assert.equal(c.instagram.duplicadas.length, 1);
  assert.deepEqual(c.instagram.duplicadas[0].claves.sort(), ['2026-09-23/noticia1', '2026-09-23/noticia1-bis']);
  assert.equal(c.instagram.completo, false);
  assert.equal(c.facebook.duplicadas.length, 0);
  assert.match(lineaDeRed(c.instagram), /DUPLICADO/);
});

test('un duplicado de posteo: la misma nota publicada dos veces con ids distintos', () => {
  const libro = libroCompleto('2026-09-23');
  libro.facebook['2026-09-23-a-otra-vez'] = { ...libro.facebook['2026-09-23-a'], cuando: UTC('2026-09-23', '13:00') };
  const c = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-23', '23:50') });
  assert.equal(c.facebook.duplicadas.length, 1);
  assert.equal(c.facebook.duplicadas[0].tipo, 'posteo');
  assert.equal(c.facebook.posteos.salieron, 6, 'los cuenta a los dos: es lo que hay en la página');
});

test('posteos: quedar corto sin candidatas es normal; quedar corto con candidatas es una falla', () => {
  const libro = libroCompleto('2026-09-23');
  for (const id of ['d', 'e']) { delete libro.facebook[`2026-09-23-${id}`]; delete libro.instagramFeed[`2026-09-23-${id}`]; }
  const nota = (id, relevancia, extra = {}) => ({
    id, titulo: `Titular distinto número ${id} sobre otro asunto ${id}`, relevancia, seccion: 'Balcarce', cuerpo: 'palabra '.repeat(100),
    publicadaCuando: UTC('2026-09-23', '15:00'), fecha: UTC('2026-09-23', '15:00'), temas: [`tema-${id}`], ...extra,
  });
  const cierre = AR('2026-09-24', '00:10');
  const sin = contratoDelDia({ libro, fecha: '2026-09-23', ahora: cierre, portada: { notas: [nota('x', 50), nota('p', 90, { seccion: 'Policiales' })] } });
  assert.equal(sin.facebook.posteos.estado, 'cerrado');
  assert.equal(sin.facebook.posteos.explicacion, 'sin-candidatas');
  assert.equal(sin.facebook.completo, true, 'no es una falla');
  assert.match(lineaDeRed(sin.facebook), /posteos 3\/5 \(sin más candidatas\)/);

  const con = contratoDelDia({ libro, fecha: '2026-09-23', ahora: cierre, portada: { notas: [nota('y', 90)] } });
  assert.equal(con.facebook.posteos.explicacion, 'falla');
  assert.deepEqual(con.facebook.posteos.candidatas.map((n) => n.id), ['y']);
  assert.equal(con.facebook.completo, false);
  assert.match(lineaDeRed(con.facebook), /FALLA: había 1 candidata/);

  const sinPortada = contratoDelDia({ libro, fecha: '2026-09-23', ahora: cierre });
  assert.equal(sinPortada.facebook.posteos.explicacion, 'sin-datos', 'sin la portada no se puede saber');
});

test('posteos: a las 15:00 con 3 de 5 todavía está a tiempo (hasta las 22:00)', () => {
  const libro = libroCompleto('2026-09-23');
  for (const id of ['d', 'e']) delete libro.facebook[`2026-09-23-${id}`];
  const c = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-23', '15:00') });
  assert.equal(c.facebook.posteos.estado, 'a-tiempo');
  assert.equal(c.facebook.posteos.explicacion, null);
  assert.equal(c.facebook.completo, true);
});

test('candidatas: no cuenta lo de Política y Policiales, lo repetido de tema ni lo que espera cuerpo', () => {
  const libro = { facebook: {} };
  const base = { relevancia: 90, seccion: 'Balcarce', cuerpo: 'palabra '.repeat(100), publicadaCuando: UTC('2026-09-23', '12:00'), temas: [] };
  const notas = [
    { id: '1', titulo: 'Reabre el autódromo Fangio con carreras', ...base },
    { id: '2', titulo: 'Reabre el autódromo Fangio con más carreras', ...base },
    { id: '3', titulo: 'Un policial', ...base, seccion: 'Policiales' },
    { id: '4', titulo: 'Una nota sin cuerpo todavía', ...base, cuerpo: '', como: 'automatica' },
  ];
  const r = candidatasSinPublicar({ portada: { notas }, libro, fecha: '2026-09-23' });
  assert.deepEqual(r.map((n) => n.id), ['1'], 'la 2 es el mismo tema que la 1; la 3 espera a una persona');
});

test('un día sin reels por falla: 0 de 3, con los tres nombres y horas, y las historias de esos podcasts también', () => {
  const libro = libroCompleto('2026-09-23');
  for (const seccion of ['instagram', 'facebookVideos']) for (const n of ['noticia1', 'noticia2', 'podcast']) delete libro[seccion][`2026-09-23/${n}`];
  for (const k of Object.keys(libro.historiasDeReels)) delete libro.historiasDeReels[k];
  const c = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-24', '00:30') });
  for (const red of [c.facebook, c.instagram]) {
    assert.equal(red.reels.salieron, 0);
    assert.equal(red.historias.salieron, 3, 'quedan clima mañana, farmacia y clima noche');
    assert.equal(red.faltan.length, 6);
    assert.deepEqual(red.faltan.filter((p) => p.grupo === 'reel').map((p) => [p.etiqueta, p.hora]), [['podcast mañana', '10:00'], ['podcast tarde', '15:00'], ['podcast noche', '20:30']]);
    assert.ok(red.faltan.every((p) => p.fase === 'vencida'), 'sin reel no hay "no se reintenta": es que nunca salió');
  }
  assert.match(lineaDeRed(c.facebook), /reels 0\/3 \(falta: mañana, tarde, noche\)/);
});

test('el reloj de Meta va por red: que falte todo en Facebook no toca a Instagram', () => {
  const libro = libroCompleto('2026-09-23');
  libro.facebookVideos = {};
  for (const k of Object.keys(libro.historiasDeReels)) if (k.startsWith('facebook/')) delete libro.historiasDeReels[k];
  const c = contratoDelDia({ libro, fecha: '2026-09-23', ahora: AR('2026-09-24', '00:30') });
  assert.equal(c.facebook.completo, false);
  assert.equal(c.instagram.completo, true);
});

test('los semanales van aparte: los teléfonos útiles no cuentan en las 6 historias', () => {
  // Buscar un día en que la rotación ponga los útiles.
  const dias = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
  const conUtiles = dias.find((d) => piezasDelContrato(d).some((p) => p.semanal));
  assert.ok(conUtiles, 'algún día de lunes a viernes tiene los útiles');
  const libro = libroCompleto(conUtiles);
  libro.instagram[`${conUtiles}/utiles`] = { cuando: UTC(conUtiles, '11:02'), mediaId: 'U', nombre: 'utiles', tipo: 'STORIES' };
  const c = contratoDelDia({ libro, fecha: conUtiles, ahora: AR(conUtiles, '23:50') }).instagram;
  assert.equal(c.historias.salieron, 6);
  assert.equal(c.semanales.find((s) => s.nombre === 'utiles').estado, 'salio');
  assert.equal(c.completo, true);
  // Y si los útiles faltan, no ensucian el contrato del día.
  const sin = contratoDelDia({ libro: libroCompleto(conUtiles), fecha: conUtiles, ahora: AR(conUtiles, '23:50') }).instagram;
  assert.equal(sin.semanales.find((s) => s.nombre === 'utiles').estado, 'falta');
  assert.equal(sin.completo, true);
});

test('el contrato rige desde el 25/09', () => {
  assert.equal(CONTRATO_DESDE, '2026-09-25');
});
