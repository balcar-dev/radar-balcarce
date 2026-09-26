// Las historias de los podcasts, los teléfonos útiles y el techo de historias
// (PENDIENTES 16a, 16b, 16c, 16d y 16e; auditoría contra Meta del 25/09).
//
//   16a  una historia acepta 60 s; el podcast de la noche del 25/09 duró 62,7 s y
//        su historia falló en las dos redes. Ahora el guion tiene presupuesto de
//        duración y, si aun así el video se pasa, la historia sube recortada.
//   16b  la historia de un reel se intenta tres veces en la misma corrida.
//   16c  una sola regla de "¿toca hoy?" para los teléfonos útiles: reloj, plan, panel.
//   16d  el día no pasa de 8 historias (6 del contrato + 2 extras).
//   16e  con REDES_ACTIVAS apagado, el vigilante lo dice una vez, no pieza por pieza.
//
// Todo sin red: ni ffmpeg ni Meta.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PODCAST_VOZ, CONTRATO_DIARIO, PIEZAS } from '../ingesta/criterio.mjs';
import { repasoConPresupuesto, guionRepaso } from '../redes/elegir.mjs';
import { segundosDePodcast } from '../redes/guiones.mjs';
import {
  HISTORIA_MAXIMA, duracionDeLaSalida, pasaDelMaximo, argumentosDeRecorte,
} from '../reels/duracion.mjs';
import { libroNuevo } from '../redes/elegir.mjs';
import { publicarPiezas, INTENTOS_HISTORIA } from '../redes/publicar-piezas.mjs';
import {
  cronogramaDelDia, diaRotativoDeUtiles, historiasQueSobran, EXTRAS_DE_HISTORIAS,
} from '../redes/piezas.mjs';
import { toca, horariosDe } from '../panel/horarios.mjs';
import { tocaHoy, diaDeEstaSemana } from '../ingesta/utiles.mjs';
import { planDelDia, REGLAS } from '../reels/plan.mjs';
import { evaluar, aAvisar, redesPrendidas, TEXTO_REDES_APAGADAS, LIMITES } from '../redes/vigilar.mjs';
import { contratoDelDia } from '../redes/contrato.mjs';
import { textoResumen, datosDelDia } from '../redes/avisos.mjs';

const AR = (fecha, hhmm = '12:00') => new Date(`${fecha}T${hhmm}:00-03:00`);

// ------------------------------------------------------------ 16a: la duración

/** Las cuatro notas del podcast de la noche del 25/09 (portada real: titular y primera oración del copete). */
const NOCHE_25_09 = [
  { id: 'yaqf3p', seccion: 'Automovilismo', guion: true, titulo: 'El autódromo Juan Manuel Fangio abre sus puertas este viernes en Balcarce', copete: 'El histórico circuito vuelve a recibir actividad automovilística este viernes con un operativo especial de tránsito, accesos diferenciados desde las 8 y venta de entradas en el predio.' },
  { id: '1juqupr', seccion: 'Balcarce', guion: true, titulo: 'El Senado aprueba la reforma de Zona Fría y Balcarce pierde el subsidio al gas', copete: 'La Cámara alta convirtió en ley la reducción del régimen de Zona Fría impulsada por el Gobierno nacional. Balcarce dejará de recibir el beneficio general.' },
  { id: 'ug5xuk', seccion: 'Deportes', guion: true, titulo: 'La Escuela Municipal de Handball participa de un nuevo torneo en Mar del Plata', copete: 'Cuarenta jugadores balcarceños de distintas categorías formaron parte del sexto Circuito Asabal en el Club Once Unidos. La delegación se prepara.' },
  { id: '1dou3ni', seccion: 'Agro', guion: true, titulo: 'Estudian el costo operativo de usar drones para pulverizar papa en Balcarce', copete: 'Un informe de INTA Balcarce analizó el valor de aplicar agroquímicos con drones propios en campos de papa de escala media del sudeste bonaerense.' },
];

