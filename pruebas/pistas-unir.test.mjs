// P-2 (8/10/2026): cuando el robot y una persona tocan el mismo archivo de pistas, no gana el robot: se unen cambio por cambio.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unirPorClave, unirPista, unirArchivo, ARCHIVOS_QUE_SE_UNEN } from '../panel/unir-conflictos.mjs';
import { comoRenglones } from '../panel/pistas-libro.mjs';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const abierta = (extra = {}) => ({ estado: 'abierta', creada: '2026-10-07T10:00:00Z', texto: 'algo', total: 1, ultimaRevision: '2026-10-08T09:00:00Z', ...extra });

test('unión por clave: gana el que cambió; si cambiaron los dos, la función decide', () => {
  const base = { a: 1, b: 1, c: 1, d: 1 };
  const fuera = { a: 1, b: 2, c: 1 }; // b cambió; c igual; d la sacaron
  const robot = { a: 5, b: 1, c: 3, d: 1, e: 9 }; // a y c cambió el robot; e es nueva
  const r = unirPorClave(base, fuera, robot);
  assert.deepEqual(r, { a: 5, b: 2, c: 3, e: 9 }, 'lo que sacó una persona sigue sacado');
  assert.equal(unirPorClave({ x: 1 }, { x: 2 }, { x: 3 }).x, 2, 'si cambiaron los dos, por defecto manda lo de afuera');
});

test('una pista que una persona cerró no la reabre el robot, aunque el robot la haya vuelto a mirar', () => {
  const base = abierta();
  const cerrada = abierta({ estado: 'archivada', archivada: '2026-10-08T10:00:00Z', resultado: { tipo: 'descartada', cuando: '2026-10-08T10:00:00Z' } });
  const mirada = abierta({ total: 4, ultimaRevision: '2026-10-08T11:00:00Z', novedad: true });
  assert.deepEqual(unirPista(base, cerrada, mirada), cerrada);
  assert.equal(unirPista(base, null, mirada), null, 'si la sacaron, no vuelve');
});

test('si la pista sigue abierta, el robot suma lo suyo (cobertura, historial) sin tocar lo de la persona', () => {
  const base = abierta();
  const persona = abierta({ seguimiento: [{ cuando: '2026-10-08T10:00:00Z', texto: 'Hablé con el municipio' }] });
  const robot = abierta({ total: 4, nivel: 'alta', ultimaRevision: '2026-10-08T11:00:00Z', novedad: true, historial: [{ total: 4 }], seguimiento: [{ cuando: '2026-10-08T11:00:00Z', texto: 'Novedad: ahora la cubren 4 medios' }] });
  const r = unirPista(base, persona, robot);
  assert.equal(r.total, 4);
  assert.equal(r.nivel, 'alta');
  assert.equal(r.novedad, true);
  assert.equal(r.estado, 'abierta');
  assert.deepEqual(r.seguimiento.map((s) => s.texto), ['Hablé con el municipio', 'Novedad: ahora la cubren 4 medios'], 'se juntan los dos seguimientos, en orden');
  // Si la que miró el robot es más vieja que lo que ya estaba, no pisa.
  const vieja = abierta({ total: 9, ultimaRevision: '2026-10-08T08:00:00Z' });
  assert.equal(unirPista(base, persona, vieja).total, 1);
});

test('los archivos se escriben en su formato: pistas una por renglón, notas con sangría', () => {
  const base = { version: 1, pistas: { p1: abierta() } };
  const fuera = { version: 1, pistas: { p1: abierta({ estado: 'archivada', resultado: { tipo: 'descartada' } }) } };
  const robot = { version: 1, pistas: { p1: abierta({ total: 3, ultimaRevision: '2026-10-08T11:00:00Z' }), p2: abierta() } };
  const texto = unirArchivo('web/data/pistas.json', base, fuera, robot);
  assert.equal(texto, comoRenglones(JSON.parse(texto)));
  const j = JSON.parse(texto);
  assert.equal(j.pistas.p1.estado, 'archivada', 'la cerró una persona');
  assert.ok(j.pistas.p2, 'la nueva del robot se suma');
  const n = JSON.parse(unirArchivo('web/data/notas-de-pistas.json', { notas: { n1: { t: 1 } } }, { notas: {} }, { notas: { n1: { t: 1 }, n2: { t: 2 } } }));
  assert.deepEqual(Object.keys(n.notas), ['n2'], 'una nota que sacó una persona no vuelve; la nueva sí entra');
});

