// Un evento que una persona dio por suspendido no sale en la agenda ni en las piezas, aunque el municipio lo siga teniendo cargado (12/10/2026: Fiesta del Postre).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { aplicarSuspendidos, proximos } from '../web/lib/eventos.js';
import { eventosProximos } from '../reels/plan.mjs';

const postre = { id: 'muni-22540', origen: 'municipio', slug: '22-fiesta-nacional-del-postre', nombre: '22° FIESTA NACIONAL DEL POSTRE', desde: '2026-10-09 12:30:00', hasta: '2026-10-12 18:00:00' };
const otro = { id: 'muni-1', origen: 'municipio', slug: 'otro', nombre: 'Otro evento', desde: '2026-10-12 20:00:00', hasta: '2026-10-12 22:00:00' };
const ARCHIVO = { suspendidos: [{ id: 'muni-22540', motivo: 'Suspendida por el clima', cuando: '2026-10-12', por: 'la redacción' }] };
const AHORA = new Date('2026-10-12T12:00:00-03:00').getTime();

test('el evento suspendido queda marcado y no aparece entre los próximos', () => {
  const r = aplicarSuspendidos([postre, otro], ARCHIVO);
  assert.equal(r[0].suspendido, true);
  assert.equal(r[0].retirado, true);
  assert.equal(r[1].suspendido, undefined);
  assert.deepEqual(proximos(r, AHORA).map((e) => e.id), ['muni-1']);
});

test('una entrada incompleta no suspende nada ni frena la web', () => {
  const sinMotivo = { suspendidos: [{ id: 'muni-22540', cuando: '2026-10-12', por: 'x' }] };
  assert.deepEqual(aplicarSuspendidos([postre], sinMotivo), [postre]);
  assert.deepEqual(aplicarSuspendidos([postre], null), [postre]);
});

test('las piezas de redes tampoco muestran un evento retirado', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-'));
  try {
    const archivo = `${dir}/agenda.json`;
    fs.writeFileSync(archivo, JSON.stringify({ eventos: aplicarSuspendidos([{ ...postre, hasta: '2026-10-14 18:00:00', desde: '2026-10-13 12:00:00' }, otro], ARCHIVO) }));
    const r = eventosProximos(4, { web: archivo, hoy: new Date('2026-10-12T09:00:00-03:00') });
    assert.ok(!JSON.stringify(r).includes('POSTRE') && !JSON.stringify(r).includes('Postre'), 'el evento suspendido no va a la placa');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('el archivo real tiene la Fiesta del Postre con motivo, fecha y quién lo decidió', () => {
  const real = JSON.parse(fs.readFileSync(new URL('../web/data/agenda-suspendidos.json', import.meta.url), 'utf8'));
  const p = real.suspendidos.find((s) => s.id === 'muni-22540');
  assert.ok(p?.motivo && p.cuando && p.por);
});