test('16a · el caso real del 25/09: el podcast de la noche tenía 153 palabras, ~62,7 s, y ahora la historia cabe', () => {
  const fecha = AR('2026-09-25', '20:36');
  const antes = guionRepaso(NOCHE_25_09, { momento: 'noche', fecha });
  assert.equal(antes.split(/\s+/).length, 153);
  // El video real duró 62,7 s: la estimación de ahora peca de larga (65,4), nunca de corta.
  const estimadoAntes = segundosDePodcast(antes);
  assert.ok(estimadoAntes >= 62.7, `estimó ${estimadoAntes.toFixed(1)} s y el video real duró 62,7`);
  assert.ok(estimadoAntes > HISTORIA_MAXIMA, 'el guion viejo tenía que verse como demasiado largo');

  const r = repasoConPresupuesto(NOCHE_25_09, { momento: 'noche', fecha });
  assert.equal(r.cabe, true);
  assert.ok(r.segundos <= PODCAST_VOZ.segundosPresupuesto, `dura ~${r.segundos.toFixed(1)} s`);
  // Con el ritmo MÁS lento que se midió (2,3 palabras por segundo), igual entra en una historia.
  const palabras = r.guion.split(/\s+/).length;
  assert.ok(palabras / 2.3 + PODCAST_VOZ.segundosDeAdorno <= HISTORIA_MAXIMA, `${palabras} palabras a 2,3 por segundo pasan de ${HISTORIA_MAXIMA} s`);
  assert.ok(r.notas.length >= PIEZAS.notasMinimasPodcast);
  // Primero se le saca el contexto a las últimas notas; no se saca ninguna nota si no hace falta.
  assert.equal(r.notas.length, 4);
  assert.deepEqual(r.notas.map((n) => n.id), NOCHE_25_09.map((n) => n.id));
  assert.ok(r.recortes.detalles >= 1 && r.recortes.notas === 0);
  // Y lo que queda dice todos los titulares.
  for (const n of r.notas) assert.ok(r.guion.includes(n.titulo), `falta el titular de ${n.id}`);
});

// Palabras distintas en cada titular: si no, la elección de notas los toma por la misma noticia.
const TEMAS = ['ferroviarios', 'cooperativa', 'biblioteca', 'autodromo', 'hospital', 'carnavales', 'polideportivo', 'tecnologia', 'sanatorio', 'panaderias', 'aeroclub', 'cementerio', 'mercadito', 'peatonal'];
const TITULO_LARGO = (i) => `${TEMAS[i]} y el plan de obra que se ve en el año que viene para los que van a la zona y más`.slice(0, 90);
const COPETE_LARGO = 'Una primera oración de contexto que está en el límite de lo que se lee en voz alta sin pasar de los 150 y algo más.';
const notasLargas = (n) => Array.from({ length: n }, (_, i) => ({
  id: `l${i}`, seccion: `S${i}`, guion: true, titulo: TITULO_LARGO(i), copete: `${COPETE_LARGO} Y otra.`,
}));

test('16a · con 3 y 4 notas de titulares y copetes largos, el podcast siempre cabe en el presupuesto y deja al menos 2 notas', () => {
  for (const momento of ['manana', 'tarde', 'noche']) {
    for (const dia of ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']) {
      for (const cuantas of [2, 3, 4, 5, 6]) {
        const r = repasoConPresupuesto(notasLargas(cuantas), { momento, fecha: AR(dia) });
        const que = `${momento} ${dia} ${cuantas} notas`;
        assert.ok(r.notas.length >= PIEZAS.notasMinimasPodcast, `${que}: quedó con ${r.notas.length}`);
        assert.equal(r.cabe, true, `${que}: dura ~${r.segundos.toFixed(1)} s`);
        assert.ok(r.segundos <= PODCAST_VOZ.segundosPresupuesto, que);
        assert.equal(segundosDePodcast(r.guion), r.segundos);
        // Las notas que quedan son las primeras (las de más puntaje), en orden.
        assert.deepEqual(r.notas.map((n) => n.id), notasLargas(cuantas).slice(0, r.notas.length).map((n) => n.id), que);
      }
    }
  }
});

test('16a · si ya cabe, no se le saca nada; con menos de dos notas no hay podcast', () => {
  const corto = repasoConPresupuesto(notasLargas(3).map((n) => ({ ...n, titulo: 'Titular corto', copete: '' })), { momento: 'manana', fecha: AR('2026-09-22') });
  assert.deepEqual(corto.recortes, { detalles: 0, notas: 0 });
  assert.equal(corto.notas.length, 3);
  assert.equal(repasoConPresupuesto(notasLargas(1), { momento: 'noche' }), null);
});

