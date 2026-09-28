// Cinco errores de las redes encontrados en la revisión del 28/09, con una
// prueba por cada arreglo (CLAUDE.md: "cuando se arregla algo que estuvo mal
// publicado, se escribe una prueba"). Todo sin red: ni Meta, ni Gemini, ni ffmpeg.
//
//   1. El clima de la noche estaba anidado dentro del `if` del clima de la
//      mañana (reels/plan.mjs): si se apagaba el de la mañana, desaparecía el de
//      la noche.
//   2. El aviso de clima tenía `hora: 'ahora'`: minutosDeHora daba NaN y el reloj
//      nunca lo pedía. Ahora tiene hora y ventana (HORA_AVISO, VENTANA_AVISO) y el
//      reloj lo pide con el clima de la portada.
//   3. redes.yml y piezas.yml guardaban el libro con un solo pull y un solo push:
//      si el push fallaba, la vuelta siguiente republicaba lo mismo.
//   4. Con los datos del panel (PC), el plan sólo sacaba las rojas: podía contar
//      en un podcast una amarilla que nadie había aprobado.
//   5. candidatasSinPublicar (el contrato) no miraba esParaLasRedes ni la edad:
//      el resumen decía "FALLA" por notas que Facebook nunca iba a publicar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planDelDia, esPublicable } from '../reels/plan.mjs';
import {
  cronogramaDelDia, piezasQueTocan, avisoDeClima, ventanaDe, HORA_AVISO, VENTANA_AVISO, claveDePieza,
} from '../redes/piezas.mjs';
import { estadoDelReloj } from '../redes/reloj.mjs';
import { libroNuevo, anotar } from '../redes/elegir.mjs';
import { datosDeLaWeb } from '../redes/datos.mjs';
import { candidatasSinPublicar, contratoDelDia } from '../redes/contrato.mjs';
import { minutosDeHora } from '../ingesta/zona.mjs';

const AR = (fecha, hhmm = '12:00') => new Date(`${fecha}T${hhmm}:00-03:00`);

/** El clima de un día, con el código del cielo de hoy (96 = tormenta con granizo). */
const clima = (codigoHoy = 3) => ({
  ahora: { temp: 14, sensacion: 13, humedad: 70, viento: 12, rumbo: 'O', cielo: 'Nublado', esDeDia: true },
  dias: [
    { fecha: '2026-09-21', dia: 'lun', max: 20, min: 9, lluvia: 30, codigo: codigoHoy, viento: 15 },
    { fecha: '2026-09-22', dia: 'mar', max: 19, min: 8, lluvia: 10, codigo: 1, viento: 12 },
  ],
});

const datosDelDia = (extra = {}) => ({ notas: [], farmacias: { turnos: [] }, clima: clima(), ...extra });
const nombres = (piezas) => piezas.map((p) => p.nombre);

// ---------------------------------------------------- 1. los dos climas, cada uno por su lado

test('1 · si se apaga el clima de la mañana en el panel, el de la noche sale igual', () => {
  const estado = { horarios: { 'clima-manana': { activa: false } } };
  const piezas = nombres(planDelDia(datosDelDia(), { fecha: AR('2026-09-21', '09:00'), estado, eventos: [] }).piezas);
  assert.ok(!piezas.includes('clima-manana'), 'el de la mañana está apagado');
  assert.ok(piezas.includes('clima-noche'), 'el de la noche desapareció con el de la mañana');
});

test('1 · y al revés: apagar el de la noche no toca el de la mañana', () => {
  const estado = { horarios: { 'clima-noche': { activa: false } } };
  const piezas = nombres(planDelDia(datosDelDia(), { fecha: AR('2026-09-21', '09:00'), estado, eventos: [] }).piezas);
  assert.ok(piezas.includes('clima-manana'));
  assert.ok(!piezas.includes('clima-noche'));
});

test('1 · sin clima no se arma ninguno de los dos, y no se rompe', () => {
  const piezas = nombres(planDelDia(datosDelDia({ clima: null }), { fecha: AR('2026-09-21', '09:00'), estado: {}, eventos: [] }).piezas);
  assert.ok(!piezas.includes('clima-manana') && !piezas.includes('clima-noche'));
});

// ---------------------------------------------------- 2. el aviso de clima, que el reloj lo pida

test('2 · el aviso de clima tiene una hora de verdad y una ventana que no cruza la medianoche', () => {
  assert.ok(Number.isFinite(minutosDeHora(HORA_AVISO)), `"${HORA_AVISO}" no es una hora`);
  assert.equal(ventanaDe('aviso-granizo'), VENTANA_AVISO);
  assert.equal(ventanaDe('aviso-helada'), VENTANA_AVISO);
  assert.ok(minutosDeHora(HORA_AVISO) + VENTANA_AVISO <= 24 * 60);
});