test('con un choque de git de verdad, el robot no pisa la pista cerrada por una persona', () => {
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-unir-'));
  try {
    const remoto = path.join(dir, 'remoto.git');
    const robot = path.join(dir, 'robot');
    const persona = path.join(dir, 'persona');
    git(dir, 'init', '-q', '--bare', '-b', 'main', remoto);
    git(dir, 'clone', '-q', remoto, robot);
    git(robot, 'checkout', '-q', '-b', 'main');
    fs.mkdirSync(path.join(robot, 'web', 'data'), { recursive: true });
    const archivo = path.join('web', 'data', 'pistas.json');
    const escribir = (cwd, libro) => fs.writeFileSync(path.join(cwd, archivo), comoRenglones(libro));
    escribir(robot, { version: 1, pistas: { p1: abierta(), p2: abierta({ texto: 'otra' }) } });
    git(robot, 'add', '-A'); git(robot, 'commit', '-q', '-m', 'base'); git(robot, 'push', '-q', 'origin', 'main');
    git(dir, 'clone', '-q', remoto, persona);
    // La persona cierra p1 y sube.
    escribir(persona, { version: 1, pistas: { p1: abierta({ estado: 'archivada', resultado: { tipo: 'descartada', cuando: '2026-10-08T10:00:00Z' } }), p2: abierta({ texto: 'otra' }) } });
    git(persona, 'commit', '-q', '-am', 'cierra p1'); git(persona, 'push', '-q', 'origin', 'main');
    // El robot, sin saberlo, volvió a mirar p1 y p2 (el mismo renglón de p1 → choque).
    escribir(robot, { version: 1, pistas: { p1: abierta({ total: 5, ultimaRevision: '2026-10-08T12:00:00Z', novedad: true }), p2: abierta({ texto: 'otra', total: 2, ultimaRevision: '2026-10-08T12:00:00Z' }) } });
    git(robot, 'commit', '-q', '-am', 'robot');
    let choco = false;
    try { git(robot, 'pull', '--rebase', 'origin', 'main'); } catch { choco = true; }
    assert.equal(choco, true, 'el caso de prueba tiene que chocar');
    const script = fileURLToPath(new URL('../panel/unir-conflictos.mjs', import.meta.url));
    execFileSync(process.execPath, [script], { cwd: robot, stdio: 'ignore' });
    assert.equal(git(robot, 'diff', '--name-only', '--diff-filter=U').trim(), '', 'ya no queda nada en conflicto');
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'rebase', '--continue'], { cwd: robot, env: { ...process.env, GIT_EDITOR: 'true' }, stdio: 'ignore' });
    const j = JSON.parse(fs.readFileSync(path.join(robot, archivo), 'utf8'));
    assert.equal(j.pistas.p1.estado, 'archivada', 'lo que decidió la persona se respeta');
    assert.equal(j.pistas.p1.resultado.tipo, 'descartada');
    assert.equal(j.pistas.p2.total, 2, 'lo que miró el robot en la otra pista entra');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('los dos workflows unen las pistas antes de elegir la versión del robot', () => {
  assert.deepEqual(ARCHIVOS_QUE_SE_UNEN, ['web/data/pistas.json', 'web/data/notas-de-pistas.json']);
  for (const f of ['.github/workflows/panel.yml', '.github/workflows/pistas.yml']) {
    const y = leer(f);
    const unir = y.indexOf('node panel/unir-conflictos.mjs');
    assert.ok(unir > 0, `${f} no une`);
    assert.ok(unir < y.indexOf('git checkout --theirs'), `${f}: unir va antes de quedarse con el robot`);
  }
});