test('16a · el presupuesto deja margen: 55 s de video y el corte de seguridad en 58, ambos por debajo del límite de Meta (60)', () => {
  assert.ok(PODCAST_VOZ.segundosPresupuesto < PODCAST_VOZ.segundosMaximoHistoria);
  assert.ok(PODCAST_VOZ.segundosMaximoHistoria <= 58);
  assert.ok(PODCAST_VOZ.palabrasPorSegundo <= 2.4, 'el ritmo con que se estima tiene que ser de los lentos que se midieron');
  assert.equal(HISTORIA_MAXIMA, PODCAST_VOZ.segundosMaximoHistoria);
});

test('16a · el plan arma los tres podcasts con presupuesto, con las notas que quedaron en el pie y en las notas del podcast', () => {
  const notas = Array.from({ length: 14 }, (_, i) => ({
    id: `p${i}`, seccion: ['Balcarce', 'Deportes', 'Servicios', 'Cultura y agenda', 'Agro', 'Salud', 'Economía'][i % 7],
    relevancia: 95 - i, semaforo: 'verde', local: true, temas: [], guion: true, titulo: TITULO_LARGO(i), copete: `${COPETE_LARGO} Y otra.`,
  }));
  const datos = { clima: null, farmacias: { turnos: [] }, notas };
  const { piezas } = planDelDia(datos, { fecha: AR('2026-09-25', '09:00'), estado: {} });
  const podcasts = piezas.filter((p) => p.tipo === 'reel');
  assert.deepEqual(podcasts.map((p) => p.nombre).sort(), ['noticia1', 'noticia2', 'podcast']);
  for (const p of podcasts) {
    assert.ok(p.segundosEstimados <= PODCAST_VOZ.segundosPresupuesto, `${p.nombre}: ~${p.segundosEstimados.toFixed(1)} s`);
    assert.equal(p.items.length, p.notaIds.length, `${p.nombre}: el pie lista las notas que quedaron`);
    assert.ok(p.notaIds.length >= 2);
  }
});

test('16a · la red de seguridad: duracionDeLaSalida lee lo que imprime ffmpeg y el recorte deja el reel en paz', () => {
  assert.equal(duracionDeLaSalida('  Duration: 00:01:02.70, start: 0.000000, bitrate: 900 kb/s'), 62.7);
  assert.equal(duracionDeLaSalida('Duration: 00:00:48.00, start'), 48);
  assert.equal(duracionDeLaSalida('sin nada'), null);
  assert.equal(pasaDelMaximo(62.7), true);
  assert.equal(pasaDelMaximo(58), false);
  assert.equal(pasaDelMaximo(HISTORIA_MAXIMA + 0.5), true);
  assert.equal(pasaDelMaximo(null), false);

  const a = argumentosDeRecorte({ entrada: 'podcast.mp4', salida: 'podcast-historia.mp4' });
  assert.equal(a[a.indexOf('-t') + 1], String(HISTORIA_MAXIMA), 'corta en el máximo');
  assert.ok(a.includes('-vf') && a.some((x) => /^fade=t=out/.test(x)), 'fundido de video');
  assert.ok(a.includes('-af') && a.some((x) => /^afade=t=out/.test(x)), 'fundido de audio');
  assert.equal(a[a.length - 1], 'podcast-historia.mp4');
  assert.equal(a[a.indexOf('-i') + 1], 'podcast.mp4');
  assert.notEqual(a[a.length - 1], a[a.indexOf('-i') + 1], 'nunca pisa el reel: el corte es otro archivo');
  // El fundido termina justo en el corte.
  const desde = Number(a.find((x) => /^fade=/.test(x)).match(/st=([\d.]+)/)[1]);
  assert.ok(desde < HISTORIA_MAXIMA && desde > HISTORIA_MAXIMA - 3);
});

// -------------------------------------------- 16a/16b: subir reel e historia

const A = (hhmm) => AR('2026-09-25', hhmm);
const PODCAST_LARGO = {
  nombre: 'podcast', tipo: 'reel', hora: '20:30', titulo: 'El repaso del día', archivo: 'podcast.mp4', archivoHistoria: 'podcast-historia.mp4',
  notaIds: ['a', 'b'], items: [],
};

