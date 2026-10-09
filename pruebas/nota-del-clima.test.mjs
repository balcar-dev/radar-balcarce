// La nota propia del clima de la mañana (8/10/2026, pedido de Hernán y Andrés): una por día, con los números del pronóstico y, si ya salió, el enlace
// al reel del clima en Facebook. Sin IA, sin inventar: lo que no hay no se escribe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  cuandoArmarClima, entradaDelClima, sumarClimaAlHistorial, comoClimaJson, notaDelClima, notasDelClima, enlaceDelClimaEnFacebook, RELEVANCIA_CLIMA,
} from '../web/lib/notas-propias.js';
import { tieneCuerpo } from '../web/lib/cuerpo.js';
import { esNotaPropia } from '../redes/elegir.mjs';

const AR = (iso, hora) => new Date(`${iso}T${hora}:00-03:00`);
const CLIMA = {
  ahora: { temp: 9, sensacion: 5, humedad: 92, viento: 20, rumbo: 'S', cielo: 'Nublado', esDeDia: true },
  dias: [
    { fecha: '2026-10-09', dia: 'vie', max: 13, min: 9, lluvia: 22, viento: 21, cielo: 'Llovizna leve' },
    { fecha: '2026-10-10', dia: 'sáb', max: 11, min: 9, lluvia: 96, viento: 16, cielo: 'Llovizna' },
    { fecha: '2026-10-11', dia: 'dom', max: 14, min: 8, lluvia: 19, viento: 14, cielo: 'Llovizna leve' },
    { fecha: '2026-10-12', dia: 'lun', max: 16, min: 7, lluvia: null, viento: 10, cielo: 'Despejado' },
  ],
  fuente: 'Open-Meteo',
};
const FB = 'https://www.facebook.com/reel/1234567890';

test('se guarda el clima de hoy entre las 7:30 y el mediodía, una sola vez y sólo con datos de hoy', () => {
  const sin = { dias: [] };
  assert.equal(cuandoArmarClima({ ahora: AR('2026-10-09', '07:10'), historia: sin, clima: CLIMA }).armar, false, 'antes de las 7:30');
  assert.equal(cuandoArmarClima({ ahora: AR('2026-10-09', '07:35'), historia: sin, clima: CLIMA }).armar, true);
  assert.equal(cuandoArmarClima({ ahora: AR('2026-10-09', '12:05'), historia: sin, clima: CLIMA }).armar, false, 'pasó el mediodía');
  assert.equal(cuandoArmarClima({ ahora: AR('2026-10-09', '08:00'), historia: { dias: [{ dia: '2026-10-09' }] }, clima: CLIMA }).armar, false, 'ya está');
  assert.equal(cuandoArmarClima({ ahora: AR('2026-10-10', '08:00'), historia: sin, clima: { ...CLIMA, dias: CLIMA.dias.slice(0, 1) } }).armar, false, 'el pronóstico no es de hoy');
  assert.equal(cuandoArmarClima({ ahora: AR('2026-10-09', '08:00'), historia: sin, clima: null }).armar, false);
});

test('la entrada guarda hoy y los tres días siguientes, sin inventar lo que falta', () => {
  const e = entradaDelClima(CLIMA, { consultado: AR('2026-10-09', '07:40') });
  assert.equal(e.dia, '2026-10-09');
  assert.equal(e.hoy.max, 13);
  assert.equal(e.siguientes.length, 3);
  assert.equal(e.siguientes[2].lluvia, null, 'sin dato, null: nunca 0');
  assert.equal(entradaDelClima({ ...CLIMA, ahora: { ...CLIMA.ahora, temp: null } }, { consultado: AR('2026-10-09', '07:40') }), null);
  assert.equal(entradaDelClima(CLIMA, { consultado: AR('2026-10-20', '07:40') }), null, 'sin pronóstico de ese día');
});

test('uno por día: el primero que se guardó queda y no cambia después', () => {
  const e1 = entradaDelClima(CLIMA, { consultado: AR('2026-10-09', '07:40') });
  const e2 = entradaDelClima({ ...CLIMA, dias: [{ ...CLIMA.dias[0], max: 20 }, ...CLIMA.dias.slice(1)] }, { consultado: AR('2026-10-09', '09:00') });
  const h = sumarClimaAlHistorial(sumarClimaAlHistorial({ dias: [] }, e1), e2);
  assert.equal(h.dias.length, 1);
  assert.equal(h.dias[0].hoy.max, 13);
  assert.match(comoClimaJson(h), /^\{"dias":\[\n\{.*\}\n\]\}\n$/s);
  const muchos = Array.from({ length: 40 }, (_, i) => ({ dia: `2026-09-${String((i % 28) + 1).padStart(2, '0')}x${i}` }));
  assert.equal(sumarClimaAlHistorial({ dias: muchos }, null).dias.length, 30);
});