test('2 · con granizo, el reloj pide el aviso en la primera vuelta que lo ve, con el mismo nombre que arma el plan', () => {
  const r = estadoDelReloj({ ahora: AR('2026-09-21', '15:05'), libro: libroNuevo(), clima: clima(96) });
  assert.ok(nombres(r.tocan).includes('aviso-granizo'), r.textoResumen);
  const aviso = planDelDia(datosDelDia({ clima: clima(96) }), { fecha: AR('2026-09-21', '15:05'), estado: {}, eventos: [] })
    .piezas.find((p) => p.nombre.startsWith('aviso-'));
  assert.equal(aviso.nombre, 'aviso-granizo');
  assert.equal(aviso.hora, HORA_AVISO);
  assert.equal(avisoDeClima(clima(96)).nombre, aviso.nombre);
});

test('2 · un día tranquilo el reloj no pide ningún aviso', () => {
  const r = estadoDelReloj({ ahora: AR('2026-09-21', '15:05'), libro: libroNuevo(), clima: clima(3) });
  assert.ok(!r.tocan.some((p) => p.nombre.startsWith('aviso-')));
});

test('2 · el aviso armado se publica dentro de su ventana, una sola vez, y no después de las 22', () => {
  const manifiesto = [{ nombre: 'aviso-granizo', tipo: 'historia', hora: HORA_AVISO, archivo: 'aviso-granizo.mp4' }];
  assert.equal(piezasQueTocan({ piezas: manifiesto, libro: libroNuevo(), ahora: AR('2026-09-21', '15:05') }).length, 1);
  assert.equal(piezasQueTocan({ piezas: manifiesto, libro: libroNuevo(), ahora: AR('2026-09-21', '22:35') }).length, 0);
  const libro = anotar(libroNuevo(), 'instagram', claveDePieza('aviso-granizo', AR('2026-09-21')), {}, AR('2026-09-21', '15:10'));
  assert.equal(piezasQueTocan({ piezas: manifiesto, libro, ahora: AR('2026-09-21', '16:05') }).length, 0, 'se publicaría dos veces');
});

test('2 · el aviso no entra al cronograma del contrato ni del vigilante (sin clima)', () => {
  assert.ok(!cronogramaDelDia(AR('2026-09-21')).some((p) => p.nombre.startsWith('aviso-')));
});

// ---------------------------------------------------- 3. guardar el libro con reintentos

