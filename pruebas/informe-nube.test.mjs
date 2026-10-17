// El informe diario cuando el motor corre en Cloudflare: las vueltas y las fuentes caídas salen del estado del motor (motor/estado.json), no de GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consultarEnVivo, seccionSalud } from '../redes/informe-diario.mjs';

const AHORA = new Date('2026-10-18T22:00:00Z');
const hace = (min) => new Date(AHORA.getTime() - min * 60000).toISOString();

function fetchFalso({ workflows = {} } = {}) {
  const pedidos = [];
  const fn = async (url) => {
    const u = String(url);
    pedidos.push(u);
    if (u.includes('radar-balcarce-vigilante')) return new Response(JSON.stringify({ sinDatos: true }), { status: 200 });
    const m = u.match(/actions\/workflows\/([^/]+)\/runs/);
    if (m) return new Response(JSON.stringify({ workflow_runs: workflows[m[1]] ?? [] }), { status: 200 });
    return new Response('{}', { status: 404 });
  };
  fn.pedidos = pedidos;
  return fn;
}

const motor = {
  ok: true, cuando: hace(10), ultimaBuena: hace(10),
  historial: [{ cuando: hace(200), ok: true }, { cuando: hace(170), ok: false }, { cuando: hace(140), ok: true }, { cuando: hace(10), ok: true }],
  anotaciones: [{ title: 'Fuente caída', message: 'Radio Gabal: HTTP 503' }, { title: 'Fuente vacía', message: 'El Diario no trajo ninguna nota' }],
};

test('con el estado del motor, «Actualizar la web» no se busca en GitHub: las vueltas salen del historial y las fuentes de las anotaciones guardadas', async () => {
  const fetchFn = fetchFalso();
  const r = await consultarEnVivo({ env: { WORKFLOWS_EN_LA_NUBE: 'actualizar.yml' }, fetchFn, ahora: AHORA, motor });
  assert.ok(!fetchFn.pedidos.some((u) => /workflows\/actualizar\.yml/.test(u)), 'no pidió las corridas de actualizar.yml');
  assert.equal(r.github.lectura, true);
  assert.deepEqual({ ...r.github.actualizar, ultimaBuena: undefined }, { terminadas: 4, buenas: 3, malas: 1, ultimaBuena: undefined });
  assert.equal(r.github.actualizar.ultimaBuena, hace(10));
  assert.equal(r.fuentes.leido, true);
  assert.deepEqual(r.fuentes.caidas, [{ nombre: 'Radio Gabal', error: 'HTTP 503' }]);
  assert.deepEqual(r.fuentes.vacias, [{ nombre: 'El Diario' }]);
});

test('lo que ya corre en la nube tampoco se busca en GitHub; lo demás sí', async () => {
  const fetchFn = fetchFalso();
  await consultarEnVivo({ env: { WORKFLOWS_EN_LA_NUBE: 'actualizar.yml,pistas.yml,auditoria-ia.yml' }, fetchFn, ahora: AHORA, motor });
  const pedidas = fetchFn.pedidos.filter((u) => /workflows\//.test(u)).map((u) => u.match(/workflows\/([^/]+)\//)[1]);
  assert.ok(!pedidas.includes('pistas.yml') && !pedidas.includes('auditoria-ia.yml'));
  assert.ok(pedidas.includes('redes.yml') && pedidas.includes('respaldo.yml'), 'las que siguen en GitHub se miran como siempre');
});

test('sin el estado del motor y sin nube, el informe pide las corridas de GitHub como siempre', async () => {
  const fetchFn = fetchFalso({ workflows: { 'actualizar.yml': [{ id: 1, status: 'completed', conclusion: 'success', updated_at: hace(5), created_at: hace(9), html_url: 'x' }] } });
  const r = await consultarEnVivo({ env: {}, fetchFn, ahora: AHORA });
  assert.ok(fetchFn.pedidos.some((u) => /workflows\/actualizar\.yml/.test(u)));
  assert.equal(r.github.actualizar.buenas, 1);
});

test('un estado del motor sin anotaciones (la última vuelta no llegó a armar los datos) se dice, no se inventa', async () => {
  const r = await consultarEnVivo({ env: {}, fetchFn: fetchFalso(), ahora: AHORA, motor: { ...motor, anotaciones: null } });
  assert.equal(r.fuentes.leido, false);
  assert.match(r.fuentes.motivo, /no dejó sus avisos/);
});

test('la sección «Salud» del informe cuenta las vueltas del motor igual que las corridas de GitHub', async () => {
  const enVivo = await consultarEnVivo({ env: {}, fetchFn: fetchFalso(), ahora: AHORA, motor });
  const { seccion } = seccionSalud({
    momento: 'noche', dia: '2026-10-18', ahora: AHORA, datos: { portada: { generado: hace(10) }, vigilancia: { abiertos: [] }, archivo: { total: 100, notas: [] } }, enVivo,
  });
  const texto = seccion.lineas.map((l) => l.t).join('\n');
  assert.match(texto, /de las últimas 4 corridas, 3 salieron bien y 1 con problemas/);
  assert.match(texto, /Fuentes caídas en la última corrida: 1: Radio Gabal/);
});