test('la nota dice lo que dicen los números, tiene cuerpo de verdad y se arma sin la lluvia si no hay dato', () => {
  const n = notaDelClima(entradaDelClima(CLIMA, { consultado: AR('2026-10-09', '07:40') }));
  assert.equal(n.id, 'clima20261009');
  assert.equal(n.propia, 'clima');
  assert.equal(n.seccion, 'Balcarce');
  assert.equal(n.relevancia, RELEVANCIA_CLIMA);
  assert.ok(n.relevancia < 63, 'no le gana a lo de acá en la tapa');
  assert.match(n.titulo, /^El clima de hoy en Balcarce: mínima de 9° y máxima de 13°$/);
  assert.match(n.copete, /este viernes 9 de octubre/);
  assert.match(n.cuerpo, /a las 07:40 hay 9° y el cielo está nublado/);
  assert.match(n.cuerpo, /la sensación térmica es de 5°/);
  assert.match(n.cuerpo, /La probabilidad de lluvia es del 22%\./);
  assert.match(n.cuerpo, /el sábado 10, mínima de 9° y máxima de 11°, con 96% de probabilidad de lluvia/);
  assert.match(n.cuerpo, /el lunes 12, mínima de 7° y máxima de 16°\./, 'sin dato de lluvia no se escribe');
  assert.ok(tieneCuerpo(n), 'pasa la regla de las 70 palabras');
  assert.ok(esNotaPropia(n), 'no va a Facebook como posteo ni a los podcasts');
  assert.match(n.firma, /Open-Meteo a las 07:40/);
  assert.deepEqual(n.enlacesEnTexto.map((x) => x.href), ['/clima']);
  assert.ok(n.cuerpo.includes(n.enlacesEnTexto[0].texto), 'el enlace está en el texto');
});

test('un día de mucha lluvia lo dice en el título', () => {
  const lluvioso = { ...CLIMA, dias: [{ ...CLIMA.dias[1], fecha: '2026-10-09' }, ...CLIMA.dias.slice(1)] };
  const n = notaDelClima(entradaDelClima(lluvioso, { consultado: AR('2026-10-09', '07:40') }));
  assert.match(n.titulo, /96% de probabilidad de lluvia/);
  assert.ok(n.titulo.length <= 90);
});

test('si ya salió el reel en Facebook, la nota lo enlaza; si no, no', () => {
  const entrada = entradaDelClima(CLIMA, { consultado: AR('2026-10-09', '07:40') });
  const con = notaDelClima(entrada, { enlaceReel: FB });
  assert.ok(con.destacados.some((d) => d.href === FB));
  assert.ok(con.enlacesEnTexto.some((d) => d.href === FB && con.cuerpo.includes(d.texto)));
  const sin = notaDelClima(entrada);
  assert.ok(!sin.destacados.some((d) => /facebook/i.test(d.href)));
  assert.ok(!/Facebook/.test(sin.cuerpo), 'no dice que salió en Facebook si no sabemos');
  const libro = { reelsEnFacebook: { '2026-10-09/clima-manana': { mediaId: '1', permalink: FB }, '2026-10-08/clima-manana': { mediaId: '2', permalink: 'https://evil.example/x' } } };
  assert.equal(enlaceDelClimaEnFacebook(libro, '2026-10-09'), FB);
  assert.equal(enlaceDelClimaEnFacebook(libro, '2026-10-08'), '', 'sólo direcciones de Facebook');
  assert.equal(enlaceDelClimaEnFacebook({}, '2026-10-09'), '');
});

test('las notas de los últimos días quedan como estaban cuando se guardaron', () => {
  const h = sumarClimaAlHistorial(sumarClimaAlHistorial({ dias: [] }, entradaDelClima(CLIMA, { consultado: AR('2026-10-09', '07:40') })),
    entradaDelClima({ ...CLIMA, dias: [{ ...CLIMA.dias[0], fecha: '2026-10-10', max: 15 }] }, { consultado: AR('2026-10-10', '07:40') }));
  const notas = notasDelClima(h, { reelsEnFacebook: { '2026-10-09/clima-manana': { permalink: FB } } }, { ahora: AR('2026-10-10', '10:00') });
  assert.deepEqual(notas.map((n) => n.id), ['clima20261009', 'clima20261010']);
  assert.ok(notas[0].destacados.some((d) => d.href === FB));
  assert.ok(!notas[1].destacados.some((d) => d.href === FB));
});

test('generar-datos la arma sólo en la nube y el workflow guarda clima-historia.json', () => {
  const g = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(g, /if \(enLaNube\) \{\n  const toca = cuandoArmarClima\(/);
  assert.match(g, /\.\.\.notasDelClima\(historiaClima, libroRedes\)/);
  const w = fs.readFileSync(new URL('../.github/workflows/actualizar.yml', import.meta.url), 'utf8');
  assert.match(w, /web\/data\/clima-historia\.json/);
});

test('el reel extra de Facebook guarda su dirección pública y la vuelta siguiente la completa si Meta tardó', () => {
  const p = fs.readFileSync(new URL('../redes/publicar-piezas.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(p, /libro\.reelsEnFacebook\[clave\]\.permalink = urlDelReel/);
  assert.match(p, /Object\.entries\(libro\?\.reelsEnFacebook \?\? \{\}\)/);
});
