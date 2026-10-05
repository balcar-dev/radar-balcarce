// 4/10/2026: "Actualizar la web" falló 29 veces en 3 días y el aviso sólo decía "falló", sin decir por qué ni cuánto llevaba. Ahora dice el paso que falló, qué
// significa y sube a grave con dos fallas seguidas (60 minutos sin publicar).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar, QUE_SIGNIFICA_EL_PASO } from '../redes/vigilar.mjs';
import { claveDePieza } from '../redes/piezas.mjs';

const A = (hhmm) => new Date(`2026-09-24T${hhmm}:00-03:00`);
const hace = (ahora, minutos) => new Date(ahora.getTime() - minutos * 60000).toISOString();
const corrida = (ahora, minutos, conclusion = 'success', extra = {}) => ({ createdAt: hace(ahora, minutos), conclusion, status: 'completed', ...extra });

function sano(ahora) {
  return {
    ahora,
    web: { estado: 200, actualizado: hace(ahora, 20) },
    www: { redirige: true },
    corridas: { 'Actualizar la web': [corrida(ahora, 20), corrida(ahora, 50)], Redes: [corrida(ahora, 10)], 'Cloudflare Pages': [corrida(ahora, 18)] },
    libro: { instagram: Object.fromEntries(['clima-manana', 'farmacia', 'clima-noche'].map((n) => [claveDePieza(n, ahora), { mediaId: '1' }])), facebook: {} },
  };
}
const falla = (r) => r.find((p) => p.clave === 'falla-Actualizar la web');

test('una sola falla de la web es un aviso medio; con el paso y lo que significa', () => {
  const o = sano(A('12:00'));
  o.corridas['Actualizar la web'] = [corrida(o.ahora, 20, 'failure', { paso: 'Compilar el sitio' }), corrida(o.ahora, 50)];
  const p = falla(evaluar(o));
  assert.equal(p.gravedad ?? p.nivel, 'media');
  assert.match(p.texto, /en el paso "Compilar el sitio"/);
  assert.match(p.texto, /1 seguidas/);
  assert.match(p.texto, /no compila/);
});

test('dos fallas seguidas de la web ya son graves, y si fue una prueba se dice que la web se congela por seguridad', () => {
  const o = sano(A('12:00'));
  o.corridas['Actualizar la web'] = [corrida(o.ahora, 20, 'failure', { paso: 'Probar que nada se rompió' }), corrida(o.ahora, 50, 'failure'), corrida(o.ahora, 80)];
  const p = falla(evaluar(o));
  assert.equal(p.gravedad ?? p.nivel, 'alta');
  assert.match(p.texto, /2 seguidas/);
  assert.match(p.texto, /NO se actualiza hasta que se arregle/);
});

test('sin saber el paso el aviso sigue andando, y cada paso conocido tiene su explicación', () => {
  const o = sano(A('12:00'));
  o.corridas['Actualizar la web'] = [corrida(o.ahora, 20, 'failure'), corrida(o.ahora, 50)];
  assert.match(falla(evaluar(o)).texto, /falló en su última corrida \(1 seguidas/);
  for (const paso of ['Probar que nada se rompió', 'Compilar el sitio', 'Buscar noticias y armar los datos', 'Revisar que el SEO siga en pie']) assert.ok(QUE_SIGNIFICA_EL_PASO[paso], paso);
});

test('el vigilante le pide a GitHub el paso que falló (sólo de la última corrida fallida)', async () => {
  const { default: fs } = await import('node:fs');
  const c = fs.readFileSync(new URL('../redes/vigilar.mjs', import.meta.url), 'utf8');
  assert.match(c, /actions\/runs\/\$\{falla\.id\}\/jobs/);
  assert.match(c, /find\(\(s\) => s\.conclusion === 'failure'\)\?\.name/);
});