for (const f of ['redes', 'piezas']) {
  test(`3 · ${f}.yml guarda el libro con el ciclo de reintentos de actualizar.yml`, () => {
    const yml = fs.readFileSync(new URL(`../.github/workflows/${f}.yml`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const paso = yml.slice(yml.indexOf('name: Guardar lo publicado'));
    assert.ok(paso.length > 30, 'no encontré el paso "Guardar lo publicado"');
    assert.match(paso, /for intento in 1 2 3; do/);
    assert.match(paso, /if ! git pull --rebase; then/);
    assert.match(paso, /grep -qvE "\^web\/data\/"/, 'sólo se resuelven solos los choques de web/data/');
    assert.match(paso, /xargs -r git checkout --theirs --/);
    assert.match(paso, /git push && break/);
    assert.match(paso, /git rev-list --count origin\/main\.\.HEAD/, 'si no subió, tiene que fallar a la vista');
    assert.doesNotMatch(paso, /git pull --rebase\n\s+git push\n/, 'quedó el pull y push de una sola vez');
  });
}

// ---------------------------------------------------- 4. sólo lo publicable, también en la PC

const notaPc = (id, titulo, extra = {}) => ({
  id, titulo, seccion: 'Balcarce', relevancia: 90, local: true, temas: [], semaforo: 'verde', ...extra,
});

test('4 · esPublicable: la verde sí, la amarilla sin decidir no, la roja no, y manda lo que decidió una persona', () => {
  const decisiones = {
    aprobada: { estado: 'publicada', por: 'Hernán' },
    descartada: { estado: 'descartada', por: 'Andrés' },
    deLaIa: { estado: 'automatica', por: 'ia' },
  };
  assert.equal(esPublicable(notaPc('v', 'x'), decisiones), true);
  assert.equal(esPublicable(notaPc('a', 'x', { semaforo: 'amarillo' }), decisiones), false);
  assert.equal(esPublicable(notaPc('r', 'x', { semaforo: 'rojo' }), decisiones), false);
  assert.equal(esPublicable(notaPc('aprobada', 'x', { semaforo: 'amarillo' }), decisiones), true);
  assert.equal(esPublicable(notaPc('descartada', 'x'), decisiones), false);
  // Lo que guardó la máquina no es una decisión de una persona: manda el semáforo.
  assert.equal(esPublicable(notaPc('deLaIa', 'x', { semaforo: 'amarillo' }), decisiones), false);
});

test('4 · con los datos del panel, una amarilla que nadie aprobó no entra a ningún podcast', () => {
  const notas = [
    notaPc('verde1', 'Inauguraron la biblioteca popular del barrio norte'),
    notaPc('verde2', 'Arrancó la vacunación antigripal en los hospitales'),
    notaPc('amarilla', 'Polémica por las cloacas del loteo nuevo', { semaforo: 'amarillo', relevancia: 99 }),
    notaPc('aprobada', 'Premiaron a los bomberos voluntarios', { semaforo: 'amarillo' }),
  ];
  const estado = { decisiones: { aprobada: { estado: 'publicada', por: 'Hernán' } } };
  const { piezas } = planDelDia(datosDelDia({ notas }), { fecha: AR('2026-09-21', '09:00'), estado, eventos: [] });
  const contadas = new Set(piezas.flatMap((p) => p.notaIds ?? []));
  assert.ok(contadas.size > 0, 'no se armó ningún podcast');
  assert.ok(!contadas.has('amarilla'), 'un podcast contó una amarilla que nadie aprobó');
  assert.ok(contadas.has('aprobada'), 'la que aprobó una persona sí vale');
});

test('4 · con lo ya publicado en la web (GitHub) no se vuelve a filtrar: las notas no traen semáforo', () => {
  const portada = {
    notas: [
      { id: 'w1', titulo: 'Inauguraron la biblioteca popular del barrio norte', seccion: 'Balcarce', relevancia: 90, local: true, temas: [] },
      { id: 'w2', titulo: 'Arrancó la vacunación antigripal en los hospitales', seccion: 'Balcarce', relevancia: 88, local: true, temas: [] },
    ],
    clima: clima(),
  };
  const datos = datosDeLaWeb(portada);
  assert.equal(datos.yaPublicadas, true);
  const { piezas } = planDelDia(datos, { fecha: AR('2026-09-21', '09:00'), estado: {}, eventos: [] });
  const contadas = new Set(piezas.flatMap((p) => p.notaIds ?? []));
  assert.ok(contadas.has('w1') && contadas.has('w2'));
});

// ---------------------------------------------------- 5. las candidatas del contrato, como Facebook

const UTC = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-03:00`).toISOString();
const notaWeb = (id, titulo, hhmm, extra = {}) => ({
  id, titulo, relevancia: 90, seccion: 'Balcarce', local: true, cuerpo: 'palabra '.repeat(100),
  publicadaCuando: UTC('2026-09-23', hhmm), temas: [], ...extra,
});

test('5 · candidatas: lo que no es de Balcarce no cuenta (Facebook nunca lo iba a publicar)', () => {
  const notas = [
    notaWeb('afuera', 'El dólar cerró en alza en la city porteña', '12:00', { local: false, seccion: 'Economía' }),
    notaWeb('necochea', 'Necochea inauguró su nueva terminal de micros', '12:00', { local: false, seccion: 'Argentina' }),
    notaWeb('colapinto', 'Colapinto largará desde el fondo en Singapur', '12:00', { local: false, seccion: 'Automovilismo', figura: 'Colapinto' }),
    notaWeb('aca', 'Inauguraron la biblioteca popular del barrio norte', '12:00'),
  ];
  const r = candidatasSinPublicar({ portada: { notas }, libro: { facebook: {} }, fecha: '2026-09-23' });
  assert.deepEqual(r.map((n) => n.id).sort(), ['aca', 'colapinto']);
});

test('5 · candidatas: una nota que salió a la web después del horario de Facebook no tuvo su momento', () => {
  const notas = [
    notaWeb('tarde', 'Premiaron a los bomberos voluntarios del cuartel', '23:10'),
    notaWeb('madrugada', 'Arrancó la vacunación antigripal en los hospitales', '01:00'), // a las 8:00 tiene 7 horas: todavía vale
    notaWeb('mediodia', 'Inauguraron la biblioteca popular del barrio norte', '13:00'),
  ];
  const r = candidatasSinPublicar({ portada: { notas }, libro: { facebook: {} }, fecha: '2026-09-23' });
  assert.deepEqual(r.map((n) => n.id).sort(), ['madrugada', 'mediodia']);
});

test('5 · en el resumen: sin candidatas de verdad, "sin más candidatas" y no "FALLA"', () => {
  const portada = { notas: [
    notaWeb('afuera', 'El dólar cerró en alza en la city porteña', '12:00', { local: false, seccion: 'Economía' }),
    notaWeb('tarde', 'Premiaron a los bomberos voluntarios del cuartel', '23:10'),
  ] };
  const c = contratoDelDia({ libro: { facebook: {} }, fecha: '2026-09-23', ahora: AR('2026-09-24', '00:10'), portada });
  assert.equal(c.facebook.posteos.explicacion, 'sin-candidatas');
});