function apiConRegistro({ fallaHistoria = 0, tokenMuerto = false } = {}) {
  const subidas = [];
  let intentosHistoria = 0;
  const publicar = async ({ video, tipo }) => {
    if (tipo === 'STORIES') {
      intentosHistoria += 1;
      if (intentosHistoria <= fallaHistoria) throw Object.assign(new Error('Max duration for stories is 61.0'), { tokenMuerto });
    }
    subidas.push({ archivo: video.toString(), tipo });
    return { id: `id-${subidas.length}` };
  };
  return { subidas, publicarVideoEnInstagram: publicar, publicarVideoEnFacebook: publicar, intentos: () => intentosHistoria };
}

const correr = (api, libro, manifiesto = [PODCAST_LARGO], destinos = ['instagram', 'facebook']) => publicarPiezas({
  api, manifiesto, libro, activo: true, destinos, esperar: async () => {}, ahora: A('20:40'),
  leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
});

test('16a · el reel sube el video entero y la historia la versión recortada, en las dos redes', async () => {
  const api = apiConRegistro();
  await correr(api, libroNuevo());
  const reels = api.subidas.filter((s) => s.tipo === 'REELS').map((s) => s.archivo);
  const historias = api.subidas.filter((s) => s.tipo === 'STORIES').map((s) => s.archivo);
  assert.deepEqual(reels, ['podcast.mp4', 'podcast.mp4']);
  assert.deepEqual(historias, ['podcast-historia.mp4', 'podcast-historia.mp4']);
});

test('16a · un podcast que entra en 58 s no tiene versión aparte: reel e historia son el mismo video', async () => {
  const api = apiConRegistro();
  await correr(api, libroNuevo(), [{ ...PODCAST_LARGO, archivoHistoria: undefined }], ['instagram']);
  assert.deepEqual(api.subidas.map((s) => s.archivo), ['podcast.mp4', 'podcast.mp4']);
});

test('16a · una historia suelta que se pasó también sube recortada', async () => {
  const api = apiConRegistro();
  await correr(api, libroNuevo(), [{ nombre: 'clima-noche', tipo: 'historia', hora: '20:00', titulo: 'x', archivo: 'clima-noche.mp4', archivoHistoria: 'clima-noche-historia.mp4' }], ['instagram']);
  assert.deepEqual(api.subidas.map((s) => s.archivo), ['clima-noche-historia.mp4']);
});

test('16b · si la historia del reel falla, se reintenta en la misma corrida sin volver a armar nada', async () => {
  const api = apiConRegistro({ fallaHistoria: 2 });
  const libro = libroNuevo();
  const r = await correr(api, libro, [PODCAST_LARGO], ['instagram']);
  assert.equal(r.fallos.length, 0);
  assert.ok(libro.historiasDeReels['instagram/2026-09-25/podcast'], 'la tercera vez salió');
  assert.equal(api.intentos(), 3);
});

test('16b · si la historia falla las tres veces, el reel queda igual y no se insiste más en esa corrida', async () => {
  const api = apiConRegistro({ fallaHistoria: 99 });
  const libro = libroNuevo();
  const r = await correr(api, libro, [PODCAST_LARGO], ['instagram']);
  assert.equal(api.intentos(), INTENTOS_HISTORIA);
  assert.ok(libro.instagram['2026-09-25/podcast'], 'el reel salió');
  assert.equal(libro.historiasDeReels['instagram/2026-09-25/podcast'], undefined);
  assert.equal(r.fallos.length, 0, 'la historia no cuenta como falla del reel');
});

test('16b · con el token muerto no se insiste con la historia', async () => {
  const api = apiConRegistro({ fallaHistoria: 99, tokenMuerto: true });
  await correr(api, libroNuevo(), [PODCAST_LARGO], ['instagram']);
  assert.equal(api.intentos(), 1);
});

// ------------------------------------------------ 16c: los teléfonos útiles

const conUtiles = (fecha, estado = {}) => cronogramaDelDia(AR(fecha), { estado }).some((p) => p.nombre === 'utiles');

