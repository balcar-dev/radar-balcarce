// El workflow que sube los Workers de la mudanza (desplegar-nube.yml) y el ayudante que carga sus secretos: sólo a mano, con la misma versión de wrangler que los demás,
// en el orden que Cloudflare exige, sin pisar variables y sin mostrar jamás un valor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { secretosDe } from '../infra/compartido/secretos-para-wrangler.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const w = leer('.github/workflows/desplegar-nube.yml');
const sinComentarios = w.replace(/^\s*#.*$/gm, '');

test('se dispara sólo a mano, con permisos de lectura y un solo despliegue a la vez', () => {
  assert.match(sinComentarios, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(sinComentarios, /schedule:|push:|pull_request/);
  assert.match(sinComentarios, /permissions:\n  contents: read/);
  assert.match(sinComentarios, /concurrency:\n  group: desplegar-nube\n  cancel-in-progress: false/);
  assert.match(sinComentarios, /timeout-minutes: \d+/);
});

test('usa la misma versión fija de wrangler que "Actualizar la web" y que el reloj; ningún `npx wrangler` sin versión', () => {
  const version = leer('.github/workflows/actualizar.yml').match(/wrangler@(\d+\.\d+\.\d+)/)[1];
  const usadas = [...sinComentarios.matchAll(/wrangler(@[\d.]+)?\s/g)].map((m) => m[1]);
  assert.ok(usadas.length > 10);
  assert.ok(usadas.every((u) => u === `@${version}`), `todas @${version}: ${[...new Set(usadas)]}`);
  assert.match(leer('infra/motor-cloudflare/vuelta.mjs'), new RegExp(`VERSION_DE_WRANGLER = '${version.replace(/\./g, '\\.')}'`));
});

test('cada despliegue conserva las variables que se editaron en el panel (--keep-vars)', () => {
  const despliegues = sinComentarios.match(/wrangler@[\d.]+ deploy[^\n]*/g);
  assert.equal(despliegues.length, 4, 'tareas, motor, vigilante y reloj');
  for (const d of despliegues) assert.match(d, /--keep-vars/, d);
});

test('el orden es el que Cloudflare pide: depósitos, tareas, motor, vigilante y reloj (los dos últimos apuntan a los primeros)', () => {
  const posicion = (t) => sinComentarios.indexOf(t);
  const orden = ['Crear los depósitos de R2', 'Subir el Worker de tareas', 'Subir el Worker del motor', 'Subir el vigilante', 'Subir el reloj'].map(posicion);
  assert.ok(orden.every((p) => p > 0), orden.join(','));
  assert.deepEqual([...orden].sort((a, b) => a - b), orden);
  // y las opciones: «todo» es la primera
  assert.match(w, /options: \[todo, tareas, motor, vigilante, reloj\]\n        default: todo/);
});

test('la lista de la nube se valida antes de usarse y la configuración con la nube sólo se arma si se pidió', () => {
  assert.match(sinComentarios, /\^\[a-z0-9\.,-\]\*\$/);
  assert.equal((sinComentarios.match(/if \[ "\$CON_NUBE" = "true" \]; then sed "s\/__NUBE__\/\$NUBE\/" nube\.toml\.parte >> wrangler\.generado\.toml/g) ?? []).length, 2, 'reloj y vigilante');
  // las partes existen y llevan el marcador
  for (const d of ['reloj', 'vigilante']) assert.match(leer(`infra/${d}-cloudflare/nube.toml.parte`), /__NUBE__/);
  // los valores entran por el entorno del job, no pegados en los comandos
  assert.doesNotMatch(sinComentarios.replace(/^\s+(QUE|CON_NUBE|NUBE): \$\{\{ inputs\.\w+ \}\}$/gm, ''), /\$\{\{ inputs\./);
});

test('los secretos viajan por un pipe a `wrangler secret bulk` y ningún paso hace echo de un valor', () => {
  assert.equal((sinComentarios.match(/secretos-para-wrangler\.mjs/g) ?? []).length, 4);
  assert.equal((sinComentarios.match(/secret bulk/g) ?? []).length, 4);
  assert.doesNotMatch(sinComentarios, /echo[^\n]*(TOKEN|APIKEY|API_KEY|SECRET)/);
  assert.doesNotMatch(sinComentarios, /secret put/);
  assert.doesNotMatch(w, /ghp_[A-Za-z0-9]{20,}|github_pat_/);
  // las llaves que las tareas necesitan están todas en la lista que se carga
  const lista = sinComentarios.match(/secretos-para-wrangler\.mjs (RADAR_GITHUB_TOKEN[^\\\n]*)/)[1].split(/\s+/).filter(Boolean);
  for (const n of ['RADAR_GITHUB_TOKEN', 'VIGILANTE_TOKEN', 'META_TOKEN', 'GEMINI_API_KEY_REDACCION', 'GEMINI_API_KEY_CLASIFICACION', 'GEMINI_API_KEY_REDES', 'GROQ_API_KEY', 'TAVILY_API_KEY', 'WHATSAPP_TELEFONO', 'WHATSAPP_APIKEY']) assert.ok(lista.includes(n), n);
  // y cada una se pasa en el `env` de su paso (si no, el ayudante no la ve)
  for (const n of lista) if (!['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'].includes(n)) assert.match(sinComentarios, new RegExp(`${n}: \\$\\{\\{ secrets\\.${n} \\}\\}`), n);
});

test('el ayudante arma el JSON con los que tienen valor, avisa por nombre cuáles faltan y nunca muestra un valor por la salida de error', () => {
  const { cargados, faltan } = secretosDe(['A', 'B', 'C', 'D'], { A: 'uno', B: '', C: '   ', D: 'cuatro' });
  assert.deepEqual(cargados, { A: 'uno', D: 'cuatro' });
  assert.deepEqual(faltan, ['B', 'C']);
  const r = spawnSync(process.execPath, ['infra/compartido/secretos-para-wrangler.mjs', 'SECRETO_UNO', 'VACIO', 'minuscula', 'OTRO'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, SECRETO_UNO: 'valor-muy-secreto', VACIO: '', OTRO: 'otro-valor' },
  });
  assert.deepEqual(JSON.parse(r.stdout), { SECRETO_UNO: 'valor-muy-secreto', OTRO: 'otro-valor' });
  assert.ok(!r.stderr.includes('valor-muy-secreto') && !r.stderr.includes('otro-valor'), 'el stderr no lleva valores');
  assert.match(r.stderr, /SECRETO_UNO, OTRO/);
  assert.match(r.stderr, /VACIO/);
  assert.ok(!r.stderr.includes('minuscula'), 'un nombre que no es de una variable de entorno se ignora');
});

test('«Piezas de redes» (redes-piezas.yml): sólo a mano, con la entrada por el entorno y sin duplicar la memoria de voces de «Redes»', () => {
  const y = leer('.github/workflows/redes-piezas.yml').replace(/^\s*#.*$/gm, '');
  assert.match(y, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(y, /schedule:|push:/);
  assert.match(y, /SOLO: \$\{\{ inputs\.solo \}\}/);
  assert.match(y, /run: node reels\/plan\.mjs --generar "--solo=\$SOLO"/);
  assert.match(y, /RENDER_REMOTO: 'Si'/);
  assert.doesNotMatch(y, /run:[^\n]*\$\{\{/, 'ningún dato de afuera pegado en un comando');
  assert.match(y, /permissions:\n  contents: read/);
  assert.match(y, /group: redes-piezas/);
  // la misma memoria de voces (clave y carpeta) que «Redes»: un audio ya pedido no se paga dos veces
  const redes = leer('.github/workflows/redes.yml');
  assert.match(redes, /path: \.cache\/voz\n\s+key: voz-\$\{\{ github\.run_id \}\}/);
  assert.match(y, /path: \.cache\/voz\n\s+key: voz-\$\{\{ github\.run_id \}\}/);
  for (const s of ['GEMINI_API_KEY_REDES', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'RENDER_GITHUB_TOKEN']) assert.match(y, new RegExp(`${s}: \\$\\{\\{ secrets\\.${s} \\}\\}`));
  assert.match(y, /R2_RENDER: \$\{\{ vars\.R2_RENDER \}\}/);
});

test('«Informe diario»: el respaldo de GitHub se puede apagar con una variable sin perder las corridas a mano ni las del reloj', () => {
  const y = leer('.github/workflows/informe-diario.yml');
  assert.match(y, /if: \$\{\{ github\.event_name != 'schedule' \|\| vars\.INFORME_RESPALDO_EN_GITHUB != 'No' \}\}/);
  assert.match(y, /schedule:\n    - cron: '45 11 \* \* \*'/, 'el respaldo sigue existiendo (vuelta atrás)');
});
