// Regla 302 (18/10/2026): la prueba de parecido de voces, para cuando Hernán cargue la clave paga de Google y haya que recrear las dos voces propias
// (docs/redes/VOCES-NUEVAS.md). Se prueba con voces SINTÉTICAS (armónicos con pausas, hechas en la prueba): ni Gemini, ni cupo, ni red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {
  tonoDe, pausasDe, perfilDeMuestras, compararPerfiles, elegirLaMejor, MEDIDAS, perfilDeAudio, tablaDeComparacion,
} from '../reels/parecido-de-voz.mjs';
import {
  TEXTO_DE_COMPARACION, palabrasDelTexto, VERSIONES_POR_DEFECTO, VERSIONES_MAXIMAS,
} from '../reels/texto-de-comparacion.mjs';

const FM = 16000;

/**
 * Una "voz" sintética: armónicos de `f0` (con la caída `caida`: más alta = más oscura), una sílaba cada 1/`silabasPorSegundo` y una pausa de `pausa` segundos
 * cada `cadaCuanto` segundos. Todo determinístico.
 */
function voz({
  f0 = 120, segundos = 12, silabasPorSegundo = 4, caida = 1.2, pausa = 0.4, cadaCuanto = 3, vibrato = 0.02,
} = {}) {
  const x = new Float32Array(Math.round(segundos * FM));
  let fase = 0;
  for (let i = 0; i < x.length; i += 1) {
    const t = i / FM;
    const enPausa = (t % cadaCuanto) > cadaCuanto - pausa;
    // Una sílaba es una "montaña" de volumen: 0 en los bordes y 1 en el medio.
    const sil = (t * silabasPorSegundo) % 1;
    const sobre = enPausa ? 0 : Math.sin(Math.PI * sil) ** 0.5;
    fase += (2 * Math.PI * f0 * (1 + vibrato * Math.sin(2 * Math.PI * 5 * t))) / FM;
    let v = 0;
    for (let k = 1; k <= 12; k += 1) v += Math.sin(k * fase) / k ** caida;
    x[i] = 0.3 * v * sobre;
  }
  return x;
}

const PALABRAS = palabrasDelTexto(TEXTO_DE_COMPARACION);

test('los textos de la prueba son siempre los mismos y tienen lo que hay que medir: números, nombres, la dirección dicha y el cierre', () => {
  assert.equal(PALABRAS, 81, 'el texto principal tiene 81 palabras (no se toca: las pruebas viejas y las nuevas tienen que decir lo mismo)');
  assert.match(TEXTO_DE_COMPARACION, /15 años/);
  assert.match(TEXTO_DE_COMPARACION, /Radar Balcarce punto com\.$/);
  assert.ok(VERSIONES_POR_DEFECTO >= 2 && VERSIONES_POR_DEFECTO <= VERSIONES_MAXIMAS, 'por lo menos dos versiones para poder elegir');
  assert.equal(VERSIONES_POR_DEFECTO, 2, 'el mínimo: dos versiones de cada voz');
});

test('el tono: se reconoce la altura de una voz grave y de una aguda, con menos del 3 % de error', () => {
  for (const f0 of [95, 120, 180, 230]) {
    const t = tonoDe(voz({ f0, segundos: 6 }));
    assert.ok(Math.abs(t.f0 / f0 - 1) < 0.03, `f0 ${f0}: midió ${t.f0.toFixed(1)}`);
    assert.ok(t.conVoz > 0.4, 'detecta la voz en buena parte del audio');
  }
  // Una voz con más vibrato abre el rango de tono.
  const plana = tonoDe(voz({ f0: 120, vibrato: 0.005, segundos: 8 }));
  const viva = tonoDe(voz({ f0: 120, vibrato: 0.06, segundos: 8 }));
  assert.ok(viva.rango > plana.rango, `el rango de la voz viva (${viva.rango.toFixed(2)}) supera al de la plana (${plana.rango.toFixed(2)})`);
});

test('el brillo: una voz con más agudos tiene el centro del espectro más arriba', () => {
  const oscura = tonoDe(voz({ f0: 120, caida: 2.2, segundos: 6 }));
  const clara = tonoDe(voz({ f0: 120, caida: 0.6, segundos: 6 }));
  assert.ok(clara.brillo > oscura.brillo * 1.15, `${clara.brillo.toFixed(0)} Hz contra ${oscura.brillo.toFixed(0)} Hz`);
});

test('las pausas: se cuentan las largas y no las de antes de empezar ni las de después de terminar', () => {
  const p = pausasDe(voz({ segundos: 12, pausa: 0.5, cadaCuanto: 3 }));
  assert.ok(p.cantidad >= 3 && p.cantidad <= 4, `hay ${p.cantidad} pausas largas`);
  assert.ok(p.media > 0.35 && p.media < 0.7, `duran ${p.media.toFixed(2)} s`);
  assert.ok(p.proporcion > 0.08 && p.proporcion < 0.25);
  const sin = pausasDe(voz({ segundos: 12, pausa: 0 }));
  assert.equal(sin.cantidad, 0);
  // Un silencio de más al principio y al final no es una pausa.
  const largo = new Float32Array(FM * 14);
  largo.set(voz({ segundos: 10, pausa: 0 }), FM * 2);
  assert.equal(pausasDe(largo).cantidad, 0);
});