test('16c · los útiles tocan el día que rota: viernes 25/09 sí; martes 29/09 no; lunes 28/09 sí', () => {
  assert.equal(diaRotativoDeUtiles(AR('2026-09-25')), 5);
  assert.equal(conUtiles('2026-09-25'), true, 'el viernes 25/09 tocaba (el reloj lo dijo desde las 11)');
  assert.equal(conUtiles('2026-09-28'), true, 'la semana siguiente le toca al lunes');
  assert.equal(conUtiles('2026-09-29'), false, 'el martes ya no');
  for (const d of ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-26', '2026-09-27']) assert.equal(conUtiles(d), false, d);
  // Sólo un día de lunes a viernes por semana; rota: martes 6/10, miércoles 14/10, jueves 22/10.
  assert.equal(conUtiles('2026-10-06'), true);
  assert.equal(conUtiles('2026-10-14'), true);
  assert.equal(conUtiles('2026-10-22'), true);
});

test('16c · una sola fuente: el reloj, `toca` del panel y ingesta/utiles.mjs dicen lo mismo, todos los días', () => {
  const utiles = horariosDe({}).find((h) => h.id === 'utiles');
  for (let d = 0; d < 60; d += 1) {
    const f = new Date(AR('2026-09-14').getTime() + d * 86400e3);
    const reloj = cronogramaDelDia(f).some((p) => p.nombre === 'utiles');
    assert.equal(toca(utiles, f, { estado: {} }), reloj, `toca() vs reloj el ${f.toISOString()}`);
    assert.equal(tocaHoy(f), reloj, `tocaHoy() vs reloj el ${f.toISOString()}`);
  }
  assert.equal(diaDeEstaSemana(AR('2026-09-23')), 'viernes', 'el panel muestra el mismo día que el reloj');
});

test('16c · si Hernán fija el día a mano en el panel, manda ese: ni rota ni suma el rotativo', () => {
  const estado = { horarios: { utiles: { dias: [2] } } }; // martes
  assert.equal(conUtiles('2026-09-29', estado), true, 'martes 29/09 fijado a mano');
  assert.equal(conUtiles('2026-09-25', estado), false, 'el viernes rotativo ya no cuenta');
  assert.equal(toca(horariosDe(estado).find((h) => h.id === 'utiles'), AR('2026-09-29'), { estado }), true);
  // Apagada, no toca ningún día.
  const apagada = { horarios: { utiles: { activa: false } } };
  assert.equal(conUtiles('2026-09-25', apagada), false);
});

const DATOS = (dia) => ({
  clima: { ahora: { temp: 14, sensacion: 13, viento: 12, rumbo: 'O', cielo: 'Nublado' }, dias: [{ fecha: '2026-09-25', max: 20, min: 9, lluvia: 30, codigo: 3, viento: 15 }, { fecha: '2026-09-26', max: 19, min: 8, lluvia: 10, codigo: 1, viento: 12 }] },
  farmacias: { turnos: [{ dia, farmacias: ['DEL PUEBLO'], diaSemana: 'x', detalle: [{ nombre: 'DEL PUEBLO', direccion: 'Calle 17 N° 1140' }] }] },
  notas: [],
});

test('16c · el plan arma la historia de útiles el día que toca y no el que no toca; lo que dice el reloj, el plan lo arma', () => {
  const armadas = (fecha, estado = {}) => planDelDia(DATOS(AR(fecha).getDate()), { fecha: AR(fecha), estado }).piezas.filter((p) => p.tipo === 'historia' && !p.fueraDeTecho).map((p) => p.nombre);
  assert.ok(armadas('2026-09-25').includes('utiles'), 'viernes 25/09: sí');
  assert.ok(!armadas('2026-09-29').includes('utiles'), 'martes 29/09: no');
  assert.ok(armadas('2026-09-29', { horarios: { utiles: { dias: [2] } } }).includes('utiles'), 'martes fijado a mano: sí');
  const util = planDelDia(DATOS(25), { fecha: AR('2026-09-25'), estado: {} }).piezas.find((p) => p.nombre === 'utiles');
  assert.ok(util.svg && util.guion && util.acento, 'la pieza está completa (antes se caía con ReferenceError por un color perdido)');

  // Todo lo que el reloj espera de las historias fijas, el plan lo tiene armado.
  for (let d = 0; d < 21; d += 1) {
    const f = new Date(AR('2026-09-14').getTime() + d * 86400e3);
    const fijas = cronogramaDelDia(f).filter((p) => p.tipo === 'historia').map((p) => p.nombre);
    const plan = planDelDia(DATOS(f.getDate()), { fecha: f, estado: {} }).piezas.filter((p) => !p.fueraDeTecho).map((p) => p.nombre);
    for (const n of fijas) assert.ok(plan.includes(n), `${f.toISOString().slice(0, 10)}: el reloj espera ${n} y el plan no la arma`);
  }
});

// -------------------------------------------------- 16d: el techo de historias

test('16d · el techo de historias es 8 (6 del contrato + 2 extras) y está en el criterio', () => {
  assert.equal(CONTRATO_DIARIO.historiasMaximasPorDia, 8);
  assert.equal(CONTRATO_DIARIO.historiasMaximasPorDia, CONTRATO_DIARIO.historiasPorDia + EXTRAS_DE_HISTORIAS.length);
  assert.equal(REGLAS.historiasPorDia, 6);
  assert.equal(REGLAS.historiasMaximasPorDia, 8);
});

test('16d · historiasQueSobran: primero se sacan los útiles, después la agenda; las del contrato y los avisos nunca', () => {
  const base = ['noticia1', 'noticia2', 'podcast', 'clima-manana', 'farmacia', 'clima-noche'];
  assert.deepEqual(historiasQueSobran(base), []);
  assert.deepEqual(historiasQueSobran([...base, 'utiles', 'agenda']), [], '6 + 2 extras = 8: entran');
  assert.deepEqual(historiasQueSobran([...base, 'utiles', 'agenda', 'aviso-helada']), ['utiles']);
  assert.deepEqual(historiasQueSobran([...base, 'agenda', 'aviso-helada']), [], '6 + agenda + aviso = 8');
  assert.deepEqual(historiasQueSobran([...base, 'utiles', 'agenda', 'aviso-helada', 'aviso-granizo']), ['utiles', 'agenda']);
  assert.deepEqual(historiasQueSobran([...base, 'aviso-a', 'aviso-b', 'aviso-c']), [], 'los avisos no se sacan aunque se pase');
  assert.deepEqual(historiasQueSobran([...base, 'utiles', 'utiles']), [], 'no cuenta dos veces la misma');
});

test('16d · en el plan, el día no pasa de 8 historias: con aviso grave y agenda los útiles quedan afuera; sin eso, entran', () => {
  const notas = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`, seccion: ['Balcarce', 'Deportes', 'Servicios', 'Agro', 'Salud'][i % 5], relevancia: 90 - i, semaforo: 'verde', local: true, temas: [], guion: true, titulo: `${TEMAS[i]} en la zona`, copete: '',
  }));
  const datos = DATOS(25);
  datos.notas = notas;
  const sinAviso = planDelDia(datos, { fecha: AR('2026-09-25', '09:00'), estado: {} }).piezas;
  assert.ok(sinAviso.find((p) => p.nombre === 'utiles') && !sinAviso.find((p) => p.nombre === 'utiles').fueraDeTecho);
  const cuenta = (piezas) => new Set(piezas.filter((p) => !p.fueraDeTecho && (p.tipo === 'historia' || p.tipo === 'reel')).map((p) => p.nombre)).size;
  assert.equal(cuenta(sinAviso), 7);

  // Con un aviso grave, sin agenda, son 8 y entra todo.
  const conAviso = { ...datos, clima: { ...datos.clima, dias: [{ fecha: '2026-09-25', max: 20, min: -6, lluvia: 30, codigo: 3, viento: 15 }, datos.clima.dias[1]] } };
  const plan = planDelDia(conAviso, { fecha: AR('2026-09-25', '09:00'), estado: {} }).piezas;
  const aviso = plan.find((p) => p.nombre.startsWith('aviso'));
  assert.ok(aviso, 'el aviso de helada fuerte sale');
  assert.equal(aviso.fueraDeTecho, undefined);
  assert.equal(cuenta(plan), 8);
  assert.equal(plan.find((p) => p.nombre === 'utiles').fueraDeTecho, undefined);

  // Con la agenda del jueves cargada serían 9: se va la de los teléfonos útiles (el aviso y las 6 del contrato no se tocan).
  const jueves = planDelDia({ ...conAviso, farmacias: DATOS(24).farmacias }, {
    fecha: AR('2026-09-24', '09:00'), estado: { horarios: { utiles: { dias: [4] } } }, eventos: [{ nombre: 'Feria', lugar: 'Parque', cuando: 'sábado 10:00', orden: 1 }],
  }).piezas;
  assert.ok(jueves.find((p) => p.nombre === 'agenda') && jueves.find((p) => p.nombre === 'utiles'));
  assert.equal(jueves.find((p) => p.nombre === 'utiles').fueraDeTecho, true);
  assert.equal(jueves.find((p) => p.nombre === 'agenda').fueraDeTecho, undefined);
  assert.equal(cuenta(jueves), 8);
});

// ---------------------------------------------------- 16e: redes apagadas

const AHORA = AR('2026-09-25', '23:00');
const LIBRO_VACIO = { instagram: {}, facebook: {}, facebookVideos: {}, historiasDeReels: {}, instagramFeed: {} };
const WEB = { estado: 200, actualizado: AHORA.toISOString() };

test('16e · redesPrendidas: "Si" prende, cualquier otra cosa o vacío apaga; sin la variable (a mano) se asume prendido', () => {
  assert.equal(redesPrendidas({ REDES_ACTIVAS: 'Si' }), true);
  assert.equal(redesPrendidas({ REDES_ACTIVAS: 'sí' }), true);
  assert.equal(redesPrendidas({ REDES_ACTIVAS: '' }), false, 'en GitHub una variable sin definir llega vacía');
  assert.equal(redesPrendidas({ REDES_ACTIVAS: 'no' }), false);
  assert.equal(redesPrendidas({}), true);
});

test('16e · con las redes apagadas el vigilante dice UNA cosa ("es esperable que no salga nada") en vez de una por pieza', () => {
  const contrato = contratoDelDia({ libro: LIBRO_VACIO, ahora: AHORA });
  const prendidas = evaluar({ ahora: AHORA, web: WEB, libro: LIBRO_VACIO, contrato, redesActivas: true });
  assert.ok(prendidas.filter((p) => /^(falta|pieza)-/.test(p.clave)).length >= 5, 'con las redes prendidas, todo eso sería un problema');

  const apagadas = evaluar({ ahora: AHORA, web: WEB, libro: LIBRO_VACIO, contrato, redesActivas: false });
  assert.deepEqual(apagadas.filter((p) => /^(falta|pieza)-/.test(p.clave)), [], 'ninguna pieza faltante como problema');
  const unico = apagadas.filter((p) => p.clave === 'redes-apagadas');
  assert.equal(unico.length, 1);
  assert.equal(unico[0].texto, TEXTO_REDES_APAGADAS);
  assert.match(unico[0].texto, /es esperable que no salga nada/);
});

test('16e · el aviso de "redes apagadas" se repite una vez por día, no cada 6 horas; los duplicados siguen avisándose', () => {
  const p = [{ clave: 'redes-apagadas', nivel: 'media', texto: TEXTO_REDES_APAGADAS }];
  const hace = (h) => ({ avisos: { 'redes-apagadas': new Date(AHORA.getTime() - h * 3600e3).toISOString() } });
  assert.equal(aAvisar(p, {}, AHORA).length, 1, 'la primera vez sale');
  assert.equal(aAvisar(p, hace(7), AHORA).length, 0, 'a las 7 horas no');
  assert.equal(aAvisar(p, hace(LIMITES.horasEntreAvisosDeRedesApagadas + 1), AHORA).length, 1, 'al día siguiente sí');

  const conDuplicado = contratoDelDia({ libro: { ...LIBRO_VACIO, instagram: { '2026-09-25/noticia1': { cuando: '2026-09-25T13:00:00Z', mediaId: 'M1', nombre: 'noticia1' }, '2026-09-25/noticia2': { cuando: '2026-09-25T18:00:00Z', mediaId: 'M1', nombre: 'noticia2' } } }, ahora: AHORA });
  const problemas = evaluar({ ahora: AHORA, web: WEB, libro: LIBRO_VACIO, contrato: conDuplicado, redesActivas: false });
  assert.ok(problemas.some((x) => x.clave.startsWith('duplicado-')), 'un duplicado es un duplicado, estén como estén las redes');
});

test('16e · el resumen de las 21 con las redes apagadas lo dice y no cuenta el día como incompleto', () => {
  const datos = datosDelDia({ ahora: AHORA, portada: { notas: [] }, libro: LIBRO_VACIO });
  const texto = textoResumen({ datos, problemas: [], redesActivas: false });
  assert.match(texto, /Redes: apagadas/);
  assert.match(texto, /todo bien/i);
  assert.doesNotMatch(texto, /falta:|pendiente:/);
  const prendidas = textoResumen({ datos, problemas: [], redesActivas: true });
  assert.doesNotMatch(prendidas, /Redes: apagadas/);
  assert.match(prendidas, /falta:/);
});
