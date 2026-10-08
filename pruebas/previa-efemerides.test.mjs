// La vista previa de "Un día como hoy" de la primera semana (1/10/2026): sin voz, sin gastar cupo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  palabrasSinteticas, momentoDelAdemas, placasDelDia, fechaLarga, RITMO,
} from '../reels/previa-efemerides.mjs';
import { VOCES, REPARTO } from '../redes/prompt-redes.mjs';
import { rutaDeDatos } from '../ingesta/datos-vivos.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
// Datos fijos (pruebas/datos-fijos/): el mes armado de web/data cambia cuando se arma el siguiente (C-7, 8/10/2026).
const datos = JSON.parse(fs.readFileSync(rutaDeDatos('efemerides-piezas.json'), 'utf8'));
const candidatas = JSON.parse(fs.readFileSync(rutaDeDatos('efemerides-candidatas.json'), 'utf8')).dias;

test('los tiempos de las palabras siguen el ritmo de la voz y no se pisan', () => {
  const p = palabrasSinteticas('Buen día, Balcarce. Un día como hoy, en 1922, nació alguien importante.');
  assert.ok(p.length >= 10);
  for (let i = 1; i < p.length; i += 1) assert.ok(p[i].desde >= p[i - 1].hasta, 'una palabra empieza después de la anterior');
  const porSegundo = p.length / p.at(-1).hasta;
  assert.ok(porSegundo > RITMO * 0.6 && porSegundo < RITMO * 1.2, `ritmo ${porSegundo.toFixed(2)} palabras por segundo`);
  assert.equal(p[2].finFrase, true, '"Balcarce." cierra la frase');
  assert.equal(p[1].pausa, true, '"día," pide una pausa chica');
});

test('"Y además" marca dónde pasa de la placa principal a la de "Además"', () => {
  const p = palabrasSinteticas('Nació en 1922. Y además, un día como hoy: pasó algo más.');
  const corte = momentoDelAdemas(p);
  assert.ok(corte > 0);
  assert.equal(p.find((x) => x.desde === corte).texto, 'Y');
  assert.equal(momentoDelAdemas(palabrasSinteticas('Sin la marca.')), null);
});

test('las dos placas se arman con la fecha y los datos del día', () => {
  const s = placasDelDia('2026-10-05', datos.dias['2026-10-05']);
  assert.match(s.principal, /UN D[ÍI]A COMO HOY|Un día como hoy/i);
  assert.ok(s.principal.includes('1922') && s.principal.includes('Froil'));
  assert.ok(s.ademas.includes('Darregueira') && s.ademas.includes('5 de octubre'));
  assert.deepEqual(fechaLarga('2026-10-05'), { dia: 'lunes', numero: 5, mes: 'octubre' });
});

test('cada día preparado tiene su principal, dos o tres "además" y un guion que los dice (2 al 4/10, 5 al 18/10 y 19 al 31/10)', () => {
  const fechas = Object.keys(datos.dias);
  assert.equal(fechas.length, 30);
  assert.deepEqual([fechas[0], fechas.at(-1)], ['2026-10-02', '2026-10-31']);
  // Desde el 4/10 (Hernán: "que salgan por defecto a no ser que yo tome alguna acción") todo sale como está: sin "sale: false" ni "revision". Una persona lo saca,
  // o pide cambios, desde la pestaña Fechas del panel (regla 97).
  for (const f of fechas) {
    assert.ok(!('sale' in datos.dias[f]) && !('revision' in datos.dias[f]), `${f}: sale por defecto`);
  }
  for (const f of fechas) {
    const d = datos.dias[f];
    assert.ok(d.ademas.length >= 2 && d.ademas.length <= 3, `${f}: ${d.ademas.length} en "además"`);
    assert.match(d.guion, /^Buen día, Balcarce\./, `${f}: el saludo`);
    assert.match(d.guion, /Un día como hoy, en Radar Balcarce\.$/, `${f}: el cierre`);
    assert.match(d.guion, /Y además, un día como hoy:/, `${f}: la bisagra`);
    const palabras = d.guion.split(/\s+/).length;
    assert.ok(palabras >= 55 && palabras <= 100, `${f}: ${palabras} palabras (se apunta a unos 30 segundos)`);
    // Todos los identificadores existen en las candidatas de ese día: nada inventado.
    const ids = [d.principal.id, ...d.ademas.map((x) => x.id)];
    for (const id of ids) assert.ok(candidatas[f].candidatas.some((c) => c.id === id), `${f}: ${id} no está en las candidatas`);
    assert.ok(VOCES[d.voz], `${f}: voz ${d.voz}`);
  }
});

test('lo que no es de ningún día seguro no se usa: los descartados por la verificación no están en la semana', () => {
  const usados = new Set(Object.values(datos.dias).flatMap((d) => [d.principal.id, ...d.ademas.map((x) => x.id)]));
  // Los que la verificación dio por mal o no pudo confirmar (1/10): lwhspy (Rosario), 130eqy1 (Mansilla), rwywft (Éole), m94bg8, jng9ix.
  for (const mal of ['lwhspy', '130eqy1', 'rwywft', 'm94bg8', 'jng9ix', '18batts']) assert.ok(!usados.has(mal), mal);
});

test('la voz de las piezas de producción sale del reparto; la vista previa no la gasta', () => {
  assert.ok(REPARTO.noticia1);
  const src = fs.readFileSync(path.join(RAIZ, 'reels', 'previa-efemerides.mjs'), 'utf8');
  assert.ok(!/decirGemini|GEMINI_API_KEY/.test(src), 'no pide voz');
  assert.match(src, /anullsrc/);
});