test('el parecido: una voz igual a sí misma da 100, y se parece menos cuanto más cambia el tono, el ritmo o las pausas', () => {
  const ref = perfilDeMuestras(voz({ f0: 120, segundos: 20 }), { palabras: 50 });
  const igual = compararPerfiles(ref, ref, { mismoTexto: true });
  assert.equal(igual.parecido, 100);
  assert.deepEqual(igual.descartada, []);
  const medio = perfilDeMuestras(voz({ f0: 125, segundos: 20 }), { palabras: 50 });
  const lejos = perfilDeMuestras(voz({ f0: 160, segundos: 20 }), { palabras: 50 });
  const a = compararPerfiles(ref, medio);
  const b = compararPerfiles(ref, lejos);
  assert.ok(a.parecido > 90, `un tono 0,7 semitonos más alto sigue siendo muy parecido (${a.parecido})`);
  assert.ok(b.parecido < a.parecido - 20, `4,9 semitonos más alto es otra voz (${b.parecido})`);
  assert.ok(b.descartada.includes('tono'), 'y queda en el límite del tono');
  assert.ok(Math.abs(b.penalizaciones.tono.diferencia - 12 * Math.log2(160 / 120)) < 0.4);
  // Más lenta (otro ritmo: el mismo texto en más tiempo).
  const lenta = perfilDeMuestras(voz({ f0: 120, segundos: 26 }), { palabras: 50 });
  const c = compararPerfiles(ref, lenta, { mismoTexto: true });
  assert.ok(c.penalizaciones.ritmo.diferencia < -0.15 && c.descartada.includes('ritmo') && c.descartada.includes('duracion'), JSON.stringify(c.descartada));
  assert.ok(c.parecido < 90);
  // Sin el mismo texto, la duración no cuenta (otro texto dura otra cosa).
  assert.equal(compararPerfiles(ref, lenta).penalizaciones.duracion, undefined);
  // Los pesos suman 100.
  assert.equal(Object.values(MEDIDAS).reduce((s, m) => s + m.peso, 0), 100);
});

test('cómo se elige la mejor de varias: gana la de más parecido; si empatan (menos de 3 puntos), la de ritmo más cercano; una al límite sólo gana si no hay otra', () => {
  const ref = perfilDeMuestras(voz({ f0: 120, segundos: 20, silabasPorSegundo: 4 }), { palabras: 50 });
  const candidatas = [
    { nombre: 'v1', perfil: perfilDeMuestras(voz({ f0: 150, segundos: 20 }), { palabras: 50 }) },
    { nombre: 'v2', perfil: perfilDeMuestras(voz({ f0: 123, segundos: 20 }), { palabras: 50 }) },
    { nombre: 'v3', perfil: perfilDeMuestras(voz({ f0: 118, segundos: 21.5 }), { palabras: 50 }) },
  ];
  const { ganadora, ranking } = elegirLaMejor(ref, candidatas);
  assert.equal(ganadora.nombre, 'v2', ranking.map((r) => `${r.nombre}:${r.parecido}`).join(' '));
  assert.deepEqual(ranking.map((r) => r.nombre), ['v2', 'v3', 'v1']);
  // Una con alguna medida en el límite va al final aunque el resto sea bueno.
  const sola = elegirLaMejor(ref, [candidatas[0]]);
  assert.equal(sola.ganadora.nombre, 'v1', 'si no hay otra, es la que queda');
  assert.equal(elegirLaMejor(ref, []).ganadora, null);
  // El empate se resuelve por el ritmo: dos con el mismo parecido, la de ritmo más cercano primero.
  const empate = elegirLaMejor(ref, [
    { nombre: 'mismo-tono-otro-ritmo', perfil: perfilDeMuestras(voz({ f0: 120, segundos: 22.5 }), { palabras: 50 }) },
    { nombre: 'mismo-ritmo-otro-tono', perfil: perfilDeMuestras(voz({ f0: 125.5, segundos: 20 }), { palabras: 50 }) },
  ], { empate: 100 });
  assert.equal(empate.ganadora.nombre, 'mismo-ritmo-otro-tono', 'con el empate forzado manda el ritmo');
  const tabla = tablaDeComparacion(ranking, ref);
  assert.match(tabla, /\| 1 \| v2 \|/);
  assert.match(tabla, /Referencia: /);
});

test('con audios de verdad (mp3 hechos con ffmpeg, sin red ni cupo) el perfil mide lo mismo que con los números', async (t) => {
  if (!ffmpeg || !fs.existsSync(ffmpeg)) { t.skip('sin ffmpeg'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parecido-'));
  const hacer = (nombre, f0) => {
    const archivo = path.join(dir, nombre);
    // Un tono con tremolo (sílabas a 4 Hz) y una pausa: lo que ffmpeg sabe hacer sin ninguna voz.
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=${f0}:duration=6`, '-af', 'tremolo=f=4:d=0.9,volume=3', '-b:a', '128k', archivo]);
    return archivo;
  };
  const a = await perfilDeAudio(hacer('a.mp3', 140), { palabras: 20 });
  const b = await perfilDeAudio(hacer('b.mp3', 210), { palabras: 20 });
  assert.ok(Math.abs(a.tono.f0 / 140 - 1) < 0.04, `140 Hz: midió ${a.tono.f0.toFixed(1)}`);
  assert.ok(Math.abs(b.tono.f0 / 210 - 1) < 0.04, `210 Hz: midió ${b.tono.f0.toFixed(1)}`);
  assert.ok(Math.abs(a.duracion - 6) < 0.15);
  assert.ok(Math.abs(a.ritmo - 20 / a.duracion) < 1e-9);
  assert.ok(compararPerfiles(a, a).parecido > compararPerfiles(a, b).parecido);
});
