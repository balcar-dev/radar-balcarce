// La pantalla "Hoy" del panel del celular (8/10/2026): lo que hay que mirar al abrir, con un atajo a cada cosa. Puras, sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resumenDeHoy, htmlDeHoy, diaDeHoy, proximoArmado } from '../web/public/panel/hoy.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const apps = { esc, haceCuanto: () => 'hace 5 min', horaEnBalcarce: () => '14:30' };
const AHORA = new Date('2026-10-08T17:40:00Z'); // 14:40 en Balcarce, jueves

test('el día y el próximo armado son los de Balcarce', () => {
  assert.equal(diaDeHoy(AHORA), 'jueves 8');
  assert.equal(proximoArmado(AHORA), '15:00');
  assert.equal(proximoArmado(new Date('2026-10-08T17:00:00Z')), '14:30', 'justo en punto, la próxima es en media hora');
  assert.equal(proximoArmado(new Date('2026-10-08T17:59:59Z')), '15:00');
});

test('lo que espera un toque se cuenta, con su detalle, y lleva a donde se resuelve', () => {
  const r = resumenDeHoy({
    generado: '2026-10-08T17:30:00Z',
    esperan: { n: 4, deBalcarce: 2, masVieja: 'hace 5 h' },
    sinCuerpo: 1,
    borradores: { listos: 2, conMarca: 1, enCurso: ['Corte de luz'] },
    sinFoto: { n: 3, firmes: 1 },
    redes: { problemas: 0, salieron: 5, total: 7, proxima: { que: 'El repaso de la tarde', hora: '18:00' } },
    pistas: 1, graves: 0,
  }, AHORA);
  assert.equal(r.necesitaToque.length, 4);
  assert.equal(r.necesitaToque[0].detalle, '2 de Balcarce · la más vieja, hace 5 h');
  assert.match(r.necesitaToque[2].detalle, /1 tiene algo marcado/);
  assert.equal(r.necesitaToque[3].detalle, '2 se pueden arreglar · 1 por una regla firme');
  assert.deepEqual(r.delDia.map((x) => x.id), ['redes', 'pistas']);
  assert.equal(r.delDia[0].detalle, 'Próxima: El repaso de la tarde a las 18:00');
  assert.equal(r.todoEnOrden, false);
  const h = htmlDeHoy(r, apps);
  assert.match(h, /<h1>Hoy, jueves 8<\/h1>/);
  assert.match(h, /La web se armó a las 14:30 \(hace 5 min\) · la próxima, a las 15:00\./);
  assert.match(h, /La IA está escribiendo “Corte de luz”/);
  for (const destino of ['esperan', 'borradores', 'fotos', 'redes', 'pistas']) assert.match(h, new RegExp(`data-pestana="${destino}"`));
});

test('sin nada pendiente dice que está todo en orden, y un problema en las redes lo evita', () => {
  const vacio = resumenDeHoy({ esperan: { n: 0, deBalcarce: 0, masVieja: null }, redes: { problemas: 0, salieron: 3, total: 3, proxima: null } }, AHORA);
  assert.equal(vacio.todoEnOrden, true);
  assert.match(htmlDeHoy(vacio, apps), /Todo en orden/);
  assert.equal(vacio.delDia[0].detalle, 'No queda nada más por hoy');
  const roto = resumenDeHoy({ redes: { problemas: 2, salieron: 1, total: 3, proxima: null } }, AHORA);
  assert.equal(roto.todoEnOrden, false);
  assert.match(roto.delDia[0].titulo, /2 problemas en las redes de hoy/);
  assert.doesNotMatch(htmlDeHoy(roto, apps), /Todo en orden/);
  assert.doesNotThrow(() => htmlDeHoy(resumenDeHoy({}, AHORA), apps), 'sin datos todavía no se rompe');
});

test('un título raro no rompe el HTML', () => {
  const r = resumenDeHoy({ borradores: { listos: 0, conMarca: 0, enCurso: ['<img src=x onerror=alert(1)>'] } }, AHORA);
  assert.ok(!htmlDeHoy(r, apps).includes('<img'));
});

test('el panel arranca en Hoy, Fotos pasó a Más y el panel se actualiza solo en los celulares', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /pestana: 'hoy', busqueda: ''/);
  assert.match(app, /\['hoy', 'Hoy', '·'\], \['esperan', 'Esperan', esperan\], \['publicadas', 'Publicadas', ultimas\]/);
  assert.match(app, /\['fotos', 'Fotos', '📷'/);
  assert.match(app, /function vistaHoy\(\)/);
  assert.match(app, /E\.pestana === 'hoy'\) vistaHoy\(\)/);
  assert.match(leer('web/public/panel/sw.js'), /'\/panel\/hoy\.js'/);
  assert.match(leer('web/public/panel/sw.js'), /radar-panel-21/);
});
